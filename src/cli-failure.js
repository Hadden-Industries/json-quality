// SPDX-License-Identifier: AGPL-3.0-only
// Failure delivery has independent caller-owned quotas and never retries a sink.
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createExecutionDeadline } from "./execution-deadline.js";
import { resolveExecutionResources } from "./execution-resources.js";
import { encodeNativeControl } from "./native-control.js";
import { renderHumanEvent, humanDisplayControls } from "./cli-messages.js";
import { assertJsonQualityEvent } from "./events.js";
import cohort from "../schemas/contract-cohort.json" with { type: "json" };

const failedSinks = new WeakSet();

/** Keep the deadline outside Windows' synchronous inherited pipe writes. */
function deliver(
  /** @type {Buffer} */ bytes,
  /** @type {*} */ target,
  /** @type {AbortSignal} */ signal,
) {
  return new Promise((done, reject) => {
    signal.throwIfAborted();
    const child = spawn(
      process.execPath,
      [
        fileURLToPath(new URL("./cli-failure-worker.js", import.meta.url)),
        target === process.stderr ? "stderr" : "stdout",
      ],
      {
        stdio: ["pipe", "inherit", "inherit", "ipc"],
        windowsHide: true,
        env: Object.fromEntries(
          ["SystemRoot", "SYSTEMROOT", "WINDIR", "TEMP", "TMP"]
            .filter((name) => process.env[name])
            .map((name) => [name, process.env[name]]),
        ),
      },
    );
    const input = child.stdin;
    if (!input) {
      child.kill();
      reject(new Error("Failure writer has no input pipe."));
      return;
    }
    let delivered = false,
      /** @type {*} */ failure;
    const cancel = () => {
      failure ??= signal.reason;
      child.kill();
    };
    signal.addEventListener("abort", cancel, { once: true });
    child.on("error", (error) => {
      failure ??= error;
    });
    input.on("error", (error) => {
      failure ??= error;
    });
    child.on("message", (/** @type {*} */ message) => {
      if (message?.delivered === true) delivered = true;
    });
    child.on("close", (code) => {
      signal.removeEventListener("abort", cancel);
      if (failure) reject(failure);
      else if (code === 0 && delivered) done(undefined);
      else reject(new Error("Failure output was not completely delivered."));
    });
    input.end(bytes);
    if (signal.aborted) cancel();
  });
}

/** Default refusal remains finite; explicit null removes the package ceiling.
 * This allowance starts after the failed operation, not inside its spent budget.
 * @returns {Promise<bigint>} Number of completely delivered bytes; zero on refusal.
 */
export async function writeCliFailure(
  /** @type {*} */ error,
  /** @type {{requestId: string, machine?: boolean, resources?: any, usedOutputBytes?: bigint, code?: string, signal?: AbortSignal}} */ {
    requestId,
    machine = false,
    resources = resolveExecutionResources(),
    usedOutputBytes = 0n,
    code,
    signal,
  },
) {
  const target = machine ? process.stdout : process.stderr;
  if (failedSinks.has(target) || target.destroyed || signal?.aborted) return 0n;
  const deadline = createExecutionDeadline(resources.runtime.maxCheckTimeMs, [
    signal,
  ]);
  try {
    const maximum = resources.admission.maxToolOutputBytes;
    const remaining =
      maximum === null ? null : BigInt(maximum) - usedOutputBytes;
    if (remaining !== null && remaining <= 0n) return 0n;
    const message =
      String(error instanceof Error ? error.message : error) ||
      "Operation failed.";
    if (remaining !== null && BigInt(Buffer.byteLength(message)) > remaining)
      return 0n;
    const event = assertJsonQualityEvent({
      schemaVersion: cohort.eventSchemaVersion,
      requestId:
        typeof requestId === "string" && requestId && requestId.isWellFormed()
          ? requestId
          : randomUUID(),
      type: "failure",
      code:
        code ??
        (typeof error?.code === "string"
          ? error.code.slice(0, 256)
          : "operation-failed"),
      message,
      truncated: false,
    });
    const bytes = machine
      ? Buffer.concat([
          encodeNativeControl(
            event,
            remaining === null ? null : Number(remaining),
          ),
          Buffer.from("\n"),
        ])
      : Buffer.from(renderHumanEvent(event, humanDisplayControls(resources)));
    if (remaining !== null && BigInt(bytes.length) > remaining) return 0n;
    try {
      await deliver(bytes, target, deadline.signal);
    } catch {
      failedSinks.add(target);
      return 0n;
    }
    return BigInt(bytes.length);
  } catch {
    // Invalid data, exhausted quotas or a failed output cannot become success.
    return 0n;
  } finally {
    deadline.dispose();
  }
}
