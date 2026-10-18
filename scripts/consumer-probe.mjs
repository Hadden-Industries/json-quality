// SPDX-License-Identifier: AGPL-3.0-only
// Executed only after being copied into the real transported consumer.
import assert from "node:assert/strict";
import {
  writeFileSync,
  readFileSync,
  mkdirSync,
  rmSync,
  rmdirSync,
} from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import * as api from "@hadden-industries/json-quality";
import plugin from "@hadden-industries/json-quality/eslint";

const root = process.argv[2];
const policyPath = join(root, ".json-quality.json");
const original = readFileSync(policyPath);
const policy = JSON.parse(original);
const run = (operation, options = {}) =>
  api.runJsonQuality(operation, { root, ...options });
try {
  assert.equal(api.checkJsonDocument instanceof Function, true);
  for (const text of [
    '{"a":1,"\\u0061":2}',
    '{"x":9007199254740992}',
    '{"x":"\\ud800"}',
  ])
    assert.ok(
      (await api.checkJsonDocument(Buffer.from(text))).findings.some(
        (f) => f.phase !== "presentation",
      ),
    );
  const numeric = '{"x":1.00e+2,"label":"café"}';
  writeFileSync(join(root, "source.json"), numeric);
  const before = readFileSync(join(root, "source.json"));
  assert.equal((await run("format", { check: true })).status, "failed");
  assert.deepEqual(readFileSync(join(root, "source.json")), before);
  assert.equal((await run("format")).status, "passed");
  assert.match(readFileSync(join(root, "source.json"), "utf8"), /1\.00e\+2/u);
  assert.match(readFileSync(join(root, "source.json"), "utf8"), /café/u);
  writeFileSync(join(root, "source.json"), '{"x":1.00e+2,"label":"e\\u0301"}');
  assert.equal(
    (await run("normalize", { files: ["source.json"] })).status,
    "passed",
  );
  assert.match(readFileSync(join(root, "source.json"), "utf8"), /é/u);
  // Normalization intentionally does not repair presentation.
  assert.equal((await run("format", { check: true })).status, "failed");
  assert.equal((await run("format")).status, "passed");
  const normalized = readFileSync(join(root, "source.json"));
  assert.equal((await run("check")).status, "passed");
  assert.deepEqual(readFileSync(join(root, "source.json")), normalized);

  policy.exceptions.push({
    paths: ["protected/**"],
    allowFormatWrites: false,
    owner: "Fixture owner",
    reason: "Protected source preservation.",
  });
  writeFileSync(policyPath, await api.formatJsonValue(policy));
  mkdirSync(join(root, "protected"));
  const protectedBytes = Buffer.from('{"x":1}');
  writeFileSync(join(root, "protected", "data.json"), protectedBytes);
  const inventory = await run("inventory");
  assert.equal(inventory.status, "passed");
  assert.ok(
    inventory.documents.some(
      (document) => document.path === "protected/data.json",
    ),
  );
  await run("format");
  assert.deepEqual(
    readFileSync(join(root, "protected", "data.json")),
    protectedBytes,
  );
  rmSync(join(root, "protected", "data.json"));
  rmdirSync(join(root, "protected"));
  writeFileSync(policyPath, original);

  const collision = Buffer.from('{"é":1,"e\\u0301":2}');
  writeFileSync(join(root, "source.json"), collision);
  await assert.rejects(
    run("normalize", { files: ["source.json"] }),
    /NFC would create duplicate keys/u,
  );
  assert.deepEqual(readFileSync(join(root, "source.json")), collision);
  writeFileSync(join(root, "source.json"), "{}\n");

  const require = createRequire(import.meta.url);
  const { ESLint } = require("eslint");
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        plugins: { "json-quality": plugin },
        rules: { "json-quality/no-json-stringify-identity": "error" },
      },
    ],
  });
  const [lint] = await eslint.lintText(
    "JSON.stringify(a) === JSON.stringify(b);",
    { filePath: "fixture.js" },
  );
  assert.ok(
    lint.messages.some(
      (message) => message.ruleId === "json-quality/no-json-stringify-identity",
    ),
  );
  const cli = join(
    process.cwd(),
    "node_modules",
    "@hadden-industries",
    "json-quality",
    "src",
    "cli.js",
  );
  const result = JSON.parse(
    execFileSync(
      process.execPath,
      [cli, "inventory", "--root", root, "--json"],
      { windowsHide: true, encoding: "utf8" },
    ),
  );
  assert.equal(result.status, "passed");
  assert.equal(result.counts.physical, 2);
} finally {
  writeFileSync(policyPath, original);
}
