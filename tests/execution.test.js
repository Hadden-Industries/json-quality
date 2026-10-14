// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { fileURLToPath } from "node:url";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { createHash } from "node:crypto";
import { runJsonQuality } from "../src/execution.js";
import { checkJsonDocument } from "../src/documents.js";

function repository(t) {
  const root = mkdtempSync(join(tmpdir(), "json-quality-test-"));
  t.after(() => {
    assert.ok(root.startsWith(tmpdir() + sep + "json-quality-test-"));
    rmSync(root, { recursive: true });
  });
  execFileSync("git", ["init", "-q", root], { windowsHide: true });
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
        owner: "Git and npm",
        reason: "External installations; tracked JSON remains included.",
      },
    ],
  };
  writeFileSync(
    join(root, ".json-quality.json"),
    JSON.stringify(policy, null, 2) + "\n",
  );
  return root;
}

test("discovery includes hidden, untracked and ignored generated JSON", async (t) => {
  const root = repository(t);
  writeFileSync(join(root, ".gitignore"), "dist/\n");
  mkdirSync(join(root, "dist"));
  writeFileSync(join(root, "dist", "generated.json"), '{"x":9007199254740992}');
  writeFileSync(join(root, ".hidden.json"), "{}\n");
  const result = await runJsonQuality("check", { root });
  assert.equal(result.status, "failed");
  assert.deepEqual(
    result.documents.map((d) => d.path),
    [".hidden.json", ".json-quality.json", "dist/generated.json"],
  );
  assert.ok(
    result.findings.some(
      (f) => f.path === "dist/generated.json" && f.phase === "lint",
    ),
  );
});

test("tracked hidden files rescued from an excluded boundary remain checked and never writable", async (t) => {
  const root = repository(t);
  mkdirSync(join(root, "node_modules"));
  writeFileSync(join(root, ".gitignore"), "node_modules/\n");
  const path = "node_modules/.hidden.json";
  const original = '{"n":1}\n';
  writeFileSync(join(root, path), original);
  execFileSync("git", ["-C", root, "add", "--force", path], {
    windowsHide: true,
  });
  const formatted = await runJsonQuality("format", { root });
  assert.equal(formatted.status, "failed");
  assert.ok(
    formatted.findings.some(
      (finding) => finding.path === path && finding.phase === "presentation",
    ),
  );
  assert.deepEqual(formatted.writes.changed, []);
  assert.equal(readFileSync(join(root, path), "utf8"), original);
  const decomposed = '{"name":"A\\u030a"}\n';
  writeFileSync(join(root, path), decomposed);
  const normalized = await runJsonQuality("lint", { root });
  assert.equal(normalized.status, "failed");
  assert.ok(
    normalized.findings.some(
      (finding) =>
        finding.path === path &&
        finding.ruleId === "json-quality/normalized-strings",
    ),
  );
  assert.deepEqual(normalized.writes.changed, []);
  await assert.rejects(
    runJsonQuality("normalize", { root, sourcePaths: [path] }),
    /Protected or undiscovered JSON source/u,
  );
  assert.equal(readFileSync(join(root, path), "utf8"), decomposed);
});

test(
  "Windows Git casing cannot make a rescued hidden file writable",
  { skip: process.platform !== "win32" },
  async (t) => {
    const root = repository(t);
    mkdirSync(join(root, "node_modules"));
    writeFileSync(join(root, ".gitignore"), "node_modules/\n");
    const actualPath = "node_modules/.hidden.json";
    const trackedPath = "NODE_MODULES/.hidden.json";
    const original = '{"n":1}\n';
    writeFileSync(join(root, actualPath), original);
    const objectId = execFileSync(
      "git",
      ["-C", root, "hash-object", "-w", "--", actualPath],
      { encoding: "utf8", windowsHide: true },
    ).trim();
    execFileSync(
      "git",
      [
        "-C",
        root,
        "update-index",
        "--add",
        "--cacheinfo",
        "100644",
        objectId,
        trackedPath,
      ],
      { windowsHide: true },
    );
    assert.equal(
      execFileSync("git", ["-C", root, "ls-files"], {
        encoding: "utf8",
        windowsHide: true,
      }).trim(),
      trackedPath,
    );
    const result = await runJsonQuality("format", { root });
    assert.equal(result.status, "failed");
    assert.ok(
      result.findings.some(
        (finding) =>
          finding.path === trackedPath && finding.phase === "presentation",
      ),
    );
    assert.deepEqual(result.writes.changed, []);
    assert.equal(readFileSync(join(root, actualPath), "utf8"), original);
  },
);

test("consumer ESLint and formatter configuration cannot weaken checks", async (t) => {
  const root = repository(t);
  writeFileSync(
    join(root, "eslint.config.js"),
    'throw new Error("Consumer configuration executed");',
  );
  writeFileSync(join(root, ".prettierignore"), "**\n");
  writeFileSync(join(root, "data.json"), '{"a":1,"a":2}');
  const result = await runJsonQuality("check", { root });
  assert.equal(result.status, "failed");
  assert.ok(result.findings.some((f) => f.ruleId === "json/no-duplicate-keys"));
});

test("format repairs valid authored bytes with package-owned options", async (t) => {
  const root = repository(t);
  writeFileSync(join(root, "data.json"), '{"z":1.00e+2,"a":[2,1]}');
  const result = await runJsonQuality("format", { root });
  assert.equal(
    readFileSync(join(root, "data.json"), "utf8"),
    '{\n  "z": 1.00e+2,\n  "a": [\n    2,\n    1\n  ]\n}\n',
  );
  assert.deepEqual(result.writes.changed, ["data.json"]);
  assert.equal(result.status, "passed");
});

test("an invalid peer blocks every formatting write", async (t) => {
  const root = repository(t);
  const before = '{"x":1}';
  writeFileSync(join(root, "a.json"), before);
  writeFileSync(join(root, "z.json"), '{"x":1,"x":2}');
  const result = await runJsonQuality("format", { root });
  assert.equal(result.status, "failed");
  assert.equal(readFileSync(join(root, "a.json"), "utf8"), before);
  assert.deepEqual(result.writes.changed, []);
});

test("producer presentation alone protects formatting and normalization writes", async (t) => {
  const root = repository(t);
  const policyPath = join(root, ".json-quality.json");
  const policy = JSON.parse(readFileSync(policyPath, "utf8"));
  policy.exceptions.push({
    paths: ["producer.json"],
    formatContract: "producer-json-compact-body",
    owner: "Fixture producer",
    reason: "Only the producer owns this compact document's presentation.",
  });
  writeFileSync(policyPath, JSON.stringify(policy, null, 2) + "\n");
  const before = '{"x":1}';
  writeFileSync(join(root, "producer.json"), before);
  const result = await runJsonQuality("format", { root });
  assert.equal(result.status, "passed");
  assert.deepEqual(result.writes.changed, []);
  assert.equal(readFileSync(join(root, "producer.json"), "utf8"), before);
  const inventory = await runJsonQuality("inventory", { root });
  assert.equal(
    inventory.documents.find((document) => document.path === "producer.json")
      .contract.allowFormatWrites,
    false,
  );
  await assert.rejects(
    runJsonQuality("normalize", { root, sourcePaths: ["producer.json"] }),
    /protected/iu,
  );
  writeFileSync(join(root, "producer.json"), '{ "x": 1 }');
  const invalid = await runJsonQuality("format", { root });
  assert.equal(invalid.status, "failed");
  assert.deepEqual(invalid.writes.changed, []);
  assert.equal(readFileSync(join(root, "producer.json"), "utf8"), '{ "x": 1 }');
  assert.ok(
    invalid.findings.some(
      (finding) =>
        finding.path === "producer.json" && finding.phase === "presentation",
    ),
  );
});

test("logical inventory is cumulative and rejects lost, duplicate or changed members", async (t) => {
  const root = repository(t);
  const bytes = Buffer.from('{"x":1,"x":2}');
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  writeFileSync(
    join(root, "bundle.json"),
    JSON.stringify({ artifacts: [{ text: bytes.toString() }] }, null, 2) + "\n",
  );
  const logicalInventory = [
    {
      path: "logical/source.json",
      sha256,
      byteLength: bytes.length,
      containerPath: "bundle.json",
      pointer: "/artifacts/0/text",
      encoding: "utf8",
    },
  ];
  const logicalDocuments = [{ path: "logical/source.json", bytes }];
  const result = await runJsonQuality("check", {
    root,
    logicalInventory,
    logicalDocuments,
  });
  assert.equal(result.counts.logical, 1);
  assert.equal(result.counts.physical, 2);
  assert.ok(
    result.findings.some(
      (f) =>
        f.path === "logical/source.json" &&
        f.ruleId === "json/no-duplicate-keys",
    ),
  );
  await assert.rejects(
    runJsonQuality("check", { root, logicalInventory, logicalDocuments: [] }),
    /logical inventory/iu,
  );
  await assert.rejects(
    runJsonQuality("check", {
      root,
      logicalInventory,
      logicalDocuments: [...logicalDocuments, ...logicalDocuments],
    }),
    /logical inventory/iu,
  );
  await assert.rejects(
    runJsonQuality("check", {
      root,
      logicalInventory,
      logicalDocuments: [
        { path: "logical/source.json", bytes: Buffer.from("{}") },
      ],
    }),
    /logical (bytes|provenance)/iu,
  );
});

test("inventory reports scope without claiming JSON validation", async (t) => {
  const root = repository(t);
  writeFileSync(join(root, "broken.json"), '{"x":');
  const result = await runJsonQuality("inventory", { root });
  assert.equal(result.status, "passed");
  assert.deepEqual(result.counts, {
    physical: 2,
    logical: 0,
    native: 0,
    records: null,
    checked: 0,
  });
  assert.ok(
    result.documents.every(
      (document) =>
        document.syntaxValid === null &&
        !document.presentationChecked &&
        document.contract,
    ),
  );
  assert.equal((await runJsonQuality("check", { root })).status, "failed");
  await assert.rejects(
    runJsonQuality("inspect", { root }),
    /Unknown JSON quality operation/u,
  );
});

test("policy and per-invocation limits can be raised or explicitly bypassed", async (t) => {
  const root = repository(t);
  const path = join(root, ".json-quality.json");
  const policy = JSON.parse(readFileSync(path, "utf8"));
  policy.limits = { maxFiles: 1 };
  writeFileSync(path, JSON.stringify(policy, null, 2) + "\n");
  writeFileSync(join(root, "data.json"), "{}\n");
  await assert.rejects(runJsonQuality("check", { root }), /file limit/iu);
  assert.equal(
    (await runJsonQuality("check", { root, limits: { maxFiles: 2000000 } }))
      .status,
    "passed",
  );
  await assert.rejects(
    runJsonQuality("inventory", {
      root,
      limits: { maxFiles: 2, maxFileBytes: 1 },
    }),
    /byte limit/iu,
  );
  assert.equal(
    (await runJsonQuality("check", { root, limits: false })).status,
    "passed",
  );
  policy.limits = false;
  writeFileSync(path, JSON.stringify(policy, null, 2) + "\n");
  writeFileSync(join(root, "data.json"), '{"x":1,"x":2}');
  assert.equal((await runJsonQuality("check", { root })).status, "failed");
  assert.equal(
    (await runJsonQuality("check", { root, limits: false })).status,
    "failed",
  );
});

test("CLI resource overrides enforce the same limits and reject contradictions", (t) => {
  const root = repository(t);
  writeFileSync(join(root, "data.json"), "{}\n");
  const cli = fileURLToPath(new URL("../src/cli.js", import.meta.url));
  const run = (...args) =>
    spawnSync(
      process.execPath,
      [cli, "inventory", "--root", root, "--json", ...args],
      { encoding: "utf8", windowsHide: true },
    );
  const limited = run("--max-files", "1");
  assert.equal(limited.status, 2);
  assert.equal(JSON.parse(limited.stdout).complete, false);
  const raised = run("--max-files", "2000000");
  assert.equal(raised.status, 0, raised.stderr);
  assert.equal(JSON.parse(raised.stdout).counts.physical, 2);
  assert.equal(run("--no-limits").status, 0);
  assert.equal(run("--no-limits", "--max-files", "2").status, 2);
  assert.equal(run("--max-files", "0").status, 2);
  assert.equal(JSON.parse(run("--unknown-option").stdout).status, "error");
});

test("a real document over 32 MiB is admitted only after raising capacity", async (t) => {
  const root = repository(t);
  const bytes = Buffer.alloc(32 * 1024 * 1024 + 1, 0x20);
  bytes[0] = 0x7b;
  bytes[bytes.length - 1] = 0x7d;
  writeFileSync(join(root, "large.json"), bytes);
  await assert.rejects(runJsonQuality("inventory", { root }), /byte limit/iu);
  const result = await runJsonQuality("inventory", {
    root,
    limits: { maxFileBytes: 64 * 1024 * 1024 },
  });
  assert.equal(result.status, "passed");
  assert.equal(result.counts.physical, 2);
  assert.equal(result.counts.checked, 0);
});

test("literal brackets in a JSON filename do not turn it into a tool glob", async (t) => {
  const root = repository(t);
  writeFileSync(join(root, "data[1].json"), '{"x":1}');
  const result = await runJsonQuality("format", { root });
  assert.equal(result.status, "passed");
  assert.deepEqual(result.writes.changed, ["data[1].json"]);
  assert.equal(
    readFileSync(join(root, "data[1].json"), "utf8"),
    '{\n  "x": 1\n}\n',
  );
});

test("normalization rejects malformed UTF-8 without replacing source bytes", async (t) => {
  const root = repository(t);
  const bytes = Buffer.from([
    0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xc3, 0x28, 0x22, 0x7d,
  ]);
  writeFileSync(join(root, "data.json"), bytes);
  await assert.rejects(
    runJsonQuality("normalize", { root, sourcePaths: ["data.json"] }),
    /UTF-8/iu,
  );
  assert.deepEqual(readFileSync(join(root, "data.json")), bytes);
});

test("a later replacement failure reports earlier writes and unprocessed files truthfully", async (t) => {
  const root = repository(t);
  const before = '{"x":1}';
  for (const path of ["a.json", "b.json", "c.json"])
    writeFileSync(join(root, path), before);
  const rename = fs.renameSync;
  t.mock.method(fs, "renameSync", (from, to) => {
    if (to === join(root, "b.json"))
      throw new Error("Injected second-file replacement failure");
    return rename(from, to);
  });
  syncBuiltinESMExports();
  let result;
  try {
    result = await runJsonQuality("format", { root });
  } finally {
    t.mock.restoreAll();
    syncBuiltinESMExports();
  }
  assert.equal(result.status, "failed");
  assert.equal(result.complete, false);
  assert.deepEqual(result.writes.changed, ["a.json"]);
  assert.deepEqual(result.writes.failed, ["b.json"]);
  assert.deepEqual(result.writes.unprocessed, ["c.json"]);
  assert.equal(readFileSync(join(root, "a.json"), "utf8"), '{\n  "x": 1\n}\n');
  assert.equal(readFileSync(join(root, "b.json"), "utf8"), before);
  assert.equal(readFileSync(join(root, "c.json"), "utf8"), before);
  assert.ok(fs.readdirSync(root).every((path) => !path.endsWith(".tmp")));
});

test("JSONL scope reports its single-line producer contract without per-file classification", async (t) => {
  const root = repository(t);
  writeFileSync(join(root, "records.jsonl"), "{}\n{}\n");
  const result = await runJsonQuality("inventory", { root });
  assert.equal(
    result.documents.find((document) => document.path === "records.jsonl")
      .contract.formatContract,
    "producer-json-compact-body",
  );
});

test("unknown JSONL record coverage is null rather than an invented zero", async (t) => {
  const root = repository(t);
  writeFileSync(join(root, "records.jsonl"), Buffer.from([0xff]));
  const result = await runJsonQuality("check", { root });
  assert.equal(result.status, "failed");
  assert.equal(
    result.documents.find((document) => document.path === "records.jsonl")
      .recordCount,
    null,
  );
  assert.equal(result.counts.records, null);
  assert.equal(result.counts.checked, null);
});

test("inventory does not read ordinary document contents", async (t) => {
  const root = repository(t);
  const path = join(root, "data.json");
  writeFileSync(path, "{}\n");
  const read = fs.readFileSync;
  t.mock.method(fs, "readFileSync", (...args) => {
    if (args[0] === path)
      throw new Error("Unexpected document read during scope inventory");
    return read(...args);
  });
  syncBuiltinESMExports();
  try {
    assert.equal(
      (await runJsonQuality("inventory", { root })).status,
      "passed",
    );
  } finally {
    t.mock.restoreAll();
    syncBuiltinESMExports();
  }
});

test("expected container diagnostics require complete logical linkage", async (t) => {
  const root = repository(t);
  const bytes = Buffer.from('{\n  "x": "\uFDD0"\n}\n');
  const containerBytes = Buffer.from(
    JSON.stringify({ artifacts: [{ text: bytes.toString() }] }, null, 2) + "\n",
  );
  writeFileSync(join(root, "bundle.json"), containerBytes);
  const hash = (value) => createHash("sha256").update(value).digest("hex");
  const member = {
    path: "logical/source.json",
    sha256: hash(bytes),
    byteLength: bytes.length,
    containerPath: "bundle.json",
    pointer: "/artifacts/0/text",
    encoding: "utf8",
  };
  const policyPath = join(root, ".json-quality.json");
  const policy = JSON.parse(readFileSync(policyPath, "utf8"));
  const container = await checkJsonDocument(containerBytes, {
    path: "bundle.json",
  });
  // The native indentation fixture places the 24-character encoded string at
  // columns 15..38. Its decoded value contains the independently chosen U+FDD0.
  const containerDiagnostics = [
    {
      phase: "lint",
      ruleId: "json-quality/interoperability",
      messageId: "noncharacter",
      line: 4,
      column: 15,
      endLine: 4,
      endColumn: 39,
    },
  ];
  assert.deepEqual(
    container.findings.map(({ path: _path, ...finding }) => finding),
    containerDiagnostics,
  );
  policy.exceptions.push({
    paths: ["bundle.json"],
    allowFormatWrites: false,
    owner: "Negative-vector oracle",
    reason:
      "Preserve the independently pinned negative source through its actual container string.",
    expected: {
      sha256: hash(containerBytes),
      byteLength: containerBytes.length,
      diagnostics: containerDiagnostics,
      linkedDocuments: [
        {
          path: member.path,
          pointer: member.pointer,
          encoding: member.encoding,
          sha256: member.sha256,
          byteLength: member.byteLength,
        },
      ],
    },
  });
  policy.exceptions.push({
    paths: [member.path],
    allowFormatWrites: false,
    owner: "Negative-vector oracle",
    reason: "The fixture intentionally contains U+FDD0.",
    expected: {
      sha256: hash(bytes),
      byteLength: bytes.length,
      diagnostics: [
        {
          phase: "lint",
          ruleId: "json-quality/interoperability",
          messageId: "noncharacter",
          line: 2,
          column: 8,
          endLine: 2,
          endColumn: 11,
        },
      ],
    },
  });
  writeFileSync(policyPath, JSON.stringify(policy, null, 2) + "\n");
  await assert.rejects(
    runJsonQuality("check", { root }),
    /required logical document/iu,
  );
  const logicalInventory = [member],
    logicalDocuments = [{ path: member.path, bytes }];
  const result = await runJsonQuality("check", {
    root,
    logicalInventory,
    logicalDocuments,
  });
  assert.equal(result.status, "passed");
  assert.equal(result.counts.logical, 1);
  assert.equal(
    result.documents.reduce(
      (sum, document) => sum + document.expectedFindings.length,
      0,
    ),
    2,
  );
  await assert.rejects(
    checkJsonDocument(containerBytes, {
      ...policy.exceptions.at(-2),
      path: "bundle.json",
    }),
    /logical linkage/iu,
  );
  const changedPolicy = structuredClone(policy);
  changedPolicy.exceptions.at(-2).expected.linkedDocuments[0].pointer =
    "/artifacts/0/absent";
  writeFileSync(policyPath, JSON.stringify(changedPolicy, null, 2) + "\n");
  await assert.rejects(
    runJsonQuality("check", { root, logicalInventory, logicalDocuments }),
    /logical linkage/iu,
  );
});

test("public CLI adapters retain required outputs, resource flags and a fixed repository root", (t) => {
  const root = repository(t);
  const api = new URL("../src/index.js", import.meta.url).href;
  const invoke = (args) =>
    spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import { runJsonQualityCli } from ${JSON.stringify(api)}; process.exitCode = await runJsonQualityCli(${JSON.stringify(args)}, {root:${JSON.stringify(root)}, requiredOutputs:["generated/*.json"]});`,
      ],
      { encoding: "utf8", windowsHide: true },
    );
  const absent = invoke(["check", "--json"]);
  assert.equal(absent.status, 2);
  assert.equal(JSON.parse(absent.stdout).complete, false);
  mkdirSync(join(root, "generated"));
  writeFileSync(join(root, "generated/output.json"), "{}\n");
  const present = invoke(["check", "--json", "--max-files", "10"]);
  assert.equal(present.status, 0, present.stderr);
  assert.equal(JSON.parse(present.stdout).counts.physical, 2);
  const escape = invoke(["check", "--json", "--root", tmpdir()]);
  assert.equal(escape.status, 2);
  assert.equal(JSON.parse(escape.stdout).counts, null);
});

test("trusted asynchronous CLI context failures retain the public machine error envelope", () => {
  const api = new URL("../src/index.js", import.meta.url).href;
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import {runJsonQualityCli} from ${JSON.stringify(api)}; process.exitCode = await runJsonQualityCli(["check", "--json"], async () => { throw new Error("Native corpus verification failed"); });`,
    ],
    { encoding: "utf8", windowsHide: true },
  );
  assert.equal(result.status, 2);
  assert.equal(JSON.parse(result.stdout).operation, "check");
  assert.equal(JSON.parse(result.stdout).complete, false);
  assert.equal(JSON.parse(result.stdout).counts, null);
});

test("CLI argument admission precedes trusted context loading and validates its returned shape", (t) => {
  const root = repository(t);
  const api = new URL("../src/index.js", import.meta.url).href;
  const invoke = (args, body) =>
    spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import {runJsonQualityCli} from ${JSON.stringify(api)}; process.exitCode = await runJsonQualityCli(${JSON.stringify(args)}, async () => {${body}});`,
      ],
      { encoding: "utf8", windowsHide: true },
    );
  const invalid = invoke(
    ["invalid", "--json"],
    'console.error("CONTEXT_LOADED"); return {};',
  );
  assert.equal(invalid.status, 2);
  assert(!invalid.stderr.includes("CONTEXT_LOADED"));
  const good = invoke(
    ["check", "--json"],
    `return {root:${JSON.stringify(root)}};`,
  );
  assert.equal(good.status, 0, good.stderr);
  assert.equal(JSON.parse(good.stdout).complete, true);
  const unknown = invoke(["check", "--json"], "return {unexpected:true};");
  assert.equal(unknown.status, 2);
});
