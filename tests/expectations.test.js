// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { checkJsonDocument } from "../src/documents.js";

test("exact expected findings retain negatives and reject changed or missing violations", async () => {
  const bytes = Buffer.from('{"x":"\\uFDD0"}');
  const contract = {
    path: "negative.json",
    formatContract: "preserved-bytes",
    allowFormatWrites: false,
    exceptions: [
      {
        owner: "Corpus owner",
        reason: "Retain the interoperability counterexample.",
      },
    ],
    expected: {
      sha256: createHash("sha256").update(bytes).digest("hex"),
      byteLength: bytes.length,
      diagnostics: [
        {
          phase: "lint",
          ruleId: "json-quality/interoperability",
          messageId: "noncharacter",
          line: 1,
          column: 6,
          endLine: 1,
          endColumn: 14,
        },
      ],
    },
  };
  const accepted = await checkJsonDocument(bytes, contract);
  assert.deepEqual(accepted.findings, []);
  assert.equal(accepted.expectedFindings.length, 1);
  assert.equal(accepted.presentationChecked, false);
  assert.equal(accepted.presentationContractVerified, true);
  for (const changed of [
    '{"x":"safe"}',
    '{"x":"\\uFDD0","bad":9007199254740992}',
  ]) {
    const result = await checkJsonDocument(Buffer.from(changed), contract);
    assert.ok(result.findings.some((f) => f.phase === "expectation"));
  }
  const wrongSpan = structuredClone(contract);
  wrongSpan.expected.diagnostics[0].column = 7;
  assert.ok(
    (await checkJsonDocument(bytes, wrongSpan)).findings.some(
      (f) => f.phase === "expectation",
    ),
  );
});
