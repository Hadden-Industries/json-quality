// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { runBoundedTool } from "../../src/bounded-process.js";

const options = {
  input: Buffer.alloc(0),
  timeout: 5000,
  maximumOutputBytes: 65536,
};
test("bounded native-tool delivery admits success and refuses aggregate output overflow", async () => {
  await runBoundedTool(
    process.execPath,
    ["-e", "process.stdin.resume();"],
    options,
  );
  await assert.rejects(
    runBoundedTool(
      process.execPath,
      ["-e", "process.stdout.write('x'.repeat(65536));"],
      {
        ...options,
        maximumOutputBytes: 32,
      },
    ),
    /output capacity/,
  );
});

test("native-tool timeout and active cancellation settle their owned child", async () => {
  const script = "process.stdin.resume(); setTimeout(() => {}, 5000);";
  await assert.rejects(
    runBoundedTool(process.execPath, ["-e", script], {
      ...options,
      timeout: 20,
    }),
    /time capacity/,
  );
  const controller = new AbortController(),
    timer = setTimeout(
      () => controller.abort(new Error("fixture cancellation")),
      20,
    );
  try {
    await assert.rejects(
      runBoundedTool(process.execPath, ["-e", script], {
        ...options,
        signal: controller.signal,
      }),
      /fixture cancellation/,
    );
  } finally {
    clearTimeout(timer);
  }
});
