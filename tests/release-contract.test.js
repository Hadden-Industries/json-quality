// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  linkSync,
  truncateSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { native, budgets } from "../scripts/qualification-process.js";
import {
  archiveInventory,
  isPrerelease,
  manualControl,
  packageName,
  repository,
  safeMember,
  sha256,
  sha512,
  validVersion,
  effectJournal,
  jsonBytes,
  retainedRecoveries,
  verifyArchive,
  verifyDecision,
  verifyManifest,
  verifyProvenance,
  verifyRun,
  verifyShippedLinks,
  releaseArtifactBytes,
} from "../scripts/release-contract.js";
import {
  journalEffect,
  promotionPlan,
  verifyDraftAssets,
  verifyStageResponse,
  findDraft,
  verifyArchiveSettings,
  verifyCompletedLabels,
  verifyGithubPromotionState,
} from "../scripts/release-effects.js";
import {
  verifyEffectHistory,
  verifyEnvironment,
  verifyTag,
  readEffectHistory,
  readHistoryCheckpoint,
  sealBundle,
  evidenceIndex,
  download,
} from "../scripts/release-provider.js";
import { verifyCodeql, verifySarif } from "../scripts/release-security.js";
import {
  verifyAudit,
  isolatedNpmEnvironment,
  normalizeFileReferences,
  verifySbom,
} from "../scripts/release-inventory.js";
import {
  verifyRecoveryRecord,
  reconcilePromotionLabels,
  retainRecovery,
  reconcileObserved,
} from "../scripts/release-recovery.js";
import {
  verifyPublicMetadata,
  registryBytes,
} from "../scripts/qualify-registry.js";
import {
  verifyReport,
  acquireRecoveryJournal,
  admitRestoration,
  verifyBundle,
} from "../scripts/release-evidence.js";
import { PACKAGE_VERIFICATION_CAPABILITIES } from "../src/package-payload.js";

const source = "a".repeat(40),
  sha = "b".repeat(64);
const bytes = Buffer.from("independent tarball bytes");
const policy = JSON.parse(
  readFileSync(new URL("../assets/node-support.json", import.meta.url)),
);
const requiredFiles = [
  "package.json",
  "LICENSE",
  "THIRD-PARTY-NOTICES.md",
  "README.md",
  "src/index.js",
  "src/cli.js",
  "schemas/configuration.schema.json",
  "schemas/event.schema.json",
  "schemas/source-contract.schema.json",
  "schemas/contract-cohort.json",
];
const fixture = () => ({
  schemaVersion: 1,
  package: packageName,
  version: "0.1.0-dev.0",
  source: {
    commit: source,
    tree: "c".repeat(40),
    lockSha256: sha,
    clean: true,
  },
  archive: {
    filename: "candidate.tgz",
    size: bytes.length,
    sha256: sha256(bytes),
    integrity: sha512(bytes),
    files: requiredFiles.map((path) => ({ path, size: 1, sha256: sha })),
  },
  matrix: {
    os: ["ubuntu-24.04", "windows-2025"],
    node: [...new Set([...policy.minimums, policy.reference])],
  },
  policy: structuredClone(policy),
  policySha256: sha,
  toolchain: { node: policy.reference, npm: policy.producerNpm.version },
});
const environment = (phase = "stage") => ({
  GITHUB_REPOSITORY: repository,
  GITHUB_ACTOR: "MaksymShostak",
  GITHUB_EVENT_NAME: "workflow_dispatch",
  GITHUB_REF: "refs/heads/main",
  GITHUB_WORKFLOW_REF: `${repository}/.github/workflows/${phase === "stage" ? "stage-release.yml" : "promote-release.yml"}@refs/heads/main`,
  GITHUB_SHA: source,
  GITHUB_RUN_ID: "17",
  GITHUB_RUN_ATTEMPT: "2",
  MANIFEST_SHA: sha,
});
function temp(t) {
  const path = mkdtempSync(join(tmpdir(), "json-release-test-"));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  return path;
}

test("release evidence admits bounded native archives above the metadata limit", (t) => {
  const directory = temp(t),
    archive = join(directory, "candidate.tgz");
  writeFileSync(archive, "");
  truncateSync(archive, 20000001);
  const [entry] = evidenceIndex(directory);
  assert.equal(entry.name, "candidate.tgz");
  assert.equal(entry.size, 20000001);
  const release = fixture();
  release.archive.size = entry.size;
  release.archive.files[0].size = 37416808;
  verifyManifest(release);
  const metadata = join(directory, "unexpected.json");
  writeFileSync(metadata, "");
  truncateSync(metadata, entry.size);
  assert.throws(() => evidenceIndex(directory), /oversized evidence/u);
  truncateSync(
    archive,
    PACKAGE_VERIFICATION_CAPABILITIES.maximumArchiveBytes + 1,
  );
  assert.throws(() => releaseArtifactBytes(archive), /oversized evidence/u);
  release.archive.size =
    PACKAGE_VERIFICATION_CAPABILITIES.maximumArchiveBytes + 1;
  assert.throws(() => verifyManifest(release), /package transport capability/u);
  release.archive.size = entry.size;
  release.archive.files[0].size =
    PACKAGE_VERIFICATION_CAPABILITIES.maximumMemberBytes + 1;
  assert.throws(() => verifyManifest(release), /member exceeds/u);
  release.archive.files = Array.from({ length: 5 }, (_, index) => ({
    path: `large-${index}`,
    size: PACKAGE_VERIFICATION_CAPABILITIES.maximumMemberBytes,
    sha256: sha,
  }));
  assert.throws(() => verifyManifest(release), /expanded bytes exceed/u);
});

test("native SemVer permits intentional zero-major and prerelease identities without accepting ranges", () => {
  for (const version of ["0.1.0", "0.0.1", "1.2.3-alpha.1"])
    assert.equal(validVersion(version), version);
  for (const version of [
    "v1.2.3",
    "1.2.3+build.2",
    "01.2.3",
    "1.2",
    "latest",
    "^1.2.3",
    "1.2.3-01",
    null,
  ])
    assert.throws(() => validVersion(version));
  assert.equal(isPrerelease("0.1.0"), false);
  assert.equal(isPrerelease("0.1.0-rc.1"), true);
});
test("schema and semantic identities independently reject substitutions and unsafe shipment", () => {
  verifyManifest(fixture());
  verifyArchive(bytes, fixture().archive);
  const changes = [
    (r) => (r.package = "@other/tool"),
    (r) => (r.source.clean = false),
    (r) => r.archive.files.pop(),
    (r) =>
      r.archive.files.push({ ...r.archive.files[0], path: "PACKAGE.JSON" }),
    (r) => (r.archive.files[0].path = "../escape"),
    (r) => r.matrix.node.splice(0, 1),
    (r) => (r.toolchain.npm = "0.0.1"),
    (r) => (r.extra = true),
  ];
  for (const change of changes) {
    const release = fixture();
    change(release);
    assert.throws(() => verifyManifest(release));
  }
  assert.throws(() =>
    verifyArchive(Buffer.from("different"), fixture().archive),
  );
  assert.throws(() =>
    verifyArchive(bytes, {
      ...fixture().archive,
      integrity: sha512(Buffer.from("other")),
    }),
  );
  for (const path of [
    "../bad",
    "/absolute",
    "a/../b",
    "C:/bad",
    "a\\b",
    "a//b",
    "a\n",
  ])
    assert.throws(() => safeMember(path));
});
test("native tar inventory retains bytes and refuses link entries without extracting", async (t) => {
  const directory = temp(t),
    input = join(directory, "package");
  mkdirSync(input);
  writeFileSync(join(input, "README.md"), "payload\r\n");
  const tar = createRequire(process.env.npm_execpath)("tar"),
    archive = join(directory, "input.tgz");
  await tar.c(
    { cwd: directory, gzip: true, file: archive, noDirRecurse: true },
    ["package/README.md"],
  );
  const result = await archiveInventory(archive);
  assert.deepEqual(result.files, [
    { path: "README.md", size: 9, sha256: sha256(Buffer.from("payload\r\n")) },
  ]);
  // The real npm pack corruption tests remain the archive parser's independent adversarial oracle.
});

test("release inventory streams native binary members above the former JSON-sized bound", async (t) => {
  const directory = temp(t),
    input = join(directory, "package");
  mkdirSync(input);
  const binary = randomBytes(36 * 1024 * 1024);
  writeFileSync(join(input, "json-quality.node"), binary);
  writeFileSync(join(input, "package.json"), '{"name":"native-fixture"}\n');
  const archive = join(directory, "native.tgz"),
    tar = createRequire(process.env.npm_execpath)("tar");
  await tar.c({ cwd: directory, gzip: true, file: archive }, [
    "package/json-quality.node",
    "package/package.json",
  ]);
  const result = await archiveInventory(archive);
  assert.equal(
    result.files.find(({ path }) => path === "json-quality.node").sha256,
    sha256(binary),
  );
  assert.equal(result.contents.get("json-quality.node"), null);
  assert.equal(
    JSON.parse(result.contents.get("package.json")).name,
    "native-fixture",
  );
});
test("real hard-link tar members are rejected by the release reader without extraction", async (t) => {
  const root = temp(t);
  mkdirSync(join(root, "package"));
  writeFileSync(join(root, "package", "a"), "payload");
  linkSync(join(root, "package", "a"), join(root, "package", "b"));
  const archive = join(root, "linked.tgz"),
    tar = createRequire(process.env.npm_execpath)("tar");
  await tar.c({ cwd: root, file: archive, gzip: true, noDirRecurse: true }, [
    "package/a",
    "package/b",
  ]);
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      'import {archiveInventory} from "./scripts/release-contract.js"; await archiveInventory(process.argv[1]);',
      archive,
    ],
    {
      cwd: fileURLToPath(new URL("../", import.meta.url)),
      encoding: "utf8",
      windowsHide: true,
      timeout: 5000,
    },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Linked or non-file archive member/u);
});
test("installed document links resolve against actual shipment, including reference links", () => {
  const files = [{ path: "README.md" }, { path: "docs/guide.md" }],
    contents = new Map([
      [
        "readme.md",
        Buffer.from(
          "[guide](docs/guide.md) [remote](https://example.test/a) [section](#a)",
        ),
      ],
      ["docs/guide.md", Buffer.from("[home][h]\n[h]: ../README.md\n")],
    ]);
  verifyShippedLinks(files, contents);
  contents.set(
    "docs/guide.md",
    Buffer.from("[unshipped](../scripts/release.js)"),
  );
  assert.throws(() => verifyShippedLinks(files, contents));
});
test("manual effect admission rejects every wrong context before a native request", () => {
  manualControl(environment(), "stage");
  for (const [key, value] of Object.entries({
    GITHUB_REPOSITORY: "attacker/json-quality",
    GITHUB_EVENT_NAME: "push",
    GITHUB_REF: "refs/tags/v1",
    GITHUB_WORKFLOW_REF: `${repository}/.github/workflows/ci.yml@refs/heads/main`,
    GITHUB_SHA: "main",
    GITHUB_RUN_ID: "1\nnext",
  }))
    assert.throws(() =>
      manualControl({ ...environment(), [key]: value }, "stage"),
    );
  verifyEnvironment(
    {
      name: "npm-publication",
      deployment_branch_policy: {
        protected_branches: false,
        custom_branch_policies: true,
      },
    },
    { total_count: 1, branch_policies: [{ name: "main", type: "branch" }] },
    "npm-publication",
  );
  assert.throws(() =>
    verifyEnvironment(
      {
        name: "npm-publication",
        deployment_branch_policy: {
          protected_branches: false,
          custom_branch_policies: true,
        },
      },
      { total_count: 2, branch_policies: [{ name: "main", type: "branch" }] },
      "npm-publication",
    ),
  );
});
function providerFixture() {
  const run = {
    id: 19,
    run_attempt: 2,
    repository: { full_name: repository },
    path: ".github/workflows/stage-release.yml",
    event: "workflow_dispatch",
    head_branch: "main",
    head_sha: source,
    status: "completed",
    conclusion: "success",
  };
  return {
    run,
    jobs: {
      total_count: 2,
      jobs: ["admit", "stage"].map((name, id) => ({
        id: id + 30,
        name,
        status: "completed",
        conclusion: "success",
        head_sha: source,
        run_id: 19,
        run_attempt: 2,
        steps: [],
      })),
    },
  };
}
test("provider admission denies missing, duplicate, skipped, stale-attempt and wrong-source jobs", () => {
  verifyRun(providerFixture(), "stage", source, fixture().matrix);
  for (const mutate of [
    (p) => (p.run.event = "push"),
    (p) => (p.run.path = ".github/workflows/ci.yml"),
    (p) => p.jobs.jobs.pop(),
    (p) => (p.jobs.total_count = 3),
    (p) => (p.jobs.jobs[1].name = "admit"),
    (p) => (p.jobs.jobs[1].conclusion = "skipped"),
    (p) => (p.jobs.jobs[1].run_attempt = 1),
    (p) => (p.jobs.jobs[1].head_sha = "d".repeat(40)),
  ]) {
    const p = providerFixture();
    mutate(p);
    assert.throws(() => verifyRun(p, "stage", source, fixture().matrix));
  }
});
test("durable request intent precedes native execution and unknown outcomes forbid replay", (t) => {
  const path = join(temp(t), "stage.jsonl"),
    release = fixture();
  let calls = 0;
  const outcome = journalEffect(
    path,
    release,
    "stage",
    () => {
      calls++;
      assert.equal(JSON.parse(readFileSync(path, "utf8")).state, "intent");
      return { stageId: "native-stage" };
    },
    { env: environment() },
  );
  assert.equal(outcome.state, "completed");
  assert.equal(calls, 1);
  const p = providerFixture();
  p.jobs.jobs[1].steps = [
    {
      name: "Apply admitted release effect",
      started_at: "2026-10-18T00:00:00Z",
      conclusion: "success",
    },
  ];
  // Use the actual journal origin, independently attributed by the provider.
  p.run.id = 17;
  p.run.run_attempt = 2;
  for (const job of p.jobs.jobs) job.run_id = 17;
  p.journal = readFileSync(path);
  assert.equal(
    verifyEffectHistory(
      [p],
      { run: "20", attempt: "1" },
      { package: release.package, version: release.version },
    ).length,
    1,
  );
  for (const change of [
    (entry) => delete entry.journal,
    (entry) =>
      (entry.journal = Buffer.from(
        readFileSync(path, "utf8").split("\n")[0] + "\n",
      )),
    (entry) => (entry.run.status = "in_progress"),
    (entry) => (entry.jobs.total_count = 7),
  ]) {
    const copy = structuredClone(p);
    copy.journal = Buffer.from(p.journal);
    change(copy);
    assert.throws(() =>
      verifyEffectHistory(
        [copy],
        { run: "20", attempt: "1" },
        { package: release.package, version: release.version },
      ),
    );
  }
  const unknown = join(temp(t), "unknown.jsonl");
  assert.throws(() =>
    journalEffect(
      unknown,
      release,
      "stage",
      () => {
        throw new Error("response lost");
      },
      { env: environment() },
    ),
  );
  const records = readFileSync(unknown, "utf8")
    .trim()
    .split("\n")
    .map(JSON.parse);
  assert.equal(records[1].state, "outcome-unknown");
});
test("recovery binds original request bytes and cannot become authority to replay an unknown request", (t) => {
  const path = join(temp(t), "stage.jsonl"),
    release = fixture();
  assert.throws(() =>
    journalEffect(
      path,
      release,
      "stage",
      () => {
        throw new Error("lost response");
      },
      { env: environment() },
    ),
  );
  const journal = readFileSync(path),
    record = {
      schemaVersion: 1,
      owner: "maksymshostak",
      version: release.version,
      manifestSha256: sha,
      phase: "stage",
      run: "17",
      attempt: "2",
      journalSha256: sha256(journal),
      acceptedAt: "2026-10-18T00:00:00Z",
      rationale: "Owner reconciled this exact original native stage.",
    };
  assert.equal(verifyRecoveryRecord(record, release, sha, journal).length, 2);
  for (const change of [
    (r) => (r.owner = "other"),
    (r) => (r.journalSha256 = "a".repeat(64)),
    (r) => (r.attempt = "3"),
    (r) => (r.version = "1.0.0"),
  ]) {
    const copy = structuredClone(record);
    change(copy);
    assert.throws(() => verifyRecoveryRecord(copy, release, sha, journal));
  }
  let called = false;
  assert.throws(() =>
    journalEffect(
      path,
      release,
      "stage",
      () => {
        called = true;
      },
      { env: environment() },
    ),
  );
  assert.equal(called, false);
  const interrupted = Buffer.from(journal.toString().split("\n")[0] + "\n");
  assert.equal(
    verifyRecoveryRecord(
      { ...record, journalSha256: sha256(interrupted) },
      release,
      sha,
      interrupted,
    ).length,
    1,
  );
  const prior = providerFixture();
  prior.run.id = 17;
  for (const job of prior.jobs.jobs) job.run_id = 17;
  prior.jobs.jobs[1].steps = [
    {
      name: "Apply admitted release effect",
      started_at: "2026-10-18T00:00:00Z",
      conclusion: "failure",
    },
  ];
  prior.journal = journal;
  assert.throws(() =>
    verifyEffectHistory(
      [prior],
      { run: "20", attempt: "1" },
      { package: release.package, version: release.version },
    ),
  );
  assert.equal(
    verifyEffectHistory(
      [prior],
      { run: "20", attempt: "1" },
      { package: release.package, version: release.version },
      { entries: [{ record, observed: { publicVersion: release.version } }] },
    ).length,
    1,
  );
});
test("native stage responses bind exact package, version, bytes and inspectable stage identity", () => {
  const release = fixture(),
    response = {
      [packageName]: {
        name: packageName,
        version: release.version,
        integrity: release.archive.integrity,
        stageId: "stage-17",
      },
    };
  assert.equal(
    verifyStageResponse(response, release).state,
    "staged-awaiting-owner",
  );
  for (const change of [
    (r) => (r[packageName].version = "0.1.1"),
    (r) => (r[packageName].integrity = sha512(Buffer.from("wrong"))),
    (r) => (r[packageName].stageId = ""),
    (r) => (r.other = {}),
  ]) {
    const copy = structuredClone(response);
    change(copy);
    assert.throws(() => verifyStageResponse(copy, release));
  }
});

function bundleFixture(directory) {
  mkdirSync(directory);
  const release = fixture(),
    manifest = jsonBytes(release);
  writeFileSync(join(directory, "release-manifest.json"), manifest);
  writeFileSync(join(directory, release.archive.filename), bytes);
  const digest = sha256(manifest);
  sealBundle(directory, digest);
  return { release, digest };
}
test("promotion admission acquires original unknown journal independently of its archival predecessor", (t) => {
  const root = temp(t),
    directory = join(root, "admitted"),
    original = join(root, "original");
  const { release, digest } = bundleFixture(directory);
  bundleFixture(original);
  const name = effectJournal("promote", { run: "17", attempt: "2" });
  assert.throws(() =>
    journalEffect(
      join(original, name),
      release,
      "npm-latest",
      () => {
        throw new Error("lost response");
      },
      { env: { ...environment("promote"), MANIFEST_SHA: digest } },
    ),
  );
  sealBundle(original, digest);
  const journal = readFileSync(join(original, name));
  const record = {
    schemaVersion: 1,
    owner: "maksymshostak",
    version: release.version,
    manifestSha256: digest,
    phase: "promote",
    run: "17",
    attempt: "2",
    journalSha256: sha256(journal),
    acceptedAt: "2026-10-18T00:00:00Z",
    rationale:
      "Owner observed the exact successful npm label after response loss.",
    targetVersion: release.version,
  };
  const env = { MANIFEST_SHA: digest, RECOVERY_JSON: JSON.stringify(record) };
  let downloads = 0;
  acquireRecoveryJournal(
    directory,
    root,
    env,
    (run, attempt, artifact, scratch) => {
      downloads++;
      assert.deepEqual(
        [run, attempt, artifact],
        ["17", "2", "effect-promote-2"],
      );
      assert.equal(scratch, join(root, "recovery-acquisition"));
      return { directory: original };
    },
  );
  assert.deepEqual(readFileSync(join(directory, name)), journal);
  assert.deepEqual(verifyBundle(directory, digest), release);
  acquireRecoveryJournal(directory, root, env, () => {
    throw new Error("must reuse admitted bytes");
  });
  assert.equal(downloads, 1);
  const bad = join(root, "bad");
  bundleFixture(bad);
  assert.throws(() =>
    acquireRecoveryJournal(
      bad,
      root,
      {
        ...env,
        RECOVERY_JSON: JSON.stringify({ ...record, journalSha256: sha }),
      },
      () => ({ directory: original }),
    ),
  );
});
test("post-publication restoration decisions are admitted from exact owner input without changing immutable assets", (t) => {
  const directory = join(temp(t), "admitted"),
    { release, digest } = bundleFixture(directory);
  const decision = {
    schemaVersion: 1,
    phase: "restoration",
    owner: "maksymshostak",
    source,
    version: release.version,
    manifestSha256: digest,
    acceptedAt: "2026-10-18T00:00:00Z",
    targetVersion: "0.0.1",
    reviewSha256: sha,
    registryRun: "15",
    registryAttempt: "1",
    decisions: Object.fromEntries(
      ["consumer", "pilot", "restoration"].map((name) => [
        name,
        {
          outcome: "accepted",
          rationale: "Owner assessed the exact qualified restoration target.",
          reviewer: "owner",
          evidence: [
            {
              url: "https://github.com/Hadden-Industries/json-quality/releases/tag/v0.0.1",
              sha256: sha,
            },
          ],
        },
      ]),
    ),
  };
  const text = jsonBytes(decision).toString("utf8"),
    env = {
      RESTORATION_JSON: text,
      RESTORATION_SHA: sha256(Buffer.from(text)),
      RESTORE_VERSION: "0.0.1",
      MANIFEST_SHA: digest,
    };
  admitRestoration(directory, release, env);
  assert.equal(
    readFileSync(join(directory, "release-restoration.json"), "utf8"),
    text,
  );
  verifyBundle(directory, digest);
  assert.throws(() =>
    admitRestoration(directory, release, {
      ...env,
      RESTORATION_JSON: text + " ",
    }),
  );
  assert.throws(() =>
    admitRestoration(directory, release, { ...env, RESTORE_VERSION: "0.0.2" }),
  );
});
test("expired effect artifacts use signed digest-bound checkpoints without forgetting unknown outcomes", (t) => {
  const root = temp(t),
    release = fixture(),
    path = join(root, "stage.jsonl");
  journalEffect(path, release, "stage", () => ({ stageId: "stage-17" }), {
    env: { ...environment(), GITHUB_RUN_ATTEMPT: "1" },
  });
  const journal = readFileSync(path),
    record = {
      schemaVersion: 1,
      repository,
      entries: [
        {
          phase: "stage",
          run: "17",
          attempt: "1",
          controller: source,
          journal: journal.toString("base64"),
        },
      ],
      retainedComment: "x".repeat(1100000),
    };
  const checkpointBytes = jsonBytes(record),
    checkpoint = {
      tag: "release-history-20261018",
      tagSha: "c".repeat(40),
      sha256: sha256(checkpointBytes),
    };
  const responses = {
    [`git/ref/tags/${checkpoint.tag}`]: {
      ref: `refs/tags/${checkpoint.tag}`,
      object: { type: "tag", sha: checkpoint.tagSha },
    },
    [`git/tags/${checkpoint.tagSha}`]: {
      sha: checkpoint.tagSha,
      tag: checkpoint.tag,
      object: { type: "commit", sha: source },
      verification: { verified: true, reason: "valid" },
    },
  };
  const readRaw = (path) => {
    assert.equal(path, `contents/release-history.json?ref=${source}`);
    return checkpointBytes;
  };
  const nativeCheckpoint = () =>
    readHistoryCheckpoint(checkpoint, (path) => responses[path], readRaw);
  const observed = providerFixture();
  observed.run.id = 17;
  observed.run.run_attempt = 1;
  for (const job of observed.jobs.jobs) {
    job.run_id = 17;
    job.run_attempt = 1;
  }
  observed.jobs.jobs[1].steps = [
    {
      name: "Apply admitted release effect",
      started_at: "2026-10-18T00:00:00Z",
      conclusion: "success",
    },
  ];
  const readers = {
    pages: (path) =>
      path.includes("/artifacts?")
        ? [{ name: "effect-stage-1", expired: true }]
        : path.includes("stage-release.yml")
          ? [{ id: 17, run_attempt: 1 }]
          : [],
    provider: () => structuredClone(observed),
    checkpoint: nativeCheckpoint,
    download: () => {
      throw new Error("expired archive must not be downloaded");
    },
  };
  const history = readEffectHistory(
    { GITHUB_RUN_ID: "20", GITHUB_RUN_ATTEMPT: "1" },
    root,
    checkpoint,
    readers,
  );
  assert.deepEqual(history[0].journal, journal);
  assert.equal(
    verifyEffectHistory(
      history,
      { run: "20", attempt: "1" },
      { package: release.package, version: release.version },
    ).length,
    1,
  );
  assert.throws(() => readEffectHistory({}, root, undefined, readers));
  assert.throws(() =>
    readHistoryCheckpoint(
      { ...checkpoint, sha256: sha },
      (path) => responses[path],
      readRaw,
    ),
  );
  responses[`git/tags/${checkpoint.tagSha}`].verification.verified = false;
  assert.throws(nativeCheckpoint);
  responses[`git/tags/${checkpoint.tagSha}`].verification.verified = true;
  const unknown = journal.toString().split("\n")[0] + "\n";
  const unresolved = readEffectHistory({}, root, checkpoint, {
    ...readers,
    checkpoint: () => [
      {
        ...record.entries[0],
        journal: Buffer.from(unknown).toString("base64"),
      },
    ],
  });
  assert.throws(() =>
    verifyEffectHistory(
      unresolved,
      { run: "20", attempt: "1" },
      { package: release.package, version: release.version },
    ),
  );
  assert.throws(() =>
    readEffectHistory({}, root, checkpoint, {
      ...readers,
      checkpoint: () => [],
    }),
  );
});
test("promotion requires explicit prior-label absence and rejects prerelease or concurrent latest", () => {
  const release = fixture();
  release.version = "0.1.0";
  assert.deepEqual(
    promotionPlan(release, { pilot: "0.1.0" }, { latest: null }),
    { before: null, after: "0.1.0" },
  );
  assert.throws(() => promotionPlan(release, { pilot: "0.1.0" }, {}));
  assert.throws(() =>
    promotionPlan(
      release,
      { pilot: "0.1.0", latest: "1.0.0" },
      { latest: null },
    ),
  );
  assert.throws(() =>
    promotionPlan(fixture(), { pilot: "0.1.0-dev.0" }, { latest: null }),
  );
  assert.throws(() =>
    promotionPlan(release, { pilot: "0.1.1" }, { latest: null }),
  );
});
test("restoration recovery preserves original prior labels after npm has already applied the target", () => {
  const release = fixture();
  release.version = "1.2.0";
  const expected = { latest: "1.1.0", githubLatest: "v1.1.0" };
  const recovery = {
    observed: { npmLatest: "1.0.0", githubLatest: "v1.1.0" },
    priorLabels: expected,
  };
  assert.deepEqual(
    promotionPlan(
      release,
      { pilot: "1.2.0", latest: "1.0.0" },
      expected,
      "1.0.0",
      recovery,
    ),
    { before: "1.1.0", after: "1.0.0" },
  );
  assert.throws(() =>
    promotionPlan(
      release,
      { pilot: "1.2.0", latest: "1.0.0" },
      { ...expected, latest: "1.0.0" },
      "1.0.0",
      recovery,
    ),
  );
  assert.throws(() =>
    promotionPlan(
      release,
      { pilot: "1.2.0", latest: "1.0.1" },
      expected,
      "1.0.0",
      recovery,
    ),
  );
});
test("GitHub repair preserves original X while guarding owner-authorized current Y against concurrent Z", () => {
  const expected = { latest: "1.1.0", githubLatest: "v1.1.0" },
    recovery = {
      record: {
        githubAction: "repair-current-label",
        expectedGithubLatest: "v1.2.0",
      },
      observed: { npmLatest: "1.0.0", githubLatest: "v1.2.0" },
      priorLabels: expected,
    };
  verifyGithubPromotionState("v1.2.0", expected, "1.0.0", recovery);
  assert.throws(() =>
    verifyGithubPromotionState("v1.3.0", expected, "1.0.0", recovery),
  );
  assert.equal(recovery.priorLabels.githubLatest, "v1.1.0");
});
test("successive recovery decisions retain each original record instead of replacing prior reconciliation", (t) => {
  const root = temp(t),
    first = { phase: "promote", run: "17", attempt: "1", journalSha256: sha },
    second = { ...first, run: "18" };
  retainRecovery(root, first);
  retainRecovery(root, second);
  retainRecovery(root, first);
  assert.deepEqual(retainedRecoveries(root), [first, second]);
  assert.throws(() =>
    retainRecovery(root, { ...first, journalSha256: "c".repeat(64) }),
  );
  assert.deepEqual(retainedRecoveries(root), [first, second]);
});
test("second partial GitHub repair uses the latest owner guard while retaining the first original labels", (t) => {
  const root = temp(t),
    directory = join(root, "admitted"),
    { release } = bundleFixture(directory);
  release.version = "1.2.0";
  writeFileSync(join(directory, "release-manifest.json"), jsonBytes(release));
  const manifestSha = sha256(jsonBytes(release));
  const origin = (run) => ({
    ...environment("promote"),
    GITHUB_RUN_ID: run,
    GITHUB_RUN_ATTEMPT: "1",
    MANIFEST_SHA: manifestSha,
  });
  const journalA = join(directory, "promote-17-1.jsonl"),
    journalB = join(directory, "promote-18-1.jsonl");
  journalEffect(journalA, release, "npm-latest", () => ({ latest: "1.0.0" }), {
    env: origin("17"),
    before: "1.1.0",
  });
  assert.throws(() =>
    journalEffect(
      journalA,
      release,
      "github-latest",
      () => {
        throw new Error("lost A");
      },
      { env: origin("17"), before: "v1.1.0" },
    ),
  );
  assert.throws(() =>
    journalEffect(
      journalB,
      release,
      "github-latest",
      () => {
        throw new Error("lost B");
      },
      { env: origin("18"), before: "v1.1.0" },
    ),
  );
  const common = {
    schemaVersion: 1,
    owner: "maksymshostak",
    phase: "promote",
    attempt: "1",
    version: release.version,
    manifestSha256: manifestSha,
    acceptedAt: "2026-10-18T00:00:00Z",
    rationale:
      "Owner reconciled exact original requests before guarded repair.",
    targetVersion: "1.0.0",
    githubAction: "repair-current-label",
  };
  const first = {
      ...common,
      run: "17",
      journalSha256: sha256(readFileSync(journalA)),
      expectedGithubLatest: "v1.1.0",
    },
    second = {
      ...common,
      run: "18",
      journalSha256: sha256(readFileSync(journalB)),
      expectedGithubLatest: "v1.2.0",
    };
  retainRecovery(directory, first);
  let reads = 0;
  const readers = {
    provider: () => ({ run: { status: "completed", head_sha: source } }),
    npmCommand: () => {
      reads++;
      return '{"latest":"1.0.0"}';
    },
    optionalApi: () => ({ tag_name: "v1.2.0" }),
  };
  const result = reconcileObserved(
    directory,
    join(root, "scratch"),
    { MANIFEST_SHA: manifestSha, RECOVERY_JSON: JSON.stringify(second) },
    readers,
  );
  assert.equal(reads, 1, "Historical guard must not be reasserted");
  assert.deepEqual(result.promote.priorLabels, {
    latest: "1.1.0",
    githubLatest: "v1.1.0",
  });
  assert.equal(result.promote.observed.githubLatest, "v1.2.0");
  assert.deepEqual(retainedRecoveries(directory), [first, second]);
  assert.throws(() =>
    reconcileObserved(
      directory,
      join(root, "changed"),
      { MANIFEST_SHA: manifestSha },
      { ...readers, optionalApi: () => ({ tag_name: "v1.3.0" }) },
    ),
  );
});
test("native predecessor download and writer-history acquisition have disjoint filesystem roots", (t) => {
  const root = temp(t),
    release = fixture(),
    journalPath = join(root, "original.jsonl");
  journalEffect(
    journalPath,
    release,
    "stage",
    () => ({ stageId: "stage-17" }),
    { env: { ...environment(), GITHUB_RUN_ATTEMPT: "1" } },
  );
  const journal = readFileSync(journalPath),
    zip = Buffer.from("opaque native ZIP transport"),
    name = "effect-stage-1";
  const artifact = {
    id: 501,
    name,
    expired: false,
    digest: `sha256:${sha256(zip)}`,
    workflow_run: { id: 17, head_sha: source },
  };
  const transport = {
    pages: () => [artifact],
    api: (path) =>
      path.startsWith("actions/artifacts/") ? artifact : { head_sha: source },
    gh: (args) => {
      if (args[0] === "api") return zip;
      const destination = args[args.indexOf("--dir") + 1];
      writeFileSync(join(destination, "stage-17-1.jsonl"), journal);
      return "";
    },
  };
  const original = download(17, 1, name, root, transport);
  const observed = providerFixture();
  observed.run.id = 17;
  observed.run.run_attempt = 1;
  observed.jobs.jobs.forEach((job) => {
    job.run_id = 17;
    job.run_attempt = 1;
  });
  observed.jobs.jobs[1].steps = [
    {
      name: "Apply admitted release effect",
      started_at: "2026-10-18T00:00:00Z",
      conclusion: "success",
    },
  ];
  const history = readEffectHistory({}, root, undefined, {
    pages: (path) =>
      path.includes("/artifacts?")
        ? [artifact]
        : path.includes("stage-release.yml")
          ? [{ id: 17, run_attempt: 1 }]
          : [],
    provider: () => structuredClone(observed),
    download: (run, attempt, artifactName, directory) =>
      download(run, attempt, artifactName, directory, transport),
  });
  assert.deepEqual(
    readFileSync(join(original.directory, "stage-17-1.jsonl")),
    journal,
  );
  assert.deepEqual(history[0].journal, journal);
  assert.equal(
    verifyEffectHistory(
      history,
      { run: "20", attempt: "1" },
      { package: packageName, version: release.version },
    ).length,
    1,
  );
});
test("immutable draft asset admission rejects missing, extra, duplicate and substituted content", () => {
  const expected = [{ name: "candidate.tgz", size: 7, sha256: sha }],
    observed = [{ name: "candidate.tgz", size: 7, digest: `sha256:${sha}` }];
  verifyDraftAssets(expected, observed);
  for (const entries of [
    [],
    [...observed, ...observed],
    [{ ...observed[0], digest: `sha256:${"d".repeat(64)}` }],
    [...observed, { name: "extra", size: 0, digest: `sha256:${sha}` }],
  ])
    assert.throws(() => verifyDraftAssets(expected, entries));
});
test("archival finds the unique draft through the draft-capable release list and binds owner settings readback", () => {
  const release = fixture(),
    draft = { id: 91, tag_name: `v${release.version}`, draft: true };
  assert.equal(
    findDraft(release, (path) => {
      assert.equal(path, "releases?per_page=100");
      return [{ id: 90, tag_name: "v0.0.0", draft: false }, draft];
    }).id,
    91,
  );
  for (const entries of [[], [draft, draft], [{ ...draft, draft: false }]])
    assert.throws(() => findDraft(release, () => entries));
  const responseJson = '{"enabled":true}',
    now = Date.parse("2026-10-18T00:00:00Z"),
    decision = {
      immutableReleases: {
        responseJson,
        checkedAt: "2026-10-17T23:30:00Z",
        evidence: {
          url: `https://api.github.com/repos/${repository}/immutable-releases`,
          sha256: sha256(Buffer.from(responseJson)),
        },
      },
    };
  verifyArchiveSettings(decision, now);
  for (const mutate of [
    (d) => (d.immutableReleases.checkedAt = "2026-10-17T22:00:00Z"),
    (d) => (d.immutableReleases.checkedAt = "2026-10-18T00:00:01Z"),
    (d) => (d.immutableReleases.evidence.sha256 = sha),
    (d) => (d.immutableReleases.responseJson = '{"enabled":false}'),
  ]) {
    const copy = structuredClone(decision);
    mutate(copy);
    assert.throws(() => verifyArchiveSettings(copy, now));
  }
});
test("unknown promotion permits only explicit owner repair of the observed GitHub label and never npm replay", () => {
  const record = { targetVersion: "1.0.0" },
    records = [{ operation: "npm-latest" }, { operation: "github-latest" }];
  assert.throws(() =>
    reconcilePromotionLabels(
      record,
      records,
      { latest: "1.0.0" },
      { tag_name: "v0.9.0" },
    ),
  );
  const repair = {
    ...record,
    githubAction: "repair-current-label",
    expectedGithubLatest: "v0.9.0",
  };
  assert.deepEqual(
    reconcilePromotionLabels(
      repair,
      records,
      { latest: "1.0.0" },
      { tag_name: "v0.9.0" },
    ),
    { npmLatest: "1.0.0", githubLatest: "v0.9.0" },
  );
  assert.throws(() =>
    reconcilePromotionLabels(
      repair,
      records,
      { latest: "0.9.0" },
      { tag_name: "v0.9.0" },
    ),
  );
  assert.throws(() =>
    reconcilePromotionLabels(
      repair,
      records,
      { latest: "1.0.0" },
      { tag_name: "v0.9.1" },
    ),
  );
  assert.deepEqual(
    reconcilePromotionLabels(
      { ...repair, expectedGithubLatest: null },
      records,
      { latest: "1.0.0" },
      null,
    ),
    { npmLatest: "1.0.0", githubLatest: null },
  );
});
test("completion refuses labels changed during a recovered promotion's fresh audits", () => {
  assert.deepEqual(
    verifyCompletedLabels(
      "1.0.0",
      { latest: "1.0.0" },
      { tag_name: "v1.0.0", immutable: true },
    ),
    {
      npm: { latest: "1.0.0" },
      github: { tag_name: "v1.0.0", immutable: true },
    },
  );
  assert.throws(() =>
    verifyCompletedLabels(
      "1.0.0",
      { latest: "1.0.1" },
      { tag_name: "v1.0.0", immutable: true },
    ),
  );
  assert.throws(() =>
    verifyCompletedLabels(
      "1.0.0",
      { latest: "1.0.0" },
      { tag_name: "v1.0.1", immutable: true },
    ),
  );
  assert.throws(() =>
    verifyCompletedLabels(
      "1.0.0",
      { latest: "1.0.0" },
      { tag_name: "v1.0.0", immutable: false },
    ),
  );
});
test("completed native continuations retain exact historical settlements across versions and reject all live status variants", (t) => {
  const root = temp(t),
    release = fixture(),
    originalPath = join(root, "stage.jsonl"),
    continuationPath = join(root, "promote.jsonl");
  const original = providerFixture();
  original.run.id = 17;
  original.jobs.jobs.forEach((job) => (job.run_id = 17));
  original.jobs.jobs[1].steps = [
    {
      name: "Apply admitted release effect",
      started_at: "2026-10-18T00:00:00Z",
      conclusion: "failure",
    },
  ];
  assert.throws(() =>
    journalEffect(
      originalPath,
      release,
      "stage",
      () => {
        throw new Error("lost response");
      },
      { env: environment() },
    ),
  );
  original.journal = readFileSync(originalPath);
  const continuation = providerFixture();
  continuation.phase = "promote";
  continuation.run.id = 18;
  continuation.run.path = ".github/workflows/promote-release.yml";
  continuation.jobs.jobs.forEach((job) => (job.run_id = 18));
  continuation.jobs.jobs[1].name = "promote";
  continuation.jobs.jobs[1].steps = [
    {
      name: "Apply admitted release effect",
      started_at: "2026-10-18T00:01:00Z",
      conclusion: "success",
    },
  ];
  continuation.settlements = [
    {
      schemaVersion: 1,
      owner: "maksymshostak",
      phase: "stage",
      run: "17",
      attempt: "2",
      version: release.version,
      manifestSha256: sha,
      journalSha256: sha256(original.journal),
    },
  ];
  journalEffect(
    continuationPath,
    release,
    "completion-readback",
    () => ({ publicVersion: release.version }),
    { env: { ...environment("promote"), GITHUB_RUN_ID: "18" } },
  );
  continuation.journal = readFileSync(continuationPath);
  assert.equal(
    verifyEffectHistory(
      [original, continuation],
      { run: "20", attempt: "1" },
      { package: packageName, version: "1.0.0" },
    ).length,
    0,
  );
  const failed = structuredClone(continuation);
  failed.run.conclusion = "failure";
  assert.throws(() =>
    verifyEffectHistory(
      [original, failed],
      { run: "20", attempt: "1" },
      { package: packageName, version: "1.0.0" },
    ),
  );
  for (const status of [
    "queued",
    "requested",
    "waiting",
    "pending",
    "in_progress",
    "future-unknown",
  ])
    assert.throws(() =>
      verifyEffectHistory(
        [{ ...original, run: { ...original.run, status } }],
        { run: "20", attempt: "1" },
        { package: packageName, version: "1.0.0" },
      ),
    );
});
test("signed source tags must be annotated, verified and name the original candidate commit", () => {
  const release = fixture(),
    reference = {
      ref: `refs/tags/v${release.version}`,
      object: { type: "tag", sha: "e".repeat(40) },
    },
    annotation = {
      sha: "e".repeat(40),
      tag: `v${release.version}`,
      object: { type: "commit", sha: source },
      verification: { verified: true, reason: "valid" },
    };
  verifyTag(reference, annotation, release);
  assert.throws(() =>
    verifyTag(
      { ...reference, object: { type: "commit", sha: source } },
      annotation,
      release,
    ),
  );
  assert.throws(() =>
    verifyTag(
      reference,
      { ...annotation, verification: { verified: false } },
      release,
    ),
  );
});
test("CodeQL gate uses exact-source native analyses and query inventories, including newest failures", () => {
  const analyses = ["actions", "javascript-typescript"].map((language, id) => ({
    id: id + 1,
    commit_sha: source,
    ref: "refs/heads/main",
    category: `/language:${language}`,
    analysis_key: "dynamic/github-code-scanning/codeql:analyze",
    environment: JSON.stringify({ language }),
    tool: { name: "CodeQL", version: "2.0.0" },
    error: "",
    warning: "",
    results_count: 0,
    rules_count: 1,
  }));
  assert.equal(verifyCodeql(analyses, source).length, 2);
  for (const change of [
    (a) => a.pop(),
    (a) => (a[0].results_count = 1),
    (a) => (a[0].warning = "incomplete"),
    (a) => (a[0].commit_sha = "e".repeat(40)),
    (a) => (a[0].rules_count = 0),
  ]) {
    const copy = structuredClone(analyses);
    change(copy);
    assert.throws(() => verifyCodeql(copy, source));
  }
  assert.throws(() =>
    verifyCodeql(
      [{ ...analyses[0], warning: "new failure" }, ...analyses],
      source,
    ),
  );
  const sarif = {
    version: "2.1.0",
    runs: [
      {
        automationDetails: { id: "/language:actions/" },
        tool: {
          driver: { name: "CodeQL", semanticVersion: "2.0.0" },
          extensions: [
            {
              name: "actions-queries",
              semanticVersion: "1.0.0",
              rules: [{ id: "rule-1" }],
            },
          ],
        },
        results: [],
      },
    ],
  };
  assert.equal(verifySarif(sarif, analyses[0]).findings, 0);
  sarif.runs[0].results.push({ message: { text: "finding" } });
  assert.throws(() => verifySarif(sarif, analyses[0]));
});
test("native audit and anonymous config deny findings and inherited token/config fallback", (t) => {
  verifyAudit({
    auditReportVersion: 2,
    metadata: { vulnerabilities: { total: 0 } },
    vulnerabilities: {},
  });
  assert.throws(() =>
    verifyAudit({
      auditReportVersion: 2,
      metadata: { vulnerabilities: { total: 1 } },
      vulnerabilities: { low: {} },
    }),
  );
  const env = isolatedNpmEnvironment(temp(t), {
    npm_config_userconfig: "secret",
    NPM_TOKEN: "secret",
    NODE_AUTH_TOKEN: "secret",
    PATH: "native",
  });
  assert.equal(env.PATH, "native");
  assert.ok(
    !env.NPM_TOKEN && !env.NODE_AUTH_TOKEN && !env.npm_config_userconfig,
  );
  assert.equal(env.NPM_CONFIG_IGNORE_SCRIPTS, "true");
});
test("native SBOM location, edge, integrity and license conservation survives only the bound file URI repair", (t) => {
  const directory = temp(t),
    location = "node_modules/@fixture/lib",
    name = "@fixture/lib",
    version = "1.0.0",
    archive = join(directory, "archive with spaces.tgz");
  mkdirSync(join(directory, location), { recursive: true });
  writeFileSync(
    join(directory, location, "package.json"),
    JSON.stringify({ name, version, license: "MIT" }),
  );
  writeFileSync(archive, bytes);
  const lock = {
    packages: {
      "": {},
      [location]: {
        version,
        integrity: sha512(bytes),
        resolved: `file:${archive.replaceAll("\\", "/")}`,
      },
    },
  };
  const component = {
    "bom-ref": `${name}@${version}`,
    name,
    version,
    purl: "pkg:npm/%40fixture/lib@1.0.0",
    licenses: [{ license: { id: "MIT" } }],
    hashes: [
      {
        alg: "SHA-512",
        content: Buffer.from(sha512(bytes).slice(7), "base64").toString("hex"),
      },
    ],
    externalReferences: [{ type: "distribution", url: `file:${archive}` }],
    properties: [{ name: "preserve:identity", value: "exact" }],
  };
  const bom = {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    metadata: { component: { "bom-ref": "root", name: "consumer" } },
    components: [component],
    dependencies: [
      { ref: "root", dependsOn: [component["bom-ref"]] },
      { ref: component["bom-ref"], dependsOn: [] },
    ],
  };
  const inventory = [
    { ref: "root", location: "", dependsOn: [component["bom-ref"]] },
    { ref: component["bom-ref"], location, dependsOn: [] },
  ];
  const result = normalizeFileReferences(bom, lock, directory, {
    path: archive,
    name,
    version,
    integrity: sha512(bytes),
  });
  assert.equal(result.changes.length, 1);
  assert.ok(result.bom.components[0].externalReferences[0].url.includes("%20"));
  assert.equal(component.externalReferences[0].url, `file:${archive}`);
  assert.deepEqual(result.bom.components[0].properties, component.properties);
  verifySbom(result.bom, lock, directory, inventory);
  for (const change of [
    (b) => b.components.pop(),
    (b) => (b.components[0].licenses = [{ license: { id: "GPL-3.0-only" } }]),
    (b) => (b.dependencies[1].dependsOn = ["root"]),
    (b) => b.components.push({ ...component, "bom-ref": "unexpected" }),
  ]) {
    const copy = structuredClone(result.bom);
    change(copy);
    assert.throws(() => verifySbom(copy, lock, directory, inventory));
  }
  assert.throws(() =>
    normalizeFileReferences(bom, lock, directory, {
      path: archive,
      name,
      version,
      integrity: sha512(Buffer.from("substitution")),
    }),
  );
});
test("registry metadata and bounded transport reject substituted bytes, redirects and oversized responses", async () => {
  const release = fixture(),
    metadata = {
      name: packageName,
      version: release.version,
      license: "AGPL-3.0-only",
      dist: {
        integrity: release.archive.integrity,
        tarball: "https://registry.npmjs.org/package.tgz",
        signatures: [{}],
        attestations: { url: "https://registry.npmjs.org/attestation" },
      },
    };
  verifyPublicMetadata(metadata, release);
  assert.throws(() =>
    verifyPublicMetadata(
      {
        ...metadata,
        dist: { ...metadata.dist, tarball: "https://attacker.test/payload" },
      },
      release,
    ),
  );
  const fetcher = async (_url, options) => {
    assert.equal(options.redirect, "error");
    return {
      status: 200,
      body: (async function* () {
        yield Buffer.from("too large");
      })(),
    };
  };
  await assert.rejects(
    registryBytes("https://registry.npmjs.org/a", 2, fetcher),
  );
  await assert.rejects(registryBytes("https://attacker.test/a", 100, fetcher));
});
test("real command failure and timeout retain native diagnostics and finite classification", () => {
  assert.throws(
    () =>
      native(
        process.execPath,
        [
          "-e",
          "process.stdout.write('native-out');process.stderr.write('native-err');process.exit(7)",
        ],
        { phase: "failure-fixture" },
      ),
    (error) =>
      error.facts.exit === 7 &&
      error.stdout.includes("native-out") &&
      error.stderr.includes("native-err"),
  );
  assert.throws(
    () =>
      native(process.execPath, ["-e", "setInterval(()=>{},1000)"], {
        phase: "deadline-fixture",
        timeout: 50,
      }),
    (error) => error.facts.timeout,
  );
  assert.throws(() => native(process.execPath, [], { timeout: 0 }));
  assert.equal(budgets.install, 300000);
  assert.equal(budgets.suite, 1800000);
});
test("consumer reports cannot substitute a source, lane, registry boundary or schema observation", () => {
  const release = fixture(),
    lane = { os: "windows-2025", node: policy.reference },
    report = {
      status: "passed",
      sourceCommit: source,
      archiveSha256: release.archive.sha256,
      node: lane.node,
      platform: "win32",
      architecture: "x64",
      npm: policy.consumerNpm,
      nativeToolchain: { npm: policy.consumerNpm },
      qualification: "public registry",
      layout: "isolated",
      publicExports: 6,
      cliPhysicalFiles: 2,
      packageVersion: release.version,
      installSource: "registry",
    };
  verifyReport(report, release, lane, "public registry", "isolated");
  for (const [key, value] of Object.entries({
    sourceCommit: "e".repeat(40),
    node: "22.13.0",
    platform: "linux",
    qualification: "transported archive",
    publicExports: 4,
    packageVersion: "different-version",
    installSource: "producer-archive",
  }))
    assert.throws(() =>
      verifyReport(
        { ...report, [key]: value },
        release,
        lane,
        "public registry",
        "isolated",
      ),
    );
});
test("owner decisions bind exact bytes and independent security evidence without changing candidate source", () => {
  const release = fixture();
  const decision = {
    schemaVersion: 1,
    phase: "review",
    owner: "maksymshostak",
    source,
    version: release.version,
    manifestSha256: sha,
    acceptedAt: "2026-10-18T00:00:00Z",
    decisions: Object.fromEntries(
      ["semver", "security", "rights", "retention"].map((name) => [
        name,
        {
          outcome: "accepted",
          rationale: "Specific reviewed release evidence was accepted.",
          reviewer: "owner",
          independent: name === "security",
          evidence: [{ url: "https://example.test/review", sha256: sha }],
        },
      ]),
    ),
  };
  const encode = (value) => Buffer.from(JSON.stringify(value));
  const raw = encode(decision);
  verifyDecision(raw, sha256(raw), release, sha, "review");
  assert.throws(() =>
    verifyDecision(raw, "c".repeat(64), release, sha, "review"),
  );
  for (const change of [
    (d) => (d.manifestSha256 = "d".repeat(64)),
    (d) => (d.decisions.security.independent = false),
    (d) => delete d.decisions.retention,
    (d) => (d.decisions.rights.evidence = []),
  ]) {
    const copy = structuredClone(decision);
    change(copy);
    const raw = encode(copy);
    assert.throws(() =>
      verifyDecision(raw, sha256(raw), release, sha, "review"),
    );
  }
});
test("native verified provenance must retain the original publisher workflow, control commit and attempt", () => {
  const release = fixture(),
    origin = { run: "12", attempt: "3", controller: "c".repeat(40) };
  const statement = {
    _type: "https://in-toto.io/Statement/v1",
    predicateType: "https://slsa.dev/provenance/v1",
    predicate: {
      buildDefinition: {
        buildType:
          "https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1",
        externalParameters: {
          workflow: {
            ref: "refs/heads/main",
            repository: `https://github.com/${repository}`,
            path: ".github/workflows/stage-release.yml",
          },
        },
        resolvedDependencies: [
          {
            uri: `git+https://github.com/${repository}@refs/heads/main`,
            digest: { gitCommit: origin.controller },
          },
        ],
        internalParameters: { github: { event_name: "workflow_dispatch" } },
      },
      runDetails: {
        builder: { id: "https://github.com/actions/runner/github-hosted" },
        metadata: {
          invocationId: `https://github.com/${repository}/actions/runs/12/attempts/3`,
        },
      },
    },
  };
  const audit = (value) => ({
    invalid: [],
    missing: [],
    verified: [
      {
        name: packageName,
        version: release.version,
        registry: "https://registry.npmjs.org/",
        attestationBundles: [
          {
            predicateType: "https://slsa.dev/provenance/v1",
            bundle: {
              dsseEnvelope: {
                payload: Buffer.from(JSON.stringify(value)).toString("base64"),
              },
            },
          },
        ],
      },
    ],
  });
  assert.equal(
    verifyProvenance(audit(statement), release, origin).publisher.attempt,
    "3",
  );
  for (const change of [
    (s) =>
      (s.predicate.buildDefinition.externalParameters.workflow.path =
        ".github/workflows/promote-release.yml"),
    (s) =>
      (s.predicate.buildDefinition.resolvedDependencies[0].digest.gitCommit =
        source),
    (s) =>
      (s.predicate.runDetails.metadata.invocationId = `https://github.com/${repository}/actions/runs/12/attempts/4`),
  ]) {
    const copy = structuredClone(statement);
    change(copy);
    assert.throws(() => verifyProvenance(audit(copy), release, origin));
  }
});
