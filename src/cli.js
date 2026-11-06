#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Discovery is lightweight; operational owners load only after command admission.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { isMainModule } from "./module-entry.js";
import { discoverCli, failureCliResources } from "./cli-discovery.js";
import { resourceCliControls, transformCliControls } from "./commands.js";
import {
  renderHumanEvent,
  escapeHumanText,
  humanDisplayControls,
} from "./cli-messages.js";

/** Backpressured CLI delivery; a terminal is never a substitute for cleanup. */
export async function runJsonQualityCli(
  /** @type {string[]} */ args,
  /** @type {import("./api-types.js").CliContext | (() => import("./api-types.js").CliContext | Promise<import("./api-types.js").CliContext>)} */ context = {},
) {
  let machine = args
      .slice(0, args.indexOf("--") < 0 ? args.length : args.indexOf("--"))
      .includes("--ndjson"),
    requestId = randomUUID(),
    /** @type {*} */ session,
    /** @type {*} */ outputFailure,
    /** @type {*} */ reportDeadline,
    /** @type {*} */ reportSignal,
    /** @type {*} */ outputCeiling = null,
    /** @type {*} */ failureResources,
    outputBytes = 0n,
    /** @type {*} */ operation,
    /** @type {*} */ values = {},
    /** @type {*} */ operationRoot,
    /** @type {*} */ operationPath,
    /** @type {*} */ pendingTerminal,
    /** @type {*} */ assertEvent,
    /** @type {*} */ encodeControl,
    exitCode = 2;
  const began = performance.now(),
    caller = new AbortController(),
    interrupt = () => caller.abort(new Error("JSON Quality interrupted.")),
    onOutputError = (/** @type {*} */ error) => {
      outputFailure ??= error;
      caller.abort(error);
    },
    stop = () => {
      caller.abort(
        reportSignal?.reason ?? new Error("JSON Quality interrupted."),
      );
      session?.cancel(caller.signal.reason);
      if (!process.stdin.destroyed) process.stdin.destroy();
    };
  process.stdout.on("error", onOutputError);
  process.stderr.on("error", onOutputError);
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  const stopInput = () => {
    session?.cancel(caller.signal.reason);
    if (!process.stdin.destroyed) process.stdin.destroy();
  };
  caller.signal.addEventListener("abort", stopInput, { once: true });

  const write = async (/** @type {*} */ bytes, /** @type {*} */ target) => {
    const signal = reportSignal ?? caller.signal;
    signal.throwIfAborted();
    if (outputFailure) throw outputFailure;
    await new Promise((done, reject) => {
      const abort = () => {
        reject(signal.reason);
        target.destroy();
      };
      signal.addEventListener("abort", abort, { once: true });
      target.write(bytes, (/** @type {*} */ error) => {
        signal.removeEventListener("abort", abort);
        if (error) reject(error);
        else done(undefined);
      });
    });
    if (outputFailure) throw outputFailure;
  };
  const account = (/** @type {*} */ bytes) => {
    outputBytes += BigInt(bytes.length);
    if (outputCeiling !== null && outputBytes > BigInt(outputCeiling))
      throw new Error("cli-output-byte-capacity");
    return bytes;
  };
  const ready = async (/** @type {*} */ owner) => {
    const resources = owner.resources;
    if (!resources) throw new Error("Missing operation resources.");
    failureResources = resources;
    if (!reportDeadline) {
      const { createExecutionDeadline, remainingDuration } =
        await import("./execution-deadline.js");
      const maximum = resources.runtime.maxCheckTimeMs;
      reportDeadline = createExecutionDeadline(
        remainingDuration(maximum === null ? null : Number(maximum), began),
        // Normal session closure revokes the owner's signal before delivery of
        // the held terminal. CLI delivery has its own deadline and cancellation.
        [caller.signal],
      );
      reportSignal = reportDeadline.signal;
      reportSignal.addEventListener("abort", stop, { once: true });
    }
    outputCeiling = resources.admission.maxToolOutputBytes;
  };
  const scopeEvent = (/** @type {*} */ event) => {
    if (event.operationScope) return event;
    if (operation === "check-source") {
      return {
        ...event,
        ...([
          "source",
          "value",
          "finding",
          "terminal",
          "nfc-key-collision-risk",
        ].includes(event.type) && operationPath !== undefined
          ? { path: operationPath }
          : {}),
        ...(["source", "terminal"].includes(event.type)
          ? {
              operationScope: {
                kind: "stdin",
                policy: "explicit-contract",
                completeRepositoryCheck: false,
              },
            }
          : {}),
      };
    }
    if (
      [
        "execution",
        "execution-terminal",
        "write-terminal",
        "write-failure",
        "format-preview-terminal",
        "normalization-preview-terminal",
      ].includes(event.type)
    )
      return {
        ...event,
        ...(["execution", "execution-terminal"].includes(event.type) &&
        operationRoot
          ? { root: operationRoot }
          : {}),
        operationScope: {
          kind: "repository",
          policy: "repository",
          completeRepositoryCheck: operation === "check",
        },
      };
    return event;
  };
  const emit = async (/** @type {*} */ original) => {
    if (original.resources) await ready({ resources: original.resources });
    const event = scopeEvent(original);
    assertEvent ??= (await import("./events.js")).assertJsonQualityEvent;
    assertEvent(event);
    let bytes;
    if (machine) {
      encodeControl ??= (await import("./native-control.js"))
        .encodeNativeControl;
      bytes = Buffer.concat([
        encodeControl(
          event,
          outputCeiling === null ? null : Number(outputCeiling),
        ),
        Buffer.from("\n"),
      ]);
    } else
      bytes = Buffer.from(
        renderHumanEvent(event, {
          quiet: values.quiet ?? false,
          level: values["diagnostic-display-level"] ?? "info",
          ...humanDisplayControls(failureResources),
        }),
      );
    if (bytes.length)
      await write(account(bytes), machine ? process.stdout : process.stderr);
  };
  const failure = async (/** @type {*} */ error) => {
    if (outputFailure || caller.signal.aborted) return;
    try {
      const { writeCliFailure } = await import("./cli-failure.js");
      if (!failureResources) {
        const { resolveExecutionResources } =
          await import("./execution-resources.js");
        failureResources = resolveExecutionResources();
        try {
          failureResources = resolveExecutionResources(
            {},
            failureCliResources(args),
          );
        } catch {
          /* Malformed controls cannot relax the default allowance. */
        }
      }
      outputBytes += await writeCliFailure(error, {
        requestId,
        machine,
        resources: failureResources,
        usedOutputBytes: outputBytes,
        signal: caller.signal,
      });
    } catch {
      // Delivery failure cannot become a successful result or a replayed sink.
    }
  };
  async function* input() {
    if (process.stdin.isTTY)
      throw new TypeError(
        "Stdin requires a pipe or redirected file; use COMMAND --help.",
      );
    for await (const chunk of process.stdin) {
      caller.signal.throwIfAborted();
      if (!(chunk instanceof Uint8Array))
        throw new TypeError("Stdin must supply raw UTF-8 bytes.");
      yield chunk;
    }
    caller.signal.throwIfAborted();
  }
  try {
    const parsed = discoverCli(args);
    ({ command: operation, values } = parsed);
    machine = values.ndjson ?? false;
    if (parsed.discovery !== undefined) {
      await write(
        Buffer.from(
          parsed.discovery.endsWith("\n")
            ? parsed.discovery
            : parsed.discovery + "\n",
        ),
        process.stdout,
      );
      return 0;
    }
    const files = parsed.positionals;
    if (values["request-id"] !== undefined) {
      requestId = values["request-id"];
      if (!requestId || !requestId.isWellFormed())
        throw new TypeError("Expected a well-formed request ID.");
    }
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
    if (
      (["check-files", "check-source"].includes(operation) || values.stdin) &&
      Object.keys(context).length
    )
      throw new TypeError(
        "Scoped or raw source checking cannot replace a trusted repository adapter's obligations.",
      );
    const controls = resourceCliControls(values),
      transformControls = transformCliControls(values);
    if (
      ["check", "check-files", "check-source"].includes(operation) &&
      transformControls !== undefined
    )
      throw new TypeError("Transform controls belong to format/normalize.");
    const { resolveExecutionResources } =
      await import("./execution-resources.js");
    const invocation = resolveExecutionResources({}, controls);
    failureResources = invocation;
    if (
      values.contract !== undefined &&
      invocation.admission.maxRequestBytes !== null &&
      Buffer.byteLength(values.contract) > invocation.admission.maxRequestBytes
    )
      throw new Error("source-contract-capacity");
    if (operation === "check-source") {
      if (process.stdin.isTTY)
        throw new TypeError("check-source requires piped or redirected stdin.");
      const { openJsonSourceSession } = await import("./sessions.js"),
        { stdinContract } = await import("./stdin-contract.js"),
        contract = stdinContract(
          values.contract === undefined ? {} : JSON.parse(values.contract),
          values["stdin-filepath"],
        );
      operationPath = contract.path;
      session = await openJsonSourceSession({
        ...controls,
        signal: caller.signal,
      });
      await ready(session);
      for await (const event of session.check(
        { open: () => input() },
        contract,
        { requestId, retainValues: false },
      )) {
        if (event.type === "terminal") pendingTerminal = event;
        else await emit(event);
      }
    } else if (values.stdin) {
      if (process.stdin.isTTY)
        throw new TypeError("Stdin requires a pipe or redirected file.");
      const { executeStdinOperation } = await import("./stdin-operation.js");
      const result = await executeStdinOperation(
        {
          operation,
          source: input(),
          path: values["stdin-filepath"],
          ...(operation === "check-files" || values.root !== undefined
            ? { root: resolve(values.root ?? process.cwd()) }
            : {}),
          contract:
            values.contract === undefined ? {} : JSON.parse(values.contract),
          ...controls,
          transformControls,
          signal: caller.signal,
          requestId,
        },
        { emit, ready },
      );
      if (result.terminal) {
        await emit(result.terminal);
        exitCode = result.terminal.contractSatisfied ? 0 : 1;
      } else if (result.refused) {
        await write(
          account(Buffer.from(escapeHumanText(result.message, null) + "\n")),
          process.stderr,
        );
        exitCode = 1;
      } else {
        await write(account(result.output), process.stdout);
        if (!values.quiet)
          await write(
            account(
              Buffer.from(
                "Stdin " +
                  operation +
                  " completed; remaining quality findings " +
                  result.findingCount +
                  "; repository-wide obligations were not assessed.\n",
              ),
            ),
            process.stderr,
          );
        exitCode = 0;
      }
    } else if (operation === "check-files") {
      const { checkJsonFiles } = await import("./selected-check.js");
      for await (const event of checkJsonFiles({
        root: resolve(values.root ?? process.cwd()),
        files,
        ...controls,
        signal: caller.signal,
        requestId,
      })) {
        if (event.type === "selection-terminal") pendingTerminal = event;
        else await emit(event);
      }
    } else {
      const { openJsonRepositorySession } = await import("./sessions.js");
      operationRoot = resolve(context.root ?? values.root ?? process.cwd());
      if (
        context.root !== undefined &&
        values.root !== undefined &&
        resolve(values.root) !== operationRoot
      )
        throw new TypeError("The trusted repository adapter fixes the root.");
      session = await openJsonRepositorySession({
        ...context,
        root: operationRoot,
        ...controls,
        signal: caller.signal,
        requestId,
        retainValues: operation !== "check",
      });
      await ready(session);
      for await (const event of session.check()) {
        if (event.type === "execution-terminal" && operation === "check")
          pendingTerminal = event;
        else await emit(event);
      }
      if (operation !== "check")
        for await (const event of session.rewrite(operation, {
          files: files.length ? files : undefined,
          transformControls,
          dryRun: values["dry-run"],
        })) {
          if (
            [
              "write-terminal",
              "write-failure",
              "normalization-preview-terminal",
              "format-preview-terminal",
            ].includes(event.type)
          )
            pendingTerminal = event;
          else await emit(event);
        }
    }
    if (pendingTerminal) {
      await session?.close();
      session = undefined;
      await emit(pendingTerminal);
      if (pendingTerminal.type === "write-failure") {
        const { isRewriteQualityRefusal } = await import("./events.js");
        exitCode = isRewriteQualityRefusal(pendingTerminal.message) ? 1 : 2;
      } else
        exitCode = [
          "normalization-preview-terminal",
          "format-preview-terminal",
        ].includes(pendingTerminal.type)
          ? !pendingTerminal.complete
            ? 2
            : pendingTerminal.preflightComplete
              ? 0
              : 1
          : pendingTerminal.type === "write-terminal" ||
              pendingTerminal.contractSatisfied
            ? 0
            : 1;
    } else if (!values.stdin)
      throw new Error("Missing complete operation delivery.");
  } catch (error) {
    exitCode = 2;
    await failure(error);
  } finally {
    try {
      await session?.close();
    } catch (error) {
      exitCode = 2;
      await failure(error);
    }
    reportSignal?.removeEventListener("abort", stop);
    reportDeadline?.dispose();
    caller.signal.removeEventListener("abort", stopInput);
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
    process.stdout.removeListener("error", onOutputError);
    process.stderr.removeListener("error", onOutputError);
  }
  return outputFailure ? 2 : exitCode;
}
if (isMainModule(import.meta.url))
  process.exitCode = await runJsonQualityCli(process.argv.slice(2));
