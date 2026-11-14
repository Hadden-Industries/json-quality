// SPDX-License-Identifier: AGPL-3.0-only
/** Read-only proof of one definitive native rejection; never authorizes replay. */
import assert from "node:assert/strict";
import { repository, sha256 } from "./release-contract.js";
import { familyOrder } from "./promotion-family.js";

/** A new settlement must belong to the fresh digest-bound retirement decision. */
export function verifyRejectedPilotDecisionBinding(record, env) {
  assert.equal(
    typeof env.OPERATION_JSON,
    "string",
    "Rejected-pilot settlement requires a fresh retirement decision",
  );
  assert.match(env.OPERATION_SHA, /^[a-f0-9]{64}$/u);
  assert.equal(sha256(Buffer.from(env.OPERATION_JSON)), env.OPERATION_SHA);
  assert.notEqual(env.OPERATION_SHA, record.operationId);
  const decision = JSON.parse(env.OPERATION_JSON);
  assert.equal(decision.schemaVersion, 2);
  assert.equal(decision.phase, "availability");
  assert.equal(decision.owner, "maksymshostak");
  assert.equal(
    decision.family?.operation,
    "retire-pilot",
    "Rejected-pilot settlement requires a fresh retirement decision",
  );
  assert.equal(decision.version, record.version);
  assert.equal(decision.manifestSha256, record.manifestSha256);
  assert.equal(decision.family.stableVersion, record.version);
  assert.deepEqual(
    decision.originalEffect,
    Object.fromEntries(
      [
        "phase",
        "service",
        "run",
        "attempt",
        "manifestSha256",
        "journalSha256",
        "operationId",
      ].map((key) => [key, record[key]]),
    ),
    "Fresh retirement decision must name the exact rejected effect",
  );
}

/** Keep exact native diagnostics within the authenticated writer step. */
export function rejectionLogEvents(bytes, step) {
  const start = Date.parse(step.started_at);
  // Actions metadata has second precision; log timestamps retain fractions.
  const end = Date.parse(step.completed_at) + 1000;
  assert.ok(Number.isFinite(start) && Number.isFinite(end) && end > start);
  return bytes
    .toString("utf8")
    .split("\n")
    .flatMap((line) => {
      const match =
        /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z) (\{.*\})\r?$/u.exec(line);
      if (!match) return [];
      const at = Date.parse(match[1]);
      if (at < start || at >= end) return [];
      let event;
      try {
        event = JSON.parse(match[2]);
      } catch {
        return [];
      }
      return event.phase === "npm-family-label"
        ? [{ at: match[1], event }]
        : [];
    });
}

/** Admission authenticates the original operation and native job/step selection. */
export function verifyRejectedPilotRequest(
  record,
  records,
  release,
  original,
  { job, step },
  log,
  acknowledgements,
) {
  assert.equal(record.disposition, "confirm-rejected-pilot");
  assert.equal(record.phase, "promote");
  assert.equal(record.service, "npm");
  assert.equal(original.run.repository.full_name, repository);
  assert.equal(original.run.head_repository.full_name, repository);
  assert.equal(original.run.status, "completed");
  assert.equal(String(original.run.id), String(record.run));
  assert.equal(String(original.run.run_attempt), String(record.attempt));
  assert.equal(records.length, 2, "Only one rejected request may be settled");
  const [intent, outcome] = records;
  const family = intent.guard?.family;
  assert.equal(family?.operation, "retire-pilot");
  assert.equal(record.operationId, family.operationId);
  const first = familyOrder(family, release).find(
    (subject) => subject.selected && subject.prior !== subject.target,
  );
  assert.equal(intent.package, first?.package);
  assert.equal(intent.operation, `npm-pilot:${intent.package}`);
  assert.equal(outcome.state, "outcome-unknown");
  assert.equal(outcome.requestStarted, true);
  assert.ok(!outcome.requestAcknowledged);
  assert.equal(
    acknowledgements.length,
    0,
    "Acknowledgement conflicts with rejection",
  );
  const proof = record.nativeRejection;
  assert.equal(
    proof?.status,
    401,
    "Only an explicit HTTP 401 rejection is admitted",
  );
  assert.equal(proof.jobId, job.id);
  assert.equal(proof.stepNumber, step.number);
  assert.equal(job.name, "npm");
  assert.equal(job.run_id, original.run.id);
  assert.equal(job.head_sha, intent.controller);
  assert.equal(job.status, "completed");
  assert.equal(job.conclusion, "failure");
  assert.ok(
    Date.parse(record.acceptedAt) >= Date.parse(job.completed_at),
    "Rejection settlement must follow the completed writer",
  );
  assert.equal(step.name, "Apply admitted release effect");
  assert.equal(step.status, "completed");
  assert.equal(step.conclusion, "failure");
  assert.match(proof.logSha256, /^[a-f0-9]{64}$/u);
  assert.equal(
    sha256(log),
    proof.logSha256,
    "Native job log differs from owner review",
  );
  const events = rejectionLogEvents(log, step);
  assert.deepEqual(
    events,
    proof.events,
    "Native rejection diagnostics differ from review",
  );
  assert.equal(
    events.length,
    3,
    "Exactly one failed native label command is required",
  );
  assert.ok(Date.parse(events[0].at) >= Date.parse(intent.requestedAt));
  assert.ok(
    events.every(
      (entry, index) =>
        index === 0 || Date.parse(entry.at) >= Date.parse(events[index - 1].at),
    ),
  );
  const [started, failed, diagnostic] = events.map((entry) => entry.event);
  assert.equal(started.state, "started");
  assert.equal(started.run, String(original.run.id));
  assert.equal(started.attempt, String(original.run.run_attempt));
  assert.equal(started.source, intent.controller);
  assert.equal(failed.state, "failed");
  assert.equal(failed.exit, 1);
  assert.equal(failed.signal, null);
  assert.equal(failed.timeout, false);
  assert.equal(diagnostic.stdout, "");
  const lines = diagnostic.stderr.split(/\r?\n/u);
  assert.equal(
    lines.filter((line) => line === "npm error code E401").length,
    1,
  );
  const rejections = lines.flatMap((line) => {
    const match = /^npm error 401 Unauthorized - DELETE (https:\/\/\S+)$/u.exec(
      line,
    );
    return match ? [new URL(match[1])] : [];
  });
  assert.equal(
    rejections.length,
    1,
    "Exact rejected DELETE response is required",
  );
  const url = rejections[0];
  assert.equal(url.origin, "https://registry.npmjs.org");
  assert.equal(url.username + url.password + url.search + url.hash, "");
  assert.equal(
    decodeURIComponent(url.pathname),
    `/-/package/${intent.package}/dist-tags/pilot`,
  );
  return {
    state: "family-request-rejected",
    operationId: family.operationId,
    package: intent.package,
    status: 401,
    jobId: job.id,
    logSha256: proof.logSha256,
  };
}
