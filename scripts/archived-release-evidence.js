// SPDX-License-Identifier: AGPL-3.0-only
/** Recover expired operation inputs from immutable assets plus complete owner-signed history. */
import assert from "node:assert/strict";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  api,
  gh,
  signedTag,
  readHistoryRecord,
  readHistoryTarget,
} from "./release-provider.js";
import {
  readJson,
  regularBytes,
  save,
  sha256,
  verifyManifest,
  releasePackages,
  repository,
  validVersion,
  effectJournal,
} from "./release-contract.js";
import { acquireArchiveEvidence } from "./release-assets.js";
import { verifyQualifiedTarget } from "./qualified-release-contract.js";
import { sealBundle } from "./release-records.js";

export function recoverArchivedAdmission(directory, env) {
  assert.equal(sha256(Buffer.from(env.OPERATION_JSON)), env.OPERATION_SHA);
  const operation = JSON.parse(env.OPERATION_JSON);
  assert.equal(operation.owner, "maksymshostak");
  assert.equal(operation.phase, "availability");
  validVersion(operation.version);
  const live = api(`releases/tags/v${operation.version}`);
  assert.equal(live.id, operation.sourceReleaseId);
  assert.equal(live.immutable, true);
  assert.equal(live.draft, false);
  const record = retainedQualifiedTarget(operation.historyCheckpoint, {
    version: operation.version,
    manifestSha256: env.MANIFEST_SHA,
    releaseId: live.id,
  });
  const verified = verifyQualifiedTarget(record, {
    version: operation.version,
    manifestSha256: env.MANIFEST_SHA,
    releaseId: live.id,
  });
  gh([
    "release",
    "verify",
    `v${operation.version}`,
    "--repo",
    repository,
    "--format",
    "json",
  ]);
  for (const name of [
    "release-manifest.json",
    "release-assets.json",
    "release-review.json",
    "release-acceptance.json",
    ...releasePackages(verified.release).map(
      (subject) => subject.archive.filename,
    ),
  ]) {
    gh([
      "release",
      "download",
      `v${operation.version}`,
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
      `v${operation.version}`,
      join(directory, name),
      "--repo",
      repository,
      "--format",
      "json",
    ]);
  }
  assert.equal(
    sha256(regularBytes(join(directory, "release-manifest.json"))),
    env.MANIFEST_SHA,
  );
  assert.deepEqual(
    verifyManifest(readJson(join(directory, "release-manifest.json")), {
      historical: true,
    }),
    verified.release,
  );
  signedTag(verified.release);
  const index = readJson(join(directory, "release-assets.json"));
  const names = (
    index.schemaVersion === 2
      ? index.evidence.files.map((value) => value.name)
      : index.assets.map((value) => value.source).filter(Boolean)
  ).filter((name) => !existsSync(join(directory, name)));
  acquireArchiveEvidence(directory, verified.release, live.assets, names);
  for (const [name, bytes] of verified.files) {
    const path = join(directory, name);
    if (!existsSync(path)) save(path, bytes);
    else if (
      name === "context.json" &&
      sha256(regularBytes(path)) !== sha256(bytes)
    ) {
      assert.deepEqual(readJson(path).registry, verified.context.registry);
      save(join(directory, "immutable-context.json"), regularBytes(path));
      writeFileSync(path, bytes, { flush: true });
    } else
      assert.deepEqual(
        regularBytes(path),
        bytes,
        "Retained evidence differs from immutable archive",
      );
  }
  assert.ok(
    verified.context.archive,
    "Checkpoint must retain original archive continuation before Actions expiry",
  );
  if (
    operation.family?.operation === "scoped-restore" &&
    operation.originalEffect?.phase === "promote"
  ) {
    const original = operation.originalEffect;
    assert.equal(original.run, env.PREVIOUS_RUN);
    assert.equal(original.attempt, env.PREVIOUS_ATTEMPT);
    const history = readHistoryRecord(operation.historyCheckpoint);
    restoreOriginalPromotion(directory, history, original);
  } else {
    assert.equal(verified.context.archive.run, env.PREVIOUS_RUN);
    assert.equal(verified.context.archive.attempt, env.PREVIOUS_ATTEMPT);
  }
  sealBundle(directory, env.MANIFEST_SHA);
  return verified;
}

/** Exact owner-signed writer custody supplements the independent immutable archive origin. */
export function restoreOriginalPromotion(directory, history, original) {
  const matches = history.entries.filter(
    (entry) =>
      entry.phase === "promote" &&
      entry.service === original.service &&
      entry.run === original.run &&
      entry.attempt === original.attempt,
  );
  assert.equal(
    matches.length,
    1,
    "Signed history lacks original promotion custody",
  );
  const entry = matches[0],
    journal = Buffer.from(entry.journal, "base64");
  assert.equal(sha256(journal), original.journalSha256);
  const evidence = entry.operationEvidence;
  assert.ok(
    evidence?.["availability-operation.json"],
    "Signed history lacks exact original operation evidence",
  );
  const operation = Buffer.from(
    evidence["availability-operation.json"],
    "base64",
  );
  assert.equal(sha256(operation), original.operationId);
  assert.equal(JSON.parse(operation).manifestSha256, original.manifestSha256);
  const retain = (name, bytes) => {
    const path = join(directory, name);
    if (existsSync(path)) assert.deepEqual(regularBytes(path), bytes);
    else save(path, bytes);
  };
  retain(effectJournal("promote", original), journal);
  for (const name of [
    "availability-operation.json",
    "writer-admission.json",
    "npm-continuation.json",
    "github-continuation.json",
    "promotion-security-admit.json",
  ])
    if (evidence[name]) retain(name, Buffer.from(evidence[name], "base64"));
  for (const [name, encoded] of Object.entries(entry.acknowledgements ?? {})) {
    const prefix = effectJournal("promote", original) + ".";
    assert.ok(
      name.startsWith(prefix) &&
        /^[a-f0-9]{64}\.ack\.json$/u.test(name.slice(prefix.length)),
    );
    retain(name, Buffer.from(encoded, "base64"));
  }
}

/** An unsigned JSON snapshot or a legacy writer-only checkpoint never qualifies an expired target. */
export function retainedQualifiedTarget(checkpoint, expected, readers = {}) {
  const history = readHistoryRecord(
    checkpoint,
    readers.read,
    readers.bytes,
    readers.verifySignature,
  );
  assert.equal(history.schemaVersion, 2);
  const target = readHistoryTarget(history, expected);
  verifyQualifiedTarget(target, expected);
  return target;
}
