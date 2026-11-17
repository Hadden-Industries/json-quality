// SPDX-License-Identifier: AGPL-3.0-only
/** Shared native-shaped CI provider fixture for admission and promotion journeys. */
import contractCohort from "../schemas/contract-cohort.json" with { type: "json" };
import { nodeSupport } from "../scripts/node-matrix.js";
import { jobNames, repository, workflow } from "../scripts/ci-proof.js";
import { pythonVersion } from "../scripts/ci-host.js";
import { ubuntuRunner, ubuntuRunnerPattern } from "../scripts/runner-policy.js";
import { nodeMatrixFixture } from "./node-matrix-fixture.js";
import {
  MINIMAL_CLI_CASES,
  MINIMAL_CLI_COMMANDS,
} from "../scripts/consumer-cli-probe.js";
const sha = (value) => value.repeat(40);
const currentImage = `ubuntu${ubuntuRunnerPattern.exec(ubuntuRunner())[1]}`;
function performanceFixture(source, node, os, operation) {
  const windows = os.startsWith("windows");
  const tree = {
    schemaVersion: 1,
    platform: windows ? "win32" : "linux",
    status: "passed",
    cleanup: "passed",
    quiescence: "passed",
    exitCode: 0,
    timedOut: false,
    cancelled: false,
    units: "bytes",
    driverIncluded: true,
    controllerIncluded: false,
    method: windows ? "windows-job" : "linux-process-group",
    metric: windows ? "peak-committed-bytes" : "sampled-sum-rss-bytes",
    peakBytes: 1024,
    samples: 2,
    processCount: 2,
  };
  return {
    schemaVersion: 2,
    status: "passed",
    environment: { node: `v${node}`, platform: tree.platform },
    workload: { operation, repetitions: 1 },
    identities: [
      {
        variant: "candidate",
        head: source,
        sourceSha256: "e".repeat(64),
        nativeIdentity: { coreSourceInputsSha256: "d".repeat(64) },
      },
    ],
    samples: [
      {
        variant: "candidate",
        repetition: 0,
        identity: { coreSourceInputsSha256: "d".repeat(64) },
        tree: { ...tree },
      },
    ],
    observations: [-1, 0].map((repetition) => ({
      variant: "candidate",
      repetition,
      ...tree,
    })),
  };
}
export function qualifiedCiFixture(attempt = 1, fork = false) {
  const now = Date.parse("2026-10-27T12:00:00Z"),
    repo = { id: 11, full_name: repository, default_branch: "main" };
  const matrix = nodeMatrixFixture();
  const snapshot = {
    commit: sha("1"),
    tree: sha("2"),
    parents: [sha("3"), sha("4")],
    workflow: sha("5"),
    defaultPolicySha256: "a".repeat(64),
  };
  const pr = {
    number: 17,
    state: "closed",
    merged: true,
    merged_at: new Date(now - 100).toISOString(),
    // API 2026-03-10 omits merge_commit_sha from both PR responses.
    base: { ref: "main", sha: sha("3"), repo },
    head: {
      sha: sha("4"),
      repo: fork ? { id: 12, full_name: "contributor/json-quality" } : repo,
    },
  };
  const ctx = {
    repository,
    repositoryId: 11,
    runId: 71,
    runAttempt: attempt,
    sha: snapshot.commit,
    eventName: "pull_request",
    snapshot,
    event: { number: 17, pull_request: pr },
  };
  const run = {
    id: 71,
    run_attempt: attempt,
    repository: repo,
    head_repository: pr.head.repo,
    event: "pull_request",
    path: workflow,
    head_sha: pr.head.sha,
    status: "completed",
    conclusion: "success",
    run_started_at: new Date(now - 10000).toISOString(),
    updated_at: new Date(now - 100).toISOString(),
  };
  const original = jobNames(matrix).map((name, index) => ({
    id: index + 1,
    name,
    run_id: 71,
    run_attempt: 1,
    head_sha: run.head_sha,
    runner_id: index + 1,
    status: "completed",
    conclusion: "success",
    started_at: new Date(now - 9000).toISOString(),
    completed_at: new Date(now - 2000).toISOString(),
  }));
  const jobs = original.map((value) => ({
    ...value,
    id: value.id + 100,
    run_attempt: attempt,
  }));
  const artifact = {
    id: 501,
    name: `ci-proof-71-${attempt}.json`,
    digest: "sha256:" + "a".repeat(64),
    expired: false,
    created_at: new Date(now - 500).toISOString(),
    expires_at: new Date(now + 86400000).toISOString(),
    workflow_run: {
      id: 71,
      repository_id: 11,
      head_repository_id: pr.head.repo.id,
      head_sha: run.head_sha,
    },
  };
  const hosts = matrix.os.map((lane) => ({
    lane,
    os: lane.startsWith("windows") ? "Windows" : "Linux",
    architecture: "X64",
    image: lane.startsWith("windows") ? "win25" : currentImage,
    imageVersion: "20261020.1.0",
    python: pythonVersion,
  }));
  const transport = {
    id: 502,
    name: "qualified-producer-1",
    digest: "sha256:" + "d".repeat(64),
    size_in_bytes: 1024,
    workflow_run: {
      id: 71,
      repository_id: 11,
      head_repository_id: pr.head.repo.id,
      head_sha: run.head_sha,
    },
  };
  const records = matrix.os.flatMap((os) =>
    matrix.node.map((node) => ({
      schemaVersion: 2,
      status: "passed",
      repositoryId: 11,
      runId: 71,
      runAttempt: 1,
      snapshot,
      lane: { os, node },
      host: {
        ...hosts.find((host) => host.lane === os),
        node,
        npm: nodeSupport.consumerNpm,
      },
      transport,
      performance: Object.fromEntries(
        ["check", "format"].map((operation) => [
          operation,
          performanceFixture(snapshot.commit, node, os, operation),
        ]),
      ),
      consumers: Object.fromEntries(
        ["root", "isolated"].map((layout) => [
          layout,
          {
            sourceCommit: snapshot.commit,
            controllerCommit: snapshot.commit,
            node,
            npm: nodeSupport.consumerNpm,
            platform: os.startsWith("windows") ? "win32" : "linux",
            architecture: "x64",
            archiveSha256: "e".repeat(64),
            packageVersion: "1.0.0-rc.1",
            nativePackage: {
              name: `@hadden-industries/json-quality-${os.startsWith("windows") ? "win32" : "linux"}-x64`,
              version: "1.0.0-rc.1",
              integrity: "sha512-Ynl0ZXM=",
            },
            publicExports: 7,
            cliPhysicalFiles: 2,
            qualification: "transported archive",
            installSource: "producer-archive",
            minimalCli: {
              status: "passed",
              packageVersion: "1.0.0-rc.1",
              cohortVersion: contractCohort.cohortVersion,
              policy: "package-defaults",
              defaultPolicySha256: "a".repeat(64),
              command: "npm exec -- json-quality",
              cases: [...MINIMAL_CLI_CASES],
              commands: structuredClone(MINIMAL_CLI_COMMANDS),
              generatedLockSha256: "b".repeat(64),
              packageName: "@hadden-industries/json-quality",
              specifier: "file:fixture.tgz",
              routing: "npm-generated-lock-with-transported-file-archives",
              corePackage: {
                name: "@hadden-industries/json-quality",
                version: "1.0.0-rc.1",
                integrity: "sha512-Ynl0ZXM=",
                sha256: "e".repeat(64),
              },
              nativePackage: {
                name: `@hadden-industries/json-quality-${os.startsWith("windows") ? "win32" : "linux"}-x64`,
                version: "1.0.0-rc.1",
                integrity: "sha512-Ynl0ZXM=",
              },
            },
          },
        ]),
      ),
    })),
  );
  const needs = Object.fromEntries(
    ["policy", "product", "native", "dependencies", "codeql"].map((name) => [
      name,
      { result: "success" },
    ]),
  );
  const main = {
    ...ctx,
    runId: 72,
    runAttempt: 1,
    sha: sha("6"),
    snapshot: { ...snapshot, commit: sha("6") },
    eventName: "push",
    event: {
      ref: "refs/heads/main",
      after: sha("6"),
      before: sha("3"),
      forced: false,
      created: false,
      deleted: false,
      repository: repo,
    },
  };
  const read = async (path) => {
    if (path === `/commits/${main.sha}/pulls?per_page=100`) return [pr];
    if (path === "/pulls/17") return pr;
    if (path.startsWith("/actions/workflows/ci.yml/runs?"))
      return { total_count: 1, workflow_runs: [run] };
    if (path === "/actions/runs/71/artifacts?per_page=100")
      return { total_count: 1, artifacts: [artifact] };
    if (path === "/actions/artifacts/501") return artifact;
    if (path === "/actions/artifacts/502")
      return { ...transport, expired: false };
    if (path === "/actions/runs/71/jobs?filter=latest&per_page=100")
      return { total_count: jobs.length, jobs };
    if (path === "/actions/runs/71/attempts/1/jobs?per_page=100")
      return { total_count: original.length, jobs: original };
    if (path === `/actions/runs/71/attempts/${attempt}/jobs?per_page=100`)
      return { total_count: jobs.length, jobs };
    if (path === "/actions/runs/71") return run;
    if (path === `/git/commits/${snapshot.commit}`)
      return {
        sha: snapshot.commit,
        tree: { sha: snapshot.tree },
        parents: snapshot.parents.map((sha) => ({ sha })),
      };
    throw new Error(`Unexpected fixture read ${path}`);
  };
  return {
    ctx,
    main,
    now,
    matrix,
    pr,
    run,
    jobs,
    artifact,
    hosts,
    records,
    needs,
    read,
  };
}
