#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { isMainModule } from "./module-entry.js";
import { qualifyGitJsonSources } from "./qualification.js";
import {
  RESOURCE_OPTIONS,
  RUNTIME_OPTIONS,
  resourceCliControls,
} from "./commands.js";
import { encodeNativeControl } from "./native-control.js";
import { assertJsonQualityEvent } from "./events.js";
import { resolveExecutionResources } from "./execution-resources.js";
import { createExecutionDeadline } from "./execution-deadline.js";
import cohort from "../schemas/contract-cohort.json" with { type: "json" };

/** Stream cohort-4 NDJSON with backpressure and a final cleaned-up verdict.
 * Output failure, cancellation or missing execution-terminal returns 2. The
 * source-only scope is declared in execution events; no candidate code runs.
 */
export async function runJsonQualificationCli(/** @type {*} */ args) {
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
    const parsed = parseArgs({
      args,
      allowNegative: true,
      options: {
        ...RESOURCE_OPTIONS,
        ...RUNTIME_OPTIONS,
        help: { type: "boolean", short: "h" },
        "request-id": { type: "string" },
        "trusted-root": { type: "string" },
        "candidate-root": { type: "string" },
        "trusted-commit-id": { type: "string" },
        "candidate-commit-id": { type: "string" },
      },
    });
    const /** @type {Record<string, any>} */ values = parsed.values;
    if (values.help) {
      await write(
        Buffer.from(
          "Usage: json-quality-qualify-git --trusted-root PATH --candidate-root PATH --trusted-commit-id COMMIT --candidate-commit-id COMMIT\n" +
            "Checks immutable Git JSON under the trusted commit policy; emits cohort-4 NDJSON.\n" +
            "No candidate scripts, installs, native/logical providers or domain validation.\n" +
            "Resource options: " +
            Object.keys({ ...RESOURCE_OPTIONS, ...RUNTIME_OPTIONS })
              .map((name) => "--" + name)
              .join(", ") +
            "\n" +
            "--no-capacity-limits and --no-runtime-controls disable their quotas; individual controls also accept null.\n",
        ),
      );
      return 0;
    }
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
