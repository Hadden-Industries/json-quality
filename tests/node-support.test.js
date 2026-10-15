// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import {
  qualificationMatrix,
  validatePolicy,
  nodeSupport,
} from "../scripts/node-matrix.js";
import { projectNodeSupport } from "../scripts/project-node-support.js";

const policy = {
  schemaVersion: 1,
  minimums: ["22.13.0", "24.0.0", "26.0.0"],
  reference: "24.21.0",
  platforms: ["ubuntu-24.04", "windows-2025"],
  producerNpm: { version: "12.2.0", range: ">=12.2.0 <13" },
  consumerNpm: "11.21.1",
};
const releases = [
  "26.12.0",
  "22.13.0",
  "22.23.3",
  "24.0.0",
  "24.21.0",
  "24.22.0",
  "26.0.0",
  "27.0.0",
].map((version) => ({ version: `v${version}` }));

test("runtime matrix contains every exact minimum, latest family release and independent reference", () => {
  assert.deepEqual(qualificationMatrix(releases, policy), {
    os: ["ubuntu-24.04", "windows-2025"],
    node: [
      "22.13.0",
      "22.23.3",
      "24.0.0",
      "24.21.0",
      "24.22.0",
      "26.0.0",
      "26.12.0",
    ],
  });
  assert.equal(
    qualificationMatrix(releases.slice(1), policy).node.includes("26.12.0"),
    false,
  );
});

test("matrix refuses missing metadata and never substitutes another family or reference", () => {
  for (const value of [
    [],
    {},
    [{ version: "v24.0.0" }],
    [...releases, { version: "v26.13.0-rc.1" }],
    [...releases, { version: "bad" }],
  ])
    assert.throws(() => qualificationMatrix(value, policy));
  assert.throws(() =>
    qualificationMatrix(
      releases.filter((r) => r.version !== "v24.21.0"),
      policy,
    ),
  );
});

test("policy rejects duplicate, odd, future and prerelease families and unsupported reference", () => {
  for (const minimums of [
    ["22.12.0"],
    ["22.13.0", "22.14.0"],
    ["23.0.0"],
    ["28.0.0"],
    ["22.13.0-rc.1"],
    [],
  ])
    assert.throws(() => validatePolicy({ ...policy, minimums }));
  assert.throws(() => validatePolicy({ ...policy, reference: "25.0.0" }));
  assert.throws(() => validatePolicy({ ...policy, reference: "24.21.0-rc.1" }));
  assert.throws(() => validatePolicy({ ...policy, consumerNpm: "latest" }));
  assert.throws(() =>
    validatePolicy({
      ...policy,
      producerNpm: { version: "12.2.0", range: "^11" },
    }),
  );
  assert.throws(() => validatePolicy({ ...policy, platforms: [] }));
  validatePolicy(nodeSupport);
});

test("a policy edit projects native declarations and is idempotent without modifying unrelated metadata", () => {
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
  const changed = {
    ...policy,
    minimums: ["22.14.0", "24.1.0", "26.0.0"],
    reference: "24.22.0",
  };
  const projected = projectNodeSupport(files, changed);
  const manifest = JSON.parse(projected["package.json"]);
  assert.equal(manifest.engines.node, "^22.14.0 || ^24.1.0 || ^26.0.0");
  assert.deepEqual(manifest.dependencies, { x: "1.0.0" });
  assert.equal(projected[".node-version"], "24.22.0\n");
  assert.match(
    projected["docs/node-runtime-compatibility.md"],
    /Node 22: 22\.14\.0/u,
  );
  assert.match(projected["docs/node-runtime-compatibility.md"], /^Before\n/u);
  assert.match(projected["docs/node-runtime-compatibility.md"], /\nAfter\n$/u);
  assert.deepEqual(projectNodeSupport(projected, changed), projected);
});
