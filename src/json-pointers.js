// SPDX-License-Identifier: AGPL-3.0-only

/** Encode one decoded member name as an RFC 6901 reference token. */
export function jsonPointerToken(name) {
  return name.replaceAll("~", "~0").replaceAll("/", "~1");
}

/** Resolve an RFC 6901 pointer through own properties of decoded JSON only.
 * Missing fields yield undefined; prototype properties cannot supply provenance.
 */
export function jsonPointerValue(document, pointer) {
  if (
    typeof pointer !== "string" ||
    !/^(?:\/(?:[^~/]|~[01])*)*$/u.test(pointer)
  )
    throw new TypeError("Invalid JSON Pointer.");
  let value = document;
  for (const part of pointer.split("/").slice(1)) {
    const key = part.replaceAll("~1", "/").replaceAll("~0", "~");
    if (!value || typeof value !== "object" || !Object.hasOwn(value, key))
      return undefined;
    value = value[key];
  }
  return value;
}
