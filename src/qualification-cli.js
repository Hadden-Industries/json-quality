#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
import { randomUUID } from "node:crypto";
import { isMainModule } from "./module-entry.js";
import {
  RESOURCE_OPTIONS,
  RUNTIME_OPTIONS,
  resourceCliControls,
} from "./commands.js";
import {
  packageVersion,
  parseCliArguments,
  failureCliResources,
} from "./cli-discovery.js";
import { resolveExecutionResources } from "./execution-resources.js";
import { createExecutionDeadline } from "./execution-deadline.js";

const qualificationOptions = {
  ...RESOURCE_OPTIONS,
  ...RUNTIME_OPTIONS,
  help: { type: "boolean", short: "h" },
  version: { type: "boolean", short: "v" },
  "request-id": { type: "string" },
  "trusted-root": { type: "string" },
  "candidate-root": { type: "string" },
  "trusted-commit-id": { type: "string" },
  "candidate-commit-id": { type: "string" },
};

/** Stream cohort-4 NDJSON with backpressure and a final cleaned-up verdict.
 * Output failure, cancellation or missing execution-terminal returns 2. The
 * source-only scope is declared in execution events; no candidate code runs.
 */
export async function runJsonQualificationCli(/** @type {*} */ args) {
  let parsed;
  const usage =
    "Usage: json-quality-qualify-git --trusted-root PATH --candidate-root PATH --trusted-commit-id COMMIT --candidate-commit-id COMMIT\n";
  try {
    parsed = parseCliArguments(args, qualificationOptions, false);
    const /** @type {Record<string, any>} */ values = parsed.values;
    if (
      values.version &&
      (values.help ||
        parsed.tokens.some(
          (token) => token.kind === "option" && token.name !== "version",
        ))
    )
      throw new TypeError(
        "--version accepts no other options; use json-quality-qualify-git --version.",
      );
    const environmentKeys = [
      "JSON_QUALITY_TRUSTED_ROOT",
      "JSON_QUALITY_CANDIDATE_ROOT",
      "JSON_QUALITY_TRUSTED_COMMIT_ID",
      "JSON_QUALITY_CANDIDATE_COMMIT_ID",
      "JSON_QUALITY_TRUSTED_SHA",
      "JSON_QUALITY_CANDIDATE_SHA",
    ];
    if (
      values.help ||
      values.version ||
      (!args.length &&
        !environmentKeys.some((name) => process.env[name] !== undefined))
    ) {
      const text = values.version
        ? packageVersion()
        : usage +
          "Checks immutable Git JSON under trusted commit policy; emits versioned NDJSON.\n" +
          "No candidate scripts, installs, native/logical providers or domain validation.\n" +
          "Discovery: --help (-h), --version (-v). --request-id ID identifies events.\n" +
          "Roots and commit IDs may instead be supplied by JSON_QUALITY_TRUSTED_ROOT, JSON_QUALITY_CANDIDATE_ROOT, JSON_QUALITY_TRUSTED_COMMIT_ID and JSON_QUALITY_CANDIDATE_COMMIT_ID.\n" +
          "Resource options: " +
          Object.keys({ ...RESOURCE_OPTIONS, ...RUNTIME_OPTIONS })
            .map((name) => "--" + name)
            .join(", ") +
          "\n" +
          "--no-capacity-limits and --no-runtime-controls disable quotas; individual controls accept N|null.\n";
      await new Promise((done, reject) => {
        const failed = (/** @type {*} */ error) => reject(error);
        process.stdout.once("error", failed);
        process.stdout.write(text, (error) => {
          process.stdout.removeListener("error", failed);
          if (error) reject(error);
          else done(undefined);
        });
      });
      return 0;
    }
  } catch (error) {
    const [{ resolveExecutionResources }, { writeCliFailure }] =
      await Promise.all([
        import("./execution-resources.js"),
        import("./cli-failure.js"),
      ]);
    let resources = resolveExecutionResources();
    try {
      resources = resolveExecutionResources(
        {},
        failureCliResources(args, qualificationOptions),
      );
    } catch {
      /* Malformed controls cannot relax the default allowance. */
    }
    await writeCliFailure(
      new Error(
        String(error instanceof Error ? error.message : error) + "\n" + usage,
      ),
      { requestId: randomUUID(), resources },
    );
    return 2;
  }
  let /** @type {*} */ qualifyGitJsonSources,
    /** @type {*} */ encodeNativeControl,
    /** @type {*} */ assertJsonQualityEvent;
  const caller = new AbortController(),
    failureCaller = new AbortController(),
    began = performance.now(),
    interrupt = () => {
      const error = new Error("Qualification interrupted.");
      caller.abort(error);
      failureCaller.abort(error);
    },
    outputError = (/** @type {*} */ error) => {
      outputFailed = true;
      caller.abort(error);
    };
  let requestId = randomUUID(),
    signal = caller.signal,
    outputBytes = 0n,
    /** @type {any} */ maximumOutput = null,
    /** @type {any} */ deadline,
    /** @type {any} */ failureResources = resolveExecutionResources(),
    outputFailed = false,
    exitCode = 2,
    terminal;
  process.stdout.on("error", outputError);
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  const write = async (/** @type {*} */ bytes) => {
      signal.throwIfAborted();
      await new Promise((done, reject) => {
        const abort = () => {
          reject(signal.reason);
          process.stdout.destroy();
        };
        signal.addEventListener("abort", abort, { once: true });
        process.stdout.write(bytes, (error) => {
          signal.removeEventListener("abort", abort);
          if (error) reject(error);
          else done(undefined);
        });
      });
    },
    emit = async (/** @type {*} */ event) => {
      if (event.type === "execution" || event.type === "execution-terminal")
        event = {
          ...event,
          operationScope: {
            kind: "immutable-git-json",
            policy: "trusted-git",
            completeRepositoryCheck: false,
          },
        };
      assertJsonQualityEvent(event);
      const bytes = Buffer.concat([
        encodeNativeControl(
          event,
          maximumOutput === null ? null : Number(maximumOutput),
        ),
        Buffer.from("\n"),
      ]);
      outputBytes += BigInt(bytes.length);
      if (maximumOutput !== null && outputBytes > BigInt(maximumOutput))
        throw new Error("cli-output-byte-capacity");
      await write(bytes);
    };
  try {
    const /** @type {Record<string, any>} */ values = parsed.values;
    const controls = resourceCliControls(values),
      resources = resolveExecutionResources({}, controls);
    failureResources = resources;
    [
      { qualifyGitJsonSources },
      { encodeNativeControl },
      { assertJsonQualityEvent },
    ] = await Promise.all([
      import("./qualification.js"),
      import("./native-control.js"),
      import("./events.js"),
    ]);
    if (
      process.env.JSON_QUALITY_TRUSTED_SHA !== undefined ||
      process.env.JSON_QUALITY_CANDIDATE_SHA !== undefined
    )
      throw new TypeError(
        "Use JSON_QUALITY_TRUSTED_COMMIT_ID and JSON_QUALITY_CANDIDATE_COMMIT_ID.",
      );
    requestId = values["request-id"] ?? requestId;
    maximumOutput = resources.wire.admission.maxToolOutputBytes;
    deadline = createExecutionDeadline(
      resources.runtime.maxCheckTimeMs,
      [caller.signal],
      { began },
    );
    signal = deadline.signal;
    for await (const event of qualifyGitJsonSources({
      ...controls,
      signal,
      requestId,
      trustedRoot:
        values["trusted-root"] ?? process.env.JSON_QUALITY_TRUSTED_ROOT,
      candidateRoot:
        values["candidate-root"] ?? process.env.JSON_QUALITY_CANDIDATE_ROOT,
      trustedCommitId:
        values["trusted-commit-id"] ??
        process.env.JSON_QUALITY_TRUSTED_COMMIT_ID,
      candidateCommitId:
        values["candidate-commit-id"] ??
        process.env.JSON_QUALITY_CANDIDATE_COMMIT_ID,
    })) {
      if (event.type === "execution") {
        if (!event.resources) throw new Error("execution-resources-missing");
        maximumOutput = event.resources.admission.maxToolOutputBytes;
        failureResources = event.resources;
        deadline.dispose();
        deadline = createExecutionDeadline(
          event.resources.runtime.maxCheckTimeMs,
          [caller.signal],
          { began },
        );
        signal = deadline.signal;
      }
      if (event.type === "execution-terminal") terminal = event;
      await emit(event);
    }
    if (terminal) exitCode = terminal.contractSatisfied ? 0 : 1;
  } catch (error) {
    caller.abort(error);
    // A failed/aborted sink is already incomplete. Never retry it or block cleanup.
    if (!outputFailed && !process.stdout.destroyed) {
      const { writeCliFailure } = await import("./cli-failure.js");
      outputBytes += await writeCliFailure(error, {
        requestId,
        machine: true,
        code: "qualification-failed",
        resources: failureResources,
        usedOutputBytes: outputBytes,
        signal: failureCaller.signal,
      });
    }
    exitCode = 2;
  } finally {
    deadline?.dispose();
    process.stdout.removeListener("error", outputError);
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
  }
  return exitCode;
}

if (isMainModule(import.meta.url))
  process.exitCode = await runJsonQualificationCli(process.argv.slice(2));
