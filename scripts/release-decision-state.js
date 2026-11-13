// SPDX-License-Identifier: AGPL-3.0-only
/** One pending owner decision survives dispatch completion and approval boundaries. */
import assert from "node:assert/strict";
import { sha256, effectJournal } from "./release-records.js";
import { releasePackages } from "./release-contract.js";
import { verifyQualifiedTarget } from "./qualified-release-contract.js";

/** Native history and owner-signed target checkpoints are supplied by read-only admission. */
export function admitPendingDecisions(
  history,
  release,
  qualifiedTargets,
  recovery,
  { review, reviewSha256, resolveTarget, settledStages = [] } = {},
) {
  const superseded = new Set(),
    checked = new Map();
  const settlements = recovery?.entries ?? [];
  for (const entry of history.filter(
    (value) => value.phase === "stage" && value.journal?.length,
  )) {
    const records = new TextDecoder("utf-8", { fatal: true })
      .decode(entry.journal)
      .trim()
      .split("\n")
      .map(JSON.parse);
    const intents = records.filter(
      (_, index) =>
        index % 2 === 0 && records[index + 1]?.state !== "request-not-sent",
    );
    if (!intents.length) continue;
    const manifestSha = intents[0].manifestSha256,
      version = intents[0].version;
    const settlement = settlements.find(
      ({ record, observed }) =>
        record.disposition === "supersede" &&
        record.phase === "stage" &&
        record.run === String(entry.run.id) &&
        record.attempt === String(entry.run.run_attempt) &&
        record.journalSha256 === sha256(entry.journal) &&
        observed?.state === "superseded-family-reconciled",
    );
    if (version === release.version) {
      if (settlement) {
        assert.ok(
          review &&
            reviewSha256 &&
            reviewSha256 !== settlement.record.reviewSha256 &&
            Date.parse(review.acceptedAt) >
              Date.parse(settlement.record.acceptedAt),
          "Superseded release requires a fresh owner review of current defaults",
        );
        superseded.add(`${entry.run.id}/${entry.run.run_attempt}`);
      }
      continue;
    }
    if (settlement) continue;
    const compact = settledStages.filter(
      (stage) =>
        stage.run === String(entry.run.id) &&
        stage.attempt === String(entry.run.run_attempt) &&
        stage.journalSha256 === sha256(entry.journal),
    );
    if (compact.length) {
      assert.equal(compact.length, 1);
      assert.deepEqual(
        compact[0].subjects,
        intents.map(
          ({ package: name, version, source, manifestSha256, integrity }) => ({
            package: name,
            version,
            source,
            manifestSha256,
            integrity,
          }),
        ),
      );
      assert.ok(
        intents.every((intent) => intent.controller === compact[0].controller),
      );
      continue;
    }
    if (!checked.has(manifestSha)) {
      const target =
        qualifiedTargets.find(
          (value) =>
            value.version === version && value.manifestSha256 === manifestSha,
        ) ?? resolveTarget?.(version, manifestSha);
      assert.ok(
        target,
        "Another release decision has outstanding native approvals; reconcile and explicitly supersede it before advancing",
      );
      const verified = verifyQualifiedTarget(target, {
        version,
        manifestSha256: manifestSha,
        releaseId: target.release.id,
      });
      checked.set(manifestSha, {
        release: verified.release,
        context: verified.context,
        files: new Map(
          target.qualification.files.map((file) => [
            file.name,
            Buffer.from(file.bytes, "base64"),
          ]),
        ),
      });
    }
    const qualified = checked.get(manifestSha);
    for (const intent of intents) {
      const index = records.indexOf(intent) / 2;
      assert.equal(intent.version, version);
      assert.equal(intent.manifestSha256, manifestSha);
      if (records[index * 2 + 1]?.state !== "completed") {
        const retained = qualified.files.get(
          effectJournal("stage", {
            run: entry.run.id,
            attempt: entry.run.run_attempt,
          }),
        );
        assert.ok(
          retained && sha256(retained) === sha256(entry.journal),
          "Unknown staging effect requires its exact qualified journal",
        );
        const observations = JSON.parse(
          qualified.files.get("recovery-observations.json") ?? "[]",
        );
        assert.ok(
          observations.some(
            ({ record, observed }) =>
              record.phase === "stage" &&
              record.run === String(entry.run.id) &&
              record.attempt === String(entry.run.run_attempt) &&
              record.journalSha256 === sha256(entry.journal) &&
              observed?.stages?.some(
                (stage) =>
                  stage.package === intent.package &&
                  stage.integrity === intent.integrity &&
                  stage.version === version,
              ),
          ),
          "Unknown staging effect requires an authenticated settlement",
        );
      }
      const subject = releasePackages(qualified.release).find(
        (value) => value.package === intent.package,
      );
      assert.ok(subject);
      assert.equal(subject.archive.integrity, intent.integrity);
      const origin =
        qualified.context.packageOrigins?.[intent.package] ??
        qualified.context.stage;
      for (const key of ["run", "attempt", "controller"])
        assert.equal(
          origin[key],
          intent[key],
          "Qualified target does not settle the original staging request",
        );
    }
  }
  return superseded;
}
