// SPDX-License-Identifier: AGPL-3.0-only
// One owned native-tool process, bounded diagnostics and cooperative cancellation.
import { spawn } from "node:child_process";

export async function runBoundedTool(
  executable,
  args,
  { input, signal, timeout, maximumOutputBytes, acceptedExitCodes = [0], cwd },
) {
  signal?.throwIfAborted();
  if (
    !Number.isSafeInteger(timeout) ||
    timeout < 1 ||
    !Number.isSafeInteger(maximumOutputBytes) ||
    maximumOutputBytes < 1
  )
    throw new TypeError("Expected finite native-tool working controls.");
  const child = spawn(executable, args, {
    cwd,
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"],
  });
  let failure,
    outputBytes = 0;
  const stop = (error) => {
      failure ??= error;
      child.kill();
    },
    abort = () => stop(signal.reason ?? new Error("Native tool cancelled.")),
    timer = setTimeout(
      () => stop(new Error("Native tool time capacity exceeded.")),
      timeout,
    );
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  try {
    return await new Promise((resolve, reject) => {
      child.once("error", (error) => {
        failure ??= error;
      });
      child.stdin.on("error", (error) => {
        failure ??= error;
      });
      for (const output of [child.stdout, child.stderr])
        output.on("error", stop).on("data", (chunk) => {
          outputBytes += chunk.length;
          if (outputBytes > maximumOutputBytes)
            stop(new Error("Native tool output capacity exceeded."));
        });
      child.once("close", (code) => {
        if (failure) reject(failure);
        else if (!acceptedExitCodes.includes(code))
          reject(new Error(`Native tool failed with exit ${code}.`));
        else resolve(code);
      });
      child.stdin.end(input);
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
