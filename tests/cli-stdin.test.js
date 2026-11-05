// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { temporaryDirectory } from "./temporary-directory.js";
import {
  stdinContract,
  executeStdinOperation,
} from "../src/stdin-operation.js";

const cli = fileURLToPath(new URL("../src/cli.js", import.meta.url));
function run(
  /** @type {*} */ args,
  /** @type {*} */ input,
  /** @type {*} */ cwd,
) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd,
    input,
    encoding: "utf8",
    windowsHide: true,
    timeout: 30000,
    env: { ...process.env, NODE_OPTIONS: "", NODE_PATH: "" },
  });
  assert.equal(result.error, undefined);
  return result;
}

test("stdin filename admission preserves raw contracts and refuses contradictory framing before acquisition", () => {
  assert.deepEqual(stdinContract({}, "source.json"), {
    path: "source.json",
    format: "json",
  });
  assert.equal(stdinContract({}, "records.ndjson").format, "jsonl");
  const contract = { path: "retained-raw-name", format: "json" };
  assert.deepEqual(stdinContract(contract), contract);
  for (const [selected, path] of [
    [{ path: "a.json" }, "b.json"],
    [{ format: "jsonl" }, "a.json"],
    [{}, "../a.json"],
    [{}, "a.json5"],
  ])
    assert.throws(() => stdinContract(selected, path));
});

test("CLI mode admission refuses legacy writes and mixed stdin reporting without opening a repository", (t) => {
  const root = temporaryDirectory(t, "json-cli-admission-");
  const path = join(root, "source.json"),
    bytes = '{"value":1}\n';
  writeFileSync(path, bytes);
  for (const args of [
    ["format", "--", "source.json"],
    ["normalize", "--", "source.json"],
    ["format", "--stdin", "--write"],
    ["normalize", "--stdin", "--dry-run"],
    ["format", "--stdin", "--ndjson"],
    ["check-files", "--stdin"],
    ["check", "--", "source.json"],
  ]) {
    const result = run(args, bytes, root);
    assert.equal(result.status, 2, result.stderr);
    assert.equal(readFileSync(path, "utf8"), bytes);
    assert.deepEqual(readdirSync(root), ["source.json"]);
  }
});

test("raw stdin transforms preserve numeric lexemes and keep formatting separate from NFC", (t) => {
  const root = temporaryDirectory(t, "json-cli-stdin-raw-");
  const input = '{"z":1.2300,"a":"e\u0301"}\n';
  const formatted = run(
    ["format", "--stdin", "--stdin-filepath", "virtual.json"],
    input,
    root,
  );
  assert.equal(formatted.status, 0, formatted.stderr);
  const preserved = run(
    [
      "format",
      "--stdin",
      "--contract",
      JSON.stringify({
        normalization: "preserve",
        allowSourceRewrites: false,
        owner: "Raw stream owner",
        reason: "Preserve decoded input values without checkout authority.",
      }),
    ],
    input,
    root,
  );
  assert.equal(preserved.status, 0, preserved.stderr);
  assert.equal(preserved.stdout, formatted.stdout);
  assert.equal(formatted.stdout, '{\n  "z": 1.2300,\n  "a": "e\u0301"\n}\n');
  const normalized = run(
    ["normalize", "--stdin", "--stdin-filepath", "virtual.json"],
    input,
    root,
  );
  assert.equal(normalized.status, 0, normalized.stderr);
  assert.equal(normalized.stdout, input.replace("e\u0301", "é"));
  assert.deepEqual(readdirSync(root), []);
});

test("stdin transforms refuse malformed values, NFC collisions and expected-byte substitutions without source output", (t) => {
  const root = temporaryDirectory(t, "json-cli-stdin-refusal-");
  for (const [verb, bytes] of [
    ["format", "{"],
    ["normalize", '{"e\u0301":1,"é":2}\n'],
    ["format", Buffer.from([0xc0, 0xaf])],
  ]) {
    const result = run([verb, "--stdin"], bytes, root);
    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.stdout, "");
  }
  const input = "{}\n";
  const substituted = run(
    [
      "format",
      "--stdin",
      "--contract",
      JSON.stringify({
        expected: {
          sha256: "0".repeat(64),
          byteLength: String(Buffer.byteLength(input)),
          diagnostics: [],
        },
      }),
    ],
    input,
    root,
  );
  assert.equal(substituted.status, 1, substituted.stderr);
  assert.equal(substituted.stdout, "");
  assert.deepEqual(readdirSync(root), []);
});

test("policy-aware stdin checks virtual bytes without reading or rewriting a bad target or peer", (t) => {
  const root = temporaryDirectory(t, "json-cli-stdin-policy-");
  writeFileSync(join(root, "virtual.json"), "invalid target\n");
  writeFileSync(join(root, "peer.json"), "invalid peer\n");
  const checked = run(
    [
      "check-files",
      "--stdin",
      "--stdin-filepath",
      "virtual.json",
      "--root",
      root,
      "--ndjson",
    ],
    "{}\n",
    root,
  );
  assert.equal(checked.status, 0, checked.stderr);
  const terminal = JSON.parse(checked.stdout.trim().split("\n").at(-1));
  assert.equal(terminal.type, "selection-terminal");
  assert.equal(terminal.inputComplete, true);
  assert.equal(Object.hasOwn(terminal, "sourceObservationsComplete"), false);
  assert.equal(terminal.operationScope.completeRepositoryCheck, false);
  const formatted = run(
    ["format", "--stdin", "--root", root, "--stdin-filepath", "virtual.json"],
    '{"value":1}\n',
    root,
  );
  assert.equal(formatted.status, 0, formatted.stderr);
  assert.equal(formatted.stdout, '{\n  "value": 1\n}\n');
  assert.equal(
    readFileSync(join(root, "virtual.json"), "utf8"),
    "invalid target\n",
  );
  assert.equal(readFileSync(join(root, "peer.json"), "utf8"), "invalid peer\n");
  assert.deepEqual(readdirSync(root).sort(), ["peer.json", "virtual.json"]);
});

test("stdin output cannot acquire protected producer paths or bypass writer quotas", (t) => {
  const root = temporaryDirectory(t, "json-cli-stdin-protection-");
  writeFileSync(join(root, "package-lock.json"), "{}\n");
  for (const args of [
    [
      "format",
      "--stdin",
      "--root",
      root,
      "--stdin-filepath",
      "package-lock.json",
    ],
    ["normalize", "--stdin", "--contract", '{"normalization":"preserve"}'],
    [
      "format",
      "--stdin",
      "--root",
      root,
      "--stdin-filepath",
      "node_modules/generated.json",
    ],
    ["format", "--stdin", "--transform-controls", '{"maximumSourceBytes":1}'],
  ]) {
    const result = run(args, '{"value":1}\n', root);
    assert.equal(result.status, 2, result.stderr);
    assert.equal(result.stdout, "");
  }
  assert.equal(readFileSync(join(root, "package-lock.json"), "utf8"), "{}\n");
});

test("stdin transform rechecks policy absence before exposing a derived source", async (t) => {
  const root = temporaryDirectory(t, "json-cli-stdin-fresh-");
  async function* source() {
    yield Buffer.from("{}\n");
  }
  await assert.rejects(
    () =>
      executeStdinOperation(
        {
          operation: "format",
          source: source(),
          root,
          path: "virtual.json",
        },
        {
          ready() {
            writeFileSync(join(root, ".json-quality.json"), "{}\n");
          },
        },
      ),
    /Configuration appeared/u,
  );
  assert.deepEqual(readdirSync(root), [".json-quality.json"]);
});

test("raw source filename context keeps terminal scope distinct from repository acceptance", (t) => {
  const root = temporaryDirectory(t, "json-cli-source-name-");
  const result = run(
    ["check-source", "--stdin-filepath", "virtual.json", "--ndjson"],
    "{}\n",
    root,
  );
  assert.equal(result.status, 0, result.stderr);
  const terminal = JSON.parse(result.stdout.trim().split("\n").at(-1));
  assert.equal(terminal.type, "terminal");
  assert.equal(terminal.path, "virtual.json");
  assert.deepEqual(terminal.operationScope, {
    kind: "stdin",
    policy: "explicit-contract",
    completeRepositoryCheck: false,
  });
  assert.deepEqual(readdirSync(root), []);
});

test("stdin transform cancellation settles native storage before refusing output", async (t) => {
  const root = temporaryDirectory(t, "json-cli-stdin-cancel-root-");
  const scratch = temporaryDirectory(t, "json-cli-stdin-cancel-scratch-");
  const controller = new AbortController();
  async function* source() {
    yield Buffer.from('{"open":');
    controller.abort(new Error("stdin cancellation fixture"));
    controller.signal.throwIfAborted();
  }
  let returned = false;
  await assert.rejects(async () => {
    await executeStdinOperation({
      operation: "format",
      source: source(),
      temporaryDirectory: scratch,
      signal: controller.signal,
    });
    returned = true;
  });
  assert.equal(controller.signal.aborted, true);
  assert.equal(returned, false);
  assert.deepEqual(readdirSync(scratch), []);
  assert.deepEqual(readdirSync(root), []);
});

test("broken stdin transform output exits incomplete after genuine native cleanup", async (t) => {
  const root = temporaryDirectory(t, "json-cli-stdin-pipe-root-");
  const scratch = temporaryDirectory(t, "json-cli-stdin-pipe-scratch-");
  // One genuine source exceeds the pipe buffer; no unrelated commands create volume.
  const input = '{"value":"' + "x".repeat(1024 * 1024) + '"}\n';
  // Admit this finite formatter workspace so the test reaches its output sink;
  // insufficient-workspace refusal is a separate contract from broken delivery.
  const child = spawn(
    process.execPath,
    [
      cli,
      "format",
      "--stdin",
      "--quiet",
      "--max-managed-memory-bytes",
      "67108864",
    ],
    {
      cwd: root,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        NODE_OPTIONS: "",
        NODE_PATH: "",
        TEMP: scratch,
        TMP: scratch,
        TMPDIR: scratch,
      },
    },
  );
  let sawOutput = false,
    stdinError;
  let stderr = "";
  child.stdin.on("error", (error) => {
    stdinError = error;
  });
  child.stderr.on("data", (bytes) => {
    stderr += bytes.toString("utf8");
  });
  child.stdout.once("data", () => {
    sawOutput = true;
    child.stdout.destroy();
  });
  const stopping = setTimeout(() => child.kill(), 30000);
  let result;
  try {
    const closed = new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (code, signal) => resolve({ code, signal }));
    });
    child.stdin.end(input);
    result = await closed;
  } finally {
    clearTimeout(stopping);
  }
  assert.equal(stdinError, undefined, stderr);
  assert.equal(sawOutput, true, stderr);
  assert.equal(result.signal, null, stderr);
  assert.equal(result.code, 2, stderr);
  assert.deepEqual(readdirSync(scratch), []);
  assert.deepEqual(readdirSync(root), []);
});
