// SPDX-License-Identifier: AGPL-3.0-only
// One owned native-tool process, bounded diagnostics and cooperative cancellation.
import { spawn } from "node:child_process";
import { createExecutionDeadline } from "./execution-deadline.js";

export async function runBoundedTool(
  /** @type {*} */ executable,
  /** @type {*} */ args,
  /** @type {*} */ {
    input,
    signal,
    timeout,
    maximumOutputBytes,
    acceptedExitCodes = [0],
    cwd,
    captureOutput = false,
    env,
  },
) {
  signal?.throwIfAborted();
  if (
    (timeout !== null && (!Number.isSafeInteger(timeout) || timeout < 1)) ||
    (maximumOutputBytes !== null &&
      (!Number.isSafeInteger(maximumOutputBytes) || maximumOutputBytes < 1))
  )
    throw new TypeError("Expected positive native-tool quotas or null.");
  const child = spawn(executable, args, {
    cwd,
    env,
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"],
  });
  let /** @type {any} */ failure,
    outputBytes = 0n,
    termination;
  const /** @type {Buffer[] | null} */ stdoutChunks = captureOutput ? [] : null;
  const stop = (/** @type {*} */ error) => {
      failure ??= error;
      if (stdoutChunks) stdoutChunks.length = 0;
      child.kill();
      // A POSIX child may ignore SIGTERM; settle its pipes before returning.
      termination ??= setTimeout(() => child.kill("SIGKILL"), 1000);
    },
    deadline = createExecutionDeadline(timeout, [signal]),
    abort = () =>
      stop(deadline.signal.reason ?? new Error("Native tool cancelled."));
  deadline.signal.addEventListener("abort", abort, { once: true });
  if (deadline.signal.aborted) abort();
  try {
    return await new Promise((resolve, reject) => {
      child.once("error", (error) => {
        failure ??= error;
      });
      child.stdin.on("error", stop);
      for (const output of [child.stdout, child.stderr])
        output.on("error", stop).on("data", (chunk) => {
          if (failure) return;
          outputBytes += BigInt(chunk.length);
          if (
            maximumOutputBytes !== null &&
            outputBytes > BigInt(maximumOutputBytes)
          ) {
            const /** @type {NodeJS.ErrnoException} */ error = new Error(
                "Native tool output capacity exceeded.",
              );
            error.code = "native-tool-output-capacity";
            stop(error);
          } else if (stdoutChunks && output === child.stdout)
            stdoutChunks.push(chunk);
        });
      child.once("close", (code) => {
        try {
          if (failure) reject(failure);
          else if (!acceptedExitCodes.includes(code))
            reject(new Error(`Native tool failed with exit ${code}.`));
          else
            resolve({
              code,
              stdout: captureOutput
                ? Buffer.concat(/** @type {Buffer[]} */ (stdoutChunks))
                : undefined,
            });
        } catch (error) {
          reject(error);
        }
      });
      child.stdin.end(input);
    });
  } finally {
    deadline.dispose();
    clearTimeout(termination);
    deadline.signal.removeEventListener("abort", abort);
  }
}
