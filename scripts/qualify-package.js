// SPDX-License-Identifier: AGPL-3.0-only
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  realpathSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { packCandidate } from "./pack.js";

const directory = mkdtempSync(join(tmpdir(), "json-quality-transport-"));
const npm = process.env.npm_execpath;
if (!npm) throw new Error("Run qualification through npm.");
try {
  const { archive, provenance } = packCandidate(join(directory, "archives"));
  const consumer = join(directory, "consumer");
  const fixture = join(directory, "fixture");
  mkdirSync(consumer);
  mkdirSync(fixture);
  writeFileSync(
    join(consumer, "package.json"),
    JSON.stringify(
      {
        private: true,
        type: "module",
        dependencies: { [provenance.name]: `file:${archive}` },
      },
      null,
      2,
    ) + "\n",
  );
  execFileSync(
    process.execPath,
    [npm, "install", "--ignore-scripts", "--no-audit", "--no-fund"],
    { cwd: consumer, windowsHide: true, timeout: 180000 },
  );
  execFileSync("git", ["init", "-q", fixture], { windowsHide: true });
  writeFileSync(
    join(fixture, ".json-quality.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        defaults: {
          formatContract: "prettier-json",
          allowFormatWrites: true,
          normalization: "NFC",
        },
        exceptions: [
          {
            paths: [".git/**"],
            exclude: true,
            owner: "Git",
            reason: "External Git metadata; tracked JSON remains checked.",
          },
        ],
      },
      null,
      2,
    ) + "\n",
  );
  writeFileSync(join(fixture, "source.json"), "{}\n");
  writeFileSync(
    join(consumer, "probe.mjs"),
    `import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import * as api from "@hadden-industries/json-quality";
import plugin from "@hadden-industries/json-quality/eslint";
import configuration from "@hadden-industries/json-quality/configuration-schema" with { type: "json" };
import resultSchema from "@hadden-industries/json-quality/result-schema" with { type: "json" };
assert.equal(configuration.properties.schemaVersion.const, 1);
assert.equal(resultSchema.properties.schemaVersion.const, 3);
assert.equal(typeof plugin.rules["no-json-stringify-identity"].create, "function");
assert.equal(api.validateJsonQualityResult(await api.runJsonQuality("check", {root: process.argv[2]})).status, "passed");
assert.equal(await api.formatJsonValue({x: 1}), '{\\n  "x": 1\\n}\\n');
assert.match(await api.formatJsonSource('{"x":1.00e+2}'), /1\\.00e\\+2/u);
const root = process.argv[2];
const policyPath = join(root, ".json-quality.json");
const originalPolicy = readFileSync(policyPath);
const policy = JSON.parse(originalPolicy);
policy.nativeSources = [{id: "evidence", provider: "owner", owner: "Native evidence owner", reason: "Transported census proof."}];
policy.preserveSourcePresentation = [{paths:["native.blob"], owner:"Original source owner", reason:"Transported original presentation admission."}];
writeFileSync(policyPath, await api.formatJsonValue(policy));
const bytes = Buffer.from(' { "x": 1 }\\r\\n');
const identity = {path: "native.blob", byteLength: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex")};
writeFileSync(join(root, identity.path), bytes);
const nativeProviders = {owner: async () => ({
  inventory: [{...identity, source: {...identity, kind: "content-addressed"}}],
  documents: [{path: identity.path, bytes}], authorities: [identity]
})};
const native = await api.runJsonQuality("check", {root, nativeProviders});
assert.equal(native.status, "passed");
assert.equal(native.counts.native, 1);
assert.equal(native.nativeSources[0].inventoried, 1);
assert.equal(native.documents.find(d => d.representation === "native").presentationChecked, false);
assert.equal(native.documents.find(d => d.representation === "native").contract.formatContract, "preserved-bytes");
await assert.rejects(api.runJsonQuality("check", {root}), /Missing required native provider/u);
writeFileSync(policyPath, originalPolicy);
await assert.rejects(import("@hadden-industries/json-quality/src/quality.js"), {code:"ERR_PACKAGE_PATH_NOT_EXPORTED"});
`,
  );
  execFileSync(process.execPath, [join(consumer, "probe.mjs"), fixture], {
    cwd: consumer,
    windowsHide: true,
    timeout: 120000,
  });
  const cli = join(
    consumer,
    "node_modules",
    "@hadden-industries",
    "json-quality",
    "src",
    "cli.js",
  );
  const result = JSON.parse(
    execFileSync(
      process.execPath,
      [cli, "check", "--root", fixture, "--json"],
      { cwd: consumer, windowsHide: true, encoding: "utf8", timeout: 120000 },
    ),
  );
  if (result.status !== "passed" || result.counts.physical !== 2)
    throw new Error("Transported CLI coverage failed.");
  const formatting = JSON.parse(
    execFileSync(
      process.execPath,
      [cli, "format", "--check", "--root", fixture, "--json"],
      { cwd: consumer, windowsHide: true, encoding: "utf8", timeout: 120000 },
    ),
  );
  if (
    formatting.status !== "passed" ||
    formatting.counts.physical !== 2 ||
    formatting.writes.changed.length !== 0
  )
    throw new Error("Transported format --check coverage failed.");
  const lock = JSON.parse(readFileSync(join(consumer, "package-lock.json")));
  if (
    lock.packages["node_modules/@hadden-industries/json-quality"].integrity !==
    provenance.integrity
  )
    throw new Error("Installed archive integrity differs.");
  process.stdout.write(
    JSON.stringify({
      status: "passed",
      sourceCommit: provenance.sourceCommit,
      archiveSha256: provenance.sha256,
      publicExports: 4,
      cliPhysicalFiles: 2,
    }) + "\n",
  );
  const resolved = realpathSync(directory);
  if (
    !resolved.startsWith(
      realpathSync(tmpdir()) + sep + "json-quality-transport-",
    )
  )
    throw new Error("Unsafe qualification cleanup path.");
  rmSync(resolved, { recursive: true });
} catch (error) {
  process.stderr.write(
    `Qualification failed; retained disposable inputs at ${directory}\n`,
  );
  throw error;
}
