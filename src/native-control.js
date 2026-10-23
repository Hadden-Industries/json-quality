// SPDX-License-Identifier: AGPL-3.0-only
// Bound control serialization before allocating a wire string or byte buffer.
// JSON serialization remains the platform implementation; payload JSON never
// enters this control path. Native control parsing has its own accounted owner.

/** Encode plain control data within the fixed protocol envelope. The caller
 * owns the input objects; this boundary bounds its additional transport copies.
 * Accessors, custom serialization and cyclic data are not a control contract.
 */
export function encodeNativeControl(input, maximum = 1048576) {
  let bytes = 0;
  const ancestors = new Set();
  const add = (amount) => {
    bytes += amount;
    if (bytes > maximum) throw new Error("control-envelope-size");
  };
  const string = (value) => {
    add(2);
    // Each code unit costs at least one output byte. Reject giants before scan.
    if (value.length > maximum - bytes)
      throw new Error("control-envelope-size");
    for (let index = 0; index < value.length; index++) {
      const code = value.charCodeAt(index);
      if (
        code === 34 ||
        code === 92 ||
        code === 8 ||
        code === 9 ||
        code === 10 ||
        code === 12 ||
        code === 13
      )
        add(2);
      else if (code < 32) add(6);
      else if (code < 128) add(1);
      else if (code < 2048) add(2);
      else if (code >= 0xd800 && code <= 0xdfff) {
        const next = value.charCodeAt(index + 1);
        if (code <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) {
          add(4);
          index++;
        } else add(6);
      } else add(3);
    }
  };
  const visit = (value, depth) => {
    if (value === null) return add(4);
    if (typeof value === "string") return string(value);
    if (typeof value === "boolean") return add(value ? 4 : 5);
    if (typeof value === "number" && Number.isFinite(value))
      return add(JSON.stringify(value).length);
    if (typeof value !== "object" || depth > 32 || ancestors.has(value))
      throw new TypeError("native-control-data");
    const array = Array.isArray(value);
    if (array && Object.getPrototypeOf(value) !== Array.prototype)
      throw new TypeError("native-control-data");
    if (
      !array &&
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    )
      throw new TypeError("native-control-data");
    for (let current = value; current; current = Object.getPrototypeOf(current))
      if (Object.getOwnPropertyDescriptor(current, "toJSON"))
        throw new TypeError("native-control-data");
    ancestors.add(value);
    add(2);
    let count = 0;
    if (array) {
      if (value.length > maximum - bytes)
        throw new Error("control-envelope-size");
      for (let index = 0; index < value.length; index++) {
        const descriptor = Object.getOwnPropertyDescriptor(
          value,
          String(index),
        );
        if (descriptor && !Object.hasOwn(descriptor, "value"))
          throw new TypeError("native-control-data");
        if (count++) add(1);
        visit(descriptor?.value ?? null, depth + 1);
      }
    } else {
      for (const key in value) {
        if (!Object.hasOwn(value, key)) continue;
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!Object.hasOwn(descriptor, "value"))
          throw new TypeError("native-control-data");
        if (descriptor.value === undefined) continue;
        if (count++) add(1);
        string(key);
        add(1);
        visit(descriptor.value, depth + 1);
      }
    }
    ancestors.delete(value);
  };
  visit(input, 0);
  const encoded = Buffer.from(JSON.stringify(input));
  if (encoded.length !== bytes) throw new Error("native-control-serialization");
  return encoded;
}
