// SPDX-License-Identifier: AGPL-3.0-only
/** Thin native GitHub reader; pagination completeness is an admission requirement. */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { native } from "./qualification-process.js";
import {
  repository,
  regularBytes,
  save,
  sha256,
  workflows,
  jsonBytes,
  effectJournal,
  readJson,
  verifyRun,
} from "./release-contract.js";

export const gh = (args, options) => native("gh", args, options);
export const api = (path, args = []) =>
  JSON.parse(gh(["api", `repos/${repository}/${path}`, ...args]));
export function optionalApi(path) {
  try {
    return api(path);
  } catch (error) {
    let response;
    try {
      response = JSON.parse(error.stdout);
    } catch {
      throw error;
    }
    if (String(response.status) === "404" && response.message === "Not Found")
      return null;
    throw error;
  }
}
export function id(value) {
  assert.match(String(value), /^[1-9]\d{0,15}$/u);
  return String(value);
}
export function pages(path, key) {
  const result = api(path, ["--paginate", "--slurp"]);
  assert.ok(Array.isArray(result) && result.length && result.length <= 100);
  const values = key ? result.flatMap((page) => page[key]) : result.flat();
  assert.ok(values.length <= 10000);
  if (key) {
    assert.equal(
      result[0].total_count,
      values.length,
      "Incomplete native pagination",
    );
    assert.ok(
      result.every((page) => page.total_count === result[0].total_count),
    );
    assert.equal(
      new Set(values.map((item) => item.id)).size,
      values.length,
      "Duplicate native page entries",
    );
  }
  return values;
}
export function provider(runId, attempt) {
  const run = api(`actions/runs/${id(runId)}/attempts/${id(attempt)}`);
  assert.equal(String(run.id), String(runId));
  assert.equal(String(run.run_attempt), String(attempt));
  const jobs = pages(
    `actions/runs/${id(runId)}/attempts/${id(attempt)}/jobs?per_page=100`,
    "jobs",
  );
  return { run, jobs: { total_count: jobs.length, jobs } };
}
export function download(runId, attempt, name, root) {
  assert.match(name, /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,200}$/u);
  const artifacts = pages(
    `actions/runs/${id(runId)}/artifacts?per_page=100`,
    "artifacts",
  );
  const matches = artifacts.filter((item) => item.name === name);
  assert.equal(matches.length, 1, "Missing or ambiguous native artifact");
  const artifact = matches[0];
  assert.equal(artifact.expired, false);
  assert.match(artifact.digest, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(artifact.workflow_run.id, Number(runId));
  const run = api(`actions/runs/${id(runId)}`);
  assert.equal(artifact.workflow_run.head_sha, run.head_sha);
  const zip = gh(
    ["api", `repos/${repository}/actions/artifacts/${id(artifact.id)}/zip`],
    { encoding: null, maxBuffer: 32 * 1024 * 1024 },
  );
  assert.equal(
    `sha256:${sha256(zip)}`,
    artifact.digest,
    "Native artifact transport digest differs",
  );
  // Every machine-consumed artifact includes its attempt in its name.
  assert.ok(name.endsWith(`-${id(attempt)}`), "Unbound artifact attempt");
  const directory = join(root, `${runId}-${name}`);
  mkdirSync(directory);
  gh([
    "run",
    "download",
    id(runId),
    "--repo",
    repository,
    "--name",
    name,
    "--dir",
    directory,
  ]);
  const retained = api(`actions/artifacts/${id(artifact.id)}`);
  assert.equal(retained.name, artifact.name);
  assert.equal(retained.digest, artifact.digest);
  assert.equal(retained.expired, false);
  return {
    directory,
    identity: {
      id: artifact.id,
      name: artifact.name,
      digest: artifact.digest,
      run: Number(runId),
      attempt: Number(attempt),
    },
  };
}
export function currentMain(env) {
  const ref = api("git/ref/heads/main");
  assert.equal(ref.ref, "refs/heads/main");
  assert.equal(
    ref.object.sha,
    env.GITHUB_SHA,
    "Controller main advanced during execution",
  );
  return ref;
}
export function verifyEnvironment(environment, policies, name) {
  assert.equal(environment.name, name);
  assert.deepEqual(environment.deployment_branch_policy, {
    protected_branches: false,
    custom_branch_policies: true,
  });
  assert.equal(policies.total_count, 1);
  assert.equal(policies.branch_policies.length, 1);
  assert.equal(policies.branch_policies[0].name, "main");
  assert.equal(policies.branch_policies[0].type, "branch");
}
export function checkEnvironment(name) {
  assert.ok(
    ["npm-publication", "github-archival", "npm-promotion"].includes(name),
  );
  const environment = api(`environments/${name}`),
    policies = api(`environments/${name}/deployment-branch-policies`);
  verifyEnvironment(environment, policies, name);
  return { environment, policies };
}
export function verifyTag(reference, annotation, release) {
  assert.equal(reference.ref, `refs/tags/v${release.version}`);
  assert.equal(reference.object.type, "tag");
  assert.equal(annotation.sha, reference.object.sha);
  assert.equal(annotation.tag, `v${release.version}`);
  assert.equal(annotation.object.type, "commit");
  assert.equal(annotation.object.sha, release.source.commit);
  assert.equal(annotation.verification?.verified, true);
  assert.equal(annotation.verification.reason, "valid");
}
export function signedTag(release) {
  const reference = api(`git/ref/tags/v${release.version}`);
  assert.equal(reference.object.type, "tag");
  assert.match(reference.object.sha, /^[a-f0-9]{40}$/u);
  const annotation = api(`git/tags/${reference.object.sha}`);
  verifyTag(reference, annotation, release);
  return { reference, annotation };
}
export function decisionAsset(release, name, directory) {
  assert.ok(
    [
      "release-review.json",
      "release-acceptance.json",
      "release-restoration.json",
    ].includes(name),
  );
  gh([
    "release",
    "download",
    `v${release.version}`,
    "--repo",
    repository,
    "--pattern",
    name,
    "--dir",
    directory,
  ]);
  return regularBytes(join(directory, name));
}
const effectStep = "Apply admitted release effect";
export function verifyEffectHistory(
  history,
  current,
  subject,
  recovery = null,
) {
  const evidence = [];
  const settled = history.filter(
    (entry) => entry.settlements?.length && entry.run.conclusion === "success",
  );
  for (const entry of settled)
    verifyRun(entry, entry.phase, entry.run.head_sha, {});
  const reconciliations = [
    ...(recovery?.entries ?? []),
    ...settled.flatMap((entry) =>
      entry.settlements.map((record) => ({ record })),
    ),
  ];
  for (const entry of history) {
    assert.ok(entry.run.repository.full_name === repository);
    for (const value of [entry.run.id, entry.run.run_attempt]) id(value);
    assert.ok(
      !(
        String(entry.run.id) === String(current.run) &&
        String(entry.run.run_attempt) === String(current.attempt)
      ),
      "Current attempt included as history",
    );
    assert.equal(entry.jobs.total_count, entry.jobs.jobs.length);
    assert.equal(
      new Set(entry.jobs.jobs.map((job) => job.id)).size,
      entry.jobs.jobs.length,
    );
    for (const job of entry.jobs.jobs) {
      assert.equal(job.run_id, entry.run.id);
      assert.equal(job.run_attempt, entry.run.run_attempt);
    }
    assert.equal(
      entry.run.status,
      "completed",
      "Another live release producer exists",
    );
    const attempted = entry.jobs.jobs.some((job) =>
      job.steps?.some(
        (step) =>
          step.name === effectStep &&
          step.started_at &&
          step.conclusion !== "skipped",
      ),
    );
    if (!attempted) continue;
    if (entry.noEffect) {
      assert.equal(entry.noEffect.schemaVersion, 1);
      assert.equal(entry.noEffect.state, "no-request");
      assert.equal(entry.noEffect.run, String(entry.run.id));
      assert.equal(entry.noEffect.attempt, String(entry.run.run_attempt));
      assert.equal(entry.noEffect.controller, entry.run.head_sha);
      assert.equal(
        entry.run.path,
        `.github/workflows/${workflows[entry.noEffect.phase]}`,
      );
      assert.ok(
        !entry.journal?.length,
        "No-effect marker conflicts with a request journal",
      );
      continue;
    }
    assert.ok(
      entry.journal,
      "A previous effect has no durable outcome; reconcile before continuing",
    );
    const records = entry.journal
      .toString("utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    const recoveredJournal = reconciliations.some(
      ({ record }) =>
        String(record.run) === String(entry.run.id) &&
        String(record.attempt) === String(entry.run.run_attempt) &&
        record.journalSha256 === sha256(entry.journal),
    );
    assert.ok(
      records.length > 0 && (records.length % 2 === 0 || recoveredJournal),
      "Unknown/incomplete prior effect",
    );
    for (let index = 0; index < records.length; index += 2) {
      const [intent, outcome] = records.slice(index, index + 2);
      assert.equal(intent.state, "intent");
      const observedRecovery = reconciliations.some(
        ({ record }) =>
          String(record.run) === String(entry.run.id) &&
          String(record.attempt) === String(entry.run.run_attempt) &&
          record.journalSha256 === sha256(entry.journal),
      );
      assert.ok(
        outcome?.state === "completed" ||
          ((!outcome || outcome.state === "outcome-unknown") &&
            observedRecovery),
        "Unknown prior effect outcome",
      );
      assert.equal(intent.run, String(entry.run.id));
      assert.equal(intent.attempt, String(entry.run.run_attempt));
      assert.equal(intent.controller, entry.run.head_sha);
      for (const { record } of reconciliations.filter(
        ({ record }) =>
          String(record.run) === intent.run &&
          String(record.attempt) === intent.attempt &&
          record.journalSha256 === sha256(entry.journal),
      )) {
        assert.equal(record.owner, "maksymshostak");
        assert.equal(record.manifestSha256, intent.manifestSha256);
        assert.equal(record.version, intent.version);
        assert.equal(
          entry.run.path,
          `.github/workflows/${workflows[record.phase]}`,
        );
      }
      assert.equal(
        outcome?.intentSha256 ??
          sha256(Buffer.from(JSON.stringify(intent) + "\n")),
        sha256(Buffer.from(JSON.stringify(intent) + "\n")),
      );
      if (
        intent.package === subject.package &&
        intent.version === subject.version
      )
        evidence.push({ intent, outcome });
    }
  }
  return evidence;
}
/** Inspect every prior attempt of all writers, not merely the latest successful run. */
export function readHistoryCheckpoint(
  checkpoint,
  read = api,
  readBytes = (path) =>
    gh(
      [
        "api",
        `repos/${repository}/${path}`,
        "-H",
        "Accept: application/vnd.github.raw+json",
      ],
      { encoding: null, maxBuffer: 20000000 },
    ),
) {
  assert.match(checkpoint.tag, /^release-history-[a-zA-Z0-9._-]{1,100}$/u);
  assert.match(checkpoint.tagSha, /^[a-f0-9]{40}$/u);
  assert.match(checkpoint.sha256, /^[a-f0-9]{64}$/u);
  const ref = read(`git/ref/tags/${checkpoint.tag}`);
  assert.equal(ref.ref, `refs/tags/${checkpoint.tag}`);
  assert.equal(ref.object.type, "tag");
  assert.equal(ref.object.sha, checkpoint.tagSha);
  const tag = read(`git/tags/${checkpoint.tagSha}`);
  assert.equal(tag.sha, checkpoint.tagSha);
  assert.equal(tag.tag, checkpoint.tag);
  assert.equal(tag.verification?.verified, true);
  assert.equal(tag.verification.reason, "valid");
  assert.equal(tag.object.type, "commit");
  assert.match(tag.object.sha, /^[a-f0-9]{40}$/u);
  const bytes = readBytes(
    `contents/release-history.json?ref=${tag.object.sha}`,
  );
  assert.ok(Buffer.isBuffer(bytes) && bytes.length <= 20000000);
  assert.equal(sha256(bytes), checkpoint.sha256);
  const record = JSON.parse(bytes);
  assert.equal(record.schemaVersion, 1);
  assert.equal(record.repository, repository);
  assert.ok(Array.isArray(record.entries) && record.entries.length <= 10000);
  const keys = record.entries.map(
    (entry) => `${entry.phase}:${id(entry.run)}:${id(entry.attempt)}`,
  );
  assert.equal(new Set(keys).size, keys.length, "Ambiguous retained history");
  return record.entries;
}
export function readEffectHistory(env, root, checkpoint, readers = {}) {
  const list = readers.pages ?? pages;
  const observe = readers.provider ?? provider;
  const acquire = readers.download ?? download;
  let retained;
  const history = [];
  for (const phase of ["stage", "archive", "promote"]) {
    const runs = list(
      `actions/workflows/${workflows[phase]}/runs?per_page=100`,
      "workflow_runs",
    );
    for (const run of runs) {
      assert.ok(run.run_attempt <= 100, "History attempt bound exceeded");
      for (let attempt = 1; attempt <= run.run_attempt; attempt++) {
        if (
          String(run.id) === env.GITHUB_RUN_ID &&
          String(attempt) === env.GITHUB_RUN_ATTEMPT
        )
          continue;
        const entry = observe(run.id, attempt);
        entry.phase = phase;
        const attempted = entry.jobs.jobs.some((job) =>
          job.steps?.some(
            (step) =>
              step.name === effectStep &&
              step.started_at &&
              step.conclusion !== "skipped",
          ),
        );
        if (attempted) {
          const name = `effect-${phase}-${attempt}`;
          const artifacts = list(
            `actions/runs/${id(run.id)}/artifacts?per_page=100`,
            "artifacts",
          );
          const matches = artifacts.filter((item) => item.name === name);
          assert.ok(matches.length <= 1, "Ambiguous historical artifact");
          if (!matches.length || matches[0].expired) {
            assert.ok(
              checkpoint,
              "Historical effect artifact unavailable; admit a signed history checkpoint",
            );
            retained ??= (readers.checkpoint ?? readHistoryCheckpoint)(
              checkpoint,
            );
            const records = retained.filter(
              (item) =>
                item.phase === phase &&
                String(item.run) === String(run.id) &&
                String(item.attempt) === String(attempt),
            );
            assert.equal(
              records.length,
              1,
              "Missing exact historical attempt in checkpoint",
            );
            const record = records[0];
            assert.equal(record.controller, entry.run.head_sha);
            if (record.journal) {
              entry.journal = Buffer.from(record.journal, "base64");
              assert.equal(entry.journal.toString("base64"), record.journal);
            }
            if (record.noEffect) entry.noEffect = record.noEffect;
            if (record.settlements) entry.settlements = record.settlements;
            history.push(entry);
            continue;
          }
          const { directory } = acquire(run.id, attempt, name, root);
          const journal = join(
            directory,
            effectJournal(phase, { run: run.id, attempt }),
          );
          if (existsSync(journal)) entry.journal = regularBytes(journal);
          const marker = join(
            directory,
            `no-effect-${phase}-${run.id}-${attempt}.json`,
          );
          if (existsSync(marker)) entry.noEffect = readJson(marker);
          entry.settlements = ["stage", "archive", "promote"].flatMap(
            (kind) => {
              const path = join(directory, `recovery-${kind}.json`);
              return existsSync(path) ? [readJson(path)] : [];
            },
          );
        }
        history.push(entry);
      }
    }
  }
  return history;
}
/** Read-only export before expiration; only an owner-admitted signed tag is reusable. */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv[2], "history");
  assert.ok(
    [5, 6].includes(process.argv.length),
    "Use release-provider.js history OUTPUT SCRATCH [PRIOR_CHECKPOINT_JSON]",
  );
  const [output, scratch, priorCheckpoint] = process.argv.slice(3);
  mkdirSync(scratch, { recursive: true });
  const history = readEffectHistory(
    {},
    scratch,
    priorCheckpoint ? readJson(priorCheckpoint) : undefined,
  );
  // Keep unknown and incomplete records verbatim. Export never declares them resolved.
  save(output, {
    schemaVersion: 1,
    repository,
    entries: history
      .filter((entry) => entry.journal || entry.noEffect)
      .map((entry) => ({
        phase: entry.phase,
        run: String(entry.run.id),
        attempt: String(entry.run.run_attempt),
        controller: entry.run.head_sha,
        ...(entry.journal ? { journal: entry.journal.toString("base64") } : {}),
        ...(entry.noEffect ? { noEffect: entry.noEffect } : {}),
        ...(entry.settlements?.length
          ? { settlements: entry.settlements }
          : {}),
      })),
  });
}
/** Index only bounded ordinary files; artifact consumers name each retained member. */
export function evidenceIndex(directory) {
  const entries = readdirSync(directory, {
    recursive: true,
    withFileTypes: true,
  });
  assert.ok(
    entries.every((entry) => entry.isFile() || entry.isDirectory()),
    "Linked or unsupported evidence entry",
  );
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const full = join(entry.parentPath, entry.name),
        name = full.slice(directory.length + 1).replaceAll("\\", "/");
      const bytes = regularBytes(full);
      return { name, sha256: sha256(bytes), size: bytes.length };
    });
  assert.ok(files.length <= 4096);
  return files;
}
export function recordProvider(directory, name, value) {
  save(join(directory, name), value);
}
export function sealBundle(directory, manifestSha) {
  const files = evidenceIndex(directory).filter(
    ({ name }) => name !== "evidence-index.json",
  );
  writeFileSync(
    join(directory, "evidence-index.json"),
    jsonBytes({ schemaVersion: 1, manifestSha256: manifestSha, files }),
    { flush: true },
  );
}
