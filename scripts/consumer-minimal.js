// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { native, budgets } from "./qualification-process.js";

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
}) {
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
  return {
    routing: seedLock
      ? "npm-generated-lock-with-transported-file-archives"
      : "anonymous-registry",
    packageName,
    specifier,
  };
}
