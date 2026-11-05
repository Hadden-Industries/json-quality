// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import {
  MINIMAL_CLI_CASES,
  MINIMAL_CLI_COMMANDS,
} from "./consumer-cli-probe.js";

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
  "minimalCli",
];

/** Two completed installs of exactly the same transported package/runtime tuple. */
export function compactConsumers(
  reports,
  { source, node, npm, os, defaultPolicySha256 },
) {
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
  validateConsumers(consumers, { source, node, npm, os, defaultPolicySha256 });
  return consumers;
}

export function validateConsumers(
  consumers,
  { source, node, npm, os, defaultPolicySha256 },
) {
  assert.deepEqual(
    Object.keys(consumers).sort(),
    [...requiredLayouts].sort(),
    "Incomplete installed layouts",
  );
  const shared = ({ minimalCli: _minimalCli, ...value }) => value;
  assert.deepEqual(
    shared(consumers.root),
    shared(consumers.isolated),
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
  assert.equal(value.publicExports, 7);
  assert.equal(value.cliPhysicalFiles, 2);
  assert.equal(value.qualification, "transported archive");
  assert.equal(value.installSource, "producer-archive");
  assert.equal(
    value.nativePackage.name,
    `@hadden-industries/json-quality-${value.platform}-x64`,
  );
  assert.equal(value.nativePackage.version, value.packageVersion);
  assert.match(value.nativePackage.integrity, /^sha512-[A-Za-z0-9+/]+={0,2}$/u);
  for (const consumer of Object.values(consumers))
    validateMinimalCli(
      consumer.minimalCli,
      value.packageVersion,
      consumer.installSource,
      defaultPolicySha256,
      {
        name: "@hadden-industries/json-quality",
        version: value.packageVersion,
        sha256: value.archiveSha256,
      },
      value.nativePackage,
    );
  const sharedMinimal = ({
    generatedLockSha256: _generatedLockSha256,
    ...value
  }) => value;
  assert.deepEqual(
    sharedMinimal(consumers.root.minimalCli),
    sharedMinimal(consumers.isolated.minimalCli),
  );
}

export function validateMinimalCli(
  value,
  packageVersion,
  installSource,
  expectedDefaultPolicySha256,
  expectedCorePackage,
  expectedNativePackage,
) {
  assert.equal(value.status, "passed");
  assert.equal(value.packageVersion, packageVersion);
  assert.equal(value.cohortVersion, 5);
  assert.equal(value.policy, "package-defaults");
  assert.equal(value.command, "npm exec -- json-quality");
  assert.equal(value.packageName, "@hadden-industries/json-quality");
  assert.deepEqual(value.nativePackage, expectedNativePackage);
  assert.match(value.corePackage.integrity, /^sha512-[A-Za-z0-9+/]+={0,2}$/u);
  assert.deepEqual(
    value.corePackage,
    {
      ...expectedCorePackage,
      integrity: expectedCorePackage.integrity ?? value.corePackage.integrity,
    },
    "Minimal CLI core differs from its frozen input",
  );
  assert.deepEqual(value.cases, MINIMAL_CLI_CASES);
  assert.deepEqual(value.commands, MINIMAL_CLI_COMMANDS);
  assert.match(value.generatedLockSha256, /^[a-f0-9]{64}$/u);
  assert.match(value.defaultPolicySha256, /^[a-f0-9]{64}$/u);
  assert.match(expectedDefaultPolicySha256, /^[a-f0-9]{64}$/u);
  assert.equal(
    value.defaultPolicySha256,
    expectedDefaultPolicySha256,
    "Minimal CLI default policy differs from its frozen input",
  );
  assert.equal(
    value.routing,
    installSource === "registry"
      ? "anonymous-registry"
      : "npm-generated-lock-with-transported-file-archives",
  );
  if (installSource === "registry")
    assert.equal(value.specifier, packageVersion);
  else assert.ok(value.specifier.startsWith("file:"));
}

export function frozenDefaultPolicyDigest(files) {
  assert.ok(Array.isArray(files), "Missing frozen archive file inventory");
  const matches = files.filter(
    ({ path }) => path === "assets/default-json-quality-policy.json",
  );
  assert.equal(
    matches.length,
    1,
    "Missing or duplicate frozen default policy asset",
  );
  assert.match(matches[0].sha256, /^[a-f0-9]{64}$/u);
  return matches[0].sha256;
}
