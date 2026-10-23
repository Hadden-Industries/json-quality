#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { qualifyJsonConsumer } from "./qualification.js";
import {
  RESOURCE_OPTIONS,
  RUNTIME_OPTIONS,
  resourceCliControls,
} from "./commands.js";
import { encodeNativeControl } from "./native-control.js";
import { assertJsonQualityEvent } from "./events.js";
import { resolveExecutionResources } from "./execution-resources.js";
import cohort from "../schemas/contract-cohort.json" with { type: "json" };

/** Stream cohort-2 NDJSON with backpressure and a final cleaned-up verdict.
 * Output failure, cancellation or missing execution-terminal returns 2. The
 * source-only scope is declared in execution events; no candidate code runs.
 */
export async function runJsonQualificationCli(args) {
  const caller = new AbortController(),
    began = performance.now(),
    interrupt = () => caller.abort(new Error("Qualification interrupted.")),
    outputError = (error) => caller.abort(error);
  let requestId = randomUUID(),
    signal = caller.signal,
    outputBytes = 0n,
    maximumOutput = null,
    exitCode = 2,
    terminal;
  process.stdout.on("error", outputError);
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  const write = async (bytes) => {
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
          else done();
        });
      });
    },
    emit = async (event) => {
      assertJsonQualityEvent(event);
      const bytes = Buffer.concat([
        encodeNativeControl(event, 2097152),
        Buffer.from("\n"),
      ]);
      outputBytes += BigInt(bytes.length);
      if (maximumOutput !== null && outputBytes > BigInt(maximumOutput))
        throw new Error("cli-output-byte-capacity");
      await write(bytes);
    };
  try {
    const { values } = parseArgs({
      args,
      allowNegative: true,
      options: {
        ...RESOURCE_OPTIONS,
        ...RUNTIME_OPTIONS,
        help: { type: "boolean", short: "h" },
        "request-id": { type: "string" },
        "trusted-root": { type: "string" },
        "candidate-root": { type: "string" },
        "trusted-sha": { type: "string" },
        "candidate-sha": { type: "string" },
      },
    });
    if (values.help) {
      await write(
        Buffer.from(
          "Usage: json-quality-qualify --trusted-root PATH --candidate-root PATH --trusted-sha SHA --candidate-sha SHA\n" +
            "Checks immutable Git JSON under the trusted commit policy; emits cohort-2 NDJSON.\n" +
            "No candidate scripts, installs, native/logical providers or domain validation.\n" +
            "Resource options: " +
            Object.keys({ ...RESOURCE_OPTIONS, ...RUNTIME_OPTIONS })
              .map((name) => "--" + name)
              .join(", ") +
            "\n" +
            "--no-capacity-limits bypasses admission only; finite runtime controls remain active.\n",
        ),
      );
      return 0;
    }
    requestId = values["request-id"] ?? requestId;
    const controls = resourceCliControls(values),
      resources = resolveExecutionResources({}, controls);
    maximumOutput = resources.wire.admission.maxToolOutputBytes;
    signal = AbortSignal.any([
      caller.signal,
      AbortSignal.timeout(resources.runtime.maxCheckTimeMs),
    ]);
    for await (const event of qualifyJsonConsumer({
      ...controls,
      signal,
      requestId,
      trustedRoot:
        values["trusted-root"] ?? process.env.JSON_QUALITY_TRUSTED_ROOT,
      candidateRoot:
        values["candidate-root"] ?? process.env.JSON_QUALITY_CANDIDATE_ROOT,
      trustedSha: values["trusted-sha"] ?? process.env.JSON_QUALITY_TRUSTED_SHA,
      candidateSha:
        values["candidate-sha"] ?? process.env.JSON_QUALITY_CANDIDATE_SHA,
    })) {
      if (event.type === "execution") {
        maximumOutput = event.resources.admission.maxToolOutputBytes;
        const remaining =
          Number(event.resources.runtime.maxCheckTimeMs) -
          Math.floor(performance.now() - began);
        if (remaining < 1) throw new Error("execution-time-capacity");
        signal = AbortSignal.any([
          caller.signal,
          AbortSignal.timeout(remaining),
        ]);
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
      const message = String(error.message ?? error);
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
    process.stdout.removeListener("error", outputError);
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
  }
  return exitCode;
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
)
  process.exitCode = await runJsonQualificationCli(process.argv.slice(2));
