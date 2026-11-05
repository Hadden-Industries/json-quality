// SPDX-License-Identifier: AGPL-3.0-only
// Source-development file links become exact registry versions only at producer packing.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { nativePackages } from "../src/native-packages.js";

const root = fileURLToPath(new URL("../", import.meta.url));
/** One metadata projection shared by shipment checks and version synchronization. */
export function nativePackageMetadata(metadata, platform) {
  const spec = nativePackages[platform];
  assert.ok(spec, "Unsupported native package platform");
  assert.equal(
    metadata.optionalDependencies?.[spec.package],
    `file:native/prebuilt/${platform}`,
  );
  return {
    name: spec.package,
    version: metadata.version,
    description: `Verified ${platform} native component for JSON Quality`,
    license: metadata.license,
    os: spec.os,
    cpu: spec.cpu,
    ...(spec.libc ? { libc: spec.libc } : {}),
    files: [
      "json-quality.node",
      spec.executable,
      "component.json",
      "build-evidence.json",
      "notice-inventory.json",
      "THIRD-PARTY-NOTICES.txt",
      "notices",
      "LICENSE",
    ],
    exports: {
      "./package.json": "./package.json",
      "./component.json": "./component.json",
      "./executable": "./" + spec.executable,
    },
    bin: { "json-quality-native": spec.executable },
    repository: metadata.repository,
    publishConfig: metadata.publishConfig,
  };
}

export function projectNativePackages(
  directory = root,
  { write = false } = {},
) {
  const metadata = JSON.parse(readFileSync(join(directory, "package.json")));
  for (const platform of Object.keys(nativePackages)) {
    const packageDirectory = join(directory, "native", "prebuilt", platform);
    const expected = nativePackageMetadata(metadata, platform);
    const expectedBytes = JSON.stringify(expected, null, 2) + "\n";
    const license = readFileSync(join(directory, "LICENSE"));
    if (write) {
      writeFileSync(join(packageDirectory, "package.json"), expectedBytes);
      writeFileSync(join(packageDirectory, "LICENSE"), license);
    } else {
      assert.deepEqual(
        JSON.parse(readFileSync(join(packageDirectory, "package.json"))),
        expected,
        "Native package metadata projection drift",
      );
      assert.deepEqual(
        readFileSync(join(packageDirectory, "LICENSE")),
        license,
        "Native package license drift",
      );
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const write = process.argv[2] === "--write";
  assert.ok(process.argv.length === 2 || (process.argv.length === 3 && write));
  projectNativePackages(root, { write });
}
