// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { assertNativeNpmRuntime } from "./consumer-toolchain.js";

const expected = process.env.JSON_QUALITY_EXPECTED_NODE;
const npm = process.env.JSON_QUALITY_CONSUMER_NPM;
const archives = process.env.JSON_QUALITY_ARCHIVE_DIRECTORY;
assert.equal(
  process.versions.node,
  expected,
  "Selected Node runtime differs from the frozen lane",
);
assert.ok(npm && archives);
assertNativeNpmRuntime(npm);
assert.ok(
  process.env.JSON_QUALITY_PRODUCER_NODE &&
    process.env.JSON_QUALITY_PRODUCER_NPM,
  "Reference fixture producer is required",
);
const policy = JSON.parse(
  readFileSync(new URL("../assets/node-support.json", import.meta.url), "utf8"),
);
assert.equal(
  execFileSync(process.env.JSON_QUALITY_PRODUCER_NODE, ["--version"], {
    encoding: "utf8",
    windowsHide: true,
  }).trim(),
  `v${policy.reference}`,
);
assert.equal(
  execFileSync(
    process.env.JSON_QUALITY_PRODUCER_NODE,
    [process.env.JSON_QUALITY_PRODUCER_NPM, "--version"],
    { encoding: "utf8", windowsHide: true },
  ).trim(),
  policy.producerNpm.version,
);
const proofs = readdirSync(archives).filter((path) =>
  path.endsWith(".tgz.provenance.json"),
);
assert.equal(proofs.length, 1, "Expected one immutable producer archive");
const provenance = join(archives, proofs[0]);
const identity = JSON.parse(readFileSync(provenance, "utf8"));
// Only fixture packing uses the reference producer. Archive/cache admission,
// including every unsafe-member regression, executes on the consumer Node/npm.
const tests = readdirSync(new URL("../tests/", import.meta.url))
  .filter(
    (path) =>
      path.endsWith(".test.js") &&
      ![
        "pack.test.js",
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
    "--expected-npm",
    policy.consumerNpm,
    "--git",
    identity.sourceCommit,
    "--output",
    process.env.JSON_QUALITY_REPORT,
  ],
  { stdio: "inherit", windowsHide: true, timeout: 600000 },
);
