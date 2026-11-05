// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fullCondition =
  "inputs.run_checks && inputs.verification_profile == 'full'";
const focusedCondition =
  "inputs.run_checks && inputs.verification_profile == 'cli-community'";
const focusedFiles = [
  "tests/cli-entry.test.js",
  "tests/cli-messages.test.js",
  "tests/cli-contracts.test.js",
  "tests/cli-stdin.test.js",
  "tests/selected-check.test.js",
  "tests/cli-flexibility.test.js",
  "tests/native/repository-rewrite.test.mjs",
  "tests/native/cli-events.test.mjs",
];

/** Admit source-bound builds and closed, separately labelled verification modes. */
export function checkNativeWorkflowContract({ producer, wrapper }) {
  const message = "Native workflow source or verification boundary drift";
  const inputs = producer.on.workflow_call.inputs;
  assert.equal(inputs.run_checks.type, "boolean", message);
  assert.equal(inputs.run_checks.default, true, message);
  assert.equal(inputs.verification_profile.type, "string", message);
  assert.equal(inputs.verification_profile.default, "full", message);
  for (const entry of [
    wrapper.on.workflow_call,
    wrapper.on.workflow_dispatch,
  ]) {
    assert.equal(entry.inputs.run_checks.type, "boolean", message);
    assert.equal(entry.inputs.run_checks.default, true, message);
    assert.equal(entry.inputs.verification_profile.default, "full", message);
  }
  assert.deepEqual(
    wrapper.on.workflow_dispatch.inputs.verification_profile.options,
    ["full", "cli-community"],
    message,
  );
  assert.equal(
    wrapper.on.workflow_call.inputs.verification_profile.type,
    "string",
    message,
  );
  assert.equal(
    wrapper.jobs.native.uses,
    "./.github/workflows/native-producer.yml",
    message,
  );
  assert.deepEqual(
    wrapper.jobs.native.with,
    {
      run_checks: "${{ inputs.run_checks }}",
      verification_profile: "${{ inputs.verification_profile }}",
    },
    message,
  );
  assert.deepEqual(producer.permissions, { contents: "read" }, message);
  assert.deepEqual(
    Object.keys(producer.jobs),
    ["component", "sanitizers"],
    message,
  );
  assert.deepEqual(
    producer.jobs.component.strategy.matrix.include,
    [
      { os: "windows-2025", platform: "win32-x64" },
      { os: "ubuntu-24.04", platform: "linux-x64" },
    ],
    message,
  );
  for (const job of Object.values(producer.jobs)) {
    const [admission, checkout, verify] = job.steps;
    assert.equal(admission.if, undefined, message);
    assert.equal(admission["continue-on-error"], undefined, message);
    assert.deepEqual(
      admission.env,
      {
        PRODUCER_REPOSITORY: "${{ job.workflow_repository }}",
        PRODUCER_SHA: "${{ job.workflow_sha }}",
        CALLER_REPOSITORY: "${{ github.repository }}",
        CALLER_SHA: "${{ github.sha }}",
        RUN_CHECKS: "${{ inputs.run_checks }}",
        VERIFICATION_PROFILE: "${{ inputs.verification_profile }}",
      },
      message,
    );
    assert.equal(
      admission.run.trim(),
      `[[ "$PRODUCER_REPOSITORY" == "Hadden-Industries/json-quality" && "$CALLER_REPOSITORY" == "$PRODUCER_REPOSITORY" ]]
[[ "$PRODUCER_SHA" =~ ^[a-f0-9]{40}$ && "$CALLER_SHA" == "$PRODUCER_SHA" ]]
case "$VERIFICATION_PROFILE" in full|cli-community) ;; *) echo 'Unknown verification profile' >&2; exit 2;; esac
[[ "$RUN_CHECKS" == "true" || "$RUN_CHECKS" == "false" ]]
[[ "$RUN_CHECKS" == "true" || "$VERIFICATION_PROFILE" == "full" ]]`,
      message,
    );
    assert.match(checkout.uses, /^actions\/checkout@[a-f0-9]{40}$/u, message);
    assert.equal(checkout.if, undefined, message);
    assert.deepEqual(
      checkout.with,
      {
        repository: "${{ job.workflow_repository }}",
        ref: "${{ job.workflow_sha }}",
        "persist-credentials": false,
      },
      message,
    );
    assert.equal(verify.if, undefined, message);
    assert.equal(verify["continue-on-error"], undefined, message);
    assert.deepEqual(
      verify.env,
      { PRODUCER_SHA: "${{ job.workflow_sha }}" },
      message,
    );
    assert.equal(
      verify.run,
      `node --input-type=module -e 'import assert from "node:assert/strict"; import {execFileSync} from "node:child_process"; import {readFileSync} from "node:fs"; assert.equal(execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(),process.env.PRODUCER_SHA); assert.equal(JSON.parse(readFileSync("package.json","utf8")).name,"@hadden-industries/json-quality");'`,
      message,
    );
  }
  const steps = producer.jobs.component.steps;
  const build = steps.find((step) => step.id === "build");
  const versionCheck = steps.find(
    (step) => step.run === "npm run check:version",
  );
  assert.ok(
    versionCheck && steps.indexOf(versionCheck) < steps.indexOf(build),
    message,
  );
  assert.equal(versionCheck.if, undefined, message);
  assert.equal(versionCheck["continue-on-error"], undefined, message);
  const policyCheck = steps.find(
    (step) => step.run === "npm run check:policy-inputs",
  );
  assert.ok(
    policyCheck && steps.indexOf(policyCheck) < steps.indexOf(build),
    message,
  );
  assert.equal(policyCheck.if, undefined, message);
  assert.equal(policyCheck["continue-on-error"], undefined, message);
  assert.match(build.run, /python native\/build\.py --workspace/u, message);
  assert.match(build.run, /result\['sourceInputsSha256'\]/u, message);
  const stage = steps.find((step) =>
    step.run?.includes("python native/stage.py"),
  );
  assert.equal(stage.if, "inputs.run_checks", message);
  assert.equal(
    stage.run,
    'python native/stage.py --artifacts "$NATIVE_ARTIFACTS" --replace',
    message,
  );
  const full = steps.find((step) => step.run === "npm run test:native");
  assert.equal(full.if, fullCondition, message);
  const focused = steps.find((step) => step.env?.CLI_COMMUNITY_TEST_NAMES);
  assert.equal(focused.if, focusedCondition, message);
  assert.equal(focused["continue-on-error"], undefined, message);
  assert.equal(
    focused.run.trim(),
    'node --test --test-concurrency=1 --test-name-pattern "$CLI_COMMUNITY_TEST_NAMES" ' +
      focusedFiles.join(" "),
    message,
  );
  const pattern = focused.env.CLI_COMMUNITY_TEST_NAMES;
  assert.ok(pattern.startsWith("^(") && pattern.endsWith(")$"), message);
  const selectedNames = pattern.slice(2, -2).split("|");
  assert.equal(new Set(selectedNames).size, selectedNames.length, message);
  const available = new Set(
    focusedFiles.flatMap((file) =>
      [
        ...readFileSync(
          new URL("../" + file, import.meta.url),
          "utf8",
        ).matchAll(/\btest\(\s*"([^"\n]+)"/gu),
      ].map((match) => match[1]),
    ),
  );
  for (const name of selectedNames)
    assert.ok(available.has(name), `${message}: unknown exact test ${name}`);
  assert.equal(producer.jobs.sanitizers.if, fullCondition, message);
  const payload = steps.find((step) => step.id === "payload");
  assert.equal(payload.uses, "./.github/actions/upload-evidence", message);
  assert.equal(payload.if, "success()", message);
  assert.equal(
    payload.with.name,
    "native-${{ matrix.platform }}-${{ job.workflow_sha }}-${{ inputs.run_checks && inputs.verification_profile || 'build-only' }}-${{ github.run_attempt }}",
    message,
  );
  const summary = steps.find((step) => step.env?.ARTIFACT_ID);
  assert.equal(
    summary.env.ARTIFACT_ID,
    "${{ steps.payload.outputs.artifact-id }}",
    message,
  );
  assert.equal(summary.env.SOURCE_SHA, "${{ job.workflow_sha }}", message);
  assert.equal(
    summary.env.SOURCE_INPUTS_SHA256,
    "${{ steps.build.outputs.source-inputs-sha256 }}",
    message,
  );
}
