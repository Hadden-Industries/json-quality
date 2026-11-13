// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import contractCohort from "../schemas/contract-cohort.json" with { type: "json" };
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  observeQualification,
  publishCiResult,
} from "../scripts/ci-command.js";
import {
  createReceipt,
  selectProof,
  verifyProof,
  jobNames,
  repository,
  workflow,
} from "../scripts/ci-proof.js";
import { nodeSupport } from "../scripts/node-matrix.js";
import {
  assertHostedPlatform,
  hostIdentity,
  pythonVersion,
} from "../scripts/ci-host.js";
import { ubuntuRunner, ubuntuRunnerPattern } from "../scripts/runner-policy.js";
import { budgets } from "../scripts/qualification-budgets.js";
import { nodeMatrixFixture, nextPatchVersion } from "./node-matrix-fixture.js";
import {
  MINIMAL_CLI_CASES,
  MINIMAL_CLI_COMMANDS,
} from "../scripts/consumer-cli-probe.js";

const noWait = async () => {};
const linuxRunner = ubuntuRunner();
const currentImage = `ubuntu${ubuntuRunnerPattern.exec(linuxRunner)[1]}`;
const otherRunner =
  linuxRunner === "ubuntu-24.04" ? "ubuntu-26.04" : "ubuntu-24.04";
const otherImage = `ubuntu${ubuntuRunnerPattern.exec(otherRunner)[1]}`;

test("frozen runner evidence remains readable under its recorded lane", () => {
  const historical = {
    os: "Linux",
    architecture: "X64",
    image: otherImage,
    imageVersion: "20261020.1.0",
    python: pythonVersion,
  };
  assert.doesNotThrow(() => assertHostedPlatform(historical, otherRunner));
  assert.throws(
    () => assertHostedPlatform(historical, linuxRunner),
    /image family/u,
  );
  assert.throws(
    () => hostIdentity({ CI_OS: otherRunner }),
    /current qualification policy/u,
  );
});

const sha = (character) => character.repeat(40);
function performanceFixture(source, node, os, operation) {
  const windows = os.startsWith("windows");
  const tree = {
    schemaVersion: 1,
    platform: windows ? "win32" : "linux",
    status: "passed",
    cleanup: "passed",
    quiescence: "passed",
    exitCode: 0,
    timedOut: false,
    cancelled: false,
    units: "bytes",
    driverIncluded: true,
    controllerIncluded: false,
    method: windows ? "windows-job" : "linux-process-group",
    metric: windows ? "peak-committed-bytes" : "sampled-sum-rss-bytes",
    peakBytes: 1024,
    samples: 2,
    processCount: 2,
  };
  return {
    schemaVersion: 2,
    status: "passed",
    environment: { node: `v${node}`, platform: tree.platform },
    workload: { operation, repetitions: 1 },
    identities: [
      {
        variant: "candidate",
        head: source,
        sourceSha256: "e".repeat(64),
        nativeIdentity: { coreSourceInputsSha256: "d".repeat(64) },
      },
    ],
    samples: [
      {
        variant: "candidate",
        repetition: 0,
        identity: { coreSourceInputsSha256: "d".repeat(64) },
        tree: { ...tree },
      },
    ],
    observations: [-1, 0].map((repetition) => ({
      variant: "candidate",
      repetition,
      ...tree,
    })),
  };
}
function fixture(attempt = 1, fork = false) {
  const now = Date.parse("2026-10-27T12:00:00Z"),
    repo = { id: 11, full_name: repository, default_branch: "main" };
  const matrix = nodeMatrixFixture();
  const snapshot = {
    commit: sha("1"),
    tree: sha("2"),
    parents: [sha("3"), sha("4")],
    workflow: sha("5"),
    defaultPolicySha256: "a".repeat(64),
  };
  const pr = {
    number: 17,
    state: "closed",
    merged: true,
    merged_at: new Date(now - 100).toISOString(),
    // API 2026-03-10 omits merge_commit_sha from both PR responses.
    base: { ref: "main", sha: sha("3"), repo },
    head: {
      sha: sha("4"),
      repo: fork ? { id: 12, full_name: "contributor/json-quality" } : repo,
    },
  };
  const ctx = {
    repository,
    repositoryId: 11,
    runId: 71,
    runAttempt: attempt,
    sha: snapshot.commit,
    eventName: "pull_request",
    snapshot,
    event: { number: 17, pull_request: pr },
  };
  const run = {
    id: 71,
    run_attempt: attempt,
    repository: repo,
    head_repository: pr.head.repo,
    event: "pull_request",
    path: workflow,
    head_sha: pr.head.sha,
    status: "completed",
    conclusion: "success",
    run_started_at: new Date(now - 10000).toISOString(),
    updated_at: new Date(now - 100).toISOString(),
  };
  const original = jobNames(matrix).map((name, index) => ({
    id: index + 1,
    name,
    run_id: 71,
    run_attempt: 1,
    head_sha: run.head_sha,
    runner_id: index + 1,
    status: "completed",
    conclusion: "success",
    started_at: new Date(now - 9000).toISOString(),
    completed_at: new Date(now - 2000).toISOString(),
  }));
  const jobs = original.map((value) => ({
    ...value,
    id: value.id + 100,
    run_attempt: attempt,
  }));
  const artifact = {
    id: 501,
    name: `ci-proof-71-${attempt}.json`,
    digest: "sha256:" + "a".repeat(64),
    expired: false,
    created_at: new Date(now - 500).toISOString(),
    expires_at: new Date(now + 86400000).toISOString(),
    workflow_run: {
      id: 71,
      repository_id: 11,
      head_repository_id: pr.head.repo.id,
      head_sha: run.head_sha,
    },
  };
  const hosts = matrix.os.map((lane) => ({
    lane,
    os: lane.startsWith("windows") ? "Windows" : "Linux",
    architecture: "X64",
    image: lane.startsWith("windows") ? "win25" : currentImage,
    imageVersion: "20261020.1.0",
    python: pythonVersion,
  }));
  const transport = {
    id: 502,
    name: "qualified-producer-1",
    digest: "sha256:" + "d".repeat(64),
    size_in_bytes: 1024,
    workflow_run: {
      id: 71,
      repository_id: 11,
      head_repository_id: pr.head.repo.id,
      head_sha: run.head_sha,
    },
  };
  const records = matrix.os.flatMap((os) =>
    matrix.node.map((node) => ({
      schemaVersion: 2,
      status: "passed",
      repositoryId: 11,
      runId: 71,
      runAttempt: 1,
      snapshot,
      lane: { os, node },
      host: {
        ...hosts.find((host) => host.lane === os),
        node,
        npm: nodeSupport.consumerNpm,
      },
      transport,
      performance: Object.fromEntries(
        ["check", "format"].map((operation) => [
          operation,
          performanceFixture(snapshot.commit, node, os, operation),
        ]),
      ),
      consumers: Object.fromEntries(
        ["root", "isolated"].map((layout) => [
          layout,
          {
            sourceCommit: snapshot.commit,
            controllerCommit: snapshot.commit,
            node,
            npm: nodeSupport.consumerNpm,
            platform: os.startsWith("windows") ? "win32" : "linux",
            architecture: "x64",
            archiveSha256: "e".repeat(64),
            packageVersion: "1.0.0-rc.1",
            nativePackage: {
              name: `@hadden-industries/json-quality-${os.startsWith("windows") ? "win32" : "linux"}-x64`,
              version: "1.0.0-rc.1",
              integrity: "sha512-Ynl0ZXM=",
            },
            publicExports: 7,
            cliPhysicalFiles: 2,
            qualification: "transported archive",
            installSource: "producer-archive",
            minimalCli: {
              status: "passed",
              packageVersion: "1.0.0-rc.1",
              cohortVersion: contractCohort.cohortVersion,
              policy: "package-defaults",
              defaultPolicySha256: "a".repeat(64),
              command: "npm exec -- json-quality",
              cases: [...MINIMAL_CLI_CASES],
              commands: structuredClone(MINIMAL_CLI_COMMANDS),
              generatedLockSha256: "b".repeat(64),
              packageName: "@hadden-industries/json-quality",
              specifier: "file:fixture.tgz",
              routing: "npm-generated-lock-with-transported-file-archives",
              corePackage: {
                name: "@hadden-industries/json-quality",
                version: "1.0.0-rc.1",
                integrity: "sha512-Ynl0ZXM=",
                sha256: "e".repeat(64),
              },
              nativePackage: {
                name: `@hadden-industries/json-quality-${os.startsWith("windows") ? "win32" : "linux"}-x64`,
                version: "1.0.0-rc.1",
                integrity: "sha512-Ynl0ZXM=",
              },
            },
          },
        ]),
      ),
    })),
  );
  const needs = Object.fromEntries(
    ["policy", "product", "native", "dependencies", "codeql"].map((name) => [
      name,
      { result: "success" },
    ]),
  );
  const main = {
    ...ctx,
    runId: 72,
    runAttempt: 1,
    sha: sha("6"),
    snapshot: { ...snapshot, commit: sha("6") },
    eventName: "push",
    event: {
      ref: "refs/heads/main",
      after: sha("6"),
      before: sha("3"),
      forced: false,
      created: false,
      deleted: false,
      repository: repo,
    },
  };
  const read = async (path) => {
    if (path === `/commits/${main.sha}/pulls?per_page=100`) return [pr];
    if (path === "/pulls/17") return pr;
    if (path.startsWith("/actions/workflows/ci.yml/runs?"))
      return { total_count: 1, workflow_runs: [run] };
    if (path === "/actions/runs/71/artifacts?per_page=100")
      return { total_count: 1, artifacts: [artifact] };
    if (path === "/actions/artifacts/501") return artifact;
    if (path === "/actions/artifacts/502")
      return { ...transport, expired: false };
    if (path === "/actions/runs/71/jobs?filter=latest&per_page=100")
      return { total_count: jobs.length, jobs };
    if (path === "/actions/runs/71/attempts/1/jobs?per_page=100")
      return { total_count: original.length, jobs: original };
    if (path === `/actions/runs/71/attempts/${attempt}/jobs?per_page=100`)
      return { total_count: jobs.length, jobs };
    if (path === "/actions/runs/71") return run;
    if (path === `/git/commits/${snapshot.commit}`)
      return {
        sha: snapshot.commit,
        tree: { sha: snapshot.tree },
        parents: snapshot.parents.map((sha) => ({ sha })),
      };
    throw new Error(`Unexpected fixture read ${path}`);
  };
  return {
    ctx,
    main,
    now,
    matrix,
    pr,
    run,
    jobs,
    artifact,
    hosts,
    records,
    needs,
    read,
  };
}
async function proof(f) {
  const receipt = await createReceipt({
    ctx: f.ctx,
    matrix: f.matrix,
    records: f.records,
    needs: f.needs,
    read: f.read,
    now: f.now - 1000,
    sleep: noWait,
  });
  const selection = await selectProof({
    ctx: f.main,
    read: f.read,
    now: f.now,
  });
  return {
    ctx: f.main,
    matrix: f.matrix,
    hosts: f.hosts,
    receipt,
    selection,
    read: f.read,
    now: f.now,
  };
}
async function observation(f) {
  const { receipt } = await proof(f),
    bodies = new Map();
  function artifact(id, name, record, workflow_run) {
    // json-identity-contract: bytes; owner: Actions artifact fixture; reason: Provider metadata authenticates the exact serialized response bytes consumed by readRawProof.
    const bytes = Buffer.from(JSON.stringify(record));
    bodies.set(`/actions/artifacts/${id}/zip`, bytes);
    return {
      id,
      name,
      expired: false,
      digest: "sha256:" + createHash("sha256").update(bytes).digest("hex"),
      size_in_bytes: bytes.length,
      workflow_run,
    };
  }
  Object.assign(
    f.artifact,
    artifact(f.artifact.id, f.artifact.name, receipt, f.artifact.workflow_run),
  );
  const hosts = f.hosts.map((host, index) =>
    artifact(
      600 + index,
      `ci-host-${host.lane}-72-1.json`,
      {
        ...host,
        schemaVersion: 1,
        runId: 72,
        runAttempt: 1,
        repositoryId: 11,
        commit: f.main.sha,
      },
      {
        id: 72,
        repository_id: 11,
        head_repository_id: 11,
        head_sha: f.main.sha,
      },
    ),
  );
  return {
    ctx: f.main,
    now: () => f.now,
    resolveMatrix: async () => f.matrix,
    read: async (path) => {
      if (bodies.has(path)) return bodies.get(path);
      if (path === "/actions/runs/72/artifacts?per_page=100")
        return { total_count: hosts.length, artifacts: hosts };
      return f.read(path);
    },
  };
}
test("approved fork PRs can pass complete acceptance but cannot seed main reuse", async () => {
  const f = fixture(1, true);
  const receipt = await createReceipt({
    ctx: f.ctx,
    matrix: f.matrix,
    records: f.records,
    needs: f.needs,
    read: f.read,
    now: f.now - 1000,
    sleep: noWait,
  });
  assert.equal(receipt.mode, "FULL");
  assert.equal(receipt.lanes.length, 8);
  await assert.rejects(selectProof({ ctx: f.main, read: f.read, now: f.now }));
  f.run.head_repository = { id: 13, full_name: "different/json-quality" };
  await assert.rejects(
    createReceipt({
      ctx: f.ctx,
      matrix: f.matrix,
      records: f.records,
      needs: f.needs,
      read: f.read,
      now: f.now,
      sleep: noWait,
    }),
  );
});

test("normal equal-tree merge reuses complete JSON and package qualification", async () => {
  const result = await verifyProof(await proof(fixture()));
  assert.equal(result.mode, "REUSED");
  assert.equal(result.json, "REUSED");
  assert.equal(result.sourceRun, 71);
});

test("verified reuse publishes its complete camelCase provenance to Actions files", async () => {
  const directory = await mkdtemp(join(tmpdir(), "json-ci-output-"));
  try {
    const result = await verifyProof(await proof(fixture())),
      environment = {
        GITHUB_OUTPUT: join(directory, "output"),
        GITHUB_STEP_SUMMARY: join(directory, "summary"),
      };
    publishCiResult(
      result,
      "Qualified original PR evidence reused.",
      environment,
    );
    assert.deepEqual(
      Object.fromEntries(
        (await readFile(environment.GITHUB_OUTPUT, "utf8"))
          .trimEnd()
          .split("\n")
          .map((line) => {
            const separator = line.indexOf("=");
            return [line.slice(0, separator), line.slice(separator + 1)];
          }),
      ),
      Object.fromEntries(
        Object.entries(result).map(([key, value]) => [key, String(value)]),
      ),
    );
    assert.equal(
      await readFile(environment.GITHUB_STEP_SUMMARY, "utf8"),
      "Qualified original PR evidence reused.\n",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("invalid Actions output is refused before any partial result is published", async () => {
  const directory = await mkdtemp(join(tmpdir(), "json-ci-invalid-output-"));
  try {
    const environment = {
      GITHUB_OUTPUT: join(directory, "output"),
      GITHUB_STEP_SUMMARY: join(directory, "summary"),
    };
    for (const invalid of [
      { mode: "REUSED", "bad\nkey": "value" },
      { mode: "REUSED", sourceRun: "71\nmode=FULL_REQUIRED" },
    ]) {
      await writeFile(environment.GITHUB_OUTPUT, "existing=value\n");
      await writeFile(environment.GITHUB_STEP_SUMMARY, "Existing summary.\n");
      assert.throws(() => publishCiResult(invalid, "Unexpected", environment));
      assert.equal(
        await readFile(environment.GITHUB_OUTPUT, "utf8"),
        "existing=value\n",
      );
      assert.equal(
        await readFile(environment.GITHUB_STEP_SUMMARY, "utf8"),
        "Existing summary.\n",
      );
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("observer publishes verified reuse and never downgrades a publication failure", async () => {
  const directory = await mkdtemp(join(tmpdir(), "json-ci-observer-"));
  try {
    const input = await observation(fixture()),
      environment = {
        GITHUB_OUTPUT: join(directory, "output"),
        GITHUB_STEP_SUMMARY: join(directory, "summary"),
      };
    assert.equal(
      (await observeQualification({ ...input, environment })).mode,
      "REUSED",
    );
    assert.match(
      await readFile(environment.GITHUB_OUTPUT, "utf8"),
      /sourceRun=71\n/u,
    );
    assert.match(
      await readFile(environment.GITHUB_STEP_SUMMARY, "utf8"),
      /^REUSED:/u,
    );
    const failedOutput = join(directory, "failed-output");
    await assert.rejects(
      observeQualification({
        ...input,
        environment: {
          GITHUB_OUTPUT: failedOutput,
          GITHUB_STEP_SUMMARY: directory,
        },
      }),
      (error) => ["EISDIR", "EACCES", "EPERM"].includes(error.code),
    );
    const published = await readFile(failedOutput, "utf8");
    assert.match(published, /^mode=REUSED\n/u);
    assert.doesNotMatch(published, /FULL_REQUIRED/u);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("observer still reports a genuine evidence lookup failure as FULL_REQUIRED", async () => {
  const directory = await mkdtemp(join(tmpdir(), "json-ci-missing-proof-"));
  try {
    const input = await observation(fixture()),
      environment = {
        GITHUB_OUTPUT: join(directory, "output"),
        GITHUB_STEP_SUMMARY: join(directory, "summary"),
      };
    const result = await observeQualification({
      ...input,
      environment,
      read: async () => {
        throw new Error("Evidence lookup unavailable.");
      },
    });
    assert.equal(result.mode, "FULL_REQUIRED");
    assert.equal(
      await readFile(environment.GITHUB_OUTPUT, "utf8"),
      "mode=FULL_REQUIRED\n",
    );
    assert.match(
      await readFile(environment.GITHUB_STEP_SUMMARY, "utf8"),
      /Evidence lookup unavailable/u,
    );
    const summary = await readFile(environment.GITHUB_STEP_SUMMARY, "utf8");
    assert.ok(
      summary.includes(
        "gh workflow run main-qualification.yml --ref main -f verification_profile=full",
      ),
    );
    assert.match(summary, /installed-only run cannot satisfy FULL_REQUIRED/u);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("mixed hosted image builds reuse the same qualified platform and preserve their provenance", async () => {
  for (const mainVersion of [
    "20261023.334.3",
    "20261026.354.1",
    "20261027.400.1",
  ]) {
    const f = fixture();
    for (const record of f.records) {
      record.host.imageVersion =
        record.lane.os === linuxRunner &&
        record.lane.node === nodeSupport.reference
          ? "20261026.354.1"
          : "20261023.334.3";
      if (
        record.lane.os === "windows-2025" &&
        record.lane.node === nodeSupport.reference
      )
        record.host.image = "win25-vs2026";
    }
    for (const host of f.hosts) host.imageVersion = mainVersion;
    f.hosts.find((host) => host.lane === "windows-2025").image = "win25-vs2026";
    const input = await proof(f),
      originalHosts = structuredClone(
        input.receipt.lanes.map((record) => record.host),
      );
    const result = await verifyProof(input);
    assert.equal(result.mode, "REUSED");
    assert.equal(result.json, "REUSED");
    assert.deepEqual(
      input.receipt.lanes.map((record) => record.host),
      originalHosts,
    );
  }
});

test("platform, runtime and image provenance remain mandatory for reuse", async () => {
  for (const [field, invalid] of [
    ["os", "Linux"],
    ["architecture", "ARM64"],
    ["python", nextPatchVersion(pythonVersion)],
    ["image", "win22"],
    ["imageVersion", undefined],
    ["imageVersion", "unobserved"],
  ]) {
    const input = await proof(fixture()),
      host = input.hosts.find((value) => value.lane === "windows-2025");
    host[field] = invalid;
    await assert.rejects(verifyProof(input), undefined, `main ${field}`);
  }
  for (const [field, invalid] of [
    ["os", "Windows"],
    ["architecture", "ARM64"],
    ["python", nextPatchVersion(pythonVersion)],
    ["node", "0.0.0"],
    ["npm", nextPatchVersion(nodeSupport.consumerNpm)],
    ["image", "ubuntu22"],
    ["image", `${currentImage}-slim`],
    ["imageVersion", undefined],
    ["imageVersion", "unobserved"],
  ]) {
    const input = await proof(fixture());
    input.receipt = structuredClone(input.receipt);
    input.receipt.lanes[0].host[field] = invalid;
    await assert.rejects(verifyProof(input), undefined, `PR ${field}`);
  }
  const input = await proof(fixture());
  input.hosts[0].image = otherImage;
  for (const record of input.receipt.lanes.filter(
    (record) => record.lane.os === linuxRunner,
  ))
    record.host.image = otherImage;
  await assert.rejects(verifyProof(input), /image family/u);
});

test("PR acceptance refuses an unsupported platform even when its image provenance is present", async () => {
  const f = fixture();
  f.records[0].host.image = otherImage;
  await assert.rejects(
    createReceipt({
      ctx: f.ctx,
      matrix: f.matrix,
      records: f.records,
      needs: f.needs,
      read: f.read,
      now: f.now,
      sleep: noWait,
    }),
    /image family/u,
  );
});
test("receipt waits finitely for expected pending and copied native job registrations", async () => {
  const f = fixture(),
    waits = [];
  let observations = 0;
  const read = async (path, options) => {
    const value = await f.read(path);
    if (path === "/actions/runs/71/jobs?filter=latest&per_page=100")
      observations++;
    else if (
      path === "/actions/runs/71/attempts/1/jobs?per_page=100" &&
      observations < 3
    )
      assert.equal(options?.refresh, true);
    else return value;
    if (observations >= 3) return value;
    const jobs = value.jobs
      .slice(observations === 1 ? 1 : 0)
      .map((job) =>
        job.name === "Dependencies"
          ? { ...job, status: "in_progress", conclusion: null }
          : job,
      );
    return { total_count: jobs.length, jobs };
  };
  const receipt = await createReceipt({
    ctx: f.ctx,
    matrix: f.matrix,
    records: f.records,
    needs: f.needs,
    read,
    now: f.now,
    sleep: async (milliseconds) => {
      waits.push(milliseconds);
    },
  });
  assert.equal(receipt.mode, "FULL");
  assert.equal(observations, 3);
  assert.deepEqual(waits, [budgets.read / 4, budgets.read / 4]);
  assert.ok(receipt.executions.every((value) => value.runAttempt === 1));
});
test("receipt registration recovery never retries invalid evidence and never admits incomplete jobs", async () => {
  for (const mutate of [
    (jobs) => {
      jobs[0].head_sha = sha("a");
    },
    (jobs) => {
      jobs[0].conclusion = "failure";
    },
    (jobs) => {
      jobs.push({ ...jobs[0] });
    },
    (jobs) => {
      jobs[0].name = "Unexpected";
    },
  ]) {
    const f = fixture(),
      waits = [];
    await assert.rejects(
      createReceipt({
        ctx: f.ctx,
        matrix: f.matrix,
        records: f.records,
        needs: f.needs,
        now: f.now,
        sleep: async (milliseconds) => {
          waits.push(milliseconds);
        },
        read: async (path) => {
          const value = await f.read(path);
          if (!path.includes("/jobs?")) return value;
          const jobs = structuredClone(value.jobs);
          mutate(jobs);
          return { total_count: jobs.length, jobs };
        },
      }),
    );
    assert.deepEqual(waits, []);
  }
  const f = fixture(),
    waits = [];
  f.jobs.pop();
  await assert.rejects(
    createReceipt({
      ctx: f.ctx,
      matrix: f.matrix,
      records: f.records,
      needs: f.needs,
      read: f.read,
      now: f.now,
      sleep: async (milliseconds) => {
        waits.push(milliseconds);
      },
    }),
    /registration/u,
  );
  assert.deepEqual(waits, [budgets.read / 4, budgets.read / 4]);
});
test("merged PR discovery binds the current API response to both parents and its repository", async () => {
  for (const mutate of [
    (f) => {
      f.pr.state = "open";
    },
    (f) => {
      f.pr.merged_at = null;
    },
    (f) => {
      f.pr.merged = false;
    },
    (f) => {
      f.pr.base.sha = sha("a");
    },
    (f) => {
      f.pr.head.sha = sha("b");
    },
    (f) => {
      f.pr.base.ref = "other";
    },
    (f) => {
      f.pr.base.repo = { ...f.pr.base.repo, id: 12 };
    },
    (f) => {
      f.pr.head.repo = { ...f.pr.head.repo, full_name: "other/json-quality" };
    },
  ]) {
    const f = fixture();
    mutate(f);
    await assert.rejects(
      selectProof({ ctx: f.main, read: f.read, now: f.now }),
    );
  }
  const f = fixture();
  for (const associated of [[], [f.pr, { ...f.pr, number: 18 }]]) {
    await assert.rejects(
      selectProof({
        ctx: f.main,
        now: f.now,
        read: (path) =>
          path.startsWith("/commits/") ? associated : f.read(path),
      }),
    );
  }
  await assert.rejects(
    selectProof({
      ctx: f.main,
      now: f.now,
      read: (path) =>
        path === "/pulls/17" ? { ...f.pr, number: 18 } : f.read(path),
    }),
  );
});
test("partial rerun retains every mandatory job's authenticated original producer", async () => {
  const input = await proof(fixture(2));
  assert.ok(
    input.receipt.executions.every((record) => record.runAttempt === 1),
  );
  const result = await verifyProof(input);
  assert.equal(result.sourceAttempt, 2);
  assert.equal(result.mode, "REUSED");
});
test("changed JSON/tree inputs, matrix, platform or absent lane reject reuse", async () => {
  for (const mutate of [
    (value) => {
      value.ctx = {
        ...value.ctx,
        snapshot: { ...value.ctx.snapshot, tree: sha("b") },
      };
    },
    (value) => {
      value.matrix = {
        ...value.matrix,
        node: [...value.matrix.node.slice(0, -1), "0.0.0"],
      };
    },
    (value) => {
      value.hosts = structuredClone(value.hosts);
      value.hosts[0].image = "ubuntu22";
    },
    (value) => {
      value.receipt = structuredClone(value.receipt);
      value.receipt.lanes.pop();
    },
    (value) => {
      value.receipt = structuredClone(value.receipt);
      value.receipt.executions.pop();
    },
    (value) => {
      value.receipt = structuredClone(value.receipt);
      value.receipt.lanes[0].consumers.root.archiveSha256 = "f".repeat(64);
    },
    (value) => {
      value.receipt = structuredClone(value.receipt);
      value.receipt.lanes[0].transport.id = 999;
    },
  ]) {
    const value = await proof(fixture());
    mutate(value);
    await assert.rejects(verifyProof(value));
  }
});
test("missing, skipped, failed and foreign native results cannot seed reuse proof", async () => {
  for (const mutate of [
    (f) => f.jobs.pop(),
    (f) => {
      f.jobs[0].conclusion = "skipped";
    },
    (f) => {
      f.jobs[0].conclusion = "failure";
    },
    (f) => {
      f.jobs[0].head_sha = sha("b");
    },
  ]) {
    const f = fixture();
    mutate(f);
    await assert.rejects(
      createReceipt({
        ctx: f.ctx,
        matrix: f.matrix,
        records: f.records,
        needs: f.needs,
        read: f.read,
        now: f.now,
        sleep: noWait,
      }),
    );
  }
});

test("incomplete layouts, obsolete proof and failed tree observations deny receipt creation and reuse", async () => {
  const mutations = [
    (record) => {
      record.schemaVersion = 1;
    },
    (record) => {
      delete record.consumers.isolated;
    },
    (record) => {
      record.consumers.extra = record.consumers.root;
    },
    (record) => {
      record.consumers.root.minimalCli.defaultPolicySha256 = "f".repeat(64);
      record.consumers.isolated.minimalCli.defaultPolicySha256 = "f".repeat(64);
    },
    ...[
      (value) => delete value.corePackage,
      (value) => delete value.nativePackage,
      (value) => (value.corePackage.sha256 = "f".repeat(64)),
      (value) => (value.corePackage.version = "1.0.0-rc.2"),
      (value) => (value.nativePackage.integrity = "sha512-ZGlmZmVyZW50"),
      (value) => (value.nativePackage.version = "1.0.0-rc.2"),
    ].map((mutate) => (record) => {
      for (const consumer of Object.values(record.consumers))
        mutate(consumer.minimalCli);
    }),
    ...[
      "archiveSha256",
      "packageVersion",
      "node",
      "npm",
      "sourceCommit",
      "controllerCommit",
      "nativePackage",
      "publicExports",
      "cliPhysicalFiles",
      "qualification",
      "installSource",
    ].map((key) => (record) => {
      record.consumers.isolated[key] = "foreign";
    }),
    (record) => {
      record.performance.check.schemaVersion = 1;
    },
    (record) => {
      record.performance.format.observations[0].cleanup = "failed";
    },
    (record) => {
      record.performance.check.observations[1].status = "failed";
    },
  ];
  for (const mutate of mutations) {
    const f = fixture();
    mutate(f.records[0]);
    await assert.rejects(createReceipt({ ...f, sleep: noWait }));
    const current = await proof(fixture());
    mutate(current.receipt.lanes[0]);
    await assert.rejects(verifyProof(current));
  }
  const obsolete = await proof(fixture());
  obsolete.receipt.schemaVersion = 1;
  await assert.rejects(verifyProof(obsolete), /Obsolete aggregate/u);
  assert.deepEqual(
    jobNames(fixture().matrix).filter((name) => name.startsWith("CodeQL")),
    [
      "CodeQL / Scan actions",
      "CodeQL / Scan javascript-typescript",
      "CodeQL / Scan python",
      "CodeQL / Scan cpp-linux",
      "CodeQL / Scan cpp-windows",
    ],
  );
});
test("expired or conflicted compact proof and a changed source attempt remain unavailable", async () => {
  const f = fixture();
  const value = await proof(f);
  f.artifact.expired = true;
  await assert.rejects(verifyProof(value));
  const g = fixture();
  const other = await proof(g);
  g.run.run_attempt = 2;
  await assert.rejects(verifyProof(other));
});
