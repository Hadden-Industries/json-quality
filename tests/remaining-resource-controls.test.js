// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { temporaryDirectory } from "./temporary-directory.js";
import { resolveExecutionResources } from "../src/execution-resources.js";
import {
  renderHumanEvent,
  escapeHumanText,
  humanDisplayControls,
} from "../src/cli-messages.js";
import { gitRecords } from "../src/repository-discovery.js";
import { assertGitCommit } from "../src/git-objects.js";
import { runBoundedTool } from "../src/bounded-process.js";
import {
  NativeSession,
  nativeFrame,
  decodeNativeFrames,
} from "../src/native-session.js";
import cohort from "../schemas/contract-cohort.json" with { type: "json" };

test("human path and pointer controls admit finite raised and null scalar-safe displays", () => {
  const path = "p".repeat(700) + ".json",
    pointer = "/" + "😀".repeat(400);
  for (const maximum of [12, 900, null]) {
    const resources = resolveExecutionResources(
      {},
      {
        capacityLimits: {
          maxHumanPathCodePoints: maximum,
          maxHumanPointerCodePoints: maximum,
        },
      },
    );
    const output = renderHumanEvent(
      {
        type: "normalization-preview-change",
        path,
        pointer,
        sourceByteOffset: "0",
        decodedSha256: "a".repeat(64),
        normalizedSha256: "b".repeat(64),
      },
      humanDisplayControls(resources),
    );
    assert.equal(
      output.includes(path),
      maximum === null || maximum >= path.length,
    );
    assert.equal(output.includes(pointer), maximum === null || maximum >= 401);
  }
  assert.equal(escapeHumanText("😀😀x", 1), "😀…");
  assert.equal(escapeHumanText("\u001bx", null), "\\u001bx");
  const unlimited = resolveExecutionResources(
    {},
    { capacityLimits: false, runtimeControls: false },
  );
  assert.equal(unlimited.runtime.terminationGraceMs, null);
  assert.deepEqual(humanDisplayControls(unlimited), {
    maxPathCodePoints: null,
    maxPointerCodePoints: null,
  });
  assert.throws(() => escapeHumanText("x", 0), /display limit/u);
});

test("real Git diagnostic capture honors caller quotas beyond former 64-byte and 4-KiB clamps", async () => {
  const marker = "x".repeat(7000),
    capacities = { maxGitOutputBytes: null, maxGitTimeMs: null };
  await assert.rejects(
    async () => {
      for await (const entry of gitRecords(
        "git",
        process.cwd(),
        ["--unknown-" + marker],
        capacities,
      )) {
        assert.fail(entry);
      }
    },
    (error) => error.message.includes(marker),
  );
  await assert.rejects(async () => {
    for await (const entry of gitRecords(
      "git",
      process.cwd(),
      ["--unknown-" + marker],
      { ...capacities, maxGitOutputBytes: 64 },
    )) {
      assert.fail(entry);
    }
  }, /git-output-byte-capacity/u);
  await assert.rejects(
    assertGitCommit({
      executable: "git",
      root: tmpdir(),
      sha: "a".repeat(40),
      capacities,
    }),
    (error) =>
      error.message.includes("not a git repository") &&
      error.code !== "ERR_CHILD_PROCESS_STDIO_MAXBUFFER",
  );
  await assert.rejects(
    assertGitCommit({
      executable: "git",
      root: tmpdir(),
      sha: "a".repeat(40),
      capacities: { ...capacities, maxGitOutputBytes: 1 },
    }),
    /output capacity/u,
  );
});

test("bounded tools retain complete selected diagnostics and admit long finite timeouts", async () => {
  const marker = "x".repeat(7000);
  const selected = await runBoundedTool(
    process.execPath,
    ["-e", "process.stderr.write('x'.repeat(7000));"],
    { timeout: 2147483650, maximumOutputBytes: null, captureOutput: true },
  );
  assert.equal(selected.stderr.toString(), marker);
  await assert.rejects(
    runBoundedTool(
      process.execPath,
      ["-e", "process.stderr.write('x'.repeat(7000)); process.exitCode=7;"],
      { timeout: null, maximumOutputBytes: 9000, captureOutput: true },
    ),
    (error) => error.message.includes(marker),
  );
  await assert.rejects(
    runBoundedTool(process.execPath, [], {
      timeout: null,
      maximumOutputBytes: null,
      terminationGraceMs: 0,
    }),
    /quotas/u,
  );
});

test(
  "POSIX tool termination grace honors finite raised and null selections after real readiness",
  { skip: process.platform === "win32" },
  async (t) => {
    const root = temporaryDirectory(t, "json-grace-'\"\\\n雪-");
    for (const terminationGraceMs of [60, 2500, null]) {
      const name = String(terminationGraceMs),
        ready = join(root, name + "-ready"),
        settled = join(root, name + "-settled"),
        controller = new AbortController();
      const program = `
        const fs = require('node:fs');
        const [ready, settled] = process.argv.slice(1);
        process.on('SIGTERM', () => setTimeout(() => {
          fs.writeFileSync(settled, 'settled');
          process.exit(0);
        }, 1300));
        fs.writeFileSync(ready, 'ready');
        setInterval(() => {}, 1000);
      `;
      const child = runBoundedTool(
        process.execPath,
        ["-e", program, ready, settled],
        {
          timeout: 10000,
          maximumOutputBytes: null,
          terminationGraceMs,
          signal: controller.signal,
        },
      ).then(
        () => ({ ok: true }),
        (error) => ({ error }),
      );
      const limit = performance.now() + 5000;
      while (!existsSync(ready) && performance.now() < limit)
        await new Promise((done) => setTimeout(done, 10));
      assert.ok(
        existsSync(ready),
        "Child did not establish its real signal handler",
      );
      const began = performance.now();
      controller.abort(new Error("grace-fixture-cancelled"));
      const outcome = await child;
      assert.match(outcome.error?.message ?? "", /grace-fixture-cancelled/u);
      assert.equal(existsSync(settled), terminationGraceMs !== 60);
      assert.ok(
        performance.now() - began < (terminationGraceMs === 60 ? 1000 : 4000),
      );
    }
  },
);

function fragmentedBinding(mode) {
  let request = Buffer.alloc(0),
    remaining = [],
    reads = 0;
  const encoded = (value) =>
    nativeFrame("J", Buffer.from(JSON.stringify(value)));
  const manifest = {
    sourceInputsSha256: "a".repeat(64),
    components: {
      icuVersion: "79.1",
      unicodeVersion: "18.0",
      sqliteVersion: "3.54.1",
    },
  };
  const binding = {
    create() {
      return {};
    },
    hello() {
      return encoded({
        protocolVersion: cohort.nativeProtocolVersion,
        sourceInputsSha256: manifest.sourceInputsSha256,
        icu: "79.1",
        unicode: "18.0",
        sqlite: "3.54.1",
        owner: "b".repeat(32),
      });
    },
    release() {},
    cancel() {},
    async exchange(handle, bytes) {
      const kind = String.fromCharCode(bytes[0]);
      if (kind === "R") {
        reads++;
        if (mode === "malformed") return nativeFrame("D", Buffer.from("bad"));
        return remaining.shift();
      }
      request = Buffer.concat([request, bytes.subarray(5)]);
      if (kind === "C") return Buffer.alloc(0);
      const fields = JSON.parse(request.toString());
      request = Buffer.alloc(0);
      if (fields.command === "close")
        return encoded({ type: "closed", requestId: fields.requestId });
      const body = Buffer.from(
        JSON.stringify({
          type: "metadata",
          requestId: fields.requestId,
          value: "é".repeat(70000),
        }),
      );
      remaining = [];
      for (let offset = 0; offset < body.length; offset += 65536)
        remaining.push(
          nativeFrame(
            offset + 65536 < body.length ? "j" : "J",
            body.subarray(offset, offset + 65536),
          ),
        );
      return remaining.shift();
    },
  };
  return { binding, manifest, reads: () => reads };
}

test("Node reply assembly preserves split UTF-8 and refuses malformed continuation frames", async () => {
  for (const mode of ["valid", "malformed"]) {
    const component = fragmentedBinding(mode),
      session = new NativeSession(component, "unused-mocked-binding");
    try {
      if (mode === "valid") {
        const response = await session.command("metadata");
        assert.equal(response.result.value, "é".repeat(70000));
        assert.equal(component.reads(), 2);
      } else
        await assert.rejects(
          session.command("metadata"),
          /native-fragment-boundary/u,
        );
    } finally {
      await session.close();
    }
  }
  assert.throws(
    () => decodeNativeFrames(nativeFrame("J", Buffer.from([255]))),
    /encoded data/u,
  );
});
