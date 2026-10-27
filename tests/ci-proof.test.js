// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import {
  createReceipt,
  selectProof,
  verifyProof,
  jobNames,
  repository,
  workflow,
} from "../scripts/ci-proof.js";
import { nodeSupport } from "../scripts/node-matrix.js";
import { pythonVersion } from "../scripts/ci-host.js";
import { budgets } from "../scripts/qualification-budgets.js";

const noWait = async () => {};

const sha = (character) => character.repeat(40);
function fixture(attempt = 1, fork = false) {
  const now = Date.parse("2026-10-27T12:00:00Z"),
    repo = { id: 11, full_name: repository, default_branch: "main" };
  const matrix = {
    os: [...nodeSupport.platforms],
    node: ["22.13.0", "22.23.4", "24.22.1", "26.9.0"],
  };
  const snapshot = {
    commit: sha("1"),
    tree: sha("2"),
    parents: [sha("3"), sha("4")],
    workflow: sha("5"),
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
    image: lane.startsWith("windows") ? "win25" : "ubuntu24",
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
      schemaVersion: 1,
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
      consumer: {
        archiveSha256: "e".repeat(64),
        packageVersion: "1.0.0-rc.1",
        nativePackage: {
          name: `@hadden-industries/json-quality-${os.startsWith("windows") ? "win32" : "linux"}-x64`,
          version: "1.0.0-rc.1",
          integrity: "sha512-Ynl0ZXM=",
        },
        publicExports: 6,
        cliPhysicalFiles: 2,
        qualification: "transported archive",
        installSource: "producer-archive",
      },
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
test("changed JSON/tree inputs, matrix, image or absent lane reject reuse", async () => {
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
        node: [...value.matrix.node.slice(0, -1), "26.10.0"],
      };
    },
    (value) => {
      value.hosts = structuredClone(value.hosts);
      value.hosts[0].imageVersion = "20261021.2.0";
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
      value.receipt.lanes[0].consumer.archiveSha256 = "f".repeat(64);
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
