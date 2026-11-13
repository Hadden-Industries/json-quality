// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { applyNpmFamily, applyGithubFamily } from "./promotion-family.js";
import {
  journalEffect,
  promotionPlan,
  verifyCompletedLabels,
  verifyGithubPromotionState,
  verifyNpmOnlyGithubState,
} from "./release-effects.js";

const npmTagReadbackBudgetMs = 300_000;
const npmTagReadbackMaxDelayMs = 16_000;

function sleepForReadback(ms) {
  // Release commands and their durable journal callbacks run synchronously.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** A deliberately service-specific mutation seam; tests supply recording transports. */
export function applyNpmAvailability(input, operations) {
  if (input.family) return applyNpmFamily(input, operations);
  assert.ok(
    !Object.hasOwn(operations, "writeGithubLatest"),
    "npm boundary cannot accept GitHub mutation",
  );
  const {
    journal,
    release,
    target,
    expected,
    planOptions,
    recovery,
    githubSnapshot,
    env,
  } = input;
  assert.equal(env.PROMOTION_SERVICE, "npm");
  const recovered = recovery?.observed.npmLatest === target;
  const { now = () => performance.now(), sleep = sleepForReadback } =
    operations;
  const readback = () => {
    const deadline = recovered ? undefined : now() + npmTagReadbackBudgetMs;
    const unresolved =
      "npm latest update outcome unresolved; inspect the registry before resuming";
    let npm = operations.readNpmTags(deadline);
    let backoff = 1_000;
    while (
      deadline !== undefined &&
      npm.latest !== target &&
      (npm.latest ?? null) === expected.latest
    ) {
      const remaining = deadline - now();
      if (remaining <= 0) break;
      sleep(Math.min(backoff, remaining));
      if (now() >= deadline) break;
      npm = operations.readNpmTags(deadline);
      backoff = Math.min(backoff * 2, npmTagReadbackMaxDelayMs);
    }
    assert.equal(npm.latest, target, unresolved);
    if (deadline !== undefined) assert.ok(now() < deadline, unresolved);
    const github = operations.readGithubState();
    if (planOptions.npmOnly) verifyNpmOnlyGithubState(githubSnapshot, github);
    else
      verifyGithubPromotionState(
        github.latest?.tag_name ?? null,
        expected,
        target,
        recovery,
      );
    return { npm, github };
  };
  const plan = promotionPlan(
    release,
    operations.readNpmTags(),
    expected,
    target,
    recovery,
    planOptions,
  );
  const guard = {
    availability: planOptions.npmOnly ? "npm-only" : "npm-and-github",
    targetVersion: target,
    priorLabels: expected,
    ...(planOptions.npmOnly ? { githubState: githubSnapshot } : {}),
  };
  const outcome = journalEffect(
    journal,
    release,
    recovered ? "completion-readback" : "npm-latest",
    () => {
      operations.assertCurrent();
      promotionPlan(
        release,
        operations.readNpmTags(),
        expected,
        target,
        recovery,
        planOptions,
      );
      if (planOptions.npmOnly)
        verifyNpmOnlyGithubState(githubSnapshot, operations.readGithubState());
      else
        verifyGithubPromotionState(
          operations.readGithubState().latest?.tag_name ?? null,
          expected,
          target,
          recovery,
        );
      if (!recovered) operations.writeNpmLatest(target);
      return readback();
    },
    { env, before: plan.before, guard },
  );
  return outcome.result;
}

export function applyGithubAvailability(input, operations) {
  if (input.family) return applyGithubFamily(input, operations);
  assert.ok(
    !Object.hasOwn(operations, "writeNpmLatest"),
    "GitHub boundary cannot accept npm mutation",
  );
  const { journal, release, target, expected, planOptions, recovery, env } =
    input;
  assert.equal(env.PROMOTION_SERVICE, "github");
  assert.equal(
    planOptions.npmOnly,
    false,
    "npm-only scope cannot enter a GitHub writer",
  );
  assert.equal(
    recovery?.observed.npmLatest,
    target,
    "Authenticated npm predecessor required",
  );
  const readback = () =>
    verifyCompletedLabels(
      target,
      operations.readNpmTags(),
      operations.readGithubState().latest,
    );
  const before = verifyGithubPromotionState(
    operations.readGithubState().latest?.tag_name ?? null,
    expected,
    target,
    recovery,
  );
  const recovered = recovery.observed.githubLatest === `v${target}`;
  const outcome = journalEffect(
    journal,
    release,
    recovered ? "completion-readback" : "github-latest",
    () => {
      operations.assertCurrent();
      assert.equal(operations.readNpmTags().latest, target);
      verifyGithubPromotionState(
        operations.readGithubState().latest?.tag_name ?? null,
        expected,
        target,
        recovery,
      );
      if (!recovered) operations.writeGithubLatest(target);
      return readback();
    },
    {
      env,
      before,
      guard: {
        availability: "npm-and-github",
        targetVersion: target,
        priorLabels: expected,
      },
    },
  );
  return outcome.result;
}
