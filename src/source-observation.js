// SPDX-License-Identifier: AGPL-3.0-only
/** Exact regular-file observation from a BigInt Stats result. Descriptor and
 * pathname are compared independently; bytes alone cannot admit a replacement.
 */
export function sourceObservation(/** @type {*} */ stat) {
  if (!stat.isFile() || stat.isSymbolicLink())
    throw new Error("Nonregular source observation.");
  return [
    stat.dev,
    stat.ino,
    stat.size,
    stat.mtimeNs,
    stat.ctimeNs,
    stat.mode,
  ].join(":");
}
