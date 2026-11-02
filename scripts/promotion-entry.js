// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  effectJournal,
  readJson,
  regularBytes,
  repository,
  save,
  sha256,
} from "./release-contract.js";
import { currentMain, sealBundle } from "./release-provider.js";
import { preparePromotion } from "./release-promotion.js";
import { recordNoRequest } from "./release-effects.js";

export function runPromotionService(
  service,
  apply,
  mutation,
  argv = process.argv,
  environment = process.env,
) {
  assert.equal(argv.length, 4);
  assert.ok(["npm", "github"].includes(service));
  const [directory, scratch] = argv.slice(2);
  const env = { ...environment, PROMOTION_SERVICE: service };
  mkdirSync(scratch, { recursive: true });
  const origin = {
    run: env.GITHUB_RUN_ID,
    attempt: env.GITHUB_RUN_ATTEMPT,
    service,
  };
  const journalName = effectJournal("promote", origin);
  const journal = join(directory, journalName);
  try {
    if (service === "github") {
      for (const name of [
        "ACTIONS_ID_TOKEN_REQUEST_URL",
        "ACTIONS_ID_TOKEN_REQUEST_TOKEN",
        "NPM_TOKEN",
        "NODE_AUTH_TOKEN",
      ])
        assert.ok(!env[name], `GitHub promotion must not have ${name}`);
    } else {
      assert.ok(
        env.ACTIONS_ID_TOKEN_REQUEST_URL && env.ACTIONS_ID_TOKEN_REQUEST_TOKEN,
        "npm OIDC authority required",
      );
      assert.ok(
        !env.NPM_TOKEN && !env.NODE_AUTH_TOKEN,
        "Long-lived npm tokens are forbidden",
      );
    }
    const prepared = preparePromotion(directory, scratch, service, env);
    writeFileSync(journal, "", { flag: "wx", flush: true });
    const operations = {
      assertCurrent: () => currentMain(env),
      readNpmTags: prepared.tags,
      readGithubState: prepared.currentGithubState,
      ...mutation(prepared),
    };
    const completed = apply({ ...prepared, journal, env }, operations);
    if (service === "npm") {
      save(join(directory, "npm-continuation.json"), {
        schemaVersion: 1,
        state: "npm-complete",
        repository,
        controller: env.GITHUB_SHA,
        source: prepared.release.source.commit,
        manifestSha256: env.MANIFEST_SHA,
        reviewSha256: env.REVIEW_SHA,
        acceptanceSha256: env.ACCEPTANCE_SHA,
        restorationSha256: env.RESTORATION_SHA || null,
        version: prepared.target,
        targetIntegrity: prepared.auditRelease.archive.integrity,
        availability: prepared.availability,
        priorLabels: prepared.expected,
        origin,
        journal: journalName,
        journalSha256: sha256(regularBytes(journal)),
        npm: completed.npm,
        githubLatest: completed.github.latest?.tag_name ?? null,
        githubSnapshot: prepared.githubSnapshot ?? null,
      });
      if (env.GITHUB_OUTPUT)
        appendFileSync(
          env.GITHUB_OUTPUT,
          `availability=${prepared.availability}\n`,
        );
    } else {
      save(join(directory, "github-continuation.json"), {
        schemaVersion: 1,
        state: "github-complete",
        origin,
        npmContinuationSha256: sha256(
          regularBytes(join(directory, "npm-continuation.json")),
        ),
        journal: journalName,
        journalSha256: sha256(regularBytes(journal)),
        ...completed,
      });
    }
  } catch (error) {
    if (!existsSync(journal) || regularBytes(journal).length === 0)
      recordNoRequest(directory, "promote", env);
    throw error;
  } finally {
    // Preserve original intent/outcome bytes, including failures and unknown effects.
    if (existsSync(join(directory, "release-manifest.json"))) {
      assert.equal(
        sha256(regularBytes(join(directory, "release-manifest.json"))),
        env.MANIFEST_SHA,
      );
      readJson(join(directory, "release-manifest.json"));
      sealBundle(directory, env.MANIFEST_SHA);
    }
  }
}
