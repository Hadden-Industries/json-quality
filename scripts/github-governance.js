// SPDX-License-Identifier: AGPL-3.0-only
/** Read-only by default. Activation is a separately authorized operator action. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createRepositoryReader } from "./github-evidence.js";
import { budgets } from "./qualification-process.js";

export const governance = JSON.parse(
  readFileSync(new URL("../.github/governance.json", import.meta.url)),
);
function includes(actual, expected) {
  if (Array.isArray(expected))
    return (
      Array.isArray(actual) &&
      actual.length === expected.length &&
      expected.every((value, index) => includes(actual[index], value))
    );
  if (expected && typeof expected === "object")
    return (
      !!actual &&
      Object.entries(expected).every(([key, value]) =>
        includes(actual[key], value),
      )
    );
  return actual === expected;
}
function rulesetProjection(value) {
  return {
    ...Object.fromEntries(
      ["name", "target", "enforcement", "bypass_actors", "conditions"].map(
        (key) => [key, value[key]],
      ),
    ),
    rules: value.rules
      ?.map((rule) => ({
        type: rule.type,
        ...(rule.parameters ? { parameters: rule.parameters } : {}),
      }))
      .sort((a, b) => a.type.localeCompare(b.type)),
  };
}
export async function inspectGovernance(read) {
  const repo = await read("");
  assert.equal(repo.full_name, governance.repository);
  assert.equal(repo.default_branch, governance.branch);
  const summaries = await read("/rulesets?per_page=100");
  assert.ok(Array.isArray(summaries) && summaries.length < 100);
  const owned = summaries.filter(
    (value) => value.name === governance.ruleset.name,
  );
  assert.ok(owned.length <= 1, "Ambiguous managed ruleset");
  const actualRule = owned.length
    ? await read(`/rulesets/${owned[0].id}`)
    : null;
  const actualActions = await read("/actions/permissions");
  const actual = {
    repositorySettings: Object.fromEntries(
      Object.keys(governance.repositorySettings).map((key) => [key, repo[key]]),
    ),
    actions: actualActions,
    selectedActions:
      actualActions.allowed_actions === "selected"
        ? await read("/actions/permissions/selected-actions")
        : null,
    workflowPermissions: await read("/actions/permissions/workflow"),
    forkApproval: await read(
      "/actions/permissions/fork-pr-contributor-approval",
    ),
    codeqlDefaultSetup: await read("/code-scanning/default-setup"),
    retention: await read("/actions/permissions/artifact-and-log-retention"),
    ruleset: actualRule ? rulesetProjection(actualRule) : null,
  };
  const expected = {
    ...governance,
    ruleset: rulesetProjection(governance.ruleset),
  };
  const differences = Object.keys(actual).filter(
    (key) => !includes(actual[key], expected[key]),
  );
  return {
    status: differences.length ? "CUTOVER_REQUIRED" : "CONFIGURED",
    differences,
    actual,
    managedRulesetId: owned[0]?.id ?? null,
  };
}

/** Existence selects a required check; its eventual result still gates merging. */
export async function observeAcceptanceCheck(read, publishedWorkflowSha) {
  assert.match(publishedWorkflowSha, /^[a-f0-9]{40}$/u);
  const runs = await read(
    "/actions/workflows/ci.yml/runs?event=pull_request&per_page=100",
  );
  assert.ok(Array.isArray(runs.workflow_runs));
  for (const run of runs.workflow_runs.slice(0, 10)) {
    if (
      run.event !== "pull_request" ||
      run.path !== ".github/workflows/ci.yml" ||
      run.repository?.full_name !== governance.repository ||
      run.head_repository?.full_name !== governance.repository
    )
      continue;
    assert.ok(Number.isSafeInteger(run.id) && run.id > 0);
    assert.ok(
      Number.isSafeInteger(run.check_suite_id) && run.check_suite_id > 0,
    );
    const jobs = await read(
      `/actions/runs/${run.id}/jobs?filter=latest&per_page=100`,
    );
    assert.equal(jobs.total_count, jobs.jobs.length);
    const acceptance = jobs.jobs.filter(
      (job) => job.name === "CI / acceptance",
    );
    assert.ok(acceptance.length <= 1, "Ambiguous native acceptance check");
    if (!acceptance.length) continue;
    const job = acceptance[0];
    assert.equal(job.run_id, run.id);
    const prefix = `https://api.github.com/repos/${governance.repository}`;
    assert.ok(job.check_run_url?.startsWith(`${prefix}/check-runs/`));
    const path = job.check_run_url.slice(prefix.length);
    assert.match(path, /^\/check-runs\/[1-9]\d*$/u);
    const check = await read(path);
    assert.equal(String(check.id), path.split("/").at(-1));
    if (
      check.name !== job.name ||
      check.app?.id !== governance.actionsAppId ||
      check.check_suite?.id !== run.check_suite_id
    )
      continue;
    assert.match(check.head_sha, /^[a-f0-9]{40}$/u);
    if (
      (await read(`/contents/.github/workflows/ci.yml?ref=${check.head_sha}`))
        .sha === publishedWorkflowSha
    )
      return { runId: run.id, checkId: check.id };
  }
  assert.fail(
    "A native Actions acceptance check from the reviewed CI workflow must exist before activation",
  );
}

async function activate(read, write) {
  const git = (...args) =>
    execFileSync("git", args, {
      encoding: "utf8",
      windowsHide: true,
      timeout: budgets.read,
    }).trim();
  assert.equal(git("branch", "--show-current"), governance.branch);
  assert.equal(
    git("status", "--porcelain"),
    "",
    "Activation requires a clean committed checkout",
  );
  const head = git("rev-parse", "HEAD");
  git("verify-commit", head);
  assert.equal(
    (await read(`/git/ref/heads/${governance.branch}`)).object.sha,
    head,
    "Publish and qualify the reviewed workflow source before activation",
  );
  assert.equal(
    (await read(`/contents/.github/governance.json?ref=${head}`)).sha,
    git("rev-parse", `${head}:.github/governance.json`),
  );
  await observeAcceptanceCheck(
    read,
    git("rev-parse", `${head}:.github/workflows/ci.yml`),
  );
  const before = await inspectGovernance(read);
  const settings = [
    ["repositorySettings", "PATCH", ""],
    ["actions", "PUT", "/actions/permissions"],
    ["selectedActions", "PUT", "/actions/permissions/selected-actions"],
    ["workflowPermissions", "PUT", "/actions/permissions/workflow"],
    [
      "forkApproval",
      "PUT",
      "/actions/permissions/fork-pr-contributor-approval",
    ],
    ["codeqlDefaultSetup", "PATCH", "/code-scanning/default-setup"],
    ["retention", "PUT", "/actions/permissions/artifact-and-log-retention"],
  ];
  for (const [key, method, path] of settings)
    if (before.differences.includes(key)) {
      write(method, path, governance[key]);
      // No automatic replay of a mutation, including a lost acknowledgement.
      const current = await read(path);
      assert.ok(
        includes(current, governance[key]),
        `Applied ${key} did not read back`,
      );
    }
  if (before.differences.includes("ruleset")) {
    const path = before.managedRulesetId
      ? `/rulesets/${before.managedRulesetId}`
      : "/rulesets";
    const result = write(
      before.managedRulesetId ? "PUT" : "POST",
      path,
      governance.ruleset,
    );
    assert.ok(
      includes(
        rulesetProjection(await read(`/rulesets/${result.id}`)),
        rulesetProjection(governance.ruleset),
      ),
    );
  }
  const after = await inspectGovernance(read);
  assert.equal(after.status, "CONFIGURED");
  return after;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.ok(
    process.argv.length <= 3 &&
      [undefined, "--check", "--apply"].includes(process.argv[2]),
  );
  const token =
    process.env.GH_TOKEN ??
    process.env.GITHUB_TOKEN ??
    execFileSync("gh", ["auth", "token"], {
      encoding: "utf8",
      windowsHide: true,
      timeout: budgets.read,
    }).trim();
  const read = createRepositoryReader({
    repository: governance.repository,
    token,
  });
  const write = (method, path, body) => {
    const output = execFileSync(
      "gh",
      [
        "api",
        `repos/${governance.repository}${path}`,
        "--method",
        method,
        "--input",
        "-",
      ],
      {
        input: JSON.stringify(body),
        encoding: "utf8",
        windowsHide: true,
        timeout: budgets.read,
        env: { ...process.env, GH_TOKEN: token },
      },
    );
    return output.trim() ? JSON.parse(output) : null;
  };
  const result =
    process.argv[2] === "--apply"
      ? await activate(read, write)
      : await inspectGovernance(read);
  console.log(JSON.stringify(result, null, 2));
  if (process.argv[2] === "--check" && result.status !== "CONFIGURED")
    process.exitCode = 1;
}
