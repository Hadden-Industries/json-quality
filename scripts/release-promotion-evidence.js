// SPDX-License-Identifier: AGPL-3.0-only
/** Preserve the tested build while binding promotion to its equal-tree landed merge. */
import { repository as releaseRepository } from "./release-identity.js";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sha256 } from "./release-records.js";

/** Resolve authorization identity without rewriting original production provenance. */
export function releaseCommit(release) {
  verifyPromotion(release);
  return release.promotion?.releaseCommit ?? release.source.commit;
}

export function verifyPromotion(release) {
  if (release.schemaVersion !== 4) {
    assert.equal(release.promotion, undefined);
    return;
  }
  const p = release.promotion;
  assert.equal(p.schemaVersion, 1);
  assert.equal(p.repository, releaseRepository);
  assert.equal(p.workflow, ".github/workflows/ci.yml");
  assert.equal(p.buildCommit, release.source.commit);
  assert.equal(p.tree, release.source.tree);
  for (const value of [p.buildCommit, p.releaseCommit, p.tree, ...p.parents])
    assert.match(value, /^[a-f0-9]{40}$/u);
  assert.equal(p.parents.length, 2);
  assert.notEqual(p.releaseCommit, p.buildCommit);
  for (const value of [p.repositoryId, p.run, p.attempt, p.pullRequest])
    assert.ok(Number.isSafeInteger(value) && value > 0);
  for (const value of [p.buildManifestSha256, p.proofSha256])
    assert.match(value, /^[a-f0-9]{64}$/u);
}

/** Original proof bytes and manifest remain separate hash-addressed subjects. */
export function verifyBuildEvidence(
  release,
  directory,
  { read = readFileSync } = {},
) {
  verifyPromotion(release);
  assert.equal(release.schemaVersion, 4);
  const p = release.promotion;
  const manifest = read(join(directory, "build-manifest.json"));
  const proof = read(join(directory, "build-qualification.json"));
  assert.equal(sha256(manifest), p.buildManifestSha256);
  assert.equal(sha256(proof), p.proofSha256);
  const original = { ...release };
  delete original.promotion;
  original.schemaVersion = 3;
  assert.deepEqual(
    JSON.parse(manifest),
    original,
    "Promoted manifest changed original build fields",
  );
  assert.equal(
    sha256(read(join(directory, "build-package-lock.json"))),
    release.source.lockSha256,
  );
  const receipt = JSON.parse(proof);
  assert.equal(
    receipt.schemaVersion,
    3,
    "Release-capable original proof required",
  );
  assert.equal(receipt.mode, "FULL");
  assert.equal(receipt.repository, p.repository);
  assert.equal(receipt.repositoryId, p.repositoryId);
  assert.equal(receipt.runId, p.run);
  assert.equal(receipt.runAttempt, p.attempt);
  assert.equal(receipt.pullRequest, p.pullRequest);
  assert.equal(receipt.snapshot.commit, p.buildCommit);
  assert.equal(receipt.snapshot.tree, p.tree);
  assert.deepEqual(receipt.snapshot.parents, p.parents);
  assert.deepEqual(receipt.matrix, release.matrix);
  assert.match(receipt.assurance?.policySha256, /^[a-f0-9]{64}$/u);
  assert.ok(receipt.assurance.scans.length > 0);
  const expected = release.matrix.os
    .flatMap((os) => release.matrix.node.map((node) => `${os}/${node}`))
    .sort();
  assert.deepEqual(
    receipt.lanes.map(({ lane }) => `${lane.os}/${lane.node}`).sort(),
    expected,
    "Original release proof omits or duplicates a required lane",
  );
  for (const lane of receipt.lanes) {
    assert.equal(lane.releaseEvidence?.manifestSha256, p.buildManifestSha256);
    assert.equal(lane.consumers.root.archiveSha256, release.archive.sha256);
  }
  return receipt;
}
