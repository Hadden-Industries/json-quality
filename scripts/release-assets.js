// SPDX-License-Identifier: AGPL-3.0-only
/** Keep installable subjects separate from one indexed, offline-verifiable proof bundle. */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { native, budgets } from "./qualification-process.js";
import { artifactLimits } from "./artifact-policy.js";
import { evidenceIndex } from "./release-provider.js";
import {
  jsonBytes,
  releaseArtifactBytes,
  releasePackages,
  save,
  sha256,
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
