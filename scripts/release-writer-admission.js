// SPDX-License-Identifier: AGPL-3.0-only
/** Narrow writers consume a native, digest-bound read-only admission; no schema engine. */
import assert from "node:assert/strict";
import { appendFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  readJson,
  regularBytes,
  save,
  sha256,
  sealBundle,
} from "./release-records.js";
import {
  api,
  provider,
  producingAttempt,
  currentMain,
} from "./release-provider.js";
import { manualControl, workflows, repository } from "./release-contract.js";

const scope = (env) => ({
  stagePhase: env.STAGE_PHASE || "natives",
  manifestSha256: env.MANIFEST_SHA,
  reviewSha256: env.REVIEW_SHA,
  continuationReviewSha256: env.CONTINUATION_REVIEW_SHA || null,
  acceptanceSha256: env.ACCEPTANCE_SHA || null,
  operationSha256: env.OPERATION_SHA || null,
  expectedLabels: env.EXPECTED_LABELS || null,
  restoreVersion: env.RESTORE_VERSION || null,
  restorationSha256: env.RESTORATION_SHA || null,
});

/** Caller has completed full qualification, history, signatures and target/security admission. */
export function prepareWriterAdmission(
  directory,
  phase,
  admitted,
  env,
  prepared = null,
) {
  const record = {
    schemaVersion: 1,
    state: "admitted-read-only",
    phase,
    scope: scope(env),
    source: admitted.release.source.commit,
    controller: env.GITHUB_SHA,
    origin: { run: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT },
    release: admitted.release,
    context: admitted.context,
    recovery: admitted.recovery ?? null,
    family: prepared?.family ?? null,
    targets: prepared?.targets ?? [],
    availability: prepared?.availability ?? null,
    securitySha256: prepared
      ? sha256(Buffer.from(JSON.stringify(prepared.security)))
      : null,
  };
  const path = join(directory, "writer-admission.json");
  // A later dispatch re-admits original evidence without mutating its original records.
  if (existsSync(path)) {
    const previous = readJson(path);
    const retained = join(
      directory,
      `writer-admission-${previous.origin.run}-${previous.origin.attempt}.json`,
    );
    if (!existsSync(retained)) save(retained, regularBytes(path));
    else
      assert.equal(sha256(regularBytes(retained)), sha256(regularBytes(path)));
    writeFileSync(path, Buffer.from(JSON.stringify(record, null, 2) + "\n"), {
      flush: true,
    });
  } else save(path, record);
  const digest = sha256(regularBytes(path));
  if (env.GITHUB_OUTPUT)
    appendFileSync(env.GITHUB_OUTPUT, `receipt-sha256=${digest}\n`);
  sealBundle(directory, env.MANIFEST_SHA);
  return { record, sha256: digest };
}

/** Transport and producer identity are rechecked before any writer capability is created. */
export function consumeWriterAdmission(directory, phase, env, readers = {}) {
  if (!readers.readOnly) manualControl(env, phase);
  const bytes = regularBytes(join(directory, "writer-admission.json"));
  assert.match(env.ADMISSION_RECEIPT_SHA, /^[a-f0-9]{64}$/u);
  assert.equal(
    sha256(bytes),
    env.ADMISSION_RECEIPT_SHA,
    "Read-only admission receipt was substituted",
  );
  const record = JSON.parse(bytes);
  assert.equal(record.schemaVersion, 1);
  assert.equal(record.state, "admitted-read-only");
  assert.equal(record.phase, phase);
  assert.equal(record.controller, env.GITHUB_SHA);
  assert.deepEqual(
    record.scope,
    scope(env),
    "Writer operation scope differs from admission",
  );
  assert.equal(record.origin.run, env.GITHUB_RUN_ID);
  assert.equal(
    sha256(regularBytes(join(directory, "release-manifest.json"))),
    env.MANIFEST_SHA,
  );
  assert.deepEqual(
    record.release,
    readJson(join(directory, "release-manifest.json")),
  );
  const read = readers.api ?? api,
    observe = readers.provider ?? provider;
  const artifact = read(`actions/artifacts/${env.ADMISSION_ARTIFACT_ID}`);
  assert.equal(artifact.id, Number(env.ADMISSION_ARTIFACT_ID));
  assert.equal(artifact.digest, env.ADMISSION_ARTIFACT_DIGEST);
  assert.match(artifact.digest, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(artifact.expired, false);
  assert.equal(artifact.workflow_run.id, Number(record.origin.run));
  assert.equal(artifact.workflow_run.head_sha, record.controller);
  assert.equal(
    artifact.workflow_run.repository_id,
    Number(env.GITHUB_REPOSITORY_ID),
  );
  assert.match(
    artifact.name,
    new RegExp(
      `^admitted-${phase}-${record.origin.attempt}(?:-recovery-[23])?$`,
      "u",
    ),
  );
  const observed = observe(env.GITHUB_RUN_ID, env.GITHUB_RUN_ATTEMPT);
  assert.equal(observed.run.repository.full_name, repository);
  assert.equal(observed.run.head_repository.full_name, repository);
  assert.equal(observed.run.path, `.github/workflows/${workflows[phase]}`);
  assert.equal(observed.run.event, "workflow_dispatch");
  assert.equal(observed.run.head_branch, "main");
  assert.equal(observed.run.head_sha, record.controller);
  assert.equal(
    producingAttempt(observed, "admit", observe),
    Number(record.origin.attempt),
  );
  const admit = observed.jobs.jobs.filter((job) => job.name === "admit");
  assert.equal(admit.length, 1);
  assert.equal(admit[0].conclusion, "success");
  if (!readers.readOnly) (readers.currentMain ?? currentMain)(env);
  return record;
}
