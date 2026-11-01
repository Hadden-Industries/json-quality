// SPDX-License-Identifier: AGPL-3.0-only
/** Thin native GitHub reader; pagination completeness is an admission requirement. */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { native, budgets } from "./qualification-process.js";
import { sameJobExecution } from "./github-job-execution.js";
import {
  repository,
  regularBytes,
  save,
  sha256,
  workflows,
  effectJournal,
  readJson,
  verifyRun,
  retainedRecoveries,
  releaseTransportMaximumBytes,
} from "./release-contract.js";
export { evidenceIndex, sealBundle } from "./release-records.js";

/** Native mutations remain one-shot; only their time budget follows the payload. */
export function gh(args, options = {}, invoke = native) {
  let timeout = budgets.read;
  if (args[0] === "release" && args[1] === "upload") timeout = budgets.upload;
  if (args[0] === "release" && args[1] === "download")
    timeout = budgets.collection;
  return invoke("gh", args, { timeout, ...options });
}
export const api = (path, args = []) => {
  try {
    return JSON.parse(
      native(
        process.execPath,
        [
          fileURLToPath(new URL("./github-evidence.js", import.meta.url)),
          `/${path}`,
          ...(args.includes("--paginate") ? ["--paginate"] : []),
          ...(args.includes("Accept: application/sarif+json")
            ? ["--sarif"]
            : []),
        ],
        { timeout: budgets.read, phase: "github-evidence-read" },
      ),
    );
  } catch (error) {
    const line = String(error.stderr ?? "")
      .trim()
      .split("\n")
      .at(-1);
    try {
      Object.assign(error, JSON.parse(line).githubEvidenceError);
    } catch {
      /* Preserve the original native failure. */
    }
    throw error;
  }
};
export function optionalApi(path) {
  try {
    return api(path);
  } catch (error) {
    if (error.httpStatus === 404) return null;
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
/** Recover original artifact-producing attempts, never mutable latest labels. */
export function producingAttempt(
  observed,
  name,
  read = provider,
  cache = new Map(),
) {
  return originalJobAttempt(observed, name, read, cache);
}
function originalJobAttempt(
  observed,
  name,
  read,
  cache,
  { requireSuccess = true, maximumAttempts = 8 } = {},
) {
  const { run, jobs } = observed;
  assert.ok(
    run.run_attempt >= 1 && run.run_attempt <= maximumAttempts,
    "Producing-attempt lookup bound exceeded",
  );
  const current = jobs.jobs.find((job) => job.name === name);
  assert.equal(current?.status, "completed");
  if (requireSuccess) assert.equal(current?.conclusion, "success");
  else
    assert.ok(
      ["success", "failure", "cancelled", "timed_out"].includes(
        current?.conclusion,
      ),
    );
  for (let attempt = 1; attempt <= run.run_attempt; attempt++) {
    if (!cache.has(attempt)) cache.set(attempt, read(run.id, attempt));
    const original = cache.get(attempt);
    assert.equal(original.run.id, run.id);
    assert.equal(original.run.run_attempt, attempt);
    assert.equal(original.run.head_sha, run.head_sha);
    assert.equal(original.jobs.total_count, original.jobs.jobs.length);
    assert.equal(
      new Set(original.jobs.jobs.map((job) => job.name)).size,
      original.jobs.jobs.length,
    );
    assert.ok(
      original.jobs.jobs.every(
        (job) =>
          job.run_id === run.id &&
          job.head_sha === run.head_sha &&
          job.run_attempt === attempt,
      ),
    );
    const found = original.jobs.jobs.find((job) => job.name === name);
    if (!found || found.conclusion === "skipped") continue;
    if (sameJobExecution(found, current)) {
      assert.equal(found.status, "completed");
      assert.equal(found.conclusion, current.conclusion);
      return attempt;
    }
  }
  throw new Error("Original artifact-producing execution unavailable");
}
export function download(runId, attempt, name, root, readers = {}) {
  const list = readers.pages ?? pages,
    read = readers.api ?? api;
  assert.match(name, /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,200}$/u);
  const artifacts = list(
    `actions/runs/${id(runId)}/artifacts?per_page=100`,
    "artifacts",
  );
  const recovered = new RegExp(
    `^${name.replaceAll(".", "\\.")}-recovery-[23]$`,
    "u",
  );
  const matches = artifacts.filter(
    (item) => item.name === name || recovered.test(item.name),
  );
  assert.ok(
    matches.length > 0 && matches.length <= 3,
    "Missing or ambiguous native artifact",
  );
  assert.equal(
    new Set(matches.map((item) => item.digest)).size,
    1,
    "Conflicting native artifact candidates",
  );
  const artifact = matches
    .filter((item) => !item.expired)
    .sort((a, b) => a.id - b.id)[0];
  assert.ok(artifact, "Expired native artifact");
  assert.equal(artifact.expired, false);
  assert.match(artifact.digest, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(artifact.workflow_run.id, Number(runId));
  const run = read(`actions/runs/${id(runId)}`);
  assert.equal(artifact.workflow_run.head_sha, run.head_sha);
  const zip = readers.bytes
    ? readers.bytes(artifact.id)
    : native(
        process.execPath,
        [
          fileURLToPath(new URL("./github-evidence.js", import.meta.url)),
          `/actions/artifacts/${id(artifact.id)}/zip`,
          "--binary",
        ],
        {
          encoding: null,
          maxBuffer: releaseTransportMaximumBytes,
          timeout: budgets.collection,
          phase: "artifact-read",
          env: {
            ...process.env,
            JSON_QUALITY_ARTIFACT_MAXIMUM_BYTES: String(
              releaseTransportMaximumBytes,
            ),
          },
        },
      );
  assert.ok(
    zip.length <= releaseTransportMaximumBytes,
    "Release artifact transport exceeds bound",
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
  const archivePath = join(root, `${artifact.id}.zip`);
  writeFileSync(archivePath, zip, { flag: "wx" });
  (
    readers.extract ??
    ((archivePath, directory, maximum) =>
      native(
        process.platform === "win32" ? "python" : "python3",
        [
          fileURLToPath(new URL("./extract-artifact.py", import.meta.url)),
          archivePath,
          directory,
          String(maximum),
        ],
        { timeout: budgets.collection, phase: "verified-artifact-extraction" },
      ))
  )(archivePath, directory, releaseTransportMaximumBytes);
  const retained = read(`actions/artifacts/${id(artifact.id)}`);
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
    [
      "npm-publication",
      "github-archival",
      "npm-promotion",
      "github-release",
    ].includes(name),
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
/** Authenticate absence as strictly as a possible write, including retained history. */
function writerInventory(entry) {
  const { run, jobs } = entry;
  const phase =
    entry.phase ??
    Object.keys(workflows).find(
      (name) => run.path === `.github/workflows/${workflows[name]}`,
    );
  assert.ok(["stage", "archive", "promote"].includes(phase));
  assert.equal(run.repository.full_name, repository);
  assert.equal(run.path, `.github/workflows/${workflows[phase]}`);
  assert.equal(run.event, "workflow_dispatch");
  assert.match(run.head_sha, /^[a-f0-9]{40}$/u);
  id(run.id);
  assert.ok(
    Number.isSafeInteger(run.run_attempt) &&
      run.run_attempt > 0 &&
      run.run_attempt <= 100,
  );
  assert.equal(run.status, "completed", "Another live release producer exists");
  assert.ok(Array.isArray(jobs.jobs) && jobs.jobs.length <= 10000);
  assert.equal(
    jobs.total_count,
    jobs.jobs.length,
    "Incomplete writer job inventory",
  );
  assert.equal(
    new Set(jobs.jobs.map((job) => job.id)).size,
    jobs.jobs.length,
    "Duplicate writer job IDs",
  );
  assert.equal(
    new Set(jobs.jobs.map((job) => job.name)).size,
    jobs.jobs.length,
    "Duplicate writer job names",
  );
  const services =
    phase === "promote" &&
    jobs.jobs.some((job) => ["npm", "github", "complete"].includes(job.name))
      ? ["npm", "github"]
      : [null];
  const allowed = services[0]
    ? ["admit", "npm", "github", "complete"]
    : ["admit", phase];
  for (const job of jobs.jobs) {
    id(job.id);
    assert.ok(allowed.includes(job.name), "Unexpected writer job");
    assert.equal(job.run_id, run.id);
    assert.equal(job.run_attempt, run.run_attempt);
    assert.equal(job.head_sha, run.head_sha);
    assert.equal(job.status, "completed", "Writer execution is unresolved");
  }
  return { phase, services };
}
function writerEffect(entry) {
  const { phase, services } = writerInventory(entry);
  assert.ok(
    services.includes(entry.service ?? null),
    "Writer service differs from native history",
  );
  const job = entry.jobs.jobs.find(
    (job) => job.name === (entry.service ?? phase),
  );
  // A complete inventory can prove the writer was never created.
  if (!job) return null;
  const steps = job.steps?.filter((step) => step.name === effectStep);
  if (job.conclusion === "skipped") {
    assert.ok(
      (steps ?? []).every(
        (step) => step.status === "completed" && step.conclusion === "skipped",
      ),
      "Skipped writer contains a possible write",
    );
    return null;
  }
  assert.ok(
    ["success", "failure", "cancelled", "timed_out"].includes(job.conclusion),
    "Writer outcome is unresolved",
  );
  assert.equal(
    steps?.length,
    1,
    "Writer effect history is unavailable or ambiguous",
  );
  const step = steps[0];
  assert.equal(step.status, "completed", "Writer effect is unresolved");
  if (step.conclusion === "skipped") return null;
  assert.equal(
    entry.run.head_branch,
    "main",
    "Possible writer effect is outside main",
  );
  assert.ok(
    ["success", "failure", "cancelled", "timed_out"].includes(step.conclusion),
    "Writer effect outcome is unresolved",
  );
  const started = Date.parse(step.started_at),
    completed = Date.parse(step.completed_at);
  assert.ok(
    Number.isFinite(started) &&
      Number.isFinite(completed) &&
      completed >= started,
    "Writer effect execution times are unavailable",
  );
  return { job, step };
}
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
    verifyRun(
      entry,
      entry.phase,
      entry.run.head_sha,
      {},
      {
        historical: true,
        availability: entry.availability ?? "npm-and-github",
      },
    );
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
    if (!writerEffect(entry)) continue;
    if (entry.noEffect) {
      assert.equal(entry.noEffect.schemaVersion, 1);
      assert.equal(entry.noEffect.state, "no-request");
      assert.equal(entry.noEffect.service, entry.service);
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
      assert.equal(intent.service, entry.service);
      if (entry.service) {
        assert.equal(intent.schemaVersion, 2);
        assert.ok(
          intent.operation === "completion-readback" ||
            intent.operation === `${entry.service}-latest`,
        );
      }
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
        [
          subject.package,
          ...(subject.platformArchives ?? []).map((entry) => entry.package),
        ].includes(intent.package) &&
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
  assert.ok([1, 2].includes(record.schemaVersion));
  assert.equal(record.repository, repository);
  assert.ok(Array.isArray(record.entries) && record.entries.length <= 10000);
  const keys = record.entries.map((entry) => effectJournal(entry.phase, entry));
  assert.equal(new Set(keys).size, keys.length, "Ambiguous retained history");
  return record.entries;
}
export function readEffectHistory(env, root, checkpoint, readers = {}) {
  const list = readers.pages ?? pages;
  const observe = readers.provider ?? provider;
  const acquire = readers.download ?? download;
  let retained = checkpoint
    ? (readers.checkpoint ?? readHistoryCheckpoint)(checkpoint)
    : undefined;
  const acquisition = join(root, "writer-history");
  mkdirSync(acquisition, { recursive: true });
  const history = [];
  for (const phase of ["stage", "archive", "promote"]) {
    const runs = list(
      `actions/workflows/${workflows[phase]}/runs?per_page=100`,
      "workflow_runs",
    );
    for (const run of runs) {
      const attempts = new Map();
      const readAttempt = (runId, attempt) => {
        assert.equal(runId, run.id);
        if (!attempts.has(attempt)) {
          const observed = observe(runId, attempt);
          assert.equal(observed.run.id, runId);
          assert.equal(observed.run.run_attempt, attempt);
          writerInventory({ ...observed, phase });
          attempts.set(attempt, observed);
        }
        return attempts.get(attempt);
      };
      assert.ok(run.run_attempt <= 100, "History attempt bound exceeded");
      for (let attempt = 1; attempt <= run.run_attempt; attempt++) {
        if (
          String(run.id) === env.GITHUB_RUN_ID &&
          String(attempt) === env.GITHUB_RUN_ATTEMPT
        )
          continue;
        const observed = readAttempt(run.id, attempt);
        const { services } = writerInventory({ ...observed, phase });
        for (const service of services) {
          const entry = structuredClone(observed);
          entry.phase = phase;
          if (service) entry.service = service;
          const effect = writerEffect(entry);
          if (effect) {
            // A partial rerun can relabel a retained successful/failed job.
            // Its immutable journal was already admitted at the original attempt.
            if (attempt > 1) {
              const origin = originalJobAttempt(
                observed,
                service ?? phase,
                readAttempt,
                attempts,
                {
                  requireSuccess: false,
                  maximumAttempts: 100,
                },
              );
              if (origin < attempt) {
                const original = writerEffect({
                  ...readAttempt(run.id, origin),
                  phase,
                  ...(service ? { service } : {}),
                });
                assert.deepEqual(
                  effect.step,
                  original?.step,
                  "Retained writer effect observation changed",
                );
                continue;
              }
            }
            const name = `effect-${phase}${service ? `-${service}` : ""}-${attempt}`;
            const artifacts = list(
              `actions/runs/${id(run.id)}/artifacts?per_page=100`,
              "artifacts",
            );
            const matches = artifacts.filter(
              (item) =>
                item.name === name ||
                new RegExp(`^${name}-recovery-[23]$`, "u").test(item.name),
            );
            assert.ok(matches.length <= 3, "Ambiguous historical artifact");
            assert.ok(
              new Set(matches.map((item) => item.digest)).size <= 1,
              "Conflicting historical artifact candidates",
            );
            if (!matches.some((item) => !item.expired)) {
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
                  item.service === entry.service &&
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
              if (record.availability) entry.availability = record.availability;
              if (record.journal) {
                entry.journal = Buffer.from(record.journal, "base64");
                assert.equal(entry.journal.toString("base64"), record.journal);
              }
              if (record.noEffect) entry.noEffect = record.noEffect;
              if (record.settlements) entry.settlements = record.settlements;
              history.push(entry);
              continue;
            }
            const { directory } = acquire(run.id, attempt, name, acquisition);
            const journal = join(
              directory,
              effectJournal(phase, {
                run: run.id,
                attempt,
                ...(service ? { service } : {}),
              }),
            );
            if (existsSync(journal)) entry.journal = regularBytes(journal);
            const marker = join(
              directory,
              `no-effect-${phase}${service ? `-${service}` : ""}-${run.id}-${attempt}.json`,
            );
            if (existsSync(marker)) entry.noEffect = readJson(marker);
            entry.settlements = retainedRecoveries(directory);
            if (service && existsSync(join(directory, "npm-continuation.json")))
              entry.availability = readJson(
                join(directory, "npm-continuation.json"),
              ).availability;
          }
          history.push(entry);
        }
      }
    }
  }
  const seen = new Set(
    history.map((entry) =>
      effectJournal(entry.phase, {
        run: entry.run.id,
        attempt: entry.run.run_attempt,
        service: entry.service,
      }),
    ),
  );
  // Expired/deleted runs disappear from provider enumeration. The signed
  // checkpoint's original native inventory must remain in the union.
  for (const record of retained ?? []) {
    const key = effectJournal(record.phase, record);
    if (seen.has(key)) continue;
    if (
      String(record.run) === env.GITHUB_RUN_ID &&
      String(record.attempt) === env.GITHUB_RUN_ATTEMPT
    )
      continue;
    assert.ok(["stage", "archive", "promote"].includes(record.phase));
    assert.ok(
      record.provider,
      "Checkpoint lacks original provider inventory for an expired run",
    );
    const entry = structuredClone(record.provider);
    assert.equal(String(entry.run.id), String(record.run));
    assert.equal(String(entry.run.run_attempt), String(record.attempt));
    assert.equal(entry.run.repository.full_name, repository);
    assert.equal(
      entry.run.path,
      `.github/workflows/${workflows[record.phase]}`,
    );
    assert.equal(entry.run.head_sha, record.controller);
    assert.equal(entry.jobs.total_count, entry.jobs.jobs.length);
    assert.ok(
      entry.jobs.jobs.every(
        (job) =>
          job.run_id === entry.run.id && job.head_sha === entry.run.head_sha,
      ),
    );
    entry.phase = record.phase;
    if (record.service) entry.service = record.service;
    if (record.availability) entry.availability = record.availability;
    if (record.journal) {
      entry.journal = Buffer.from(record.journal, "base64");
      assert.equal(entry.journal.toString("base64"), record.journal);
    }
    if (record.noEffect) entry.noEffect = record.noEffect;
    if (record.settlements) entry.settlements = record.settlements;
    history.push(entry);
    seen.add(key);
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
    schemaVersion: 2,
    repository,
    entries: history.map((entry) => ({
      phase: entry.phase,
      ...(entry.service ? { service: entry.service } : {}),
      ...(entry.availability ? { availability: entry.availability } : {}),
      run: String(entry.run.id),
      attempt: String(entry.run.run_attempt),
      controller: entry.run.head_sha,
      provider: { run: entry.run, jobs: entry.jobs },
      ...(entry.journal ? { journal: entry.journal.toString("base64") } : {}),
      ...(entry.noEffect ? { noEffect: entry.noEffect } : {}),
      ...(entry.settlements?.length ? { settlements: entry.settlements } : {}),
    })),
  });
}
export function recordProvider(directory, name, value) {
  save(join(directory, name), value);
}
