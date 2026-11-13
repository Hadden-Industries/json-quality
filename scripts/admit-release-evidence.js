// SPDX-License-Identifier: AGPL-3.0-only
/** Read-only admission command; orchestration stays outside evidence validation. */
import assert from "node:assert/strict";
import { mkdirSync, appendFileSync, readdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readJson, manualControl, verifyRun } from "./release-contract.js";
import { download, provider } from "./release-provider.js";
import {
  assembleQualification,
  verifyBundle,
  refreshAdmission,
  acquireRecoveryJournal,
} from "./release-evidence.js";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(
    process.argv.length,
    5,
    "Use admit-release-evidence.js PHASE OUTPUT SCRATCH",
  );
  const [phase, output, scratch] = process.argv.slice(2);
  manualControl(process.env, phase);
  mkdirSync(scratch, { recursive: true });
  mkdirSync(output);
  if (phase === "stage" && process.env.STAGE_PHASE === "core") {
    assert.match(process.env.NATIVE_STAGE_RUN, /^[1-9]\d{0,15}$/u);
    assert.match(process.env.NATIVE_STAGE_ATTEMPT, /^[1-9]\d{0,15}$/u);
    assert.notEqual(
      process.env.NATIVE_STAGE_RUN,
      process.env.GITHUB_RUN_ID,
      "Core requires a new dispatch",
    );
    const prior = download(
      process.env.NATIVE_STAGE_RUN,
      process.env.NATIVE_STAGE_ATTEMPT,
      `effect-stage-${process.env.NATIVE_STAGE_ATTEMPT}`,
      scratch,
    );
    verifyBundle(prior.directory, process.env.MANIFEST_SHA);
    copyTree(prior.directory, output);
    const context = readJson(join(output, "context.json"));
    assert.equal(context.nativeStage.run, process.env.NATIVE_STAGE_RUN);
    assert.equal(context.nativeStage.attempt, process.env.NATIVE_STAGE_ATTEMPT);
    assert.ok(!context.stage, "Core was already requested");
    verifyRun(
      provider(context.nativeStage.run, context.nativeStage.attempt),
      "stage",
      context.nativeStage.controller,
      readJson(join(output, "release-manifest.json")).matrix,
      { stagePhase: "natives" },
    );
  } else if (phase === "stage")
    assembleQualification(
      process.env.QUALIFICATION_RUN,
      process.env.QUALIFICATION_ATTEMPT,
      output,
      scratch,
    );
  else {
    const operation =
      phase === "promote" && process.env.OPERATION_JSON
        ? JSON.parse(process.env.OPERATION_JSON)
        : null;
    const original =
      operation?.family?.operation === "scoped-restore"
        ? operation.originalEffect
        : null;
    const priorPhase = original
      ? original.phase
      : phase === "registry"
        ? "stage"
        : phase === "archive"
          ? "registry"
          : "archive";
    const run = process.env.PREVIOUS_RUN,
      attempt = process.env.PREVIOUS_ATTEMPT;
    if (original) {
      assert.equal(original.run, run);
      assert.equal(original.attempt, attempt);
      const recovery = JSON.parse(process.env.RECOVERY_JSON);
      for (const key of [
        "phase",
        "service",
        "run",
        "attempt",
        "journalSha256",
        "manifestSha256",
        "operationId",
      ])
        assert.deepEqual(recovery[key], original[key]);
    }
    let artifact;
    try {
      artifact = download(
        run,
        attempt,
        `${priorPhase === "registry" ? "public" : "effect"}-${priorPhase}${original?.service ? `-${original.service}` : ""}-${attempt}`,
        scratch,
      );
    } catch (error) {
      if (
        phase !== "promote" ||
        !process.env.OPERATION_JSON ||
        !(
          error.httpStatus === 404 ||
          /Expired native artifact|Missing or ambiguous native artifact/u.test(
            error.message,
          )
        )
      )
        throw error;
      const { recoverArchivedAdmission } =
        await import("./archived-release-evidence.js");
      recoverArchivedAdmission(output, process.env);
    }
    if (artifact) {
      verifyBundle(artifact.directory, process.env.MANIFEST_SHA);
      copyTree(artifact.directory, output);
    }
  }
  acquireRecoveryJournal(output, scratch, process.env);
  const admitted = refreshAdmission(output, phase, process.env, {
    historyRoot: scratch,
  });
  if (["stage", "archive", "promote"].includes(phase)) {
    const prepared =
      phase === "promote" && process.env.OPERATION_JSON
        ? (await import("./release-promotion.js")).preparePromotion(
            output,
            scratch,
            "admit",
            process.env,
            admitted,
          )
        : null;
    const { prepareWriterAdmission } =
      await import("./release-writer-admission.js");
    prepareWriterAdmission(output, phase, admitted, process.env, prepared);
  }
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `attest-required=${phase === "archive" && !admitted.recovery?.archive}\n`,
    );
  if (phase !== "stage") {
    const original =
      phase === "promote" && process.env.OPERATION_JSON
        ? JSON.parse(process.env.OPERATION_JSON).originalEffect
        : null;
    if (original) {
      assert.equal(original.run, process.env.PREVIOUS_RUN);
      assert.equal(original.attempt, process.env.PREVIOUS_ATTEMPT);
    } else {
      const priorPhase =
        phase === "registry"
          ? "stage"
          : phase === "archive"
            ? "registry"
            : "archive";
      assert.equal(admitted.context[priorPhase].run, process.env.PREVIOUS_RUN);
      assert.equal(
        admitted.context[priorPhase].attempt,
        process.env.PREVIOUS_ATTEMPT,
      );
    }
  }
}
function copyTree(from, to) {
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      mkdirSync(join(to, entry.name));
      copyTree(join(from, entry.name), join(to, entry.name));
    } else {
      assert.ok(entry.isFile());
      copyFileSync(join(from, entry.name), join(to, entry.name), 1);
    }
  }
}
