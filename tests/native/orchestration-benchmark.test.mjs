// SPDX-License-Identifier: AGPL-3.0-only
import { budgets } from "../../scripts/qualification-process.js";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { gitReadEnvironment } from "../../src/repository-discovery.js";
import { nativeTemporaryRoot } from "./client.mjs";

const harness = fileURLToPath(
  new URL("../../scripts/bench-orchestration.js", import.meta.url),
);
function benchmark(args, options = {}) {
  return spawnSync(process.execPath, [harness, ...args], {
    encoding: "utf8",
    windowsHide: true,
    timeout: budgets.read,
    ...options,
  });
}

test("benchmark isolates inherited Git authority and records rewrite phases/native identity", async () => {
  const root = await mkdtemp(
      join(nativeTemporaryRoot, "benchmark-git-authority-"),
    ),
    reportPath = join(root, "report.json"),
    git = (...args) =>
      execFileSync("git", ["-C", root, ...args], {
        encoding: "utf8",
        windowsHide: true,
        env: gitReadEnvironment(),
      });
  try {
    git("init", "--quiet", "--template=");
    await writeFile(join(root, "sentinel.txt"), "owned fixture preimage\n");
    git("add", ".");
    git(
      "-c",
      "core.hooksPath=",
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "--quiet",
      "--no-gpg-sign",
      "-m",
      "Fixture",
    );
    const head = git("rev-parse", "HEAD"),
      index = await readFile(join(root, ".git/index"));
    const child = benchmark(
      [
        "--workload",
        "format",
        "--files",
        "1",
        "--changed",
        "1",
        "--repetitions",
        "1",
        "--output",
        reportPath,
      ],
      {
        env: {
          ...process.env,
          GIT_DIR: join(root, ".git"),
          GIT_WORK_TREE: root,
          GIT_INDEX_FILE: join(root, ".git/index"),
        },
      },
    );
    assert.equal(child.status, 0, child.error?.message ?? child.stderr);
    assert.equal(git("rev-parse", "HEAD"), head);
    assert.deepEqual(await readFile(join(root, ".git/index")), index);
    assert.equal(
      await readFile(join(root, "sentinel.txt"), "utf8"),
      "owned fixture preimage\n",
    );
    const report = JSON.parse(await readFile(reportPath, "utf8")),
      sample = report.samples[0];
    assert.equal(sample.terminal.written, "1");
    assert.ok(sample.phases.census["execution-terminal"]);
    assert.ok(sample.phases.rewrite["write-terminal"]);
    assert.match(sample.identity.coreSourceInputsSha256, /^[a-f0-9]{64}$/u);
    assert.deepEqual(sample.identity, report.identities[0].nativeIdentity);
    assert.ok(BigInt(sample.managedPeakBytes) > 0n);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("failed benchmark retains the common recipe and available environment", async () => {
  const root = await mkdtemp(join(nativeTemporaryRoot, "benchmark-failure-")),
    output = join(root, "failed.json");
  try {
    const child = benchmark([
      "--workload",
      "check",
      "--files",
      "1",
      "--records",
      "3",
      "--repetitions",
      "1",
      "--baseline",
      join(root, "missing"),
      "--output",
      output,
    ]);
    assert.notEqual(child.status, 0);
    const report = JSON.parse(await readFile(output, "utf8"));
    assert.equal(report.status, "failed");
    assert.equal(report.workload.nonJsonRecords, 3);
    assert.equal(report.workload.warmups, 1);
    assert.match(report.workload.fixtureSha256, /^[a-f0-9]{64}$/u);
    assert.equal(report.environment.node, process.version);
    assert.ok(Array.isArray(report.identities));
    assert.ok(Array.isArray(report.samples));
    assert.ok(report.error.includes("missing"));
    const overCapacity = benchmark(["--files", "50000"]);
    assert.notEqual(overCapacity.status, 0);
    assert.match(overCapacity.stderr, /49999 JSON documents plus one policy/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
