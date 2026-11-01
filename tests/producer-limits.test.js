// SPDX-License-Identifier: AGPL-3.0-only
/* eslint-disable json-quality/no-json-stringify-identity -- Producer output intentionally matches the platform serializer's ordered bytes for already-admitted plain data. */
import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_JSON_PRODUCER_LIMITS,
  serializeProducerJson,
} from "../src/producer-json.js";
import { DEFAULT_JSON_TRANSFORM_LIMITS } from "../src/transform-capabilities.js";

const serialize = (value, maximumTotalValues, transformControls) =>
  serializeProducerJson(value, { maximumTotalValues }, transformControls);

test("producer counts root-inclusive value occurrences without counting keys", () => {
  const shared = { a: 1 };
  for (const [value, total] of [
    [42, 1],
    [{}, 1],
    [[], 1],
    [{ a: 1 }, 2],
    [[1, 2], 3],
    [{ a: { b: 1 }, c: [2, 3] }, 6],
    [[shared, shared], 5],
  ]) {
    assert.equal(serialize(value, total), JSON.stringify(value));
    if (total > 1)
      assert.throws(
        () => serialize(value, total - 1),
        /producer-value-capacity/u,
      );
  }
});

test("producer defaults admit exactly 65,536 values and reject the next", () => {
  assert.equal(DEFAULT_JSON_PRODUCER_LIMITS.maximumTotalValues, 65536);
  assert.equal(DEFAULT_JSON_PRODUCER_LIMITS.maximumDepth, 32);
  assert.equal(
    DEFAULT_JSON_PRODUCER_LIMITS.maximumEncodedBytes,
    DEFAULT_JSON_TRANSFORM_LIMITS.maximumSourceBytes,
  );
  assert.ok(Object.isFrozen(DEFAULT_JSON_PRODUCER_LIMITS));
  assert.ok(Object.isFrozen(DEFAULT_JSON_TRANSFORM_LIMITS));
  const value = Array(65535).fill(0);
  assert.equal(serializeProducerJson(value), JSON.stringify(value));
  value.push(0);
  assert.throws(() => serializeProducerJson(value), /producer-value-capacity/u);
  assert.equal(serialize(value, null), JSON.stringify(value));
  assert.equal(serializeProducerJson(value, false), JSON.stringify(value));
});

test("producer rejects invalid value quotas and the retired member name", () => {
  for (const maximumTotalValues of [
    0,
    -1,
    1.5,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
  ])
    assert.throws(
      () => serialize(0, maximumTotalValues),
      /Invalid resource quota profile/u,
    );
  assert.throws(
    () => serializeProducerJson(0, { maximumMembers: 1 }),
    TypeError,
  );
});

test("producer lower bounds refuse before evaluating child accessors", () => {
  let getterCalls = 0;
  const value = {};
  Object.defineProperty(value, "a", {
    enumerable: true,
    get() {
      getterCalls++;
      return 1;
    },
  });
  assert.throws(() => serialize(value, 1), /producer-value-capacity/u);
  assert.throws(() => serialize(value, 2), /without accessors/u);
  const array = [];
  Object.defineProperty(array, "0", {
    enumerable: true,
    get() {
      getterCalls++;
      return 1;
    },
  });
  assert.throws(() => serialize(array, 1), /producer-value-capacity/u);
  assert.throws(() => serialize(array, 2), /without accessors/u);
  assert.equal(getterCalls, 0);
});

test("producer refuses sparse and extended arrays without serializing them", () => {
  assert.throws(() => serialize(Array(1), 2), /Sparse or extended arrays/u);
  const value = [1];
  value.extra = 2;
  assert.throws(() => serialize(value, 3), /Sparse or extended arrays/u);
});

test("producer still detects ancestor cycles when total-value quotas are disabled", () => {
  const value = {};
  value.self = value;
  assert.throws(() => serialize(value, null), /acyclic plain JSON/u);
  assert.throws(
    () => serializeProducerJson(value, false),
    /acyclic plain JSON/u,
  );
});

test("producer depth and encoded bytes remain independent of total-value limits", () => {
  const value = { a: { b: 1 } };
  assert.equal(
    serializeProducerJson(value, { maximumTotalValues: 3, maximumDepth: 2 }),
    JSON.stringify(value),
  );
  assert.throws(
    () =>
      serializeProducerJson(value, {
        maximumTotalValues: null,
        maximumDepth: 1,
      }),
    /producer-depth-capacity/u,
  );
  const transformControls = { maximumSourceBytes: 4 };
  assert.equal(serialize("é", 1, transformControls), '"é"');
  assert.throws(
    () => serialize("éé", null, transformControls),
    /control-envelope-size/u,
  );
  assert.throws(
    () => serializeProducerJson("éé", false, transformControls),
    /control-envelope-size/u,
  );
  assert.throws(
    () => serialize("12345", null, transformControls),
    /producer-byte-capacity/u,
  );
  assert.throws(
    () => serializeProducerJson({ "long-key": 0 }, false, transformControls),
    /control-envelope-size/u,
  );
});
