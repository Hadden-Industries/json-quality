// SPDX-License-Identifier: AGPL-3.0-only
// Native serialization of an already materialized, caller-owned producer value.
// This finite convenience is never used by scalable source checking.
import { encodeNativeControl } from "./native-control.js";
import { DEFAULT_JSON_TRANSFORM_LIMITS } from "./transform-capabilities.js";
import {
  resourceDefaults,
  resolveResourceProfile,
  exceedsQuota,
} from "./resource-profile.js";

export const DEFAULT_JSON_PRODUCER_LIMITS = Object.freeze({
  ...resourceDefaults("producerControls"),
  maximumEncodedBytes: DEFAULT_JSON_TRANSFORM_LIMITS.maximumSourceBytes,
});

/** Admit plain JSON data without evaluating accessors/custom serialization or
 * accepting native JSON.stringify's lossy unsupported-value conversions. Input
 * objects and reflection metadata belong to the producer; this helper does not
 * promise scalable traversal of a pre-existing JavaScript object graph.
 */
export function serializeProducerJson(
  /** @type {*} */ value,
  /** @type {*} */ producerControls,
  /** @type {*} */ transformControls = DEFAULT_JSON_TRANSFORM_LIMITS,
) {
  const selected = resolveResourceProfile(
      resourceDefaults("producerControls"),
      undefined,
      producerControls,
    ),
    capabilities = {
      ...selected,
      maximumEncodedBytes: transformControls.maximumSourceBytes,
    };
  const ancestors = new Set();
  let totalValues = 0;
  const inspect = (/** @type {*} */ item, /** @type {*} */ depth) => {
    // Charge each serialized occurrence, including containers and the root.
    // Property names are metadata; shared acyclic objects are visited again.
    if (exceedsQuota(++totalValues, capabilities.maximumTotalValues))
      throw new Error("producer-value-capacity");
    if (exceedsQuota(depth, capabilities.maximumDepth))
      throw new Error("producer-depth-capacity");
    if (item === null || typeof item === "boolean") return;
    if (typeof item === "string") {
      if (!item.isWellFormed()) throw new TypeError("producer-string-encoding");
      if (exceedsQuota(item.length, capabilities.maximumEncodedBytes))
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
      capabilities.maximumTotalValues !== null &&
      item.length > capabilities.maximumTotalValues - totalValues
    )
      throw new Error("producer-value-capacity");
    const keys = Reflect.ownKeys(item);
    // Each child costs at least one future visit. These lower bounds do not
    // charge children, and the array length descriptor is not a JSON value.
    if (
      capabilities.maximumTotalValues !== null &&
      keys.length >
        capabilities.maximumTotalValues - totalValues + (array ? 1 : 0)
    )
      throw new Error("producer-value-capacity");
    if (array && keys.length !== item.length + 1)
      throw new TypeError("Sparse or extended arrays are not JSON data.");
    ancestors.add(item);
    for (const key of keys) {
      if (array && key === "length") continue;
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (
        typeof key !== "string" ||
        !key.isWellFormed() ||
        !descriptor ||
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
  return encodeNativeControl(value, capabilities.maximumEncodedBytes).toString(
    "utf8",
  );
}
