// SPDX-License-Identifier: AGPL-3.0-only
// Source-development file links become exact registry versions only at producer packing.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { nativePackages } from "../src/native-packages.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const metadata = JSON.parse(readFileSync(join(root, "package.json")));
const write = process.argv[2] === "--write";
assert.ok(process.argv.length === 2 || (process.argv.length === 3 && write));
for (const [platform, spec] of Object.entries(nativePackages)) {
  const directory = join(root, "native", "prebuilt", platform);
  const expected = {
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
  const expectedBytes = JSON.stringify(expected, null, 2) + "\n";
  const license = readFileSync(join(root, "LICENSE"));
  if (write) {
    writeFileSync(join(directory, "package.json"), expectedBytes);
    writeFileSync(join(directory, "LICENSE"), license);
  } else {
    assert.deepEqual(
      JSON.parse(readFileSync(join(directory, "package.json"))),
      expected,
      "Native package metadata projection drift",
    );
    assert.deepEqual(
      readFileSync(join(directory, "LICENSE")),
      license,
      "Native package license drift",
    );
  }
  assert.equal(
    metadata.optionalDependencies?.[spec.package],
    `file:native/prebuilt/${platform}`,
  );
}
