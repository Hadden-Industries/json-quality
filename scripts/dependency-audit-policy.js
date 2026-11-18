// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const advisorySource =
  "https://registry.npmjs.org/-/npm/v1/security/advisories/bulk";

/** Require a completed, zero-finding npm audit for every qualified graph. */
export function requireCleanAudit(report) {
  assert.equal(report.auditReportVersion, 2);
  assert.ok(!report.error, "Dependency audit did not complete");
  const counts = report.metadata?.vulnerabilities;
  assert.ok(report.vulnerabilities && counts, "Incomplete advisory response");
  assert.deepEqual(
    report.vulnerabilities,
    {},
    "Unresolved dependency advisory",
  );
  assert.equal(counts.total, 0, "Unresolved dependency vulnerability");
  for (const count of Object.values(counts))
    assert.equal(count, 0, "Unresolved dependency vulnerability");
}

export function auditPolicySha256() {
  return createHash("sha256")
    .update(readFileSync(new URL(import.meta.url)))
    .digest("hex");
}
