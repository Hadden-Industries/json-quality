// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createRequire } from "node:module";

/** Refuse unsupported npm and native-module engines before consumer checks run. */
export function assertNativeNpmRuntime(
  npmExecutable,
  nodeVersion = process.versions.node,
) {
  const native = createRequire(npmExecutable);
  const semver = native("semver");
  const npm = native("../package.json");
  assert.equal(npm.name, "npm", "Expected the native npm CLI package");
  const modules = [
    npm,
    ...["npm-package-arg", "cacache", "tar"].map((name) =>
      native(`${name}/package.json`),
    ),
  ];
  for (const entry of modules)
    assert.ok(
      typeof entry.engines?.node === "string" &&
        semver.satisfies(nodeVersion, entry.engines.node),
      `${entry.name}@${entry.version} does not support Node ${nodeVersion}`,
    );
  return {
    npm: npm.version,
    modules: modules.map(({ name, version, engines }) => ({
      name,
      version,
      node: engines.node,
    })),
  };
}
