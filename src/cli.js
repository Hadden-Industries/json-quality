#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Backpressured event delivery. Imports never start a command or exit a process.
import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { isMainModule } from "./module-entry.js";
import {
  openJsonSourceSession,
  openJsonRepositorySession,
} from "./sessions.js";
import {
  CLI_OPTIONS,
  COMMANDS,
  commandHelp,
  resourceCliControls,
  transformCliControls,
} from "./commands.js";
import { encodeNativeControl } from "./native-control.js";
import { createExecutionDeadline } from "./execution-deadline.js";
import { resolveExecutionResources } from "./execution-resources.js";
import { assertJsonQualityEvent } from "./events.js";
import { sourceContract } from "./source-contract.js";
import cohort from "../schemas/contract-cohort.json" with { type: "json" };

function textView(/** @type {*} */ event) {
  if (event.type === "nfc-key-collision-risk")
    return (
      (event.path ?? "<stdin>") +
      ":" +
      event.line +
      ":" +
      event.column +
      " NFC key collision risk with " +
      event.priorLine +
      ":" +
      event.priorColumn +
      "; decoded keys remain preserved.\n"
    );
  if (event.type === "finding")
    return (
      (event.path ?? "<stdin>") +
      ":" +
      event.line +
      ":" +
      event.column +
      " " +
      (event.ruleId ?? event.phase) +
      "/" +
      event.messageId +
      "\n"
    );
  if (event.type === "written") return "Written " + event.path + "\n";
  if (event.type === "write-failure")
    return (
      "Incomplete replacement; confirmed writes " +
      event.writtenPathCount +
      (event.uncertainPath ? ", uncertain path " + event.uncertainPath : "") +
      ": " +
      event.message +
      "\n"
    );
  if (event.type === "failure") return event.code + ": " + event.message + "\n";
  if (event.type === "write-terminal")
    return (
      "Replacement complete; written " +
      event.writtenPathCount +
      "; shared quality " +
      (event.qualityPassed ? "passed" : "has findings") +
      "; remaining findings " +
      event.findingCount +
      "\n"
    );
  if (event.type === "normalization-preview-terminal")
    return (
      (event.complete
        ? event.preflightComplete
          ? "Normalization preview complete"
          : "Normalization preview refused"
        : "Normalization preview incomplete") +
      (event.changedPathCount === undefined
        ? ""
        : "; changed paths " + event.changedPathCount) +
      (event.findingCount === undefined
        ? ""
        : "; remaining findings " + event.findingCount) +
      (event.message === undefined ? "" : "; " + event.message) +
      "\n"
    );
  if (event.type === "execution-terminal" || event.type === "terminal")
    return (
      "Contract " +
      (event.contractSatisfied ? "satisfied" : "failed") +
      "; shared quality " +
      (event.qualityPassed ? "passed" : "has findings") +
      "\n"
    );
  return "";
}

/** Stream the selected operation, returning quality 1 or incomplete/error 2.
 * Human filtering is presentation only. The final operation terminal is held
 * until owned session cleanup succeeds; output failure never returns zero.
 */
export async function runJsonQualityCli(
  /** @type {string[]} */ args,
  /** @type {import("./api-types.js").CliContext | (() => import("./api-types.js").CliContext | Promise<import("./api-types.js").CliContext>)} */ context = {},
) {
  let machine = Array.isArray(args) && args.includes("--ndjson"),
    requestId = randomUUID(),
    /** @type {any} */ session,
    pendingTerminal,
    /** @type {any} */ outputFailure,
    outputBytes = 0n,
    /** @type {any} */ outputCeiling = null,
    /** @type {any} */ reportSignal,
    /** @type {any} */ reportDeadline,
    /** @type {number} */ exitCode;
  const began = performance.now(),
    caller = new AbortController(),
    interrupt = () => caller.abort(new Error("JSON Quality interrupted.")),
    onOutputError = (/** @type {*} */ error) => {
      outputFailure ??= error;
    },
    stop = () => {
      session?.cancel(reportSignal.reason);
      if (session && reportSignal.aborted) process.stdin.destroy();
    };
  process.stdout.on("error", onOutputError);
  process.stderr.on("error", onOutputError);
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);

  const write = async (
    /** @type {*} */ bytes,
    /** @type {*} */ target,
    /** @type {*} */ signal,
  ) => {
    signal?.throwIfAborted();
    if (outputFailure) throw outputFailure;
    await new Promise((done, reject) => {
      const abort = () => {
        reject(signal.reason);
        target.destroy();
      };
      signal?.addEventListener("abort", abort, { once: true });
      target.write(bytes, (/** @type {*} */ error) => {
        signal?.removeEventListener("abort", abort);
        if (error) reject(error);
        else done(undefined);
      });
    });
    if (outputFailure) throw outputFailure;
  };
  const emit = async (/** @type {*} */ event) => {
    assertJsonQualityEvent(event);
    const bytes = machine
      ? Buffer.concat([
          encodeNativeControl(
            event,
            outputCeiling === null ? null : Number(outputCeiling),
          ),
          Buffer.from("\n"),
        ])
      : Buffer.from(textView(event));
    if (!bytes.length) return;
    outputBytes += BigInt(bytes.length);
    if (outputCeiling !== null && outputBytes > BigInt(outputCeiling))
      throw new Error("cli-output-byte-capacity");
    await write(
      bytes,
      machine ? process.stdout : process.stderr,
      reportSignal ?? caller.signal,
    );
  };
  const failure = async (/** @type {*} */ error) => {
    const message = String(error.message ?? error);
    try {
      await emit({
        schemaVersion: cohort.eventSchemaVersion,
        requestId,
        type: "failure",
        code:
          typeof error.code === "string"
            ? error.code.slice(0, 256)
            : "operation-failed",
        message: message.slice(0, 2048),
        truncated: message.length > 2048,
      });
    } catch {
      /* Failed delivery is incomplete; do not retry the failed sink. */
    }
  };

  try {
    const parsed = parseArgs({
      args,
      allowPositionals: true,
      allowNegative: true,
      strict: true,
      options: CLI_OPTIONS,
    });
    const /** @type {Record<string, any>} */ values = parsed.values;
    const positionals = parsed.positionals;
    machine = values.ndjson;
    const [operation, ...files] = positionals;
    if ((!operation || Object.hasOwn(COMMANDS, operation)) && values.help) {
      if (machine)
        throw new TypeError("Help is human-readable; omit --ndjson.");
      await write(Buffer.from(commandHelp()), process.stdout, caller.signal);
      exitCode = 0;
    } else {
      if (!Object.hasOwn(COMMANDS, operation))
        throw new TypeError("Select check, check-source, format or normalize.");
      if (values["request-id"] !== undefined) {
        const selected = values["request-id"];
        if (!selected || !selected.isWellFormed())
          throw new TypeError("Expected a well-formed request ID.");
        requestId = selected;
      }
      if (
        (operation === "check" || operation === "check-source") &&
        files.length
      )
        throw new TypeError(
          "Read-only scope is complete; literal paths select explicit writes.",
        );
      if (operation === "normalize" && !files.length)
        throw new TypeError(
          "Normalization requires explicit physical source paths.",
        );
      if (values["dry-run"] === true && operation !== "normalize")
        throw new TypeError("--dry-run belongs to normalize.");
      if (operation !== "check-source" && values.contract !== undefined)
        throw new TypeError("--contract belongs to raw stdin source checking.");
      if (typeof context === "function") context = await context();
      if (
        !context ||
        typeof context !== "object" ||
        Array.isArray(context) ||
        Object.keys(context).some(
          (name) =>
            ![
              "root",
              "requiredOutputs",
              "nativeProviders",
              "logicalProviders",
            ].includes(name),
        )
      )
        throw new TypeError("Invalid trusted repository CLI context.");
      const controls = resourceCliControls(values);
      const transformControls = transformCliControls(values);
      if (
        ["check", "check-source"].includes(operation) &&
        transformControls !== undefined
      )
        throw new TypeError("Transform controls belong to format/normalize.");
      if (operation === "check-source") {
        if (values.root !== undefined || Object.keys(context).length)
          throw new TypeError(
            "Raw source checking cannot replace trusted repository obligations.",
          );
        const maximumRequest = resolveExecutionResources({}, controls).admission
          .maxRequestBytes;
        if (
          maximumRequest !== null &&
          Buffer.byteLength(values.contract ?? "") > maximumRequest
        )
          throw new Error("source-contract-capacity");
        const contract = sourceContract(
          values.contract === undefined ? {} : JSON.parse(values.contract),
        );
        session = await openJsonSourceSession({
          ...controls,
          signal: caller.signal,
        });
        reportDeadline = createExecutionDeadline(
          session.resources.runtime.maxCheckTimeMs,
          [caller.signal],
          { began },
        );
        reportSignal = reportDeadline.signal;
        outputCeiling = session.resources.admission.maxToolOutputBytes;
        reportSignal.addEventListener("abort", stop, { once: true });
        for await (const event of session.check(
          {
            async *open(/** @type {{signal: AbortSignal}} */ { signal }) {
              const abort = () => process.stdin.destroy();
              signal.addEventListener("abort", abort, { once: true });
              try {
                for await (const chunk of process.stdin) {
                  signal.throwIfAborted();
                  yield chunk;
                }
              } finally {
                signal.removeEventListener("abort", abort);
              }
            },
          },
          contract,
          { requestId, retainValues: false },
        )) {
          if (event.type === "terminal") pendingTerminal = event;
          else await emit(event);
        }
      } else {
        const root = resolve(context.root ?? values.root ?? process.cwd());
        if (
          context.root !== undefined &&
          values.root !== undefined &&
          resolve(values.root) !== root
        )
          throw new TypeError("The trusted repository adapter fixes the root.");
        session = await openJsonRepositorySession({
          ...context,
          root,
          ...controls,
          signal: caller.signal,
          requestId,
          retainValues: operation !== "check",
        });
        reportDeadline = createExecutionDeadline(
          session.resources.runtime.maxCheckTimeMs,
          [caller.signal],
          { began },
        );
        reportSignal = reportDeadline.signal;
        outputCeiling = session.resources.admission.maxToolOutputBytes;
        reportSignal.addEventListener("abort", stop, { once: true });
        for await (const event of session.check()) {
          if (event.type === "execution-terminal" && operation === "check")
            pendingTerminal = event;
          else await emit(event);
        }
        if (operation !== "check") {
          for await (const event of session.rewrite(operation, {
            files: files.length ? files : undefined,
            transformControls,
            dryRun: values["dry-run"],
          })) {
            if (
              event.type === "write-terminal" ||
              event.type === "write-failure" ||
              event.type === "normalization-preview-terminal"
            )
              pendingTerminal = event;
            else await emit(event);
          }
        }
      }
      if (!pendingTerminal)
        throw new Error("Missing complete operation delivery.");
      await session.close();
      session = undefined;
      await emit(pendingTerminal);
      exitCode =
        pendingTerminal.type === "normalization-preview-terminal"
          ? !pendingTerminal.complete
            ? 2
            : pendingTerminal.preflightComplete
              ? 0
              : 1
          : pendingTerminal.type === "write-failure"
            ? 2
            : pendingTerminal.type === "write-terminal" ||
                pendingTerminal.contractSatisfied
              ? 0
              : 1;
    }
  } catch (error) {
    exitCode = 2;
    await failure(error);
  } finally {
    reportSignal?.removeEventListener("abort", stop);
    try {
      await session?.close();
    } catch (error) {
      exitCode = 2;
      await failure(error);
    }
    reportDeadline?.dispose();
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
    process.stdout.removeListener("error", onOutputError);
    process.stderr.removeListener("error", onOutputError);
  }
  return outputFailure ? 2 : exitCode;
}
if (isMainModule(import.meta.url))
  process.exitCode = await runJsonQualityCli(process.argv.slice(2));
