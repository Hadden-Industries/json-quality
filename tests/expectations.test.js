// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { checkFixture } from "./source-fixture.js";

test("exact expected findings retain negatives and reject changed or missing violations", async () => {
  const bytes = Buffer.from('{"x":"\\uFDD0"}');
  const contract = {
    path: "negative.json",
    formatContract: "preserved-bytes",
    allowFormatWrites: false,
    owner: "Corpus owner",
    reason: "Retain the interoperability counterexample.",
    expected: {
      sha256: createHash("sha256").update(bytes).digest("hex"),
      byteLength: String(bytes.length),
      diagnostics: [
        {
          phase: "lint",
          severity: "error",
          ruleId: "json-quality/interoperability",
          messageId: "noncharacter",
          codePoint: "U+FDD0",
          line: "1",
          column: "6",
          endLine: "1",
          endColumn: "14",
        },
      ],
    },
  };
  const accepted = await checkFixture(bytes, contract);
  assert.equal(accepted.findings.length, 1);
  assert.equal(accepted.terminal.qualityPassed, false);
  assert.equal(accepted.terminal.contractSatisfied, true);
  assert.equal(accepted.terminal.expectedMatched, true);
  assert.equal(accepted.terminal.presentationChecked, false);
  for (const changed of [
    '{"x":"safe"}',
    '{"x":"\\uFDD0","bad":9007199254740992}',
  ]) {
    const result = await checkFixture(Buffer.from(changed), contract);
    assert.ok(result.findings.some((f) => f.phase === "expectation"));
  }
  const wrongSpan = structuredClone(contract);
  wrongSpan.expected.diagnostics[0].column = "7";
  assert.ok(
    (await checkFixture(bytes, wrongSpan)).findings.some(
      (f) => f.phase === "expectation",
    ),
  );
});

test("exact syntax counterexamples remain visible while their pinned contract is satisfied", async () => {
  const bytes = Buffer.from('{"x":');
  const result = await checkFixture(bytes, {
    formatContract: "preserved-bytes",
    allowFormatWrites: false,
    owner: "Corpus owner",
    reason: "Retain the truncated-object counterexample.",
    expected: {
      sha256: createHash("sha256").update(bytes).digest("hex"),
      byteLength: String(bytes.length),
      diagnostics: [
        {
          severity: "error",
          phase: "syntax",
          ruleId: null,
          messageId: "syntax",
          line: "1",
          column: "6",
          endLine: "1",
          endColumn: "6",
        },
      ],
    },
  });
  assert.equal(result.terminal.qualityPassed, false);
  assert.equal(result.terminal.contractSatisfied, true);
  assert.equal(result.findings.length, 1);
});
