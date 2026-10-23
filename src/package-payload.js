// SPDX-License-Identifier: AGPL-3.0-only
// Package transport is distinct from JSON source admission. Native binaries do
// not inherit the JSON document's 32MiB default. Verification never extracts.
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { open, opendir } from "node:fs/promises";
import { observeRegularFile } from "./regular-file-observation.js";
import { join, relative, sep } from "node:path";
import { Transform, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { assertRegularSource, assertRepositoryPath } from "./paths.js";

export const PACKAGE_VERIFICATION_CAPABILITIES = Object.freeze({
  maximumArchiveBytes: 134217728,
  maximumMemberBytes: 134217728,
  maximumExpandedBytes: 536870912,
  maximumMembers: 8192,
  maximumIndexBytes: 4194304,
  maximumMetadataBytes: 1048576,
  maximumArchiveMetadataBytes: 4096,
  maximumPathBytes: 32768,
  maximumDepth: 64,
  maximumVerificationTimeMs: 120000,
});
const capabilities = PACKAGE_VERIFICATION_CAPABILITIES,
  observation = (value) =>
    [
      value.dev,
      value.ino,
      value.size,
      value.mtimeNs,
      value.ctimeNs,
      value.mode,
    ].join(":"),
  decoder = new TextDecoder("utf-8", { fatal: true });

/** Fixed-buffer metadata admission, also used for the copied cold bootstrap.
 * Descriptor and pathname must retain the same regular file observation.
 */
export async function readPackageMetadataBytes(path) {
  const before = observeRegularFile(path);
  if (
    !before.isFile() ||
    before.isSymbolicLink() ||
    before.size > BigInt(capabilities.maximumMetadataBytes)
  )
    throw new Error("Package metadata resource limit exceeded.");
  const descriptor = await open(
      path,
      constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
    ),
    bytes = Buffer.alloc(capabilities.maximumMetadataBytes + 1);
  try {
    if (
      observation(await descriptor.stat({ bigint: true })) !==
      observation(before)
    )
      throw new Error("Package metadata changed before reading.");
    let length = 0;
    while (length < bytes.length) {
      const { bytesRead } = await descriptor.read(
        bytes,
        length,
        bytes.length - length,
        null,
      );
      if (!bytesRead) break;
      length += bytesRead;
    }
    if (
      BigInt(length) !== before.size ||
      observation(await descriptor.stat({ bigint: true })) !==
        observation(before) ||
      observation(observeRegularFile(path)) !== observation(before)
    )
      throw new Error("Package metadata changed during reading.");
    return bytes.subarray(0, length);
  } finally {
    await descriptor.close();
  }
}
export async function readPackageMetadata(path) {
  return JSON.parse(decoder.decode(await readPackageMetadataBytes(path)));
}

async function installedDigest(root, key, maximum, signal) {
  const path = assertRegularSource(root, key),
    before = observeRegularFile(path);
  if (before.size > BigInt(maximum))
    throw new Error("Installed package resource limit exceeded.");
  const descriptor = await open(
      path,
      constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
    ),
    hash = createHash("sha256"),
    bytes = Buffer.alloc(65536);
  let length = 0n;
  try {
    if (
      observation(await descriptor.stat({ bigint: true })) !==
      observation(before)
    )
      throw new Error("Installed package changed before reading.");
    while (true) {
      signal.throwIfAborted();
      const { bytesRead } = await descriptor.read(bytes, 0, bytes.length, null);
      if (!bytesRead) break;
      length += BigInt(bytesRead);
      if (length > BigInt(maximum))
        throw new Error("Installed package resource limit exceeded.");
      hash.update(bytes.subarray(0, bytesRead));
    }
    if (
      length !== before.size ||
      observation(await descriptor.stat({ bigint: true })) !==
        observation(before) ||
      observation(observeRegularFile(assertRegularSource(root, key))) !==
        observation(before)
    )
      throw new Error("Installed package changed during reading.");
    return { sha256: hash.digest("hex"), byteLength: length };
  } finally {
    await descriptor.close();
  }
}

/** Native tar's public write/drain/end contract is adapted to a Node Writable.
 * Feed at most 4 KiB compressed input per call, bounding decompressor bursts
 * even when npm's maintained cacache reader supplies chunks up to 64 MiB.
 * No archive/member collection or cache memoization is permitted here.
 */
export function packageTarSink(parser) {
  let pending, final;
  const sink = new Writable({
    highWaterMark: 65536,
    write(chunk, encoding, callback) {
      let offset = 0,
        settled = false;
      const finish = (error) => {
        if (!settled) {
          settled = true;
          pending = undefined;
          callback(error);
        }
      };
      pending = finish;
      const pump = () => {
        try {
          while (!settled && offset < chunk.length) {
            const part = chunk.subarray(offset, offset + 4096);
            offset += part.length;
            if (!parser.write(part)) {
              parser.once("drain", pump);
              return;
            }
          }
          finish();
        } catch (error) {
          finish(error);
        }
      };
      pump();
    },
    final(callback) {
      final = callback;
      parser.once("end", () => {
        const done = final;
        final = undefined;
        done?.();
      });
      try {
        parser.end();
      } catch (error) {
        final = undefined;
        callback(error);
      }
    },
    destroy(error, callback) {
      pending?.(error ?? new Error("Package parser interrupted."));
      if (error) parser.abort(error);
      callback(error);
    },
  });
  parser.on("error", (error) => {
    pending?.(error);
    const done = final;
    final = undefined;
    done?.(error);
    sink.destroy(error);
  });
  return sink;
}

export async function verifyPackagePayload(
  npmRequire,
  { cache, integrity, installedRoot, admission, signal },
) {
  const operationSignal = AbortSignal.any([
      AbortSignal.timeout(capabilities.maximumVerificationTimeMs),
      ...(signal ? [signal] : []),
    ]),
    expected = new Map(),
    seen = new Set(),
    archiveHash = createHash("sha512"),
    maximumFiles = Math.min(
      admission.maxFiles ?? capabilities.maximumMembers,
      capabilities.maximumMembers,
    ),
    maximumTotal = Math.min(
      admission.maxTotalBytes ?? capabilities.maximumExpandedBytes,
      capabilities.maximumExpandedBytes,
    );
  let archiveBytes = 0,
    expandedBytes = 0,
    indexBytes = 0;
  const parser = new (npmRequire("tar").Parser)({
    strict: true,
    maxMetaEntrySize: capabilities.maximumArchiveMetadataBytes,
    maxDecompressionRatio: 128,
  });
  const sink = packageTarSink(parser);
  parser.on("ignoredEntry", () =>
    sink.destroy(new Error("Unsupported or oversized package archive member.")),
  );
  parser.on("entry", (member) => {
    try {
      operationSignal.throwIfAborted();
      if (!member.path.startsWith("package/"))
        throw new Error("Unexpected package archive root.");
      const key = member.path.slice(8).replace(/\/$/u, "");
      if (!key && member.type === "Directory") {
        member.resume();
        return;
      }
      assertRepositoryPath(key);
      if (
        Buffer.byteLength(key) > capabilities.maximumPathBytes ||
        key.split("/").length > capabilities.maximumDepth
      )
        throw new Error("Package path resource limit exceeded.");
      if (member.type === "Directory") {
        member.resume();
        return;
      }
      if (
        !["File", "OldFile"].includes(member.type) ||
        key.split("/").includes("node_modules") ||
        seen.has(key.toLowerCase())
      )
        throw new Error(
          "Duplicate, linked or non-file package archive member.",
        );
      if (!Number.isSafeInteger(member.size) || member.size < 0)
        throw new Error("Package member size is not exact.");
      expandedBytes += member.size;
      indexBytes += Buffer.byteLength(key) * 4 + 384;
      if (
        seen.size >= maximumFiles ||
        member.size > capabilities.maximumMemberBytes ||
        expandedBytes > maximumTotal ||
        indexBytes > capabilities.maximumIndexBytes
      )
        throw new Error("Package payload resource limit exceeded.");
      seen.add(key.toLowerCase());
      const hash = createHash("sha256");
      let length = 0;
      member.on("error", (error) => sink.destroy(error));
      member.on("data", (part) => {
        length += part.length;
        hash.update(part);
      });
      member.on("end", () => {
        if (length !== member.size)
          sink.destroy(new Error("Incomplete package member."));
        else
          expected.set(key, {
            sha256: hash.digest("hex"),
            byteLength: BigInt(length),
          });
      });
      member.resume();
    } catch (error) {
      sink.destroy(error);
    }
  });
  const gate = new Transform({
    highWaterMark: 65536,
    transform(chunk, encoding, callback) {
      archiveBytes += chunk.length;
      if (
        archiveBytes > capabilities.maximumArchiveBytes ||
        chunk.length > 67108864
      ) {
        callback(new Error("Package archive byte limit exceeded."));
        return;
      }
      archiveHash.update(chunk);
      callback(null, chunk);
    },
  });
  await pipeline(
    npmRequire("cacache").get.stream.byDigest(
      join(cache, "_cacache"),
      integrity,
      { memoize: false },
    ),
    gate,
    sink,
    { signal: operationSignal },
  );
  if ("sha512-" + archiveHash.digest("base64") !== integrity)
    throw new Error("Cached JSON quality archive integrity differs.");
  let files = 0,
    installedBytes = 0n;
  async function walk(directory, depth = 0) {
    operationSignal.throwIfAborted();
    if (depth > capabilities.maximumDepth)
      throw new Error("Installed package depth limit exceeded.");
    const handle = await opendir(directory, { bufferSize: 1 });
    try {
      while (true) {
        const member = await handle.read();
        if (!member) break;
        operationSignal.throwIfAborted();
        if (
          directory === installedRoot &&
          member.name === "node_modules" &&
          member.isDirectory()
        )
          continue;
        const path = join(directory, member.name),
          key = relative(installedRoot, path).split(sep).join("/");
        if (member.isDirectory()) {
          if (member.name === "node_modules" || member.isSymbolicLink())
            throw new Error("Unexpected installed dependency directory.");
          await walk(path, depth + 1);
        } else {
          const identity = expected.get(key);
          if (!identity)
            throw new Error(
              "Installed JSON quality payload differs from its locked cached archive.",
            );
          const actual = await installedDigest(
            installedRoot,
            key,
            capabilities.maximumMemberBytes,
            operationSignal,
          );
          if (
            actual.sha256 !== identity.sha256 ||
            actual.byteLength !== identity.byteLength
          )
            throw new Error(
              "Installed JSON quality payload differs from its locked cached archive.",
            );
          installedBytes += actual.byteLength;
          if (++files > maximumFiles || installedBytes > BigInt(maximumTotal))
            throw new Error("Installed package resource limit exceeded.");
          expected.delete(key);
        }
      }
    } finally {
      await handle.close();
    }
  }
  await walk(installedRoot);
  if (expected.size || files !== seen.size)
    throw new Error(
      "Installed JSON quality payload differs from its locked cached archive.",
    );
  return { files };
}
