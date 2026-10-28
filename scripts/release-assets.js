// SPDX-License-Identifier: AGPL-3.0-only
/** Keep installable subjects separate from one indexed, offline-verifiable proof bundle. */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { native, budgets } from "./qualification-process.js";
import { artifactLimits } from "./artifact-policy.js";
import { evidenceIndex, gh } from "./release-provider.js";
import {
  jsonBytes,
  releaseArtifactBytes,
  releasePackages,
  save,
  sha256,
  readJson,
  regularBytes,
  repository,
  safeMember,
} from "./release-contract.js";

export function bundleReleaseAssets(
  directory,
  release,
  scratch,
  manifestSha256,
) {
  const bundle = join(scratch, "assets"),
    evidence = join(scratch, "release-evidence");
  mkdirSync(bundle);
  mkdirSync(evidence);
  const standalone = new Set([
    ...releasePackages(release).map((subject) => subject.archive.filename),
    "source.tar.gz",
    "release-manifest.json",
    "release-review.json",
    "release-acceptance.json",
    "THIRD-PARTY-NOTICES.md",
  ]);
  const members = evidenceIndex(directory).filter(
    ({ name }) => name !== "evidence-index.json",
  );
  assert.ok(
    [...standalone].every((name) =>
      members.some((entry) => entry.name === name),
    ),
    "Missing standalone release subject or owner decision",
  );
  const files = members.filter(({ name }) => !standalone.has(name));
  assert.ok(files.length, "Release evidence is required");
  for (const entry of files) {
    const target = join(evidence, entry.name);
    mkdirSync(dirname(target), { recursive: true });
    save(target, releaseArtifactBytes(join(directory, entry.name)));
  }
  save(join(evidence, "evidence-index.json"), {
    schemaVersion: 1,
    manifestSha256,
    source: release.source.commit,
    files,
  });
  const evidenceName = "release-evidence.zip";
  native(
    process.platform === "win32" ? "python" : "python3",
    [
      fileURLToPath(new URL("./pack-artifact.py", import.meta.url)),
      evidence,
      join(bundle, evidenceName),
      String(artifactLimits.payloadBytes),
    ],
    { timeout: budgets.collection, phase: "release-evidence-pack" },
  );
  const assets = members
    .filter(({ name }) => standalone.has(name))
    .map((entry) => ({
      ...entry,
      source: entry.name,
    }));
  for (const entry of assets)
    save(
      join(bundle, entry.name),
      releaseArtifactBytes(join(directory, entry.source)),
    );
  const evidenceBytes = releaseArtifactBytes(join(bundle, evidenceName));
  assets.push({
    name: evidenceName,
    size: evidenceBytes.length,
    sha256: sha256(evidenceBytes),
  });
  const assetManifest = jsonBytes({
    schemaVersion: 2,
    manifestSha256,
    source: release.source.commit,
    assets,
    evidence: { filename: evidenceName, files },
  });
  save(join(bundle, "release-assets.json"), assetManifest);
  assets.push({
    name: "release-assets.json",
    size: assetManifest.length,
    sha256: sha256(assetManifest),
  });
  assert.equal(
    assets.length,
    10,
    "Release assets must remain proportionate to the three-package family",
  );
  return { bundle, assets };
}
export function verifyDraftAssets(expected, observed) {
  assert.equal(
    new Set(observed.map((asset) => asset.name)).size,
    observed.length,
  );
  assert.deepEqual(
    observed.map((asset) => asset.name).sort(),
    expected.map((asset) => asset.name).sort(),
    "Incomplete or extra GitHub assets",
  );
  for (const asset of expected) {
    const actual = observed.find((item) => item.name === asset.name);
    assert.equal(actual.size, asset.size);
    assert.equal(actual.digest, `sha256:${asset.sha256}`);
  }
}

/** Admit original immutable flat assets and current digest-indexed proof bundles. */
export function acquireArchiveEvidence(
  directory,
  release,
  observed,
  requested,
  readers = {},
) {
  const bytes = regularBytes(join(directory, "release-assets.json"));
  const index = JSON.parse(bytes);
  assert.ok(
    [1, 2].includes(index.schemaVersion),
    "Unsupported release asset index",
  );
  assert.equal(
    index.manifestSha256,
    sha256(regularBytes(join(directory, "release-manifest.json"))),
  );
  assert.equal(index.source, release.source.commit);
  assert.ok(
    Array.isArray(index.assets) &&
      index.assets.length > 0 &&
      index.assets.length <= 4096,
  );
  const names = new Set();
  const admit = (entry, nested = false) => {
    assert.equal(typeof entry.name, "string");
    if (nested) safeMember(entry.name);
    else assert.match(entry.name, /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,240}$/u);
    assert.match(entry.sha256, /^[a-f0-9]{64}$/u);
    assert.ok(Number.isSafeInteger(entry.size) && entry.size >= 0);
    assert.ok(!names.has(entry.name), "Duplicate indexed release member");
    names.add(entry.name);
  };
  for (const entry of index.assets) admit(entry);
  verifyDraftAssets(
    [
      ...index.assets,
      {
        name: "release-assets.json",
        size: bytes.length,
        sha256: sha256(bytes),
      },
    ],
    observed,
  );
  for (const subject of releasePackages(release)) {
    const entry = index.assets.find(
      (asset) => asset.name === subject.archive.filename,
    );
    assert.ok(entry, "Archive index omitted a package");
    assert.equal(entry.sha256, subject.archive.sha256);
    assert.equal(entry.size, subject.archive.size);
  }
  const acquire =
    readers.acquire ??
    ((name) => {
      gh([
        "release",
        "download",
        `v${release.version}`,
        "--repo",
        repository,
        "--pattern",
        name,
        "--dir",
        directory,
      ]);
      gh([
        "release",
        "verify-asset",
        `v${release.version}`,
        join(directory, name),
        "--repo",
        repository,
        "--format",
        "json",
      ]);
    });
  const verifyBytes = (entry, path) => {
    const value = releaseArtifactBytes(path);
    assert.equal(
      value.length,
      entry.size,
      "Indexed release member size differs",
    );
    assert.equal(
      sha256(value),
      entry.sha256,
      "Indexed release member digest differs",
    );
    return value;
  };
  let proofRoot;
  if (index.schemaVersion === 2) {
    assert.equal(index.evidence?.filename, "release-evidence.zip");
    const outer = index.assets.find(
      (asset) => asset.name === index.evidence.filename,
    );
    assert.ok(outer, "Evidence ZIP absent from asset index");
    acquire(outer.name);
    verifyBytes(outer, join(directory, outer.name));
    proofRoot = join(directory, "verified-evidence");
    mkdirSync(proofRoot);
    (
      readers.extract ??
      ((archive, destination) =>
        native(
          process.platform === "win32" ? "python" : "python3",
          [
            fileURLToPath(new URL("./extract-artifact.py", import.meta.url)),
            archive,
            destination,
            String(artifactLimits.payloadBytes),
          ],
          { timeout: budgets.collection, phase: "archived-evidence-extract" },
        ))
    )(join(directory, outer.name), proofRoot);
    names.clear();
    assert.ok(
      Array.isArray(index.evidence.files) &&
        index.evidence.files.length <= 4095,
    );
    for (const entry of index.evidence.files) admit(entry, true);
    assert.ok(!names.has("evidence-index.json"));
    const inner = readJson(join(proofRoot, "evidence-index.json"));
    assert.equal(inner.schemaVersion, 1);
    assert.equal(inner.manifestSha256, index.manifestSha256);
    assert.equal(inner.source, index.source);
    assert.deepEqual(
      inner.files,
      index.evidence.files,
      "Inner and outer evidence inventories differ",
    );
    assert.deepEqual(
      evidenceIndex(proofRoot)
        .map((entry) => entry.name)
        .sort(),
      [...names, "evidence-index.json"].sort(),
      "Unexpected or missing archived evidence member",
    );
    for (const entry of inner.files)
      verifyBytes(entry, join(proofRoot, entry.name));
  }
  for (const path of requested) {
    safeMember(path);
    let value;
    if (index.schemaVersion === 2) {
      assert.ok(
        index.evidence.files.some((entry) => entry.name === path),
        "Required proof member is unindexed",
      );
      value = releaseArtifactBytes(join(proofRoot, path));
    } else {
      const entries = index.assets.filter((entry) => entry.source === path);
      assert.equal(
        entries.length,
        1,
        "Required legacy proof member is missing or ambiguous",
      );
      const entry = entries[0];
      acquire(entry.name);
      value = verifyBytes(entry, join(directory, entry.name));
    }
    const destination = join(directory, path);
    mkdirSync(dirname(destination), { recursive: true });
    if (
      index.schemaVersion === 2 ||
      index.assets.find((entry) => entry.source === path).name !== path
    )
      save(destination, value);
  }
  return index;
}
