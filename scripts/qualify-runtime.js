// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const expected = process.env.JSON_QUALITY_EXPECTED_NODE;
const npm = process.env.JSON_QUALITY_CONSUMER_NPM;
const archives = process.env.JSON_QUALITY_ARCHIVE_DIRECTORY;
assert.equal(
  process.versions.node,
  expected,
  "Selected Node runtime differs from the frozen lane",
);
assert.ok(npm && archives);
const proofs = readdirSync(archives).filter((path) =>
  path.endsWith(".tgz.provenance.json"),
);
assert.equal(proofs.length, 1, "Expected one immutable producer archive");
const provenance = join(archives, proofs[0]);
const identity = JSON.parse(readFileSync(provenance, "utf8"));
// npm 12 pack/cold-install fixture tests belong to the reference producer.
// Every source-only product test runs directly on the actual selected Node.
const tests = readdirSync(new URL("../tests/", import.meta.url))
  .filter(
    (path) =>
      path.endsWith(".test.js") &&
      ![
        "pack.test.js",
        "installation.test.js",
        "affected-tests.test.js",
        "node-support.test.js",
      ].includes(path),
  )
  .map((path) => join("tests", path));
execFileSync(process.execPath, ["--test", ...tests], {
  stdio: "inherit",
  windowsHide: true,
  timeout: 600000,
  env: { ...process.env, npm_execpath: npm },
});
execFileSync(
  process.execPath,
  [
    "scripts/qualify-package.js",
    "--archive",
    join(archives, identity.archive),
    "--provenance",
    provenance,
    "--npm",
    npm,
    "--expected-node",
    expected,
    "--git",
    identity.sourceCommit,
    "--output",
    process.env.JSON_QUALITY_REPORT,
  ],
  { stdio: "inherit", windowsHide: true, timeout: 600000 },
);
