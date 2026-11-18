// SPDX-License-Identifier: AGPL-3.0-only
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { npmCommand, budgets } from "./qualification-process.js";
import {
  advisorySource,
  auditPolicySha256,
  requireCleanAudit,
} from "./dependency-audit-policy.js";

export { requireCleanAudit };

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
    advisorySource,
    policySha256: auditPolicySha256(),
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
