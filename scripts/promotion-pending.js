// SPDX-License-Identifier: AGPL-3.0-only
/** Read-only admission of native acknowledged requests; never a continuation for writes. */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
  effectJournal,
  regularBytes,
  sha256,
  repository,
} from "./release-contract.js";
import { api, provider, effectAttempt } from "./release-provider.js";
import { verifyPromotionJournal } from "./promotion-handoff.js";

const marker = (value) =>
  value ? [value.id, value.tag_name, value.prerelease] : null;

export function plannedServiceRequests(family, service) {
  if (service === "npm")
    return family.subjects
      .filter((subject) => subject.selected && subject.prior !== subject.target)
      .map((subject) => `npm-latest:${subject.package}`);
  return isDeepStrictEqual(
    marker(family.github.prior),
    marker(family.github.target),
  ) &&
    isDeepStrictEqual(
      marker(family.github.targetPrior),
      marker(family.github.target),
    )
    ? []
    : ["github-latest"];
}

/** Pure file validation is separated from native artifact/job authentication for focused proof. */
export function inspectAcknowledgedService(
  directory,
  service,
  origin,
  release,
  family,
  env,
) {
  const name = effectJournal("promote", origin),
    path = join(directory, name);
  if (!existsSync(path)) return "writer-outcome-unresolved";
  let acknowledged = true;
  const planned = plannedServiceRequests(family, service);
  const lines = verifyPromotionJournal(
    service,
    regularBytes(path),
    origin,
    release,
    env,
    family,
    {
      allowPartial: true,
      allowUnconfirmed(intent, outcome) {
        if (intent.operation === "completion-readback")
          return planned.length === 0;
        if (outcome?.state === "request-not-sent") {
          assert.equal(outcome.requestStarted, false);
          acknowledged = false;
          return true;
        }
        assert.ok(!outcome || outcome.state === "outcome-unknown");
        const digest = sha256(Buffer.from(JSON.stringify(intent) + "\n"));
        const ackPath = `${path}.${digest}.ack.json`;
        if (!existsSync(ackPath)) {
          acknowledged = false;
          return true;
        }
        const bytes = regularBytes(ackPath),
          ack = JSON.parse(bytes);
        assert.equal(ack.schemaVersion, 1);
        assert.equal(ack.state, "request-acknowledged");
        assert.equal(ack.intentSha256, digest);
        assert.ok(Number.isFinite(Date.parse(ack.observedAt)));
        if (outcome) {
          assert.equal(outcome.requestAcknowledged, true);
          assert.equal(outcome.acknowledgementSha256, sha256(bytes));
        }
        return true;
      },
    },
  );
  const operations = lines
    .filter((_, index) => index % 2 === 0)
    .map((intent) => intent.operation);
  assert.ok(
    operations.every((operation) =>
      (planned.length ? planned : ["completion-readback"]).includes(operation),
    ),
    "Journal differs from planned native requests",
  );
  if (!acknowledged) return "writer-outcome-unresolved";
  if (planned.some((operation) => !operations.includes(operation)))
    return "writer-operation-incomplete";
  return "acknowledged";
}

export function admitAcknowledgedService(directory, service, admitted, env) {
  const observed = provider(env.GITHUB_RUN_ID, env.GITHUB_RUN_ATTEMPT);
  assert.equal(observed.run.repository.full_name, repository);
  assert.equal(observed.run.head_sha, env.GITHUB_SHA);
  const attempt = effectAttempt(observed, service);
  const id =
    env[service === "npm" ? "NPM_CONTINUATION_ID" : "GITHUB_CONTINUATION_ID"];
  if (!id) return "writer-outcome-unresolved";
  const artifact = api(`actions/artifacts/${id}`);
  assert.equal(artifact.id, Number(id));
  assert.equal(artifact.expired, false);
  assert.match(artifact.digest, /^sha256:[a-f0-9]{64}$/u);
  assert.match(
    artifact.name,
    new RegExp(
      `^effect-promote-${service}-${attempt}(?:-recovery-[23])?$`,
      "u",
    ),
  );
  assert.equal(artifact.workflow_run.id, Number(env.GITHUB_RUN_ID));
  assert.equal(artifact.workflow_run.head_sha, env.GITHUB_SHA);
  assert.equal(
    artifact.workflow_run.repository_id,
    Number(env.GITHUB_REPOSITORY_ID),
  );
  return inspectAcknowledgedService(
    directory,
    service,
    { service, run: env.GITHUB_RUN_ID, attempt: String(attempt) },
    admitted.release,
    admitted.family,
    env,
  );
}
