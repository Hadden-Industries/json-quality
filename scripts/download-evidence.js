// SPDX-License-Identifier: AGPL-3.0-only
/** Download once, verify exact native metadata/digest, then bounded extraction. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRepositoryReader } from "./github-evidence.js";
import { native, budgets } from "./qualification-process.js";

export async function downloadEvidence({
  id,
  destination,
  read,
  runId,
  repositoryId,
  headRepositoryId = repositoryId,
  headSha,
  maximum = 536870912,
}) {
  assert.ok(Number.isSafeInteger(id) && id > 0);
  const metadata = await read(`/actions/artifacts/${id}`);
  assert.equal(metadata.id, id);
  assert.equal(metadata.expired, false);
  assert.match(metadata.digest, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(metadata.workflow_run.id, runId);
  assert.equal(metadata.workflow_run.repository_id, repositoryId);
  assert.equal(metadata.workflow_run.head_repository_id, headRepositoryId);
  assert.equal(metadata.workflow_run.head_sha, headSha);
  assert.ok(
    metadata.size_in_bytes > 0 && metadata.size_in_bytes <= maximum + 1048576,
  );
  const bytes = await read(`/actions/artifacts/${id}/zip`, {
    raw: true,
    maximumBytes: maximum + 1048576,
  });
  assert.equal(bytes.length, metadata.size_in_bytes);
  assert.equal(
    `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
    metadata.digest,
  );
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
  const retained = await read(`/actions/artifacts/${id}`);
  assert.equal(retained.expired, false);
  assert.equal(retained.digest, metadata.digest);
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
