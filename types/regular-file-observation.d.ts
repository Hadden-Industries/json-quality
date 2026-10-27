/** Return full descriptor identity, including the actual volume/device. Older
 * supported Windows Node releases report dev=0 from pathname stat while fstat
 * reports the volume. Reopening the pathname for each observation retains exact
 * descriptor-to-descriptor device/ino comparisons instead of discarding dev.
 * Path lstat still rejects symlinks and brackets each open with stable metadata.
 * Callers own containment, expected hashes and the observation's later recheck.
 */
export declare function observeRegularFile(
  /** @type {*} */ path: any,
): import("node:fs").BigIntStats;
