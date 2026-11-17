// SPDX-License-Identifier: AGPL-3.0-only
/** Check real CLI readiness and exact target retention after external collection. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { temporaryDirectory } from "./temporary-directory.js";

const root = fileURLToPath(new URL("../", import.meta.url));

for (const [phase, conclusion, completion, expected] of [
  ["archive", "success", null, "prepared"],
  ["promote", "success", "success", "prepared"],
  ["promote", "failure", "failure", "prepared-with-unresolved-effects"],
  ["promote", "cancelled", "skipped", "prepared-with-unresolved-effects"],
  ["promote", "success", "skipped", "prepared-with-unresolved-effects"],
])
  test(`${phase} ${conclusion}/${completion}: checkpoint readiness requires complete operation success`, (t) => {
    const work = temporaryDirectory(t, "json-history-preparation-");
    const directory = join(work, "original");
    mkdirSync(directory);
    writeFileSync(join(directory, "release-review.json"), "{}\n");
    if (phase === "promote")
      writeFileSync(
        join(directory, "availability-operation.json"),
        '{"family":{}}\n',
      );
    const observed = {
      run: {
        id: 17,
        run_attempt: 1,
        head_sha: "a".repeat(40),
        repository: { full_name: "Hadden-Industries/json-quality" },
        head_branch: "main",
        status: "completed",
        conclusion,
        path: `.github/workflows/${phase === "archive" ? "github-release" : "promote-release"}.yml`,
      },
      jobs: {
        total_count: phase === "archive" ? 2 : 4,
        jobs: (phase === "archive"
          ? ["admit", "archive"]
          : ["admit", "npm", "github", "complete"]
        ).map((name, index) => ({
          id: index + 1,
          name,
          run_id: 17,
          run_attempt: 1,
          head_sha: "a".repeat(40),
          runner_id: index + 1,
          started_at: "2026-11-17T00:00:00Z",
          completed_at: "2026-11-17T00:01:00Z",
          status: "completed",
          conclusion: name === "complete" ? completion : "success",
        })),
      },
    };
    const fixture = join(work, "provider.json");
    writeFileSync(
      fixture,
      JSON.stringify({
        observed,
        directory,
        target: fileURLToPath(
          new URL("./fixtures/release/qualified-1.0.0.json", import.meta.url),
        ),
      }),
    );
    const output = join(work, "prepared");
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        new URL("./release-history-preparation-hook.mjs", import.meta.url).href,
        "scripts/prepare-release-history.js",
        "17",
        "1",
        output,
        join(work, "scratch"),
      ],
      {
        cwd: root,
        env: { ...process.env, RELEASE_HISTORY_FIXTURE: fixture },
        encoding: "utf8",
        windowsHide: true,
        timeout: 30000,
      },
    );
    assert.equal(result.error, undefined);
    const readiness = JSON.parse(
      readFileSync(join(output, "checkpoint-readiness.json")),
    );
    assert.equal(
      readiness.state,
      expected,
      JSON.stringify(readiness) + result.stderr,
    );
    assert.equal(result.status, expected === "prepared" ? 0 : 1, result.stderr);
    assert.equal(readiness.originalConclusion, "success");
    const history = JSON.parse(
      readFileSync(join(output, "release-history.json")),
    );
    assert.equal(history.qualifiedTargetRefs.length, 1);
    const target = JSON.parse(
      readFileSync(
        join(
          output,
          "release-targets",
          history.qualifiedTargetRefs[0].manifestSha256 + ".json",
        ),
      ),
    );
    assert.ok(
      target.release.assets.every((asset) => Number.isSafeInteger(asset.id)),
    );
    assert.equal(
      JSON.parse(readFileSync(join(output, "original-operation-provider.json")))
        .run.conclusion,
      conclusion,
    );
  });
