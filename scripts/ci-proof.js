// SPDX-License-Identifier: AGPL-3.0-only
// Admission structure adapted from Markdown Quality's ci-reuse.js; producing
// attempts follow OwlAPI's authenticated execution-identity correction.
import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { nodeSupport } from "./node-matrix.js";
import { validateFrozenMatrix } from "./release-contract.js";
import { sameJobExecution } from "./github-job-execution.js";
import { assertHostedPlatform } from "./ci-host.js";
import { budgets } from "./qualification-budgets.js";

export const repository = "Hadden-Industries/json-quality";
export const workflow = ".github/workflows/ci.yml";
export const acceptance = "CI / acceptance";
const positive = (value) => Number.isSafeInteger(value) && value > 0;
const sha = (value) =>
  typeof value === "string" && /^[a-f0-9]{40}$/u.test(value);
const equal = (left, right, message) =>
  assert.ok(isDeepStrictEqual(left, right), message);
export function matrixLanes(matrix) {
  validateFrozenMatrix(matrix, nodeSupport);
  return matrix.os.flatMap((os) => matrix.node.map((node) => ({ os, node })));
}
export function jobNames(matrix) {
  return [
    "Candidate policy",
    "Dependencies",
    "CodeQL / Scan actions",
    "CodeQL / Scan javascript-typescript",
    "Product / Reference producer",
    ...matrixLanes(matrix).map(
      ({ os, node }) => `Product / Qualify ${os} / Node ${node}`,
    ),
    "Product / Complete runtime qualification",
    "Native / Native / win32-x64",
    "Native / Native / linux-x64",
    "Native / Native / address and undefined behavior sanitizers",
    acceptance,
  ];
}
export function requireResults(needs) {
  equal(
    Object.keys(needs).sort(),
    ["dependencies", "native", "policy", "product", "codeql"].sort(),
    "Incomplete mandatory predecessor graph",
  );
  for (const [name, value] of Object.entries(needs))
    assert.equal(value.result, "success", `${name} did not succeed`);
}
function context(ctx) {
  assert.equal(ctx.repository, repository);
  assert.ok(
    positive(ctx.repositoryId) &&
      positive(ctx.runId) &&
      positive(ctx.runAttempt),
  );
  for (const key of ["commit", "tree", "workflow"])
    assert.ok(sha(ctx.snapshot?.[key]));
  assert.equal(ctx.snapshot.commit, ctx.sha);
  assert.ok(
    Array.isArray(ctx.snapshot.parents) && ctx.snapshot.parents.every(sha),
  );
}
function pull(pr, ctx, sameRepository = true) {
  assert.ok(positive(pr.number));
  assert.equal(pr.base.ref, "main");
  for (const side of sameRepository ? ["base", "head"] : ["base"]) {
    assert.equal(pr[side].repo.full_name, repository);
    assert.equal(pr[side].repo.id, ctx.repositoryId);
  }
  assert.ok(positive(pr.head.repo.id));
  assert.match(pr.head.repo.full_name, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u);
  equal(
    ctx.snapshot.parents,
    [pr.base.sha, pr.head.sha],
    "Candidate parents changed",
  );
}
function runIdentity(
  run,
  ctx,
  headRepository = { id: ctx.repositoryId, full_name: repository },
) {
  assert.ok(
    positive(run.id) && positive(run.run_attempt) && run.run_attempt <= 8,
  );
  assert.equal(run.repository.full_name, repository);
  assert.equal(run.repository.id, ctx.repositoryId);
  assert.equal(run.head_repository.id, headRepository.id);
  assert.equal(run.head_repository.full_name, headRepository.full_name);
  assert.equal(run.event, "pull_request");
  assert.equal(run.path, workflow);
}
function inventory(value, run, matrix, complete = true, registering = false) {
  assert.ok(Array.isArray(value.jobs));
  assert.equal(
    value.total_count,
    value.jobs.length,
    "Incomplete provider job pagination",
  );
  const expected = jobNames(matrix),
    names = value.jobs.map((job) => job.name);
  assert.equal(new Set(names).size, names.length, "Duplicated source jobs");
  assert.ok(
    names.every((name) => expected.includes(name)),
    "Extra source jobs",
  );
  if (!registering) equal(names.sort(), expected.sort(), "Missing source jobs");
  for (const job of value.jobs) {
    assert.ok(positive(job.id));
    assert.equal(job.run_id, run.id);
    assert.equal(job.head_sha, run.head_sha);
    if (!complete && job.name === acceptance) continue;
    if (registering && ["queued", "in_progress"].includes(job.status)) {
      assert.equal(job.conclusion, null);
      continue;
    }
    assert.equal(job.status, "completed");
    assert.equal(
      job.conclusion,
      "success",
      `${job.name} did not execute successfully`,
    );
  }
  return value.jobs;
}
/** Native needs are already successful; wait only for their API registration. */
async function receiptJobs(run, matrix, read, sleep) {
  const latestPath = `/actions/runs/${run.id}/jobs?filter=latest&per_page=100`;
  const attemptPath = `/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`;
  const expected = jobNames(matrix).length;
  for (let observation = 0; observation < 3; observation++) {
    const latest = inventory(await read(latestPath), run, matrix, false, true);
    const attempt = inventory(
      await read(attemptPath, { refresh: true }),
      run,
      matrix,
      false,
      true,
    );
    assert.ok(attempt.every((job) => job.run_attempt === run.run_attempt));
    const settled = (jobs) =>
      jobs.length === expected &&
      jobs.every(
        (job) => job.name === acceptance || job.status === "completed",
      );
    if (settled(latest) && settled(attempt)) return latest;
    assert.ok(
      observation < 2,
      "Native job registration did not settle within its observation bound",
    );
    const delayMs = budgets.read / 4;
    console.error(
      JSON.stringify({
        phase: "native-job-registration",
        state: "pending",
        observation: observation + 1,
        latestJobs: latest.length,
        attemptJobs: attempt.length,
        expectedJobs: expected,
        delayMs,
      }),
    );
    await sleep(delayMs);
  }
}
export async function verifyProducingAttempt(job, attempt, run, read) {
  assert.ok(positive(attempt) && attempt <= run.run_attempt);
  const original = await read(
    `/actions/runs/${run.id}/attempts/${attempt}/jobs?per_page=100`,
  );
  assert.equal(original.total_count, original.jobs.length);
  assert.equal(
    new Set(original.jobs.map((value) => value.name)).size,
    original.jobs.length,
  );
  assert.ok(
    original.jobs.every(
      (value) =>
        value.run_id === run.id &&
        value.head_sha === run.head_sha &&
        value.run_attempt === attempt,
    ),
  );
  const first = original.jobs.find((value) => value.name === job.name);
  assert.equal(first?.status, "completed");
  assert.equal(first?.conclusion, "success");
  assert.ok(
    sameJobExecution(first, job),
    "Claimed producer differs from latest authenticated execution",
  );
  if (attempt > 1) {
    const previous = await read(
      `/actions/runs/${run.id}/attempts/${attempt - 1}/jobs?per_page=100`,
    );
    assert.equal(previous.total_count, previous.jobs.length);
    assert.ok(
      previous.jobs.every(
        (value) =>
          value.run_id === run.id &&
          value.head_sha === run.head_sha &&
          value.run_attempt === attempt - 1,
      ),
    );
    const earlier = previous.jobs.find((value) => value.name === job.name);
    assert.ok(
      !earlier ||
        earlier.conclusion === "skipped" ||
        !sameJobExecution(first, earlier),
      "Retained job was relabelled as a new producer",
    );
  }
}
async function originalExecution(job, run, read) {
  for (let attempt = 1; attempt <= run.run_attempt; attempt++) {
    const inventory = await read(
      `/actions/runs/${run.id}/attempts/${attempt}/jobs?per_page=100`,
    );
    assert.equal(inventory.total_count, inventory.jobs.length);
    assert.equal(
      new Set(inventory.jobs.map((value) => value.name)).size,
      inventory.jobs.length,
    );
    assert.ok(
      inventory.jobs.every(
        (value) =>
          value.run_id === run.id &&
          value.head_sha === run.head_sha &&
          value.run_attempt === attempt,
      ),
    );
    const original = inventory.jobs.find((value) => value.name === job.name);
    if (!original || original.conclusion === "skipped") continue;
    if (sameJobExecution(original, job)) {
      assert.equal(original.status, "completed");
      assert.equal(original.conclusion, "success");
      return {
        runAttempt: attempt,
        job: Object.fromEntries(
          [
            "name",
            "run_id",
            "head_sha",
            "runner_id",
            "started_at",
            "completed_at",
          ].map((key) => [key, original[key]]),
        ),
      };
    }
  }
  throw new Error("No authenticated original job execution");
}
function lanes(records, ctx, matrix) {
  assert.equal(
    records.length,
    matrixLanes(matrix).length,
    "Incomplete consumer receipts",
  );
  return matrixLanes(matrix).map((lane) => {
    const matches = records.filter((value) =>
      isDeepStrictEqual(value.lane, lane),
    );
    assert.equal(matches.length, 1, "Missing or duplicate consumer receipt");
    const record = matches[0];
    assert.equal(record.schemaVersion, 1);
    assert.equal(record.status, "passed");
    assert.equal(record.repositoryId, ctx.repositoryId);
    assert.equal(record.runId, ctx.runId);
    assert.ok(
      positive(record.runAttempt) && record.runAttempt <= ctx.runAttempt,
    );
    equal(
      record.snapshot,
      ctx.snapshot,
      "Consumer ran different source, JSON, policy, generated or native inputs",
    );
    assert.equal(record.host.node, lane.node);
    assert.equal(record.host.npm, nodeSupport.consumerNpm);
    assertHostedPlatform(record.host, lane.os);
    assert.match(record.consumer.archiveSha256, /^[a-f0-9]{64}$/u);
    assert.equal(record.consumer.publicExports, 6);
    assert.equal(record.consumer.cliPhysicalFiles, 2);
    assert.equal(record.consumer.qualification, "transported archive");
    assert.equal(record.consumer.installSource, "producer-archive");
    assert.equal(
      record.consumer.nativePackage.name,
      `@hadden-industries/json-quality-${lane.os.startsWith("windows") ? "win32" : "linux"}-x64`,
    );
    assert.equal(
      record.consumer.nativePackage.version,
      record.consumer.packageVersion,
    );
    assert.match(
      record.consumer.nativePackage.integrity,
      /^sha512-[A-Za-z0-9+/]+={0,2}$/u,
    );
    assert.ok(
      positive(record.transport.id) && positive(record.transport.size_in_bytes),
    );
    assert.match(record.transport.digest, /^sha256:[a-f0-9]{64}$/u);
    assert.equal(record.transport.workflow_run.id, ctx.runId);
    assert.equal(record.transport.workflow_run.repository_id, ctx.repositoryId);
    assert.equal(
      record.transport.workflow_run.head_repository_id,
      ctx.eventName === "pull_request"
        ? ctx.event.pull_request.head.repo.id
        : ctx.repositoryId,
    );
    if (records[0]) {
      equal(
        record.transport,
        records[0].transport,
        "Lanes did not consume the single frozen producer artifact",
      );
      assert.equal(
        record.consumer.archiveSha256,
        records[0].consumer.archiveSha256,
      );
      assert.equal(
        record.consumer.packageVersion,
        records[0].consumer.packageVersion,
      );
    }
    return record;
  });
}
export async function createReceipt({
  ctx,
  matrix,
  records,
  needs,
  read,
  now = Date.now(),
  sleep = delay,
}) {
  context(ctx);
  assert.equal(ctx.eventName, "pull_request");
  pull(ctx.event.pull_request, ctx, false);
  requireResults(needs);
  const run = await read(`/actions/runs/${ctx.runId}`);
  runIdentity(run, ctx, ctx.event.pull_request.head.repo);
  assert.equal(run.run_attempt, ctx.runAttempt);
  assert.equal(run.head_sha, ctx.event.pull_request.head.sha);
  const executed = lanes(records, ctx, matrix);
  assert.equal(executed[0].transport.workflow_run.head_sha, run.head_sha);
  const jobs = await receiptJobs(run, matrix, read, sleep);
  const executions = [];
  for (const job of jobs.filter((value) => value.name !== acceptance))
    executions.push(await originalExecution(job, run, read));
  const producer = executions.find(
    (value) => value.job.name === "Product / Reference producer",
  );
  assert.ok(
    new RegExp(
      `^qualified-producer-${producer.runAttempt}(?:-recovery-[23])?$`,
      "u",
    ).test(executed[0].transport.name),
    "Archive name differs from original producing attempt",
  );
  for (const record of executed) {
    const job = jobs.find(
      (value) =>
        value.name ===
        `Product / Qualify ${record.lane.os} / Node ${record.lane.node}`,
    );
    await verifyProducingAttempt(job, record.runAttempt, run, read);
  }
  return {
    schemaVersion: 1,
    mode: "FULL",
    repository,
    repositoryId: ctx.repositoryId,
    runId: ctx.runId,
    runAttempt: ctx.runAttempt,
    pullRequest: ctx.event.number,
    recordedAt: new Date(now).toISOString(),
    snapshot: ctx.snapshot,
    matrix,
    jobs: jobNames(matrix),
    lanes: executed,
    executions,
  };
}
export async function selectProof({ ctx, read, now = Date.now() }) {
  context(ctx);
  assert.equal(ctx.eventName, "push");
  assert.equal(ctx.event.ref, "refs/heads/main");
  assert.equal(ctx.event.after, ctx.sha);
  assert.equal(ctx.event.repository.id, ctx.repositoryId);
  assert.equal(ctx.event.repository.full_name, repository);
  assert.equal(ctx.event.repository.default_branch, "main");
  for (const flag of ["forced", "created", "deleted"])
    assert.equal(ctx.event[flag], false);
  assert.equal(ctx.snapshot.parents.length, 2);
  assert.equal(ctx.snapshot.parents[0], ctx.event.before);
  const candidates = await read(`/commits/${ctx.sha}/pulls?per_page=100`);
  assert.ok(Array.isArray(candidates) && candidates.length < 100);
  // API 2026-03-10 omits merge_commit_sha. Like OwlAPI, bind the exact
  // commit's associated merged PR to both Git parents and repository IDs.
  const matching = candidates.filter(
    (pr) =>
      pr.merged_at &&
      pr.state === "closed" &&
      pr.base?.ref === "main" &&
      pr.base.sha === ctx.snapshot.parents[0] &&
      pr.head?.sha === ctx.snapshot.parents[1] &&
      [pr.base, pr.head].every(
        (side) =>
          side.repo?.id === ctx.repositoryId &&
          side.repo.full_name === repository,
      ),
  );
  assert.equal(matching.length, 1, "No unique ordinary merged PR");
  const pr = await read(`/pulls/${matching[0].number}`);
  pull(pr, ctx);
  assert.equal(pr.number, matching[0].number);
  assert.equal(pr.state, "closed");
  assert.ok(pr.merged_at);
  assert.equal(pr.merged, true);
  const runs = await read(
    `/actions/workflows/ci.yml/runs?event=pull_request&head_sha=${pr.head.sha}&per_page=100`,
  );
  assert.equal(runs.total_count, runs.workflow_runs.length);
  assert.ok(runs.total_count > 0 && runs.total_count < 100);
  const run = [...runs.workflow_runs].sort((a, b) => b.id - a.id)[0];
  runIdentity(run, ctx);
  assert.equal(run.status, "completed");
  assert.equal(run.conclusion, "success");
  assert.equal(run.head_sha, pr.head.sha);
  const artifacts = await read(
    `/actions/runs/${run.id}/artifacts?per_page=100`,
  );
  assert.equal(artifacts.total_count, artifacts.artifacts.length);
  assert.ok(artifacts.total_count < 100);
  const matches = artifacts.artifacts.filter((item) =>
    new RegExp(
      `^ci-proof-${run.id}-${run.run_attempt}(?:-recovery-[23])?\\.json$`,
      "u",
    ).test(item.name),
  );
  assert.ok(
    matches.length > 0 && matches.length <= 3,
    "Missing or ambiguous compact full proof",
  );
  assert.equal(
    new Set(matches.map((item) => item.digest)).size,
    1,
    "Conflicting compact full proofs",
  );
  const artifact = matches.sort((a, b) => a.id - b.id)[0];
  assert.equal(artifact.expired, false);
  assert.match(artifact.digest, /^sha256:[a-f0-9]{64}$/u);
  const created = Date.parse(artifact.created_at),
    expires = Date.parse(artifact.expires_at);
  assert.ok(
    Number.isFinite(created) &&
      created >= Date.parse(run.run_started_at) &&
      created <= Date.parse(run.updated_at),
  );
  assert.ok(Number.isFinite(expires) && expires > now);
  assert.equal(artifact.workflow_run.id, run.id);
  assert.equal(artifact.workflow_run.repository_id, ctx.repositoryId);
  assert.equal(artifact.workflow_run.head_repository_id, ctx.repositoryId);
  assert.equal(artifact.workflow_run.head_sha, pr.head.sha);
  return { pr, run, artifact };
}
export async function verifyProof({
  ctx,
  matrix,
  hosts,
  selection,
  receipt,
  read,
  now = Date.now(),
}) {
  context(ctx);
  const selected = await selectProof({ ctx, read, now });
  equal(selected, selection, "Provider selection changed during admission");
  const { run, pr } = selected;
  assert.equal(receipt.schemaVersion, 1);
  assert.equal(receipt.mode, "FULL");
  assert.ok(
    Date.parse(receipt.recordedAt) >= Date.parse(run.run_started_at) &&
      Date.parse(receipt.recordedAt) <=
        Date.parse(selection.artifact.created_at),
    "Receipt timestamp is outside its producing run",
  );
  for (const [key, value] of Object.entries({
    repository,
    repositoryId: ctx.repositoryId,
    runId: run.id,
    runAttempt: run.run_attempt,
    pullRequest: pr.number,
  }))
    assert.equal(receipt[key], value);
  equal(receipt.matrix, matrix, "Resolved runtime inputs changed");
  equal(receipt.jobs, jobNames(matrix));
  equal(
    { ...receipt.snapshot, commit: ctx.sha },
    ctx.snapshot,
    "Source tree, parents or workflow changed",
  );
  const tested = await read(`/git/commits/${receipt.snapshot.commit}`);
  assert.equal(tested.sha, receipt.snapshot.commit);
  assert.equal(tested.tree.sha, ctx.snapshot.tree);
  equal(
    tested.parents.map((value) => value.sha),
    ctx.snapshot.parents,
  );
  const proofContext = {
    ...ctx,
    sha: receipt.snapshot.commit,
    snapshot: receipt.snapshot,
    runId: run.id,
    runAttempt: run.run_attempt,
  };
  const records = lanes(receipt.lanes, proofContext, matrix);
  const transported = await read(
    `/actions/artifacts/${records[0].transport.id}`,
  );
  assert.equal(transported.expired, false);
  equal(
    Object.fromEntries(
      Object.keys(records[0].transport).map((key) => [key, transported[key]]),
    ),
    records[0].transport,
    "Frozen producer artifact changed",
  );
  const jobs = inventory(
    await read(`/actions/runs/${run.id}/jobs?filter=latest&per_page=100`),
    run,
    matrix,
  );
  assert.ok(Array.isArray(receipt.executions));
  equal(
    receipt.executions.map((value) => value.job.name).sort(),
    jobNames(matrix)
      .filter((name) => name !== acceptance)
      .sort(),
    "Incomplete original execution inventory",
  );
  for (const execution of receipt.executions) {
    const latest = jobs.find((job) => job.name === execution.job.name);
    assert.ok(
      sameJobExecution(execution.job, latest),
      "Original execution changed",
    );
    await verifyProducingAttempt(latest, execution.runAttempt, run, read);
  }
  assert.equal(hosts.length, matrix.os.length);
  for (const lane of matrix.os) {
    const matches = hosts.filter((host) => host.lane === lane);
    assert.equal(
      matches.length,
      1,
      "Missing or duplicate hosted platform probe",
    );
    assertHostedPlatform(matches[0], lane);
  }
  // Each original lane already met the same platform/runtime contract above.
  // A newly allocated observer need not share its incidental image build.
  for (const record of records) {
    await verifyProducingAttempt(
      jobs.find(
        (job) =>
          job.name ===
          `Product / Qualify ${record.lane.os} / Node ${record.lane.node}`,
      ),
      record.runAttempt,
      run,
      read,
    );
  }
  const final = await read(`/actions/runs/${run.id}`);
  assert.equal(final.run_attempt, run.run_attempt);
  assert.equal(final.conclusion, "success");
  const artifact = await read(`/actions/artifacts/${selection.artifact.id}`);
  assert.equal(artifact.expired, false);
  assert.equal(artifact.digest, selection.artifact.digest);
  assert.equal(artifact.name, selection.artifact.name);
  return {
    mode: "REUSED",
    sourceRun: run.id,
    sourceAttempt: run.run_attempt,
    sourceCommit: receipt.snapshot.commit,
    json: "REUSED",
    artifactId: selection.artifact.id,
    artifactDigest: selection.artifact.digest,
  };
}
