// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { spawnSync } from "node:child_process";
import { preflightDispatch } from "../scripts/release-dispatch-preflight.js";
import {
  selectSupersededArtifacts,
  candidateArtifacts,
} from "../scripts/candidate-retention.js";

const qualification = parse(
  readFileSync(
    new URL("../.github/workflows/release-qualification.yml", import.meta.url),
    "utf8",
  ),
);
test("the actual dispatch contract rejects combined growth, unknown inputs and mistyped fresh selection", () => {
  const request = {
    ref: "main",
    inputs: { version: "1.0.1", "force-fresh": false },
  };
  assert.equal(preflightDispatch(qualification, request).valid, true);
  for (const inputs of [
    { ...request.inputs, unknown: "x" },
    { ...request.inputs, "force-fresh": "false" },
    {},
  ])
    assert.throws(() =>
      preflightDispatch(qualification, { ...request, inputs }),
    );
  assert.throws(() =>
    preflightDispatch(qualification, { ...request, ref: "one-oh-two" }),
  );
  const workflow = {
    on: {
      workflow_dispatch: {
        inputs: { one: { type: "string" }, two: { type: "string" } },
      },
    },
  };
  assert.throws(
    () =>
      preflightDispatch(workflow, {
        ref: "main",
        inputs: { one: "é".repeat(20000), two: "é".repeat(20000) },
      }),
    /Complete escaped/u,
  );
});

test("the production terminal gate accepts each valid branch and rejects skipped or failed obligations", () => {
  const command = qualification.jobs.qualified.steps[0].run.split("\n")[0];
  const match = /^node --input-type=module -e '(.*)'$/u.exec(command);
  assert.ok(match, "The test must execute the real gate program");
  const needs = (reused) => ({
    resolve: { result: "success", outputs: { reused } },
    product: { result: reused === "true" ? "skipped" : "success" },
    codeql: { result: reused === "true" ? "skipped" : "success" },
    security: { result: "success" },
  });
  const run = (value) =>
    spawnSync(process.execPath, ["--input-type=module", "-e", match[1]], {
      env: { ...process.env, NEEDS_JSON: JSON.stringify(value) },
      windowsHide: true,
    });
  for (const reused of ["true", "false"]) {
    assert.equal(run(needs(reused)).status, 0);
    for (const key of ["resolve", "security"])
      for (const result of ["failure", "skipped", "cancelled", undefined]) {
        const changed = needs(reused);
        changed[key].result = result;
        assert.notEqual(run(changed).status, 0);
      }
  }
  assert.equal(
    qualification.jobs.product.if,
    "inputs.force-fresh && needs.resolve.outputs.reused == 'false'",
  );
  assert.match(qualification.jobs.security.if, /!cancelled\(\)/u);
});

test("candidate cleanup protects its successor, active consumers, native origins and unknown ownership", () => {
  const runs = [
    {
      id: 1,
      path: ".github/workflows/ci.yml",
      event: "pull_request",
      status: "completed",
      conclusion: "success",
    },
  ];
  const artifact = {
    id: 10,
    name: "qualified-producer-1",
    expired: false,
    workflow_run: { id: 1 },
  };
  const args = {
    artifacts: [artifact],
    selectedIds: new Set([20]),
    selectedRun: 2,
    runs,
    currentRun: 3,
    referencesComplete: true,
  };
  assert.deepEqual(selectSupersededArtifacts(args), [artifact]);
  assert.deepEqual(
    selectSupersededArtifacts({ ...args, protectedIds: [10] }),
    [],
  );
  assert.deepEqual(
    selectSupersededArtifacts({ ...args, referencesComplete: false }),
    [],
  );
  assert.deepEqual(
    selectSupersededArtifacts({ ...args, selectedIds: new Set([10]) }),
    [],
  );
  assert.deepEqual(
    selectSupersededArtifacts({
      ...args,
      artifacts: [{ ...artifact, name: "native-linux-full-1" }],
    }),
    [],
  );
  for (const status of ["in_progress", "completed"])
    assert.deepEqual(
      selectSupersededArtifacts({
        ...args,
        runs: [
          ...runs,
          {
            id: 4,
            path: ".github/workflows/stage-release.yml",
            status,
            conclusion: "failure",
          },
        ],
      }),
      [],
    );
  assert.throws(
    () => candidateArtifacts({ schemaVersion: 2 }, [], {}),
    /release-capable/u,
  );
});
