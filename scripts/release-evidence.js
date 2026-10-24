// SPDX-License-Identifier: AGPL-3.0-only
/** Complete provider/report closure before a privileged job may consume a bundle. */
import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
  repository,
  effectJournal,
  retainedRecoveries,
  releasePackages,
} from "./release-contract.js";
import {
  checkEnvironment,
  currentMain,
  download,
  evidenceIndex,
  provider,
  readEffectHistory,
  signedTag,
  verifyEffectHistory,
  sealBundle,
} from "./release-provider.js";
import {
  reconcileObserved,
  verifyRecoveryRecord,
  retainRecovery,
} from "./release-recovery.js";
import { verifyAudit } from "./release-inventory.js";
import { native } from "./qualification-process.js";

export function verifyReport(report, release, lane, qualification, layout) {
  assert.equal(report.status, "passed");
  assert.equal(report.sourceCommit, release.source.commit);
  assert.equal(report.archiveSha256, release.archive.sha256);
  assert.equal(report.node, lane.node);
  assert.equal(
    report.platform,
    lane.os.startsWith("windows") ? "win32" : "linux",
  );
  assert.equal(report.architecture, "x64");
  assert.equal(report.npm, release.policy.consumerNpm);
  assert.equal(report.nativeToolchain.npm, release.policy.consumerNpm);
  assert.equal(report.qualification, qualification);
  assert.equal(report.layout, layout);
  assert.equal(report.publicExports, 6);
  assert.equal(report.cliPhysicalFiles, 2);
  assert.equal(report.packageVersion, release.version);
  assert.equal(
    report.installSource,
    qualification === "public registry" ? "registry" : "producer-archive",
  );
  const platform = lane.os.startsWith("windows") ? "win32-x64" : "linux-x64",
    expected = release.platformArchives.find(
      (entry) => entry.platform === platform,
    );
  assert.deepEqual(report.nativePackage, {
    name: expected.package,
    version: release.version,
    integrity: expected.archive.integrity,
  });
}
function copyEvidence(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    assert.ok(entry.isFile(), "Artifact includes an unexpected nested payload");
    save(join(to, entry.name), releaseArtifactBytes(join(from, entry.name)));
  }
}
export function verifyLane(directory, release, lane, qualification) {
  for (const layout of ["root", "isolated"]) {
    verifyReport(
      readJson(join(directory, `${layout}-result.json`)),
      release,
      lane,
      qualification,
      layout,
    );
    verifyAudit(readJson(join(directory, `${layout}-audit.json`)));
    const inventory = readJson(join(directory, `${layout}-inventory.json`));
    assert.equal(inventory.layout, layout);
    assert.equal(inventory.node, lane.node);
    assert.equal(
      inventory.lockSha256,
      sha256(regularBytes(join(directory, `${layout}-lock.json`))),
    );
    assert.ok(readJson(join(directory, `${layout}-locations.json`)).length > 0);
    assert.equal(
      readJson(join(directory, `${layout}.cdx.json`)).bomFormat,
      "CycloneDX",
    );
    if (
      qualification === "public registry" &&
      lane.node === release.policy.reference
    ) {
      assert.equal(inventory.signatures, true);
      const signatures = readJson(join(directory, `${layout}-signatures.json`));
      assert.ok(
        !signatures.error &&
          (!signatures.invalid || signatures.invalid.length === 0),
      );
    }
  }
}
export function verifySecurity(record, release, manifestSha, run, attempt) {
  assert.equal(record.source, release.source.commit);
  assert.equal(record.manifestSha256, manifestSha);
  assert.equal(record.run, String(run));
  assert.equal(record.attempt, String(attempt));
  assert.equal(record.scans.length, 2);
  assert.deepEqual(record.analyses.map((a) => a.category).sort(), [
    "/language:actions",
    "/language:javascript-typescript",
  ]);
  assert.ok(
    record.scans.every(
      (scan) =>
        scan.findings === 0 && scan.rules.length && scan.queryPacks.length,
    ),
  );
}
export function verifyBundle(directory, manifestSha) {
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
  assert.deepEqual(
    [...names].sort(),
    observed.sort(),
    "Unindexed evidence payload",
  );
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
/** Qualification is read again by the final writer, outside the still-running predecessor. */
export function refreshAdmission(
  directory,
  phase,
  env = process.env,
  { historyRoot, checkHistory = true } = {},
) {
  manualControl(env, phase);
  currentMain(env);
  const release = verifyBundle(directory, env.MANIFEST_SHA);
  const recoveryRoot = join(historyRoot, "recovery-readback");
  mkdirSync(recoveryRoot, { recursive: true });
  const recovery = reconcileObserved(directory, recoveryRoot, env);
  if (recovery) sealBundle(directory, env.MANIFEST_SHA);
  const context = readJson(join(directory, "context.json"));
  const qualified = provider(
    context.qualification.run,
    context.qualification.attempt,
  );
  verifyRun(qualified, "qualification", release.source.commit, release.matrix);
  const reviewBytes = regularBytes(join(directory, "release-review.json"));
  const decision = verifyDecision(
    reviewBytes,
    env.REVIEW_SHA,
    release,
    env.MANIFEST_SHA,
    "review",
  );
  verifyController(release, decision, env);
  if (phase === "promote" && env.RESTORE_VERSION)
    admitRestoration(directory, release, env);
  signedTag(release);
  if (phase !== "stage") {
    const staged = provider(context.stage.run, context.stage.attempt);
    // The staging control source can be a separately reviewed controller.
    verifyRun(staged, "stage", context.stage.controller, release.matrix, {
      reconciled:
        !!recovery?.stage &&
        String(recovery.stage.record.run) === context.stage.run &&
        String(recovery.stage.record.attempt) === context.stage.attempt,
    });
    const stage = readJson(join(directory, "stage-outcome.json"));
    assert.equal(stage.manifestSha256, env.MANIFEST_SHA);
    assert.equal(stage.subject.source, release.source.commit);
    assert.equal(stage.subject.integrity, release.archive.integrity);
    assert.ok(stage.result.stageId);
    verifyStageFamily(stage.result.stages, release);
    assert.equal(stage.result.stageId, stage.result.stages.at(-1).stageId);
    assert.deepEqual(stage.origin, context.stage);
    assert.equal(
      stage.journalSha256,
      sha256(
        regularBytes(join(directory, effectJournal("stage", context.stage))),
      ),
    );
    if (phase !== "registry")
      verifyRun(
        provider(context.registry.run, context.registry.attempt),
        "registry",
        context.registry.controller,
        release.matrix,
      );
  }
  if (phase === "promote")
    verifyRun(
      provider(context.archive.run, context.archive.attempt),
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
  if (names[phase]) checkEnvironment(names[phase]);
  let history = [];
  if (checkHistory) {
    assert.ok(historyRoot);
    history = verifyEffectHistory(
      readEffectHistory(env, historyRoot, decision.historyCheckpoint),
      { run: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT },
      release,
      recovery,
    );
    if (phase === "stage")
      assert.ok(
        !history.some(
          (entry) =>
            entry.intent.operation === "stage" ||
            entry.intent.operation.startsWith("stage:"),
        ),
        "Version was staged already; use continuation, never re-stage",
      );
  }
  currentMain(env);
  return { release, context, history, recovery };
}
/** Every optional package is an independently approved immutable publication. */
export function verifyStageFamily(stages, release) {
  assert.equal(stages?.length, 3, "Incomplete staged package family");
  for (const [index, subject] of releasePackages(release).entries()) {
    const actual = stages[index];
    assert.equal(actual.package, subject.package);
    assert.equal(actual.version, subject.version);
    assert.equal(actual.integrity, subject.archive.integrity);
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
  const path = join(directory, "release-restoration.json");
  if (existsSync(path)) assert.equal(sha256(regularBytes(path)), sha256(bytes));
  else save(path, bytes);
  sealBundle(directory, env.MANIFEST_SHA);
  return decision;
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
  if (existsSync(join(directory, name))) return;
  const acquisition = join(scratch, "recovery-acquisition");
  mkdirSync(acquisition, { recursive: true });
  const original = acquire(
    record.run,
    record.attempt,
    `effect-${record.phase}-${record.attempt}`,
    acquisition,
  );
  const release = verifyBundle(original.directory, env.MANIFEST_SHA);
  const current = verifyBundle(directory, env.MANIFEST_SHA);
  assert.deepEqual(release, current);
  const journal = regularBytes(join(original.directory, name));
  verifyRecoveryRecord(record, release, env.MANIFEST_SHA, journal);
  for (const entry of readdirSync(original.directory, {
    withFileTypes: true,
  })) {
    if (
      !entry.isFile() ||
      !/^promote-[1-9]\d*-[1-9]\d*\.jsonl$/u.test(entry.name)
    )
      continue;
    const bytes = regularBytes(join(original.directory, entry.name)),
      path = join(directory, entry.name);
    if (existsSync(path))
      assert.equal(sha256(regularBytes(path)), sha256(bytes));
    else save(path, bytes);
  }
  if (!existsSync(join(directory, name))) save(join(directory, name), journal);
  for (const retained of retainedRecoveries(original.directory))
    retainRecovery(directory, retained);
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
  const downloaded = download(
    run,
    attempt,
    `qualified-producer-${attempt}`,
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
    const artifact = download(
      run,
      attempt,
      `consumer-${lane.os}-${lane.node}-${attempt}`,
      scratch,
    );
    verifyLane(artifact.directory, release, lane, "transported archive");
    artifacts.push(artifact.identity);
    copyEvidence(
      artifact.directory,
      join(output, `candidate-${lane.os}-${lane.node}`),
    );
  }
  const security = download(
    run,
    attempt,
    `release-security-${attempt}`,
    scratch,
  );
  verifySecurity(
    readJson(join(security.directory, "security.json")),
    release,
    env.MANIFEST_SHA,
    run,
    attempt,
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
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(
    process.argv.length,
    5,
    "Use release-evidence.js PHASE OUTPUT SCRATCH",
  );
  const [phase, output, scratch] = process.argv.slice(2);
  manualControl(process.env, phase);
  mkdirSync(scratch, { recursive: true });
  mkdirSync(output);
  if (phase === "stage")
    assembleQualification(
      process.env.QUALIFICATION_RUN,
      process.env.QUALIFICATION_ATTEMPT,
      output,
      scratch,
    );
  else {
    const priorPhase =
      phase === "registry"
        ? "stage"
        : phase === "archive"
          ? "registry"
          : "archive";
    const run = process.env.PREVIOUS_RUN,
      attempt = process.env.PREVIOUS_ATTEMPT;
    const artifact = download(
      run,
      attempt,
      `${priorPhase === "registry" ? "public" : "effect"}-${priorPhase}-${attempt}`,
      scratch,
    );
    verifyBundle(artifact.directory, process.env.MANIFEST_SHA);
    copyTree(artifact.directory, output);
  }
  acquireRecoveryJournal(output, scratch, process.env);
  const admitted = refreshAdmission(output, phase, process.env, {
    historyRoot: scratch,
  });
  if (phase !== "stage") {
    const priorPhase =
      phase === "registry"
        ? "stage"
        : phase === "archive"
          ? "registry"
          : "archive";
    assert.equal(admitted.context[priorPhase].run, process.env.PREVIOUS_RUN);
    assert.equal(
      admitted.context[priorPhase].attempt,
      process.env.PREVIOUS_ATTEMPT,
    );
  }
}
function copyTree(from, to) {
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      mkdirSync(join(to, entry.name));
      copyTree(join(from, entry.name), join(to, entry.name));
    } else {
      assert.ok(entry.isFile());
      copyFileSync(join(from, entry.name), join(to, entry.name), 1);
    }
  }
}
