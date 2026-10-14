// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { checkJsonLines } from "../src/json-lines.js";

test("JSONL preserves CRLF/LF framing and reports native failures on the correct record", async () => {
  const bytes = Buffer.from('{"x":1}\r\n{"x":1,"x":2}\n');
  const before = Buffer.from(bytes);
  const result = await checkJsonLines(bytes, { path: "journal.jsonl" });
  assert.equal(result.recordCount, 2);
  assert.ok(
    result.findings.some(
      (f) =>
        f.ruleId === "json/no-duplicate-keys" && f.line === 2 && f.record === 2,
    ),
  );
  assert.deepEqual(bytes, before);
});

test("blank and multiline/truncated JSONL records cannot disappear", async () => {
  for (const value of ["{}\n\n", "{}\n   \n", '{}\n{"x":\n1}', '{}\n{"x":']) {
    const result = await checkJsonLines(Buffer.from(value), {
      path: "vectors.jsonl",
    });
    assert.ok(result.findings.length, value);
  }
});

test("valid CRLF records and an optional final terminator retain their envelopes", async () => {
  for (const text of ['{"x":1}\r\n{}\r\n', '{"x":1}\n{}', '{"x":1}\n{}\n'])
    assert.deepEqual(
      (await checkJsonLines(Buffer.from(text), { path: "journal.jsonl" }))
        .findings,
      [],
    );
});
