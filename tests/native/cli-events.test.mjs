// SPDX-License-Identifier: AGPL-3.0-only
import { budgets } from "../../scripts/qualification-process.js";
import assert from "node:assert/strict";
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { validateJsonQualityEvent } from "../../src/events.js";

const cli = fileURLToPath(new URL("../../src/cli.js", import.meta.url)),
  run = (args, input = "") =>
    spawnSync(process.execPath, [cli, ...args], {
      input,
      encoding: "utf8",
      windowsHide: true,
      timeout: budgets.read,
      maxBuffer: 4194304,
    }),
  events = (result) => {
    assert.equal(result.error, undefined);
    return result.stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const event = JSON.parse(line);
        assert.equal(validateJsonQualityEvent(event), true, line);
        return event;
      });
  };

test("CLI consumes raw source bytes and delivers correlated complete NDJSON", () => {
  const result = run(
      [
        "source",
        "--json",
        "--request-id",
        "cli-request",
        "--contract",
        '{"formatContract":"producer-json-compact"}',
      ],
      '{"v":1}\n',
    ),
    delivered = events(result);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(delivered[0].type, "source");
  assert.ok(delivered.every((event) => event.requestId === "cli-request"));
  assert.equal(delivered.at(-1).type, "terminal");
  assert.equal(delivered.at(-1).contractSatisfied, true);
  assert.equal(Object.hasOwn(delivered.at(-1), "documents"), false);
});

test("CLI JSONL byte rejection never publishes admitted record counts", () => {
  const result = run(
      ["source", "--json", "--contract", '{"format":"jsonl"}'],
      Buffer.concat([Buffer.from("0\n"), Buffer.from([255])]),
    ),
    delivered = events(result);
  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.equal(delivered.at(-1).records, undefined);
  assert.equal(delivered.at(-1).parserComplete, false);
});

test("CLI rejects obsolete envelopes/flags and keeps finite controls active under admission bypass", () => {
  for (const args of [
    ["source", "--json", "--request", "-"],
    ["source", "--json", "--contract", '{"contentBase64":"MA=="}'],
    ["source", "--json", "--no-capacity-limits", "--max-concurrency", "2"],
  ]) {
    const result = run(args),
      delivered = events(result);
    assert.equal(result.status, 2);
    assert.equal(delivered.at(-1).type, "failure");
    assert.equal(
      delivered.some((event) => event.type === "terminal"),
      false,
    );
  }
});

test("CLI source capacity failure cannot return success or a parser verdict", () => {
  const result = run(["source", "--json", "--max-file-bytes", "2"], "123\n"),
    delivered = events(result);
  assert.equal(result.status, 2, result.stderr || result.stdout);
  assert.equal(delivered.at(-1).type, "failure");
  assert.equal(
    delivered.some((event) => event.type === "terminal"),
    false,
  );
});

test("CLI formats through the installed fixed component with a final write terminal", async () => {
  const root = await mkdtemp(join(tmpdir(), "cli-write-"));
  try {
    execFileSync("git", ["-C", root, "init", "--quiet"], { windowsHide: true });
    await writeFile(
      join(root, ".json-quality.json"),
      JSON.stringify(
        {
          schemaVersion: 2,
          defaults: {
            formatContract: "prettier-json",
            normalization: "NFC",
            allowFormatWrites: true,
          },
          exceptions: [
            {
              paths: [".git/**"],
              exclude: true,
              owner: "Git",
              reason: "Metadata",
            },
          ],
        },
        null,
        2,
      ) + "\n",
    );
    await writeFile(join(root, "value.json"), '{"v":1}');
    const result = run([
        "format",
        "--root",
        root,
        "--json",
        "--",
        "value.json",
      ]),
      delivered = events(result);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(delivered.at(-1).type, "write-terminal");
    assert.equal(delivered.at(-1).written, "1");
    assert.equal(
      await readFile(join(root, "value.json"), "utf8"),
      '{\n  "v": 1\n}\n',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("failed CLI output delivery closes its source session and exits incomplete", async () => {
  const child = spawn(
    process.execPath,
    [
      cli,
      "source",
      "--json",
      "--contract",
      '{"formatContract":"producer-json-compact-body"}',
    ],
    { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] },
  );
  child.stdout.once("data", () => child.stdout.destroy());
  child.stderr.resume();
  child.stdin.on("error", () => {});
  const completed = new Promise((done, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => done({ code, signal }));
  });
  child.stdin.end(JSON.stringify(Array(2000).fill("é")));
  const result = await completed;
  assert.equal(result.signal, null);
  assert.equal(result.code, 2);
});
