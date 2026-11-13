// SPDX-License-Identifier: AGPL-3.0-only
/** Prepare complete recovery evidence; publication and owner signing remain separate actions. */
import assert from "node:assert/strict";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readJson, save, sha256, regularBytes } from "./release-records.js";
import {
  provider,
  effectAttempt,
  download,
  readEffectHistory,
  readHistoryRecord,
  exportHistoryRecord,
} from "./release-provider.js";
import { collectQualifiedTarget } from "./qualified-release-checkpoint.js";
import { writeQualifiedTargetBundle } from "./release-history-targets.js";

export function prepareReleaseHistory(
  run,
  attempt,
  output,
  scratch,
  _env = process.env,
) {
  for (const value of [run, attempt]) assert.match(value, /^[1-9]\d{0,15}$/u);
  mkdirSync(output, { recursive: true });
  mkdirSync(scratch, { recursive: true });
  const observed = provider(run, attempt);
  assert.equal(
    observed.run.repository.full_name,
    "Hadden-Industries/json-quality",
  );
  assert.equal(observed.run.head_branch, "main");
  assert.equal(observed.run.status, "completed");
  const phase =
    observed.run.path === ".github/workflows/github-release.yml"
      ? "archive"
      : "promote";
  assert.equal(
    observed.run.path,
    `.github/workflows/${phase === "archive" ? "github-release" : "promote-release"}.yml`,
  );
  const job =
    phase === "archive"
      ? "archive"
      : observed.jobs.jobs.find(
            (value) =>
              value.name === "github" && value.conclusion !== "skipped",
          )
        ? "github"
        : "npm";
  const readinessPath = join(output, "checkpoint-readiness.json");
  const readiness = {
    schemaVersion: 1,
    originalOperation: { run, attempt },
    originalWriter: job,
    originalConclusion: observed.jobs.jobs.find((value) => value.name === job)
      ?.conclusion,
    publicationVerification: "unresolved",
    recoveryEligibility: "incomplete",
    note: "Unknown writer effects remain unknown. Sign the entire prepared directory in one commit under a fresh release-history tag only after reviewing readiness.",
  };
  save(join(output, "original-operation-provider.json"), observed);
  save(readinessPath, readiness);
  const persist = () =>
    writeFileSync(readinessPath, JSON.stringify(readiness, null, 2) + "\n", {
      flush: true,
    });
  try {
    const original = effectAttempt(observed, job);
    const acquired = download(
        run,
        original,
        `effect-${phase}${phase === "promote" ? `-${job}` : ""}-${original}`,
        scratch,
      ),
      directory = acquired.directory;
    const review = readJson(join(directory, "release-review.json"));
    const operation = readdirSync(directory).includes(
      "availability-operation.json",
    )
      ? readJson(join(directory, "availability-operation.json"))
      : null;
    const checkpoint = operation?.historyCheckpoint ?? review.historyCheckpoint;
    const previous = checkpoint ? readHistoryRecord(checkpoint) : null;
    const history = readEffectHistory(
      {},
      scratch,
      checkpoint,
      previous ? { checkpoint: () => previous.entries } : {},
    );
    const base = {
      ...exportHistoryRecord(history),
      ...(previous?.stageCancellations
        ? { stageCancellations: previous.stageCancellations }
        : {}),
    };
    const historyPath = join(output, "release-history.json");
    save(historyPath, base);
    readiness.writerHistory = "retained-original-outcomes";
    persist();
    const additions = [];
    const stageOnlySource =
      operation?.family?.operation === "scoped-restore" &&
      operation.originalEffect?.phase === "stage";
    try {
      if (stageOnlySource) {
        readiness.publicationVerification =
          "source-stage-only-selected-restoration-targets-verified";
      } else {
        const current = collectQualifiedTarget(directory, scratch, {
          checkpoint,
        });
        additions.push(current.record);
        readiness.signatureDueBy = current.signatureDueBy;
        readiness.publicationVerification =
          observed.run.conclusion === "success"
            ? "public-qualification-and-original-operation-verified"
            : "qualified-target-verified-writer-outcome-unresolved";
      }
    } catch (error) {
      readiness.targetCollection = {
        state: "incomplete",
        reason: error.message,
      };
    }
    for (const name of readdirSync(directory).filter((name) =>
      /^qualified-target-.*\.json$/u.test(name),
    ))
      additions.push(readJson(join(directory, name)));
    const refs = writeQualifiedTargetBundle(output, previous, additions);
    if (stageOnlySource)
      for (const selected of operation.targets)
        assert.ok(
          refs.some(
            (ref) =>
              ref.version === selected.version &&
              ref.manifestSha256 === selected.manifestSha256 &&
              ref.releaseId === selected.releaseId,
          ),
          "Selected restoration target is missing from signed history preparation",
        );
    writeFileSync(
      historyPath,
      JSON.stringify({ ...base, qualifiedTargetRefs: refs }, null, 2) + "\n",
      { flush: true },
    );
    const bytes = regularBytes(historyPath);
    assert.ok(
      bytes.length <= 20000000,
      "Writer history index exceeds authenticated reader capability",
    );
    readiness.sha256 = sha256(bytes);
    readiness.targetVersions = refs.map((ref) => ref.version);
    readiness.recoveryEligibility = refs.length
      ? "awaiting-owner-signature"
      : "writer-history-only-awaiting-owner-signature";
    readiness.state =
      readiness.originalConclusion === "success" && !readiness.targetCollection
        ? "prepared"
        : "prepared-with-unresolved-effects";
    persist();
    return readiness;
  } catch (error) {
    readiness.state = "preparation-incomplete";
    readiness.reason = error.message;
    persist();
    return readiness;
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 6);
  const result = prepareReleaseHistory(...process.argv.slice(2));
  if (result.state !== "prepared") process.exitCode = 1;
}
