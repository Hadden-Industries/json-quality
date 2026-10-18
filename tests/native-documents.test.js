// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { temporaryRepository } from "./temporary-repository.js";
import { fileURLToPath } from "node:url";
import { runJsonQuality, validateJsonQualityResult } from "../src/index.js";

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
function fixture(t, archive = false) {
  const root = temporaryRepository(t, "json-quality-native-");
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
    assert.equal(result.schemaVersion, 4);
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
      capacityLimits: { maxLogicalDocuments: 1, maxTotalBytes: 1 },
    }),
  );
  await assert.rejects(
    runJsonQuality("check", {
      ...f.options,
      capacityLimits: { maxFileBytes: 1 },
    }),
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
      capacityLimits: { maxLogicalDocuments: 1 },
    }),
  );
  await assert.rejects(
    runJsonQuality("check", {
      ...f.options,
      capacityLimits: { maxDiagnostics: 1 },
    }),
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

test("native JSON authority manifests are protected before formatting and normalization", async (t) => {
  const f = fixture(t);
  f.policy.nativeSources[0].formatContract = "producer-json-compact";
  f.savePolicy();
  const bytes = Buffer.from('{"authority":"e\\u0301"}\n');
  const identity = {
    path: "authority.json",
    sha256: digest(bytes),
    byteLength: bytes.length,
  };
  writeFileSync(join(f.root, identity.path), bytes);
  f.supplied.authorities.push(identity);
  writeFileSync(join(f.root, "authored.json"), '{"x":1}');
  const inventory = await runJsonQuality("inventory", f.options);
  const authority = inventory.documents.find(
    (document) => document.path === identity.path,
  );
  assert.equal(authority.contract.allowFormatWrites, false);
  assert.match(authority.contract.exceptions.at(-1).reason, /snapshot/u);
  const result = await runJsonQuality("format", f.options);
  assert.equal(result.status, "failed");
  assert.deepEqual(result.writes.changed, []);
  assert.deepEqual(readFileSync(join(f.root, identity.path)), bytes);
  await assert.rejects(
    runJsonQuality("normalize", { ...f.options, files: [identity.path] }),
    /Protected/u,
  );
});

test("reported native authority metadata is the copy captured at admission", async (t) => {
  const f = fixture(t);
  const original = structuredClone(f.supplied.authorities[0]);
  const bytes = f.supplied.documents[0].bytes;
  Object.defineProperty(f.supplied.documents[0], "bytes", {
    enumerable: true,
    get() {
      f.supplied.authorities[0].sha256 = "0".repeat(64);
      return bytes;
    },
  });
  const result = await runJsonQuality("check", f.options);
  assert.deepEqual(result.nativeSources[0].authorities, [original]);
});

test(
  "Windows casing aliases cannot make native JSON authorities writable",
  { skip: process.platform !== "win32" },
  async (t) => {
    const f = fixture(t);
    const bytes = Buffer.from('{"authority":"e\\u0301"}\n');
    writeFileSync(join(f.root, "manifest.json"), bytes);
    f.supplied.authorities.push({
      path: "MANIFEST.json",
      sha256: digest(bytes),
      byteLength: bytes.length,
    });
    const result = await runJsonQuality("inventory", f.options);
    assert.equal(
      result.documents.find((document) => document.path === "manifest.json")
        .contract.allowFormatWrites,
      false,
    );
    await assert.rejects(
      runJsonQuality("normalize", {
        ...f.options,
        files: ["manifest.json"],
      }),
      /Protected/u,
    );
    assert.deepEqual(readFileSync(join(f.root, "manifest.json")), bytes);
  },
);

test("serialized native results reject detached content and archive identities", async (t) => {
  for (const archive of [false, true]) {
    const f = fixture(t, archive);
    const result = await runJsonQuality("inventory", f.options);
    const forged = structuredClone(result);
    forged.documents.find(
      (document) => document.representation === "native",
    ).nativeSource.identity.source.path = "detached.blob";
    assert.throws(() => validateJsonQualityResult(forged), /bound/iu);
  }
});

test("logical members share their own ceiling without consuming physical/native file capacity", async (t) => {
  const f = fixture(t);
  f.policy.nativeSources[0].parameters = { a: "{}", b: "{}" };
  f.savePolicy();
  const bytes = Buffer.from("{}");
  const logicalInventory = ["a", "b"].map((name) => ({
    path: `${name}.json`,
    containerPath: ".json-quality.json",
    pointer: `/nativeSources/0/parameters/${name}`,
    encoding: "utf8",
    sha256: digest(bytes),
    byteLength: bytes.length,
  }));
  const options = {
    ...f.options,
    logicalInventory,
    logicalDocuments: logicalInventory.map(({ path }) => ({ path, bytes })),
    capacityLimits: { maxFiles: 2, maxLogicalDocuments: 3 },
  };
  const result = await runJsonQuality("inventory", options);
  assert.equal(result.counts.physical, 1);
  assert.equal(result.counts.logical, 2);
  assert.equal(result.counts.native, 1);
  await assert.rejects(
    runJsonQuality("inventory", {
      ...options,
      capacityLimits: { maxFiles: 1 },
    }),
    /file limit/u,
  );
  await assert.rejects(
    runJsonQuality("inventory", {
      ...options,
      capacityLimits: { maxLogicalDocuments: 2 },
    }),
    /document limit/u,
  );
});

test("archive members admit literal exact preserved-byte and NFC-value contracts", async (t) => {
  const f = fixture(t, true);
  const bytes = Buffer.from('{"x":"e\u0301"}\n');
  f.supplied.documents[0].bytes = bytes;
  Object.assign(f.supplied.inventory[0], {
    sha256: digest(bytes),
    byteLength: bytes.length,
  });
  const value = Buffer.from("e\u0301");
  f.policy.exceptions.push({
    paths: [f.path],
    owner: "Archive fixture owner",
    reason: "Original Unicode boundary.",
    allowFormatWrites: false,
    formatContract: "producer-json-compact",
    preserveNfcValues: [
      { pointer: "/x", sha256: digest(value), byteLength: value.length },
    ],
  });
  f.savePolicy();
  assert.equal((await runJsonQuality("check", f.options)).status, "passed");
  f.policy.exceptions.pop();
  f.savePolicy();
  const unpreserved = await runJsonQuality("check", { ...f.options });
  const diagnostics = unpreserved.documents
    .find((document) => document.path === f.path)
    .findings.filter((finding) => finding.phase !== "presentation")
    .map(({ path: _path, ...finding }) => finding);
  f.policy.exceptions.push({
    paths: [f.path],
    owner: "Archive fixture owner",
    reason: "Retain exact original differences.",
    allowFormatWrites: false,
    formatContract: "preserved-bytes",
    expected: { sha256: digest(bytes), byteLength: bytes.length, diagnostics },
  });
  f.savePolicy();
  const preserved = await runJsonQuality("check", f.options);
  assert.equal(preserved.status, "passed");
  assert.equal(
    preserved.documents.find((document) => document.path === f.path)
      .expectedFindings.length,
    1,
  );
});
