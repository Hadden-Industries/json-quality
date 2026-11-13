// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  qualificationMatrix,
  resolveQualificationMatrix,
  validatePolicy,
  nodeSupport,
} from "../scripts/node-matrix.js";
import {
  projectNodeSupport,
  nodeSupportProjectionPaths,
} from "../scripts/project-node-support.js";
import {
  assertNativeNpmRuntime,
  qualificationEslintVersion,
  qualificationEslintOverrides,
} from "../scripts/consumer-toolchain.js";
import { nodeMatrixFixture, nextPatchVersion } from "./node-matrix-fixture.js";
import { ubuntuRunner } from "../scripts/runner-policy.js";

test("consumer ESLint qualification follows the exact selected lock entry", () => {
  const lock = JSON.parse(
    readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"),
  );
  const selected = lock.packages["node_modules/eslint"];
  assert.equal(qualificationEslintVersion(), selected.version);
  const changed = structuredClone(lock);
  changed.packages["node_modules/eslint"].version = nextPatchVersion(
    selected.version,
  );
  assert.equal(
    qualificationEslintVersion(changed),
    changed.packages["node_modules/eslint"].version,
  );
  delete changed.packages["node_modules/eslint"];
  assert.throws(
    () => qualificationEslintVersion(changed),
    /Locked ESLint identity/u,
  );
});

test("consumer ESLint fixtures retain producer remediations without changing runtime dependencies", () => {
  const metadata = {
    overrides: {
      eslint: { minimatch: "11.0.4" },
      "@eslint/config-array": { minimatch: "11.0.4" },
      ajv: "0.0.0-test-runtime-override",
      "archiver-utils": { glob: "14.0.3" },
    },
  };
  const overrides = qualificationEslintOverrides(metadata);
  assert.deepEqual(overrides, {
    eslint: { minimatch: "11.0.4" },
    "@eslint/config-array": { minimatch: "11.0.4" },
  });
  overrides.eslint.minimatch = "0.0.0-test-mutation";
  assert.equal(metadata.overrides.eslint.minimatch, "11.0.4");
  assert.deepEqual(qualificationEslintOverrides({}), {});
  const current = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.deepEqual(qualificationEslintOverrides(), {
    eslint: current.overrides.eslint,
    "@eslint/config-array": current.overrides["@eslint/config-array"],
  });
});

test("all current Node declarations share the projector inventory and policy", () => {
  const paths = nodeSupportProjectionPaths();
  assert.ok(paths.includes(".node-version"));
  assert.ok(paths.includes(".github/workflows/native-producer.yml"));
  assert.ok(paths.includes(".github/actions/setup-producer/action.yml"));
  const files = Object.fromEntries(
    paths.map((path) => [
      path,
      readFileSync(new URL(`../${path}`, import.meta.url), "utf8"),
    ]),
  );
  assert.deepEqual(
    projectNodeSupport(files),
    files,
    "Run npm run sync:node-support after editing the runtime policy",
  );
  assert.equal(
    JSON.parse(files["package-lock.json"]).packages[""].engines.node,
    `>=${nodeSupport.minimum}`,
  );
  const linux = ubuntuRunner();
  const previous = linux === "ubuntu-24.04" ? "ubuntu-26.04" : "ubuntu-24.04";
  const rollback = projectNodeSupport(files, {
    ...nodeSupport,
    platforms: nodeSupport.platforms.map((lane) =>
      lane === linux ? previous : lane,
    ),
  });
  const workflow = ".github/workflows/native-producer.yml";
  assert.ok(rollback[workflow].includes(previous));
  assert.notEqual(rollback[workflow], files[workflow]);
  assert.deepEqual(projectNodeSupport(rollback), files);
  const source = files[".github/workflows/ci.yml"];
  for (const stale of ["ubuntu-24.04-arm", "ubuntu-slim"]) {
    const altered = source.replace(`runs-on: ${linux}`, `runs-on: ${stale}`);
    assert.notEqual(altered, source);
    assert.deepEqual(
      projectNodeSupport({ ".github/workflows/ci.yml": altered }),
      { ".github/workflows/ci.yml": source },
    );
  }
});

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
  producerNpm: { version: "12.2.1" },
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
  assert.deepEqual(resolveQualificationMatrix(), {
    os: nodeSupport.platforms,
    node: [
      nodeSupport.minimum,
      ...nodeSupport.compatibilityPins,
      nodeSupport.reference,
    ],
  });
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
    [...releases, { version: "v26.13.0-rc..1" }],
    releases.filter((r) => r.version !== "v22.13.0"),
    releases.filter((r) => r.version !== "v24.21.0"),
    releases.map((r) => ({ ...r, lts: false })),
  ])
    assert.throws(() => qualificationMatrix(value, policy));
});

test("official prerelease metadata does not replace the latest stable supported families", () => {
  const forward = {
    ...policy,
    testedLtsMajors: [22, 24, 26],
    preLtsMajors: [26],
    reference: "26.13.0",
  };
  assert.deepEqual(
    qualificationMatrix(
      [
        ...releases,
        { version: "v26.13.0", lts: false },
        { version: "v27.0.0-alpha.0.0.0", lts: false },
        { version: "v26.99.0-rc.1", lts: false },
        { version: "v24.99.0-rc.1", lts: "Krypton" },
      ],
      forward,
    ),
    {
      os: ["ubuntu-24.04", "windows-2025"],
      node: ["22.13.0", "22.23.4", "24.22.1", "26.13.0"],
    },
  );
});

test("shared offline matrices retain floor, latest-family and changed reference lanes", () => {
  assert.deepEqual(nodeMatrixFixture(policy), {
    os: ["ubuntu-24.04", "windows-2025"],
    node: ["22.13.0", "22.13.1", "24.21.0"],
  });
  const changed = {
    ...policy,
    testedLtsMajors: [22, 24, 26],
    reference: "26.3.7",
  };
  assert.deepEqual(nodeMatrixFixture(changed), {
    os: ["ubuntu-24.04", "windows-2025"],
    node: ["22.13.0", "22.13.1", "24.0.0", "26.3.7"],
  });
});

test("negative matrix mutations cannot change another fixture or its source policy", () => {
  const originalPolicy = structuredClone(policy);
  const first = nodeMatrixFixture(policy);
  const second = nodeMatrixFixture(policy);
  const originalSecond = structuredClone(second);
  first.os.pop();
  first.node.pop();
  assert.deepEqual(second, originalSecond);
  assert.deepEqual(policy, originalPolicy);
  assert.notDeepEqual(first, second);
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
  validatePolicy({
    ...policy,
    producerNpm: { version: "12.2.1", range: ">=12.2.1 <13" },
  });
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
    "package-lock.json": "frozen native npm bytes\n",
    ".github/workflows/fixture.yml":
      "node-version: '22.0.0' # reference\nnode-version: ${{ matrix.node }}\nnode-version-file: .node-version\n",
    ".github/actions/fixture/action.yml":
      "node-version: 22.0.0\nusing: node24\n",
    "docs/node-runtime-compatibility.md":
      "Before\n<!-- node-support:start -->\nold\n<!-- node-support:end -->\nAfter\n",
  };
  const projected = projectNodeSupport(files, policy);
  assert.equal(JSON.parse(projected["package.json"]).engines.node, ">=22.13.0");
  assert.equal(
    JSON.parse(projected["package.json"]).packageManager,
    "npm@12.2.1",
  );
  assert.equal(JSON.parse(projected["package.json"]).devEngines, undefined);
  assert.deepEqual(JSON.parse(projected["package.json"]).dependencies, {
    x: "1.0.0",
  });
  assert.equal(projected[".node-version"], policy.reference + "\n");
  assert.equal(projected["package-lock.json"], files["package-lock.json"]);
  assert.equal(
    projected[".github/workflows/fixture.yml"],
    `node-version: '${policy.reference}' # reference\n` +
      "node-version: ${{ matrix.node }}\nnode-version-file: .node-version\n",
  );
  assert.equal(
    projected[".github/actions/fixture/action.yml"],
    `node-version: ${policy.reference}\nusing: node24\n`,
  );
  assert.match(
    projected["docs/node-runtime-compatibility.md"],
    /Qualified LTS majors: 22, 24/u,
  );
  assert.match(projected["docs/node-runtime-compatibility.md"], /^Before\n/u);
  assert.match(projected["docs/node-runtime-compatibility.md"], /\nAfter\n$/u);
  assert.deepEqual(projectNodeSupport(projected, policy), projected);
});
