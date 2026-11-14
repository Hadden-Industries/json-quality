// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { cpSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  preparePromotionWriter,
  promotionObservation,
} from "./promotion-writer-preparation.js";
import { consumeWriterAdmission } from "./release-writer-admission.js";
import { admitAcknowledgedService } from "./promotion-pending.js";
import { fileURLToPath } from "node:url";
import { readJson, regularBytes, save, sha256 } from "./release-contract.js";
import {
  api,
  provider,
  producingAttempt,
  effectAttempt,
  download,
  signedTag,
  sealBundle,
} from "./release-provider.js";
import { observeFamilyCompletion } from "./promotion-family.js";
import { npmLabelOperation } from "./npm-availability.js";
import {
  verifyCompletedLabels,
  verifyNpmOnlyGithubState,
} from "./release-effects.js";

/** Re-acquire original native artifacts; a new observer never becomes a writer origin. */
function acquireOriginalOperation(directory, scratch, env) {
  const run = env.COMPLETION_RUN,
    attempt = env.COMPLETION_ATTEMPT;
  for (const value of [run, attempt]) assert.match(value, /^[1-9]\d{0,15}$/u);
  const observed = provider(run, attempt);
  assert.equal(observed.run.path, ".github/workflows/promote-release.yml");
  assert.equal(
    observed.run.repository.full_name,
    "Hadden-Industries/json-quality",
  );
  assert.equal(observed.run.event, "workflow_dispatch");
  assert.equal(observed.run.head_branch, "main");
  const admitAttempt = producingAttempt(observed, "admit");
  const admission = download(
    run,
    admitAttempt,
    `admitted-promote-${admitAttempt}`,
    scratch,
  );
  const receiptBytes = regularBytes(
      join(admission.directory, "writer-admission.json"),
    ),
    receipt = JSON.parse(receiptBytes);
  assert.equal(receipt.phase, "promote");
  assert.equal(receipt.origin.run, run);
  assert.equal(receipt.origin.attempt, String(admitAttempt));
  assert.equal(receipt.controller, observed.run.head_sha);
  const npmAttempt = effectAttempt(observed, "npm");
  const npm = download(
    run,
    npmAttempt,
    `effect-promote-npm-${npmAttempt}`,
    scratch,
  );
  assert.ok(
    !existsSync(directory) || readdirSync(directory).length === 0,
    "Independent completion requires an empty output directory",
  );
  cpSync(npm.directory, directory, { recursive: true, force: false });
  const npmEvidence = new Map(
    readdirSync(npm.directory)
      .filter(
        (name) =>
          name === "npm-continuation.json" ||
          /^promote-npm-\d+-\d+\.jsonl(?:\.[a-f0-9]{64}\.ack\.json)?$/u.test(
            name,
          ),
      )
      .map((name) => [name, regularBytes(join(npm.directory, name))]),
  );
  const npmJob = observed.jobs.jobs.find((job) => job.name === "npm");
  let github = null;
  if (receipt.family.github.selected) {
    const githubJob = observed.jobs.jobs.find((job) => job.name === "github");
    if (githubJob && githubJob.conclusion !== "skipped") {
      const githubAttempt = effectAttempt(observed, "github");
      github = download(
        run,
        githubAttempt,
        `effect-promote-github-${githubAttempt}`,
        scratch,
      );
      cpSync(github.directory, directory, { recursive: true });
      for (const [name, bytes] of npmEvidence)
        assert.deepEqual(
          regularBytes(join(directory, name)),
          bytes,
          "GitHub artifact replaced original npm proof",
        );
    }
  }
  assert.deepEqual(
    regularBytes(join(directory, "writer-admission.json")),
    receiptBytes,
    "Writer replaced original read-only admission",
  );
  return {
    ...env,
    GITHUB_RUN_ID: run,
    GITHUB_RUN_ATTEMPT: attempt,
    GITHUB_SHA: observed.run.head_sha,
    MANIFEST_SHA: receipt.scope.manifestSha256,
    REVIEW_SHA: receipt.scope.reviewSha256,
    ACCEPTANCE_SHA: receipt.scope.acceptanceSha256 ?? "",
    OPERATION_SHA: receipt.scope.operationSha256,
    OPERATION_JSON: regularBytes(
      join(directory, "availability-operation.json"),
    ).toString("utf8"),
    CONTINUATION_REVIEW_SHA: receipt.scope.continuationReviewSha256 ?? "",
    STAGE_PHASE: receipt.scope.stagePhase,
    EXPECTED_LABELS: receipt.scope.expectedLabels,
    RESTORE_VERSION: receipt.scope.restoreVersion,
    RESTORATION_SHA: receipt.scope.restorationSha256,
    ADMISSION_ARTIFACT_ID: String(admission.identity.id),
    ADMISSION_ARTIFACT_DIGEST: admission.identity.digest,
    ADMISSION_RECEIPT_SHA: sha256(receiptBytes),
    NPM_CONTINUATION_ID: String(npm.identity.id),
    GITHUB_CONTINUATION_ID: github ? String(github.identity.id) : "",
    NPM_RESULT: npmJob.conclusion,
    GITHUB_RESULT:
      observed.jobs.jobs.find((job) => job.name === "github")?.conclusion ??
      "skipped",
  };
}

/** Authenticate original results before allowing any completion-time propagation reads. */
export function completePromotion(
  directory,
  scratch,
  environment = process.env,
) {
  mkdirSync(scratch, { recursive: true });
  const env = environment.COMPLETION_RUN
    ? acquireOriginalOperation(directory, scratch, environment)
    : environment;
  const destination = join(
    directory,
    `promotion-completion-${environment.GITHUB_RUN_ID}-${environment.GITHUB_RUN_ATTEMPT}.json`,
  );
  const pending =
    env.NPM_RESULT !== "success" ||
    (env.GITHUB_RESULT !== "success" &&
      readJson(join(directory, "writer-admission.json")).family?.github
        .selected);
  let prepared,
    npmOnly = false;
  if (pending) {
    const admitted = consumeWriterAdmission(directory, "promote", env, {
      readOnly: true,
    });
    const npm = admitAcknowledgedService(directory, "npm", admitted, env);
    const githubPending =
      admitted.family.github.selected && env.GITHUB_RESULT === "skipped";
    const github =
      !admitted.family.github.selected || githubPending
        ? { state: "acknowledged", requests: [] }
        : admitAcknowledgedService(directory, "github", admitted, env);
    const state = [npm.state, github.state].includes(
      "writer-outcome-unresolved",
    )
      ? "writer-outcome-unresolved"
      : [npm.state, github.state].includes("writer-operation-incomplete")
        ? "writer-operation-incomplete"
        : null;
    if (state) {
      const result = {
        schemaVersion: 3,
        state,
        operationId: env.OPERATION_SHA,
        origin: { run: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT },
        npm: env.NPM_RESULT,
        github: env.GITHUB_RESULT,
        nextAction:
          "Reconcile original intent/outcome evidence; observation authorizes zero requests",
      };
      if (
        state === "writer-operation-incomplete" &&
        admitted.family.operation === "retire-pilot" &&
        npm.state === "writer-operation-incomplete" &&
        npm.requests.length
      ) {
        const observation = promotionObservation(admitted, scratch);
        // Authenticate the entire attempted prefix before reading it. Unattempted
        // labels remain guarded preimages and require a fresh owner decision.
        const prefix = {
          ...admitted.family,
          subjects: admitted.family.subjects.map((subject) =>
            npm.requests.includes(
              npmLabelOperation(admitted.family, subject.package),
            )
              ? subject
              : { ...subject, target: subject.prior },
          ),
        };
        result.acknowledgedPrefix = observeFamilyCompletion(
          prefix,
          {
            readPackageTags: observation.tags,
            readGithubState: observation.currentGithubState,
            verifyTargets: (deadline) =>
              verifyPromotionTargets(admitted.targets, deadline),
          },
          { npmOnly: true },
        );
        if (result.acknowledgedPrefix.state === "completed")
          result.acknowledgedPrefix.state = "attempted-prefix-confirmed";
        result.nextAction =
          "Settle the original attempted effects; a fresh owner decision must bind remaining pilot aliases";
      }
      save(destination, result);
      sealBundle(directory, env.MANIFEST_SHA);
      return result;
    }
    prepared = promotionObservation(admitted, scratch);
    prepared.target = admitted.family.subjects.find(
      (subject) => subject.package === admitted.release.package,
    ).target;
    prepared.expected = admitted.family;
    npmOnly = githubPending;
  }
  prepared ??= preparePromotionWriter(directory, scratch, "complete", env);
  let completed;
  if (prepared.family) {
    completed = observeFamilyCompletion(
      prepared.family,
      {
        readPackageTags: prepared.tags,
        readGithubState: prepared.currentGithubState,
        verifyTargets: (deadline) =>
          verifyPromotionTargets(prepared.targets, deadline),
      },
      { npmOnly },
    );
    if (npmOnly && completed.state === "completed")
      completed.state = "npm-complete-github-pending";
  } else if (prepared.availability === "npm-only") {
    assert.equal(env.GITHUB_RESULT, "skipped");
    const npm = prepared.tags();
    assert.equal(npm.latest, prepared.target);
    completed = {
      state: "completed",
      npm,
      github: verifyNpmOnlyGithubState(
        prepared.continuation.githubSnapshot,
        prepared.currentGithubState(),
      ),
    };
  } else {
    assert.equal(env.GITHUB_RESULT, "success");
    assert.ok(prepared.githubContinuation);
    completed = {
      state: "completed",
      ...verifyCompletedLabels(
        prepared.target,
        prepared.tags(),
        prepared.currentGithubState().latest,
      ),
    };
  }
  const result = {
    schemaVersion: 3,
    availability: prepared.availability,
    source: prepared.release.source.commit,
    controller: env.GITHUB_SHA,
    manifestSha256: env.MANIFEST_SHA,
    operationId: env.OPERATION_SHA ?? null,
    origin: { run: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT },
    version: prepared.target,
    priorLabels: prepared.expected,
    ...completed,
    observedAt: new Date().toISOString(),
  };
  save(destination, result);
  sealBundle(directory, env.MANIFEST_SHA);
  return result;
}

/** Both full and prefix observers recheck the same admitted immutable identities. */
function verifyPromotionTargets(targets, deadline) {
  for (const target of targets) {
    assert.equal(
      signedTag(target.release, { deadline }).reference.object.sha,
      target.tagSha,
      "Qualified target tag object changed",
    );
    const live = api(`releases/${target.releaseId}`, [], { deadline });
    assert.equal(live.id, target.releaseId);
    assert.equal(live.tag_name, `v${target.release.version}`);
    assert.equal(live.immutable, true);
    assert.equal(live.draft, false);
    assert.deepEqual(
      live.assets
        .map(({ name, digest, size }) => ({ name, digest, size }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      [...target.assets].sort((a, b) => a.name.localeCompare(b.name)),
    );
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 4);
  const result = completePromotion(...process.argv.slice(2));
  if (result.state !== "completed") process.exitCode = 1;
}
