// SPDX-License-Identifier: AGPL-3.0-only
// Same producer-owned staging pattern as Markdown Quality: development file links
// never escape into the published core's exact registry dependency declarations.
import assert from "node:assert/strict";
import {
  cpSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { nativePackages } from "../src/native-packages.js";
import { PACKAGE_VERIFICATION_CAPABILITIES as bounds } from "../src/package-payload.js";
import { isPathContained } from "../src/paths.js";

export function stageCore(root, destination) {
  const metadata = JSON.parse(readFileSync(join(root, "package.json")));
  let files = 0,
    bytes = 0;
  function inspect(path) {
    assert.ok(isPathContained(root, path), "Core input escapes the producer");
    const stat = lstatSync(path);
    assert.ok(!stat.isSymbolicLink(), "Linked core package input");
    if (stat.isDirectory()) {
      for (const name of readdirSync(path)) inspect(join(path, name));
    } else {
      assert.ok(stat.isFile() && ++files <= bounds.maximumMembers);
      bytes += stat.size;
      assert.ok(
        stat.size <= bounds.maximumMemberBytes &&
          bytes <= bounds.maximumExpandedBytes,
      );
    }
  }
  for (const path of metadata.files) inspect(join(root, path));
  mkdirSync(destination);
  for (const path of metadata.files)
    // A trailing directory separator makes Linux cp create the target as its
    // own parent before errorOnExist is checked. Copy canonical directory paths.
    cpSync(resolve(root, path), resolve(destination, path), {
      recursive: true,
      force: false,
      errorOnExist: true,
    });
  const published = { ...metadata };
  delete published.scripts;
  published.optionalDependencies = Object.fromEntries(
    Object.values(nativePackages).map((spec) => [
      spec.package,
      metadata.version,
    ]),
  );
  writeFileSync(
    join(destination, "package.json"),
    JSON.stringify(published, null, 2) + "\n",
  );
  return published;
}
