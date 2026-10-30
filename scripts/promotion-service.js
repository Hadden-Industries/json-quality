// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import {
  journalEffect,
  promotionPlan,
  verifyCompletedLabels,
  verifyGithubPromotionState,
  verifyNpmOnlyGithubState,
} from "./release-effects.js";

/** A deliberately service-specific mutation seam; tests supply recording transports. */
export function applyNpmAvailability(input, operations) {
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
  const readback = () => {
    const npm = operations.readNpmTags();
    assert.equal(npm.latest, target);
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
  const recovered = recovery?.observed.npmLatest === target;
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
