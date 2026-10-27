// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import {
  qualificationMatrix,
  validatePolicy,
  nodeSupport,
} from "../scripts/node-matrix.js";
import { projectNodeSupport } from "../scripts/project-node-support.js";
import { assertNativeNpmRuntime } from "../scripts/consumer-toolchain.js";

test("consumer qualification refuses an unsupported native npm runtime before execution", () => {
  const npm = process.env.npm_execpath;
  assert.ok(npm);
  assert.throws(
    () => assertNativeNpmRuntime(npm, "0.1.0"),
    /does not support Node/u,
  );
  const admitted = assertNativeNpmRuntime(npm);
  assert.equal(admitted.modules.length, 4);
  assert.ok(admitted.modules.every((entry) => typeof entry.node === "string"));
});

const policy = {
  schemaVersion: 2,
  minimum: "22.13.0",
  testedLtsMajors: [22, 24],
  preLtsMajors: [],
  reference: "24.21.0",
  platforms: ["ubuntu-24.04", "windows-2025"],
  producerNpm: { version: "12.2.1", range: ">=12.2.1 <13" },
  consumerNpm: "11.21.1",
  support: { otherEngineCompatibleReleases: "best-effort" },
};
const releases = [
  ["26.12.0", false],
  ["22.13.0", "Jod"],
  ["22.23.4", "Jod"],
  ["24.0.0", false],
  ["24.21.0", "Krypton"],
  ["24.22.1", "Krypton"],
  ["27.0.0", false],
].map(([version, lts]) => ({ version: "v" + version, lts }));

test("matrix has one floor, latest qualified LTS patches and the producer reference", () => {
  assert.deepEqual(qualificationMatrix(releases, policy), {
    os: ["ubuntu-24.04", "windows-2025"],
    node: ["22.13.0", "22.23.4", "24.21.0", "24.22.1"],
  });
  assert.equal(
    qualificationMatrix(releases, policy).node.includes("26.12.0"),
    false,
  );
});

test("matrix refuses missing floor/reference/LTS metadata and malformed releases", () => {
  for (const value of [
    [],
    {},
    [{ version: "v24.0.0" }],
    [...releases, { version: "v26.13.0-rc.1" }],
    releases.filter((r) => r.version !== "v22.13.0"),
    releases.filter((r) => r.version !== "v24.21.0"),
    releases.map((r) => ({ ...r, lts: false })),
  ])
    assert.throws(() => qualificationMatrix(value, policy));
});

test("the explicit imminent-LTS selection includes Node 26 before its promotion", () => {
  const forward = {
    ...policy,
    testedLtsMajors: [22, 24, 26],
    preLtsMajors: [26],
  };
  assert.equal(
    qualificationMatrix(releases, forward).node.includes("26.12.0"),
    true,
  );
  assert.throws(() => validatePolicy({ ...forward, preLtsMajors: [28] }));
});

test("policy validates exact stable versions and an explicit unique LTS list without parity inference", () => {
  for (const change of [
    { minimum: "latest" },
    { minimum: "22.13.0-rc.1" },
    { testedLtsMajors: [] },
    { testedLtsMajors: [22, 22] },
    { testedLtsMajors: ["22", 24] },
    { reference: "25.0.0" },
    { reference: "24.21.0-rc.1" },
    { consumerNpm: "latest" },
    { producerNpm: { version: "12.2.0", range: "^11" } },
    { platforms: [] },
    { support: { otherEngineCompatibleReleases: "unsupported" } },
  ])
    assert.throws(() => validatePolicy({ ...policy, ...change }));
  validatePolicy(nodeSupport);
  validatePolicy({ ...policy, testedLtsMajors: [22, 24, 27] });
});

test("floor policy projects metadata and documentation idempotently", () => {
  const files = {
    "package.json":
      JSON.stringify(
        {
          name: "fixture",
          engines: { node: ">=24" },
          packageManager: "npm@12.2.0",
          devEngines: {
            packageManager: {
              name: "npm",
              version: ">=12.2.0 <13",
              onFail: "error",
            },
          },
          dependencies: { x: "1.0.0" },
        },
        null,
        2,
      ) + "\n",
    ".node-version": "24.21.0\n",
    "docs/node-runtime-compatibility.md":
      "Before\n<!-- node-support:start -->\nold\n<!-- node-support:end -->\nAfter\n",
  };
  const projected = projectNodeSupport(files, policy);
  assert.equal(JSON.parse(projected["package.json"]).engines.node, ">=22.13.0");
  assert.deepEqual(JSON.parse(projected["package.json"]).dependencies, {
    x: "1.0.0",
  });
  assert.match(
    projected["docs/node-runtime-compatibility.md"],
    /Qualified LTS majors: 22, 24/u,
  );
  assert.match(projected["docs/node-runtime-compatibility.md"], /^Before\n/u);
  assert.match(projected["docs/node-runtime-compatibility.md"], /\nAfter\n$/u);
  assert.deepEqual(projectNodeSupport(projected, policy), projected);
});
