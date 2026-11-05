// SPDX-License-Identifier: AGPL-3.0-only
// Adopt OwlAPI's whole-workflow contract checks, using native YAML parsing.
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "yaml";
import { budgets } from "./qualification-budgets.js";
import { securityScans } from "./security-scans.js";
import { checkNativeWorkflowContract } from "./native-workflow-contract.js";
import { checkMinimalCliCommands } from "./consumer-cli-probe.js";

const repository = fileURLToPath(new URL("../", import.meta.url));
const transferBudgets = new Map([
  ["./.github/actions/upload-evidence", budgets.uploadStep],
  ["./.github/actions/download-evidence", budgets.collection],
]);

/** Caller repositories supply Git objects, never executable qualification code. */
function checkSharedQualification(workflow) {
  const message =
    "Shared qualification must retain its producer-owned data-only boundary";
  const job = workflow.jobs.qualify;
  assert.deepEqual(Object.keys(workflow.jobs), ["qualify"], message);
  assert.deepEqual(workflow.permissions, { contents: "read" }, message);
  assert.equal(workflow.env, undefined, message);
  assert.equal(job.permissions, undefined, message);
  assert.equal(job.container, undefined, message);
  assert.equal(job.services, undefined, message);
  assert.equal(
    workflow.defaults?.run?.["working-directory"],
    undefined,
    message,
  );
  assert.equal(job.defaults?.run?.["working-directory"], undefined, message);
  assert.equal(job.defaults?.run?.shell, "bash", message);
  assert.deepEqual(
    job.env,
    {
      JSON_QUALITY_CAPACITY_LIMITS: "${{ inputs.capacity-limits }}",
    },
    message,
  );
  for (const kind of ["trusted", "candidate"])
    for (const suffix of ["repository", "commit-id"]) {
      const input = workflow.on.workflow_call.inputs[`${kind}-${suffix}`];
      assert.equal(input.type, "string", message);
      assert.equal(input.required, true, message);
      assert.equal(input.default, undefined, message);
    }

  // These short bootstrap commands run before producer dependencies exist.
  // Keep their reviewed semantics exact; step names and YAML formatting are free.
  const validate = String.raw`node --input-type=module -e 'if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(process.env.PRODUCER_REPOSITORY ?? "")) throw new Error("Producer repository is required"); for (const key of ["PRODUCER_SHA", "TRUSTED_COMMIT_ID", "CANDIDATE_COMMIT_ID"]) if (!/^[a-f0-9]{40}$/u.test(process.env[key] ?? "")) throw new Error("Full immutable commits are required")'
git config --global core.autocrlf false`;
  const verify = `node --input-type=module -e 'import { execFileSync } from "node:child_process"; import { readFileSync } from "node:fs"; if (execFileSync("git", ["-C", "producer", "rev-parse", "HEAD"], { encoding: "utf8" }).trim() !== process.env.PRODUCER_SHA || JSON.parse(readFileSync("producer/package.json", "utf8")).name !== "@hadden-industries/json-quality") throw new Error("Producer identity mismatch")'`;
  const select = `npm exec --global --call 'node scripts/qualification-process.js producer-npm'
npm_prefix="$(npm prefix --global)"
if [[ "$RUNNER_OS" == "Windows" ]]; then
  echo "$npm_prefix" >> "$GITHUB_PATH"
else
  echo "$npm_prefix/bin" >> "$GITHUB_PATH"
fi`;
  const checkout = (kind) => ({
    repository:
      kind === "producer"
        ? "${{ job.workflow_repository }}"
        : `\${{ inputs.${kind}-repository }}`,
    ref:
      kind === "producer"
        ? "${{ job.workflow_sha }}"
        : `\${{ inputs.${kind}-commit-id }}`,
    path: kind,
    "persist-credentials": false,
  });
  const expected = [
    {
      run: validate,
      env: {
        PRODUCER_REPOSITORY: "${{ job.workflow_repository }}",
        PRODUCER_SHA: "${{ job.workflow_sha }}",
        TRUSTED_COMMIT_ID: "${{ inputs.trusted-commit-id }}",
        CANDIDATE_COMMIT_ID: "${{ inputs.candidate-commit-id }}",
      },
    },
    { action: "actions/checkout", with: checkout("producer") },
    { run: verify, env: { PRODUCER_SHA: "${{ job.workflow_sha }}" } },
    {
      action: "actions/setup-node",
      with: {
        "node-version-file": "producer/.node-version",
        "package-manager-cache": false,
      },
    },
    { run: select, "working-directory": "producer" },
    {
      run: "npm run install:producer-dependencies",
      "working-directory": "producer",
    },
    { action: "actions/checkout", with: checkout("trusted") },
    { action: "actions/checkout", with: checkout("candidate") },
    {
      run: "node producer/src/qualification-cli.js",
      env: {
        JSON_QUALITY_TRUSTED_ROOT: "${{ github.workspace }}/trusted",
        JSON_QUALITY_CANDIDATE_ROOT: "${{ github.workspace }}/candidate",
        JSON_QUALITY_TRUSTED_COMMIT_ID: "${{ inputs.trusted-commit-id }}",
        JSON_QUALITY_CANDIDATE_COMMIT_ID: "${{ inputs.candidate-commit-id }}",
        JSON_QUALITY_RUNTIME_CONTROLS: '{"maxCheckTimeMs":600000}',
        NODE_OPTIONS: "",
        NODE_PATH: "",
        GH_TOKEN: "",
        GITHUB_TOKEN: "",
      },
    },
  ];
  assert.equal(job.steps.length, expected.length, message);
  for (const [index, contract] of expected.entries()) {
    const step = job.steps[index];
    assert.equal(step.if, undefined, message);
    assert.ok(!step["continue-on-error"], message);
    assert.equal(step.shell, undefined, message);
    assert.equal(
      step["working-directory"],
      contract["working-directory"],
      message,
    );
    assert.deepEqual(step.env, contract.env, message);
    assert.deepEqual(step.with, contract.with, message);
    if (contract.action) {
      assert.equal(step.uses?.split("@")[0], contract.action, message);
      assert.equal(step.run, undefined, message);
    } else {
      assert.equal(step.run?.trim(), contract.run, message);
      assert.equal(step.uses, undefined, message);
    }
  }
}

/** Check every local caller before expensive hosted fan-out, including dormant release paths. */
export function checkWorkflows({ root = repository, overrides = {} } = {}) {
  checkMinimalCliCommands();
  const read = (path) => {
    const document = parseDocument(
      overrides[path] ?? readFileSync(resolve(root, path), "utf8"),
      { uniqueKeys: true },
    );
    assert.equal(document.errors.length, 0, `${path}: invalid YAML`);
    return document.toJS();
  };
  const scripts = read("package.json").scripts;
  const scriptReferences = (path, command) => {
    for (const [, name] of command.matchAll(/\bnpm run ([a-z][a-z0-9:-]*)/gu))
      assert.ok(
        Object.hasOwn(scripts, name),
        `${path}: undeclared npm script ${name}`,
      );
  };
  for (const [name, command] of Object.entries(scripts))
    scriptReferences(`package.json/scripts/${name}`, command);
  const actions = new Map();
  const pinned = (path, uses) => {
    if (uses && !uses.startsWith("./"))
      assert.match(
        uses,
        /^[\w.-]+\/[\w./-]+@[a-f0-9]{40}$/u,
        `${path}: external action needs a full reviewed SHA`,
      );
  };
  const checkoutRevision = (path, step) => {
    if (!step.uses?.startsWith("actions/checkout@")) return;
    const ref = String(step.with?.ref ?? "");
    assert.ok(
      !ref.includes("${{") || !/\b(?:steps|needs)\s*(?:\.|\[)/iu.test(ref),
      `${path}: output-derived checkout revision; project reviewed literal pins from their canonical build configuration`,
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
        checkoutRevision(path, step);
        assert.ok(
          !Object.hasOwn(step, "timeout-minutes"),
          `${path}: composite-step timeout is unsupported`,
        );
        if (step.run) {
          assert.ok(step.shell, `${path}: composite command needs a shell`);
          scriptReferences(path, step.run);
        }
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
  checkSharedQualification(
    workflows.get("./.github/workflows/json-quality.yml"),
  );
  checkNativeWorkflowContract({
    producer: workflows.get("./.github/workflows/native-producer.yml"),
    wrapper: workflows.get("./.github/workflows/native.yml"),
  });
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
  const scans = workflows.get("./.github/workflows/security.yml").jobs.codeql;
  assert.deepEqual(
    scans.strategy.matrix.include,
    securityScans,
    "Security scan projection drift",
  );
  assert.equal(scans.name, "Scan ${{ matrix.key }}");
  assert.equal(scans["runs-on"], "${{ matrix.os }}");
  const init = scans.steps.findIndex((step) =>
    step.uses?.startsWith("github/codeql-action/init@"),
  );
  const build = scans.steps.findIndex((step) =>
    step.run?.includes("python native/build.py"),
  );
  const analyze = scans.steps.findIndex((step) =>
    step.uses?.startsWith("github/codeql-action/analyze@"),
  );
  assert.ok(
    init >= 0 && build > init && analyze > build,
    "CodeQL must trace a clean native build",
  );
  assert.equal(
    scans.steps[init].with["build-mode"],
    "${{ matrix.build-mode }}",
  );
  assert.equal(scans.steps[analyze].with.category, "${{ matrix.category }}");
  assert.ok(
    !scans.steps.some((step) => step.run?.includes("native/stage.py")),
    "Scan outputs are not production components",
  );
  const promotion = workflows.get("./.github/workflows/promote-release.yml");
  const producerSteps = actions.get("./.github/actions/setup-producer")?.runs
    .steps;
  assert.ok(
    producerSteps?.some(
      (step) =>
        step.run === "npm run install:producer-dependencies" && !step.if,
    ),
    "Release producer must install its frozen dependencies unconditionally",
  );
  assert.equal(
    scripts["execute:release-action"],
    "node scripts/release-command.js",
    "Release effects must retain startup failures",
  );
  for (const [path, writer, environment] of [
    ["stage-release.yml", "stage", "npm-publication"],
    ["github-release.yml", "archive", "github-archival"],
    ["promote-release.yml", "github", "github-release"],
  ]) {
    const workflow = workflows.get(`./.github/workflows/${path}`);
    assert.equal(workflow.jobs[writer].environment, environment);
    for (const [name, job] of Object.entries(workflow.jobs)) {
      const steps = job.steps ?? [],
        setup = steps.findIndex(
          (step) => step.uses === "./.github/actions/setup-producer",
        );
      assert.ok(
        setup >= 0 && !steps[setup].if,
        `${path}/${name}: release dependency setup is required`,
      );
      assert.equal(
        job.permissions.contents,
        name === writer && writer !== "stage" ? "write" : "read",
        `${path}/${name}: draft visibility belongs to the GitHub writer`,
      );
      assert.ok(
        !steps
          .slice(0, setup)
          .some(
            (step) => step.run || step.uses?.startsWith("./.github/actions/"),
          ),
        `${path}/${name}: release commands must follow dependency setup`,
      );
      assert.ok(
        !steps
          .slice(setup + 1)
          .some((step) => step.uses?.startsWith("actions/setup-node@")),
        `${path}/${name}: publisher runtime must remain the installed producer`,
      );
      const effect = steps.findIndex(
        (step) => step.name === "Apply admitted release effect",
      );
      if (effect < 0) continue;
      if (writer !== "github")
        assert.ok(
          steps[effect].run.startsWith(
            `npm run execute:release-action -- ${writer} `,
          ),
          `${path}: effect must use the startup-safe dispatcher`,
        );
      assert.ok(
        steps
          .slice(effect + 1)
          .some(
            (step) =>
              step.uses === "./.github/actions/upload-evidence" &&
              step.if === "always()",
          ),
        `${path}/${name}: failed publisher evidence must be retained`,
      );
    }
  }
  assert.deepEqual(Object.keys(promotion.jobs).sort(), [
    "admit",
    "complete",
    "github",
    "npm",
  ]);
  assert.equal(promotion.concurrency["cancel-in-progress"], false);
  for (const service of ["admit", "npm", "github", "complete"]) {
    const job = promotion.jobs[service];
    assert.equal(
      job.permissions.contents,
      service === "github" ? "write" : "read",
    );
    assert.equal(
      job.permissions["id-token"],
      service === "npm" ? "write" : undefined,
    );
    assert.ok(
      !Object.keys({ ...promotion.env, ...job.env }).some((key) =>
        /^(?:NPM_TOKEN|NODE_AUTH_TOKEN|ACTIONS_ID_TOKEN_REQUEST_)/u.test(key),
      ),
      "Promotion cannot inject service credentials",
    );
    const steps = job.steps ?? [];
    assert.ok(
      !steps.some((step) =>
        Object.keys(step.env ?? {}).some((key) =>
          /^(?:NPM_TOKEN|NODE_AUTH_TOKEN|ACTIONS_ID_TOKEN_REQUEST_)/u.test(key),
        ),
      ),
    );
    if (["npm", "github"].includes(service)) {
      assert.equal(
        job.environment,
        service === "npm" ? "npm-promotion" : "github-release",
      );
      const effect = steps.find(
        (step) => step.name === "Apply admitted release effect",
      );
      assert.ok(
        effect.run.startsWith(
          `node scripts/release-command.js promote-${service} `,
        ),
        "Wrong service dispatcher",
      );
      assert.ok(
        !steps.some((step) => step.run && step !== effect),
        "Additional promotion command needs explicit authority review",
      );
      assert.equal(steps.find((step) => step.id === "effect").if, "always()");
      assert.equal(
        steps.find((step) => step.id === "effect").with["retention-days"],
        90,
      );
    }
  }
  assert.equal(
    promotion.jobs.github.if,
    "needs.npm.result == 'success' && needs.npm.outputs.availability == 'npm-and-github'",
  );
  assert.deepEqual(promotion.jobs.complete.needs, ["npm", "github"]);
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
        if (step.run) scriptReferences(path, step.run);
        pinned(path, step.uses);
        checkoutRevision(path, step);
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
