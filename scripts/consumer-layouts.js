// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";

export const requiredLayouts = Object.freeze(["root", "isolated"]);
const fields = [
  "sourceCommit",
  "controllerCommit",
  "node",
  "npm",
  "platform",
  "architecture",
  "archiveSha256",
  "packageVersion",
  "nativePackage",
  "publicExports",
  "cliPhysicalFiles",
  "qualification",
  "installSource",
];

/** Two completed installs of exactly the same transported package/runtime tuple. */
export function compactConsumers(reports, { source, node, npm, os }) {
  assert.equal(reports.length, requiredLayouts.length);
  const consumers = Object.fromEntries(
    requiredLayouts.map((layout) => {
      const matches = reports.filter((report) => report.layout === layout);
      assert.equal(matches.length, 1, `Missing or duplicate ${layout} result`);
      const report = matches[0];
      assert.equal(report.status, "passed");
      return [
        layout,
        Object.fromEntries(fields.map((key) => [key, report[key]])),
      ];
    }),
  );
  validateConsumers(consumers, { source, node, npm, os });
  return consumers;
}

export function validateConsumers(consumers, { source, node, npm, os }) {
  assert.deepEqual(
    Object.keys(consumers).sort(),
    [...requiredLayouts].sort(),
    "Incomplete installed layouts",
  );
  assert.deepEqual(
    consumers.root,
    consumers.isolated,
    "Installed layout identities disagree",
  );
  const value = consumers.root;
  assert.equal(value.sourceCommit, source);
  assert.equal(value.controllerCommit, source);
  assert.equal(value.node, node);
  assert.equal(value.npm, npm);
  assert.equal(value.platform, os.startsWith("windows") ? "win32" : "linux");
  assert.equal(value.architecture, "x64");
  assert.match(value.archiveSha256, /^[a-f0-9]{64}$/u);
  assert.equal(value.publicExports, 6);
  assert.equal(value.cliPhysicalFiles, 2);
  assert.equal(value.qualification, "transported archive");
  assert.equal(value.installSource, "producer-archive");
  assert.equal(
    value.nativePackage.name,
    `@hadden-industries/json-quality-${value.platform}-x64`,
  );
  assert.equal(value.nativePackage.version, value.packageVersion);
  assert.match(value.nativePackage.integrity, /^sha512-[A-Za-z0-9+/]+={0,2}$/u);
}
