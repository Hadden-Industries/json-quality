#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
import { randomUUID } from "node:crypto";
import { isMainModule } from "./module-entry.js";
import {
  RESOURCE_OPTIONS,
  RUNTIME_OPTIONS,
  resourceCliControls,
} from "./commands.js";
import { packageVersion, parseCliArguments } from "./cli-discovery.js";
import cohort from "../schemas/contract-cohort.json" with { type: "json" };

/** Stream cohort-4 NDJSON with backpressure and a final cleaned-up verdict.
 * Output failure, cancellation or missing execution-terminal returns 2. The
 * source-only scope is declared in execution events; no candidate code runs.
 */
export async function runJsonQualificationCli(/** @type {*} */ args) {
  let parsed;
  const usage =
    "Usage: json-quality-qualify-git --trusted-root PATH --candidate-root PATH --trusted-commit-id COMMIT --candidate-commit-id COMMIT\n";
  try {
    parsed = parseCliArguments(
      args,
      {
        ...RESOURCE_OPTIONS,
        ...RUNTIME_OPTIONS,
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
        "request-id": { type: "string" },
        "trusted-root": { type: "string" },
        "candidate-root": { type: "string" },
        "trusted-commit-id": { type: "string" },
        "candidate-commit-id": { type: "string" },
      },
      false,
    );
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
    try {
      process.stderr.write(
        String(error instanceof Error ? error.message : error) + "\n" + usage,
      );
    } catch {
      /* Failed discovery remains incomplete. */
    }
    return 2;
  }
  const [
    { qualifyGitJsonSources },
    { encodeNativeControl },
    { assertJsonQualityEvent },
    { resolveExecutionResources },
    { createExecutionDeadline },
  ] = await Promise.all([
    import("./qualification.js"),
    import("./native-control.js"),
    import("./events.js"),
    import("./execution-resources.js"),
    import("./execution-deadline.js"),
  ]);
  const caller = new AbortController(),
    began = performance.now(),
    interrupt = () => caller.abort(new Error("Qualification interrupted.")),
    outputError = (/** @type {*} */ error) => caller.abort(error);
  let requestId = randomUUID(),
    signal = caller.signal,
    outputBytes = 0n,
    /** @type {any} */ maximumOutput = null,
    /** @type {any} */ deadline,
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
    if (
      process.env.JSON_QUALITY_TRUSTED_SHA !== undefined ||
      process.env.JSON_QUALITY_CANDIDATE_SHA !== undefined
    )
      throw new TypeError(
        "Use JSON_QUALITY_TRUSTED_COMMIT_ID and JSON_QUALITY_CANDIDATE_COMMIT_ID.",
      );
    const /** @type {Record<string, any>} */ values = parsed.values;
    requestId = values["request-id"] ?? requestId;
    const controls = resourceCliControls(values),
      resources = resolveExecutionResources({}, controls);
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
    if (!process.stdout.destroyed) {
      signal = AbortSignal.timeout(1000);
      const message = String(error instanceof Error ? error.message : error);
      try {
        await emit({
          schemaVersion: cohort.eventSchemaVersion,
          requestId,
          type: "failure",
          code: "qualification-failed",
          message: message.slice(0, 2048),
          truncated: message.length > 2048,
        });
      } catch {
        /* Failed delivery remains exit 2. */
      }
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
