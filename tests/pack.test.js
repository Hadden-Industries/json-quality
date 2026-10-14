// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readPackReport } from "../scripts/pack.js";

test("native npm 12 pack reporting admits exactly one package and rejects legacy shapes", () => {
  const npm = process.env.npm_execpath;
  assert.ok(npm, "Run the maintained test entry point through npm.");
  const output = execFileSync(
    process.execPath,
    [npm, "pack", "--ignore-scripts", "--dry-run", "--json"],
    { encoding: "utf8", windowsHide: true },
  );
  const report = readPackReport(output);
  assert.equal(report.name, "@hadden-industries/json-quality");
  assert.ok(report.files.some((file) => file.path === "src/cli.js"));
  assert.throws(() => readPackReport(JSON.stringify([report])), /exactly one/u);
  assert.deepEqual(
    readPackReport(JSON.stringify({ [report.name]: report })),
    report,
  );
  assert.throws(() => readPackReport("[]"), /exactly one/u);
  assert.throws(
    () => readPackReport(JSON.stringify([report, report])),
    /exactly one/u,
  );
});
