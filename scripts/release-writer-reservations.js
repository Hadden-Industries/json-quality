// SPDX-License-Identifier: AGPL-3.0-only
/** Independent expected release writer attempts anchored in owner-signed tag objects. */
import assert from "node:assert/strict";
import baseline from "../assets/release-writer-baseline.json" with { type: "json" };
import { verifyOwnerTagSignature } from "./release-signing.js";

const prefix = "release-history-intent-";
const tagPattern =
  /^release-history-intent-(stage|archive|promote)-([1-9]\d{0,15})-([1-9]\d{0,2})-([a-f0-9]{64})$/u;
const sha = /^[a-f0-9]{40}$/u;
const rerunWindow = 30 * 24 * 60 * 60 * 1000;

export function readWriterReservations(
  phase,
  read,
  verify = verifyOwnerTagSignature,
) {
  const refs = read(`git/matching-refs/tags/${prefix}${phase}-`);
  assert.ok(Array.isArray(refs) && refs.length <= 10000);
  const seen = new Set();
  return refs.map((ref) => {
    assert.ok(ref.ref.startsWith("refs/tags/"));
    const name = ref.ref.slice("refs/tags/".length);
    const match = tagPattern.exec(name);
    assert.ok(
      match && match[1] === phase,
      "Malformed release writer reservation",
    );
    const [, , number, attempt, decision] = match;
    const key = `${number}/${attempt}`;
    assert.ok(!seen.has(key), "Conflicting release writer reservations");
    seen.add(key);
    assert.equal(ref.object.type, "tag");
    assert.match(ref.object.sha, sha);
    const tag = read(`git/tags/${ref.object.sha}`);
    assert.equal(tag.sha, ref.object.sha);
    assert.equal(tag.tag, name);
    assert.equal(tag.verification?.verified, true);
    assert.equal(tag.verification.reason, "valid");
    assert.equal(tag.object.type, "commit");
    assert.match(tag.object.sha, sha);
    verify(name, tag.sha, tag.object.sha);
    assert.ok(Number.isSafeInteger(Number(number)) && Number(number) > 0);
    return {
      number: Number(number),
      attempt: Number(attempt),
      decision,
      controller: tag.object.sha,
      tag: name,
      tagSha: tag.sha,
    };
  });
}

export function requireCurrentReservation(
  phase,
  env,
  run,
  decision,
  reservations,
) {
  assert.equal(run.workflow_id, baseline.workflows[phase].id);
  assert.equal(run.head_branch, "main");
  assert.equal(run.event, "workflow_dispatch");
  assert.equal(run.head_sha, env.GITHUB_SHA);
  assert.equal(String(run.id), env.GITHUB_RUN_ID);
  assert.equal(String(run.run_number), env.GITHUB_RUN_NUMBER);
  assert.equal(String(run.run_attempt), env.GITHUB_RUN_ATTEMPT);
  assert.match(decision ?? "", /^[a-f0-9]{64}$/u);
  const current = reservations.find(
    (entry) =>
      entry.number === run.run_number &&
      entry.attempt === run.run_attempt &&
      entry.controller === run.head_sha &&
      entry.decision === decision,
  );
  assert.ok(current, "An exact owner-signed writer reservation is required");
  return current;
}

export function legacyClosure(run, observedAt) {
  const created = Date.parse(run.created_at);
  const observed = Date.parse(observedAt);
  return (
    run.status === "completed" &&
    Number.isFinite(created) &&
    observed - created >= rerunWindow &&
    Date.parse(run.updated_at) <= observed
  );
}

function retainedAttempts(entries, phase, number, workflowId) {
  const observed = new Map();
  for (const record of entries) {
    const run = record.provider?.run;
    if (!run || record.phase !== phase || run.run_number !== number) continue;
    assert.equal(run.workflow_id, workflowId);
    assert.equal(run.status, "completed");
    assert.equal(record.controller, run.head_sha);
    assert.equal(String(record.run), String(run.id));
    assert.equal(Number(record.attempt), run.run_attempt);
    const { jobs } = record.provider;
    assert.equal(jobs.total_count, jobs.jobs.length);
    assert.ok(
      jobs.jobs.every(
        (job) =>
          job.run_id === run.id &&
          job.run_attempt === run.run_attempt &&
          job.head_sha === run.head_sha &&
          job.status === "completed",
      ),
    );
    if (observed.has(run.run_attempt))
      assert.deepEqual(observed.get(run.run_attempt), run);
    else observed.set(run.run_attempt, run);
  }
  return observed;
}

/** Expected executions come from the cutover inventory and reservations, independently of the live list. */
export function verifyWriterReservations(
  phase,
  runs,
  retained,
  closures,
  reservations,
) {
  const policy = baseline.workflows[phase];
  const byNumber = new Map();
  for (const run of runs) {
    assert.equal(run.workflow_id, policy.id);
    assert.ok(Number.isSafeInteger(run.run_number) && run.run_number > 0);
    assert.ok(!byNumber.has(run.run_number), "Ambiguous writer run number");
    byNumber.set(run.run_number, run);
    if (run.run_number <= policy.runs.length)
      assert.equal(
        run.id,
        policy.runs[run.run_number - 1],
        "Legacy writer identity changed",
      );
    else if (run.head_branch === "main" && run.event === "workflow_dispatch") {
      for (let attempt = 1; attempt <= run.run_attempt; attempt++)
        assert.ok(
          reservations.some(
            (item) =>
              item.number === run.run_number &&
              item.attempt === attempt &&
              item.controller === run.head_sha,
          ),
          "A protected writer attempt has no signed reservation",
        );
    }
  }
  for (const [index, id] of policy.runs.entries()) {
    const number = index + 1;
    if (byNumber.has(number)) continue;
    const terminal = closures.filter(
      (entry) => entry.phase === phase && entry.run.id === id,
    );
    assert.equal(
      terminal.length,
      1,
      "Missing legacy writer requires a signed final inventory",
    );
    const [{ run, observedAt }] = terminal;
    assert.equal(run.workflow_id, policy.id);
    assert.equal(run.run_number, number);
    assert.ok(
      legacyClosure(run, observedAt),
      "Legacy writer closure predates rerun expiry",
    );
    const attempts = retainedAttempts(retained, phase, number, policy.id);
    for (let attempt = 1; attempt <= run.run_attempt; attempt++) {
      const original = attempts.get(attempt);
      assert.ok(
        original && original.id === id && original.head_sha === run.head_sha,
        "Signed inventory omits a legacy writer attempt",
      );
    }
  }
  for (const reservation of reservations) {
    const run = byNumber.get(reservation.number);
    if (run) {
      assert.ok(
        run.run_attempt >= reservation.attempt,
        "Reserved writer attempt has not run",
      );
      if (run.head_branch === "main" && run.event === "workflow_dispatch")
        assert.equal(run.head_sha, reservation.controller);
      continue;
    }
    const original = retainedAttempts(
      retained,
      phase,
      reservation.number,
      policy.id,
    ).get(reservation.attempt);
    assert.ok(
      original,
      "Reserved writer is missing from the signed attempt inventory",
    );
    if (
      original.head_branch === "main" &&
      original.event === "workflow_dispatch"
    )
      assert.equal(original.head_sha, reservation.controller);
  }
}
