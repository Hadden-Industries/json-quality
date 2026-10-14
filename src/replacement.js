// SPDX-License-Identifier: AGPL-3.0-only
import {
  constants,
  lstatSync,
  readFileSync,
  openSync,
  writeFileSync,
  fsyncSync,
  closeSync,
  renameSync,
  unlinkSync,
} from "node:fs";
import { join, dirname, basename } from "node:path";
import { randomUUID } from "node:crypto";
import { assertRegularSource } from "./paths.js";

/** Observe every path component; writer inputs must remain contained regular files. */
export function captureSource(root, path) {
  const current = assertRegularSource(root, path);
  const before = lstatSync(current);
  const bytes = readFileSync(current);
  const after = lstatSync(current);
  const identity = (stat) => [
    stat.dev,
    stat.ino,
    stat.size,
    stat.mtimeMs,
    stat.ctimeMs,
    stat.mode,
  ];
  if (identity(before).some((value, i) => value !== identity(after)[i]))
    throw new Error(`Source changed during observation: ${path}`);
  return { identity: identity(after), bytes, mode: after.mode };
}

/** Recheck exact bytes and filesystem identity; a same-byte replacement also fails. */
export function assertSourceUnchanged(root, path, original) {
  const fresh = captureSource(root, path);
  if (
    fresh.identity.some((value, i) => value !== original.identity[i]) ||
    !fresh.bytes.equals(original.bytes)
  )
    throw new Error(`Source changed after preflight: ${path}`);
}

/** Replace one admitted file, preserving permissions; no whole-batch atomicity claim.
 * Concurrent hostile filesystem mutation remains outside the supported guarantee.
 */
export function replaceSource(root, path, original, bytes) {
  assertSourceUnchanged(root, path, original);
  const destination = join(root, path);
  const temporary = join(
    dirname(destination),
    `.${basename(destination)}.json-quality-${randomUUID()}.tmp`,
  );
  let created = false;
  let descriptor;
  try {
    descriptor = openSync(
      temporary,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,
      original.mode & 0o777,
    );
    created = true;
    writeFileSync(descriptor, bytes);
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    assertSourceUnchanged(root, path, original);
    renameSync(temporary, destination);
    created = false;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    if (created) unlinkSync(temporary);
  }
}
