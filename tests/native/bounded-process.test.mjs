// SPDX-License-Identifier: AGPL-3.0-only
import { budgets } from "../../scripts/qualification-process.js";
import assert from "node:assert/strict";
import test from "node:test";
import { runBoundedTool } from "../../src/bounded-process.js";

const options = {
  input: Buffer.alloc(0),
  timeout: budgets.read,
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
        timeout: null,
        maximumOutputBytes: null,
      }),
      /fixture cancellation/,
    );
  } finally {
    clearTimeout(timer);
  }
});

test("unlimited native-tool time and output complete without a hidden finite ceiling", async () => {
  const result = await runBoundedTool(
    process.execPath,
    ["-e", "setTimeout(() => process.stdout.write('x'.repeat(65537)), 30);"],
    {
      input: Buffer.alloc(0),
      timeout: null,
      maximumOutputBytes: null,
      captureOutput: true,
    },
  );
  assert.equal(result.code, 0);
  assert.equal(result.stdout.length, 65537);
});

test("bounded capture joins fragmented binary stdout and counts stderr before retaining", async () => {
  const input = Buffer.from([0, 0xff, 0xc3, 0xa9, 0, 1]);
  const result = await runBoundedTool(
    process.execPath,
    [
      "-e",
      "process.stdin.on('data', b => { for (const byte of b) process.stdout.write(Buffer.from([byte])); });",
    ],
    { ...options, input, captureOutput: true },
  );
  assert.equal(result.code, 0);
  assert.deepEqual(result.stdout, input);
  const ordinary = await runBoundedTool(
    process.execPath,
    ["-e", "process.stdin.resume();process.exitCode=1;"],
    { ...options, acceptedExitCodes: [0, 1] },
  );
  assert.deepEqual(ordinary, { code: 1, stdout: undefined });
  await assert.rejects(
    runBoundedTool(
      process.execPath,
      [
        "-e",
        "process.stdout.write('12345678');process.stderr.write('12345678');",
      ],
      { ...options, maximumOutputBytes: 15, captureOutput: true },
    ),
    /output capacity/,
  );
  await assert.rejects(
    runBoundedTool(process.execPath, ["-e", "process.exit(128);"], options),
    /exit 128/,
  );
});

test("capture refuses spawn failure, cancellation before spawn and broken input", async () => {
  await assert.rejects(
    runBoundedTool("json-quality-nonexistent-tool", [], options),
    /ENOENT/,
  );
  const controller = new AbortController();
  controller.abort(new Error("before spawn"));
  await assert.rejects(
    runBoundedTool(process.execPath, [], {
      ...options,
      signal: controller.signal,
    }),
    /before spawn/,
  );
  await assert.rejects(
    runBoundedTool(
      process.execPath,
      ["-e", "process.stdin.destroy();process.exit(0);"],
      { ...options, input: Buffer.alloc(2097152), captureOutput: true },
    ),
    /EPIPE|EOF|ECONNRESET|write/,
  );
});

test(
  "a child that ignores cooperative termination still settles after its deadline",
  {
    skip:
      process.platform === "win32"
        ? "Windows terminates the owned process directly; POSIX exercises signal escalation."
        : false,
  },
  async () => {
    await assert.rejects(
      runBoundedTool(
        process.execPath,
        [
          "-e",
          "process.on('SIGTERM',()=>{});process.stdin.resume();setInterval(()=>{},1000);",
        ],
        { ...options, timeout: 500, captureOutput: true },
      ),
      /time capacity/,
    );
  },
);
