// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import {
  runJsonQuality,
  formatJsonValue,
  checkJsonDocument,
} from "../src/index.js";

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function fixture(t, bytes = Buffer.from(' { "n": 1 }\r\n')) {
  const root = mkdtempSync(join(tmpdir(), "json-quality-source-presentation-"));
  t.after(() => {
    assert.ok(
      root.startsWith(tmpdir() + sep + "json-quality-source-presentation-"),
    );
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
        paths: [".git/**"],
        exclude: true,
        owner: "Git",
        reason: "External state.",
      },
    ],
    nativeSources: [
      {
        id: "originals",
        provider: "owner",
        owner: "Native owner",
        reason: "Independent original source admission.",
      },
    ],
    preserveSourcePresentation: [
      {
        paths: ["original.blob"],
        owner: "Original source owner",
        reason: "Original presentation bound to native census.",
      },
    ],
  };
  const save = async () =>
    writeFileSync(
      join(root, ".json-quality.json"),
      await formatJsonValue(policy),
    );
  await save();
  writeFileSync(join(root, "original.blob"), bytes);
  const identity = {
    path: "original.blob",
    sha256: digest(bytes),
    byteLength: bytes.length,
  };
  const supplied = {
    inventory: [
      { ...identity, source: { ...identity, kind: "content-addressed" } },
    ],
    documents: [{ path: identity.path, bytes }],
    authorities: [identity],
  };
  return {
    root,
    policy,
    save,
    bytes,
    identity,
    supplied,
    options: { root, nativeProviders: { owner: async () => supplied } },
  };
}

test("source presentation is retained only after complete native admission", async (t) => {
  const f = await fixture(t);
  const result = await runJsonQuality("check", f.options);
  assert.equal(result.status, "passed");
  const document = result.documents.find((d) => d.representation === "native");
  assert.equal(document.presentationChecked, false);
  assert.equal(document.contract.formatContract, "preserved-bytes");
  assert.equal(document.contract.allowFormatWrites, false);
  assert.equal(
    document.contract.exceptions.at(-1).owner,
    "Original source owner",
  );
  f.supplied.documents[0].bytes = Buffer.from(f.bytes);
  f.supplied.documents[0].bytes[1] ^= 1;
  await assert.rejects(runJsonQuality("check", f.options));
  await assert.rejects(runJsonQuality("check", { root: f.root }));
});

test("source retention checks semantic differences and blocks every repair write", async (t) => {
  const f = await fixture(t, Buffer.from('{"n":9007199254740992}\r\n'));
  writeFileSync(join(f.root, "authored.json"), '{"x":1}');
  const before = readFileSync(join(f.root, "authored.json"));
  const result = await runJsonQuality("format", f.options);
  assert.equal(result.status, "failed");
  assert.ok(result.findings.some((f) => f.ruleId === "json/no-unsafe-values"));
  assert.deepEqual(result.writes.changed, []);
  assert.deepEqual(readFileSync(join(f.root, "authored.json")), before);
});

test("source presentation cannot hide an ordinary physical presentation finding", async (t) => {
  const f = await fixture(t);
  f.policy.preserveSourcePresentation[0].paths = ["**/*"];
  await f.save();
  writeFileSync(join(f.root, "ordinary.json"), '{"x":1}');
  const result = await runJsonQuality("check", f.options);
  assert.ok(
    result.findings.some(
      (f) => f.path === "ordinary.json" && f.phase === "presentation",
    ),
  );
});

test("original presentation retains only separately pinned exact semantic diagnostics", async (t) => {
  const f = await fixture(t, Buffer.from('{"n":9007199254740992}\r\n'));
  const first = await checkJsonDocument(f.bytes, { path: f.identity.path });
  const diagnostics = first.findings
    .filter((finding) => finding.phase !== "presentation")
    .map(({ path: _path, ...finding }) => finding);
  assert.equal(diagnostics.length, 1);
  f.policy.exceptions.push({
    paths: [f.identity.path],
    owner: "Conformance owner",
    reason: "Exact original negative fixture.",
    allowFormatWrites: false,
    expected: {
      sha256: f.identity.sha256,
      byteLength: f.identity.byteLength,
      diagnostics,
    },
  });
  await f.save();
  const admitted = await runJsonQuality("check", f.options);
  assert.equal(admitted.status, "passed");
  assert.equal(
    admitted.documents.find((document) => document.representation === "native")
      .expectedFindings.length,
    1,
  );
  f.policy.exceptions.at(-1).expected.diagnostics = [];
  await f.save();
  assert.equal((await runJsonQuality("check", f.options)).status, "failed");
});

test("stale source selection and unsafe patterns fail before scope reporting", async (t) => {
  const f = await fixture(t);
  f.policy.preserveSourcePresentation[0].paths = ["missing/**/*.json"];
  await f.save();
  await assert.rejects(
    runJsonQuality("inventory", f.options),
    /Missing independently/u,
  );
  f.policy.preserveSourcePresentation[0].paths = ["../**"];
  await f.save();
  await assert.rejects(runJsonQuality("inventory", f.options), /Unsafe/u);
});

test("logical originals retain presentation only after physical-pointer and byte linkage", async (t) => {
  const f = await fixture(t);
  delete f.policy.nativeSources;
  f.policy.preserveSourcePresentation[0].paths = ["logical/*.json"];
  await f.save();
  writeFileSync(
    join(f.root, "corpus.json"),
    await formatJsonValue({ source: f.bytes.toString("utf8") }),
  );
  const logicalInventory = [
    {
      path: "logical/original.json",
      containerPath: "corpus.json",
      pointer: "/source",
      encoding: "utf8",
      sha256: digest(f.bytes),
      byteLength: f.bytes.length,
    },
  ];
  const options = {
    root: f.root,
    logicalInventory,
    logicalDocuments: [{ path: logicalInventory[0].path, bytes: f.bytes }],
  };
  const result = await runJsonQuality("check", options);
  assert.equal(result.status, "passed");
  assert.equal(result.counts.logical, 1);
  assert.equal(
    result.documents.find((d) => d.representation === "logical")
      .presentationChecked,
    false,
  );
  writeFileSync(
    join(f.root, "corpus.json"),
    await formatJsonValue({ source: "changed" }),
  );
  await assert.rejects(runJsonQuality("check", options), /provenance/u);
});

test("narrow NFC pins coexist with exact original presentation while other values stay checked", async (t) => {
  const f = await fixture(t, Buffer.from('{"value":"e\u0301"}\r\n'));
  const value = Buffer.from("e\u0301");
  f.policy.exceptions.push({
    paths: [f.identity.path],
    owner: "Original Unicode owner",
    reason: "Exact approved boundary value.",
    allowFormatWrites: false,
    preserveNfcValues: [
      { pointer: "/value", sha256: digest(value), byteLength: value.length },
    ],
  });
  await f.save();
  assert.equal((await runJsonQuality("check", f.options)).status, "passed");
  f.policy.exceptions.pop();
  await f.save();
  const result = await runJsonQuality("check", f.options);
  assert.equal(result.status, "failed");
  assert.ok(result.findings.some((f) => f.messageId === "unnormalized"));
});
