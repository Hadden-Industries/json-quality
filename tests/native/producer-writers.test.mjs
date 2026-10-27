// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { serializeProducerJson } from "../../src/producer-json.js";
import { formatSource } from "../../src/native-formatting.js";
import { formatJsonSource, formatJsonValue } from "../../src/writers.js";
import { verifiedComponent, nativeTemporaryRoot } from "./client.mjs";

const options = {
  component: verifiedComponent,
  temporaryDirectory: nativeTemporaryRoot,
};

test("producer serialization preserves platform JSON data before shared presentation", async () => {
  const value = {
      embedded: "{invalid JSON",
      literal: "\\u0061",
      n: 1.25,
      nested: [true, null],
    },
    encoded = serializeProducerJson(value),
    formatted = await formatSource(encoded, options);
  // eslint-disable-next-line json-quality/no-json-stringify-identity -- This producer contract deliberately preserves the platform serializer's exact ordered bytes.
  assert.equal(encoded, JSON.stringify(value));
  assert.deepEqual(JSON.parse(formatted), value);
});

test("producer quotas are caller-owned and preserve plain JSON validation", () => {
  let value = 0;
  for (let depth = 0; depth < 40; depth++) value = [value];
  assert.throws(() => serializeProducerJson(value), /producer-depth-capacity/);
  assert.equal(
    serializeProducerJson(value, false),
    "[".repeat(40) + "0" + "]".repeat(40),
  );
  assert.throws(
    () => serializeProducerJson(value, { maximumDepth: 1 }),
    /producer-depth-capacity/,
  );
  assert.throws(
    () => serializeProducerJson({ value: undefined }, false),
    /JSON producer data/,
  );
});

test("a caller can format beyond the default transform byte quota", async () => {
  const text = '"' + "x".repeat(2097153) + '"';
  await assert.rejects(formatJsonSource(text), /transform-source-capacity/);
  const formatted = await formatJsonSource(text, {
    capacityLimits: false,
    runtimeControls: false,
    transformControls: false,
  });
  assert.equal(formatted, text + "\n");
  await assert.rejects(
    formatJsonSource(text, { transformControls: { maximumSourceBytes: 1024 } }),
    /transform-source-capacity/,
  );
});

test("producer admission never evaluates accessors or accepts lossy native conversions", () => {
  let evaluated = false;
  const accessor = {
      get value() {
        evaluated = true;
        return 1;
      },
    },
    custom = {
      toJSON() {
        evaluated = true;
        return 1;
      },
    },
    cyclic = {};
  cyclic.self = cyclic;
  for (const value of [
    accessor,
    custom,
    cyclic,
    [undefined],
    Array(2),
    -0,
    Infinity,
    1n,
    new Date(),
    { [Symbol("key")]: 1 },
  ])
    assert.throws(() => serializeProducerJson(value));
  assert.equal(evaluated, false);
  assert.throws(() => serializeProducerJson("\uD800"), /encoding/);
  assert.throws(() => serializeProducerJson("x".repeat(2097153)), /capacity/);
});

test("public finite writer admission precedes installed component acquisition", async () => {
  await assert.rejects(
    formatJsonSource("x".repeat(2097153)),
    /transform-source-capacity/,
  );
  await assert.rejects(
    formatJsonValue({ value: undefined }),
    /JSON producer data/,
  );
  await assert.rejects(
    formatJsonSource("0", { backend: "alternate" }),
    /writer options/,
  );
  await assert.rejects(formatJsonSource("0", { contract: { expected: {} } }));
});

test("formatting preserves independently pinned Unicode values without claiming NFC repair", async () => {
  const value = "e\u0301",
    pin = {
      pointer: "/value",
      sha256: createHash("sha256").update(value).digest("hex"),
      byteLength: String(Buffer.byteLength(value)),
    },
    selected = {
      ...options,
      preserveNfcValues: [pin],
      owner: "Producer",
      reason: "Exact externally owned decoded value",
      allowFormatWrites: false,
    };
  const formatted = await formatSource('{"value":"e\\u0301"}', selected);
  assert.equal(JSON.parse(formatted).value, value);
  await assert.rejects(
    formatSource('{"value":"changed"}', selected),
    /invalid or unsafe/,
  );
});
