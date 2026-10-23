// SPDX-License-Identifier: AGPL-3.0-only
/** Admit pull-based source/control iterators without owning an eager array.
 * Payload fragment bounds belong to the consuming transport's byte contract.
 */
export function requireAsyncStream(value, name) {
  if (!value || typeof value[Symbol.asyncIterator] !== "function")
    throw new TypeError(`${name} must be an asynchronous stream.`);
  return value;
}
