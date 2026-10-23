// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { NativeSession } from "./client.mjs";
const digest = (text) => createHash("sha256").update(text).digest("hex");
async function checked(expected) {
  const core = new NativeSession();
  try {
    await core.configure();
    await core.capture([Buffer.from("0")], {
      formatContract: "producer-json-compact-body",
      expected,
    });
    const events = [];
    for await (const event of core.events()) events.push(event);
    return {
      terminal: events.at(-1),
      findings: events.filter(({ type }) => type === "finding"),
    };
  } finally {
    await core.close();
  }
}

test("changed expected bytes fail admission without turning valid JSON into intrinsic bad quality", async () => {
  const { terminal, findings } = await checked({
    sha256: digest("1"),
    byteLength: "1",
    diagnostics: [],
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].messageId, "expected-bytes-or-diagnostics-mismatch");
  assert.equal(terminal.qualityPassed, true);
  assert.equal(terminal.expectedMatched, false);
  assert.equal(terminal.contractSatisfied, false);
});

test("a generated mismatch cannot be declared as an expected source diagnostic", async () => {
  await assert.rejects(
    checked({
      sha256: digest("0"),
      byteLength: "1",
      diagnostics: [
        {
          severity: "error",
          phase: "expectation",
          ruleId: null,
          messageId: "expected-bytes-or-diagnostics-mismatch",
          line: "1",
          column: "1",
          endLine: "1",
          endColumn: "1",
        },
      ],
    }),
    /source-contract-diagnostic/,
  );
});
