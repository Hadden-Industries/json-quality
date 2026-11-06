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

function scopedHistory(t, phase, version = "0.9.0") {
  const observed = inventory(phase, 1, { write: "failure" });
  const f = setup(t, phase, [observed]);
  const services = phase === "promote" ? ["npm", "github"] : [null];
  const records = services.map((service) => {
    const intent = {
      state: "intent",
      package: subject.package,
      version,
      source: "b".repeat(40),
      manifestSha256: "c".repeat(64),
      integrity: "sha512-Ynl0ZXM=",
      operation: service ? `${service}-latest` : phase,
      run: "17",
      attempt: "1",
      controller: source,
      ...(service ? { schemaVersion: 2, service } : {}),
    };
    const line = JSON.stringify(intent) + "\n";
    const journal = Buffer.from(
      line +
        JSON.stringify({
          state: "outcome-unknown",
          intentSha256: sha256(Buffer.from(line)),
        }) +
        "\n",
    );
    return {
      phase,
      ...(service ? { service } : {}),
      run: "17",
      attempt: "1",
      controller: source,
      provider: structuredClone(observed),
      journal: journal.toString("base64"),
    };
  });
  const checkpoint = { tag: "release-history-fixture" };
  f.readers.checkpoint = () => records;
  f.readers.pages = (path) =>
    path.includes("/artifacts?")
      ? []
      : path.includes(workflows[phase])
        ? [{ id: 17, run_attempt: 1 }]
        : [];
  return { ...f, records, checkpoint, observed };
}

for (const phase of ["stage", "archive"])
  test(`${phase}: authenticated other-version history needs no expired full artifact or outcome reconciliation`, (t) => {
    const f = scopedHistory(t, phase);
    const pages = f.readers.pages;
    f.readers.pages = (path) => {
      assert.ok(!path.includes("/artifacts?"), "Unrelated artifact lookup");
      return pages(path);
    };
    const history = readEffectHistory(
      current,
      f.root,
      f.checkpoint,
      f.readers,
      subject,
    );
    assert.equal(history.length, 1);
    assert.deepEqual(
      history[0].journal,
      Buffer.from(f.records[0].journal, "base64"),
      "Retain original unknown evidence verbatim",
    );
    assert.deepEqual(
      verifyEffectHistory(history, { run: "20", attempt: "1" }, subject),
      [],
    );
    assert.deepEqual(f.downloads, []);
  });

function readScoped(f) {
  return readEffectHistory(current, f.root, f.checkpoint, f.readers, subject);
}

function reviseIntent(record, change) {
  const lines = Buffer.from(record.journal, "base64")
    .toString("utf8")
    .trim()
    .split("\n")
    .map(JSON.parse);
  change(lines[0]);
  lines[1].intentSha256 = sha256(Buffer.from(JSON.stringify(lines[0]) + "\n"));
  record.journal = Buffer.from(
    lines.map((line) => JSON.stringify(line)).join("\n") + "\n",
  ).toString("base64");
}

test("matching versions retain unknown-outcome refusal and completed staging evidence", (t) => {
  const f = scopedHistory(t, "stage", subject.version);
  assert.throws(
    () =>
      verifyEffectHistory(readScoped(f), { run: "20", attempt: "1" }, subject),
    /Unknown prior effect outcome/u,
  );
  const records = Buffer.from(f.records[0].journal, "base64")
    .toString("utf8")
    .trim()
    .split("\n")
    .map(JSON.parse);
  records[1].state = "completed";
  f.records[0].journal = Buffer.from(
    records.map((line) => JSON.stringify(line)).join("\n") + "\n",
  ).toString("base64");
  const evidence = verifyEffectHistory(
    readScoped(f),
    { run: "20", attempt: "1" },
    subject,
  );
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].intent.operation, "stage");
});

test("unclassifiable legacy history cannot inherit a different-version scalar claim", (t) => {
  for (const mutate of [
    (record) => {
      delete record.provider;
    },
    (record) =>
      reviseIntent(record, (intent) => {
        delete intent.source;
      }),
    (record) =>
      reviseIntent(record, (intent) => {
        delete intent.version;
      }),
  ]) {
    const f = scopedHistory(t, "stage");
    mutate(f.records[0]);
    f.records[0].subject = { version: "0.8.0" };
    assert.throws(
      () =>
        verifyEffectHistory(
          readScoped(f),
          { run: "20", attempt: "1" },
          subject,
        ),
      /Unknown prior effect outcome/u,
    );
  }
});

test("different-version promotion uncertainty still guards shared latest labels", (t) => {
  const f = scopedHistory(t, "promote");
  const history = readScoped(f);
  assert.equal(history.length, 2);
  assert.throws(
    () => verifyEffectHistory(history, { run: "20", attempt: "1" }, subject),
    /Unknown prior effect outcome/u,
  );
});

test("scoping preserves successful continuation settlements needed by shared-label history", (t) => {
  const promotion = scopedHistory(t, "promote");
  const stage = scopedHistory(t, "stage");
  const record = stage.records[0];
  stage.observed.run.id = record.provider.run.id = 18;
  stage.observed.run.conclusion = record.provider.run.conclusion = "success";
  for (const provider of [stage.observed, record.provider]) {
    for (const job of provider.jobs.jobs) job.run_id = 18;
    provider.jobs.jobs[1].conclusion = "success";
    provider.jobs.jobs[1].steps[0].conclusion = "success";
  }
  record.run = "18";
  reviseIntent(record, (intent) => {
    intent.run = "18";
  });
  const lines = Buffer.from(record.journal, "base64")
    .toString("utf8")
    .trim()
    .split("\n")
    .map(JSON.parse);
  lines[1].state = "completed";
  record.journal = Buffer.from(
    lines.map((line) => JSON.stringify(line)).join("\n") + "\n",
  ).toString("base64");
  record.settlements = promotion.records.map((prior) => ({
    schemaVersion: 1,
    owner: "maksymshostak",
    phase: "promote",
    service: prior.service,
    run: prior.run,
    attempt: prior.attempt,
    version: "0.9.0",
    manifestSha256: "c".repeat(64),
    journalSha256: sha256(Buffer.from(prior.journal, "base64")),
  }));
  stage.readers.pages = (path) =>
    path.includes(workflows.stage) ? [{ id: 18, run_attempt: 1 }] : [];
  const history = [...readScoped(promotion), ...readScoped(stage)];
  assert.deepEqual(
    verifyEffectHistory(history, { run: "20", attempt: "1" }, subject),
    [],
  );
});

test("native artifact subjects can classify another version without a checkpoint lookup", (t) => {
  const f = scopedHistory(t, "stage");
  f.readers.pages = (path) =>
    path.includes("/artifacts?")
      ? [
          {
            name: "effect-stage-1",
            digest: "sha256:" + "d".repeat(64),
            expired: false,
          },
        ]
      : path.includes(workflows.stage)
        ? [{ id: 17, run_attempt: 1 }]
        : [];
  f.readers.download = (run, attempt, name) => {
    f.downloads.push(name);
    writeFileSync(
      join(f.root, effectJournal("stage", { run, attempt })),
      Buffer.from(f.records[0].journal, "base64"),
    );
    return { directory: f.root };
  };
  const history = readEffectHistory(
    current,
    f.root,
    undefined,
    f.readers,
    subject,
  );
  assert.deepEqual(f.downloads, ["effect-stage-1"]);
  assert.deepEqual(
    verifyEffectHistory(history, { run: "20", attempt: "1" }, subject),
    [],
  );
});

test("a complete flushed other-version intent needs no invented outcome or retry receipt", (t) => {
  const f = scopedHistory(t, "stage");
  const intent =
    Buffer.from(f.records[0].journal, "base64")
      .toString("utf8")
      .split("\n")[0] + "\n";
  f.records[0].journal = Buffer.from(intent).toString("base64");
  const history = readScoped(f);
  for (let retry = 0; retry < 2; retry++)
    assert.deepEqual(
      verifyEffectHistory(history, { run: "20", attempt: "1" }, subject),
      [],
    );
  assert.equal(history[0].journal.toString("utf8"), intent);
  assert.equal(f.records[0].journal, Buffer.from(intent).toString("base64"));
  assert.throws(
    () =>
      verifyEffectHistory(
        history,
        { run: "20", attempt: "1" },
        { ...subject, version: "0.9.0" },
      ),
    /Unknown\/incomplete prior effect/u,
  );
});

test("retained version subjects reject changed controllers attempts executions and steps", (t) => {
  for (const mutate of [
    (record) => {
      record.controller = "f".repeat(40);
    },
    (record) => {
      record.provider.run.run_attempt++;
    },
    (record) => {
      record.provider.run.head_sha = "f".repeat(40);
    },
    (record) => {
      record.provider.run.repository.full_name = "other/repository";
    },
    (record) => {
      record.provider.jobs.total_count++;
    },
    (record) => {
      record.provider.jobs.jobs[1].runner_id++;
    },
    (record) => {
      record.provider.jobs.jobs[1].steps[0].conclusion = "success";
    },
  ]) {
    const f = scopedHistory(t, "stage");
    mutate(f.records[0]);
    assert.throws(() => readScoped(f));
    assert.deepEqual(f.downloads, []);
  }
});

test("malformed contradictory and unknown-package journals cannot classify another version", (t) => {
  for (const mutate of [
    (record) => {
      record.journal = Buffer.from('{"state":').toString("base64");
    },
    (record) => {
      const bytes = Buffer.from(record.journal, "base64");
      const position = bytes.indexOf(Buffer.from("outcome-unknown"));
      bytes[position] = 0xff;
      record.journal = bytes.toString("base64");
    },
    (record) =>
      reviseIntent(record, (intent) => {
        intent.version = "v0.9.0";
      }),
    (record) =>
      reviseIntent(record, (intent) => {
        intent.package = "@other/package";
      }),
    (record) =>
      reviseIntent(record, (intent) => {
        intent.controller = "f".repeat(40);
      }),
    (record) =>
      reviseIntent(record, (intent) => {
        intent.manifestSha256 = "invalid";
      }),
    (record) => {
      record.journal += "not-base64";
    },
    (record) => {
      record.noEffect = { state: "no-request" };
    },
  ]) {
    const f = scopedHistory(t, "stage");
    mutate(f.records[0]);
    assert.throws(() => readScoped(f));
  }
  const f = scopedHistory(t, "stage");
  const second = structuredClone(f.records[0]);
  reviseIntent(second, (intent) => {
    intent.version = "0.8.0";
  });
  f.records[0].journal = Buffer.concat([
    Buffer.from(f.records[0].journal, "base64"),
    Buffer.from(second.journal, "base64"),
  ]).toString("base64");
  assert.throws(
    () => readScoped(f),
    /Conflicting historical version subjects/u,
  );
});

test("collected version proofs reject mutation copying and current-attempt substitution", (t) => {
  for (const mutate of [
    (entry) => {
      entry.journal = Buffer.concat([entry.journal, Buffer.from(" ")]);
    },
    (entry) => {
      entry.jobs.jobs[1].runner_id++;
    },
    (entry) => {
      entry.noEffect = { state: "no-request" };
    },
    (entry) => {
      entry.phase = "promote";
    },
  ]) {
    const f = scopedHistory(t, "stage");
    const history = readScoped(f);
    mutate(history[0]);
    assert.throws(() =>
      verifyEffectHistory(history, { run: "20", attempt: "1" }, subject),
    );
  }
  const f = scopedHistory(t, "stage");
  const history = readScoped(f);
  assert.throws(
    () => verifyEffectHistory(history, { run: "17", attempt: "1" }, subject),
    /Current attempt included/u,
  );
  const copied = history.map((entry) => ({
    ...entry,
    subject: { version: "0.8.0" },
  }));
  assert.throws(
    () => verifyEffectHistory(copied, { run: "20", attempt: "1" }, subject),
    /Unknown prior effect outcome/u,
  );
});

test("live other-version writers remain globally blocked before artifact acquisition", (t) => {
  const f = scopedHistory(t, "stage");
  f.observed.run.status = "in_progress";
  assert.throws(() => readScoped(f), /Another live release producer exists/u);
  assert.deepEqual(f.downloads, []);
});

test("signed history scopes completely expired providers while retaining every original byte", (t) => {
  const f = scopedHistory(t, "archive");
  f.readers.pages = () => [];
  f.readers.provider = () => {
    throw new Error("Original provider has expired");
  };
  const history = readScoped(f);
  assert.equal(history.length, 1);
  assert.deepEqual(
    verifyEffectHistory(history, { run: "20", attempt: "1" }, subject),
    [],
  );
  assert.equal(history[0].journal.toString("base64"), f.records[0].journal);
});

test("unscoped history export preserves even malformed unknown evidence verbatim", (t) => {
  const f = scopedHistory(t, "stage");
  const bytes = Buffer.from('{"state":"intent",');
  f.records[0].journal = bytes.toString("base64");
  const history = readEffectHistory(current, f.root, f.checkpoint, f.readers);
  assert.deepEqual(history[0].journal, bytes);
});

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
