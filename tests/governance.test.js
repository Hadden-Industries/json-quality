// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import {
  inspectGovernance,
  observeAcceptanceCheck,
  governance,
} from "../scripts/github-governance.js";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { parse } from "yaml";
import { budgets } from "../scripts/qualification-budgets.js";

test("evidence actions use supported caller deadlines aligned with shared budgets", () => {
  const actions = new Map([
    ["upload-evidence", budgets.uploadStep],
    ["download-evidence", budgets.collection],
  ]);
  for (const name of actions.keys()) {
    const action = parse(
      readFileSync(
        new URL(`../.github/actions/${name}/action.yml`, import.meta.url),
        "utf8",
      ),
    );
    for (const step of action.runs.steps)
      assert.equal(
        Object.hasOwn(step, "timeout-minutes"),
        false,
        `${name}: composite step timeouts are unsupported`,
      );
  }
  const directory = new URL("../.github/workflows/", import.meta.url);
  let callers = 0;
  for (const name of readdirSync(directory).filter((name) =>
    name.endsWith(".yml"),
  )) {
    const workflow = parse(readFileSync(new URL(name, directory), "utf8"));
    for (const job of Object.values(workflow.jobs))
      for (const step of job.steps ?? []) {
        if (step.uses?.startsWith("./.github/actions/"))
          assert.ok(
            existsSync(
              new URL(`../${step.uses.slice(2)}/action.yml`, import.meta.url),
            ),
            `${name}: unresolved local action ${step.uses}`,
          );
        const action = step.uses?.replace("./.github/actions/", "");
        if (!actions.has(action)) continue;
        callers++;
        assert.equal(
          step["timeout-minutes"] * 60000,
          actions.get(action),
          `${name}: ${action} deadline drift`,
        );
      }
  }
  assert.ok(callers > 0);
});

test("governance drift identifies missing protection and expected native check source", async () => {
  const desired = structuredClone(governance);
  const responses = {
    "": {
      ...desired.repositorySettings,
      full_name: desired.repository,
      default_branch: "main",
    },
    "/rulesets?per_page=100": [{ id: 7, name: desired.ruleset.name }],
    "/rulesets/7": desired.ruleset,
    "/actions/permissions": desired.actions,
    "/actions/permissions/selected-actions": desired.selectedActions,
    "/actions/permissions/workflow": desired.workflowPermissions,
    "/actions/permissions/fork-pr-contributor-approval": desired.forkApproval,
    "/code-scanning/default-setup": desired.codeqlDefaultSetup,
    "/actions/permissions/artifact-and-log-retention": desired.retention,
  };
  const read = async (path) => {
    assert.ok(Object.hasOwn(responses, path), path);
    return responses[path];
  };
  assert.equal((await inspectGovernance(read)).status, "CONFIGURED");
  desired.ruleset.rules.find(
    (rule) => rule.type === "required_status_checks",
  ).parameters.required_status_checks[0].integration_id = 1;
  assert.deepEqual((await inspectGovernance(read)).differences, ["ruleset"]);
  responses["/rulesets?per_page=100"] = [];
  assert.deepEqual((await inspectGovernance(read)).differences, ["ruleset"]);
});
function bootstrapFixture() {
  const workflowSha = "a".repeat(40),
    integrationSha = "b".repeat(40);
  const responses = {
    "/actions/workflows/ci.yml/runs?event=pull_request&per_page=100": {
      workflow_runs: [
        {
          id: 10,
          check_suite_id: 20,
          event: "pull_request",
          path: ".github/workflows/ci.yml",
          head_sha: "c".repeat(40),
          conclusion: "failure",
          repository: { full_name: governance.repository },
          head_repository: { full_name: governance.repository },
        },
      ],
    },
    "/actions/runs/10/jobs?filter=latest&per_page=100": {
      total_count: 1,
      jobs: [
        {
          run_id: 10,
          name: "CI / acceptance",
          conclusion: "failure",
          check_run_url: `https://api.github.com/repos/${governance.repository}/check-runs/30`,
        },
      ],
    },
    "/check-runs/30": {
      id: 30,
      name: "CI / acceptance",
      head_sha: integrationSha,
      conclusion: "failure",
      app: { id: governance.actionsAppId },
      check_suite: { id: 20 },
    },
    [`/contents/.github/workflows/ci.yml?ref=${integrationSha}`]: {
      sha: workflowSha,
    },
  };
  return {
    workflowSha,
    responses,
    read: async (path) => {
      if (!Object.hasOwn(responses, path))
        throw new Error(`Unexpected read: ${path}`);
      return responses[path];
    },
  };
}

test("failed native acceptance can bootstrap protection without admitting a failed merge", async () => {
  const fixture = bootstrapFixture();
  assert.deepEqual(
    await observeAcceptanceCheck(fixture.read, fixture.workflowSha),
    { runId: 10, checkId: 30 },
  );
  const checks = governance.ruleset.rules.find(
    (rule) => rule.type === "required_status_checks",
  ).parameters;
  assert.equal(checks.strict_required_status_checks_policy, true);
  assert.deepEqual(checks.required_status_checks, [
    { context: "CI / acceptance", integration_id: governance.actionsAppId },
  ]);
});

test("check bootstrap refuses foreign producers, changed workflows and incomplete inventory", async (t) => {
  for (const [name, change] of [
    ["foreign App", (r) => (r["/check-runs/30"].app.id = 1)],
    ["foreign suite", (r) => (r["/check-runs/30"].check_suite.id = 1)],
    ["wrong check name", (r) => (r["/check-runs/30"].name = "other")],
    [
      "changed workflow",
      (r) =>
        (r[`/contents/.github/workflows/ci.yml?ref=${"b".repeat(40)}`].sha =
          "d".repeat(40)),
    ],
    [
      "fork source",
      (r) =>
        (r[
          "/actions/workflows/ci.yml/runs?event=pull_request&per_page=100"
        ].workflow_runs[0].head_repository.full_name = "elsewhere/fork"),
    ],
    [
      "truncated jobs",
      (r) =>
        (r["/actions/runs/10/jobs?filter=latest&per_page=100"].total_count = 2),
    ],
    [
      "foreign check URL",
      (r) =>
        (r[
          "/actions/runs/10/jobs?filter=latest&per_page=100"
        ].jobs[0].check_run_url =
          "https://api.github.com/repos/elsewhere/fork/check-runs/30"),
    ],
  ])
    await t.test(name, async () => {
      const fixture = bootstrapFixture();
      change(fixture.responses);
      await assert.rejects(
        observeAcceptanceCheck(fixture.read, fixture.workflowSha),
        { code: "ERR_ASSERTION" },
      );
    });
});

test("deliberate triggers and skip-resistant acceptance remain explicit", () => {
  const read = (name) =>
    parse(
      readFileSync(
        new URL(`../.github/workflows/${name}`, import.meta.url),
        "utf8",
      ),
    );
  const ci = read("ci.yml");
  assert.deepEqual(ci.on.pull_request, {
    branches: ["main"],
    types: ["ready_for_review"],
  });
  assert.deepEqual(Object.keys(ci.on).sort(), [
    "pull_request",
    "workflow_call",
  ]);
  assert.equal(ci.jobs.acceptance.if, "always()");
  assert.deepEqual(ci.jobs.acceptance.needs, [
    "policy",
    "product",
    "native",
    "dependencies",
    "codeql",
  ]);
  assert.deepEqual(Object.keys(read("qualification.yml").on), [
    "workflow_call",
  ]);
  const main = read("main-qualification.yml");
  assert.equal(
    main.jobs.full.if,
    "github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'",
  );
  assert.equal(main.jobs.full.uses, "./.github/workflows/ci.yml");
  const checks = governance.ruleset.rules.find(
    (rule) => rule.type === "required_status_checks",
  ).parameters;
  assert.equal(checks.strict_required_status_checks_policy, true);
  assert.deepEqual(checks.required_status_checks, [
    { context: "CI / acceptance", integration_id: 15368 },
  ]);
  assert.deepEqual(governance.ruleset.bypass_actors, []);
});
