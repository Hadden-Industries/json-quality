// SPDX-License-Identifier: AGPL-3.0-only
/** Finite development/release command policy, separate from product performance. */
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isAbsolute } from "node:path";
import {
  resourceDefaults,
  resolveResourceProfile,
} from "../src/resource-profile.js";
import { resolveExecutionResources } from "../src/execution-resources.js";
export { budgets } from "./qualification-budgets.js";
import { budgets } from "./qualification-budgets.js";

export function acquisitionResources(
  selected = JSON.parse(process.env.JSON_QUALITY_ACQUISITION_CONTROLS ?? "{}"),
) {
  return resolveResourceProfile(
    resourceDefaults("acquisitionControls"),
    undefined,
    selected,
  );
}

export function native(
  executable,
  args,
  { phase = "native", timeout = budgets.read, ...options } = {},
) {
  if (timeout !== Infinity && (!Number.isSafeInteger(timeout) || timeout <= 0))
    throw new Error("Invalid command deadline");
  const start = performance.now();
  process.stderr.write(
    JSON.stringify({
      phase,
      state: "started",
      timeoutMs: Number.isFinite(timeout) ? timeout : 0,
      executable,
      node: process.versions.node,
      run: process.env.GITHUB_RUN_ID ?? null,
      attempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
      source: process.env.GITHUB_SHA ?? null,
      runner: process.env.RUNNER_OS ?? process.platform,
      architecture: process.arch,
    }) + "\n",
  );
  const result = spawnSync(executable, args, {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer:
      resolveExecutionResources().admission.maxToolOutputBytes ?? Infinity,
    ...options,
    timeout: Number.isFinite(timeout) ? timeout : 0,
    shell: false,
  });
  const facts = {
    phase,
    state: result.error || result.status !== 0 ? "failed" : "passed",
    elapsedMs: Math.round(performance.now() - start),
    exit: result.status,
    signal: result.signal,
    timeout: result.error?.code === "ETIMEDOUT",
    completedNpmTimings: [
      ...String(result.stderr ?? "").matchAll(
        /^npm timing ([^\r\n]{1,160}) Completed in (\d{1,12})ms\r?$/gmu,
      ),
    ]
      .map((m) => ({ phase: m[1], elapsedMs: Number(m[2]) }))
      .sort((a, b) => b.elapsedMs - a.elapsedMs)
      .slice(0, 64),
  };
  process.stderr.write(JSON.stringify(facts) + "\n");
  if (facts.state === "failed") {
    const error = new Error(`Native phase ${phase} failed`, {
      cause: result.error,
    });
    Object.assign(error, {
      stdout: result.stdout,
      stderr: result.stderr,
      facts,
    });
    // JSON encoding prevents service output from becoming workflow commands.
    process.stderr.write(
      JSON.stringify({
        phase,
        stdout: String(result.stdout ?? "").slice(-8192),
        stderr: String(result.stderr ?? "").slice(-8192),
      }) + "\n",
    );
    throw error;
  }
  return result.stdout;
}

/** Retain the producer as one pair while consumer lanes select their own npm. */
export function producerToolchain(
  environment = process.env,
  defaultNpm = environment.npm_execpath,
) {
  const executable = environment.JSON_QUALITY_PRODUCER_NODE;
  const cli = environment.JSON_QUALITY_PRODUCER_NPM;
  if (executable !== undefined || cli !== undefined) {
    if (
      typeof executable !== "string" ||
      typeof cli !== "string" ||
      !isAbsolute(executable) ||
      !isAbsolute(cli) ||
      /[\r\n]/u.test(executable + cli)
    )
      throw new Error(
        "Producer Node and npm must be a complete absolute pair.",
      );
    return { executable, cli };
  }
  if (!defaultNpm)
    throw new Error(
      "Run through npm or provide the qualified producer npm CLI",
    );
  return { executable: process.execPath, cli: defaultNpm };
}

export const npmCli = () => producerToolchain().cli;

export function npmCommand(args, options = {}) {
  const { executable, cli } = producerToolchain();
  return native(executable, [cli, ...args], {
    timeout: acquisitionResources().maxAcquisitionTimeMs ?? Infinity,
    ...options,
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const policy = JSON.parse(
    readFileSync(new URL("../assets/node-support.json", import.meta.url)),
  );
  const operation = process.argv[2];
  if (operation === "producer-npm")
    npmCommand(
      [
        "install",
        "--global",
        `npm@${policy.producerNpm.version}`,
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
      ],
      { phase: "producer-npm-setup", stdio: "inherit" },
    );
  else if (operation === "install")
    npmCommand(["ci", "--ignore-scripts", "--no-audit", "--no-fund"], {
      phase: "producer-install",
      stdio: "inherit",
    });
  else if (operation === "consumer-npm")
    npmCommand(
      [
        "install",
        "--prefix",
        process.argv[3],
        `npm@${policy.consumerNpm}`,
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
      ],
      { phase: "consumer-npm-setup", stdio: "inherit" },
    );
  else throw new Error("Unknown bounded setup operation");
}
