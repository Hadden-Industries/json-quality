// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  effectJournal,
  repository,
  sha256,
  workflows,
} from "../scripts/release-contract.js";
import {
  readEffectHistory,
  verifyEffectHistory,
} from "../scripts/release-provider.js";

const source = "a".repeat(40);
const effect = "Apply admitted release effect";
const subject = {
  package: "@hadden-industries/json-quality",
  version: "1.0.0",
};
const current = { GITHUB_RUN_ID: "20", GITHUB_RUN_ATTEMPT: "1" };
function inventory(
  phase,
  attempt,
  { write = "success", origin = attempt } = {},
) {
  const run = {
    id: 17,
    run_attempt: attempt,
    repository: { full_name: repository },
    path: `.github/workflows/${workflows[phase]}`,
    event: "workflow_dispatch",
    head_branch: "main",
    head_sha: source,
    status: "completed",
    conclusion: write === "success" ? "success" : "failure",
  };
  const names =
    phase === "promote"
      ? ["admit", "npm", "github", "complete"]
      : ["admit", phase];
  const jobs = names.map((name, index) => {
    const writer = name === phase || ["npm", "github"].includes(name);
    return {
      id: attempt * 100 + index + 1,
      name,
      run_id: run.id,
      run_attempt: attempt,
      head_sha: source,
      runner_id: origin * 10 + index + 1,
      started_at: `2026-11-01T00:0${origin}:00Z`,
      completed_at: `2026-11-01T00:0${origin}:30Z`,
      status: "completed",
      conclusion: writer
        ? write === "skipped"
          ? "failure"
          : write
        : "success",
      steps: writer
        ? [
            {
              name: effect,
              status: "completed",
              conclusion: write,
              ...(write === "skipped"
                ? {}
                : {
                    started_at: `2026-11-01T00:0${origin}:10Z`,
                    completed_at: `2026-11-01T00:0${origin}:20Z`,
                  }),
            },
          ]
        : [],
    };
  });
  return { run, jobs: { total_count: jobs.length, jobs } };
}
function setup(t, phase, attempts, { unknown = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), "json-writer-history-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const downloads = [];
  const services = phase === "promote" ? ["npm", "github"] : [null];
  const names = services.map(
    (service) => `effect-${phase}${service ? `-${service}` : ""}-2`,
  );
  const readers = {
    pages: (path) =>
      path.includes("/artifacts?")
        ? names.map((name) => ({
            name,
            digest: "sha256:original",
            expired: false,
          }))
        : path.includes(workflows[phase])
          ? [{ id: 17, run_attempt: attempts.length }]
          : [],
    provider: (_run, attempt) => structuredClone(attempts[attempt - 1]),
    download: (run, attempt, name) => {
      downloads.push(name);
      const service = phase === "promote" ? name.split("-")[2] : null;
      const intent = {
        state: "intent",
        ...subject,
        operation:
          phase === "stage"
            ? "stage"
            : service
              ? `${service}-latest`
              : "archive",
        run: String(run),
        attempt: String(attempt),
        controller: source,
        ...(service ? { schemaVersion: 2, service } : {}),
      };
      // Native journals retain their original bytes and producing attempt.
      const line = JSON.stringify(intent) + "\n";
      const journal = effectJournal(phase, { run, attempt, service });
      writeFileSync(
        join(root, journal),
        line +
          JSON.stringify({
            state: unknown ? "outcome-unknown" : "completed",
            intentSha256: sha256(Buffer.from(line)),
          }) +
          "\n",
      );
      return { directory: root };
    },
  };
  return { root, readers, downloads };
}

for (const phase of ["stage", "archive", "promote"]) {
  test(`${phase}: a later first write retains its origin through a partial rerun`, (t) => {
    const attempts = [
      inventory(phase, 1, { write: "skipped" }),
      inventory(phase, 2),
      inventory(phase, 3, { origin: 2 }),
    ];
    const f = setup(t, phase, attempts);
    const history = readEffectHistory(current, f.root, undefined, f.readers);
    const writes = history.filter((entry) => entry.journal);
    assert.deepEqual(
      writes.map((entry) => entry.run.run_attempt),
      phase === "promote" ? [2, 2] : [2],
    );
    assert.ok(f.downloads.every((name) => name.endsWith("-2")));
    const evidence = verifyEffectHistory(
      history,
      { run: "20", attempt: "1" },
      subject,
    );
    assert.equal(evidence.length, phase === "promote" ? 2 : 1);
    assert.ok(evidence.every((entry) => entry.intent.attempt === "2"));
  });

  test(`${phase}: retained unknown writes remain blocked at the original attempt`, (t) => {
    const attempts = [
      inventory(phase, 1, { write: "skipped" }),
      inventory(phase, 2),
      inventory(phase, 3, { origin: 2 }),
    ];
    const f = setup(t, phase, attempts, { unknown: true });
    const history = readEffectHistory(current, f.root, undefined, f.readers);
    assert.throws(
      () => verifyEffectHistory(history, { run: "20", attempt: "1" }, subject),
      /Unknown prior effect outcome/,
    );
    assert.ok(f.downloads.every((name) => name.endsWith("-2")));
  });

  test(`${phase}: skipped pre-write failures permit a later first execution`, (t) => {
    const f = setup(t, phase, [
      inventory(phase, 1, { write: "skipped" }),
      inventory(phase, 2, { write: "skipped" }),
    ]);
    const history = readEffectHistory(current, f.root, undefined, f.readers);
    assert.deepEqual(
      verifyEffectHistory(history, { run: "20", attempt: "1" }, subject),
      [],
    );
    assert.deepEqual(f.downloads, []);
  });

  test(`${phase}: an off-main dispatch with skipped writers cannot poison later main releases`, (t) => {
    const observed = inventory(phase, 1, { write: "skipped" });
    observed.run.head_branch = "test-release";
    for (const job of observed.jobs.jobs) {
      job.conclusion = "skipped";
      job.steps = [];
    }
    const f = setup(t, phase, [observed]);
    const history = readEffectHistory(current, f.root, undefined, f.readers);
    assert.deepEqual(
      verifyEffectHistory(history, { run: "20", attempt: "1" }, subject),
      [],
    );
    assert.deepEqual(f.downloads, []);
  });

  test(`${phase}: an off-main possible write remains blocked before evidence download`, (t) => {
    const observed = inventory(phase, 1);
    observed.run.head_branch = "test-release";
    const f = setup(t, phase, [observed]);
    assert.throws(
      () => readEffectHistory(current, f.root, undefined, f.readers),
      /main/,
    );
    assert.deepEqual(f.downloads, []);
  });

  test(`${phase}: a retained startup failure preserves its original no-request marker`, (t) => {
    const attempts = [
      inventory(phase, 1, { write: "skipped" }),
      inventory(phase, 2, { write: "failure" }),
      inventory(phase, 3, { write: "failure", origin: 2 }),
    ];
    const f = setup(t, phase, attempts);
    f.readers.download = (run, attempt, name) => {
      f.downloads.push(name);
      const service = phase === "promote" ? name.split("-")[2] : null;
      const marker = {
        schemaVersion: 1,
        state: "no-request",
        phase,
        run: String(run),
        attempt: String(attempt),
        controller: source,
        ...(service ? { service } : {}),
      };
      writeFileSync(
        join(
          f.root,
          `no-effect-${phase}${service ? `-${service}` : ""}-${run}-${attempt}.json`,
        ),
        JSON.stringify(marker),
      );
      return { directory: f.root };
    };
    const history = readEffectHistory(current, f.root, undefined, f.readers);
    assert.deepEqual(
      verifyEffectHistory(history, { run: "20", attempt: "1" }, subject),
      [],
    );
    assert.ok(
      history
        .filter((entry) => entry.noEffect)
        .every((entry) => entry.noEffect.attempt === "2"),
    );
    assert.equal(f.downloads.length, phase === "promote" ? 2 : 1);
  });

  test(`${phase}: incomplete or ambiguous native write observations never establish absence`, (t) => {
    for (const mutate of [
      (observed) => {
        observed.jobs.jobs[1].steps = [];
      },
      (observed) => {
        delete observed.jobs.jobs[1].steps;
      },
      (observed) => {
        delete observed.jobs.jobs[1].steps[0].started_at;
      },
      (observed) => {
        observed.jobs.jobs[1].steps.push({ ...observed.jobs.jobs[1].steps[0] });
      },
      (observed) => {
        observed.jobs.jobs[1].steps[0].status = "in_progress";
      },
      (observed) => {
        observed.jobs.total_count++;
      },
      (observed) => {
        observed.jobs.jobs[1].head_sha = "b".repeat(40);
      },
      (observed) => {
        observed.jobs.jobs[1].name = "admit";
      },
      (observed) => {
        observed.jobs.jobs[1].conclusion = "skipped";
      },
    ]) {
      const observed = inventory(phase, 1);
      mutate(observed);
      const f = setup(t, phase, [observed]);
      assert.throws(() =>
        readEffectHistory(current, f.root, undefined, f.readers),
      );
    }
  });

  test(`${phase}: relabelled retained writes must preserve the original step observation`, (t) => {
    const attempts = [
      inventory(phase, 1, { write: "skipped" }),
      inventory(phase, 2),
      inventory(phase, 3, { origin: 2 }),
    ];
    attempts[2].jobs.jobs[1].steps[0].conclusion = "failure";
    const f = setup(t, phase, attempts);
    assert.throws(
      () => readEffectHistory(current, f.root, undefined, f.readers),
      /Retained.*changed/,
    );
  });
}
