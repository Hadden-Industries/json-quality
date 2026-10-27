// SPDX-License-Identifier: AGPL-3.0-only
// Observe the actual pathname through a short-lived descriptor on every host.
import { constants, lstatSync, openSync, fstatSync, closeSync } from "node:fs";

/** Return full descriptor identity, including the actual volume/device. Older
 * supported Windows Node releases report dev=0 from pathname stat while fstat
 * reports the volume. Reopening the pathname for each observation retains exact
 * descriptor-to-descriptor device/ino comparisons instead of discarding dev.
 * Path lstat still rejects symlinks and brackets each open with stable metadata.
 * Callers own containment, expected hashes and the observation's later recheck.
 */
export function observeRegularFile(/** @type {*} */ path) {
  const before = lstatSync(path, { bigint: true });
  if (!before.isFile() || before.isSymbolicLink())
    throw new Error("Expected regular file observation.");
  const descriptor = openSync(
    path,
    constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
  );
  try {
    const opened = fstatSync(descriptor, { bigint: true }),
      after = lstatSync(path, { bigint: true });
    if (!opened.isFile() || !after.isFile() || after.isSymbolicLink())
      throw new Error("Regular file changed during observation.");
    for (const field of /** @type {const} */ ([
      "ino",
      "size",
      "mode",
      "nlink",
      "mtimeNs",
      "ctimeNs",
    ]))
      if (before[field] !== opened[field] || before[field] !== after[field])
        throw new Error("Regular file changed during observation.");
    if (
      before.dev !== after.dev ||
      ((process.platform !== "win32" || before.dev !== 0n) &&
        before.dev !== opened.dev)
    )
      throw new Error("Regular file device changed during observation.");
    return opened;
  } finally {
    closeSync(descriptor);
  }
}
