// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  applyNpmAvailability,
  applyGithubAvailability,
} from "../scripts/promotion-service.js";
import {
  verifyNpmContinuation,
  verifyGithubContinuation,
  promotionRecoveryFor,
  verifyPromotionJournal,
} from "../scripts/promotion-handoff.js";
import { verifyGithubPromotionState } from "../scripts/release-effects.js";
import {
  observeFamilyCompletion,
  verifyFamilyScope,
} from "../scripts/promotion-family.js";
import {
  verifyScopedRestoration,
  verifyOperationDecision,
} from "../scripts/release-availability-contract.js";
import { npmLabelArguments } from "../scripts/npm-availability.js";
import { inspectAcknowledgedService } from "../scripts/promotion-pending.js";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { checkWorkflows } from "../scripts/check-workflows.js";
import { effectJournal, sha256 } from "../scripts/release-contract.js";
import {
  verifyRecoveryRecord,
  reconcilePromotionLabels,
} from "../scripts/release-recovery.js";
import {
  readEffectHistory,
  verifyEffectHistory,
} from "../scripts/release-provider.js";

function fixture(t, npmOnly = false) {
  const root = mkdtempSync(join(tmpdir(), "json-promotion-service-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const target = npmOnly ? "1.0.0-rc.2" : "1.2.0";
  const release = {
    package: "@hadden-industries/json-quality",
    version: "1.2.0",
    source: { commit: "a".repeat(40) },
    archive: { integrity: "sha512-Ynl0ZXM=" },
  };
  let npm = { latest: npmOnly ? "1.2.0" : "1.1.0", pilot: target };
  let github = {
    latest: {
      id: 1,
      tag_name: "v1.1.0",
      immutable: true,
      draft: false,
      prerelease: false,
    },
    affected: {
      id: 2,
      tag_name: "v1.2.0",
      immutable: true,
      draft: false,
      prerelease: false,
    },
    target: {
      id: 3,
      tag_name: `v${target}`,
      immutable: true,
      draft: false,
      prerelease: npmOnly,
    },
  };
  const expected = {
    latest: npmOnly ? "1.2.0" : "1.1.0",
    githubLatest: "v1.1.0",
  };
  const env = {
    GITHUB_RUN_ID: "17",
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_SHA: "b".repeat(40),
    MANIFEST_SHA: "c".repeat(64),
    REVIEW_SHA: "d".repeat(64),
    ACCEPTANCE_SHA: "e".repeat(64),
    RESTORATION_SHA: npmOnly ? "f".repeat(64) : "",
  };
  const calls = [];
  const input = (service, recovery) => ({
    journal: join(
      root,
      effectJournal("promote", { run: "17", attempt: "1", service }),
    ),
    release,
    target,
    expected,
    planOptions: { npmOnly, reviewedTag: "pilot" },
    githubSnapshot: structuredClone(github),
    env: { ...env, PROMOTION_SERVICE: service },
    recovery,
  });
  const reads = {
    assertCurrent: () => calls.push("guard"),
    readNpmTags: () => structuredClone(npm),
    readGithubState: () => structuredClone(github),
  };
  return {
    root,
    release,
    target,
    expected,
    env,
    calls,
    input,
    reads,
    npmWrite: (value) => {
      calls.push("npm");
      npm.latest = value;
    },
    githubWrite: (value) => {
      calls.push("github");
      github.latest = { ...github.target, tag_name: `v${value}` };
    },
    changeNpm: (value) => {
      npm.latest = value;
    },
    changeGithub: (value) => {
      github.latest.tag_name = value;
    },
  };
}

function familyFixture(t, operation = "promote") {
  const f = fixture(t),
    core = f.release.package,
    packages = [`${core}-win32-x64`, `${core}-linux-x64`, core];
  f.release.platformArchives = packages.slice(0, 2).map((name, index) => ({
    package: name,
    platform: index ? "linux-x64" : "win32-x64",
    version: f.target,
    archive: f.release.archive,
  }));
  const latest =
    operation === "align"
      ? f.reads.readGithubState().target
      : f.reads.readGithubState().latest;
  if (operation === "align") latest.prerelease = false;
  const family = {
    schemaVersion: 2,
    operation,
    operationId: "f".repeat(64),
    subjects: packages.map((name) => ({
      package: name,
      prior: operation === "align" && name === core ? f.target : "1.1.0",
      target: f.target,
      integrity: f.release.archive.integrity,
      selected: operation !== "align" || name !== core,
    })),
    github: {
      prior: latest,
      target: { ...f.reads.readGithubState().target, prerelease: false },
      targetPrior: f.reads.readGithubState().target,
      selected: operation !== "align",
    },
  };
  const states = Object.fromEntries(
    family.subjects.map((value) => [
      value.package,
      { latest: value.prior, pilot: value.target },
    ]),
  );
  const writes = [];
  const operations = {
    assertCurrent() {},
    readPackageTags: (name) => structuredClone(states[name]),
    readGithubState: () => ({ ...f.reads.readGithubState(), latest }),
    writePackageLabel: (name, value) => {
      writes.push({ package: name, value });
      if (value === null) delete states[name].latest;
      else states[name].latest = value;
    },
  };
  return { ...f, family, states, writes, operations, packages };
}

function pilotRetirementFixture(t) {
  const f = familyFixture(t);
  const stable = {
    ...f.reads.readGithubState().target,
    prerelease: false,
  };
  f.family.operation = "retire-pilot";
  f.family.stableVersion = "1.2.0";
  f.family.retiredVersion = "1.1.0";
  f.family.github = {
    selected: false,
    prior: stable,
    target: stable,
    guards: [f.reads.readGithubState().latest],
  };
  for (const subject of f.family.subjects) {
    subject.prior = "1.1.0";
    subject.target = null;
    subject.removalApproved = true;
    delete subject.integrity;
    f.states[subject.package] = {
      latest: "1.2.0",
      pilot: "1.1.0",
      canary: "1.3.0-beta.1",
    };
  }
  f.operations.readGithubState = () => ({
    latest: structuredClone(stable),
    affected: structuredClone(stable),
    target: structuredClone(stable),
    releases: [f.reads.readGithubState().latest],
  });
  // Only the registry transport is replaced; real scope, guards and journals run.
  f.operations.writePackageLabel = (name, target) => {
    assert.equal(target, null);
    f.writes.push({ package: name, tag: "pilot" });
    delete f.states[name].pilot;
  };
  return f;
}

test("pilot retirement removes the three retired aliases and preserves stable availability", (t) => {
  const f = pilotRetirementFixture(t);
  const input = { ...f.input("npm"), family: f.family };
  const protectedGithub = f.operations.readGithubState();
  assert.ok(Object.values(f.states).every((tags) => tags.pilot === "1.1.0"));
  const result = applyNpmAvailability(input, f.operations);
  assert.equal(result.state, "completed");
  assert.deepEqual(f.writes, [
    { package: "@hadden-industries/json-quality-win32-x64", tag: "pilot" },
    { package: "@hadden-industries/json-quality-linux-x64", tag: "pilot" },
    { package: "@hadden-industries/json-quality", tag: "pilot" },
  ]);
  for (const tags of Object.values(result.packages)) {
    assert.equal(Object.hasOwn(tags, "pilot"), false);
    assert.equal(tags.latest, "1.2.0");
    assert.equal(tags.canary, "1.3.0-beta.1");
  }
  assert.deepEqual(result.github, protectedGithub);
  const records = readFileSync(input.journal, "utf8")
    .trim()
    .split("\n")
    .map(JSON.parse);
  assert.equal(records.length, 6);
  assert.deepEqual(
    records
      .filter(({ state }) => state === "intent")
      .map(({ operation }) => operation),
    [
      "npm-pilot:@hadden-industries/json-quality-win32-x64",
      "npm-pilot:@hadden-industries/json-quality-linux-x64",
      "npm-pilot:@hadden-industries/json-quality",
    ],
  );
});

test("pilot retirement requires explicit absence and protects stable and newer candidates", (t) => {
  for (const change of [
    (f) => delete f.family.subjects[0].removalApproved,
    (f) => {
      f.family.operation = ["retire-pilot"];
    },
    (f) => {
      f.family.subjects[0].integrity = f.release.archive.integrity;
    },
    (f) => {
      f.family.subjects[2].integrity = f.release.archive.integrity;
    },
    (f) => {
      f.family.retiredVersion = "1.3.0";
    },
    (f) => {
      f.states[f.packages[1]].pilot = "1.3.0";
    },
    (f) => {
      f.states[f.packages[1]].latest = "1.3.0";
    },
  ]) {
    const f = pilotRetirementFixture(t);
    change(f);
    assert.throws(() =>
      applyNpmAvailability(
        { ...f.input("npm"), family: f.family },
        f.operations,
      ),
    );
    assert.deepEqual(f.writes, []);
  }
  assert.deepEqual(
    npmLabelArguments("@hadden-industries/json-quality", null, "pilot"),
    [
      "dist-tag",
      "rm",
      "@hadden-industries/json-quality",
      "pilot",
      "--fetch-retries=0",
      "--registry=https://registry.npmjs.org/",
    ],
  );
  assert.throws(() =>
    npmLabelArguments("@hadden-industries/json-quality", "1.2.0", "pilot"),
  );
  assert.throws(() =>
    npmLabelArguments("@hadden-industries/json-quality", null, "canary"),
  );
});

test("already absent pilots are explicit no-ops and intervening drift stops later requests", (t) => {
  const absent = pilotRetirementFixture(t);
  for (const subject of absent.family.subjects) {
    subject.prior = null;
    subject.noOpApproved = true;
    delete absent.states[subject.package].pilot;
  }
  const input = { ...absent.input("npm"), family: absent.family };
  applyNpmAvailability(input, absent.operations);
  assert.deepEqual(absent.writes, []);
  assert.equal(
    JSON.parse(readFileSync(input.journal, "utf8").split("\n")[0]).operation,
    "completion-readback",
  );
  for (const tag of ["latest", "pilot"]) {
    const f = pilotRetirementFixture(t);
    assert.throws(() =>
      applyNpmAvailability(
        { ...f.input("npm"), family: f.family },
        {
          ...f.operations,
          writePackageLabel(name, value) {
            f.operations.writePackageLabel(name, value);
            f.states[f.packages[1]][tag] = "1.3.0";
          },
        },
      ),
    );
    assert.equal(f.writes.length, 1);
    assert.equal(f.states[f.packages[2]].pilot, "1.1.0");
  }
});

test("pilot continuation authenticates absence while latest remains stable", (t) => {
  const f = pilotRetirementFixture(t);
  const input = { ...f.input("npm"), family: f.family };
  const completed = applyNpmAvailability(input, f.operations);
  const journal = readFileSync(input.journal);
  const completedRecords = journal
    .toString()
    .trim()
    .split("\n")
    .map(JSON.parse);
  const laterOnly = Buffer.from(
    completedRecords
      .slice(2, 4)
      .map((record) => JSON.stringify(record))
      .join("\n") + "\n",
  );
  assert.throws(
    () =>
      verifyPromotionJournal(
        "npm",
        laterOnly,
        { service: "npm", run: "17", attempt: "1" },
        f.release,
        { ...f.env, OPERATION_SHA: f.family.operationId },
        f.family,
        { allowPartial: true },
      ),
    /prefix/,
  );
  const origin = { service: "npm", run: "17", attempt: "1" };
  const env = { ...f.env, OPERATION_SHA: f.family.operationId };
  const record = {
    schemaVersion: 2,
    state: "npm-complete",
    repository: "Hadden-Industries/json-quality",
    controller: env.GITHUB_SHA,
    source: f.release.source.commit,
    manifestSha256: env.MANIFEST_SHA,
    reviewSha256: env.REVIEW_SHA,
    acceptanceSha256: env.ACCEPTANCE_SHA,
    restorationSha256: null,
    version: null,
    targetIntegrity: null,
    targetIntegrities: Object.fromEntries(
      f.packages.map((name) => [name, null]),
    ),
    availability: "npm-only",
    priorLabels: f.family,
    family: f.family,
    operationId: f.family.operationId,
    origin,
    journal: effectJournal("promote", origin),
    journalSha256: sha256(journal),
    npm: completed.packages[f.release.package],
    packages: completed.packages,
  };
  verifyNpmContinuation(record, journal, env, f.release, null, f.family);
  assert.equal(
    inspectAcknowledgedService(f.root, "npm", origin, f.release, f.family, env)
      .state,
    "acknowledged",
  );
  const substituted = structuredClone(record);
  substituted.packages[f.packages[1]].pilot = "1.1.0";
  assert.throws(() =>
    verifyNpmContinuation(substituted, journal, env, f.release, null, f.family),
  );
  const drift = structuredClone(record);
  drift.packages[f.packages[1]].latest = "1.3.0";
  assert.throws(() =>
    verifyNpmContinuation(drift, journal, env, f.release, null, f.family),
  );
});

test("partial pilot retirement settles the original request and continues only a fresh remaining scope", (t) => {
  const f = pilotRetirementFixture(t);
  const input = { ...f.input("npm"), family: f.family };
  assert.throws(
    () =>
      applyNpmAvailability(input, {
        ...f.operations,
        writePackageLabel(name, target) {
          f.operations.writePackageLabel(name, target);
          throw new Error("lost response");
        },
      }),
    /lost response/,
  );
  const journal = readFileSync(input.journal);
  const records = journal.toString().trim().split("\n").map(JSON.parse);
  const origin = { service: "npm", run: "17", attempt: "1" };
  const env = { ...f.env, OPERATION_SHA: f.family.operationId };
  assert.equal(
    inspectAcknowledgedService(f.root, "npm", origin, f.release, f.family, env)
      .state,
    "writer-outcome-unresolved",
  );
  assert.throws(() => applyNpmAvailability(input, f.operations));
  assert.equal(f.writes.length, 1);
  const record = {
    schemaVersion: 1,
    owner: "maksymshostak",
    phase: "promote",
    ...origin,
    operationId: f.family.operationId,
    manifestSha256: env.MANIFEST_SHA,
    version: f.release.version,
    journalSha256: sha256(journal),
    acceptedAt: new Date().toISOString(),
    rationale:
      "Independently settle the exact pilot removal before continuing.",
  };
  verifyRecoveryRecord(record, f.release, env.MANIFEST_SHA, journal);
  const github = f.operations.readGithubState().latest;
  assert.equal(
    reconcilePromotionLabels(record, records, f.states, github).state,
    "family-effects-settled",
  );
  f.states[f.packages[0]].latest = "1.3.0";
  assert.throws(() =>
    reconcilePromotionLabels(record, records, f.states, github),
  );
  f.states[f.packages[0]].latest = "1.2.0";
  const remaining = structuredClone(f.family);
  remaining.operationId = "0".repeat(64);
  remaining.subjects[0].prior = null;
  remaining.subjects[0].noOpApproved = true;
  applyNpmAvailability(
    { ...input, family: remaining, journal: join(f.root, "remaining.jsonl") },
    f.operations,
  );
  assert.equal(f.writes.length, 3);
  verifyPromotionJournal(
    "npm",
    readFileSync(join(f.root, "remaining.jsonl")),
    { service: "npm", run: "17", attempt: "1" },
    f.release,
    { ...f.env, OPERATION_SHA: remaining.operationId },
    remaining,
  );
  assert.deepEqual(readFileSync(input.journal), journal);
  assert.ok(
    Object.values(f.states).every(
      (tags) => !Object.hasOwn(tags, "pilot") && tags.latest === "1.2.0",
    ),
  );
});

test("pilot admission requires the current stable proof and a bound retired qualification", (t) => {
  const f = pilotRetirementFixture(t);
  const family = structuredClone(f.family);
  delete family.operationId;
  const stable = {
    version: "1.2.0",
    releaseId: family.github.prior.id,
    manifestSha256: f.env.MANIFEST_SHA,
  };
  const decision = {
    schemaVersion: 2,
    phase: "availability",
    owner: "maksymshostak",
    source: f.release.source.commit,
    version: f.release.version,
    manifestSha256: f.env.MANIFEST_SHA,
    originalReviewSha256: f.env.REVIEW_SHA,
    controllerSource: f.env.GITHUB_SHA,
    sourceReleaseId: stable.releaseId,
    acceptedAt: new Date().toISOString(),
    rationale:
      "Retire only the authenticated older pilot after stable qualification.",
    family,
    targets: [stable],
    retiredTarget: {
      version: "1.1.0",
      releaseId: 1,
      manifestSha256: "a".repeat(64),
      prerelease: false,
    },
    historyCheckpoint: {
      tag: "release-history-fixture",
      tagSha: "b".repeat(40),
      sha256: "c".repeat(64),
    },
  };
  const verify = (value) => {
    const bytes = Buffer.from(JSON.stringify(value));
    return verifyOperationDecision(bytes, sha256(bytes), f.release, f.env);
  };
  verify(decision);
  for (const change of [
    (value) => delete value.retiredTarget,
    (value) => {
      value.family.operation = ["retire-pilot"];
    },
    (value) => delete value.historyCheckpoint,
    (value) => {
      value.retiredTarget.version = "1.0.0";
    },
    (value) => {
      value.targets[0].version = "1.1.0";
    },
    (value) => {
      value.targets[0].manifestSha256 = "0".repeat(64);
    },
    (value) => {
      value.targets[0].releaseId = 42;
    },
  ]) {
    const altered = structuredClone(decision);
    change(altered);
    assert.throws(() => verify(altered));
  }
});

test("acknowledged pilot retirement resumes observation without replay and retains channel-specific history", (t) => {
  const f = pilotRetirementFixture(t);
  const input = { ...f.input("npm"), family: f.family };
  let elapsed = 0;
  assert.throws(
    () =>
      applyNpmAvailability(input, {
        ...f.operations,
        now: () => elapsed,
        sleep: (delay) => {
          elapsed += delay;
        },
        readPackageTags(name, deadline) {
          if (f.writes.length === 3 && deadline !== undefined)
            throw Object.assign(new Error("temporary registry read failure"), {
              code: "EAI_AGAIN",
              retryable: true,
            });
          return f.operations.readPackageTags(name);
        },
      }),
    /awaits confirmed readback/,
  );
  assert.equal(f.writes.length, 3);
  const journal = readFileSync(input.journal);
  const records = journal.toString().trim().split("\n").map(JSON.parse);
  assert.equal(records.at(-1).requestAcknowledged, true);
  const env = { ...f.env, OPERATION_SHA: f.family.operationId };
  const origin = { run: "17", attempt: "1", service: "npm" };
  assert.equal(
    inspectAcknowledgedService(f.root, "npm", origin, f.release, f.family, env)
      .state,
    "acknowledged",
  );
  assert.equal(
    observeFamilyCompletion(f.family, f.operations, { npmOnly: true }).state,
    "completed",
  );
  assert.equal(f.writes.length, 3);
  const recovery = {
    schemaVersion: 1,
    owner: "maksymshostak",
    phase: "promote",
    ...origin,
    operationId: f.family.operationId,
    manifestSha256: env.MANIFEST_SHA,
    version: f.release.version,
    journalSha256: sha256(journal),
    acceptedAt: new Date().toISOString(),
    rationale:
      "Confirm every acknowledged pilot removal from independent registry observations.",
  };
  verifyRecoveryRecord(recovery, f.release, env.MANIFEST_SHA, journal);
  const observed = reconcilePromotionLabels(
    recovery,
    records,
    f.states,
    f.operations.readGithubState().latest,
  );
  const history = [
    {
      phase: "promote",
      service: "npm",
      run: {
        id: 17,
        run_attempt: 1,
        head_sha: env.GITHUB_SHA,
        path: ".github/workflows/promote-release.yml",
        repository: { full_name: "Hadden-Industries/json-quality" },
        event: "workflow_dispatch",
        head_branch: "main",
        status: "completed",
      },
      jobs: {
        total_count: 1,
        jobs: [
          {
            id: 1,
            name: "npm",
            run_id: 17,
            run_attempt: 1,
            head_sha: env.GITHUB_SHA,
            status: "completed",
            conclusion: "failure",
            steps: [
              {
                name: "Apply admitted release effect",
                status: "completed",
                started_at: "2026-11-14T00:00:00Z",
                completed_at: "2026-11-14T00:01:00Z",
                conclusion: "failure",
              },
            ],
          },
        ],
      },
      journal,
    },
  ];
  const current = { run: "18", attempt: "1" };
  assert.equal(
    verifyEffectHistory(history, current, f.release, {
      entries: [{ record: recovery, observed }],
    }).length,
    3,
  );
  const wrongChannel = journal
    .toString()
    .replaceAll("npm-pilot:", "npm-latest:");
  assert.throws(() =>
    verifyEffectHistory(
      [{ ...history[0], journal: Buffer.from(wrongChannel) }],
      current,
      f.release,
    ),
  );
  const originalEffect = {
    phase: "promote",
    ...origin,
    operationId: recovery.operationId,
    manifestSha256: recovery.manifestSha256,
    journalSha256: recovery.journalSha256,
  };
  assert.throws(
    () =>
      verifyScopedRestoration(
        {
          family: { ...f.family, operation: "scoped-restore" },
          originalEffect,
          acceptedAt: recovery.acceptedAt,
        },
        f.release,
        {
          record: { ...originalEffect, acceptedAt: recovery.acceptedAt },
          observed,
        },
        journal,
      ),
    /not changed/,
  );
  assert.deepEqual(readFileSync(input.journal), journal);
});

test("alignment writes only companions and stops on intervening core or earlier-native drift", (t) => {
  const f = familyFixture(t, "align");
  const result = applyNpmAvailability(
    { ...f.input("npm"), family: f.family },
    f.operations,
  );
  assert.equal(result.state, "completed");
  assert.deepEqual(
    f.writes.map((value) => value.package),
    f.packages.slice(0, 2),
  );
  const drift = familyFixture(t, "align");
  assert.throws(
    () =>
      applyNpmAvailability(
        { ...drift.input("npm"), family: drift.family },
        {
          ...drift.operations,
          writePackageLabel(name, value) {
            drift.operations.writePackageLabel(name, value);
            drift.states[drift.release.package].latest = "9.0.0";
          },
        },
      ),
    /Unexpected third|Prior latest/u,
  );
  assert.equal(drift.writes.length, 1);
});

test("approved family no-ops have durable readback evidence and zero mutation requests", (t) => {
  const f = familyFixture(t, "align");
  for (const subject of f.family.subjects) {
    subject.prior = subject.target;
    if (subject.selected) subject.noOpApproved = true;
    f.states[subject.package].latest = subject.target;
  }
  const input = {
    ...f.input("npm"),
    family: f.family,
    env: { ...f.input("npm").env, OPERATION_SHA: f.family.operationId },
  };
  assert.equal(applyNpmAvailability(input, f.operations).state, "completed");
  const bytes = readFileSync(input.journal);
  assert.equal(
    verifyPromotionJournal(
      "npm",
      bytes,
      { run: "17", attempt: "1" },
      f.release,
      input.env,
      f.family,
    )[0].operation,
    "completion-readback",
  );
  assert.deepEqual(f.writes, []);
});

test("scoped stage restoration selects only originally changed defaults and explicit prior absence", (t) => {
  const f = familyFixture(t, "align"),
    review = {
      npmTag: "latest",
      priorAvailability: {
        npmLatest: Object.fromEntries(
          f.packages.map((name) => [name, "1.1.0"]),
        ),
      },
    };
  const records = f.packages.slice(0, 2).map((name) => ({
    state: "intent",
    operation: `stage:${name}`,
    package: name,
    version: f.release.version,
  }));
  const journal = Buffer.from(
    records
      .flatMap((record) => [
        JSON.stringify(record),
        JSON.stringify({
          state: "completed",
          intentSha256: sha256(Buffer.from(JSON.stringify(record) + "\n")),
        }),
      ])
      .join("\n") + "\n",
  );
  const originalEffect = {
    phase: "stage",
    run: "17",
    attempt: "1",
    manifestSha256: f.env.MANIFEST_SHA,
    journalSha256: sha256(journal),
  };
  const family = {
    ...f.family,
    operation: "scoped-restore",
    subjects: f.family.subjects.map((subject) => ({
      ...subject,
      selected: subject.package !== f.release.package,
      prior:
        subject.package === f.release.package ? "1.1.0" : f.release.version,
      target: "1.1.0",
    })),
  };
  const decision = {
      family,
      originalEffect,
      acceptedAt: "2026-11-13T02:00:00Z",
    },
    settlement = {
      record: {
        ...originalEffect,
        disposition: "restore-labels",
        acceptedAt: "2026-11-13T01:00:00Z",
      },
      observed: {
        state: "staged-labels-settled",
        stages: f.packages.slice(0, 2).map((name) => ({
          package: name,
          state: "public-provenance-verified",
        })),
      },
    };
  verifyFamilyScope(family, f.release);
  verifyScopedRestoration(decision, f.release, settlement, journal, review);
  const wrong = structuredClone(decision);
  wrong.family.subjects.at(-1).selected = true;
  assert.throws(
    () =>
      verifyScopedRestoration(wrong, f.release, settlement, journal, review),
    /not changed/,
  );
  const substituted = structuredClone(settlement);
  substituted.record.run = "18";
  assert.throws(() =>
    verifyScopedRestoration(decision, f.release, substituted, journal, review),
  );
  review.priorAvailability.npmLatest[f.packages[0]] = null;
  family.subjects[0].target = null;
  assert.throws(() => verifyFamilyScope(family, f.release), /removal/);
  family.subjects[0].removalApproved = true;
  verifyFamilyScope(family, f.release);
  verifyScopedRestoration(decision, f.release, settlement, journal, review);
});

test("family classification refuses RC GitHub latest and duplicate emergency guards before any effect", (t) => {
  const f = familyFixture(t);
  const scoped = structuredClone(f.family);
  scoped.operation = "scoped-restore";
  scoped.github.target = {
    ...scoped.github.target,
    tag_name: "v1.1.0-rc.1",
    prerelease: true,
  };
  scoped.github.targetPrior = scoped.github.target;
  assert.throws(
    () => verifyFamilyScope(scoped, f.release),
    /stable classification|candidate/,
  );
  const emergency = structuredClone(f.family);
  emergency.operation = "emergency-core-restore";
  emergency.github.selected = false;
  emergency.github.target = emergency.github.prior;
  emergency.subjects = emergency.subjects.map((subject) =>
    subject.package === f.release.package
      ? subject
      : { ...subject, selected: false, target: subject.prior },
  );
  emergency.github.guards = [emergency.github.prior, emergency.github.prior];
  assert.throws(() => verifyFamilyScope(emergency, f.release), /distinct/);
  assert.deepEqual(f.writes, []);
});

test("family recovery binds each attempted package and refuses a third value or substituted operation", (t) => {
  const f = familyFixture(t, "align");
  let count = 0;
  assert.throws(
    () =>
      applyNpmAvailability(
        { ...f.input("npm"), family: f.family },
        {
          ...f.operations,
          writePackageLabel(name, value) {
            f.operations.writePackageLabel(name, value);
            if (++count === 1) throw new Error("lost acknowledgement");
          },
        },
      ),
    /lost acknowledgement/,
  );
  const journal = readFileSync(f.input("npm").journal),
    records = journal.toString().trim().split("\n").map(JSON.parse);
  const record = {
    schemaVersion: 1,
    owner: "maksymshostak",
    phase: "promote",
    service: "npm",
    operationId: f.family.operationId,
    run: "17",
    attempt: "1",
    manifestSha256: f.env.MANIFEST_SHA,
    version: f.release.version,
    acceptedAt: new Date().toISOString(),
    rationale: "Settle the original request with exact provider readback.",
    journalSha256: sha256(journal),
  };
  verifyRecoveryRecord(record, f.release, f.env.MANIFEST_SHA, journal);
  assert.equal(
    reconcilePromotionLabels(
      record,
      records,
      f.states,
      f.operations.readGithubState().latest,
    ).state,
    "family-effects-settled",
  );
  assert.throws(() =>
    reconcilePromotionLabels(
      { ...record, operationId: "0".repeat(64) },
      records,
      f.states,
      f.operations.readGithubState().latest,
    ),
  );
  f.states[f.packages[1]].latest = "9.0.0";
  assert.throws(() =>
    reconcilePromotionLabels(
      record,
      records,
      f.states,
      f.operations.readGithubState().latest,
    ),
  );
  const jobs = ["admit", "npm", "github", "complete"].map((name, index) => ({
    id: index + 1,
    name,
    run_id: 17,
    run_attempt: 1,
    head_sha: f.env.GITHUB_SHA,
    status: "completed",
    conclusion: name === "npm" ? "failure" : "skipped",
    steps:
      name === "npm"
        ? [
            {
              name: "Apply admitted release effect",
              status: "completed",
              conclusion: "failure",
              started_at: "2026-11-13T00:00:00Z",
              completed_at: "2026-11-13T00:01:00Z",
            },
          ]
        : [],
  }));
  const history = {
    phase: "promote",
    service: "npm",
    run: {
      id: 17,
      run_attempt: 1,
      head_sha: f.env.GITHUB_SHA,
      status: "completed",
      head_branch: "main",
      event: "workflow_dispatch",
      repository: { full_name: "Hadden-Industries/json-quality" },
      path: ".github/workflows/promote-release.yml",
    },
    jobs: { total_count: jobs.length, jobs },
    journal,
  };
  assert.throws(
    () =>
      verifyEffectHistory([history], { run: "18", attempt: "1" }, f.release),
    /Unknown prior effect/,
  );
});

test("family completion shares one deadline, tolerates transport/reset and prior propagation, and never writes", (t) => {
  const f = familyFixture(t),
    { family } = f;
  let elapsed = 0,
    reads = 0;
  const operations = {
    ...f.operations,
    now: () => elapsed,
    random: () => 0,
    sleep: (ms) => {
      elapsed += ms;
    },
    readPackageTags(name, deadline) {
      assert.equal(deadline, 300_000);
      reads++;
      if (reads === 1)
        throw Object.assign(new Error("reset"), { code: "ECONNRESET" });
      return { latest: elapsed < 270_000 ? "1.1.0" : f.target };
    },
    readGithubState: () => ({
      latest: { ...family.github.target, immutable: true, draft: false },
      target: { ...family.github.target, immutable: true, draft: false },
    }),
  };
  assert.equal(observeFamilyCompletion(family, operations).state, "completed");
  assert.ok(elapsed >= 270_000 && elapsed < 300_000);
  assert.deepEqual(f.writes, []);
  elapsed = 0;
  const result = observeFamilyCompletion(family, {
    ...operations,
    wallNow: () => 0,
    readPackageTags: () => {
      throw Object.assign(new Error("rate limit"), {
        retryable: true,
        retryAfterMs: 360_000,
        httpStatus: 429,
      });
    },
  });
  assert.equal(result.state, "completion-unconfirmed");
  assert.equal(result.earliestUsefulRetryAt, "1970-01-01T00:06:00.000Z");
  assert.equal(elapsed, 0);
  elapsed = 0;
  const splitFamily = {
    ...family,
    github: {
      ...family.github,
      targetPrior: { ...family.github.targetPrior, prerelease: true },
    },
  };
  const split = observeFamilyCompletion(splitFamily, {
    ...operations,
    readPackageTags: () => ({ latest: f.target }),
    readGithubState: () => ({
      latest: { ...family.github.target, immutable: true, draft: false },
      target: {
        ...family.github.targetPrior,
        prerelease: true,
        immutable: true,
        draft: false,
      },
    }),
  });
  assert.equal(
    split.state,
    "completion-unconfirmed",
    "A stale target classification cannot become completed through the latest endpoint",
  );
  elapsed = 0;
  const targetRateLimit = observeFamilyCompletion(family, {
    ...operations,
    wallNow: () => 0,
    readPackageTags: () => ({ latest: f.target }),
    verifyTargets(deadline) {
      assert.equal(deadline, 300_000);
      throw Object.assign(new Error("target rate limit"), {
        retryable: true,
        retryAfterMs: 360_000,
        httpStatus: 429,
      });
    },
  });
  assert.equal(targetRateLimit.state, "completion-unconfirmed");
  assert.equal(
    targetRateLimit.earliestUsefulRetryAt,
    "1970-01-01T00:06:00.000Z",
  );
  assert.equal(
    observeFamilyCompletion(family, {
      ...operations,
      readPackageTags: () => ({ latest: f.target }),
    }).state,
    "completed",
  );
  assert.throws(
    () =>
      observeFamilyCompletion(family, {
        ...operations,
        readPackageTags: () => ({ latest: "9.0.0" }),
      }),
    /third/u,
  );
  assert.throws(
    () =>
      observeFamilyCompletion(family, {
        ...operations,
        readPackageTags: () => {
          throw Object.assign(new Error("forbidden"), { httpStatus: 403 });
        },
      }),
    /forbidden/u,
  );
  assert.deepEqual(f.writes, []);
});

test("native npm CLI issues one mutation when a registry loses acknowledgement", async (t) => {
  let mutations = 0;
  const server = createServer((request, response) => {
    if (["PUT", "DELETE"].includes(request.method)) {
      mutations++;
      response.writeHead(503, { "content-type": "application/json" });
      response.end(
        JSON.stringify({ error: "response lost after applying label" }),
      );
    } else {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          name: "@hadden-industries/json-quality",
          "dist-tags": { latest: "1.1.0" },
          versions: { "1.2.0": { version: "1.2.0" } },
        }),
      );
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const root = mkdtempSync(join(tmpdir(), "json-npm-one-request-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const args = npmLabelArguments(
    "@hadden-industries/json-quality",
    "1.2.0",
  ).map((value) =>
    value.startsWith("--registry=")
      ? `--registry=http://127.0.0.1:${server.address().port}/`
      : value,
  );
  const result = await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [process.env.npm_execpath, ...args, "--json"],
      {
        cwd: root,
        windowsHide: true,
        timeout: 30_000,
        env: {
          ...process.env,
          NPM_CONFIG_CACHE: root,
          NPM_CONFIG_USERCONFIG: join(root, "empty.npmrc"),
          NPM_CONFIG_FETCH_RETRIES: "2",
        },
      },
    );
    let output = "";
    child.stdout.on("data", (data) => (output += data));
    child.stderr.on("data", (data) => (output += data));
    child.on("error", reject);
    child.on("exit", (code) => resolve({ code, output }));
  });
  assert.notEqual(result.code, 0, result.output);
  assert.equal(mutations, 1, result.output);
});

test("native captured-output stage rejection accepts supplied owner OTP without a terminal or automatic DELETE retries", async (t) => {
  const stageId = "01234567-1234-4123-8123-0123456789ab";
  let deletes = 0;
  const server = createServer((request, response) => {
    if (request.method === "GET") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end("{}");
      return;
    }
    assert.equal(request.method, "DELETE");
    assert.equal(request.url, `/-/stage/${stageId}`);
    deletes++;
    if (request.headers["npm-otp"] !== "123456") {
      response.writeHead(401, {
        "www-authenticate": "OTP",
        "content-type": "application/json",
      });
      response.end(JSON.stringify({ error: "OTP required" }));
    } else {
      response.writeHead(200, { "content-type": "application/json" });
      response.end("{}");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const root = mkdtempSync(join(tmpdir(), "json-native-stage-otp-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const result = await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        process.env.npm_execpath,
        "stage",
        "reject",
        stageId,
        "--fetch-retries=0",
        `--registry=http://127.0.0.1:${server.address().port}/`,
      ],
      {
        cwd: root,
        windowsHide: true,
        timeout: 30_000,
        env: {
          ...process.env,
          NPM_CONFIG_CACHE: root,
          NPM_CONFIG_USERCONFIG: join(root, "empty.npmrc"),
          NPM_CONFIG_OTP: "123456",
          NPM_CONFIG_FETCH_RETRIES: "2",
        },
      },
    );
    let output = "";
    child.stdout.on("data", (data) => (output += data));
    child.stderr.on("data", (data) => (output += data));
    child.on("error", reject);
    child.on("exit", (code) => resolve({ code, output }));
  });
  assert.equal(result.code, 0, result.output);
  assert.equal(deletes, 1);
  assert.ok(
    result.output.includes(`Staged package ${stageId} has been rejected.`),
  );
});

test("separate writers preserve npm-complete/GitHub-pending and make one request per service", (t) => {
  const f = fixture(t);
  const npm = applyNpmAvailability(f.input("npm"), {
    ...f.reads,
    writeNpmLatest: f.npmWrite,
  });
  assert.equal(npm.npm.latest, "1.2.0");
  assert.equal(npm.github.latest.tag_name, "v1.1.0");
  assert.deepEqual(f.calls, ["guard", "npm"]);
  const recovery = {
    record: {},
    observed: { npmLatest: f.target, githubLatest: "v1.1.0" },
    priorLabels: f.expected,
  };
  const github = applyGithubAvailability(f.input("github", recovery), {
    ...f.reads,
    writeGithubLatest: f.githubWrite,
  });
  assert.equal(github.github.tag_name, "v1.2.0");
  assert.deepEqual(f.calls, ["guard", "npm", "guard", "github"]);
  const names = ["npm", "github"].map(
    (service) =>
      JSON.parse(readFileSync(f.input(service).journal, "utf8").split("\n")[0])
        .operation,
  );
  assert.deepEqual(names, ["npm-latest", "github-latest"]);
  assert.notEqual(f.input("npm").journal, f.input("github").journal);
});

test("family promotion writes Windows, Linux, core once and guards every earlier target", (t) => {
  const f = fixture(t),
    core = f.release.package;
  const packages = [`${core}-win32-x64`, `${core}-linux-x64`, core];
  f.release.platformArchives = packages.slice(0, 2).map((name, index) => ({
    package: name,
    platform: index ? "linux-x64" : "win32-x64",
    version: f.release.version,
    archive: f.release.archive,
  }));
  const family = {
    schemaVersion: 2,
    operation: "promote",
    operationId: "f".repeat(64),
    subjects: packages.map((name) => ({
      package: name,
      prior: "1.1.0",
      target: f.target,
      integrity: f.release.archive.integrity,
      selected: true,
    })),
    github: {
      prior: f.reads.readGithubState().latest,
      target: f.reads.readGithubState().target,
      targetPrior: f.reads.readGithubState().target,
      selected: true,
    },
  };
  const states = Object.fromEntries(
    packages.map((name) => [name, { latest: "1.1.0", pilot: f.target }]),
  );
  const writes = [];
  const input = { ...f.input("npm"), family };
  const result = applyNpmAvailability(input, {
    ...f.reads,
    readPackageTags: (name) => structuredClone(states[name]),
    writePackageLabel: (name, value) => {
      writes.push(name);
      states[name].latest = value;
    },
    // The old core-only path can run, making the missing family behavior observable.
    writeNpmLatest: (value) => {
      writes.push(core);
      f.npmWrite(value);
    },
  });
  assert.deepEqual(writes, packages);
  assert.deepEqual(Object.keys(result.packages).sort(), [...packages].sort());
  const journal = readFileSync(input.journal, "utf8")
    .trim()
    .split("\n")
    .map(JSON.parse);
  assert.deepEqual(
    journal
      .filter(({ state }) => state === "intent")
      .map(({ package: name }) => name),
    packages,
  );
  assert.ok(
    journal
      .filter(({ state }) => state === "intent")
      .every(({ guard }) => guard.operationId === family.operationId),
  );
});

test("an acknowledged npm write tolerates stale prior tags before sealing completion", (t) => {
  const f = fixture(t);
  const prior = f.reads.readNpmTags();
  let elapsed = 0;
  const input = f.input("npm");
  const completed = applyNpmAvailability(input, {
    ...f.reads,
    readNpmTags: (deadline) => {
      if (deadline !== undefined) {
        assert.equal(deadline, 300_000);
        if (elapsed < 270_000) return prior;
      }
      return f.reads.readNpmTags();
    },
    writeNpmLatest: f.npmWrite,
    now: () => elapsed,
    sleep: (ms) => {
      elapsed += ms;
      assert.ok(elapsed <= 300_000);
    },
  });
  assert.equal(completed.npm.latest, f.target);
  assert.deepEqual(f.calls, ["guard", "npm"]);
  assert.ok(elapsed >= 270_000 && elapsed < 300_000);
  const journal = readFileSync(input.journal, "utf8").trim().split("\n");
  assert.deepEqual(
    journal.map((line) => JSON.parse(line).state),
    ["intent", "completed"],
  );
});

test("npm readback leaves a single unknown write when the prior tag persists or a third version appears", async (t) => {
  for (const [label, retry] of [
    ["1.1.0", true],
    ["1.3.0", false],
  ]) {
    await t.test(label, (subtest) => {
      const f = fixture(subtest);
      const input = f.input("npm");
      let elapsed = 0;
      const observations = [];
      assert.throws(
        () =>
          applyNpmAvailability(input, {
            ...f.reads,
            readNpmTags: (deadline) => {
              if (deadline !== undefined) {
                assert.equal(deadline, 300_000);
                assert.ok(elapsed < deadline);
                observations.push(elapsed);
                elapsed += Math.min(2_000, deadline - elapsed);
              }
              return f.reads.readNpmTags();
            },
            writeNpmLatest: () => f.npmWrite(label),
            now: () => elapsed,
            sleep: (ms) => {
              elapsed += ms;
              assert.ok(elapsed <= 300_000);
            },
          }),
        /npm latest update outcome unresolved/u,
      );
      assert.equal(elapsed, retry ? 300_000 : 2_000);
      if (retry) assert.ok(observations.at(-1) > 270_000);
      else assert.deepEqual(observations, [0]);
      assert.deepEqual(f.calls, ["guard", "npm"]);
      const journal = readFileSync(input.journal, "utf8").trim().split("\n");
      assert.deepEqual(
        journal.map((line) => JSON.parse(line).state),
        ["intent", "outcome-unknown"],
      );
    });
  }
});

test("unknown npm request cannot be replayed; owner readback can continue only GitHub", (t) => {
  const f = fixture(t);
  const operations = {
    ...f.reads,
    writeNpmLatest: (value) => {
      f.npmWrite(value);
      throw new Error("lost response");
    },
  };
  assert.throws(
    () => applyNpmAvailability(f.input("npm"), operations),
    /lost response/u,
  );
  assert.throws(
    () => applyNpmAvailability(f.input("npm"), operations),
    /Unknown request|Prior latest/u,
  );
  assert.equal(f.calls.filter((name) => name === "npm").length, 1);
  const record = {
    schemaVersion: 1,
    owner: "maksymshostak",
    phase: "promote",
    service: "npm",
    run: "17",
    attempt: "1",
    version: f.release.version,
    manifestSha256: f.env.MANIFEST_SHA,
    journalSha256: sha256(readFileSync(f.input("npm").journal)),
    targetVersion: f.target,
    availability: "npm-and-github",
    acceptedAt: "2026-10-30T00:00:00Z",
    rationale:
      "Owner independently observed the exact npm target after response loss.",
  };
  verifyRecoveryRecord(
    record,
    f.release,
    f.env.MANIFEST_SHA,
    readFileSync(f.input("npm").journal),
  );
  assert.throws(() =>
    verifyRecoveryRecord(
      { ...record, service: "github" },
      f.release,
      f.env.MANIFEST_SHA,
      readFileSync(f.input("npm").journal),
    ),
  );
  const recovery = {
    record,
    observed: { npmLatest: f.target, githubLatest: "v1.1.0" },
    priorLabels: f.expected,
  };
  applyGithubAvailability(f.input("github", recovery), {
    ...f.reads,
    writeGithubLatest: f.githubWrite,
  });
  assert.equal(f.calls.filter((name) => name === "npm").length, 1);
  assert.equal(f.calls.filter((name) => name === "github").length, 1);
});

test("npm-only immutable prerelease restoration never admits a GitHub writer and checks unchanged markers", (t) => {
  const f = fixture(t, true);
  const completed = applyNpmAvailability(f.input("npm"), {
    ...f.reads,
    writeNpmLatest: f.npmWrite,
  });
  assert.equal(completed.npm.latest, "1.0.0-rc.2");
  assert.equal(completed.github.latest.tag_name, "v1.1.0");
  assert.throws(
    () =>
      applyGithubAvailability(f.input("github"), {
        ...f.reads,
        writeGithubLatest: f.githubWrite,
      }),
    /npm-only/u,
  );
  assert.equal(f.calls.includes("github"), false);
});

test("lost GitHub acknowledgement retains unknown intent and recovered completion makes no second request", (t) => {
  const f = fixture(t);
  applyNpmAvailability(f.input("npm"), {
    ...f.reads,
    writeNpmLatest: f.npmWrite,
  });
  const recovery = {
    record: {},
    observed: { npmLatest: f.target, githubLatest: "v1.1.0" },
    priorLabels: f.expected,
  };
  assert.throws(
    () =>
      applyGithubAvailability(f.input("github", recovery), {
        ...f.reads,
        writeGithubLatest: (value) => {
          f.githubWrite(value);
          throw new Error("lost GitHub response");
        },
      }),
    /lost GitHub/u,
  );
  const original = readFileSync(f.input("github").journal);
  assert.equal(
    JSON.parse(original.toString().trim().split("\n")[1]).state,
    "outcome-unknown",
  );
  const settled = {
    ...recovery,
    observed: { npmLatest: f.target, githubLatest: `v${f.target}` },
  };
  const next = f.input("github", settled);
  next.env = { ...next.env, GITHUB_RUN_ATTEMPT: "2" };
  next.journal = join(f.root, "promote-github-17-2.jsonl");
  applyGithubAvailability(next, {
    ...f.reads,
    writeGithubLatest: f.githubWrite,
  });
  assert.equal(f.calls.filter((name) => name === "github").length, 1);
  assert.equal(f.calls.filter((name) => name === "npm").length, 1);
  assert.deepEqual(readFileSync(f.input("github").journal), original);
  assert.equal(
    JSON.parse(readFileSync(next.journal, "utf8").split("\n")[0]).operation,
    "completion-readback",
  );
});

test("native writer history retains both service journals and refuses a missing attempted service", (t) => {
  const f = fixture(t);
  applyNpmAvailability(f.input("npm"), {
    ...f.reads,
    writeNpmLatest: f.npmWrite,
  });
  applyGithubAvailability(
    f.input("github", {
      record: {},
      observed: { npmLatest: f.target, githubLatest: "v1.1.0" },
      priorLabels: f.expected,
    }),
    { ...f.reads, writeGithubLatest: f.githubWrite },
  );
  const run = {
    id: 17,
    run_attempt: 1,
    status: "completed",
    conclusion: "success",
    head_sha: f.env.GITHUB_SHA,
    path: ".github/workflows/promote-release.yml",
    event: "workflow_dispatch",
    head_branch: "main",
    repository: { full_name: "Hadden-Industries/json-quality" },
  };
  const jobs = ["admit", "npm", "github", "complete"].map((name, index) => ({
    id: index + 1,
    name,
    run_id: 17,
    run_attempt: 1,
    status: "completed",
    conclusion: "success",
    head_sha: run.head_sha,
    runner_id: index + 1,
    started_at: "2026-10-30T00:00:00Z",
    completed_at: "2026-10-30T00:01:00Z",
    steps: ["npm", "github"].includes(name)
      ? [
          {
            name: "Apply admitted release effect",
            status: "completed",
            started_at: "2026-10-30T00:00:00Z",
            completed_at: "2026-10-30T00:01:00Z",
            conclusion: "success",
          },
        ]
      : [],
  }));
  const artifacts = ["npm", "github"].map((service) => ({
    name: `effect-promote-${service}-1`,
    digest: `sha256:${service}`,
    expired: false,
  }));
  const readers = {
    pages: (path) =>
      path.includes("/artifacts?")
        ? artifacts
        : path.includes("promote-release.yml")
          ? [run]
          : [],
    provider: () => ({ run, jobs: { total_count: jobs.length, jobs } }),
    download: (_run, _attempt, name) => {
      const service = name.includes("-npm-") ? "npm" : "github";
      const directory = join(f.root, `${service}-artifact`);
      mkdirSync(directory, { recursive: true });
      writeFileSync(
        join(
          directory,
          effectJournal("promote", { service, run: 17, attempt: 1 }),
        ),
        readFileSync(f.input(service).journal),
      );
      return { directory };
    },
  };
  const history = readEffectHistory(
    { GITHUB_RUN_ID: "18", GITHUB_RUN_ATTEMPT: "1" },
    f.root,
    null,
    readers,
  );
  assert.deepEqual(
    history.map(({ service }) => service),
    ["npm", "github"],
  );
  const evidence = verifyEffectHistory(
    history,
    { run: "18", attempt: "1" },
    f.release,
  );
  assert.deepEqual(
    evidence.map(({ intent }) => intent.operation),
    ["npm-latest", "github-latest"],
  );
  const acquired = [];
  const rerunReaders = {
    ...readers,
    pages: (path) =>
      path.includes("/artifacts?")
        ? [
            ...artifacts,
            {
              name: "effect-promote-github-2",
              digest: "sha256:github2",
              expired: false,
            },
          ]
        : path.includes("promote-release.yml")
          ? [{ ...run, run_attempt: 2 }]
          : [],
    provider: (_id, attempt) => ({
      run: { ...run, run_attempt: attempt },
      jobs: {
        total_count: jobs.length,
        jobs: jobs.map((job) => ({
          ...job,
          run_attempt: attempt,
          id: job.id + attempt * 100,
          ...(attempt === 2 && job.name === "github"
            ? {
                runner_id: 9,
                started_at: "2026-10-30T00:02:00Z",
                completed_at: "2026-10-30T00:03:00Z",
              }
            : {}),
        })),
      },
    }),
    download: (id, attempt, name, root) => {
      acquired.push(name);
      return readers.download(id, attempt, name, root);
    },
  };
  const rerunHistory = readEffectHistory(
    { GITHUB_RUN_ID: "18", GITHUB_RUN_ATTEMPT: "1" },
    f.root,
    null,
    rerunReaders,
  );
  assert.deepEqual(acquired, [
    "effect-promote-npm-1",
    "effect-promote-github-1",
    "effect-promote-github-2",
  ]);
  assert.deepEqual(
    rerunHistory.map((entry) => `${entry.service}/${entry.run.run_attempt}`),
    ["npm/1", "github/1", "github/2"],
  );
  artifacts.pop();
  assert.throws(
    () =>
      readEffectHistory(
        { GITHUB_RUN_ID: "18", GITHUB_RUN_ATTEMPT: "1" },
        f.root,
        null,
        readers,
      ),
    /Historical effect artifact unavailable/u,
  );
});

test("dual-service completion admits the authenticated GitHub outcome before checking the advanced label", (t) => {
  const f = fixture(t);
  const npm = applyNpmAvailability(f.input("npm"), {
    ...f.reads,
    writeNpmLatest: f.npmWrite,
  });
  const continuation = {
    version: f.target,
    priorLabels: f.expected,
    githubLatest: npm.github.latest.tag_name,
  };
  const pending = promotionRecoveryFor(continuation, null);
  verifyGithubPromotionState("v1.1.0", f.expected, f.target, pending);
  const completed = applyGithubAvailability(f.input("github", pending), {
    ...f.reads,
    writeGithubLatest: f.githubWrite,
  });
  const npmBytes = Buffer.from(JSON.stringify(continuation));
  const journal = readFileSync(f.input("github").journal);
  const record = {
    schemaVersion: 1,
    state: "github-complete",
    origin: { run: "17", attempt: "1", service: "github" },
    journal: effectJournal("promote", {
      run: "17",
      attempt: "1",
      service: "github",
    }),
    journalSha256: sha256(journal),
    npmContinuationSha256: sha256(npmBytes),
    ...completed,
  };
  const github = verifyGithubContinuation(
    record,
    journal,
    npmBytes,
    f.release,
    f.env,
  );
  const final = promotionRecoveryFor(continuation, null, github);
  assert.equal(final.observed.githubLatest, "v1.2.0");
  verifyGithubPromotionState("v1.2.0", f.expected, f.target, final);
  assert.throws(() =>
    verifyGithubPromotionState("v1.2.0", f.expected, f.target, pending),
  );
  assert.throws(() =>
    verifyGithubContinuation(
      record,
      journal,
      Buffer.from("{}"),
      f.release,
      f.env,
    ),
  );
  const unknown = Buffer.from(
    journal
      .toString()
      .replace('"state":"completed"', '"state":"outcome-unknown"'),
  );
  assert.throws(() =>
    verifyGithubContinuation(
      { ...record, journalSha256: sha256(unknown) },
      unknown,
      npmBytes,
      f.release,
      f.env,
    ),
  );
});

test("wrong-service capabilities, intervening labels and missing npm predecessor refuse before a write", (t) => {
  const f = fixture(t);
  assert.throws(
    () =>
      applyNpmAvailability(f.input("npm"), {
        ...f.reads,
        writeNpmLatest: f.npmWrite,
        writeGithubLatest: f.githubWrite,
      }),
    /boundary/u,
  );
  assert.throws(
    () =>
      applyGithubAvailability(f.input("github"), {
        ...f.reads,
        writeNpmLatest: f.npmWrite,
        writeGithubLatest: f.githubWrite,
      }),
    /boundary/u,
  );
  assert.throws(
    () =>
      applyGithubAvailability(f.input("github"), {
        ...f.reads,
        writeGithubLatest: f.githubWrite,
      }),
    /predecessor/u,
  );
  f.changeNpm("2.0.0");
  assert.throws(() =>
    applyNpmAvailability(f.input("npm"), {
      ...f.reads,
      writeNpmLatest: f.npmWrite,
    }),
  );
  assert.equal(f.calls.length, 0);
});

test("handoff authenticates decisions, scope, original journal and runtime identities", (t) => {
  const f = fixture(t);
  const completed = applyNpmAvailability(f.input("npm"), {
    ...f.reads,
    writeNpmLatest: f.npmWrite,
  });
  const origin = { run: "17", attempt: "1", service: "npm" };
  const journal = readFileSync(f.input("npm").journal);
  const record = {
    schemaVersion: 1,
    state: "npm-complete",
    repository: "Hadden-Industries/json-quality",
    controller: f.env.GITHUB_SHA,
    source: f.release.source.commit,
    manifestSha256: f.env.MANIFEST_SHA,
    reviewSha256: f.env.REVIEW_SHA,
    acceptanceSha256: f.env.ACCEPTANCE_SHA,
    restorationSha256: null,
    version: f.target,
    targetIntegrity: f.release.archive.integrity,
    availability: "npm-and-github",
    priorLabels: f.expected,
    origin,
    journal: effectJournal("promote", origin),
    journalSha256: sha256(journal),
    npm: completed.npm,
    githubLatest: completed.github.latest.tag_name,
  };
  verifyNpmContinuation(
    record,
    journal,
    f.env,
    f.release,
    f.target,
    f.expected,
  );
  for (const mutate of [
    (value) => {
      value.source = "f".repeat(40);
    },
    (value) => {
      value.origin.attempt = "2";
    },
    (value) => {
      value.journalSha256 = "0".repeat(64);
    },
    (value) => {
      value.state = "completed";
    },
    (value) => {
      value.acceptanceSha256 = "0".repeat(64);
    },
    (value) => {
      value.reviewSha256 = "0".repeat(64);
    },
    (value) => {
      value.priorLabels.latest = "foreign";
    },
    (value) => {
      value.npm.latest = "foreign";
    },
  ]) {
    const copy = structuredClone(record);
    mutate(copy);
    assert.throws(() =>
      verifyNpmContinuation(
        copy,
        journal,
        f.env,
        f.release,
        f.target,
        f.expected,
      ),
    );
  }
});

test("workflow validation rejects privilege recombination, wrong dispatchers and scan omissions", () => {
  const path = ".github/workflows/promote-release.yml";
  const original = readFileSync(path, "utf8");
  for (const change of [
    (value) =>
      value.replace(/^name: .+$/mu, "name: Missing checkpoint subscription"),
    (value) =>
      value.replace(
        "environment: npm-promotion\n    permissions:\n      contents: read",
        "environment: npm-promotion\n    permissions:\n      contents: write",
      ),
    (value) =>
      value.replace(
        "environment: github-release\n    permissions:",
        "environment: github-release\n    permissions:\n      id-token: write",
      ),
    (value) =>
      value.replace(
        "scripts/release-command.js promote-npm",
        "scripts/release-command.js promote-github",
      ),
    (value) => value.replace("if: always()", "if: success()"),
  ]) {
    const changed = change(original);
    assert.notEqual(changed, original);
    assert.throws(() => checkWorkflows({ overrides: { [path]: changed } }));
  }
  const security = ".github/workflows/security.yml";
  assert.throws(() =>
    checkWorkflows({
      overrides: {
        [security]: readFileSync(security, "utf8").replace(
          "key: python",
          "key: duplicated",
        ),
      },
    }),
  );
});
