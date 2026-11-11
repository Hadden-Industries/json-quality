// SPDX-License-Identifier: AGPL-3.0-only
// A lightweight image probe: no dependency installation or product tests.
import assert from "node:assert/strict";
import { writeFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { budgets } from "./qualification-process.js";
import nodeSupport from "../assets/node-support.json" with { type: "json" };
import { ubuntuRunnerPattern } from "./runner-policy.js";
export const pythonVersion = readFileSync(
  new URL("../.python-version", import.meta.url),
  "utf8",
).trim();

// Adapter from the frozen workflow platform labels to GitHub image families.
// Build numbers and Windows tool-image variants remain execution provenance.
export function assertHostedPlatform(host, lane) {
  const ubuntu = ubuntuRunnerPattern.exec(lane);
  const windows = lane === "windows-2025";
  assert.ok(ubuntu || windows, "Unsupported hosted platform");
  assert.equal(
    host?.os,
    windows ? "Windows" : "Linux",
    "Hosted OS differs from the qualified platform",
  );
  assert.equal(host.architecture, "X64", "Hosted architecture changed");
  assert.equal(host.python, pythonVersion, "Selected transport Python changed");
  assert.ok(
    typeof host.image === "string" &&
      host.image.length <= 80 &&
      (windows
        ? /^win25(?:-[a-zA-Z0-9]+)*$/u.test(host.image)
        : host.image === `ubuntu${ubuntu[1]}`),
    "Hosted image family differs from the qualified platform",
  );
  assert.ok(
    typeof host.imageVersion === "string" &&
      /^\d{8}\.\d+(?:\.\d+)?$/u.test(host.imageVersion),
    "Missing or invalid hosted image provenance",
  );
}
export function hostIdentity(environment = process.env) {
  assert.ok(
    nodeSupport.platforms.includes(environment.CI_OS),
    "Runner lane is outside the current qualification policy",
  );
  const python = execFileSync(
    process.platform === "win32" ? "python" : "python3",
    ["--version"],
    { encoding: "utf8", windowsHide: true, timeout: budgets.read },
  )
    .trim()
    .replace(/^Python /u, "");
  const host = {
    os: environment.RUNNER_OS,
    architecture: environment.RUNNER_ARCH,
    image: environment.ImageOS,
    imageVersion: environment.ImageVersion,
    python,
  };
  assertHostedPlatform(host, environment.CI_OS);
  return host;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const record = {
    schemaVersion: 1,
    lane: process.env.CI_OS,
    repositoryId: Number(process.env.GITHUB_REPOSITORY_ID),
    runId: Number(process.env.GITHUB_RUN_ID),
    runAttempt: Number(process.env.GITHUB_RUN_ATTEMPT),
    commit: process.env.GITHUB_SHA,
    ...hostIdentity(),
  };
  writeFileSync(process.argv[2], JSON.stringify(record) + "\n", { flag: "wx" });
}
