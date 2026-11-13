// SPDX-License-Identifier: AGPL-3.0-only
/** Public failure reporting retains approvals and both original staging origins. */
import assert from "node:assert/strict";
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  readJson,
  regularBytes,
  save,
  sha256,
  effectJournal,
  verifyManifest,
  releasePackages,
  npmViewObject,
} from "./release-contract.js";
import { npmCommand } from "./qualification-process.js";
import { optionalApi } from "./release-provider.js";
import { sealBundle } from "./release-records.js";

export function originalStageJournals(directory, context) {
  return [context.nativeStage, context.stage]
    .filter(Boolean)
    .filter(
      (origin, index, all) =>
        all.findIndex(
          (value) =>
            value.run === origin.run && value.attempt === origin.attempt,
        ) === index,
    )
    .map((origin) => ({
      origin,
      name: effectJournal("stage", origin),
      sha256: sha256(
        regularBytes(join(directory, effectJournal("stage", origin))),
      ),
    }));
}

export function reportPublicQualification(
  directory,
  env = process.env,
  readers = {},
) {
  const manifest = regularBytes(join(directory, "release-manifest.json"));
  assert.equal(sha256(manifest), env.MANIFEST_SHA);
  const release = verifyManifest(JSON.parse(manifest)),
    context = readJson(join(directory, "context.json"));
  const outcome = readJson(join(directory, "stage-outcome.json"));
  assert.equal(outcome.manifestSha256, env.MANIFEST_SHA);
  const jobs = JSON.parse(env.NEEDS_JSON);
  assert.ok(
    Object.values(jobs).some((job) => job.result !== "success"),
    "Failure report requires failed public qualification",
  );
  const path = join(
    directory,
    `public-qualification-incomplete-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}.json`,
  );
  const record = {
    schemaVersion: 1,
    state: "public-qualification-incomplete",
    manifestSha256: env.MANIFEST_SHA,
    jobs,
    observed: [],
    originalStages: originalStageJournals(directory, context),
    githubLatest: { state: "unobserved" },
    githubClassification: "held-awaiting-successful-public-qualification",
    observedAt: new Date().toISOString(),
    nextAction:
      "Reconcile original approvals and failed proof before a fresh read-only qualification; no label writes are authorized",
  };
  save(path, record);
  const persist = () =>
    writeFileSync(path, JSON.stringify(record, null, 2) + "\n", {
      flush: true,
    });
  const unavailable = (error) => ({
    state: "unavailable",
    code: error.code ?? null,
    httpStatus: error.httpStatus ?? null,
  });
  for (const subject of releasePackages(release)) {
    const approved = outcome.result.stages.find(
      (stage) => stage.package === subject.package,
    );
    assert.ok(approved);
    const result = {
      package: subject.package,
      version: release.version,
      integrity: subject.archive.integrity,
      stageId: approved.stageId,
      origin: context.packageOrigins?.[subject.package] ?? context.stage,
    };
    try {
      const tags = npmViewObject(
        (readers.npmCommand ?? npmCommand)([
          "view",
          subject.package,
          "dist-tags",
          "--json",
          "--registry=https://registry.npmjs.org/",
        ]),
      );
      Object.assign(result, {
        state: "observed",
        tags,
        defaultIdentifiesCandidate: tags.latest === release.version,
      });
    } catch (error) {
      Object.assign(result, unavailable(error));
    }
    record.observed.push(result);
    persist();
  }
  try {
    record.githubLatest = (readers.optionalApi ?? optionalApi)(
      "releases/latest",
    );
  } catch (error) {
    record.githubLatest = unavailable(error);
  }
  persist();
  sealBundle(directory, env.MANIFEST_SHA);
  return record;
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  reportPublicQualification(process.argv[2]);
