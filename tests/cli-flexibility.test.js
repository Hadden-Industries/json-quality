// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { temporaryRepository } from "./temporary-repository.js";
import { runJsonQuality } from "../src/execution.js";
import { formatJsonDocument } from "../src/document-operation.js";
import { mapConcurrent } from "../src/selection.js";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateJsonQualityResult } from "../src/result.js";
import Ajv from "ajv";
import requestSchema from "@hadden-industries/json-quality/document-request-schema" with { type: "json" };
import responseSchema from "@hadden-industries/json-quality/document-response-schema" with { type: "json" };
import resultSchema from "@hadden-industries/json-quality/result-schema" with { type: "json" };

function fixture(t) {
  const root = temporaryRepository(t, "json-flexibility-");
  const policy = {
    schemaVersion: 1,
    defaults: {
      formatContract: "prettier-json",
      allowFormatWrites: true,
      normalization: "NFC",
    },
    exceptions: [
      {
        paths: [".git/**", "**/node_modules/**"],
        exclude: true,
        owner: "Git and package manager",
        reason: "External storage; tracked JSON retains checking.",
      },
    ],
  };
  writeFileSync(
    join(root, ".json-quality.json"),
    JSON.stringify(policy, null, 2) + "\n",
  );
  return root;
}

test("explicit checking analyzes requested physical files and reports a scoped inventory", async (t) => {
  const root = fixture(t);
  writeFileSync(join(root, "selected.json"), "{}\n");
  writeFileSync(join(root, "peer.json"), '{"value":9007199254740992}');
  const result = await runJsonQuality("check", {
    root,
    files: ["selected.json"],
    concurrency: 2,
  });
  assert.equal(result.status, "passed");
  assert.deepEqual(
    result.documents.map(({ path }) => path),
    ["selected.json"],
  );
  assert.equal(result.selection.physicalInventory, 3);
  assert.equal((await runJsonQuality("check", { root })).status, "failed");
});

test("selected formatting retains invalid-peer preflight and only replaces selected sources", async (t) => {
  const root = fixture(t);
  const selected = '{"value":1.00e+2}';
  writeFileSync(join(root, "selected.json"), selected);
  writeFileSync(join(root, "peer.json"), '{"value":9007199254740992}');
  const rejected = await runJsonQuality("format", {
    root,
    files: ["selected.json"],
  });
  assert.equal(rejected.status, "failed");
  assert.equal(readFileSync(join(root, "selected.json"), "utf8"), selected);
  const peer = '{"peer":true}';
  writeFileSync(join(root, "peer.json"), peer);
  const accepted = await runJsonQuality("format", {
    root,
    files: ["selected.json"],
    concurrency: 2,
  });
  assert.equal(accepted.status, "passed");
  assert.deepEqual(accepted.writes.changed, ["selected.json"]);
  assert.equal(readFileSync(join(root, "peer.json"), "utf8"), peer);
  assert.match(readFileSync(join(root, "selected.json"), "utf8"), /1\.00e\+2/u);
});

test("literal selection rejects duplicates, escaping paths and absent documents", async (t) => {
  const root = fixture(t);
  for (const files of [
    ["../outside.json"],
    ["missing.json"],
    [".json-quality.json", ".json-quality.json"],
  ])
    await assert.rejects(runJsonQuality("check", { root, files }));
  assert.deepEqual(
    (await runJsonQuality("inventory", { root, files: [] })).documents,
    [],
  );
});

test("supplied formatting retains numeric tokens and performs no checkout writes", async (t) => {
  const root = fixture(t);
  const policy = readFileSync(join(root, ".json-quality.json"));
  const request = {
    schemaVersion: 1,
    requestId: "fixture",
    path: "supplied.json",
    contentBase64: Buffer.from('{"value":1.00e+2}').toString("base64"),
  };
  const result = await formatJsonDocument(request, { root });
  const ajv = new Ajv({ strict: true });
  assert.equal(ajv.compile(requestSchema)(request), true);
  const validateResponse = ajv
    .addSchema(resultSchema, "result.schema.json")
    .compile(responseSchema);
  assert.equal(
    validateResponse(result),
    true,
    ajv.errorsText(validateResponse.errors),
  );
  assert.equal(
    validateResponse({
      ...result,
      result: { ...result.result, unknown: true },
    }),
    false,
  );
  assert.equal(result.result.status, "passed");
  assert.match(
    Buffer.from(result.contentBase64, "base64").toString("utf8"),
    /1\.00e\+2/u,
  );
  assert.deepEqual(result.result.writes.changed, []);
  assert.deepEqual(readFileSync(join(root, ".json-quality.json")), policy);
});

test("supplied formatting does not normalize or silently repair invalid semantic values", async (t) => {
  const root = fixture(t);
  const source = '{"value":"e\\u0301"}';
  const request = {
    schemaVersion: 1,
    requestId: "fixture",
    path: "supplied.json",
    contentBase64: Buffer.from(source).toString("base64"),
  };
  const result = await formatJsonDocument(request, { root });
  assert.equal(result.result.status, "failed");
  assert.equal(result.contentBase64, request.contentBase64);
  await assert.rejects(
    formatJsonDocument(
      { ...request, contentBase64: request.contentBase64 + "\n" },
      { root },
    ),
    /canonical base64/u,
  );
});

test("supplied formatting preserves excluded ancestor boundaries and output budgets", async (t) => {
  const root = fixture(t);
  const request = {
    schemaVersion: 1,
    requestId: "boundary",
    path: "node_modules/.hidden.json",
    contentBase64: Buffer.from("[]").toString("base64"),
  };
  await assert.rejects(
    formatJsonDocument(request, { root }),
    /excluded or protected/u,
  );
  await assert.rejects(
    formatJsonDocument(
      { ...request, path: "supplied.json" },
      { root, capacityLimits: { maxTotalBytes: 2 } },
    ),
    /total-byte budget/u,
  );
});

test("concurrent preparation settles started peers before reporting a failure", async () => {
  let release;
  const barrier = new Promise((resolve) => {
    release = resolve;
  });
  const events = [];
  const result = mapConcurrent([0, 1, 2], 2, async (value) => {
    events.push(`started:${value}`);
    if (value === 0) {
      await barrier;
      events.push("settled:0");
      return value;
    }
    release();
    throw new Error("Expected preparation failure");
  });
  await assert.rejects(result, /Expected preparation failure/u);
  assert.ok(events.includes("settled:0"));
  assert.ok(!events.includes("started:2"));
});

test("concurrent preparation returns input order after out-of-order completion", async () => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const completed = [];
  const values = await mapConcurrent([0, 1], 2, async (value) => {
    if (value === 0) await gate;
    else release();
    completed.push(value);
    return value;
  });
  assert.deepEqual(completed, [1, 0]);
  assert.deepEqual(values, [0, 1]);
});

test("explicit formatting refuses protected repairs", async (t) => {
  const root = fixture(t);
  writeFileSync(join(root, "records.jsonl"), "{}\n");
  await assert.rejects(
    runJsonQuality("format", { root, files: ["records.jsonl"] }),
    /protected JSON source/u,
  );
});

test("supplied request metadata capacityLimits are policy-controlled and Unicode-aware", async (t) => {
  const root = fixture(t);
  const request = {
    schemaVersion: 1,
    requestId: "😀".repeat(1025),
    path: "a".repeat(1500) + ".json",
    contentBase64: Buffer.from("{}\n").toString("base64"),
  };
  await assert.rejects(
    formatJsonDocument(request, { root }),
    /character limit/u,
  );
  const result = await formatJsonDocument(request, {
    root,
    capacityLimits: { maxRequestIdCharacters: 1025 },
  });
  assert.equal(result.path, request.path);
  assert.equal(result.requestId, request.requestId);
  assert.equal(
    (await formatJsonDocument(request, { root, capacityLimits: false })).result
      .status,
    "passed",
  );
});

test("CLI admission failures keep the closed operational error envelope", (t) => {
  const root = fixture(t);
  const cli = fileURLToPath(new URL("../src/cli.js", import.meta.url));
  const duplicate =
    '{"schemaVersion":1,"requestId":"request","path":"first.json","path":"last.json","contentBase64":"e30="}';
  const cases = [
    { args: ["check", "--files-json", "[]"] },
    { args: ["format", "--stdin-request"], input: duplicate },
    { args: ["check-protected"] },
    { args: ["normalize", "--files", "[]"] },
    { args: ["format", "--request", "data.json"] },
    { args: ["format", "--request", "-", "--concurrency", "1"] },
    { args: ["format", "--request", "-", "--files", "[]"] },
    { args: ["check", "--files", "{}"] },
    { args: ["check", "--files", "[]", "--", "peer.json"] },
    { args: ["check", "--concurrency", "0"] },
    { args: ["check", "--diagnostic-level", "unknown"] },
    { args: ["format", "--request", "-"], input: duplicate },
    { args: ["format", "--request", "-"], input: Buffer.from([255]) },
    {
      args: ["format", "--request", "-", "--max-file-bytes", "1"],
      input: JSON.stringify({
        schemaVersion: 1,
        requestId: "request",
        path: "data.json",
        contentBase64: Buffer.from("{}").toString("base64"),
      }),
    },
  ];
  for (const { args, input } of cases) {
    const result = spawnSync(
      process.execPath,
      [cli, "--json", "--root", root, ...args],
      { input, encoding: "utf8", windowsHide: true, timeout: 30000 },
    );
    assert.equal(result.status, 2, result.stderr);
    const report = validateJsonQualityResult(JSON.parse(result.stdout));
    assert.equal(report.status, "error");
    assert.equal(report.complete, false);
  }
});

test("CLI and library preserve the same verb and format check modifier", async (t) => {
  const root = fixture(t);
  const path = join(root, "data.json");
  const original = '{"number":1.00e+2}';
  writeFileSync(path, original);
  const options = { root, check: true, files: ["data.json"] };
  const result = await runJsonQuality("format", options);
  const cli = fileURLToPath(new URL("../src/cli.js", import.meta.url));
  const invoked = spawnSync(
    process.execPath,
    [
      cli,
      "format",
      "--check",
      "--files",
      '["data.json"]',
      "--root",
      root,
      "--json",
    ],
    { encoding: "utf8", windowsHide: true, timeout: 30000 },
  );
  assert.equal(invoked.status, 1, invoked.stderr);
  assert.deepEqual(JSON.parse(invoked.stdout), result);
  assert.equal(result.operation, "format");
  assert.equal(result.check, true);
  assert.equal(
    result.selection.analysis,
    "selected-physical-and-required-documents",
  );
  assert.equal(readFileSync(path, "utf8"), original);
  assert.throws(
    () => validateJsonQualityResult({ ...result, schemaVersion: 3 }),
    /structure/u,
  );
  assert.throws(
    () =>
      validateJsonQualityResult({
        ...result,
        writes: { ...result.writes, unchanged: ["data.json"] },
      }),
    /write accounting/u,
  );
});

test("library rejects retired names and invalid modifiers before repository access", async () => {
  for (const [operation, options] of [
    ["check-format", {}],
    ["check-protected", {}],
    ["format", { check: "true" }],
    ["format", { scope: "protected" }],
    ["check", { check: false }],
    ["check", { scope: "producer" }],
    ["normalize", {}],
    ["normalize", { files: [] }],
    ["normalize", { sourcePaths: ["data.json"] }],
  ])
    await assert.rejects(runJsonQuality(operation, options), TypeError);
});

test("supplied-document check uses the same modifier and retains original bytes", async (t) => {
  const root = fixture(t);
  const request = {
    schemaVersion: 1,
    requestId: "verify",
    path: "data.json",
    contentBase64: Buffer.from('{"x":1.00e+2}').toString("base64"),
  };
  const response = await formatJsonDocument(request, { root, check: true });
  assert.equal(response.result.operation, "format");
  assert.equal(response.result.check, true);
  assert.equal(response.result.status, "failed");
  assert.equal(response.contentBase64, request.contentBase64);
  assert.deepEqual(response.result.writes.changed, []);
  const cli = fileURLToPath(new URL("../src/cli.js", import.meta.url));
  const invoked = spawnSync(
    process.execPath,
    [cli, "format", "--check", "--request", "-", "--root", root, "--json"],
    {
      input: JSON.stringify(request),
      encoding: "utf8",
      windowsHide: true,
      timeout: 30000,
    },
  );
  assert.equal(invoked.status, 1, invoked.stderr);
  assert.deepEqual(JSON.parse(invoked.stdout), response);
});
