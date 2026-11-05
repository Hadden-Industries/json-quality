// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { nativePackages } from "../src/native-packages.js";
import { packageName, validVersion } from "./release-contract.js";
import { nativePackageMetadata } from "./project-native-packages.js";

const root = fileURLToPath(new URL("../", import.meta.url));
export const VERSION_PROJECTION_PATHS = Object.freeze([
  "package-lock.json",
  ...Object.keys(nativePackages).map(
    (platform) => `native/prebuilt/${platform}/package.json`,
  ),
]);

/** Project current identity only: dependencies, payloads and evidence stay owned. */
export function projectPackageVersion(files, metadata) {
  assert.equal(metadata.name, packageName, "Unexpected package identity");
  const version = validVersion(metadata.version);
  const output = { ...files };
  const lock = JSON.parse(files["package-lock.json"]);
  assert.equal(lock.lockfileVersion, 3, "Unsupported native npm lockfile");
  assert.equal(lock.name, metadata.name, "Unexpected lockfile identity");
  assert.equal(lock.packages[""].name, metadata.name);
  lock.version = version;
  lock.packages[""].version = version;
  for (const [platform, spec] of Object.entries(nativePackages)) {
    const path = `native/prebuilt/${platform}`;
    assert.equal(lock.packages[path].name, spec.package);
    assert.equal(
      lock.packages[""].optionalDependencies[spec.package],
      `file:${path}`,
    );
    assert.deepEqual(lock.packages[`node_modules/${spec.package}`], {
      resolved: path,
      link: true,
    });
    lock.packages[path].version = version;
    output[`${path}/package.json`] =
      JSON.stringify(nativePackageMetadata(metadata, platform), null, 2) + "\n";
  }
  output["package-lock.json"] = JSON.stringify(lock, null, 2) + "\n";
  return output;
}

/** Compute the complete metadata batch before writing; never install or build. */
export function synchronizePackageVersion(
  directory = root,
  { write = false } = {},
) {
  const metadata = JSON.parse(readFileSync(join(directory, "package.json")));
  const paths = VERSION_PROJECTION_PATHS;
  const files = Object.fromEntries(
    paths.map((path) => [path, readFileSync(join(directory, path), "utf8")]),
  );
  const output = projectPackageVersion(files, metadata);
  const changed = paths.filter(
    (path) =>
      !isDeepStrictEqual(JSON.parse(files[path]), JSON.parse(output[path])),
  );
  if (write)
    for (const path of changed)
      writeFileSync(join(directory, path), output[path]);
  return changed;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 3, "Use --check or --write");
  const mode = process.argv[2];
  assert.ok(["--check", "--write"].includes(mode), "Use --check or --write");
  const changed = synchronizePackageVersion(root, {
    write: mode === "--write",
  });
  console.log(JSON.stringify({ mode, changed }));
  if (mode === "--check" && changed.length) process.exitCode = 1;
}
