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
export function hostIdentity(environment = process.env) {
  const python = execFileSync(
    process.platform === "win32" ? "python" : "python3",
    ["--version"],
    { encoding: "utf8", windowsHide: true, timeout: budgets.read },
  )
    .trim()
    .replace(/^Python /u, "");
  assert.equal(
    python,
    pythonVersion,
    "Transport Python differs from the frozen producer policy",
  );
  const host = {
    os: environment.RUNNER_OS,
    architecture: environment.RUNNER_ARCH,
    image: environment.ImageOS,
    imageVersion: environment.ImageVersion,
    python,
  };
  assert.ok(
    ["Windows", "Linux"].includes(host.os) && host.architecture === "X64",
  );
  assert.match(host.image, /^[a-zA-Z0-9-]{1,80}$/u);
  assert.match(host.imageVersion, /^\d{8}\.\d+(?:\.\d+)?$/u);
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
