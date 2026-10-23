// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { checkFixture } from "./source-fixture.js";

for (const format of ["json", "jsonl"])
  test(`${format} retains whole-source byte admission before JSON/record claims`, async () => {
    for (const bytes of [
      Buffer.from([0xff]),
      Buffer.from([0xc0, 0xaf]),
      Buffer.from([0xef, 0xbb, 0xbf, 123, 125, 10]),
      Buffer.concat([Buffer.from("{}\n"), Buffer.from([0xff])]),
    ]) {
      const result = await checkFixture(bytes, {
        path: `invalid.${format}`,
        format,
      });
      assert.equal(result.terminal.parserComplete, false);
      assert.equal(result.terminal.semanticRulesApplicable, false);
      assert.equal(result.terminal.contractSatisfied, false);
      assert.equal(result.terminal.diagnosticsComplete, true);
      assert.equal(result.findings.length, 1);
      assert.equal(result.findings[0].phase, "bytes");
      assert.equal(result.findings[0].messageId, "invalid-utf8-or-bom");
      if (format === "jsonl") assert.equal(result.terminal.recordCount, null);
      assert.equal(
        result.events.some((event) => event.type === "value"),
        false,
      );
    }
  });
