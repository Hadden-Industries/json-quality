// SPDX-License-Identifier: AGPL-3.0-only
/** Download once, verify exact native metadata/digest, then bounded extraction. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRepositoryReader } from "./github-evidence.js";
import { native, budgets } from "./qualification-process.js";
import { artifactLimits } from "./artifact-policy.js";

export async function downloadEvidence({
  id,
  destination,
  read,
  runId,
  repositoryId,
  headRepositoryId = repositoryId,
  headSha,
  maximum = artifactLimits.payloadBytes,
}) {
  assert.ok(Number.isSafeInteger(id) && id > 0);
  const admit = (metadata) => {
    assert.equal(metadata.id, id);
    assert.equal(metadata.expired, false);
    assert.match(metadata.digest, /^sha256:[a-f0-9]{64}$/u);
    assert.equal(metadata.workflow_run.id, runId);
    assert.equal(metadata.workflow_run.repository_id, repositoryId);
    assert.equal(metadata.workflow_run.head_repository_id, headRepositoryId);
    assert.equal(metadata.workflow_run.head_sha, headSha);
    assert.ok(
      metadata.size_in_bytes > 0 &&
        metadata.size_in_bytes <= maximum + artifactLimits.envelopeBytes,
    );
  };
  const metadata = await read(`/actions/artifacts/${id}`);
  admit(metadata);
  const size = metadata.size_in_bytes,
    digest = metadata.digest;
  const bytes = await read(`/actions/artifacts/${id}/zip`, {
    raw: true,
    maximumBytes: maximum + artifactLimits.envelopeBytes,
  });
  assert.equal(bytes.length, size);
  assert.equal(
    `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
    digest,
  );
  // Finish the shared network lookup before the separate extraction phase.
  // Provider conflict/expiry must fail before any payload is materialized.
  const retained = await read(`/actions/artifacts/${id}`);
  admit(retained);
  assert.equal(retained.digest, digest);
  assert.equal(retained.size_in_bytes, size);
  const scratch = mkdtempSync(
      join(process.env.RUNNER_TEMP, "artifact-download-"),
    ),
    archive = join(scratch, "payload.zip");
  writeFileSync(archive, bytes, { flag: "wx" });
  mkdirSync(destination, { recursive: true });
  native(
    process.platform === "win32" ? "python" : "python3",
    [
      fileURLToPath(new URL("./extract-artifact.py", import.meta.url)),
      archive,
      destination,
      String(maximum),
    ],
    { timeout: budgets.collection, phase: "artifact-extract" },
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pull =
    process.env.GITHUB_EVENT_NAME === "pull_request"
      ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"))
          .pull_request
      : null;
  const read = createRepositoryReader({
    repository: process.env.GITHUB_REPOSITORY,
    token: process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN,
    budgetMs: budgets.collection,
  });
  await downloadEvidence({
    id: Number(process.argv[2]),
    destination: resolve(process.argv[3]),
    read,
    runId: Number(process.env.GITHUB_RUN_ID),
    repositoryId: Number(process.env.GITHUB_REPOSITORY_ID),
    headRepositoryId:
      pull?.head.repo.id ?? Number(process.env.GITHUB_REPOSITORY_ID),
    headSha: pull?.head.sha ?? process.env.GITHUB_SHA,
  });
}
