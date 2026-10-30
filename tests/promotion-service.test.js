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
} from "../scripts/promotion-handoff.js";
import { verifyGithubPromotionState } from "../scripts/release-effects.js";
import { checkWorkflows } from "../scripts/check-workflows.js";
import { effectJournal, sha256 } from "../scripts/release-contract.js";
import { verifyRecoveryRecord } from "../scripts/release-recovery.js";
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
            started_at: "2026-10-30T00:00:00Z",
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
