// SPDX-License-Identifier: AGPL-3.0-only
// Adopt OwlAPI's whole-workflow contract checks, using native YAML parsing.
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "yaml";
import { budgets } from "./qualification-budgets.js";

const repository = fileURLToPath(new URL("../", import.meta.url));
const transferBudgets = new Map([
  ["./.github/actions/upload-evidence", budgets.uploadStep],
  ["./.github/actions/download-evidence", budgets.collection],
]);

/** Check every local caller before expensive hosted fan-out, including dormant release paths. */
export function checkWorkflows({ root = repository, overrides = {} } = {}) {
  const read = (path) => {
    const document = parseDocument(
      overrides[path] ?? readFileSync(resolve(root, path), "utf8"),
      { uniqueKeys: true },
    );
    assert.equal(document.errors.length, 0, `${path}: invalid YAML`);
    return document.toJS();
  };
  const actions = new Map();
  const pinned = (path, uses) => {
    if (uses && !uses.startsWith("./"))
      assert.match(
        uses,
        /^[\w.-]+\/[\w./-]+@[a-f0-9]{40}$/u,
        `${path}: external action needs a full reviewed SHA`,
      );
  };
  for (const entry of readdirSync(resolve(root, ".github/actions"), {
    withFileTypes: true,
  })) {
    if (!entry.isDirectory()) continue;
    const path = `.github/actions/${entry.name}/action.yml`;
    const action = read(path);
    assert.ok(
      ["composite", "node24"].includes(action.runs?.using),
      `${path}: unsupported action runtime`,
    );
    if (action.runs.using === "node24") {
      assert.ok(
        existsSync(
          resolve(root, ".github/actions", entry.name, action.runs.main),
        ),
        `${path}: missing native entry`,
      );
    } else {
      assert.ok(
        Array.isArray(action.runs.steps),
        `${path}: missing composite steps`,
      );
      for (const step of action.runs.steps) {
        pinned(path, step.uses);
        assert.ok(
          !Object.hasOwn(step, "timeout-minutes"),
          `${path}: composite-step timeout is unsupported`,
        );
        if (step.run)
          assert.ok(step.shell, `${path}: composite command needs a shell`);
      }
    }
    actions.set(`./.github/actions/${entry.name}`, action);
  }
  assert.equal(
    actions.get("./.github/actions/upload-evidence")?.runs.using,
    "node24",
    "SDK uploads require native action credentials",
  );
  const workflows = new Map();
  for (const name of readdirSync(resolve(root, ".github/workflows")).filter(
    (name) => name.endsWith(".yml"),
  ))
    workflows.set(
      `./.github/workflows/${name}`,
      read(`.github/workflows/${name}`),
    );
  function inputs(path, supplied, declared = {}) {
    for (const key of Object.keys(supplied ?? {}))
      assert.ok(
        Object.hasOwn(declared, key),
        `${path}: undeclared input ${key}`,
      );
    for (const [key, value] of Object.entries(declared))
      if (value.required && !Object.hasOwn(value, "default"))
        assert.ok(
          supplied?.[key] !== undefined && supplied[key] !== "",
          `${path}: missing required input ${key}`,
        );
  }
  const receipt = workflows
    .get("./.github/workflows/ci.yml")
    ?.jobs.acceptance.steps.find(
      (step) => step.with?.path === "${{ steps.proof.outputs.path }}",
    );
  const producer = workflows
    .get("./.github/workflows/qualification.yml")
    ?.jobs.producer.steps.find((step) => step.id === "archive");
  const horizon = receipt?.with?.["retention-days"];
  assert.ok(
    Number.isSafeInteger(horizon) && horizon > 0,
    "PR proof retention horizon is missing",
  );
  assert.equal(
    String(producer?.with?.["retention-days"]).replace(/\s+/gu, ""),
    "${{(inputs.release-mode||inputs.emit-proof)&&" + horizon + "||1}}",
    "PR producer retention must cover the compact reuse-proof horizon",
  );
  let callers = 0;
  for (const [path, workflow] of workflows) {
    for (const job of Object.values(workflow.jobs ?? {})) {
      pinned(path, job.uses);
      if (job.uses?.startsWith("./.github/workflows/")) {
        const called = workflows.get(job.uses);
        assert.ok(
          called?.on?.workflow_call !== undefined,
          `${path}: unknown reusable workflow ${job.uses}`,
        );
        inputs(path, job.with, called.on.workflow_call?.inputs);
      }
      for (const step of job.steps ?? []) {
        pinned(path, step.uses);
        assert.ok(
          !/scripts\/(?:upload-evidence\.js|ci-command\.js upload)/u.test(
            step.run ?? "",
          ),
          `${path}: shell SDK upload lacks action credentials`,
        );
        if (!step.uses?.startsWith("./.github/actions/")) continue;
        const action = actions.get(step.uses);
        assert.ok(action, `${path}: unresolved local action ${step.uses}`);
        inputs(path, step.with, action.inputs);
        if (transferBudgets.has(step.uses)) {
          callers++;
          assert.equal(
            step["timeout-minutes"] * 60000,
            transferBudgets.get(step.uses),
            `${path}: transfer deadline drift`,
          );
        }
      }
    }
  }
  assert.ok(callers > 0);
  return {
    workflows: workflows.size,
    localActions: actions.size,
    transferCallers: callers,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  console.log(JSON.stringify(checkWorkflows()));
