// SPDX-License-Identifier: AGPL-3.0-only
/** Local, read-only capture for one explicitly selected public-retainable stage. */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  provider,
  effectAttempt,
  download,
  readHistoryRecord,
  readEffectHistory,
  exportHistoryRecord,
  carryHistoryStages,
} from "./release-provider.js";
import { readJson, regularBytes, save, sha256 } from "./release-records.js";
import { verifyBundle } from "./release-evidence.js";
import {
  verifyRun,
  verifyNativeStageEvidence,
  releaseTransportMaximumBytes,
} from "./release-contract.js";
import { authenticateLegacyStageUpload } from "./stage-predecessor.js";
import {
  stagePartBytes,
  verifyStagePredecessors,
  writeStageParts,
} from "./release-stage-payload.js";
import { writeQualifiedTargetBundle } from "./release-history-targets.js";

export function prepareStageHistory(
  run,
  attempt,
  output,
  scratch,
  rawBudget,
  previousSelection,
) {
  assert.match(
    rawBudget,
    /^[1-9]\d*$/u,
    "Provide the approved retained-stage storage budget in bytes",
  );
  const budget = Number(rawBudget);
  assert.ok(Number.isSafeInteger(budget));
  mkdirSync(scratch, { recursive: true });
  const observed = provider(run, attempt);
  assert.equal(
    effectAttempt(observed, "stage"),
    Number(attempt),
    "Select the original producing attempt",
  );
  const job = observed.jobs.jobs.find(({ name }) => name === "stage");
  let zip;
  const acquired = download(run, attempt, `effect-stage-${attempt}`, scratch, {
    observed,
    retainZip: (bytes) => {
      zip = bytes;
    },
  });
  const directory = acquired.directory;
  const manifestSha256 = sha256(
    regularBytes(join(directory, "release-manifest.json")),
  );
  const reviewBytes = regularBytes(join(directory, "release-review.json"));
  const reviewSha256 = sha256(reviewBytes);
  const release = verifyBundle(directory, manifestSha256);
  const context = readJson(join(directory, "context.json"));
  const stagePhase = context.stage ? "core" : "natives";
  const origin = context.stage ?? context.nativeStage;
  assert.equal(origin.run, run);
  assert.equal(origin.attempt, attempt);
  assert.equal(origin.controller, observed.run.head_sha);
  verifyRun(observed, "stage", origin.controller, release.matrix, {
    stagePhase,
  });
  verifyNativeStageEvidence(
    release,
    context.nativeStage,
    manifestSha256,
    (name) => regularBytes(join(directory, name)),
  );
  if (!acquired.writerReceipt)
    authenticateLegacyStageUpload(job, acquired.identity);
  const selection = previousSelection
    ? JSON.parse(previousSelection)
    : JSON.parse(reviewBytes).historyCheckpoint;
  const previous = selection ? readHistoryRecord(selection) : null;
  const existing = previous?.stagePredecessors ?? [];
  assert.ok(
    !existing.some((entry) => entry.run === run && entry.attempt === attempt),
    "Selected stage was already retained",
  );
  const unique = new Map(
    existing.flatMap((ref) =>
      ref.parts.map(({ sha256, size }) => [sha256, size]),
    ),
  );
  for (let offset = 0; offset < zip.length; offset += stagePartBytes) {
    const part = zip.subarray(offset, offset + stagePartBytes);
    unique.set(sha256(part), part.length);
  }
  const total = [...unique.values()].reduce((sum, size) => sum + size, 0);
  assert.ok(
    total <= budget,
    "Retained stage parts exceed the approved Git storage budget",
  );
  const history = readEffectHistory(
    {},
    scratch,
    selection,
    previous
      ? {
          checkpoint: () => previous.entries,
          writerRunClosures: previous.writerRunClosures,
        }
      : {},
  );
  mkdirSync(output);
  carryHistoryStages(previous, output);
  const ref = {
    run,
    attempt,
    stagePhase,
    controller: origin.controller,
    manifestSha256,
    reviewSha256,
    size: zip.length,
    sha256: sha256(zip),
    provider: observed,
    artifact: { ...acquired.identity, jobId: job.id },
    parts: writeStageParts(output, zip),
  };
  const stagePredecessors = [...existing, ref];
  verifyStagePredecessors(stagePredecessors, releaseTransportMaximumBytes);
  const qualifiedTargetRefs = writeQualifiedTargetBundle(output, previous, []);
  const bytes = Buffer.from(
    JSON.stringify({
      ...exportHistoryRecord(history),
      ...(previous?.stageCancellations
        ? { stageCancellations: previous.stageCancellations }
        : {}),
      ...(qualifiedTargetRefs.length ? { qualifiedTargetRefs } : {}),
      schemaVersion: 3,
      stagePredecessors,
    }) + "\n",
  );
  assert.ok(
    bytes.length <= 20_000_000,
    "Retained history index exceeds the signed reader bound",
  );
  save(join(output, "release-history.json"), bytes);
  console.log(
    JSON.stringify({
      state: "awaiting-owner-public-retention-review-and-signature",
      run,
      attempt,
      archiveBytes: zip.length,
      indexBytes: bytes.length,
      stageParts: unique.size,
      uniqueStagePartBytes: total,
      historySha256: sha256(bytes),
    }),
  );
}
