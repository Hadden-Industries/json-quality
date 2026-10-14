// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { runJsonQuality, validateJsonQualityResult } from "../src/index.js";

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
function fixture(t, archive = false) {
  const root = mkdtempSync(join(tmpdir(), "json-quality-native-"));
  t.after(() => {
    assert.ok(root.startsWith(tmpdir() + sep + "json-quality-native-"));
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
        id: "evidence",
        provider: "owner",
        owner: "Native fixture owner",
        reason: "Independent native census.",
      },
    ],
  };
  const savePolicy = () =>
    writeFileSync(
      join(root, ".json-quality.json"),
      JSON.stringify(policy, null, 2) + "\n",
    );
  savePolicy();
  const identity = (path, bytes) => ({
    path,
    sha256: digest(bytes),
    byteLength: bytes.length,
  });
  const bytes = Buffer.from('{"a":1}\n');
  const authorityBytes = Buffer.from("independent manifest");
  const authority = identity("manifest.txt", authorityBytes);
  writeFileSync(join(root, authority.path), authorityBytes);
  const sourceBytes = archive
    ? Buffer.from("native archive independently verified by its owner")
    : bytes;
  const source = {
    ...identity(archive ? "evidence.tgz" : "evidence.blob", sourceBytes),
    kind: archive ? "archive-member" : "content-addressed",
    ...(archive ? { memberPath: "package/member.json" } : {}),
  };
  writeFileSync(join(root, source.path), sourceBytes);
  const path = archive ? `${source.path}!/${source.memberPath}` : source.path;
  const supplied = {
    inventory: [{ ...identity(path, bytes), source }],
    documents: [{ path, bytes }],
    authorities: [authority],
  };
  return {
    root,
    policy,
    savePolicy,
    supplied,
    source,
    path,
    options: { root, nativeProviders: { owner: async () => supplied } },
  };
}

for (const archive of [false, true]) {
  test(`public operation checks ${archive ? "archive members" : "content-addressed JSON"} with distinct coverage`, async (t) => {
    const { options, path } = fixture(t, archive);
    const result = await runJsonQuality("check", options);
    assert.equal(result.schemaVersion, 2);
    assert.equal(result.status, "failed"); // unformatted native bytes remain protected
    assert.equal(result.counts.native, 1);
    assert.equal(result.counts.physical, 1);
    assert.equal(result.counts.checked, 2);
    const document = result.documents.find((d) => d.path === path);
    assert.equal(document.representation, "native");
    assert.equal(document.contract.allowFormatWrites, false);
    assert.equal(document.findings[0].phase, "presentation");
    const inventory = await runJsonQuality("inventory", options);
    assert.equal(inventory.counts.checked, 0);
    assert.equal(
      inventory.documents.find((d) => d.path === path).syntaxValid,
      null,
    );
    assert.equal(inventory.nativeSources[0].inventoried, 1);
    assert.throws(() =>
      validateJsonQualityResult({ ...result, schemaVersion: 1 }),
    );
    const forged = structuredClone(result);
    forged.nativeSources[0].included = 0;
    assert.throws(() => validateJsonQualityResult(forged));
  });
}

const badViews = [
  ["missing member", (f) => f.supplied.documents.pop()],
  ["missing census", (f) => f.supplied.inventory.pop()],
  [
    "empty census",
    (f) => {
      f.supplied.documents = [];
      f.supplied.inventory = [];
    },
  ],
  [
    "changed member",
    (f) => {
      f.supplied.documents[0].bytes = Buffer.from('{"a":2}\n');
    },
  ],
  [
    "unexpected member",
    (f) => {
      f.supplied.documents[0].path = "unexpected.blob";
    },
  ],
  [
    "missing authority",
    (f) => {
      f.supplied.authorities = [];
    },
  ],
  [
    "changed authority",
    (f) => writeFileSync(join(f.root, "manifest.txt"), "independent manifesz"),
  ],
  [
    "changed source",
    (f) => writeFileSync(join(f.root, f.source.path), '{"a":2}\n'),
  ],
  [
    "detached source",
    (f) => {
      f.supplied.inventory[0].sha256 = "a".repeat(64);
    },
  ],
  [
    "undeclared provider",
    (f) => {
      f.options.nativeProviders.extra = async () => f.supplied;
    },
  ],
  [
    "missing provider",
    (f) => {
      f.options.nativeProviders = {};
    },
  ],
  [
    "duplicate source id",
    (f) => {
      f.policy.nativeSources.push({ ...f.policy.nativeSources[0] });
      f.savePolicy();
    },
  ],
];
for (const [name, mutate] of badViews) {
  test(`${name} cannot claim coverage or allow an authored write`, async (t) => {
    const f = fixture(t);
    writeFileSync(join(f.root, "authored.json"), '{"x":1}');
    const before = readFileSync(join(f.root, "authored.json"));
    mutate(f);
    await assert.rejects(runJsonQuality("format", f.options));
    assert.deepEqual(readFileSync(join(f.root, "authored.json")), before);
  });
}

test("archive member traversal and detached member identity are rejected", async (t) => {
  const f = fixture(t, true);
  f.supplied.inventory[0].source.memberPath = "../member.json";
  await assert.rejects(runJsonQuality("check", f.options));
});

test("native census includes excluded members and still verifies their bytes", async (t) => {
  const f = fixture(t, true);
  f.policy.exceptions.push({
    paths: [f.path],
    exclude: true,
    owner: "Approved native owner",
    reason: "Exact external fixture boundary.",
  });
  f.savePolicy();
  const result = await runJsonQuality("check", f.options);
  assert.equal(result.status, "passed");
  assert.equal(result.counts.native, 0);
  assert.equal(result.nativeSources[0].inventoried, 1);
  assert.deepEqual(result.nativeSources[0].excluded, [f.path]);
  f.supplied.documents[0].bytes[1] ^= 1;
  await assert.rejects(
    runJsonQuality("check", f.options),
    /Changed native JSON member/u,
  );
});

test("an explicitly empty native scope still requires a verified authority", async (t) => {
  const f = fixture(t);
  f.policy.nativeSources[0].minimumDocuments = 0;
  f.supplied.documents = [];
  f.supplied.inventory = [];
  f.savePolicy();
  assert.equal((await runJsonQuality("check", f.options)).status, "passed");
  f.supplied.authorities = [];
  await assert.rejects(runJsonQuality("check", f.options));
});

test("later native providers cannot mutate previously admitted source or policy", async (t) => {
  const f = fixture(t);
  f.policy.nativeSources.push({
    id: "second",
    provider: "later",
    owner: "Other owner",
    reason: "Mutation probe.",
    minimumDocuments: 0,
  });
  f.savePolicy();
  f.options.nativeProviders.later = async () => {
    writeFileSync(join(f.root, f.source.path), '{"a":2}\n');
    return {
      inventory: [],
      documents: [],
      authorities: f.supplied.authorities,
    };
  };
  await assert.rejects(runJsonQuality("check", f.options), /changed/iu);
  writeFileSync(join(f.root, f.source.path), f.supplied.documents[0].bytes);
  f.options.nativeProviders.later = async () => {
    writeFileSync(join(f.root, ".json-quality.json"), "{}\n");
    return {
      inventory: [],
      documents: [],
      authorities: f.supplied.authorities,
    };
  };
  await assert.rejects(runJsonQuality("check", f.options), /changed/iu);
});

test("native byte, document and diagnostic budgets fail closed", async (t) => {
  const f = fixture(t);
  await assert.rejects(
    runJsonQuality("check", {
      ...f.options,
      limits: { maxLogicalDocuments: 1, maxTotalBytes: 1 },
    }),
  );
  await assert.rejects(
    runJsonQuality("check", { ...f.options, limits: { maxFileBytes: 1 } }),
  );
  const second = structuredClone(f.supplied.inventory[0]);
  second.path = "other.blob";
  second.source.path = "other.blob";
  writeFileSync(join(f.root, "other.blob"), f.supplied.documents[0].bytes);
  f.supplied.inventory.push(second);
  f.supplied.documents.push({
    path: second.path,
    bytes: f.supplied.documents[0].bytes,
  });
  await assert.rejects(
    runJsonQuality("check", {
      ...f.options,
      limits: { maxLogicalDocuments: 1 },
    }),
  );
  await assert.rejects(
    runJsonQuality("check", { ...f.options, limits: { maxDiagnostics: 1 } }),
    /diagnostic/iu,
  );
});

test("standalone CLI cannot silently omit a configured native source", (t) => {
  const f = fixture(t);
  const response = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL("../src/cli.js", import.meta.url)),
      "check",
      "--root",
      f.root,
      "--json",
    ],
    { encoding: "utf8", windowsHide: true },
  );
  assert.equal(response.status, 2);
  const result = validateJsonQualityResult(JSON.parse(response.stdout));
  assert.equal(result.complete, false);
  assert.equal(result.counts, null);
});
