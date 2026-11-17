// SPDX-License-Identifier: AGPL-3.0-only
/** Exact native upload identity, bound after writer-side reconciliation. */
import assert from "node:assert/strict";
import baseline from "../assets/release-writer-baseline.json" with { type: "json" };

const qualifiedNumber = (value) => Number.isSafeInteger(value) && value > 0;
export const writerArtifactEvent = "release-writer-artifact";
const actionStep = "Run ./.github/actions/upload-writer-evidence";

export function currentWriterRun(phase, run) {
  const expected = baseline.workflows[phase];
  assert.ok(expected);
  if (expected.runs.includes(run.id)) return false;
  assert.equal(run.workflow_id, expected.id, "Writer workflow ID changed");
  assert.ok(
    qualifiedNumber(run.run_number) && run.run_number > expected.runs.length,
  );
  return true;
}

export function verifyWriterArtifactReceipt(receipt, run, job, expectedName) {
  const match = new RegExp(`^${expectedName}(?:-recovery-([23]))?$`, "u").exec(
    receipt.name,
  );
  assert.ok(match, "Upload receipt does not name its expected writer artifact");
  const expected = {
    phase: writerArtifactEvent,
    schemaVersion: 1,
    repositoryId: run.repository.id,
    headRepositoryId: run.head_repository.id,
    workflow: `${run.repository.full_name}/${run.path}@refs/heads/main`,
    controller: run.head_sha,
    run: run.id,
    attempt: run.run_attempt,
    job: job.name,
    step: Number(match[1] ?? 1),
    id: receipt.id,
    name: receipt.name,
    digest: receipt.digest,
    size: receipt.size,
  };
  assert.ok(qualifiedNumber(job.id));
  for (const key of [
    "repositoryId",
    "headRepositoryId",
    "run",
    "attempt",
    "id",
    "size",
  ])
    assert.ok(qualifiedNumber(expected[key]), `Invalid writer upload ${key}`);
  assert.match(expected.controller, /^[a-f0-9]{40}$/u);
  assert.match(expected.digest, /^sha256:[a-f0-9]{64}$/u);
  assert.deepEqual(receipt, expected);
  return receipt;
}

export function readWriterArtifactReceipt(log, run, job, expectedName) {
  const candidates = job.steps.filter((step) => step.name === actionStep);
  assert.equal(
    candidates.length,
    1,
    "Original writer upload step must be unique",
  );
  const [step] = candidates;
  assert.equal(step.status, "completed");
  assert.notEqual(step.conclusion, "skipped");
  const start = Date.parse(step.started_at);
  const end = Date.parse(step.completed_at) + 1000;
  assert.ok(start < end);
  const receipts = [];
  let open;
  for (const line of new TextDecoder("utf-8", { fatal: true })
    .decode(log)
    .split(/\r?\n/u)) {
    const record = /^(\S+) (.*)$/u.exec(line);
    if (!record) continue;
    const at = Date.parse(record[1]);
    if (!(at >= start && at < end)) continue;
    const message = record[2];
    const begin =
      /^##\[start-action display=(?:Run )?Reconcile writer evidence upload ([123]);id=((?:__self_\d+|effect)\.(?:first|second|third))\]$/u.exec(
        message,
      );
    if (begin) {
      assert.equal(open, undefined, "Overlapping writer reconciliation steps");
      open = { attempt: Number(begin[1]), id: begin[2] };
    } else if (message.startsWith(`{"phase":"${writerArtifactEvent}",`)) {
      assert.ok(
        open && !open.receipt,
        "Upload receipt is outside its original reconciliation step",
      );
      const receipt = JSON.parse(message);
      assert.equal(receipt.step, open.attempt);
      open.receipt = verifyWriterArtifactReceipt(
        receipt,
        run,
        job,
        expectedName,
      );
    } else if (open && message.startsWith(`##[end-action id=${open.id};`)) {
      if (open.receipt) {
        assert.match(message, /;outcome=success;conclusion=success;/u);
        receipts.push(open.receipt);
      }
      open = undefined;
    }
  }
  assert.equal(open, undefined, "Truncated writer reconciliation log");
  assert.equal(
    receipts.length,
    1,
    "Original writer upload receipt must be unique",
  );
  return receipts[0];
}
