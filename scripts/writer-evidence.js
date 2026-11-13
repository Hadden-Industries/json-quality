// SPDX-License-Identifier: AGPL-3.0-only
/** Raw deterministic ZIP transport with provider reconciliation, without project SDK imports. */
import assert from "node:assert/strict";
import {
  appendFileSync,
  copyFileSync,
  mkdtempSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { createRepositoryReader } from "./github-evidence.js";
import { budgets, native } from "./qualification-process.js";
import { artifactLimits } from "./artifact-policy.js";
import { save, readJson, sha256 } from "./release-records.js";

const publish = (values, env) => {
  for (const [key, value] of Object.entries(values)) {
    assert.ok(!/[\r\n]/u.test(String(value)));
    appendFileSync(env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
};

export function prepareWriterEvidence(directory, name, env = process.env) {
  assert.match(name, /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,200}$/u);
  const root = mkdtempSync(join(env.RUNNER_TEMP, "writer-evidence-")),
    path = join(root, name);
  native(
    process.platform === "win32" ? "python" : "python3",
    [
      fileURLToPath(new URL("./pack-artifact.py", import.meta.url)),
      directory,
      path,
      String(artifactLimits.payloadBytes),
    ],
    { timeout: budgets.upload, phase: "writer-evidence-pack" },
  );
  const bytes = readFileSync(path),
    record = {
      path,
      name,
      size: bytes.length,
      digest: `sha256:${sha256(bytes)}`,
      run: Number(env.GITHUB_RUN_ID),
      controller: env.GITHUB_SHA,
      repositoryId: Number(env.GITHUB_REPOSITORY_ID),
    };
  const transport = join(root, "transport.json");
  save(transport, record);
  publish({ path, transport }, env);
  return record;
}

/** A failed upload is adopted only by exact native name/digest/size/run readback. */
export async function reconcileWriterEvidence(
  transport,
  attempt,
  env = process.env,
  { read, sleep = delay } = {},
) {
  assert.ok([1, 2, 3].includes(attempt));
  const record = readJson(transport),
    name = attempt === 1 ? record.name : `${record.name}-recovery-${attempt}`;
  assert.equal(`sha256:${sha256(readFileSync(record.path))}`, record.digest);
  read ??= createRepositoryReader({
    repository: env.GITHUB_REPOSITORY,
    token: env.GH_TOKEN,
    budgetMs: budgets.read,
  });
  let found;
  if (env.UPLOAD_RESULT === "success") {
    assert.match(env.UPLOAD_ID, /^[1-9]\d*$/u);
    assert.equal(
      env.UPLOAD_DIGEST.replace(/^sha256:/u, ""),
      record.digest.slice(7),
    );
    found = await read(`/actions/artifacts/${env.UPLOAD_ID}`);
  } else {
    assert.equal(env.UPLOAD_RESULT, "failure");
    for (let observation = 0; observation < 3; observation++) {
      const values = [];
      for (let page = 1; ; page++) {
        const inventory = await read(
          `/actions/runs/${record.run}/artifacts?per_page=100&page=${page}`,
        );
        assert.ok(
          Number.isSafeInteger(inventory.total_count) &&
            inventory.total_count <= 10000,
        );
        values.push(...inventory.artifacts);
        if (values.length >= inventory.total_count) {
          assert.equal(values.length, inventory.total_count);
          break;
        }
        assert.equal(
          inventory.artifacts.length,
          100,
          "Truncated artifact inventory",
        );
      }
      const matching = values.filter((value) => value.name === name);
      assert.ok(matching.length <= 1, "Conflicting original writer artifacts");
      if (matching.length) {
        found = matching[0];
        break;
      }
      if (observation < 2) await sleep(1000 * 2 ** observation);
    }
  }
  if (found) {
    assert.equal(found.name, name);
    assert.equal(found.digest, record.digest);
    assert.equal(found.size_in_bytes, record.size);
    assert.equal(found.expired, false);
    assert.equal(found.workflow_run.id, record.run);
    assert.equal(found.workflow_run.repository_id, record.repositoryId);
    assert.equal(found.workflow_run.head_sha, record.controller);
    publish(
      {
        "artifact-id": found.id,
        "artifact-digest": found.digest,
        "artifact-name": name,
        complete: "true",
      },
      env,
    );
    return found;
  }
  assert.ok(
    attempt < 3,
    "Writer evidence upload unconfirmed; reconcile native artifacts before another release operation",
  );
  const next = record.path + `-recovery-${attempt + 1}`;
  copyFileSync(record.path, next);
  publish({ "next-path": next, complete: "false" }, env);
  return null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === "prepare")
    prepareWriterEvidence(process.argv[3], process.argv[4]);
  else {
    assert.equal(process.argv[2], "reconcile");
    await reconcileWriterEvidence(process.argv[3], Number(process.argv[4]));
  }
}
