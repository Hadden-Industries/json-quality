// SPDX-License-Identifier: AGPL-3.0-only
/** Freeze the existing packer's core and platform archives as one release family. */
import assert from "node:assert/strict";
import { appendFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  archiveInventory,
  readJson,
  regularBytes,
  releaseArtifactBytes,
  save,
  sha256,
  verifyArchive,
  verifyManifest,
  verifyShippedLinks,
  validVersion,
  manualControl,
  assertNativeExecutableModes,
} from "./release-contract.js";
import { nativePackages } from "../src/native-packages.js";
import { npmCommand } from "./qualification-process.js";

export async function freezeRelease(directory, matrix, version) {
  validVersion(version);
  const proofs = readdirSync(directory).filter((name) =>
    name.endsWith(".tgz.provenance.json"),
  );
  assert.equal(proofs.length, 1);
  const provenance = readJson(join(directory, proofs[0]));
  assert.equal(provenance.version, version);
  const archive = join(directory, provenance.archive),
    bytes = releaseArtifactBytes(archive);
  const { files, contents } = await archiveInventory(archive);
  assert.deepEqual(
    files.map(({ path, size }) => ({ path, size })),
    provenance.files
      .map(({ path, size }) => ({ path, size }))
      .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)),
  );
  verifyShippedLinks(files, contents);
  const manifest = JSON.parse(contents.get("package.json"));
  assert.equal(manifest.name, provenance.name);
  assert.equal(manifest.version, version);
  const platformArchives = [];
  for (const entry of provenance.platformPackages) {
    const path = join(directory, entry.archive),
      bytes = releaseArtifactBytes(path),
      inventory = await archiveInventory(path),
      metadata = JSON.parse(inventory.contents.get("package.json"));
    assert.equal(metadata.name, entry.name);
    assert.equal(metadata.version, version);
    const spec = nativePackages[entry.platform];
    assert.ok(spec);
    for (const key of ["os", "cpu", "libc"])
      assert.deepEqual(metadata[key], spec[key]);
    if (entry.platform === "linux-x64")
      assertNativeExecutableModes(inventory.files);
    verifyArchive(bytes, {
      size: bytes.length,
      sha256: entry.sha256,
      integrity: entry.integrity,
    });
    assert.equal(manifest.optionalDependencies[entry.name], version);
    assert.equal(sha256(bytes), entry.sha256);
    assert.deepEqual(
      inventory.files.map(({ path, size }) => ({ path, size })),
      entry.files
        .map(({ path, size }) => ({ path, size }))
        .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)),
    );
    platformArchives.push({
      platform: entry.platform,
      package: entry.name,
      version,
      archive: {
        filename: entry.archive,
        size: bytes.length,
        sha256: entry.sha256,
        integrity: entry.integrity,
        files: inventory.files,
      },
    });
  }
  const policyBytes = regularBytes(
      new URL("../assets/node-support.json", import.meta.url),
    ),
    policy = JSON.parse(policyBytes);
  const release = {
    schemaVersion: 2,
    package: provenance.name,
    version,
    source: {
      commit: provenance.sourceCommit,
      tree: provenance.sourceTree,
      lockSha256: provenance.lockSha256,
      clean: provenance.sourceClean,
    },
    archive: {
      filename: provenance.archive,
      size: bytes.length,
      sha256: provenance.sha256,
      integrity: provenance.integrity,
      files,
    },
    platformArchives,
    matrix,
    policy,
    policySha256: sha256(policyBytes),
    toolchain: {
      node: process.versions.node,
      npm: npmCommand(["--version"]).trim(),
    },
  };
  verifyManifest(release);
  verifyArchive(bytes, release.archive);
  save(join(directory, "release-manifest.json"), release);
  return release;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === "resolve") {
    assert.equal(process.argv.length, 3);
    manualControl(process.env, "qualification");
    const { resolveQualificationMatrix } = await import("./node-matrix.js");
    const version = validVersion(process.env.RELEASE_VERSION);
    assert.equal(readJson("package.json").version, version);
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `matrix=${JSON.stringify(await resolveQualificationMatrix())}\n`,
    );
  } else {
    assert.equal(process.argv.length, 3);
    await freezeRelease(
      process.argv[2],
      JSON.parse(process.env.RELEASE_MATRIX),
      process.env.RELEASE_VERSION,
    );
  }
}
