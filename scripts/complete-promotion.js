// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { preparePromotion } from "./release-promotion.js";
import { save } from "./release-contract.js";
import { currentMain, sealBundle } from "./release-provider.js";
import {
  verifyCompletedLabels,
  verifyNpmOnlyGithubState,
} from "./release-effects.js";

assert.equal(process.argv.length, 4);
const [directory, scratch] = process.argv.slice(2),
  env = process.env;
assert.equal(env.NPM_RESULT, "success");
mkdirSync(scratch, { recursive: true });
const prepared = preparePromotion(directory, scratch, "complete", env);
let completed;
if (prepared.availability === "npm-only") {
  assert.equal(env.GITHUB_RESULT, "skipped");
  const npm = prepared.tags();
  assert.equal(npm.latest, prepared.target);
  completed = {
    npm,
    github: verifyNpmOnlyGithubState(
      prepared.continuation.githubSnapshot,
      prepared.currentGithubState(),
    ),
  };
} else {
  assert.equal(
    env.GITHUB_RESULT,
    "success",
    "Dual-service scope requires the GitHub writer",
  );
  assert.ok(
    prepared.githubContinuation,
    "Authenticated GitHub completion is required",
  );
  completed = verifyCompletedLabels(
    prepared.target,
    prepared.tags(),
    prepared.currentGithubState().latest,
  );
}
currentMain(env);
save(
  join(
    directory,
    `promotion-completion-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}.json`,
  ),
  {
    schemaVersion: 2,
    state: "completed",
    availability: prepared.availability,
    source: prepared.release.source.commit,
    controller: env.GITHUB_SHA,
    manifestSha256: env.MANIFEST_SHA,
    version: prepared.target,
    priorLabels: prepared.expected,
    ...completed,
    observedAt: new Date().toISOString(),
  },
);
sealBundle(directory, env.MANIFEST_SHA);
