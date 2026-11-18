// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { qualifyReleaseAssurance } from "../scripts/release-assurance.js";
import { sha256 } from "../scripts/release-records.js";
import { qualifiedCiFixture } from "./ci-proof-fixture.js";
import { temporaryDirectory } from "./temporary-directory.js";

test("fresh assurance uses original producing attempts and retains only compact observations", (t) => {
  const root = temporaryDirectory(t, "json-fresh-assurance-");
  const directory = join(root, "frozen"),
    output = join(root, "security");
  mkdirSync(directory);
  mkdirSync(output);
  const f = qualifiedCiFixture(2);
  const lock = Buffer.from(
    '{"name":"fixture","version":"1.0.0","lockfileVersion":3,"packages":{"":{}}}\n',
  );
  writeFileSync(
    join(directory, "release-manifest.json"),
    JSON.stringify({
      schemaVersion: 3,
      source: { lockSha256: sha256(lock) },
      matrix: f.matrix,
    }),
  );
  writeFileSync(join(directory, "build-package-lock.json"), lock);
  const fresh = (attempt) => ({
    run: {
      ...f.run,
      path: ".github/workflows/release-qualification.yml",
      run_attempt: attempt,
    },
    jobs: {
      total_count: f.records.length,
      jobs: f.records.map(({ lane }, index) => ({
        name: `product / Qualify ${lane.os} / Node ${lane.node}`,
        run_id: f.run.id,
        run_attempt: attempt,
        head_sha: f.run.head_sha,
        runner_id: index + 1,
        started_at: "2026-11-17T00:00:00Z",
        completed_at: "2026-11-17T00:10:00Z",
        status: "completed",
        conclusion: "success",
      })),
    },
  });
  const workspaces = new Set();
  const acquire = (run, attempt, name, workspace) => {
    assert.equal(Number(run), 71);
    assert.equal(
      attempt,
      1,
      "A retained lane must not be relabelled as attempt 2",
    );
    workspaces.add(workspace);
    const target = join(workspace, name);
    mkdirSync(target);
    writeFileSync(join(workspace, `${name}.zip`), "disposable transport");
    for (const layout of ["root", "isolated"]) {
      writeFileSync(join(target, `${layout}-lock.json`), lock);
      writeFileSync(
        join(target, `${layout}-inventory.json`),
        JSON.stringify({ lockSha256: sha256(lock) }),
      );
    }
    return { directory: target };
  };
  const report = {
    auditReportVersion: 2,
    vulnerabilities: {},
    metadata: { vulnerabilities: { total: 0 } },
  };
  const options = {
    environment: { GITHUB_RUN_ID: "71", GITHUB_RUN_ATTEMPT: "2" },
    observe: (run, attempt) => fresh(Number(attempt)),
    acquire,
    run: () => JSON.stringify(report),
  };
  const result = qualifyReleaseAssurance(directory, output, options);
  assert.equal(result.results.length, 1 + 2 * f.records.length);
  assert.equal(
    result.policySha256,
    sha256(
      readFileSync(
        new URL("../scripts/dependency-audit-policy.js", import.meta.url),
      ),
    ),
  );
  assert.ok(
    readdirSync(output).every(
      (name) => name === "audit-policy.json" || name.endsWith("-audit.json"),
    ),
    "Downloaded ZIPs/recipient directories must not become retained security evidence",
  );
  assert.deepEqual(readdirSync(directory).sort(), [
    "build-package-lock.json",
    "release-manifest.json",
  ]);
  for (const workspace of workspaces)
    assert.equal(existsSync(workspace), false);
  assert.deepEqual(
    readFileSync(join(directory, "build-package-lock.json")),
    lock,
  );
  assert.throws(
    () =>
      qualifyReleaseAssurance(directory, join(root, "failed"), {
        ...options,
        acquire: (...args) => {
          acquire(...args);
          throw new Error("interrupted recipient download");
        },
      }),
    /interrupted recipient/u,
  );
  for (const workspace of workspaces)
    assert.equal(
      existsSync(workspace),
      false,
      "Failed collection must also dispose of its transport",
    );
});
