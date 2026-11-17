// SPDX-License-Identifier: AGPL-3.0-only
/** Recover a selected original stage under authenticated native and signed custody. */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  api,
  artifactUnavailable,
  download,
  extractReleaseArtifact,
  id,
  provider,
  readArtifactBinary,
  readHistoryRecord,
  readHistoryStagePart,
  selectHistoryStage,
} from "./release-provider.js";
import { readJson } from "./release-records.js";
import { materializeStageZip } from "./release-stage-payload.js";

export function selectedStageCheckpoint(directory, env) {
  const path = join(directory, "stage-recovery-checkpoint.json");
  return env.STAGE_CHECKPOINT_JSON
    ? JSON.parse(env.STAGE_CHECKPOINT_JSON)
    : existsSync(path)
      ? readJson(path)
      : null;
}

function matchesStageProvider(observed, original) {
  for (const name of [
    "id",
    "workflow_id",
    "run_number",
    "run_attempt",
    "head_sha",
    "status",
    "conclusion",
    "path",
    "event",
    "head_branch",
  ])
    assert.equal(
      observed.run[name],
      original.run[name],
      `Original stage provider changed ${name}`,
    );
  for (const name of ["repository", "head_repository"])
    assert.equal(observed.run[name].id, original.run[name].id);
  const identity = ({ jobs }) =>
    jobs.jobs
      .map((job) => [
        job.id,
        job.name,
        job.run_id,
        job.run_attempt,
        job.started_at,
        job.completed_at,
        job.head_sha,
        job.status,
        job.conclusion,
        job.labels,
        job.steps,
      ])
      .sort((a, b) => a[0] - b[0]);
  assert.equal(observed.jobs.total_count, observed.jobs.jobs.length);
  assert.deepEqual(
    identity(observed),
    identity(original),
    "Original stage jobs conflict with signed custody",
  );
}

function readIfAvailable(read) {
  try {
    return read();
  } catch (error) {
    if (!artifactUnavailable(error)) throw error;
    return null;
  }
}

function verifyStageMetadata(metadata, ref) {
  if (!metadata) return;
  assert.equal(metadata.id, ref.artifact.id);
  assert.equal(metadata.name, ref.artifact.name);
  assert.equal(metadata.digest, ref.artifact.digest);
  assert.equal(metadata.size_in_bytes, ref.size);
  assert.equal(metadata.workflow_run.id, Number(ref.run));
  assert.equal(metadata.workflow_run.head_sha, ref.controller);
  assert.equal(
    metadata.workflow_run.repository_id,
    ref.provider.run.repository.id,
  );
  assert.equal(
    metadata.workflow_run.head_repository_id,
    ref.provider.run.head_repository.id,
  );
}

export function observeStagePredecessor(
  expected,
  checkpoint,
  observe = provider,
) {
  if (
    !checkpoint?.stagePredecessors?.some(
      (ref) => ref.run === expected.run && ref.attempt === expected.attempt,
    )
  )
    return observe(expected.run, expected.attempt);
  const retained = selectHistoryStage(checkpoint, expected);
  const live = readIfAvailable(() => observe(expected.run, expected.attempt));
  if (live) matchesStageProvider(live, retained.provider);
  return live ?? retained.provider;
}

export function acquireStagePredecessor(
  expected,
  scratch,
  selection,
  readers = {},
) {
  const observe = readers.provider ?? provider;
  const acquire = readers.download ?? download;
  if (!selection)
    return acquire(
      expected.run,
      expected.attempt,
      `effect-stage-${id(expected.attempt)}`,
      scratch,
    );
  const history = (readers.history ?? readHistoryRecord)(selection);
  const original = observeStagePredecessor(expected, history, observe);
  const available = readIfAvailable(() =>
    acquire(
      expected.run,
      expected.attempt,
      `effect-stage-${id(expected.attempt)}`,
      scratch,
      {
        observed: original,
        writerReceipt: history.entries.find(
          (entry) =>
            entry.phase === "stage" &&
            entry.run === expected.run &&
            entry.attempt === expected.attempt,
        )?.writerReceipt,
      },
    ),
  );
  if (available) {
    if (
      history.stagePredecessors?.some(
        (ref) => ref.run === expected.run && ref.attempt === expected.attempt,
      )
    ) {
      const signed = selectHistoryStage(history, expected);
      for (const key of ["id", "name", "digest"])
        assert.equal(
          available.identity[key],
          signed.artifact[key],
          "Live original stage upload differs from signed custody",
        );
    }
    return available;
  }
  const ref = selectHistoryStage(history, expected);
  const read = readers.api ?? api;
  verifyStageMetadata(
    readIfAvailable(() => read(`actions/artifacts/${ref.artifact.id}`)),
    ref,
  );
  const archive = join(
    scratch,
    `retained-stage-${id(expected.run)}-${id(expected.attempt)}.zip`,
  );
  const directory = join(
    scratch,
    `retained-stage-${id(expected.run)}-${id(expected.attempt)}`,
  );
  materializeStageZip(ref, archive, (part) =>
    readHistoryStagePart(history, part),
  );
  extractReleaseArtifact(archive, directory, readers.extract);
  return { directory, identity: ref.artifact, retained: true };
}

/** Pre-cutover writers need the exact native upload acknowledgment for capture. */
export function authenticateLegacyStageUpload(
  job,
  artifact,
  read = readArtifactBinary,
) {
  const steps = job.steps.filter(
    ({ name }) => name === "Run ./.github/actions/upload-writer-evidence",
  );
  assert.equal(steps.length, 1, "Original stage upload step must be unique");
  const { started_at, completed_at } = steps[0];
  const start = Date.parse(started_at),
    end = Date.parse(completed_at) + 1000;
  assert.ok(start < end);
  let digest;
  const results = [];
  for (const line of new TextDecoder("utf-8", { fatal: true })
    .decode(read(`actions/jobs/${id(job.id)}/logs`, 16 * 1024 * 1024))
    .split(/\r?\n/u)) {
    const entry = /^(\S+) (.*)$/u.exec(line);
    const time = Date.parse(entry?.[1]);
    if (!(time >= start && time < end)) continue;
    const checksum =
      /^SHA256 digest of uploaded artifact is ([a-f0-9]{64})$/u.exec(entry[2]);
    if (checksum) digest = `sha256:${checksum[1]}`;
    const finalized =
      /^Artifact ([A-Za-z0-9._-]+) successfully finalized\. Artifact ID ([1-9]\d{0,15})$/u.exec(
        entry[2],
      );
    if (finalized) {
      assert.ok(digest, "Finalized upload has no native digest");
      results.push({ name: finalized[1], id: Number(finalized[2]), digest });
      digest = undefined;
    }
  }
  assert.deepEqual(results, [
    { name: artifact.name, id: artifact.id, digest: artifact.digest },
  ]);
}
