// SPDX-License-Identifier: AGPL-3.0-only
// Descriptor-only, iterative admission for caller-owned JSON control data.
import { types } from "node:util";

/** Copy plain JSON data without invoking input code. Bounds describe encoded
 * UTF-8 bytes, container depth and a conservative managed-workspace estimate;
 * they are not measurements of V8 heap or process RSS.
 */
export function snapshotControl(
  /** @type {*} */ input,
  /** @type {*} */ {
    maximumBytes = null,
    maximumDepth = null,
    maximumManagedBytes = null,
    deadline = Infinity,
    retainedManagedBytes = 0n,
  } = {},
) {
  let bytes = 0n,
    nodes = 0n,
    pendingValueNodes = 1n;
  const byteLimit = maximumBytes === null ? null : BigInt(maximumBytes),
    memoryLimit =
      maximumManagedBytes === null ? null : BigInt(maximumManagedBytes),
    ancestors = new Set();
  const checkpoint = () => {
    if (performance.now() > deadline)
      throw new Error("policy-check-time-capacity");
    if (byteLimit !== null && bytes > byteLimit)
      throw new Error("policy-byte-capacity");
    if (
      memoryLimit !== null &&
      retainedManagedBytes + bytes * 5n + (nodes + pendingValueNodes) * 256n >
        memoryLimit
    )
      throw new Error("policy-managed-memory-capacity");
  };
  const add = (/** @type {number | bigint} */ amount) => {
    bytes += BigInt(amount);
    checkpoint();
  };
  const stringBytes = (/** @type {string} */ value) => {
    if (byteLimit !== null && bytes + BigInt(value.length) + 2n > byteLimit)
      throw new Error("policy-byte-capacity");
    if (!value.isWellFormed()) throw new TypeError("policy-control-string");
    add(2);
    for (let index = 0; index < value.length; index++) {
      const code = value.charCodeAt(index);
      if (code === 34 || code === 92 || [8, 9, 10, 12, 13].includes(code))
        add(2);
      else if (code < 32) add(6);
      else if (code < 128) add(1);
      else if (code < 2048) add(2);
      else if (code >= 0xd800 && code <= 0xdbff) {
        add(4);
        index++;
      } else add(3);
    }
  };
  let result;
  checkpoint();
  const pending = [{ input, depth: 0, parent: null, key: "", exit: false }];
  while (pending.length) {
    const task = /** @type {*} */ (pending.pop());
    if (task.exit) {
      ancestors.delete(task.input);
      continue;
    }
    const value = task.input;
    pendingValueNodes--;
    nodes++;
    checkpoint();
    let copy = value;
    if (value === null) add(4);
    else if (typeof value === "string") stringBytes(value);
    else if (typeof value === "boolean") add(value ? 4 : 5);
    else if (
      typeof value === "number" &&
      Number.isFinite(value) &&
      !Object.is(value, -0)
    )
      add(JSON.stringify(value).length);
    else {
      if (
        typeof value !== "object" ||
        types.isProxy(value) ||
        ancestors.has(value)
      )
        throw new TypeError("policy-control-data");
      const array = Array.isArray(value),
        prototype = Object.getPrototypeOf(value),
        depth = task.depth + 1;
      if (
        array
          ? prototype !== Array.prototype
          : prototype !== Object.prototype && prototype !== null
      )
        throw new TypeError("policy-control-prototype");
      if (maximumDepth !== null && depth > maximumDepth)
        throw new Error("policy-nesting-capacity");
      for (
        let current = value;
        current;
        current = Object.getPrototypeOf(current)
      )
        if (Object.getOwnPropertyDescriptor(current, "toJSON"))
          throw new TypeError("policy-control-serialization");
      const keys = Reflect.ownKeys(value);
      const length = array
        ? Object.getOwnPropertyDescriptor(value, "length")?.value
        : 0;
      if (array && keys.length !== length + 1)
        throw new TypeError("policy-control-array");
      // Reserve new children alongside all unvisited siblings before allocating
      // their tasks. Moving a pending value into the snapshot transfers its
      // charge; container node reservations also cover their exit markers.
      // Each property value costs at least a node and one serialized byte.
      const childCount = keys.length - (array ? 1 : 0);
      if (
        memoryLimit !== null &&
        retainedManagedBytes +
          (bytes + 2n + BigInt(childCount)) * 5n +
          (nodes + pendingValueNodes + BigInt(childCount)) * 256n >
          memoryLimit
      )
        throw new Error("policy-managed-memory-capacity");
      pendingValueNodes += BigInt(childCount);
      add(2 + Math.max(0, childCount - 1));
      // Ordinary owned prototypes keep Ajv's JSON equality implementation
      // compatible; defineProperty below keeps __proto__ a data member.
      copy = array ? [] : {};
      ancestors.add(value);
      pending.push({ input: value, depth, parent: null, key: "", exit: true });
      for (let index = keys.length - 1; index >= 0; index--) {
        const key = keys[index];
        if (array && key === "length") continue;
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (
          typeof key !== "string" ||
          !descriptor?.enumerable ||
          !Object.hasOwn(descriptor, "value")
        )
          throw new TypeError("policy-control-descriptor");
        if (array) {
          const numeric = Number(key);
          if (
            !Number.isSafeInteger(numeric) ||
            numeric < 0 ||
            numeric >= length ||
            String(numeric) !== key
          )
            throw new TypeError("policy-control-array");
        } else {
          stringBytes(key);
          add(1);
        }
        pending.push({
          input: descriptor.value,
          depth,
          parent: copy,
          key,
          exit: false,
        });
      }
    }
    if (task.parent === null) result = copy;
    else
      Object.defineProperty(task.parent, task.key, {
        value: copy,
        enumerable: true,
        writable: true,
        configurable: true,
      });
  }
  return {
    value: result,
    encodedByteLength: bytes,
    valueNodeCount: nodes,
    managedReservationBytes: bytes * 5n + nodes * 256n,
  };
}

export function freezeControl(/** @type {*} */ input) {
  const pending = [input];
  while (pending.length) {
    const value = pending.pop();
    if (value === null || typeof value !== "object") continue;
    Object.freeze(value);
    for (const child of Object.values(value))
      if (child !== null && typeof child === "object") pending.push(child);
  }
  return input;
}

/** Fixed-shape options admission happens before any option is evaluated. */
export function readControlOptions(
  /** @type {*} */ input,
  /** @type {string[]} */ names,
) {
  if (
    !input ||
    typeof input !== "object" ||
    types.isProxy(input) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(input))
  )
    throw new TypeError("Invalid control options.");
  const result = Object.create(null);
  for (const key of Reflect.ownKeys(input)) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (
      typeof key !== "string" ||
      !names.includes(key) ||
      !descriptor?.enumerable ||
      !Object.hasOwn(descriptor, "value")
    )
      throw new TypeError(
        "Invalid control option; use the current named options.",
      );
    Object.defineProperty(result, key, {
      value: descriptor.value,
      enumerable: true,
    });
  }
  return result;
}
