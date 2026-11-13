import {
  verifyReport,
  verifyLane,
  verifySecurity,
} from "./release-qualification-contract.js";
export { verifyReport, verifyLane, verifySecurity };
// SPDX-License-Identifier: AGPL-3.0-only
/** Complete provider/report closure before a privileged job may consume a bundle. */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import {
  readJson,
  regularBytes,
  releaseArtifactBytes,
  save,
  sha256,
  verifyArchive,
  verifyManifest,
  verifyRun,
  lanes,
  manualControl,
  verifyDecision,
  restorationAvailability,
  repository,
  effectJournal,
  retainedRecoveries,
  releasePackages,
} from "./release-contract.js";
import {
  checkEnvironment,
  api,
  currentMain,
  download,
  evidenceIndex,
  provider,
  producingAttempt,
  readEffectHistory,
  readHistoryRecord,
  readHistoryTarget,
  historyTargetDescriptors,
  signedTag,
  verifyEffectHistory,
  authenticatedHistoricalSettlements,
  sealBundle,
} from "./release-provider.js";
import {
  reconcileObserved,
  verifyRecoveryRecord,
  retainRecovery,
  verifyArchiveIntent,
} from "./release-recovery.js";
import { native } from "./qualification-process.js";
import { verifyOperationDecision } from "./release-availability-contract.js";
import { retainedQualifiedTarget } from "./archived-release-evidence.js";
import { verifyQualifiedTarget } from "./qualified-release-contract.js";
import { admitPendingDecisions } from "./release-decision-state.js";

function copyEvidence(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    assert.ok(entry.isFile(), "Artifact includes an unexpected nested payload");
    save(join(to, entry.name), releaseArtifactBytes(join(from, entry.name)));
  }
}
export function verifyBundle(
  directory,
  manifestSha,
  interruptedArchive = null,
) {
  const bytes = regularBytes(join(directory, "release-manifest.json"));
  assert.equal(sha256(bytes), manifestSha);
  const release = verifyManifest(JSON.parse(bytes));
  verifyArchive(
    releaseArtifactBytes(join(directory, release.archive.filename)),
    release.archive,
  );
  for (const entry of release.platformArchives)
    verifyArchive(
      releaseArtifactBytes(join(directory, entry.archive.filename)),
      entry.archive,
    );
  const index = readJson(join(directory, "evidence-index.json"));
  assert.equal(index.manifestSha256, manifestSha);
  const names = new Set();
  for (const entry of index.files) {
    assert.ok(!names.has(entry.name));
    names.add(entry.name);
    const full = resolve(directory, entry.name),
      rel = relative(directory, full);
    assert.ok(rel && !rel.startsWith("..") && !rel.includes(":"));
    const contents = releaseArtifactBytes(full);
    assert.equal(contents.length, entry.size);
    assert.equal(sha256(contents), entry.sha256);
  }
  const observed = evidenceIndex(directory)
    .map(({ name }) => name)
    .filter((name) => name !== "evidence-index.json");
  const extra = observed.filter((name) => !names.has(name));
  if (interruptedArchive) {
    assert.equal(interruptedArchive.phase, "archive");
    assert.equal(interruptedArchive.disposition, "complete-read-only");
    const journal = effectJournal("archive", interruptedArchive);
    verifyRecoveryRecord(
      interruptedArchive,
      release,
      manifestSha,
      regularBytes(join(directory, journal)),
    );
    verifyArchiveIntent(directory, interruptedArchive, manifestSha);
    const allowed = new Set([
      "LICENSE",
      "THIRD-PARTY-NOTICES.md",
      journal,
      "archive-assets-intent.json",
      "release-acceptance.json",
      "source.tar.gz",
      "build-attestation.jsonl",
      "build-attestation-verification.json",
    ]);
    assert.ok(
      extra.every((name) => allowed.has(name)),
      "Unexpected interrupted archive output",
    );
  } else assert.equal(extra.length, 0, "Unindexed evidence payload");
  assert.ok([...names].every((name) => observed.includes(name)));
  return release;
}
/** Controller changes need explicit review of the actual control delta, not artifact rewriting. */
export function verifyController(release, decision, env) {
  if (env.GITHUB_SHA === release.source.commit) return;
  assert.equal(
    decision.controllerSource,
    env.GITHUB_SHA,
    "New controller is not explicitly reviewed",
  );
  const diff = native(
    "git",
    [
      "diff",
      release.source.commit,
      env.GITHUB_SHA,
      "--",
      "scripts",
      ".github",
      "assets",
      "schemas",
      "package.json",
      "package-lock.json",
    ],
    { encoding: null },
  );
  assert.equal(
    decision.controlDeltaSha256,
    sha256(diff),
    "Controller delta differs from review",
  );
}
/** A forward fix may finish readback only; original publication decisions stay immutable. */
export function controllerReviewFor(decision, env, phase, recovery, release) {
  if (phase === "promote" && env.OPERATION_JSON) {
    return verifyOperationDecision(
      Buffer.from(env.OPERATION_JSON),
      env.OPERATION_SHA,
      release,
      env,
    );
  }
  if (phase !== "archive" || !recovery?.archive?.record.controllerReview)
    return decision;
  const { record, observed } = recovery.archive;
  assert.equal(record.disposition, "complete-read-only");
  assert.ok(observed.immutableRelease && observed.assets.length);
  const review = record.controllerReview;
  assert.equal(review.owner, "maksymshostak");
  assert.equal(review.originalReviewSha256, env.REVIEW_SHA);
  assert.equal(review.manifestSha256, env.MANIFEST_SHA);
  return review;
}
/** Qualification is read again by the final writer, outside the still-running predecessor. */
export function refreshAdmission(
  directory,
  phase,
  env = process.env,
  { historyRoot, checkHistory = true, environmentName } = {},
) {
  manualControl(env, phase);
  currentMain(env);
  const release = verifyBundle(directory, env.MANIFEST_SHA);
  const scopedOriginal =
    phase === "promote" &&
    env.OPERATION_JSON &&
    JSON.parse(env.OPERATION_JSON).family?.operation === "scoped-restore"
      ? JSON.parse(env.OPERATION_JSON).originalEffect
      : null;
  const stagedRestore = scopedOriginal?.phase === "stage";
  const recoveryRoot = join(historyRoot, "recovery-readback");
  mkdirSync(recoveryRoot, { recursive: true });
  let context = readJson(join(directory, "context.json"));
  let retained, retainedHistory;
  const readProvider = (providerPhase, origin) => {
    try {
      return provider(origin.run, origin.attempt);
    } catch (error) {
      if (
        phase !== "promote" ||
        !env.OPERATION_JSON ||
        error.httpStatus !== 404
      )
        throw error;
      if (!retained) {
        const operation = verifyOperationDecision(
          Buffer.from(env.OPERATION_JSON),
          env.OPERATION_SHA,
          release,
          env,
        );
        const live = api(`releases/tags/v${release.version}`);
        assert.equal(live.id, operation.sourceReleaseId);
        assert.equal(live.immutable, true);
        const expected = {
          version: release.version,
          manifestSha256: env.MANIFEST_SHA,
          releaseId: live.id,
        };
        retainedHistory = readHistoryRecord(operation.historyCheckpoint);
        retained = verifyQualifiedTarget(
          retainedQualifiedTarget(operation.historyCheckpoint, expected),
          expected,
        );
      }
      const matching = retained.providers.filter(
        (value) =>
          (!providerPhase || value.phase === providerPhase) &&
          String(value.provider.run.id) === origin.run &&
          String(value.provider.run.run_attempt) === origin.attempt,
      );
      if (
        !matching.length &&
        !providerPhase &&
        scopedOriginal?.phase === "promote" &&
        origin.run === scopedOriginal.run &&
        origin.attempt === scopedOriginal.attempt
      ) {
        const entries = retainedHistory.entries.filter(
          (entry) =>
            entry.phase === "promote" &&
            entry.service === scopedOriginal.service &&
            entry.run === origin.run &&
            entry.attempt === origin.attempt &&
            sha256(Buffer.from(entry.journal, "base64")) ===
              scopedOriginal.journalSha256,
        );
        assert.equal(
          entries.length,
          1,
          "Signed history lacks exact original promotion provider",
        );
        const native = entries[0].provider;
        assert.equal(native.run.id, Number(origin.run));
        assert.equal(native.run.run_attempt, Number(origin.attempt));
        assert.equal(native.jobs.total_count, native.jobs.jobs.length);
        const jobs = native.jobs.jobs.filter(
          (job) => job.name === scopedOriginal.service,
        );
        assert.equal(jobs.length, 1);
        assert.equal(jobs[0].status, "completed");
        assert.ok(
          ["success", "failure", "cancelled", "timed_out"].includes(
            jobs[0].conclusion,
          ),
        );
        return native;
      }
      assert.equal(
        matching.length,
        1,
        "Signed target checkpoint lacks an original provider inventory",
      );
      return matching[0].provider;
    }
  };
  const recovery = reconcileObserved(directory, recoveryRoot, env, {
    provider: (run, attempt) => readProvider(null, { run, attempt }),
  });
  context = readJson(join(directory, "context.json"));
  if (recovery) {
    writeFileSync(
      join(directory, "recovery-observations.json"),
      JSON.stringify(recovery.entries, null, 2) + "\n",
      { flush: true },
    );
    sealBundle(directory, env.MANIFEST_SHA);
  }
  assert.ok(
    !recovery?.entries.some(
      ({ record }) =>
        record.phase === "stage" &&
        record.disposition === "abandon-family" &&
        record.version === release.version,
    ),
    "An abandoned package version cannot advance; select and qualify a new version",
  );
  const qualified = readProvider("qualification", context.qualification);
  verifyRun(qualified, "qualification", release.source.commit, release.matrix);
  retainProvider(directory, "qualification", qualified);
  const reviewBytes = regularBytes(join(directory, "release-review.json"));
  const decision = verifyDecision(
    reviewBytes,
    env.REVIEW_SHA,
    release,
    env.MANIFEST_SHA,
    "review",
  );
  let currentReview = decision;
  if (
    phase === "stage" &&
    env.STAGE_PHASE === "core" &&
    env.CONTINUATION_REVIEW_JSON
  ) {
    const bytes = Buffer.from(env.CONTINUATION_REVIEW_JSON);
    currentReview = verifyDecision(
      bytes,
      env.CONTINUATION_REVIEW_SHA,
      release,
      env.MANIFEST_SHA,
      "review",
    );
    assert.equal(currentReview.continuesReviewSha256, env.REVIEW_SHA);
    assert.equal(
      currentReview.npmTag ?? "pilot",
      decision.npmTag ?? "pilot",
      "A continuation cannot change the already staged channel",
    );
    const path = join(directory, "continuation-review.json");
    if (existsSync(path))
      assert.equal(sha256(regularBytes(path)), env.CONTINUATION_REVIEW_SHA);
    else save(path, bytes);
    context.continuationReviewSha256 = env.CONTINUATION_REVIEW_SHA;
    writeFileSync(
      join(directory, "context.json"),
      Buffer.from(JSON.stringify(context, null, 2) + "\n"),
      { flush: true },
    );
  } else if (context.continuationReviewSha256) {
    currentReview = verifyDecision(
      regularBytes(join(directory, "continuation-review.json")),
      context.continuationReviewSha256,
      release,
      env.MANIFEST_SHA,
      "review",
    );
    assert.equal(currentReview.continuesReviewSha256, env.REVIEW_SHA);
  }
  verifyController(
    release,
    controllerReviewFor(currentReview, env, phase, recovery, release),
    env,
  );
  if (phase === "promote" && env.RESTORE_VERSION)
    admitRestoration(directory, release, env);
  assert.equal(
    signedTag(release).reference.object.sha,
    readJson(join(directory, "signed-tag.json")).reference.object.sha,
    "Release tag object changed after original admission",
  );
  if (phase !== "stage" && !stagedRestore) {
    if (context.nativeStage) {
      const native = readProvider("stage", context.nativeStage);
      verifyRun(
        native,
        "stage",
        context.nativeStage.controller,
        release.matrix,
        { stagePhase: "natives" },
      );
      retainProvider(directory, "stage", native);
      const outcome = readJson(join(directory, "native-stage-outcome.json"));
      assert.deepEqual(outcome.origin, context.nativeStage);
      assert.equal(outcome.manifestSha256, env.MANIFEST_SHA);
      assert.equal(
        outcome.journalSha256,
        sha256(
          regularBytes(
            join(directory, effectJournal("stage", context.nativeStage)),
          ),
        ),
      );
    }
    const staged = readProvider("stage", context.stage);
    // The staging control source can be a separately reviewed controller.
    verifyRun(staged, "stage", context.stage.controller, release.matrix, {
      reconciled:
        !!recovery?.stage &&
        String(recovery.stage.record.run) === context.stage.run &&
        String(recovery.stage.record.attempt) === context.stage.attempt,
      stagePhase: context.stage.phase,
    });
    retainProvider(directory, "stage", staged);
    const stage = readJson(join(directory, "stage-outcome.json"));
    assert.equal(stage.manifestSha256, env.MANIFEST_SHA);
    assert.equal(stage.subject.source, release.source.commit);
    assert.equal(stage.subject.integrity, release.archive.integrity);
    assert.ok(stage.result.stageId);
    verifyStageFamily(stage.result.stages, release);
    assert.equal(stage.result.stageId, stage.result.stages.at(-1).stageId);
    assert.deepEqual(stage.origin, context.stage);
    if (stage.schemaVersion === 2) {
      assert.deepEqual(stage.origins, context.packageOrigins);
      assert.deepEqual(
        Object.keys(stage.origins).sort(),
        releasePackages(release)
          .map((subject) => subject.package)
          .sort(),
      );
      for (const subject of releasePackages(release)) {
        const origin = stage.origins[subject.package];
        assert.equal(origin.integrity, subject.archive.integrity);
        assert.equal(origin.package, subject.package);
        const expected = subject.platform ? context.nativeStage : context.stage;
        for (const key of ["run", "attempt", "controller"])
          assert.equal(origin[key], expected[key]);
      }
    }
    assert.equal(
      stage.journalSha256,
      sha256(
        regularBytes(join(directory, effectJournal("stage", context.stage))),
      ),
    );
    if (phase !== "registry") {
      const registry = readProvider("registry", context.registry);
      verifyRun(
        registry,
        "registry",
        context.registry.controller,
        release.matrix,
      );
      retainProvider(directory, "registry", registry);
    }
  }
  if (phase === "promote" && !stagedRestore)
    verifyRun(
      readProvider("archive", context.archive),
      "archive",
      context.archive.controller,
      release.matrix,
      {
        reconciled:
          !!recovery?.archive &&
          String(recovery.archive.record.run) === context.archive.run &&
          String(recovery.archive.record.attempt) === context.archive.attempt,
      },
    );
  const names = {
    stage: "npm-publication",
    archive: "github-archival",
    promote: "npm-promotion",
  };
  if (names[phase]) checkEnvironment(environmentName ?? names[phase]);
  let history = [];
  if (checkHistory) {
    assert.ok(historyRoot);
    const checkpoint =
      phase === "promote" && env.OPERATION_JSON
        ? (JSON.parse(env.OPERATION_JSON).historyCheckpoint ??
          currentReview.historyCheckpoint)
        : currentReview.historyCheckpoint;
    assert.ok(
      checkpoint,
      "A complete signed writer-history checkpoint, including an empty first-use baseline, is required before release effects",
    );
    const completeCheckpoint =
      release.schemaVersion >= 3 || env.OPERATION_JSON
        ? readHistoryRecord(checkpoint)
        : null;
    const originalHistory = readEffectHistory(
      env,
      historyRoot,
      checkpoint,
      completeCheckpoint
        ? { checkpoint: () => completeCheckpoint.entries }
        : {},
      release,
    );
    const persistentRecovery = {
      entries: [
        ...(recovery?.entries ?? []),
        ...authenticatedHistoricalSettlements(originalHistory),
      ],
    };
    const superseded = completeCheckpoint
      ? admitPendingDecisions(
          originalHistory,
          release,
          completeCheckpoint.qualifiedTargets ?? [],
          persistentRecovery,
          {
            review: currentReview,
            settledStages: (
              completeCheckpoint.qualifiedTargetRefs ?? []
            ).flatMap((ref) => ref.settledStages ?? []),
            reviewSha256: context.continuationReviewSha256 ?? env.REVIEW_SHA,
            resolveTarget: (version, manifestSha256) => {
              const ref = historyTargetDescriptors(completeCheckpoint).find(
                (target) =>
                  target.version === version &&
                  target.manifestSha256 === manifestSha256,
              );
              return ref ? readHistoryTarget(completeCheckpoint, ref) : null;
            },
          },
        )
      : new Set();
    history = verifyEffectHistory(
      originalHistory,
      { run: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT },
      release,
      recovery,
    );
    if (phase === "stage")
      assert.ok(
        !history.some(
          (entry) =>
            (entry.intent.operation === "stage" ||
              entry.intent.operation.startsWith("stage:")) &&
            !(
              env.STAGE_PHASE === "core" &&
              release.platformArchives.some(
                (subject) => subject.package === entry.intent.package,
              ) &&
              entry.intent.run === context.nativeStage?.run &&
              entry.intent.attempt === context.nativeStage?.attempt
            ) &&
            !superseded.has(`${entry.intent.run}/${entry.intent.attempt}`),
        ),
        "Version was staged already; use continuation, never re-stage",
      );
  }
  currentMain(env);
  sealBundle(directory, env.MANIFEST_SHA);
  return { release, context, history, recovery };
}
function retainProvider(directory, phase, observed) {
  const path = join(
    directory,
    phase === "qualification"
      ? "qualification-provider.json"
      : `${phase}-provider-${observed.run.id}-${observed.run.run_attempt}.json`,
  );
  if (!existsSync(path)) save(path, observed);
  else {
    const original = readJson(path);
    for (const key of [
      "id",
      "run_attempt",
      "head_sha",
      "path",
      "status",
      "conclusion",
    ])
      assert.deepEqual(
        original.run[key],
        observed.run[key],
        "Original provider identity changed",
      );
    assert.deepEqual(
      original.jobs.jobs
        .map((job) => [job.name, job.status, job.conclusion])
        .sort(),
      observed.jobs.jobs
        .map((job) => [job.name, job.status, job.conclusion])
        .sort(),
    );
  }
}
/** Every optional package is an independently approved immutable publication. */
export function verifyStageFamily(stages, release) {
  assert.equal(stages?.length, 3, "Incomplete staged package family");
  for (const [index, subject] of releasePackages(release).entries()) {
    const actual = stages[index];
    assert.equal(actual.package, subject.package);
    assert.equal(actual.version, subject.version);
    assert.equal(actual.integrity, subject.archive.integrity);
    // eslint-disable-next-line no-control-regex -- Reject provider identifier controls.
    assert.match(actual.stageId, /^[^\x00-\x1f]{1,256}$/u);
  }
  assert.equal(
    new Set(stages.map((entry) => entry.stageId)).size,
    stages.length,
  );
}
/** A post-publication owner decision cannot be attached to an immutable release. */
export function admitRestoration(directory, release, env) {
  assert.ok(
    env.RESTORATION_JSON,
    "Exact owner restoration decision is required",
  );
  const bytes = Buffer.from(env.RESTORATION_JSON);
  const decision = verifyDecision(
    bytes,
    env.RESTORATION_SHA,
    release,
    env.MANIFEST_SHA,
    "restoration",
  );
  assert.equal(decision.targetVersion, env.RESTORE_VERSION);
  restorationAvailability(
    decision,
    env.EXPECTED_LABELS ? JSON.parse(env.EXPECTED_LABELS) : undefined,
  );
  const path = join(directory, "release-restoration.json");
  if (existsSync(path)) assert.equal(sha256(regularBytes(path)), sha256(bytes));
  else save(path, bytes);
  sealBundle(directory, env.MANIFEST_SHA);
  return decision;
}
function retainRecoveryOperation(directory, originalDirectory, record) {
  if (record.phase === "promote" && record.operationId) {
    const operation = regularBytes(
      join(originalDirectory, "availability-operation.json"),
    );
    assert.equal(sha256(operation), record.operationId);
    const retained = join(directory, "recovery-operations", record.operationId);
    mkdirSync(retained, { recursive: true });
    for (const file of [
      "availability-operation.json",
      "writer-admission.json",
      "npm-continuation.json",
      "github-continuation.json",
      "promotion-security-admit.json",
      ...readdirSync(originalDirectory).filter((name) =>
        /^qualified-target-.*\.json$/u.test(name),
      ),
    ]) {
      if (!existsSync(join(originalDirectory, file))) continue;
      const bytes = regularBytes(join(originalDirectory, file)),
        path = join(retained, file);
      if (existsSync(path)) assert.deepEqual(regularBytes(path), bytes);
      else save(path, bytes);
    }
  }
}
/** Import only the selected original journal, preserving the archival predecessor. */
export function acquireRecoveryJournal(
  directory,
  scratch,
  env,
  acquire = download,
) {
  if (!env.RECOVERY_JSON) return;
  const record = JSON.parse(env.RECOVERY_JSON);
  const name = effectJournal(record.phase, record);
  if (existsSync(join(directory, name))) {
    const release = verifyBundle(directory, env.MANIFEST_SHA);
    verifyRecoveryRecord(
      record,
      release,
      record.manifestSha256,
      regularBytes(join(directory, name)),
    );
    retainRecoveryOperation(directory, directory, record);
    if (record.phase === "archive") {
      verifyArchiveIntent(directory, record, env.MANIFEST_SHA);
    }
    sealBundle(directory, env.MANIFEST_SHA);
    return;
  }
  const acquisition = join(scratch, "recovery-acquisition");
  mkdirSync(acquisition, { recursive: true });
  const original = acquire(
    record.run,
    record.attempt,
    `effect-${record.phase}${record.service ? `-${record.service}` : ""}-${record.attempt}`,
    acquisition,
  );
  assert.match(record.manifestSha256, /^[a-f0-9]{64}$/u);
  if (record.phase === "archive") {
    assert.match(record.artifactSha256, /^[a-f0-9]{64}$/u);
    assert.equal(
      original.identity.digest,
      `sha256:${record.artifactSha256}`,
      "Recovery artifact differs from owner-selected native transport",
    );
  }
  const release = verifyBundle(
    original.directory,
    record.manifestSha256,
    record.phase === "archive" ? record : null,
  );
  const current = verifyBundle(directory, env.MANIFEST_SHA);
  if (record.manifestSha256 !== env.MANIFEST_SHA) {
    assert.equal(record.phase, "stage");
    assert.ok(["abandon-family", "supersede"].includes(record.disposition));
    assert.notEqual(
      release.version,
      current.version,
      "An abandoned version cannot be staged again",
    );
  } else assert.deepEqual(release, current);
  const journal = regularBytes(join(original.directory, name));
  verifyRecoveryRecord(record, release, record.manifestSha256, journal);
  retainRecoveryOperation(directory, original.directory, record);
  if (record.phase === "archive") {
    verifyArchiveIntent(original.directory, record, env.MANIFEST_SHA);
    const path = join(directory, "archive-assets-intent.json"),
      bytes = regularBytes(
        join(original.directory, "archive-assets-intent.json"),
      );
    if (existsSync(path))
      assert.equal(sha256(regularBytes(path)), sha256(bytes));
    else save(path, bytes);
  }
  const retained = retainedRecoveries(original.directory);
  for (const item of [record, ...retained]) {
    assert.match(item.manifestSha256, /^[a-f0-9]{64}$/u);
    if (item.manifestSha256 === env.MANIFEST_SHA) continue;
    assert.equal(item.phase, "stage");
    assert.ok(["abandon-family", "supersede"].includes(item.disposition));
    const bytes = regularBytes(
      item.manifestSha256 === record.manifestSha256
        ? join(original.directory, "release-manifest.json")
        : join(
            original.directory,
            "recovery-subjects",
            item.manifestSha256,
            "release-manifest.json",
          ),
    );
    assert.equal(sha256(bytes), item.manifestSha256);
    const parent = join(directory, "recovery-subjects", item.manifestSha256);
    mkdirSync(parent, { recursive: true });
    const target = join(parent, "release-manifest.json");
    if (existsSync(target))
      assert.equal(sha256(regularBytes(target)), item.manifestSha256);
    else save(target, bytes);
  }
  for (const entry of readdirSync(original.directory, {
    withFileTypes: true,
  })) {
    if (
      !entry.isFile() ||
      !/^(?:stage|promote(?:-npm|-github)?)-[1-9]\d*-[1-9]\d*\.jsonl(?:\.[a-f0-9]{64}\.ack\.json)?$/u.test(
        entry.name,
      )
    )
      continue;
    const bytes = regularBytes(join(original.directory, entry.name)),
      path = join(directory, entry.name);
    if (existsSync(path))
      assert.equal(sha256(regularBytes(path)), sha256(bytes));
    else save(path, bytes);
  }
  if (!existsSync(join(directory, name))) save(join(directory, name), journal);
  for (const item of retained) retainRecovery(directory, item);
  sealBundle(directory, env.MANIFEST_SHA);
}
export function assembleQualification(
  run,
  attempt,
  output,
  scratch,
  env = process.env,
) {
  const origin = provider(run, attempt);
  const producerCache = new Map();
  const originalProducer = producingAttempt(
    origin,
    "product / Reference producer",
    provider,
    producerCache,
  );
  const downloaded = download(
    run,
    originalProducer,
    `qualified-producer-${originalProducer}`,
    scratch,
  );
  const manifestBytes = regularBytes(
    join(downloaded.directory, "release-manifest.json"),
  );
  assert.equal(sha256(manifestBytes), env.MANIFEST_SHA);
  const release = verifyManifest(JSON.parse(manifestBytes));
  verifyRun(origin, "qualification", release.source.commit, release.matrix);
  copyEvidence(downloaded.directory, output);
  save(join(output, "qualification-provider.json"), origin);
  const artifacts = [downloaded.identity];
  for (const lane of lanes(release.matrix)) {
    const original = producingAttempt(
      origin,
      `product / Qualify ${lane.os} / Node ${lane.node}`,
      provider,
      producerCache,
    );
    const artifact = download(
      run,
      original,
      `consumer-${lane.os}-${lane.node}-${original}`,
      scratch,
    );
    verifyLane(artifact.directory, release, lane, "transported archive");
    artifacts.push(artifact.identity);
    copyEvidence(
      artifact.directory,
      join(output, `candidate-${lane.os}-${lane.node}`),
    );
  }
  const originalSecurity = producingAttempt(
    origin,
    "security",
    provider,
    producerCache,
  );
  const security = download(
    run,
    originalSecurity,
    `release-security-${originalSecurity}`,
    scratch,
  );
  verifySecurity(
    readJson(join(security.directory, "security.json")),
    release,
    env.MANIFEST_SHA,
    run,
    originalSecurity,
  );
  artifacts.push(security.identity);
  copyEvidence(security.directory, join(output, "candidate-security"));
  assert.ok(env.REVIEW_JSON, "Exact owner review decision is required");
  const reviewBytes = Buffer.from(env.REVIEW_JSON);
  const decision = verifyDecision(
    reviewBytes,
    env.REVIEW_SHA,
    release,
    env.MANIFEST_SHA,
    "review",
  );
  verifyController(release, decision, env);
  save(join(output, "release-review.json"), reviewBytes);
  save(join(output, "signed-tag.json"), signedTag(release));
  save(join(output, "context.json"), {
    schemaVersion: 1,
    repository,
    qualification: { run: String(run), attempt: String(attempt) },
    artifacts,
  });
  save(join(output, "evidence-index.json"), {
    schemaVersion: 1,
    manifestSha256: env.MANIFEST_SHA,
    files: evidenceIndex(output),
  });
  return release;
}
