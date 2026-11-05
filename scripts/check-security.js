// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { npmCommand, budgets } from "./qualification-process.js";

/** No advisory is silently waived. A future exception needs a reviewed policy. */
export function requireCleanAudit(report) {
  assert.equal(report.auditReportVersion, 2);
  assert.ok(
    report.vulnerabilities && report.metadata?.vulnerabilities,
    "Incomplete advisory response",
  );
  assert.equal(
    Object.keys(report.vulnerabilities).length,
    0,
    "Unresolved dependency advisory",
  );
  for (const count of Object.values(report.metadata.vulnerabilities))
    assert.equal(count, 0, "Unresolved dependency vulnerability");
}
export function checkSecurity(output) {
  const root = fileURLToPath(new URL("../", import.meta.url)),
    observedAt = new Date().toISOString();
  if (output) mkdirSync(output, { recursive: true });
  const graphLockSha256 = createHash("sha256")
    .update(readFileSync(join(root, "package-lock.json")))
    .digest("hex");
  let raw;
  try {
    raw = npmCommand(
      ["audit", "--json", "--fetch-retries=2", "--fetch-timeout=120000"],
      {
        cwd: root,
        timeout: budgets.collection,
        phase: "root-complete-graph-audit",
      },
    );
  } catch (error) {
    if (output && error.stdout)
      writeFileSync(join(output, "root-audit.json"), error.stdout, {
        flag: "wx",
      });
    throw error;
  }
  const report = JSON.parse(raw);
  if (output)
    writeFileSync(join(output, "root-audit.json"), raw, { flag: "wx" });
  requireCleanAudit(report);
  const result = {
    schemaVersion: 1,
    observedAt,
    advisorySource:
      "https://registry.npmjs.org/-/npm/v1/security/advisories/bulk",
    policySha256: createHash("sha256")
      .update(readFileSync(fileURLToPath(import.meta.url)))
      .digest("hex"),
    results: [{ name: "root", graphLockSha256, status: "passed" }],
  };
  if (output)
    writeFileSync(
      join(output, "audit-policy.json"),
      JSON.stringify(result) + "\n",
      { flag: "wx" },
    );
  return result;
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  console.log(JSON.stringify(checkSecurity(process.argv[2])));
