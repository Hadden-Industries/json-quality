// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { checkJsonDocument, checkJsonLines } from "../src/index.js";

for (const [analyze, path, framing] of [
  [checkJsonDocument, "invalid.json", false],
  [checkJsonLines, "invalid.jsonl", true],
])
  test(`${path} retains exact invalid-byte diagnostics and coverage`, async () => {
    for (const bytes of [
      Buffer.from([0xff]),
      Buffer.from([0xc0, 0xaf]),
      Buffer.from([0xef, 0xbb, 0xbf, 123, 125, 10]),
    ]) {
      const result = await analyze(bytes, { path });
      assert.deepEqual(result, {
        path,
        complete: true,
        syntaxValid: false,
        presentationChecked: false,
        ...(framing ? { recordCount: null } : {}),
        findings: [
          {
            path,
            phase: "bytes",
            ruleId: null,
            messageId: "invalid-utf8-or-bom",
            line: 1,
            column: 1,
          },
        ],
        expectedFindings: [],
      });
      assert.deepEqual(Object.keys(result), [
        "path",
        "complete",
        "syntaxValid",
        "presentationChecked",
        ...(framing ? ["recordCount"] : []),
        "findings",
        "expectedFindings",
      ]);
    }
  });
