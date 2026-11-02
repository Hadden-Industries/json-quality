// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { native, budgets } from "./qualification-process.js";

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const identity = ({ name, version, integrity }) => ({
  name,
  version,
  integrity,
});

/** Check frozen archive members before any installed package code may run. */
export function verifyMinimalInstalledFiles(root, packages) {
  for (const expected of packages) {
    assert.ok(Array.isArray(expected.files) && expected.files.length > 0);
    for (const member of expected.files) {
      assert.match(member.sha256, /^[a-f0-9]{64}$/u);
      assert.equal(
        digest(
          readFileSync(join(root, "node_modules", expected.name, member.path)),
        ),
        member.sha256,
        `Minimal installed payload differs: ${expected.name}/${member.path}`,
      );
    }
  }
}

/** Reuse npm's exact transported lock routing, then let npm author the minimal lock.
 * Unpublished companion archives remain explicit file resolutions in this fixture.
 * The anonymous registry lane supplies no seed and performs an ordinary install.
 */
export function installMinimalConsumer({
  root,
  npmCliPath,
  env,
  packageName,
  specifier,
  seedLock,
  corePackage,
  nativePackage,
}) {
  assert.equal(corePackage.name, packageName);
  assert.match(corePackage.sha256, /^[a-f0-9]{64}$/u);
  for (const expected of [corePackage, nativePackage]) {
    assert.equal(typeof expected.name, "string");
    assert.equal(typeof expected.version, "string");
    assert.match(expected.integrity, /^sha512-[A-Za-z0-9+/]+={0,2}$/u);
    assert.ok(Array.isArray(expected.files) && expected.files.length > 0);
  }
  mkdirSync(root, { recursive: true });
  execFileSync("git", ["init", "-q", root], { windowsHide: true });
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify(
      {
        name: "json-quality-minimal-consumer",
        version: "0.0.0",
        private: true,
        devDependencies: { [packageName]: specifier },
      },
      null,
      2,
    ) + "\n",
  );
  if (seedLock) writeFileSync(join(root, "package-lock.json"), seedLock);
  native(
    process.execPath,
    [
      npmCliPath,
      "install",
      "--package-lock-only",
      ...(seedLock ? ["--offline"] : []),
      "--engine-strict",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--registry=https://registry.npmjs.org/",
    ],
    {
      cwd: root,
      env,
      timeout: budgets.install,
      phase: "minimal-cli-native-lock",
    },
  );
  const lock = JSON.parse(readFileSync(join(root, "package-lock.json")));
  assert.deepEqual(lock.packages[""].devDependencies, {
    [packageName]: specifier,
  });
  assert.equal(lock.packages[""].dependencies, undefined);
  assert.equal(lock.packages[""].overrides, undefined);
  assert.equal(Object.hasOwn(lock.packages, "node_modules/eslint"), false);
  const observed = [corePackage, nativePackage].map((expected) => {
    const entry = lock.packages[`node_modules/${expected.name}`];
    assert.ok(entry, `Minimal lock is missing ${expected.name}`);
    const actual = {
      name: expected.name,
      version: entry.version,
      integrity: entry.integrity,
    };
    assert.deepEqual(
      actual,
      identity(expected),
      `Minimal lock differs from frozen package: ${expected.name}`,
    );
    return actual;
  });
  native(
    process.execPath,
    [
      npmCliPath,
      "ci",
      "--offline",
      "--engine-strict",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
    ],
    {
      cwd: root,
      env,
      timeout: budgets.install,
      phase: "minimal-cli-offline-install",
    },
  );
  verifyMinimalInstalledFiles(root, [corePackage, nativePackage]);
  return {
    routing: seedLock
      ? "npm-generated-lock-with-transported-file-archives"
      : "anonymous-registry",
    packageName,
    specifier,
    corePackage: { ...observed[0], sha256: corePackage.sha256 },
    nativePackage: observed[1],
  };
}
