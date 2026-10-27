// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRepositoryReader } from "./github-evidence.js";
import {
  createReceipt,
  selectProof,
  verifyProof,
  repository,
  workflow,
  matrixLanes,
  requireResults,
} from "./ci-proof.js";
import { resolveQualificationMatrix } from "./node-matrix.js";
import { hostIdentity } from "./ci-host.js";
import { native, budgets } from "./qualification-process.js";

export function gitSnapshot(directory = process.cwd()) {
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: directory,
      encoding: "utf8",
      windowsHide: true,
      timeout: budgets.read,
      maxBuffer: 2 * 1024 * 1024,
    }).trim();
  const headers = git("cat-file", "commit", "HEAD")
    .split("\n\n")[0]
    .split("\n");
  return {
    commit: git("rev-parse", "HEAD"),
    tree: git("rev-parse", "HEAD^{tree}"),
    parents: headers
      .filter((line) => line.startsWith("parent "))
      .map((line) => line.slice(7)),
    workflow: git("rev-parse", `HEAD:${workflow}`),
  };
}
function context() {
  return {
    repository: process.env.GITHUB_REPOSITORY,
    repositoryId: Number(process.env.GITHUB_REPOSITORY_ID),
    runId: Number(process.env.GITHUB_RUN_ID),
    runAttempt: Number(process.env.GITHUB_RUN_ATTEMPT),
    sha: process.env.GITHUB_SHA,
    eventName: process.env.GITHUB_EVENT_NAME,
    event: JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH)),
    snapshot: gitSnapshot(),
  };
}
const hash = (bytes) =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const output = (values, summary) => {
  if (process.env.GITHUB_OUTPUT)
    for (const [key, value] of Object.entries(values)) {
      assert.match(key, /^[a-z_]+$/u);
      assert.ok(!/[\r\n]/u.test(String(value)));
      appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
    }
  console.log(JSON.stringify(values));
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + "\n");
};
function reader() {
  const request = createRepositoryReader({
    repository,
    token: process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN,
  });
  const historical = new Map();
  return (path, options) => {
    if (!/\/attempts\/\d+\/jobs\?/u.test(path)) return request(path, options);
    if (!historical.has(path)) historical.set(path, request(path, options));
    return historical.get(path);
  };
}
async function artifacts(read, runId, repositoryId) {
  const inventory = await read(`/actions/runs/${runId}/artifacts?per_page=100`);
  assert.equal(inventory.total_count, inventory.artifacts.length);
  assert.ok(inventory.total_count < 100);
  for (const value of inventory.artifacts) {
    assert.equal(value.workflow_run.id, runId);
    assert.equal(value.workflow_run.repository_id, repositoryId);
  }
  return inventory.artifacts;
}
export async function readRawProof(artifact, read) {
  assert.equal(artifact.expired, false);
  assert.match(artifact.digest, /^sha256:[a-f0-9]{64}$/u);
  assert.ok(
    artifact.size_in_bytes > 0 && artifact.size_in_bytes <= 2 * 1024 * 1024,
  );
  const bytes = await read(`/actions/artifacts/${artifact.id}/zip`, {
    raw: true,
  });
  assert.equal(bytes.length, artifact.size_in_bytes);
  assert.equal(hash(bytes), artifact.digest, "Artifact digest mismatch");
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}
function newestRecords(records, key) {
  const groups = new Map();
  for (const value of records) {
    const name = key(value);
    const prior = groups.get(name);
    if (!prior || value.runAttempt > prior.runAttempt) groups.set(name, value);
    else if (value.runAttempt === prior.runAttempt)
      assert.deepEqual(value, prior, "Conflicting compact receipts");
  }
  return [...groups.values()];
}
async function main(mode) {
  const ctx = context();
  assert.equal(ctx.repository, repository);
  const directory = join(process.env.RUNNER_TEMP, "ci-evidence");
  mkdirSync(directory, { recursive: true });
  if (mode === "lane") {
    const report = JSON.parse(readFileSync(process.env.JSON_QUALITY_REPORT));
    assert.equal(report.status, "passed");
    assert.equal(report.node, process.versions.node);
    assert.equal(report.sourceCommit, ctx.sha);
    const transport = await reader()(
      `/actions/artifacts/${Number(process.env.CI_ARCHIVE_ID)}`,
    );
    assert.equal(transport.expired, false);
    assert.equal(transport.workflow_run.id, ctx.runId);
    const record = {
      schemaVersion: 1,
      status: "passed",
      repositoryId: ctx.repositoryId,
      runId: ctx.runId,
      runAttempt: ctx.runAttempt,
      snapshot: ctx.snapshot,
      lane: { os: process.env.CI_OS, node: process.versions.node },
      host: { ...hostIdentity(), node: process.versions.node, npm: report.npm },
      consumer: Object.fromEntries(
        [
          "archiveSha256",
          "packageVersion",
          "nativePackage",
          "publicExports",
          "cliPhysicalFiles",
          "qualification",
          "installSource",
        ].map((key) => [key, report[key]]),
      ),
      transport: Object.fromEntries(
        ["id", "name", "digest", "size_in_bytes", "workflow_run"].map((key) => [
          key,
          transport[key],
        ]),
      ),
      performance: Object.fromEntries(
        ["check", "format"].map((name) => [
          name,
          JSON.parse(
            readFileSync(join(process.env.RUNNER_TEMP, `perf-${name}.json`)),
          ),
        ]),
      ),
    };
    const path = join(
      directory,
      `ci-lane-${record.lane.os}-${record.lane.node}-${ctx.runId}-${ctx.runAttempt}.json`,
    );
    writeFileSync(path, JSON.stringify(record) + "\n", { flag: "wx" });
    output(
      { path },
      "Packed consumer receipt recorded after all lane assertions.",
    );
    return;
  }
  const read = reader();
  if (mode === "record") {
    if (ctx.eventName === "workflow_dispatch") {
      assert.equal(process.env.GITHUB_REF, "refs/heads/main");
      requireResults(JSON.parse(process.env.NEEDS_JSON));
      output(
        { mode: "FULL" },
        "FULL: explicit main qualification and all mandatory predecessor graphs succeeded. This record cannot seed PR-result reuse.",
      );
      return;
    }
    const matrix = JSON.parse(process.env.CI_MATRIX);
    const inventory = await artifacts(read, ctx.runId, ctx.repositoryId);
    const records = [];
    for (const artifact of inventory.filter((value) =>
      /^ci-lane-[a-z0-9.-]+-\d+-\d+(?:-recovery-[23])?\.json$/u.test(
        value.name,
      ),
    ))
      records.push(await readRawProof(artifact, read));
    const receipt = await createReceipt({
      ctx,
      matrix,
      records: newestRecords(
        records,
        (value) => `${value.lane?.os}/${value.lane?.node}`,
      ),
      needs: JSON.parse(process.env.NEEDS_JSON),
      read,
    });
    if (ctx.event.pull_request.head.repo.id !== ctx.repositoryId) {
      output(
        { mode: "FULL", reuse: "INELIGIBLE_FORK" },
        "FULL: approved fork PR qualification and its complete native inventory succeeded. Same-repository main reuse is ineligible; no unused reuse artifact was uploaded.",
      );
      return;
    }
    const path = join(
      directory,
      `ci-proof-${ctx.runId}-${ctx.runAttempt}.json`,
    );
    writeFileSync(path, JSON.stringify(receipt) + "\n", { flag: "wx" });
    output(
      { path, mode: "FULL" },
      "FULL: every mandatory predecessor, frozen runtime lane and original producing attempt was admitted.",
    );
    return;
  }
  if (mode === "observe") {
    try {
      const selection = await selectProof({ ctx, read });
      const receipt = await readRawProof(selection.artifact, read);
      const matrix = await resolveQualificationMatrix();
      matrixLanes(matrix);
      const inventory = await artifacts(read, ctx.runId, ctx.repositoryId);
      const hosts = [];
      for (const artifact of inventory.filter((value) =>
        /^ci-host-[a-z0-9.-]+-\d+-\d+\.json$/u.test(value.name),
      )) {
        const host = await readRawProof(artifact, read);
        assert.equal(host.runId, ctx.runId);
        assert.equal(host.runAttempt, ctx.runAttempt);
        assert.equal(host.repositoryId, ctx.repositoryId);
        assert.equal(host.commit, ctx.sha);
        hosts.push(host);
      }
      const result = await verifyProof({
        ctx,
        matrix,
        hosts,
        selection,
        receipt,
        read,
      });
      output(
        result,
        "REUSED: the qualified PR tree, JSON/policy/schema/native/generated inputs, runtime matrix and runner images match this merge.",
      );
    } catch (error) {
      const reason = String(error.message)
        .split("\n")[0]
        .replace(/[^a-zA-Z0-9 .,():_-]/gu, "")
        .slice(0, 180);
      output(
        { mode: "FULL_REQUIRED" },
        `FULL_REQUIRED: ${reason}. Explicitly dispatch main qualification; no full suite was launched.`,
      );
    }
    return;
  }
  if (mode === "upload") {
    native(
      process.env.JSON_QUALITY_PRODUCER_NODE ?? process.execPath,
      [
        fileURLToPath(new URL("./upload-evidence.js", import.meta.url)),
        "upload",
        process.argv[3],
        process.argv[4] ?? "30",
      ],
      {
        timeout: budgets.upload,
        stdio: "inherit",
        phase: "compact-evidence-upload",
      },
    );
    return;
  }
  throw new Error("Expected lane, record, observe or upload");
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  await main(process.argv[2]);
