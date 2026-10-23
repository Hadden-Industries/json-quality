// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { jsonTokenMeaning } from "./json-token-meaning.js";
import * as prettier from "prettier";
import { checkFixture } from "./source-fixture.js";
import { normalizeJsonSource, jsonFormatOptions } from "../src/index.js";

// Independently retained UO acceptance vectors; ordinary whitespace is isolated
// from semantic findings so formatter decisions cannot become the lint oracle.
const findings = async (text) =>
  (await checkFixture(Buffer.from(text))).findings.filter(
    (f) => f.phase !== "presentation",
  );
for (const text of [
  '{"a":1,"\\u0061":2}',
  '{"x":9007199254740992}',
  '{"x":9007199254740992.0}',
  '{"x":9.007199254740992e15}',
  '{"x":1e400}',
  '{"x":1e-400}',
  '{"x":5e-324}',
  '{"x":"\\ud800"}',
  '{"x":"\\uFDD0"}',
  '{"":1}',
  '{" ":1}',
  '{" x":1}',
  '{"x ":1}',
  '{"x":"e\\u0301"}',
  '{"e\\u0301":1}',
]) {
  test(`strict analysis rejects ${text}`, async () =>
    assert.ok((await findings(text)).length));
}
for (const text of [
  '{"x":0.1}',
  '{"x":9007199254740991}',
  '{"x":-9007199254740991.0}',
  '{"x":""}',
  '{"x":" "}',
  '{"a b":1}',
  '{"x":"é"}',
  '"é"',
  '{"x":"\\uFEFF"}',
]) {
  test(`strict analysis accepts ${text}`, async () =>
    assert.deepEqual(await findings(text), []));
}
for (const bytes of [
  [255],
  [0xc0, 0xaf],
  [0xe2, 0x82],
  [0xef, 0xbb, 0xbf, 123, 125],
]) {
  test(`byte admission rejects ${bytes}`, async () => {
    const checked = await checkFixture(Uint8Array.from(bytes));
    assert.equal(checked.terminal.contractSatisfied, false);
    assert.equal(checked.terminal.semanticRulesApplicable, false);
  });
}
test("empty-key exception is restricted to the exact decoded pointer", async () => {
  const accepted = await checkFixture(Buffer.from('{"packages":{"":{}}}'), {
    allowEmptyKeys: ["/packages/"],
  });
  assert.deepEqual(
    accepted.findings.filter((f) => f.phase === "lint"),
    [],
  );
  const rejected = await checkFixture(
    Buffer.from('{"packages":{"":{}},"":0}'),
    { allowEmptyKeys: ["/packages/"] },
  );
  assert.ok(rejected.findings.some((f) => f.messageId === "empty"));
});
test("NFC repair changes string tokens while retaining number lexemes and order", async () => {
  const before = '{"z":1.00e+2,"e\\u0301":"e\\u0301","a":["x",2]}';
  const after = await normalizeJsonSource(before);
  assert.equal(after, '{"z":1.00e+2,"é":"é","a":["x",2]}');
  assert.equal(await normalizeJsonSource(after), after);
  await assert.rejects(
    normalizeJsonSource('{"é":1,"e\\u0301":2}'),
    /duplicate keys/u,
  );
});
test("native presentation preserves independent decoded and number tokens", async () => {
  const before = '{"z":1.00e+2,"x":"\\u0061","a":[2,1]}';
  const after = await prettier.format(before, await jsonFormatOptions());
  assert.deepEqual(jsonTokenMeaning(after), jsonTokenMeaning(before));
  assert.equal(await normalizeJsonSource(before), before);
});
