// SPDX-License-Identifier: AGPL-3.0-only
/** Keep one qualified main candidate; cleanup never runs in PR or release admission. */
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { gitSnapshot, readRawProof } from "./ci-command.js";
import { repository, selectProof, verifyProof } from "./ci-proof.js";
import { createRepositoryReader } from "./github-evidence.js";
import {
  mergeQualificationContext,
  selectQualificationArtifact,
} from "./release-reuse.js";
import { native } from "./qualification-process.js";
import { budgets } from "./qualification-budgets.js";

/** Only complete candidate-owned originals can replace an established candidate. */
export function candidateArtifacts(receipt, inventory, proofArtifact) {
  assert.equal(
    receipt.schemaVersion,
    3,
    "Latest candidate lacks release-capable proof",
  );
  const selected = [proofArtifact, receipt.lanes[0].transport];
  for (const lane of receipt.lanes) {
    const executions = receipt.executions.filter(
      ({ job }) =>
        job.name ===
        `Product / Qualify ${lane.lane.os} / Node ${lane.lane.node}`,
    );
    assert.equal(executions.length, 1);
    selected.push(
      selectQualificationArtifact(
        inventory,
        `consumer-${lane.lane.os}-${lane.lane.node}-${executions[0].runAttempt}`,
        executions[0],
      ),
    );
  }
  return new Set(selected.map(({ id }) => id));
}

/** Unknown ownership/use retains bytes; only unused ordinary CI candidates qualify. */
export function selectSupersededArtifacts({
  artifacts,
  selectedIds,
  selectedRun,
  runs,
  currentRun,
  protectedIds = [],
  referencesComplete = false,
}) {
  if (!referencesComplete) return [];
  const dependent = runs.filter(
    (run) =>
      run.id !== currentRun &&
      /\/(?:main-qualification|release-qualification|stage-release|release-registry|github-release|promote-release|verify-release-completion)\.yml$/u.test(
        run.path ?? "",
      ),
  );
  if (
    dependent.some(
      (run) => run.status !== "completed" || run.conclusion !== "success",
    )
  )
    return [];
  const protectedSet = new Set([...selectedIds, ...protectedIds]);
  const byId = new Map(runs.map((run) => [run.id, run]));
  return artifacts.filter((artifact) => {
    const run = byId.get(artifact.workflow_run?.id);
    return (
      !artifact.expired &&
      !protectedSet.has(artifact.id) &&
      run?.id < selectedRun &&
      run.path === ".github/workflows/ci.yml" &&
      run.event === "pull_request" &&
      run.status === "completed" &&
      /^(?:qualified-producer-\d+|consumer-[a-z0-9.-]+-\d+\.\d+\.\d+-\d+|ci-proof-\d+-\d+\.json)$/u.test(
        artifact.name,
      )
    );
  });
}

/** Use bounded native inventories; an incomplete or changing observation prevents deletion. */
export async function retainLatestCandidate({
  environment = process.env,
  read,
  remove,
  snapshot = gitSnapshot(),
  now = Date.now,
}) {
  const ctx = mergeQualificationContext(
    { ...environment, GITHUB_EVENT_NAME: "workflow_dispatch" },
    snapshot,
  );
  assert.equal((await read("/git/ref/heads/main")).object.sha, ctx.sha);
  const selection = await selectProof({ ctx, read, now: now() });
  const receipt = await readRawProof(selection.artifact, read);
  const hosts = receipt.matrix.os.map((lane) => ({
    ...receipt.lanes.find((item) => item.lane.os === lane).host,
    lane,
  }));
  await verifyProof({
    ctx,
    read,
    receipt,
    selection,
    matrix: receipt.matrix,
    hosts,
    now: now(),
  });
  const collect = async (base, key) => {
    const values = [];
    for (let page = 1; page <= 10; page++) {
      const value = await read(`${base}?per_page=100&page=${page}`);
      values.push(...value[key]);
      if (values.length === value.total_count) return values;
      assert.ok(
        values.length < value.total_count && value[key].length === 100,
        "Incomplete retention inventory",
      );
    }
    throw new Error(
      "Retention inventory exceeds collection bound; no cleanup authorized",
    );
  };
  const artifacts = await collect("/actions/artifacts", "artifacts");
  const openPulls = async () => {
    const pulls = [];
    for (let page = 1; page <= 10; page++) {
      const items = await read(`/pulls?state=open&per_page=100&page=${page}`);
      assert.ok(Array.isArray(items) && items.length <= 100);
      pulls.push(...items);
      if (items.length < 100) return pulls;
    }
    throw new Error(
      "Open PR inventory exceeds collection bound; no cleanup authorized",
    );
  };
  const protectPulls = (pulls, observedRuns) => {
    const heads = new Set(pulls.map((pull) => pull.head.sha));
    const active = new Set(
      observedRuns
        .filter((run) => heads.has(run.head_sha))
        .map((run) => run.id),
    );
    return artifacts
      .filter((artifact) => active.has(artifact.workflow_run?.id))
      .map(({ id }) => id);
  };
  const selectedIds = candidateArtifacts(
    receipt,
    artifacts.filter((item) => item.workflow_run?.id === selection.run.id),
    selection.artifact,
  );
  const runs = await collect("/actions/runs", "workflow_runs");
  const protectedIds = protectPulls(await openPulls(), runs);
  const selected = selectSupersededArtifacts({
    artifacts,
    selectedIds,
    selectedRun: selection.run.id,
    runs,
    currentRun: Number(environment.GITHUB_RUN_ID),
    referencesComplete: true,
    protectedIds,
  });
  const expires = artifacts
    .filter((item) => selectedIds.has(item.id))
    .map((item) => Date.parse(item.expires_at));
  assert.ok(
    expires.every((expiry) => Number.isFinite(expiry) && expiry > now()),
  );
  const result = {
    selectedRun: selection.run.id,
    retainedArtifactIds: [...selectedIds],
    effectiveArtifactExpiry: new Date(Math.min(...expires)).toISOString(),
    deleteArtifactIds: selected.map(({ id }) => id),
    state: selected.length
      ? "superseded-unused-candidates"
      : "retained-no-safe-cleanup",
  };
  console.log(JSON.stringify(result));
  for (const artifact of selected) {
    // Reobserve mutable state immediately before each one-shot effect. Do not
    // retry an unknown deletion or broaden cleanup to writer/native evidence.
    assert.equal((await read("/git/ref/heads/main")).object.sha, ctx.sha);
    const freshRuns = await collect("/actions/runs", "workflow_runs");
    const stillSafe = selectSupersededArtifacts({
      artifacts: [artifact],
      selectedIds,
      selectedRun: selection.run.id,
      runs: freshRuns,
      currentRun: Number(environment.GITHUB_RUN_ID),
      referencesComplete: true,
      protectedIds: protectPulls(await openPulls(), freshRuns),
    });
    assert.equal(stillSafe.length, 1, "Consumer state changed during cleanup");
    const observed = await read(`/actions/artifacts/${artifact.id}`);
    for (const key of ["id", "name", "digest", "size_in_bytes"])
      assert.deepEqual(observed[key], artifact[key]);
    if (remove) {
      console.log(
        JSON.stringify({
          state: "attempting-candidate-deletion",
          artifactId: artifact.id,
        }),
      );
      await remove(artifact.id);
      console.log(
        JSON.stringify({
          state: "candidate-deletion-acknowledged",
          artifactId: artifact.id,
        }),
      );
    }
  }
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.env.GITHUB_REPOSITORY, repository);
  assert.equal(process.env.GITHUB_REF, "refs/heads/main");
  assert.equal(
    process.env.GITHUB_WORKFLOW_REF,
    `${repository}/.github/workflows/candidate-retention.yml@refs/heads/main`,
  );
  const read = createRepositoryReader({
    repository,
    token: process.env.GH_TOKEN,
    budgetMs: budgets.collection,
  });
  if (process.env.GITHUB_EVENT_NAME === "workflow_dispatch") {
    assert.equal(process.env.GITHUB_ACTOR?.toLowerCase(), "maksymshostak");
  } else {
    assert.equal(process.env.GITHUB_EVENT_NAME, "workflow_run");
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH));
    assert.ok(Number.isSafeInteger(event.workflow_run?.id));
    const run = await read(`/actions/runs/${event.workflow_run.id}`);
    assert.equal(run.path, ".github/workflows/main-qualification.yml");
    assert.equal(run.repository.full_name, repository);
    assert.equal(run.repository.id, Number(process.env.GITHUB_REPOSITORY_ID));
    assert.equal(run.head_repository.id, run.repository.id);
    assert.equal(run.event, "push");
    assert.equal(run.head_branch, "main");
    assert.equal(run.head_sha, process.env.GITHUB_SHA);
    assert.equal(run.status, "completed");
    assert.equal(run.conclusion, "success");
  }
  assert.ok([undefined, "--apply"].includes(process.argv[2]));
  await retainLatestCandidate({
    read,
    remove:
      process.argv[2] === "--apply"
        ? (id) =>
            native(
              "gh",
              [
                "api",
                "--method",
                "DELETE",
                `repos/${repository}/actions/artifacts/${id}`,
              ],
              { phase: "superseded-candidate-deletion", timeout: budgets.read },
            )
        : undefined,
  });
}
