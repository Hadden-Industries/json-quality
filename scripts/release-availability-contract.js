// SPDX-License-Identifier: AGPL-3.0-only
/** Owner approval contracts, independent of admission orchestration. */
import assert from "node:assert/strict";
import { sha256, requestedIntents } from "./release-records.js";
import { verifyFamilyScope } from "./promotion-family.js";

/** A current control review supplements immutable publication decisions. */
export function verifyOperationDecision(bytes, digest, release, env) {
  assert.match(digest, /^[a-f0-9]{64}$/u);
  assert.equal(
    sha256(bytes),
    digest,
    "Availability operation differs from owner review",
  );
  const decision = JSON.parse(bytes);
  assert.equal(decision.schemaVersion, 2);
  assert.equal(decision.phase, "availability");
  assert.equal(decision.owner, "maksymshostak");
  assert.equal(decision.source, release.source.commit);
  assert.equal(decision.version, release.version);
  assert.equal(decision.manifestSha256, env.MANIFEST_SHA);
  assert.equal(decision.originalReviewSha256, env.REVIEW_SHA);
  assert.equal(decision.controllerSource, env.GITHUB_SHA);
  assert.ok(
    (Number.isSafeInteger(decision.sourceReleaseId) &&
      decision.sourceReleaseId > 0) ||
      (decision.sourceReleaseId === null &&
        decision.family?.operation === "scoped-restore" &&
        decision.originalEffect?.phase === "stage"),
  );
  assert.ok(
    Number.isFinite(Date.parse(decision.acceptedAt)) &&
      decision.rationale?.trim().length >= 20,
  );
  assert.ok(
    decision.family && !Object.hasOwn(decision.family, "operationId"),
    "Operation identity is derived from reviewed bytes",
  );
  const family = { ...decision.family, operationId: digest };
  verifyFamilyScope(family, release);
  if (family.operation === "scoped-restore") {
    const effect = decision.originalEffect;
    assert.ok(
      effect && ["stage", "promote"].includes(effect.phase),
      "Scoped restoration requires an original effect",
    );
    for (const key of ["run", "attempt"])
      assert.match(effect[key], /^[1-9]\d{0,15}$/u);
    assert.equal(effect.manifestSha256, env.MANIFEST_SHA);
    assert.match(effect.journalSha256, /^[a-f0-9]{64}$/u);
    if (effect.phase === "promote") {
      assert.ok(["npm", "github"].includes(effect.service));
      assert.match(effect.operationId, /^[a-f0-9]{64}$/u);
    }
  }
  assert.ok(
    Array.isArray(decision.targets) &&
      (decision.targets.length > 0 ||
        (family.operation === "scoped-restore" &&
          family.subjects.some((subject) => subject.selected) &&
          family.subjects
            .filter((subject) => subject.selected)
            .every((subject) => subject.target === null))) &&
      decision.targets.length <= 3,
  );
  assert.equal(
    new Set(decision.targets.map((value) => value.version)).size,
    decision.targets.length,
  );
  for (const target of decision.targets) {
    assert.match(target.manifestSha256, /^[a-f0-9]{64}$/u);
    assert.ok(Number.isSafeInteger(target.releaseId) && target.releaseId > 0);
  }
  return { ...decision, family };
}

/** A scoped undo may select only effects established by the exact original journal and settlement. */
export function verifyScopedRestoration(
  decision,
  release,
  settlement,
  journal,
  originalReview,
) {
  const effect = decision.originalEffect,
    { family } = decision;
  assert.equal(family.operation, "scoped-restore");
  assert.ok(
    settlement,
    "Original effect requires authenticated native settlement",
  );
  for (const key of [
    "phase",
    "service",
    "run",
    "attempt",
    "manifestSha256",
    "journalSha256",
    "operationId",
  ])
    assert.deepEqual(
      settlement.record[key],
      effect[key],
      `Scoped restoration selected a different original ${key}`,
    );
  assert.equal(sha256(journal), effect.journalSha256);
  assert.ok(
    Date.parse(decision.acceptedAt) >= Date.parse(settlement.record.acceptedAt),
    "Restore approval predates original settlement",
  );
  const intents = requestedIntents(
    new TextDecoder("utf-8", { fatal: true })
      .decode(journal)
      .trim()
      .split("\n")
      .map(JSON.parse),
  );
  assert.ok(intents.length);
  const originalFamily = intents[0].guard?.family;
  const marker = (value) =>
    value
      ? { id: value.id, tag_name: value.tag_name, prerelease: value.prerelease }
      : null;
  if (effect.phase === "stage") {
    assert.equal(settlement.record.disposition, "restore-labels");
    assert.equal(settlement.observed.state, "staged-labels-settled");
    assert.equal(
      originalReview.npmTag,
      "latest",
      "Pilot stages did not change package defaults",
    );
    assert.equal(
      family.github.selected,
      false,
      "Native staging supplied no GitHub label effect",
    );
  } else {
    assert.equal(settlement.observed.state, "family-effects-settled");
    assert.equal(originalFamily.operationId, effect.operationId);
  }
  for (const subject of family.subjects.filter((entry) => entry.selected)) {
    const intent = intents.find(
      (entry) =>
        entry.package === subject.package &&
        (effect.phase === "stage"
          ? entry.operation === `stage:${subject.package}`
          : entry.operation === `npm-latest:${subject.package}`),
    );
    assert.ok(
      intent,
      "Selected label was not changed by the original operation",
    );
    assert.equal(
      effect.service === "github",
      false,
      "A GitHub-only original operation changed no npm labels",
    );
    const original = originalFamily?.subjects.find(
      (entry) => entry.package === subject.package,
    );
    assert.equal(
      subject.prior,
      effect.phase === "stage" ? release.version : original.target,
      "Restore preimage differs from the original applied effect",
    );
    assert.equal(
      subject.target,
      effect.phase === "stage"
        ? originalReview.priorAvailability.npmLatest[subject.package]
        : original.prior,
      "Scoped restore must return to the original reviewed prior value",
    );
    if (effect.phase === "stage")
      assert.ok(
        settlement.observed.stages.some(
          (stage) =>
            stage.package === subject.package &&
            stage.state === "public-provenance-verified",
        ),
      );
  }
  if (family.github.selected) {
    assert.ok(
      effect.phase === "promote" &&
        effect.service === "github" &&
        intents.some((entry) => entry.operation === "github-latest"),
      "Original operation changed no GitHub latest marker",
    );
    assert.deepEqual(
      marker(family.github.prior),
      marker(originalFamily.github.target),
    );
    assert.deepEqual(
      marker(family.github.target),
      marker(originalFamily.github.prior),
    );
  }
  return true;
}
