// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { temporaryDirectory } from "./temporary-directory.js";
import {
  projectPackageVersion,
  synchronizePackageVersion,
  VERSION_PROJECTION_PATHS,
} from "../scripts/project-package-version.js";
import { projectNativePackages } from "../scripts/project-native-packages.js";
import {
  releaseDocumentationInputs,
  releaseDocuments,
} from "../scripts/release-documentation.js";
import {
  readPolicyInputInventory,
  policyResolverFingerprint,
} from "../src/policy-inputs.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const metadata = JSON.parse(readFileSync(join(root, "package.json")));
const sources = () =>
  Object.fromEntries(
    VERSION_PROJECTION_PATHS.map((path) => [
      path,
      readFileSync(join(root, path), "utf8"),
    ]),
  );
const withoutCurrentVersions = (source) => {
  const lock = JSON.parse(source);
  delete lock.version;
  for (const path of [
    "",
    "native/prebuilt/linux-x64",
    "native/prebuilt/win32-x64",
  ])
    delete lock.packages[path].version;
  return lock;
};

test("future candidate projection changes owned identities without changing dependencies, history or payload evidence", () => {
  const files = {
    ...sources(),
    "docs/plans/historical.md":
      "Historical candidate 1.2.3 remains accepted.\n",
    "release-approval.json": '{"version":"1.2.3","approved":true}\n',
    "native/prebuilt/linux-x64/component.json":
      '{"sourceInputsSha256":"retained"}\n',
  };
  const before = structuredClone(files);
  const future = { ...metadata, version: "7.8.9-rc.12" };
  const output = projectPackageVersion(files, future);
  assert.deepEqual(files, before);
  const lock = JSON.parse(output["package-lock.json"]);
  assert.equal(lock.version, future.version);
  for (const path of [
    "",
    "native/prebuilt/linux-x64",
    "native/prebuilt/win32-x64",
  ])
    assert.equal(lock.packages[path].version, future.version);
  for (const path of VERSION_PROJECTION_PATHS.filter(
    (path) => path !== "package-lock.json",
  )) {
    const expected = JSON.parse(before[path]);
    expected.version = future.version;
    assert.deepEqual(JSON.parse(output[path]), expected);
  }
  assert.deepEqual(
    withoutCurrentVersions(output["package-lock.json"]),
    withoutCurrentVersions(before["package-lock.json"]),
  );
  for (const path of Object.keys(before).filter(
    (path) => !VERSION_PROJECTION_PATHS.includes(path),
  ))
    assert.equal(output[path], before[path]);
  assert.deepEqual(projectPackageVersion(output, future), output);
  const stable = { ...future, version: "7.8.9" };
  assert.equal(
    JSON.parse(projectPackageVersion(output, stable)["package-lock.json"])
      .version,
    stable.version,
  );
});

function fixture(t) {
  const directory = temporaryDirectory(t, "json-quality-version-");
  const policyPaths = readPolicyInputInventory(root).files;
  const paths = [
    ...new Set([
      ...VERSION_PROJECTION_PATHS,
      ...releaseDocumentationInputs,
      ...policyPaths,
      "package.json",
      "assets/json-quality-policy-inputs.json",
      "LICENSE",
      "native/prebuilt/linux-x64/LICENSE",
      "native/prebuilt/win32-x64/LICENSE",
    ]),
  ];
  for (const path of paths) {
    mkdirSync(dirname(join(directory, path)), { recursive: true });
    copyFileSync(join(root, path), join(directory, path));
  }
  for (const path of [
    "historical-approval.json",
    "native/prebuilt/linux-x64/component.json",
    "native/prebuilt/linux-x64/json-quality.node",
  ]) {
    writeFileSync(
      join(directory, path),
      `Unchanged independently owned bytes: ${path}\n`,
    );
    paths.push(path);
  }
  return {
    directory,
    paths,
    snapshot: () =>
      Object.fromEntries(
        paths.map((path) => [
          path,
          readFileSync(join(directory, path), "utf8"),
        ]),
      ),
  };
}

test("version synchronization ignores JSON member order and whitespace without rewriting files", (t) => {
  const { directory, snapshot } = fixture(t);
  const permute = (value) => {
    if (Array.isArray(value)) return value.map(permute);
    if (value === null || typeof value !== "object") return value;
    return Object.fromEntries(
      Object.entries(value)
        .reverse()
        .map(([key, member]) => [key, permute(member)]),
    );
  };
  for (const path of VERSION_PROJECTION_PATHS)
    writeFileSync(
      join(directory, path),
      JSON.stringify(permute(JSON.parse(readFileSync(join(directory, path))))) +
        "\n",
    );
  const before = snapshot();
  assert.deepEqual(synchronizePackageVersion(directory), []);
  assert.deepEqual(synchronizePackageVersion(directory, { write: true }), []);
  assert.deepEqual(snapshot(), before, "Equal projections must preserve bytes");
});

test("current documentation follows the repository, Node policy and contract cohort", (t) => {
  const { directory, snapshot } = fixture(t);
  const update = (path, changes) => {
    const target = join(directory, path);
    const value = JSON.parse(readFileSync(target));
    writeFileSync(target, JSON.stringify({ ...value, ...changes }));
  };
  update("package.json", {
    repository: {
      ...metadata.repository,
      url: "git+https://github.com/example/json-sample.git",
    },
  });
  update("assets/node-support.json", { minimum: "24.0.0" });
  update("schemas/contract-cohort.json", {
    cohortVersion: 7,
    configurationSchemaVersion: 5,
    eventSchemaVersion: 6,
    nativeProtocolVersion: 6,
    componentSchemaVersion: 5,
    nodeApiVersion: 10,
  });
  const companions = VERSION_PROJECTION_PATHS.filter(
    (path) => path !== "package-lock.json",
  );
  const expected = [...companions, ...releaseDocuments];
  const before = snapshot();
  assert.deepEqual(synchronizePackageVersion(directory), expected);
  assert.deepEqual(snapshot(), before);
  assert.deepEqual(
    synchronizePackageVersion(directory, { write: true }),
    expected,
  );
  const after = snapshot();
  assert.ok(
    after["README.md"].includes(
      `https://github.com/example/json-sample/blob/v${metadata.version}/docs/consumer-guide.md`,
    ),
  );
  assert.ok(after["docs/migration-guide.md"].includes("Node.js 24.0.0"));
  assert.ok(
    after["docs/consumer-guide.md"].includes(
      "cohort 7, events 6, configuration/source-contract 5, native protocol 6, component schema 5 and Node-API 10",
    ),
  );
  assert.equal(after["package-lock.json"], before["package-lock.json"]);
  for (const path of companions)
    assert.deepEqual(
      JSON.parse(after[path]).repository,
      JSON.parse(after["package.json"]).repository,
    );
  assert.deepEqual(synchronizePackageVersion(directory), []);
});

test("one package version edit synchronizes companions and lock identities while preserving policy inventory and fingerprint", (t) => {
  const { directory, snapshot } = fixture(t);
  const fingerprint = policyResolverFingerprint(directory);
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({ ...metadata, version: "7.8.9-rc.12" }, null, 2) + "\n",
  );
  const before = snapshot();
  const expected = [...VERSION_PROJECTION_PATHS, ...releaseDocuments];
  assert.equal(policyResolverFingerprint(directory), fingerprint);
  assert.deepEqual(synchronizePackageVersion(directory), expected);
  assert.deepEqual(
    snapshot(),
    before,
    "Read-only admission must preserve every byte",
  );
  assert.deepEqual(
    synchronizePackageVersion(directory, { write: true }),
    expected,
  );
  const after = snapshot();
  assert.deepEqual(
    Object.keys(after)
      .filter((path) => before[path] !== after[path])
      .sort(),
    [...expected].sort(),
  );
  assert.equal(
    after["assets/json-quality-policy-inputs.json"],
    before["assets/json-quality-policy-inputs.json"],
  );
  assert.equal(policyResolverFingerprint(directory), fingerprint);
  projectNativePackages(directory);
  assert.deepEqual(synchronizePackageVersion(directory), []);
  assert.deepEqual(synchronizePackageVersion(directory, { write: true }), []);
  assert.deepEqual(snapshot(), after);
  const inventoryPath = join(
    directory,
    "assets/json-quality-policy-inputs.json",
  );
  writeFileSync(inventoryPath, "Deliberately malformed unrelated inventory\n");
  assert.deepEqual(synchronizePackageVersion(directory), []);
  assert.deepEqual(synchronizePackageVersion(directory, { write: true }), []);
  assert.equal(
    readFileSync(inventoryPath, "utf8"),
    "Deliberately malformed unrelated inventory\n",
  );
});

test("version synchronization refuses malformed identity or substituted lock targets before any write", (t) => {
  const files = sources();
  for (const version of ["v1.2.3", "01.2.3", "1.2.3+build.1", null])
    assert.throws(() => projectPackageVersion(files, { ...metadata, version }));
  assert.throws(() =>
    projectPackageVersion(files, { ...metadata, name: "other" }),
  );
  const { directory, snapshot } = fixture(t);
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({ ...metadata, version: "7.8.9" }),
  );
  const lock = JSON.parse(files["package-lock.json"]);
  lock.packages[
    "node_modules/@hadden-industries/json-quality-win32-x64"
  ].resolved = "unowned/location";
  writeFileSync(join(directory, "package-lock.json"), JSON.stringify(lock));
  const before = snapshot();
  assert.throws(() => synchronizePackageVersion(directory, { write: true }));
  assert.deepEqual(
    snapshot(),
    before,
    "A bad later target cannot permit partial synchronization",
  );
});

test("version synchronization refuses malformed later projections before any write", (t) => {
  const { directory, snapshot } = fixture(t);
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({ ...metadata, version: "7.8.9" }),
  );
  writeFileSync(
    join(directory, "native/prebuilt/win32-x64/package.json"),
    '{"version":',
  );
  const before = snapshot();
  assert.throws(
    () => synchronizePackageVersion(directory, { write: true }),
    SyntaxError,
  );
  assert.deepEqual(snapshot(), before, "Refusal must precede every write");
});

test("version CLI and native metadata imports remain read-only outside the checkout", (t) => {
  const cwd = temporaryDirectory(t, "json-quality-version-cli-");
  const before = sources();
  const output = execFileSync(
    process.execPath,
    [join(root, "scripts/project-package-version.js"), "--check"],
    { cwd, encoding: "utf8", windowsHide: true },
  );
  assert.deepEqual(JSON.parse(output), { mode: "--check", changed: [] });
  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import ${JSON.stringify(new URL("../scripts/project-native-packages.js", import.meta.url).href)};`,
    ],
    { cwd, encoding: "utf8", windowsHide: true },
  );
  assert.deepEqual(sources(), before);
});

test("current documentation follows one version edit while historical closeout remains literal", (t) => {
  const { directory } = fixture(t);
  const documents = [
    "README.md",
    "docs/consumer-guide.md",
    "docs/release-operations.md",
  ];
  for (const path of documents) {
    for (const input of [
      path,
      `docs/release-templates/${path.split("/").at(-1)}.in`,
    ]) {
      mkdirSync(dirname(join(directory, input)), { recursive: true });
      copyFileSync(join(root, input), join(directory, input));
    }
  }
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({ ...metadata, version: "7.8.9" }),
  );
  synchronizePackageVersion(directory, { write: true });
  assert.match(
    readFileSync(join(directory, "README.md"), "utf8"),
    /JSON Quality 7\.8\.9/u,
  );
  const runbook = readFileSync(
    join(directory, "docs/release-operations.md"),
    "utf8",
  );
  assert.match(runbook, /7\.8\.9 release notes.*#789/u);
  assert.match(runbook, /For the 1\.0\.1 closeout/u);
  const before = readFileSync(join(directory, "package-lock.json"), "utf8");
  writeFileSync(
    join(directory, "docs/release-templates/README.md.in"),
    "{{release.unknown}}\n",
  );
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({ ...metadata, version: "8.0.0" }),
  );
  assert.throws(
    () => synchronizePackageVersion(directory, { write: true }),
    /Unknown release variable/u,
  );
  assert.equal(
    readFileSync(join(directory, "package-lock.json"), "utf8"),
    before,
  );
});

test("one current version synchronizes the documentation index and upgrade guides with one explicit comparison baseline", (t) => {
  for (const path of [
    "docs/README.md",
    "docs/support-and-release.md",
    "docs/migration-guide.md",
  ])
    assert.ok(
      releaseDocuments.includes(path),
      `Missing current version projection: ${path}`,
    );
  const { directory } = fixture(t);
  const baseline = JSON.parse(
    readFileSync(join(directory, "docs/release-versions.json")),
  );
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({ ...metadata, version: "7.8.9" }),
  );
  synchronizePackageVersion(directory, { write: true });
  for (const path of [
    "docs/README.md",
    "docs/support-and-release.md",
    "docs/migration-guide.md",
  ])
    assert.match(readFileSync(join(directory, path), "utf8"), /7\.8\.9/u, path);
  assert.match(
    readFileSync(join(directory, "docs/support-and-release.md"), "utf8"),
    new RegExp(
      `Changes since ${baseline.previousVersion.replaceAll(".", "\\.")}`,
      "u",
    ),
  );
  assert.match(
    readFileSync(join(directory, "docs/migration-guide.md"), "utf8"),
    /#789|to 7\.8\.9/u,
  );
  assert.ok(
    readFileSync(join(directory, "docs/migration-guide.md"), "utf8").includes(
      `#changes-since-${baseline.previousVersion.replace(/[.+]/gu, "")}`,
    ),
  );
  assert.deepEqual(synchronizePackageVersion(directory), []);
  const before = readFileSync(join(directory, "package-lock.json"));
  writeFileSync(
    join(directory, "docs/release-versions.json"),
    JSON.stringify({ previousVersion: "7.8.9" }),
  );
  assert.throws(
    () => synchronizePackageVersion(directory, { write: true }),
    /Release versions must differ/u,
  );
  assert.deepEqual(readFileSync(join(directory, "package-lock.json")), before);
  for (const invalid of [
    { previousVersion: "v1.0.1" },
    { previousVersion: "1.0.1+build.1" },
    { previousVersion: baseline.previousVersion, version: "8.0.0" },
  ]) {
    writeFileSync(
      join(directory, "docs/release-versions.json"),
      JSON.stringify(invalid),
    );
    assert.throws(() => synchronizePackageVersion(directory, { write: true }));
    assert.deepEqual(
      readFileSync(join(directory, "package-lock.json")),
      before,
    );
  }
});
