// SPDX-License-Identifier: AGPL-3.0-only
// A lightweight image probe: no dependency installation or product tests.
import assert from "node:assert/strict";
import { writeFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { budgets } from "./qualification-process.js";
export const pythonVersion = readFileSync(
  new URL("../.python-version", import.meta.url),
  "utf8",
).trim();

// Adapter from the frozen workflow platform labels to GitHub image families.
// Build numbers and Windows tool-image variants remain execution provenance.
const platforms = {
  "ubuntu-24.04": { os: "Linux", image: /^ubuntu24$/u },
  "windows-2025": { os: "Windows", image: /^win25(?:-[a-zA-Z0-9]+)*$/u },
};
export function assertHostedPlatform(host, lane) {
  const platform = platforms[lane];
  assert.ok(platform, "Unsupported hosted platform");
  assert.equal(
    host?.os,
    platform.os,
    "Hosted OS differs from the qualified platform",
  );
  assert.equal(host.architecture, "X64", "Hosted architecture changed");
  assert.equal(host.python, pythonVersion, "Selected transport Python changed");
  assert.ok(
    typeof host.image === "string" &&
      host.image.length <= 80 &&
      platform.image.test(host.image),
    "Hosted image family differs from the qualified platform",
  );
  assert.ok(
    typeof host.imageVersion === "string" &&
      /^\d{8}\.\d+(?:\.\d+)?$/u.test(host.imageVersion),
    "Missing or invalid hosted image provenance",
  );
}
export function hostIdentity(environment = process.env) {
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
