// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSource } from "../../src/native-normalization.js";
import { JSON_TRANSFORM_CAPABILITIES } from "../../src/transform-capabilities.js";
import { nativeTemporaryRoot, verifiedComponent } from "./client.mjs";
const options = {
  component: verifiedComponent,
  temporaryDirectory: nativeTemporaryRoot,
};

test("explicit NFC transformation changes only native-identified string/key literal spans", async () => {
  assert.equal(
    await normalizeSource(' { "e\\u0301": "e\\u0301", "n": 1e2 } ', options),
    ' { "é": "é", "n": 1e2 } ',
  );
  assert.equal(
    await normalizeSource('{"a":"é","n":1.00}', options),
    '{"a":"é","n":1.00}',
  );
});

test("normalization collision, unsafe numbers and preservation cannot acquire output", async () => {
  await assert.rejects(
    normalizeSource('{"é":0,"e\\u0301":1}', options),
    /duplicate keys/,
  );
  await assert.rejects(
    normalizeSource('{"n":9007199254740992}', options),
    /invalid or unsafe/,
  );
  await assert.rejects(
    normalizeSource('"e\\u0301"', { ...options, normalization: "preserve" }),
    /cannot be normalized/,
  );
});

test("materializing writer capability refuses before a component or body copy is needed", async () => {
  await assert.rejects(
    normalizeSource(
      "x".repeat(JSON_TRANSFORM_CAPABILITIES.maximumSourceBytes + 1),
    ),
    /transform-source-capacity/,
  );
  await assert.rejects(
    normalizeSource('"' + String.fromCharCode(0xd800) + '"'),
    /well-formed UTF-16/,
  );
});

test("normalization refuses finite workspace exhaustion before checking source bytes", async () => {
  await assert.rejects(
    normalizeSource('"' + "é".repeat(349000) + '"', {
      ...options,
      runtimeControls: { managedMemoryTargetBytes: 16777216 },
    }),
    /control-state-budget/,
  );
});

test("normalization changes have an independent finite retained-metadata ceiling", async () => {
  const text =
    "[" +
    Array(JSON_TRANSFORM_CAPABILITIES.maximumNormalizationChanges + 1)
      .fill('"e\\u0301"')
      .join(",") +
    "]";
  await assert.rejects(
    normalizeSource(text, options),
    /transform-change-capacity/,
  );
});
