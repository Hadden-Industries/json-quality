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
import {
  resourceDefaults,
  resolveResourceProfile,
  minimumQuota,
} from "./resource-profile.js";
import { createExecutionDeadline } from "./execution-deadline.js";

export const PACKAGE_VERIFICATION_CAPABILITIES =
  /** @type {{ readonly [K in keyof Required<import("../types/schemas/configuration.js").VerificationControls>]: number }} */ (
    resourceDefaults("verificationControls")
  );
export function verificationResources(/** @type {*} */ selected) {
  return resolveResourceProfile(
    PACKAGE_VERIFICATION_CAPABILITIES,
    undefined,
    selected,
  );
}
const observation = (/** @type {*} */ value) =>
    [
      value.dev,
      value.ino,
      value.size,
      value.mtimeNs,
      value.ctimeNs,
      value.mode,
    ].join(":"),
  decoder = new TextDecoder("utf-8", { fatal: true });

/** Incremental metadata admission, also used for the copied cold bootstrap.
 * Descriptor and pathname must retain the same regular file observation.
 */
export async function readPackageMetadataBytes(
  /** @type {*} */ path,
  /** @type {*} */ verificationControls = undefined,
  /** @type {*} */ signal = undefined,
) {
  const maximum =
    verificationResources(verificationControls).maximumMetadataBytes;
  signal?.throwIfAborted();
  const before = observeRegularFile(path);
  if (
    !before.isFile() ||
    before.isSymbolicLink() ||
    (maximum !== null && before.size > BigInt(maximum))
  )
    throw new Error("Package metadata resource limit exceeded.");
  const descriptor = await open(
      path,
      constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
    ),
    bytes = Buffer.alloc(65536),
    chunks = [];
  try {
    if (
      observation(await descriptor.stat({ bigint: true })) !==
      observation(before)
    )
      throw new Error("Package metadata changed before reading.");
    let length = 0;
    while (true) {
      signal?.throwIfAborted();
      const { bytesRead } = await descriptor.read(bytes, 0, bytes.length, null);
      if (!bytesRead) break;
      length += bytesRead;
      if (
        (maximum !== null && length > maximum) ||
        BigInt(length) > before.size
      )
        throw new Error(
          "Package metadata resource limit or identity exceeded.",
        );
      chunks.push(Buffer.from(bytes.subarray(0, bytesRead)));
    }
    if (
      BigInt(length) !== before.size ||
      observation(await descriptor.stat({ bigint: true })) !==
        observation(before) ||
      observation(observeRegularFile(path)) !== observation(before)
    )
      throw new Error("Package metadata changed during reading.");
    return Buffer.concat(chunks, length);
  } finally {
    await descriptor.close();
  }
}
export async function readPackageMetadata(
  /** @type {*} */ path,
  /** @type {*} */ verificationControls = undefined,
  /** @type {*} */ signal = undefined,
) {
  return JSON.parse(
    decoder.decode(
      await readPackageMetadataBytes(path, verificationControls, signal),
    ),
  );
}

async function installedDigest(
  /** @type {*} */ root,
  /** @type {*} */ key,
  /** @type {*} */ maximum,
  /** @type {*} */ signal,
) {
  const path = assertRegularSource(root, key),
    before = observeRegularFile(path);
  if (maximum !== null && before.size > BigInt(maximum))
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
      if (maximum !== null && length > BigInt(maximum))
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
export function packageTarSink(/** @type {*} */ parser) {
  let /** @type {any} */ pending, /** @type {any} */ final;
  const sink = new Writable({
    highWaterMark: 65536,
    write(chunk, encoding, callback) {
      let offset = 0,
        settled = false;
      const finish = (/** @type {*} */ error = undefined) => {
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
        callback(
          error instanceof Error
            ? error
            : new Error(String(error), { cause: error }),
        );
      }
    },
    destroy(error, callback) {
      pending?.(error ?? new Error("Package parser interrupted."));
      if (error) parser.abort(error);
      callback(error);
    },
  });
  parser.on("error", (/** @type {*} */ error) => {
    pending?.(error);
    const done = final;
    final = undefined;
    done?.(error);
    sink.destroy(error);
  });
  return sink;
}

export async function verifyPackagePayload(
  /** @type {*} */ npmRequire,
  /** @type {*} */ {
    cache,
    integrity,
    installedRoot,
    admission,
    signal,
    verificationControls,
  },
) {
  const selected = verificationResources(verificationControls),
    capabilities = Object.fromEntries(
      Object.entries(selected).map(([key, value]) => [key, value ?? Infinity]),
    ),
    deadline = createExecutionDeadline(selected.maximumVerificationTimeMs, [
      signal,
    ]),
    operationSignal = deadline.signal,
    expected = new Map(),
    seen = new Set(),
    archiveHash = createHash("sha512"),
    maximumFiles = minimumQuota(admission.maxFiles, selected.maximumMembers),
    maximumTotal = minimumQuota(
      admission.maxTotalBytes,
      selected.maximumExpandedBytes,
    );
  try {
    let archiveBytes = 0n,
      expandedBytes = 0n,
      indexBytes = 0n;
    const parser = new (npmRequire("tar").Parser)({
      strict: true,
      maxMetaEntrySize: capabilities.maximumArchiveMetadataBytes,
      maxDecompressionRatio: capabilities.maximumDecompressionRatio,
    });
    const sink = packageTarSink(parser);
    parser.on("ignoredEntry", () =>
      sink.destroy(
        new Error("Unsupported or oversized package archive member."),
      ),
    );
    parser.on("entry", (/** @type {*} */ member) => {
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
        expandedBytes += BigInt(member.size);
        indexBytes += BigInt(Buffer.byteLength(key)) * 4n + 384n;
        if (
          (maximumFiles !== null && seen.size >= maximumFiles) ||
          member.size > capabilities.maximumMemberBytes ||
          (maximumTotal !== null && expandedBytes > BigInt(maximumTotal)) ||
          (selected.maximumIndexBytes !== null &&
            indexBytes > BigInt(selected.maximumIndexBytes))
        )
          throw new Error("Package payload resource limit exceeded.");
        seen.add(key.toLowerCase());
        const hash = createHash("sha256");
        let length = 0n;
        member.on("error", (/** @type {*} */ error) => sink.destroy(error));
        member.on("data", (/** @type {*} */ part) => {
          length += BigInt(part.length);
          hash.update(part);
        });
        member.on("end", () => {
          if (length !== BigInt(member.size))
            sink.destroy(new Error("Incomplete package member."));
          else
            expected.set(key, {
              sha256: hash.digest("hex"),
              byteLength: length,
            });
        });
        member.resume();
      } catch (error) {
        sink.destroy(
          error instanceof Error
            ? error
            : new Error(String(error), { cause: error }),
        );
      }
    });
    const gate = new Transform({
      highWaterMark: 65536,
      transform(chunk, encoding, callback) {
        archiveBytes += BigInt(chunk.length);
        if (
          selected.maximumArchiveBytes !== null &&
          archiveBytes > BigInt(selected.maximumArchiveBytes)
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
    async function walk(/** @type {*} */ directory, depth = 0) {
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
              selected.maximumMemberBytes,
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
            ++files;
            if (
              (maximumFiles !== null && files > maximumFiles) ||
              (maximumTotal !== null && installedBytes > BigInt(maximumTotal))
            )
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
    return { files, bytes: installedBytes.toString() };
  } finally {
    deadline.dispose();
  }
}
