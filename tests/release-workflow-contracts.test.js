// SPDX-License-Identifier: AGPL-3.0-only
/** Exercise the real workflow validator with provider-valid bootstrap regressions. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { parse, stringify } from "yaml";
import { checkWorkflows } from "../scripts/check-workflows.js";

const read = (path) =>
  parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));

test("release setup admits the maintained producer and narrow writer", () => {
  assert.ok(checkWorkflows().localActions >= 5);
});

for (const action of ["setup-producer", "setup-writer"])
  test(`${action} rejects disabled, replaced or late producer toolchains`, async (t) => {
    const path = `.github/actions/${action}/action.yml`;
    for (const [name, change] of [
      [
        "disabled Node selection",
        (steps) =>
          (steps.find((s) => s.uses?.startsWith("actions/setup-node@")).if =
            false),
      ],
      [
        "different Node pin",
        (steps) =>
          (steps.find((s) => s.uses?.startsWith("actions/setup-node@")).with[
            "node-version-file"
          ] = "consumer/.node-version"),
      ],
      [
        "disabled Python selection",
        (steps) =>
          (steps.find((s) => s.uses?.startsWith("actions/setup-python@")).if =
            false),
      ],
      [
        "different Python pin",
        (steps) =>
          (steps.find((s) => s.uses?.startsWith("actions/setup-python@")).with[
            "python-version-file"
          ] = "consumer/.python-version"),
      ],
      [
        "disabled npm selection",
        (steps) =>
          (steps.find((s) =>
            s.run?.includes("scripts/qualification-process.js producer-npm"),
          ).if = false),
      ],
      [
        "soft failed npm selection",
        (steps) =>
          (steps.find((s) =>
            s.run?.includes("scripts/qualification-process.js producer-npm"),
          )["continue-on-error"] = true),
      ],
      [
        "missing npm selection",
        (steps) =>
          steps.splice(
            steps.findIndex((s) =>
              s.run?.includes("scripts/qualification-process.js producer-npm"),
            ),
            1,
          ),
      ],
      [
        "registry read before npm selection",
        (steps) =>
          steps.splice(2, 0, {
            run: "npm view @hadden-industries/json-quality version",
            shell: "bash",
          }),
      ],
      [
        "runtime replacement after npm selection",
        (steps) =>
          steps.push({
            uses: "actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1",
            with: { "node-version": "22.13.0", "package-manager-cache": false },
          }),
      ],
    ])
      await t.test(name, () => {
        const document = read(path);
        change(document.runs.steps);
        assert.throws(
          () => checkWorkflows({ overrides: { [path]: stringify(document) } }),
          /toolchain/u,
        );
      });
  });

test("producer graph installation cannot be explicitly disabled or softened", () => {
  const path = ".github/actions/setup-producer/action.yml";
  for (const change of [
    (step) => (step.if = false),
    (step) => (step["continue-on-error"] = true),
  ]) {
    const document = read(path);
    change(
      document.runs.steps.find(
        (step) => step.run === "npm run install:producer-dependencies",
      ),
    );
    assert.throws(
      () => checkWorkflows({ overrides: { [path]: stringify(document) } }),
      /frozen dependencies/u,
    );
  }
});

test("writer evidence loss and disabled completion cannot leave a green operation", () => {
  for (const [workflow, name] of [
    ["stage-release.yml", "stage"],
    ["github-release.yml", "archive"],
    ["promote-release.yml", "npm"],
    ["promote-release.yml", "github"],
  ]) {
    const path = `.github/workflows/${workflow}`;
    const document = read(path);
    document.jobs[name].steps.find(
      (step) => step.uses === "./.github/actions/upload-writer-evidence",
    )["continue-on-error"] = true;
    assert.throws(
      () => checkWorkflows({ overrides: { [path]: stringify(document) } }),
      /publisher evidence/u,
    );
  }
  const path = ".github/workflows/promote-release.yml";
  for (const change of [
    (job) => {
      job.if = false;
    },
    (job) => {
      job["continue-on-error"] = true;
    },
    (job) => {
      job.steps[0].if = false;
    },
    (job) => {
      job.steps[0]["continue-on-error"] = true;
    },
    (job) => {
      job.steps[0].env.NEEDS_JSON = "{}";
    },
  ]) {
    const document = read(path);
    change(document.jobs.complete);
    assert.throws(
      () => checkWorkflows({ overrides: { [path]: stringify(document) } }),
      /Completion|completion|dependency setup/u,
    );
  }
});

test("read-only release consumers cannot use npm before their dependency setup", () => {
  for (const [workflow, job, setup] of [
    ["release-qualification.yml", "resolve", "setup-producer"],
    ["release-qualification.yml", "security", "setup-producer"],
    ["release-registry.yml", "admit", "setup-producer"],
    ["release-registry.yml", "registry", "setup-producer"],
    ["release-registry.yml", "security", "setup-producer"],
    ["prepare-release-history.yml", "prepare", "setup-producer"],
    ["verify-release-completion.yml", "observe", "setup-writer"],
  ]) {
    const path = `.github/workflows/${workflow}`;
    const document = read(path);
    const steps = document.jobs[job].steps;
    const index = steps.findIndex(
      (step) => step.uses === `./.github/actions/${setup}`,
    );
    const [original] = steps.splice(index, 1);
    steps.splice(steps.findIndex((step) => step.run) + 1, 0, original);
    assert.throws(
      () => checkWorkflows({ overrides: { [path]: stringify(document) } }),
      /follow dependency setup/u,
      `${workflow}/${job}`,
    );
  }
});

test("release writers and their effect steps cannot be disabled or softened", () => {
  for (const [workflow, name] of [
    ["stage-release.yml", "stage"],
    ["github-release.yml", "archive"],
    ["promote-release.yml", "npm"],
    ["promote-release.yml", "github"],
  ])
    for (const change of [
      (job) => (job.if = false),
      (job) => (job["continue-on-error"] = true),
      (job) =>
        (job.steps.find(
          (step) => step.name === "Apply admitted release effect",
        ).if = false),
      (job) =>
        (job.steps.find(
          (step) => step.name === "Apply admitted release effect",
        )["continue-on-error"] = true),
    ]) {
      const path = `.github/workflows/${workflow}`;
      const document = read(path);
      change(document.jobs[name]);
      assert.throws(
        () => checkWorkflows({ overrides: { [path]: stringify(document) } }),
        /writer|effect/u,
        `${workflow}/${name}`,
      );
    }
});

test("availability completion executes its actual result gate before acquiring evidence", () => {
  const workflow = read(".github/workflows/promote-release.yml");
  const steps = workflow.jobs.complete.steps;
  const index = steps.findIndex(
    (step) => step.name === "Require successful selected availability writers",
  );
  assert.ok(index >= 0, "An explicitly skipped writer must fail completion");
  assert.ok(
    index <
      steps.findIndex(
        (step) => step.uses === "./.github/actions/setup-producer",
      ),
  );
  const gate = steps[index];
  assert.equal(gate.env.NEEDS_JSON, "${{ toJSON(needs) }}");
  assert.equal(gate.if, undefined);
  const code = /^node --input-type=module -e '([\s\S]+)'\s*$/u.exec(
    gate.run,
  )?.[1];
  assert.ok(code);
  for (const [availability, npm, github, success] of [
    ["npm-and-github", "success", "success", true],
    ["npm-only", "success", "skipped", true],
    ["npm-and-github", "success", "skipped", false],
    ["npm-and-github", "skipped", "skipped", false],
    ["npm-and-github", "failure", "skipped", false],
    ["npm-and-github", "success", "failure", false],
    ["npm-only", "success", "success", false],
    ["", "success", "skipped", false],
  ]) {
    const needs = {
      admit: { result: "success" },
      npm: { result: npm, outputs: { availability } },
      github: { result: github },
    };
    const result = spawnSync(
      process.execPath,
      ["--input-type=module", "--eval", code],
      {
        env: { ...process.env, NEEDS_JSON: JSON.stringify(needs) },
        encoding: "utf8",
        windowsHide: true,
        timeout: 10000,
      },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.status === 0, success, result.stderr);
  }
});

test("composite action dependencies resolve completely and cannot hide transfer deadlines", () => {
  const path = ".github/actions/setup-writer/action.yml";
  for (const step of [
    { uses: "./.github/actions/missing" },
    { uses: "./.github/actions/setup-writer" },
    {
      uses: "./.github/actions/download-evidence",
      with: { "artifact-id": "17", path: "retained" },
    },
  ]) {
    const document = read(path);
    document.runs.steps.push(step);
    assert.throws(
      () => checkWorkflows({ overrides: { [path]: stringify(document) } }),
      /local action|recursive|workflow step/u,
    );
  }
});

test("workflow callers reject unresolved local paths and mistyped literal inputs", () => {
  const path = ".github/workflows/release-qualification.yml";
  for (const change of [
    (doc) => {
      doc.jobs.resolve.steps.push({ uses: "./missing-action" });
    },
    (doc) => {
      doc.jobs.product.with["release-mode"] = "false";
    },
    (doc) => {
      doc.jobs.product.with.version = 102;
    },
  ]) {
    const document = read(path);
    change(document);
    assert.throws(
      () => checkWorkflows({ overrides: { [path]: stringify(document) } }),
      /local action|input type/u,
    );
  }
});
