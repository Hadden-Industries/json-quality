// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  verifyQualifiedTarget,
  qualifiedStageSummaries,
} from "../scripts/qualified-release-contract.js";
import { materializeQualifiedTarget } from "../scripts/qualified-release-checkpoint.js";
import {
  retainedQualifiedTarget,
  restoreOriginalPromotion,
} from "../scripts/archived-release-evidence.js";
import { admitPendingDecisions } from "../scripts/release-decision-state.js";
import { native } from "../scripts/qualification-process.js";
import { verifyOwnerTagSignature } from "../scripts/release-signing.js";

const qualifiedLegacy = JSON.parse(
  readFileSync(
    new URL("./fixtures/release/qualified-1.0.0.json", import.meta.url),
  ),
);
const qualifiedLegacyTarget = {
  version: "1.0.0",
  releaseId: 437217191,
  manifestSha256:
    "e5e3bb460a4c697535a2f2646bbd97b96d7d9bdb1fdfc00454207b51f9570728",
};

test("actual single-origin 1.0.0 public qualification survives provider removal only through complete signed history", (t) => {
  const checked = verifyQualifiedTarget(qualifiedLegacy, qualifiedLegacyTarget);
  assert.equal(checked.context.stage.run, "42321261095");
  assert.equal(checked.context.registry.run, "42322378128");
  assert.equal(qualifiedLegacy.qualification.artifacts.length, 9);
  const root = mkdtempSync(join(tmpdir(), "json-qualified-history-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  materializeQualifiedTarget(qualifiedLegacy, qualifiedLegacyTarget, root);
  const gitRoot = join(root, "public-tag.git");
  native("git", ["init", "--bare", "--quiet", gitRoot]);
  const oid = native(
    "git",
    ["--git-dir", gitRoot, "hash-object", "-w", "-t", "tag", "--stdin"],
    { input: Buffer.from(qualifiedLegacy.tagObject, "base64") },
  ).trim();
  assert.equal(oid, "dc3f8a57038f9dd30dfd15ac64c4977b70806709");
  verifyOwnerTagSignature("v1.0.0", oid, checked.release.source.commit, {
    cwd: gitRoot,
  });
  const body = {
    schemaVersion: 2,
    repository: "Hadden-Industries/json-quality",
    entries: [],
    qualifiedTargets: [qualifiedLegacy],
  };
  let bytes = Buffer.from(JSON.stringify(body)),
    signed = true,
    cryptoChecks = 0;
  const checkpoint = {
    tag: "release-history-fixture",
    tagSha: "c".repeat(40),
    sha256: sha256(bytes),
  };
  const readers = {
    read: (path) =>
      path.includes("git/ref/")
        ? {
            ref: `refs/tags/${checkpoint.tag}`,
            object: { type: "tag", sha: checkpoint.tagSha },
          }
        : {
            sha: checkpoint.tagSha,
            tag: checkpoint.tag,
            object: { type: "commit", sha: "d".repeat(40) },
            verification: {
              verified: signed,
              reason: signed ? "valid" : "unsigned",
            },
          },
    bytes: () => bytes,
    // Native Git cryptography is exercised independently by the real signing-key fixture.
    verifySignature: (tag, oid, commit) => {
      assert.deepEqual(
        [tag, oid, commit],
        [checkpoint.tag, checkpoint.tagSha, "d".repeat(40)],
      );
      cryptoChecks++;
    },
  };
  assert.equal(
    retainedQualifiedTarget(checkpoint, qualifiedLegacyTarget, readers).version,
    "1.0.0",
  );
  assert.equal(cryptoChecks, 1);
  signed = false;
  assert.throws(() =>
    retainedQualifiedTarget(checkpoint, qualifiedLegacyTarget, readers),
  );
  signed = true;
  bytes = Buffer.from(JSON.stringify({ ...body, qualifiedTargets: [] }));
  assert.throws(() =>
    retainedQualifiedTarget(checkpoint, qualifiedLegacyTarget, readers),
  );
  checkpoint.sha256 = sha256(bytes);
  assert.throws(
    () => retainedQualifiedTarget(checkpoint, qualifiedLegacyTarget, readers),
    /Complete signed target public qualification/u,
  );
  for (const mutate of [
    (record) =>
      record.qualification.files.splice(
        record.qualification.files.findIndex(
          (file) => file.name === "public-security.json",
        ),
        1,
      ),
    (record) =>
      record.qualification.files.splice(
        record.qualification.files.findIndex((file) =>
          file.name.endsWith("root-locations.json"),
        ),
        1,
      ),
    (record) =>
      record.qualification.files.splice(
        record.qualification.files.findIndex((file) =>
          file.name.endsWith("root-lock.json"),
        ),
        1,
      ),
    (record) => (record.qualification.artifacts[0].attempt = 2),
    (record) =>
      (record.qualification.artifacts[0].digest = "sha256:" + "0".repeat(64)),
    (record) =>
      (record.qualification.providers[0].provider.jobs.jobs[1].conclusion =
        "skipped"),
    (record) =>
      (record.qualification.files[0].bytes = Buffer.from(
        "substituted snapshot",
      ).toString("base64")),
  ]) {
    const copy = structuredClone(qualifiedLegacy);
    mutate(copy);
    assert.throws(() => verifyQualifiedTarget(copy, qualifiedLegacyTarget));
  }
});

test("a different version cannot hide outstanding approvals and a superseded release needs fresh owner review", () => {
  const journal = Buffer.from(
    '{"state":"intent","package":"@hadden-industries/json-quality-win32-x64","version":"1.1.0","manifestSha256":"' +
      "a".repeat(64) +
      '","run":"17","attempt":"1"}\n',
  );
  const history = [
    { phase: "stage", run: { id: 17, run_attempt: 1 }, journal },
  ];
  const release = { version: "1.2.0" };
  assert.throws(
    () => admitPendingDecisions(history, release, [], null),
    /outstanding native approvals/u,
  );
  const record = {
    phase: "stage",
    disposition: "supersede",
    run: "17",
    attempt: "1",
    journalSha256: sha256(journal),
    reviewSha256: "b".repeat(64),
    acceptedAt: "2026-11-13T00:00:00Z",
  };
  const recovery = {
    entries: [{ record, observed: { state: "superseded-family-reconciled" } }],
  };
  assert.equal(admitPendingDecisions(history, release, [], recovery).size, 0);
  assert.throws(
    () =>
      admitPendingDecisions(history, { version: "1.1.0" }, [], recovery, {
        review: { acceptedAt: "2026-11-12T23:00:00Z" },
        reviewSha256: "b".repeat(64),
      }),
    /fresh owner review/u,
  );
  assert.deepEqual(
    [
      ...admitPendingDecisions(history, { version: "1.1.0" }, [], recovery, {
        review: { acceptedAt: "2026-11-13T01:00:00Z" },
        reviewSha256: "c".repeat(64),
      }),
    ],
    ["17/1"],
  );
});

test("a reconciled original failed stage retains complete qualification after provider expiry", () => {
  const target = structuredClone(qualifiedLegacy);
  const setFile = (name, value) => {
    const bytes = Buffer.from(JSON.stringify(value));
    target.qualification.files = target.qualification.files.filter(
      (file) => file.name !== name,
    );
    target.qualification.files.push({
      name,
      size: bytes.length,
      sha256: sha256(bytes),
      bytes: bytes.toString("base64"),
    });
  };
  const stage = target.qualification.providers.find(
    (item) => item.phase === "stage",
  );
  stage.provider.run.conclusion = "failure";
  stage.provider.jobs.jobs.find((job) => job.name === "stage").conclusion =
    "failure";
  const name = effectJournal("stage", stage.origin);
  const originalJournal = Buffer.from(
    target.qualification.files.find((file) => file.name === name).bytes,
    "base64",
  );
  const lines = originalJournal.toString().trim().split("\n").map(JSON.parse);
  lines[lines.length - 1] = {
    state: "outcome-unknown",
    intentSha256: lines.at(-1).intentSha256,
  };
  const journal = Buffer.from(
    lines.map((line) => JSON.stringify(line)).join("\n") + "\n",
  );
  const journalFile = target.qualification.files.find(
    (file) => file.name === name,
  );
  Object.assign(journalFile, {
    bytes: journal.toString("base64"),
    size: journal.length,
    sha256: sha256(journal),
  });
  const intents = journal
    .toString()
    .trim()
    .split("\n")
    .map(JSON.parse)
    .filter((entry) => entry.state === "intent");
  const decision = {
    schemaVersion: 1,
    owner: "maksymshostak",
    phase: "stage",
    ...stage.origin,
    version: target.version,
    manifestSha256: target.manifestSha256,
    journalSha256: sha256(journal),
    stages: intents.map((intent, index) => ({
      package: intent.package,
      stageId: `retained-stage-${index}`,
    })),
  };
  setFile("recovery-records.json", [decision]);
  setFile("recovery-observations.json", [
    {
      record: decision,
      observed: {
        stages: intents.map((intent, index) => ({
          package: intent.package,
          version: target.version,
          integrity: intent.integrity,
          stageId: `retained-stage-${index}`,
        })),
      },
    },
  ]);
  verifyQualifiedTarget(target, qualifiedLegacyTarget);
  const bytes = Buffer.from(
    JSON.stringify({
      schemaVersion: 2,
      repository,
      entries: [],
      qualifiedTargets: [target],
    }),
  );
  const checkpoint = {
    tag: "release-history-failed-stage",
    tagSha: "c".repeat(40),
    sha256: sha256(bytes),
  };
  const restored = retainedQualifiedTarget(checkpoint, qualifiedLegacyTarget, {
    read: (path) =>
      path.includes("git/ref/")
        ? {
            ref: `refs/tags/${checkpoint.tag}`,
            object: { type: "tag", sha: checkpoint.tagSha },
          }
        : {
            sha: checkpoint.tagSha,
            tag: checkpoint.tag,
            object: { type: "commit", sha: "d".repeat(40) },
            verification: { verified: true, reason: "valid" },
          },
    bytes: () => bytes,
    verifySignature: () => {},
  });
  assert.equal(restored.version, "1.0.0");
  const summaries = qualifiedStageSummaries(target);
  setFile("stage-19-1.jsonl", { state: "foreign retained writer" });
  assert.deepEqual(
    qualifiedStageSummaries(target),
    summaries,
    "Carried historical journals must not acquire settlement scope",
  );
  assert.equal(
    admitPendingDecisions(
      [{ ...stage.provider, phase: "stage", journal }],
      { version: "1.1.0" },
      [],
      null,
      {
        settledStages: summaries,
        resolveTarget: () => {
          throw new Error("An unrelated target shard must not be fetched");
        },
      },
    ).size,
    0,
  );
  assert.equal(
    admitPendingDecisions(
      [{ ...stage.provider, phase: "stage", journal }],
      { version: "1.1.0" },
      [target],
      null,
    ).size,
    0,
  );
  target.qualification.files = target.qualification.files.filter(
    (file) => file.name !== "recovery-observations.json",
  );
  assert.throws(
    () => verifyQualifiedTarget(target, qualifiedLegacyTarget),
    /retained native settlement/,
  );
});

test("signed original promotion custody restores exact operation and journal while keeping archive origin independent", (t) => {
  const root = mkdtempSync(join(tmpdir(), "json-original-operation-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const bytes = Buffer.from(
      // eslint-disable-next-line json-quality/no-json-stringify-identity -- Exact original operation bytes are the signed digest subject.
      JSON.stringify({
        manifestSha256: "a".repeat(64),
        family: { operation: "promote" },
      }),
    ),
    journal = Buffer.from('{"state":"intent"}\n');
  const original = {
    phase: "promote",
    service: "npm",
    run: "17",
    attempt: "1",
    operationId: sha256(bytes),
    journalSha256: sha256(journal),
    manifestSha256: "a".repeat(64),
  };
  const history = {
    entries: [
      {
        ...original,
        journal: journal.toString("base64"),
        operationEvidence: {
          "availability-operation.json": bytes.toString("base64"),
        },
      },
    ],
  };
  restoreOriginalPromotion(root, history, original);
  assert.deepEqual(
    readFileSync(join(root, "availability-operation.json")),
    bytes,
  );
  assert.deepEqual(readFileSync(join(root, "promote-npm-17-1.jsonl")), journal);
  assert.throws(() =>
    restoreOriginalPromotion(root, history, {
      ...original,
      operationId: "0".repeat(64),
    }),
  );
});
import {
  effectJournal,
  repository,
  sha256,
  workflows,
} from "../scripts/release-contract.js";
import {
  readEffectHistory,
  verifyEffectHistory,
  readHistoryRecord,
  readHistoryTarget,
  authenticatedHistoricalSettlements,
} from "../scripts/release-provider.js";

test("signed history resolves one bounded target file lazily from its exact signed commit", () => {
  const targetBytes = Buffer.from(JSON.stringify(qualifiedLegacy)),
    refs = Array.from({ length: 6 }, (_, index) => ({
      version: index ? `1.0.${index}` : "1.0.0",
      manifestSha256: index
        ? String(index).repeat(64)
        : qualifiedLegacyTarget.manifestSha256,
      releaseId: index ? 437217191 + index : 437217191,
      size: targetBytes.length,
      sha256: sha256(targetBytes),
    }));
  assert.ok(refs.reduce((total, ref) => total + ref.size, 0) > 20000000);
  let indexBytes = Buffer.from(
    JSON.stringify({
      schemaVersion: 2,
      repository,
      entries: [],
      qualifiedTargetRefs: refs,
    }),
  );
  const checkpoint = {
      tag: "release-history-shards",
      tagSha: "c".repeat(40),
      sha256: sha256(indexBytes),
    },
    calls = [];
  let payload = targetBytes;
  const read = (path) =>
    path.includes("git/ref/")
      ? {
          ref: `refs/tags/${checkpoint.tag}`,
          object: { type: "tag", sha: checkpoint.tagSha },
        }
      : {
          sha: checkpoint.tagSha,
          tag: checkpoint.tag,
          object: { type: "commit", sha: "d".repeat(40) },
          verification: { verified: true, reason: "valid" },
        };
  const bytes = (path) => {
    calls.push(path);
    return path.startsWith("contents/release-history.json?")
      ? indexBytes
      : payload;
  };
  const history = readHistoryRecord(checkpoint, read, bytes, () => {});
  assert.equal(calls.length, 1);
  assert.ok(indexBytes.length < 4000);
  const target = readHistoryTarget(history, qualifiedLegacyTarget);
  verifyQualifiedTarget(target, qualifiedLegacyTarget);
  assert.equal(calls.length, 2);
  assert.equal(
    calls[1],
    `contents/release-targets/${qualifiedLegacyTarget.manifestSha256}.json?ref=${"d".repeat(40)}`,
  );
  payload = Buffer.from("substituted");
  assert.throws(() => readHistoryTarget(history, qualifiedLegacyTarget));
  payload = targetBytes;
  assert.throws(() =>
    readHistoryTarget(history, { ...qualifiedLegacyTarget, releaseId: 99 }),
  );
  history.qualifiedTargetRefs[0].sha256 = "0".repeat(64);
  assert.throws(
    () => readHistoryTarget(history, qualifiedLegacyTarget),
    /index changed/,
  );
  refs[0].path = "../../untrusted.json";
  indexBytes = Buffer.from(
    JSON.stringify({
      schemaVersion: 2,
      repository,
      entries: [],
      qualifiedTargetRefs: refs,
    }),
  );
  checkpoint.sha256 = sha256(indexBytes);
  assert.throws(
    () => readHistoryRecord(checkpoint, read, bytes, () => {}),
    /paths are derived/,
  );
});

test("authenticated supersession survives the next native stage graph and fresh dispatch", () => {
  const staged = inventory("stage", 1),
    native = {
      ...staged.jobs.jobs[0],
      id: 999,
      name: "native-public",
      conclusion: "skipped",
    };
  staged.jobs.jobs.push(native);
  staged.jobs.total_count++;
  const journal = Buffer.from(
    JSON.stringify({
      state: "intent",
      package: subject.package,
      version: "1.1.0",
      manifestSha256: "a".repeat(64),
      run: "16",
      attempt: "1",
    }) + "\n",
  );
  const record = {
    schemaVersion: 1,
    owner: "maksymshostak",
    phase: "stage",
    disposition: "supersede",
    version: "1.1.0",
    manifestSha256: "a".repeat(64),
    run: "16",
    attempt: "1",
    journalSha256: sha256(journal),
    reviewSha256: "b".repeat(64),
    acceptedAt: "2026-11-13T00:00:00Z",
    rationale: "Supersede the exact reconciled original stages.",
  };
  const settlements = authenticatedHistoricalSettlements([
    { ...staged, phase: "stage", settlements: [record] },
  ]);
  native.name =
    "inputs.stage_phase == 'core' && format('native-public ({0})', matrix.os) || 'native-public'";
  assert.deepEqual(
    authenticatedHistoricalSettlements([
      { ...staged, phase: "stage", settlements: [record] },
    ]),
    settlements,
  );
  native.conclusion = "success";
  assert.throws(() =>
    authenticatedHistoricalSettlements([
      { ...staged, phase: "stage", settlements: [record] },
    ]),
  );
  native.conclusion = "skipped";
  native.name += " ";
  assert.throws(() =>
    authenticatedHistoricalSettlements([
      { ...staged, phase: "stage", settlements: [record] },
    ]),
  );
  assert.equal(settlements[0].observed.state, "superseded-family-reconciled");
  assert.equal(
    admitPendingDecisions(
      [{ phase: "stage", run: { id: 16, run_attempt: 1 }, journal }],
      { version: "1.2.0" },
      [],
      { entries: settlements },
    ).size,
    0,
  );
});

const source = "a".repeat(40);
const effect = "Apply admitted release effect";
const subject = {
  package: "@hadden-industries/json-quality",
  version: "1.0.0",
};
const current = { GITHUB_RUN_ID: "20", GITHUB_RUN_ATTEMPT: "1" };
function inventory(
  phase,
  attempt,
  { write = "success", origin = attempt } = {},
) {
  const run = {
    id: 17,
    run_attempt: attempt,
    repository: { full_name: repository },
    path: `.github/workflows/${workflows[phase]}`,
    event: "workflow_dispatch",
    head_branch: "main",
    head_sha: source,
    status: "completed",
    conclusion: write === "success" ? "success" : "failure",
  };
  const names =
    phase === "promote"
      ? ["admit", "npm", "github", "complete"]
      : ["admit", phase];
  const jobs = names.map((name, index) => {
    const writer = name === phase || ["npm", "github"].includes(name);
    return {
      id: attempt * 100 + index + 1,
      name,
      run_id: run.id,
      run_attempt: attempt,
      head_sha: source,
      runner_id: origin * 10 + index + 1,
      started_at: `2026-11-01T00:0${origin}:00Z`,
      completed_at: `2026-11-01T00:0${origin}:30Z`,
      status: "completed",
      conclusion: writer
        ? write === "skipped"
          ? "failure"
          : write
        : "success",
      steps: writer
        ? [
            {
              name: effect,
              status: "completed",
              conclusion: write,
              ...(write === "skipped"
                ? {}
                : {
                    started_at: `2026-11-01T00:0${origin}:10Z`,
                    completed_at: `2026-11-01T00:0${origin}:20Z`,
                  }),
            },
          ]
        : [],
    };
  });
  return { run, jobs: { total_count: jobs.length, jobs } };
}
function setup(t, phase, attempts, { unknown = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), "json-writer-history-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const downloads = [];
  const services = phase === "promote" ? ["npm", "github"] : [null];
  const names = services.map(
    (service) => `effect-${phase}${service ? `-${service}` : ""}-2`,
  );
  const readers = {
    pages: (path) =>
      path.includes("/artifacts?")
        ? names.map((name) => ({
            name,
            digest: "sha256:original",
            expired: false,
          }))
        : path.includes(workflows[phase])
          ? [{ id: 17, run_attempt: attempts.length }]
          : [],
    provider: (_run, attempt) => structuredClone(attempts[attempt - 1]),
    download: (run, attempt, name) => {
      downloads.push(name);
      const service = phase === "promote" ? name.split("-")[2] : null;
      const intent = {
        state: "intent",
        ...subject,
        operation:
          phase === "stage"
            ? "stage"
            : service
              ? `${service}-latest`
              : "archive",
        run: String(run),
        attempt: String(attempt),
        controller: source,
        ...(service ? { schemaVersion: 2, service } : {}),
      };
      // Native journals retain their original bytes and producing attempt.
      const line = JSON.stringify(intent) + "\n";
      const journal = effectJournal(phase, { run, attempt, service });
      writeFileSync(
        join(root, journal),
        line +
          JSON.stringify({
            state: unknown ? "outcome-unknown" : "completed",
            intentSha256: sha256(Buffer.from(line)),
          }) +
          "\n",
      );
      return { directory: root };
    },
  };
  return { root, readers, downloads };
}

function scopedHistory(t, phase, version = "0.9.0") {
  const observed = inventory(phase, 1, { write: "failure" });
  const f = setup(t, phase, [observed]);
  const services = phase === "promote" ? ["npm", "github"] : [null];
  const records = services.map((service) => {
    const intent = {
      state: "intent",
      package: subject.package,
      version,
      source: "b".repeat(40),
      manifestSha256: "c".repeat(64),
      integrity: "sha512-Ynl0ZXM=",
      operation: service ? `${service}-latest` : phase,
      run: "17",
      attempt: "1",
      controller: source,
      ...(service ? { schemaVersion: 2, service } : {}),
    };
    const line = JSON.stringify(intent) + "\n";
    const journal = Buffer.from(
      line +
        JSON.stringify({
          state: "outcome-unknown",
          intentSha256: sha256(Buffer.from(line)),
        }) +
        "\n",
    );
    return {
      phase,
      ...(service ? { service } : {}),
      run: "17",
      attempt: "1",
      controller: source,
      provider: structuredClone(observed),
      journal: journal.toString("base64"),
    };
  });
  const checkpoint = { tag: "release-history-fixture" };
  f.readers.checkpoint = () => records;
  f.readers.pages = (path) =>
    path.includes("/artifacts?")
      ? []
      : path.includes(workflows[phase])
        ? [{ id: 17, run_attempt: 1 }]
        : [];
  return { ...f, records, checkpoint, observed };
}

for (const phase of ["stage", "archive"])
  test(`${phase}: authenticated other-version history needs no expired full artifact or outcome reconciliation`, (t) => {
    const f = scopedHistory(t, phase);
    const pages = f.readers.pages;
    f.readers.pages = (path) => {
      assert.ok(!path.includes("/artifacts?"), "Unrelated artifact lookup");
      return pages(path);
    };
    const history = readEffectHistory(
      current,
      f.root,
      f.checkpoint,
      f.readers,
      subject,
    );
    assert.equal(history.length, 1);
    assert.deepEqual(
      history[0].journal,
      Buffer.from(f.records[0].journal, "base64"),
      "Retain original unknown evidence verbatim",
    );
    assert.deepEqual(
      verifyEffectHistory(history, { run: "20", attempt: "1" }, subject),
      [],
    );
    assert.deepEqual(f.downloads, []);
  });

function readScoped(f) {
  return readEffectHistory(current, f.root, f.checkpoint, f.readers, subject);
}

function reviseIntent(record, change) {
  const lines = Buffer.from(record.journal, "base64")
    .toString("utf8")
    .trim()
    .split("\n")
    .map(JSON.parse);
  change(lines[0]);
  lines[1].intentSha256 = sha256(Buffer.from(JSON.stringify(lines[0]) + "\n"));
  record.journal = Buffer.from(
    lines.map((line) => JSON.stringify(line)).join("\n") + "\n",
  ).toString("base64");
}

test("matching versions retain unknown-outcome refusal and completed staging evidence", (t) => {
  const f = scopedHistory(t, "stage", subject.version);
  assert.throws(
    () =>
      verifyEffectHistory(readScoped(f), { run: "20", attempt: "1" }, subject),
    /Unknown prior effect outcome/u,
  );
  const records = Buffer.from(f.records[0].journal, "base64")
    .toString("utf8")
    .trim()
    .split("\n")
    .map(JSON.parse);
  records[1].state = "completed";
  f.records[0].journal = Buffer.from(
    records.map((line) => JSON.stringify(line)).join("\n") + "\n",
  ).toString("base64");
  const evidence = verifyEffectHistory(
    readScoped(f),
    { run: "20", attempt: "1" },
    subject,
  );
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].intent.operation, "stage");
});

test("unclassifiable legacy history cannot inherit a different-version scalar claim", (t) => {
  for (const mutate of [
    (record) => {
      delete record.provider;
    },
    (record) =>
      reviseIntent(record, (intent) => {
        delete intent.source;
      }),
    (record) =>
      reviseIntent(record, (intent) => {
        delete intent.version;
      }),
  ]) {
    const f = scopedHistory(t, "stage");
    mutate(f.records[0]);
    f.records[0].subject = { version: "0.8.0" };
    assert.throws(
      () =>
        verifyEffectHistory(
          readScoped(f),
          { run: "20", attempt: "1" },
          subject,
        ),
      /Unknown prior effect outcome/u,
    );
  }
});

test("different-version promotion uncertainty still guards shared latest labels", (t) => {
  const f = scopedHistory(t, "promote");
  const history = readScoped(f);
  assert.equal(history.length, 2);
  assert.throws(
    () => verifyEffectHistory(history, { run: "20", attempt: "1" }, subject),
    /Unknown prior effect outcome/u,
  );
});

test("scoping preserves successful continuation settlements needed by shared-label history", (t) => {
  const promotion = scopedHistory(t, "promote");
  const stage = scopedHistory(t, "stage");
  const record = stage.records[0];
  stage.observed.run.id = record.provider.run.id = 18;
  stage.observed.run.conclusion = record.provider.run.conclusion = "success";
  for (const provider of [stage.observed, record.provider]) {
    for (const job of provider.jobs.jobs) job.run_id = 18;
    provider.jobs.jobs[1].conclusion = "success";
    provider.jobs.jobs[1].steps[0].conclusion = "success";
  }
  record.run = "18";
  reviseIntent(record, (intent) => {
    intent.run = "18";
  });
  const lines = Buffer.from(record.journal, "base64")
    .toString("utf8")
    .trim()
    .split("\n")
    .map(JSON.parse);
  lines[1].state = "completed";
  record.journal = Buffer.from(
    lines.map((line) => JSON.stringify(line)).join("\n") + "\n",
  ).toString("base64");
  record.settlements = promotion.records.map((prior) => ({
    schemaVersion: 1,
    owner: "maksymshostak",
    phase: "promote",
    service: prior.service,
    run: prior.run,
    attempt: prior.attempt,
    version: "0.9.0",
    manifestSha256: "c".repeat(64),
    journalSha256: sha256(Buffer.from(prior.journal, "base64")),
  }));
  stage.readers.pages = (path) =>
    path.includes(workflows.stage) ? [{ id: 18, run_attempt: 1 }] : [];
  const history = [...readScoped(promotion), ...readScoped(stage)];
  assert.deepEqual(
    verifyEffectHistory(history, { run: "20", attempt: "1" }, subject),
    [],
  );
});

test("native artifact subjects can classify another version without a checkpoint lookup", (t) => {
  const f = scopedHistory(t, "stage");
  f.readers.pages = (path) =>
    path.includes("/artifacts?")
      ? [
          {
            name: "effect-stage-1",
            digest: "sha256:" + "d".repeat(64),
            expired: false,
          },
        ]
      : path.includes(workflows.stage)
        ? [{ id: 17, run_attempt: 1 }]
        : [];
  f.readers.download = (run, attempt, name) => {
    f.downloads.push(name);
    writeFileSync(
      join(f.root, effectJournal("stage", { run, attempt })),
      Buffer.from(f.records[0].journal, "base64"),
    );
    return { directory: f.root };
  };
  const history = readEffectHistory(
    current,
    f.root,
    undefined,
    f.readers,
    subject,
  );
  assert.deepEqual(f.downloads, ["effect-stage-1"]);
  assert.deepEqual(
    verifyEffectHistory(history, { run: "20", attempt: "1" }, subject),
    [],
  );
});

test("a complete flushed other-version intent needs no invented outcome or retry receipt", (t) => {
  const f = scopedHistory(t, "stage");
  const intent =
    Buffer.from(f.records[0].journal, "base64")
      .toString("utf8")
      .split("\n")[0] + "\n";
  f.records[0].journal = Buffer.from(intent).toString("base64");
  const history = readScoped(f);
  for (let retry = 0; retry < 2; retry++)
    assert.deepEqual(
      verifyEffectHistory(history, { run: "20", attempt: "1" }, subject),
      [],
    );
  assert.equal(history[0].journal.toString("utf8"), intent);
  assert.equal(f.records[0].journal, Buffer.from(intent).toString("base64"));
  assert.throws(
    () =>
      verifyEffectHistory(
        history,
        { run: "20", attempt: "1" },
        { ...subject, version: "0.9.0" },
      ),
    /Unknown\/incomplete prior effect/u,
  );
});

test("retained version subjects reject changed controllers attempts executions and steps", (t) => {
  for (const mutate of [
    (record) => {
      record.controller = "f".repeat(40);
    },
    (record) => {
      record.provider.run.run_attempt++;
    },
    (record) => {
      record.provider.run.head_sha = "f".repeat(40);
    },
    (record) => {
      record.provider.run.repository.full_name = "other/repository";
    },
    (record) => {
      record.provider.jobs.total_count++;
    },
    (record) => {
      record.provider.jobs.jobs[1].runner_id++;
    },
    (record) => {
      record.provider.jobs.jobs[1].steps[0].conclusion = "success";
    },
  ]) {
    const f = scopedHistory(t, "stage");
    mutate(f.records[0]);
    assert.throws(() => readScoped(f));
    assert.deepEqual(f.downloads, []);
  }
});

test("malformed contradictory and unknown-package journals cannot classify another version", (t) => {
  for (const mutate of [
    (record) => {
      record.journal = Buffer.from('{"state":').toString("base64");
    },
    (record) => {
      const bytes = Buffer.from(record.journal, "base64");
      const position = bytes.indexOf(Buffer.from("outcome-unknown"));
      bytes[position] = 0xff;
      record.journal = bytes.toString("base64");
    },
    (record) =>
      reviseIntent(record, (intent) => {
        intent.version = "v0.9.0";
      }),
    (record) =>
      reviseIntent(record, (intent) => {
        intent.package = "@other/package";
      }),
    (record) =>
      reviseIntent(record, (intent) => {
        intent.controller = "f".repeat(40);
      }),
    (record) =>
      reviseIntent(record, (intent) => {
        intent.manifestSha256 = "invalid";
      }),
    (record) => {
      record.journal += "not-base64";
    },
    (record) => {
      record.noEffect = { state: "no-request" };
    },
  ]) {
    const f = scopedHistory(t, "stage");
    mutate(f.records[0]);
    assert.throws(() => readScoped(f));
  }
  const f = scopedHistory(t, "stage");
  const second = structuredClone(f.records[0]);
  reviseIntent(second, (intent) => {
    intent.version = "0.8.0";
  });
  f.records[0].journal = Buffer.concat([
    Buffer.from(f.records[0].journal, "base64"),
    Buffer.from(second.journal, "base64"),
  ]).toString("base64");
  assert.throws(
    () => readScoped(f),
    /Conflicting historical version subjects/u,
  );
});

test("collected version proofs reject mutation copying and current-attempt substitution", (t) => {
  for (const mutate of [
    (entry) => {
      entry.journal = Buffer.concat([entry.journal, Buffer.from(" ")]);
    },
    (entry) => {
      entry.jobs.jobs[1].runner_id++;
    },
    (entry) => {
      entry.noEffect = { state: "no-request" };
    },
    (entry) => {
      entry.phase = "promote";
    },
  ]) {
    const f = scopedHistory(t, "stage");
    const history = readScoped(f);
    mutate(history[0]);
    assert.throws(() =>
      verifyEffectHistory(history, { run: "20", attempt: "1" }, subject),
    );
  }
  const f = scopedHistory(t, "stage");
  const history = readScoped(f);
  assert.throws(
    () => verifyEffectHistory(history, { run: "17", attempt: "1" }, subject),
    /Current attempt included/u,
  );
  const copied = history.map((entry) => ({
    ...entry,
    subject: { version: "0.8.0" },
  }));
  assert.throws(
    () => verifyEffectHistory(copied, { run: "20", attempt: "1" }, subject),
    /Unknown prior effect outcome/u,
  );
});

test("live other-version writers remain globally blocked before artifact acquisition", (t) => {
  const f = scopedHistory(t, "stage");
  f.observed.run.status = "in_progress";
  assert.throws(() => readScoped(f), /Another live release producer exists/u);
  assert.deepEqual(f.downloads, []);
});

test("signed history scopes completely expired providers while retaining every original byte", (t) => {
  const f = scopedHistory(t, "archive");
  f.readers.pages = () => [];
  f.readers.provider = () => {
    throw new Error("Original provider has expired");
  };
  const history = readScoped(f);
  assert.equal(history.length, 1);
  assert.deepEqual(
    verifyEffectHistory(history, { run: "20", attempt: "1" }, subject),
    [],
  );
  assert.equal(history[0].journal.toString("base64"), f.records[0].journal);
});

test("unscoped history export preserves even malformed unknown evidence verbatim", (t) => {
  const f = scopedHistory(t, "stage");
  const bytes = Buffer.from('{"state":"intent",');
  f.records[0].journal = bytes.toString("base64");
  const history = readEffectHistory(current, f.root, f.checkpoint, f.readers);
  assert.deepEqual(history[0].journal, bytes);
});

for (const phase of ["stage", "archive", "promote"]) {
  test(`${phase}: a later first write retains its origin through a partial rerun`, (t) => {
    const attempts = [
      inventory(phase, 1, { write: "skipped" }),
      inventory(phase, 2),
      inventory(phase, 3, { origin: 2 }),
    ];
    const f = setup(t, phase, attempts);
    const history = readEffectHistory(current, f.root, undefined, f.readers);
    const writes = history.filter((entry) => entry.journal);
    assert.deepEqual(
      writes.map((entry) => entry.run.run_attempt),
      phase === "promote" ? [2, 2] : [2],
    );
    assert.ok(f.downloads.every((name) => name.endsWith("-2")));
    const evidence = verifyEffectHistory(
      history,
      { run: "20", attempt: "1" },
      subject,
    );
    assert.equal(evidence.length, phase === "promote" ? 2 : 1);
    assert.ok(evidence.every((entry) => entry.intent.attempt === "2"));
  });

  test(`${phase}: retained unknown writes remain blocked at the original attempt`, (t) => {
    const attempts = [
      inventory(phase, 1, { write: "skipped" }),
      inventory(phase, 2),
      inventory(phase, 3, { origin: 2 }),
    ];
    const f = setup(t, phase, attempts, { unknown: true });
    const history = readEffectHistory(current, f.root, undefined, f.readers);
    assert.throws(
      () => verifyEffectHistory(history, { run: "20", attempt: "1" }, subject),
      /Unknown prior effect outcome/,
    );
    assert.ok(f.downloads.every((name) => name.endsWith("-2")));
  });

  test(`${phase}: skipped pre-write failures permit a later first execution`, (t) => {
    const f = setup(t, phase, [
      inventory(phase, 1, { write: "skipped" }),
      inventory(phase, 2, { write: "skipped" }),
    ]);
    const history = readEffectHistory(current, f.root, undefined, f.readers);
    assert.deepEqual(
      verifyEffectHistory(history, { run: "20", attempt: "1" }, subject),
      [],
    );
    assert.deepEqual(f.downloads, []);
  });

  test(`${phase}: an off-main dispatch with skipped writers cannot poison later main releases`, (t) => {
    const observed = inventory(phase, 1, { write: "skipped" });
    observed.run.head_branch = "test-release";
    for (const job of observed.jobs.jobs) {
      job.conclusion = "skipped";
      job.steps = [];
    }
    const f = setup(t, phase, [observed]);
    const history = readEffectHistory(current, f.root, undefined, f.readers);
    assert.deepEqual(
      verifyEffectHistory(history, { run: "20", attempt: "1" }, subject),
      [],
    );
    assert.deepEqual(f.downloads, []);
  });

  test(`${phase}: an off-main possible write remains blocked before evidence download`, (t) => {
    const observed = inventory(phase, 1);
    observed.run.head_branch = "test-release";
    const f = setup(t, phase, [observed]);
    assert.throws(
      () => readEffectHistory(current, f.root, undefined, f.readers),
      /main/,
    );
    assert.deepEqual(f.downloads, []);
  });

  test(`${phase}: a retained startup failure preserves its original no-request marker`, (t) => {
    const attempts = [
      inventory(phase, 1, { write: "skipped" }),
      inventory(phase, 2, { write: "failure" }),
      inventory(phase, 3, { write: "failure", origin: 2 }),
    ];
    const f = setup(t, phase, attempts);
    f.readers.download = (run, attempt, name) => {
      f.downloads.push(name);
      const service = phase === "promote" ? name.split("-")[2] : null;
      const marker = {
        schemaVersion: 1,
        state: "no-request",
        phase,
        run: String(run),
        attempt: String(attempt),
        controller: source,
        ...(service ? { service } : {}),
      };
      writeFileSync(
        join(
          f.root,
          `no-effect-${phase}${service ? `-${service}` : ""}-${run}-${attempt}.json`,
        ),
        JSON.stringify(marker),
      );
      return { directory: f.root };
    };
    const history = readEffectHistory(current, f.root, undefined, f.readers);
    assert.deepEqual(
      verifyEffectHistory(history, { run: "20", attempt: "1" }, subject),
      [],
    );
    assert.ok(
      history
        .filter((entry) => entry.noEffect)
        .every((entry) => entry.noEffect.attempt === "2"),
    );
    assert.equal(f.downloads.length, phase === "promote" ? 2 : 1);
  });

  test(`${phase}: incomplete or ambiguous native write observations never establish absence`, (t) => {
    for (const mutate of [
      (observed) => {
        observed.jobs.jobs[1].steps = [];
      },
      (observed) => {
        delete observed.jobs.jobs[1].steps;
      },
      (observed) => {
        delete observed.jobs.jobs[1].steps[0].started_at;
      },
      (observed) => {
        observed.jobs.jobs[1].steps.push({ ...observed.jobs.jobs[1].steps[0] });
      },
      (observed) => {
        observed.jobs.jobs[1].steps[0].status = "in_progress";
      },
      (observed) => {
        observed.jobs.total_count++;
      },
      (observed) => {
        observed.jobs.jobs[1].head_sha = "b".repeat(40);
      },
      (observed) => {
        observed.jobs.jobs[1].name = "admit";
      },
      (observed) => {
        observed.jobs.jobs[1].conclusion = "skipped";
      },
    ]) {
      const observed = inventory(phase, 1);
      mutate(observed);
      const f = setup(t, phase, [observed]);
      assert.throws(() =>
        readEffectHistory(current, f.root, undefined, f.readers),
      );
    }
  });

  test(`${phase}: relabelled retained writes must preserve the original step observation`, (t) => {
    const attempts = [
      inventory(phase, 1, { write: "skipped" }),
      inventory(phase, 2),
      inventory(phase, 3, { origin: 2 }),
    ];
    attempts[2].jobs.jobs[1].steps[0].conclusion = "failure";
    const f = setup(t, phase, attempts);
    assert.throws(
      () => readEffectHistory(current, f.root, undefined, f.readers),
      /Retained.*changed/,
    );
  });
}
