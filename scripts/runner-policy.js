// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import nodeSupport from "../assets/node-support.json" with { type: "json" };

export const ubuntuRunnerPattern = /^ubuntu-(\d[02468])\.04$/u;
export const windowsRunnerPattern = /^windows-20(\d{2})(?:-vs20\d{2})?$/u;

function selectRunner(policy, family, pattern) {
  const runners = policy.platforms.filter((platform) =>
    platform.startsWith(`${family}-`),
  );
  assert.equal(
    runners.length,
    1,
    `Expected one ${family} qualification runner`,
  );
  assert.match(runners[0], pattern, `Unsupported ${family} runner label`);
  return runners[0];
}

export const ubuntuRunner = (policy = nodeSupport) =>
  selectRunner(policy, "ubuntu", ubuntuRunnerPattern);
export const windowsRunner = (policy = nodeSupport) =>
  selectRunner(policy, "windows", windowsRunnerPattern);

/** Validate the native runner identity against the producer's expected lane. */
export function verifyMatrixRunner(job, expected, required) {
  if (!expected || job.conclusion === "skipped") return;
  if (!required && job.labels === undefined) return;
  assert.deepEqual(
    job.labels?.filter((label) => /^(?:ubuntu|windows)-/u.test(label)),
    [expected],
    `Native runner labels differ from ${expected}`,
  );
}
