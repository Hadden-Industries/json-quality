// SPDX-License-Identifier: AGPL-3.0-only
// Native serialization of an already materialized, caller-owned producer value.
// This finite convenience is never used by scalable source checking.
import { encodeNativeControl } from "./native-control.js";
import { JSON_TRANSFORM_CAPABILITIES } from "./transform-capabilities.js";

export const JSON_PRODUCER_CAPABILITIES = Object.freeze({
  maximumDepth: 32,
  maximumMembers: 65536,
  maximumEncodedBytes: JSON_TRANSFORM_CAPABILITIES.maximumSourceBytes,
});

/** Admit plain JSON data without evaluating accessors/custom serialization or
 * accepting native JSON.stringify's lossy unsupported-value conversions. Input
 * objects and reflection metadata belong to the producer; this helper does not
 * promise scalable traversal of a pre-existing JavaScript object graph.
 */
export function serializeProducerJson(value) {
  const ancestors = new Set();
  let members = 0;
  const inspect = (item, depth) => {
    if (++members > JSON_PRODUCER_CAPABILITIES.maximumMembers)
      throw new Error("producer-member-capacity");
    if (depth > JSON_PRODUCER_CAPABILITIES.maximumDepth)
      throw new Error("producer-depth-capacity");
    if (item === null || typeof item === "boolean") return;
    if (typeof item === "string") {
      if (!item.isWellFormed()) throw new TypeError("producer-string-encoding");
      if (item.length > JSON_PRODUCER_CAPABILITIES.maximumEncodedBytes)
        throw new Error("producer-byte-capacity");
      return;
    }
    if (
      typeof item === "number" &&
      Number.isFinite(item) &&
      !Object.is(item, -0)
    )
      return;
    if (typeof item !== "object" || ancestors.has(item))
      throw new TypeError("Expected acyclic plain JSON producer data.");
    const array = Array.isArray(item),
      prototype = Object.getPrototypeOf(item);
    if (
      array
        ? prototype !== Array.prototype
        : ![null, Object.prototype].includes(prototype)
    )
      throw new TypeError("Expected plain JSON producer data.");
    if (
      array &&
      item.length > JSON_PRODUCER_CAPABILITIES.maximumMembers - members
    )
      throw new Error("producer-member-capacity");
    const keys = Reflect.ownKeys(item);
    if (
      keys.length >
      JSON_PRODUCER_CAPABILITIES.maximumMembers - members + (array ? 1 : 0)
    )
      throw new Error("producer-member-capacity");
    if (array && keys.length !== item.length + 1)
      throw new TypeError("Sparse or extended arrays are not JSON data.");
    ancestors.add(item);
    for (const key of keys) {
      if (array && key === "length") continue;
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (
        typeof key !== "string" ||
        !key.isWellFormed() ||
        !descriptor.enumerable ||
        !Object.hasOwn(descriptor, "value") ||
        (array &&
          (!/^(?:0|[1-9][0-9]*)$/u.test(key) || Number(key) >= item.length))
      )
        throw new TypeError(
          "Expected JSON data without accessors or hidden properties.",
        );
      inspect(descriptor.value, depth + 1);
    }
    ancestors.delete(item);
  };
  inspect(value, 0);
  return encodeNativeControl(
    value,
    JSON_PRODUCER_CAPABILITIES.maximumEncodedBytes,
  ).toString("utf8");
}
