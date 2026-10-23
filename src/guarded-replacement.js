// SPDX-License-Identifier: AGPL-3.0-only
// One guarded file replacement. Batch peer admission belongs to its caller.
import { constants } from "node:fs";
import { open, rename, rm } from "node:fs/promises";
import { observeRegularFile } from "./regular-file-observation.js";
import { basename, dirname, join, posix } from "node:path";
import { randomUUID } from "node:crypto";
import { assertRegularSource } from "./paths.js";
import { sourceObservation } from "./source-observation.js";
import {
  observeRepositorySource,
  identifyRepositorySource,
  recheckRepositorySource,
} from "./repository-source.js";
import { JSON_TRANSFORM_CAPABILITIES } from "./transform-capabilities.js";

/** Stage only an already admitted bounded candidate. Rehash actual staged bytes
 * and recheck the original descriptor/path identity before rename. Permissions
 * are preserved; batches have no atomicity guarantee. Hostile concurrent path
 * replacement outside these observations is outside the supported guarantee.
 */
export async function replaceObservedSource({
  root,
  member,
  candidate,
  chunks,
  signal,
}) {
  if (
    !candidate ||
    typeof candidate.byteLength !== "string" ||
    !/^[1-9][0-9]{0,19}$/u.test(candidate.byteLength) ||
    BigInt(candidate.byteLength) >
      BigInt(JSON_TRANSFORM_CAPABILITIES.maximumOutputBytes) ||
    !/^[a-f0-9]{64}$/u.test(candidate.sha256)
  )
    throw new TypeError("Expected admitted bounded replacement identity.");
  signal?.throwIfAborted();
  await recheckRepositorySource({ root, member, signal });
  const destination = assertRegularSource(root, member.path),
    before = observeRegularFile(destination);
  if (sourceObservation(before) !== member.observation)
    throw new Error(`Source changed before staging: ${member.path}`);
  const leaf =
      "." + basename(destination) + ".json-quality-" + randomUUID() + ".tmp",
    stage = join(dirname(destination), leaf),
    stageRelative = posix.join(posix.dirname(member.path), leaf);
  let descriptor,
    created = false,
    renamed = false,
    primary;
  try {
    descriptor = await open(
      stage,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        (constants.O_NOFOLLOW ?? 0),
      Number(before.mode) & 0o777,
    );
    created = true;
    let length = 0;
    for await (const fragment of chunks) {
      signal?.throwIfAborted();
      if (!ArrayBuffer.isView(fragment) || fragment.byteLength > 65536)
        throw new TypeError("Expected bounded replacement fragments.");
      const bytes = Buffer.from(
        fragment.buffer,
        fragment.byteOffset,
        fragment.byteLength,
      );
      length += bytes.length;
      if (BigInt(length) > BigInt(candidate.byteLength))
        throw new Error("Replacement exceeded its admitted identity.");
      let offset = 0;
      while (offset < bytes.length) {
        const { bytesWritten } = await descriptor.write(
          bytes,
          offset,
          bytes.length - offset,
        );
        if (!bytesWritten)
          throw new Error("Replacement staging made no progress.");
        offset += bytesWritten;
      }
    }
    if (String(length) !== candidate.byteLength)
      throw new Error("Incomplete replacement staging.");
    await descriptor.chmod(Number(before.mode) & 0o777);
    await descriptor.sync();
    await descriptor.close();
    descriptor = undefined;
    const staged = await identifyRepositorySource({
      root,
      member: observeRepositorySource(root, stageRelative),
      signal,
    });
    if (
      staged.byteLength !== candidate.byteLength ||
      staged.sha256 !== candidate.sha256
    )
      throw new Error(
        "Actual staged bytes differ from the admitted replacement.",
      );
    await recheckRepositorySource({ root, member, signal });
    if (sourceObservation(observeRegularFile(stage)) !== staged.observation)
      throw new Error("Replacement stage changed before rename.");
    signal?.throwIfAborted();
    await rename(stage, destination);
    renamed = true;
    const actual = await identifyRepositorySource({
      root,
      member: observeRepositorySource(root, member.path),
      signal,
    });
    if (
      actual.sha256 !== candidate.sha256 ||
      actual.byteLength !== candidate.byteLength
    )
      throw new Error("Committed source changed after replacement.");
    return {
      path: member.path,
      byteLength: candidate.byteLength,
      sha256: candidate.sha256,
      observation: actual.observation,
    };
  } catch (error) {
    primary = error;
    throw error;
  } finally {
    const cleanupErrors = [];
    try {
      await descriptor?.close();
    } catch (cleanup) {
      cleanupErrors.push(cleanup);
    }
    if (created && !renamed)
      try {
        await rm(stage, { force: true });
      } catch (cleanup) {
        cleanupErrors.push(cleanup);
      }
    if (cleanupErrors.length)
      throw new AggregateError(
        primary ? [primary, ...cleanupErrors] : cleanupErrors,
        `Replacement cleanup failed; inspect owned stage ${stage}.`,
      );
  }
}
