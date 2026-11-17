// SPDX-License-Identifier: AGPL-3.0-only
/** Adapted from Markdown Quality: admit original CI bytes without executing candidate code. */
import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { gitSnapshot, readRawProof, publishCiResult } from "./ci-command.js";
import {
  selectProof,
  verifyProof,
  repository,
  workflow,
  originalAttemptReader,
} from "./ci-proof.js";
import { createRepositoryReader } from "./github-evidence.js";
import { downloadEvidence } from "./download-evidence.js";
import { budgets } from "./qualification-budgets.js";
import {
  verifyManifest,
  verifyArchive,
  regularBytes,
  releaseArtifactBytes,
  sha256,
  lanes,
} from "./release-contract.js";
import { verifyLane } from "./release-qualification-contract.js";
import { verifyBuildEvidence } from "./release-promotion-evidence.js";

/** Eight lanes plus partial reruns need 65 normal requests including storage
 * redirects. Keep bounded retry headroom within the same collection deadline. */
export function createReleaseReuseReader(token, options = {}) {
  return createRepositoryReader({
    ...options,
    repository,
    token,
    budgetMs: budgets.collection,
    maximumRequests: 96,
  });
}

/** Reconstruct merge facts from native Git; provider PR association is checked separately. */
export function mergeQualificationContext(environment, snapshot) {
  assert.equal(environment.GITHUB_REPOSITORY, repository);
  assert.equal(environment.GITHUB_REF, "refs/heads/main");
  assert.equal(environment.GITHUB_EVENT_NAME, "workflow_dispatch");
  assert.equal(snapshot.commit, environment.GITHUB_SHA);
  assert.equal(
    snapshot.parents.length,
    2,
    "Reuse requires an ordinary two-parent merge",
  );
  const repositoryId = Number(environment.GITHUB_REPOSITORY_ID);
  return {
    repository,
    repositoryId,
    runId: Number(environment.GITHUB_RUN_ID),
    runAttempt: Number(environment.GITHUB_RUN_ATTEMPT),
    sha: snapshot.commit,
    snapshot,
    eventName: "push",
    event: {
      ref: "refs/heads/main",
      after: snapshot.commit,
      before: snapshot.parents[0],
      forced: false,
      created: false,
      deleted: false,
      repository: {
        id: repositoryId,
        full_name: repository,
        default_branch: "main",
      },
    },
  };
}

/** A retained bundle belongs to one authenticated original producing interval. */
export function selectQualificationArtifact(inventory, name, execution) {
  const matches = inventory.filter((artifact) => artifact.name === name);
  assert.equal(matches.length, 1, `Missing or ambiguous retained ${name}`);
  const artifact = matches[0];
  assert.equal(artifact.expired, false);
  assert.match(artifact.digest, /^sha256:[a-f0-9]{64}$/u);
  const created = Date.parse(artifact.created_at);
  assert.ok(
    created >= Date.parse(execution.job.started_at) &&
      created <= Date.parse(execution.job.completed_at),
    `Retained ${name} differs from its producing interval`,
  );
  return artifact;
}

/** Versioned authorization is distinct from original source and native production subjects. */
export function promoteManifest({
  manifestBytes,
  receipt,
  selection,
  releaseSource,
  proofBytes,
}) {
  const original = verifyManifest(JSON.parse(manifestBytes));
  assert.equal(original.schemaVersion, 3);
  assert.equal(
    receipt.schemaVersion,
    3,
    "Original CI proof is not release-capable",
  );
  assert.equal(original.source.commit, receipt.snapshot.commit);
  assert.equal(original.source.tree, receipt.snapshot.tree);
  assert.deepEqual(original.matrix, receipt.matrix);
  for (const lane of receipt.lanes) {
    assert.equal(lane.releaseEvidence?.manifestSha256, sha256(manifestBytes));
    assert.equal(lane.consumers.root.archiveSha256, original.archive.sha256);
    assert.equal(lane.consumers.root.packageVersion, original.version);
  }
  return verifyManifest({
    ...original,
    schemaVersion: 4,
    promotion: {
      schemaVersion: 1,
      repository,
      workflow,
      repositoryId: receipt.repositoryId,
      buildCommit: original.source.commit,
      releaseCommit: releaseSource,
      tree: receipt.snapshot.tree,
      parents: receipt.snapshot.parents,
      buildManifestSha256: sha256(manifestBytes),
      proofSha256: sha256(proofBytes),
      run: selection.run.id,
      attempt: selection.run.run_attempt,
      pullRequest: selection.pr.number,
    },
  });
}

/** A failed admission is terminal; fresh mode must be chosen before calling this resolver. */
export async function reuseQualification({
  environment = process.env,
  snapshot = gitSnapshot(),
  matrix,
  read,
  destination,
  download = downloadEvidence,
  now = Date.now,
}) {
  assert.equal(
    existsSync(destination),
    false,
    "Reuse output must be a new directory",
  );
  const scratch = mkdtempSync(join(tmpdir(), "json-quality-release-reuse-"));
  read = originalAttemptReader(read);
  const deadline = now() + budgets.collection;
  try {
    const ctx = mergeQualificationContext(environment, snapshot);
    assert.equal((await read("/git/ref/heads/main")).object.sha, ctx.sha);
    const selection = await selectProof({ ctx, read, now: now() });
    const { receipt, bytes: proofBytes } = await readRawProof(
      selection.artifact,
      read,
      { originalBytes: true },
    );
    const hosts = matrix.os.map((os) => ({
      ...receipt.lanes.find((lane) => lane.lane.os === os)?.host,
      lane: os,
    }));
    await verifyProof({
      ctx,
      matrix,
      hosts,
      selection,
      receipt,
      read,
      now: now(),
    });
    assert.equal(
      receipt.schemaVersion,
      3,
      "Required release-capable proof is unavailable; explicit force-fresh required",
    );
    const inventory = await read(
      `/actions/runs/${selection.run.id}/artifacts?per_page=100`,
    );
    assert.equal(inventory.total_count, inventory.artifacts.length);
    assert.ok(inventory.total_count < 100);
    const transfer = (artifact, path) =>
      download({
        id: artifact.id,
        destination: path,
        read,
        runId: selection.run.id,
        repositoryId: ctx.repositoryId,
        headSha: selection.run.head_sha,
        expectedArtifact: artifact,
        deadline,
        now,
      });
    const archives = join(scratch, "archives");
    await transfer(receipt.lanes[0].transport, archives);
    const manifestBytes = regularBytes(join(archives, "release-manifest.json"));
    const release = promoteManifest({
      manifestBytes,
      receipt,
      selection,
      releaseSource: ctx.sha,
      proofBytes,
    });
    assert.equal(release.version, environment.RELEASE_VERSION);
    for (const entry of [
      { archive: release.archive },
      ...release.platformArchives,
    ])
      verifyArchive(
        releaseArtifactBytes(join(archives, entry.archive.filename)),
        entry.archive,
      );
    assert.equal(
      sha256(regularBytes(join(archives, "build-package-lock.json"))),
      release.source.lockSha256,
    );
    const artifacts = [];
    for (const lane of lanes(matrix)) {
      const executions = receipt.executions.filter(
        (item) =>
          item.job.name === `Product / Qualify ${lane.os} / Node ${lane.node}`,
      );
      assert.equal(executions.length, 1);
      const execution = executions[0];
      const artifact = selectQualificationArtifact(
        inventory.artifacts,
        `consumer-${lane.os}-${lane.node}-${execution.runAttempt}`,
        execution,
      );
      const target = join(archives, `candidate-${lane.os}-${lane.node}`);
      await transfer(artifact, target);
      verifyLane(target, release, lane, "transported archive");
      artifacts.push(artifact);
    }
    writeFileSync(join(archives, "build-manifest.json"), manifestBytes, {
      flag: "wx",
    });
    writeFileSync(join(archives, "build-qualification.json"), proofBytes, {
      flag: "wx",
    });
    writeFileSync(
      join(archives, "release-manifest.json"),
      JSON.stringify(release, null, 2) + "\n",
    );
    verifyBuildEvidence(release, archives);
    // The final barriers remain uncached even though original attempt reads are shared.
    assert.equal((await read("/git/ref/heads/main")).object.sha, ctx.sha);
    const final = await read(`/actions/runs/${selection.run.id}`);
    assert.equal(final.run_attempt, selection.run.run_attempt);
    assert.equal(final.conclusion, "success");
    for (const original of [selection.artifact, ...artifacts]) {
      const observed = await read(`/actions/artifacts/${original.id}`);
      assert.equal(observed.expired, false);
      for (const key of ["id", "name", "digest", "size_in_bytes"])
        assert.deepEqual(observed[key], original[key]);
    }
    cpSync(archives, destination, {
      recursive: true,
      force: false,
      errorOnExist: true,
    });
    return {
      reused: "true",
      originalRun: selection.run.id,
      originalAttempt: selection.run.run_attempt,
      source: release.source.commit,
    };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mode = process.env.FORCE_FRESH;
  assert.ok(
    [undefined, "", "false", "true"].includes(mode),
    "Invalid force-fresh boolean",
  );
  try {
    const result =
      mode === "true"
        ? { reused: "false", fresh: "true" }
        : await reuseQualification({
            matrix: JSON.parse(process.env.RELEASE_MATRIX),
            destination: resolve(process.argv[2]),
            read: createReleaseReuseReader(process.env.GH_TOKEN),
          });
    publishCiResult(
      result,
      result.reused === "true"
        ? `REUSED: original CI ${result.originalRun}/${result.originalAttempt}; archive bytes unchanged.`
        : "FRESH: explicitly requested full qualification.",
    );
  } catch (error) {
    publishCiResult(
      { reused: "false", fresh: "false" },
      "STOPPED: reuse could not be admitted; no fresh qualification was started.",
    );
    throw error;
  }
}
