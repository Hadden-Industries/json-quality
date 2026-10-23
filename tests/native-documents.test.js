// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFileSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { temporaryRepository } from "./temporary-repository.js";
import { validateJsonQualityEvent } from "../src/index.js";
import { fixtureStream, repositoryEvents } from "./repository-fixture.js";

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex"),
  identity = (path, bytes) => ({
    path,
    sha256: digest(bytes),
    byteLength: String(bytes.length),
  });
function suppliedStreams(supplied) {
  return {
    authorities: fixtureStream(...supplied.authorities),
    inventory: fixtureStream(...supplied.inventory),
    documents: (async function* () {
      for (const item of supplied.documents)
        yield {
          path: item.path,
          chunks: (async function* () {
            const bytes = item.bytes;
            for (let offset = 0; offset < bytes.length; offset += 65536)
              yield bytes.subarray(offset, offset + 65536);
          })(),
        };
    })(),
    close() {},
  };
}
function fixture(t, archive = false) {
  const root = temporaryRepository(t, "json-quality-native-"),
    policy = {
      schemaVersion: 2,
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
    },
    savePolicy = () =>
      writeFileSync(
        join(root, ".json-quality.json"),
        JSON.stringify(policy, null, 2) + "\n",
      );
  savePolicy();
  const bytes = Buffer.from('{"a":1}\n'),
    authorityBytes = Buffer.from("independent manifest"),
    authority = identity("manifest.txt", authorityBytes),
    sourceBytes = archive
      ? Buffer.from("native archive independently verified by its owner")
      : bytes,
    source = {
      ...identity(archive ? "evidence.tgz" : "evidence.blob", sourceBytes),
      kind: archive ? "archive-member" : "content-addressed",
      ...(archive ? { memberPath: "package/member.json" } : {}),
    };
  writeFileSync(join(root, authority.path), authorityBytes);
  writeFileSync(join(root, source.path), sourceBytes);
  const path = archive ? `${source.path}!/${source.memberPath}` : source.path,
    supplied = {
      inventory: [{ ...identity(path, bytes), source }],
      documents: [{ path, bytes }],
      authorities: [authority, identity(source.path, sourceBytes)],
    };
  return {
    root,
    policy,
    savePolicy,
    supplied,
    source,
    path,
    options: {
      root,
      nativeProviders: { owner: async () => suppliedStreams(supplied) },
    },
  };
}
for (const archive of [false, true])
  test(`public native ${archive ? "archive member" : "content-addressed JSON"} delivery closes each shared source check`, async (t) => {
    const f = fixture(t, archive),
      events = await repositoryEvents(f.options);
    assert.equal(events.at(-1).type, "execution-terminal");
    assert.equal(events.at(-1).members, "2");
    assert.equal(events.at(-1).contractSatisfied, false);
    assert.equal(events.filter((event) => event.type === "terminal").length, 2);
    assert.ok(
      events.some(
        (event) =>
          event.type === "finding" &&
          event.path === f.path &&
          event.phase === "presentation",
      ),
    );
    for (const event of events) {
      assert.equal(validateJsonQualityEvent(event), true);
      assert.equal(
        validateJsonQualityEvent({ ...event, schemaVersion: 1 }),
        false,
      );
    }
  });

for (const [name, mutate] of [
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
      f.options.nativeProviders.extra = async () => suppliedStreams(f.supplied);
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
])
  test(`${name} cannot deliver a complete verdict or authorize an authored write`, async (t) => {
    const f = fixture(t);
    writeFileSync(join(f.root, "authored.json"), '{"x":1}');
    const before = readFileSync(join(f.root, "authored.json"));
    mutate(f);
    await assert.rejects(repositoryEvents(f.options, "format"));
    assert.deepEqual(readFileSync(join(f.root, "authored.json")), before);
  });

test("archive traversal and detached member identities cannot enter the native census", async (t) => {
  const f = fixture(t, true);
  f.supplied.inventory[0].source.memberPath = "../member.json";
  await assert.rejects(repositoryEvents(f.options), /path|member/iu);
});
test("an explicit native obligation cannot be excluded into a false completion", async (t) => {
  const f = fixture(t, true);
  f.policy.exceptions.push({
    paths: [f.path],
    exclude: true,
    owner: "Fixture owner",
    reason: "Contradictory declared native scope.",
  });
  f.savePolicy();
  await assert.rejects(repositoryEvents(f.options), /obligation is excluded/u);
});
test("an explicitly empty native scope still requires an actual verified authority", async (t) => {
  const f = fixture(t);
  f.policy.nativeSources[0].minimumDocuments = 0;
  f.supplied.documents = [];
  f.supplied.inventory = [];
  f.savePolicy();
  assert.equal(
    (await repositoryEvents(f.options)).at(-1).contractSatisfied,
    true,
  );
  f.supplied.authorities = [];
  await assert.rejects(repositoryEvents(f.options), /authority/u);
});
test("a later native provider cannot mutate previously admitted source or policy", async (t) => {
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
    return suppliedStreams({
      inventory: [],
      documents: [],
      authorities: f.supplied.authorities,
    });
  };
  await assert.rejects(repositoryEvents(f.options), /changed|identity/iu);
  writeFileSync(join(f.root, f.source.path), f.supplied.documents[0].bytes);
  f.options.nativeProviders.later = async () => {
    writeFileSync(join(f.root, ".json-quality.json"), "{}\n");
    return suppliedStreams({
      inventory: [],
      documents: [],
      authorities: f.supplied.authorities,
    });
  };
  await assert.rejects(repositoryEvents(f.options), /changed/iu);
});
test("native payload, inventory and diagnostic capacities cannot be bypassed by providers", async (t) => {
  const f = fixture(t);
  for (const capacityLimits of [{ maxTotalBytes: 1 }, { maxFileBytes: 1 }])
    await assert.rejects(repositoryEvents({ ...f.options, capacityLimits }));
  const second = structuredClone(f.supplied.inventory[0]);
  second.path = "other.blob";
  second.source.path = "other.blob";
  writeFileSync(join(f.root, second.path), f.supplied.documents[0].bytes);
  f.supplied.authorities.push({
    path: second.path,
    sha256: second.sha256,
    byteLength: second.byteLength,
  });
  f.supplied.inventory.push(second);
  f.supplied.documents.push({
    path: second.path,
    bytes: f.supplied.documents[0].bytes,
  });
  await assert.rejects(
    repositoryEvents({
      ...f.options,
      capacityLimits: { maxLogicalDocuments: 1 },
    }),
    /logical-capacity/u,
  );
  await assert.rejects(
    repositoryEvents({ ...f.options, capacityLimits: { maxDiagnostics: 1 } }),
    /diagnostic/iu,
  );
});
test("standalone CLI cannot silently omit a configured native owner", (t) => {
  const f = fixture(t),
    response = spawnSync(
      process.execPath,
      [
        fileURLToPath(new URL("../src/cli.js", import.meta.url)),
        "check",
        "--root",
        f.root,
        "--json",
      ],
      { encoding: "utf8", windowsHide: true, timeout: 15000 },
    );
  assert.equal(response.status, 2);
  const events = response.stdout
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.equal(events.at(-1).type, "failure");
  assert.equal(
    events.some((event) => event.type === "execution-terminal"),
    false,
  );
  assert.equal(validateJsonQualityEvent(events.at(-1)), true);
});
test("native JSON authorities are protected before formatting and explicit normalization", async (t) => {
  const f = fixture(t);
  f.policy.nativeSources[0].formatContract = "producer-json-compact";
  f.savePolicy();
  const bytes = Buffer.from('{"authority":"e\\u0301"}\n'),
    pin = identity("authority.json", bytes);
  writeFileSync(join(f.root, pin.path), bytes);
  f.supplied.authorities.push(pin);
  writeFileSync(join(f.root, "authored.json"), '{"x":1}');
  const events = await repositoryEvents(f.options, "format");
  assert.equal(events.at(-1).type, "write-failure");
  assert.equal(events.at(-1).written, "0");
  const normalized = await repositoryEvents(f.options, "normalize", [pin.path]);
  assert.equal(normalized.at(-1).type, "write-failure");
  assert.match(normalized.at(-1).message, /Protected/u);
  assert.deepEqual(readFileSync(join(f.root, pin.path)), bytes);
});
test("mutable provider metadata cannot rewrite authority observations already admitted", async (t) => {
  const f = fixture(t);
  f.policy.nativeSources[0].formatContract = "producer-json-compact";
  f.savePolicy();
  const bytes = f.supplied.documents[0].bytes;
  Object.defineProperty(f.supplied.documents[0], "bytes", {
    get() {
      f.supplied.authorities[0].sha256 = "0".repeat(64);
      return bytes;
    },
  });
  assert.equal(
    (await repositoryEvents(f.options)).at(-1).contractSatisfied,
    true,
  );
});
test(
  "Windows casing aliases cannot acquire native JSON authority write permission",
  { skip: process.platform !== "win32" },
  async (t) => {
    const f = fixture(t),
      bytes = Buffer.from('{"authority":"e\\u0301"}\n');
    writeFileSync(join(f.root, "manifest.json"), bytes);
    f.supplied.authorities.push(identity("MANIFEST.json", bytes));
    const events = await repositoryEvents(f.options, "normalize", [
      "manifest.json",
    ]);
    assert.equal(events.at(-1).type, "write-failure");
    assert.equal(events.at(-1).message, "rewrite-native-authority-protected");
    assert.deepEqual(readFileSync(join(f.root, "manifest.json")), bytes);
  },
);

test(
  "Windows filesystem aliases outside Unicode lowercase equivalence remain protected native authorities",
  { skip: process.platform !== "win32" },
  async (t) => {
    let supported = 0;
    for (const [name, alias] of [
      ["manifest.json", "man\u0131fest.json"],
      ["manifest.json", "manife\u017Ft.json"],
      ["\u03C3.json", "\u03C2.json"],
    ]) {
      const f = fixture(t),
        bytes = Buffer.from('{\n  "authority": "e\\u0301"\n}\n'),
        actual = join(f.root, name);
      writeFileSync(actual, bytes);
      if (!existsSync(join(f.root, alias))) continue;
      supported++;
      assert.equal(
        statSync(actual, { bigint: true }).ino,
        statSync(join(f.root, alias), { bigint: true }).ino,
      );
      f.policy.nativeSources[0].formatContract = "producer-json-compact";
      f.savePolicy();
      f.supplied.authorities.push(identity(alias, bytes));
      const events = await repositoryEvents(f.options, "normalize", [name]);
      assert.equal(events.at(-1).type, "write-failure");
      assert.match(events.at(-1).message, /protected/iu);
      assert.equal(events.at(-1).written, "0");
      assert.deepEqual(readFileSync(actual), bytes);
    }
    if (!supported)
      t.skip(
        "This filesystem supports none of the independent Unicode alias vectors.",
      );
  },
);
test("logical members have a separate ceiling from physical/native file admission", async (t) => {
  const f = fixture(t);
  f.policy.nativeSources[0].parameters = { a: "{}", b: "{}" };
  f.savePolicy();
  const bytes = Buffer.from("{}"),
    options = (capacityLimits) => ({
      ...f.options,
      capacityLimits,
      logicalProviders: [
        {
          definition: {
            id: "logical",
            minimumDocuments: 2,
            containerPaths: [".json-quality.json"],
          },
          inventory: () =>
            fixtureStream(
              ...["a", "b"].map((name) => ({
                path: `${name}.json`,
                containerPath: ".json-quality.json",
                pointer: `/nativeSources/0/parameters/${name}`,
                encoding: "utf8",
                sha256: digest(bytes),
                byteLength: "2",
              })),
            ),
        },
      ],
    });
  assert.equal(
    (
      await repositoryEvents(options({ maxFiles: 2, maxLogicalDocuments: 3 }))
    ).at(-1).members,
    "4",
  );
  await assert.rejects(
    repositoryEvents(options({ maxFiles: 1 })),
    /file-capacity/u,
  );
  await assert.rejects(
    repositoryEvents(options({ maxLogicalDocuments: 2 })),
    /logical-capacity/u,
  );
});
test("archive members admit independent exact Unicode-value preservation pins", async (t) => {
  const f = fixture(t, true),
    bytes = Buffer.from('{"x":"e\u0301"}\n'),
    value = Buffer.from("e\u0301");
  f.supplied.documents[0].bytes = bytes;
  Object.assign(f.supplied.inventory[0], identity(f.path, bytes));
  f.policy.exceptions.push({
    paths: [f.path],
    owner: "Archive fixture owner",
    reason: "Original Unicode boundary.",
    allowFormatWrites: false,
    formatContract: "producer-json-compact",
    preserveNfcValues: [
      {
        pointer: "/x",
        sha256: digest(value),
        byteLength: String(value.length),
      },
    ],
  });
  f.savePolicy();
  assert.equal(
    (await repositoryEvents(f.options)).at(-1).contractSatisfied,
    true,
  );
  f.policy.exceptions.pop();
  f.savePolicy();
  assert.equal(
    (await repositoryEvents(f.options)).at(-1).contractSatisfied,
    false,
  );
});
