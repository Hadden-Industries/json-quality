// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { NativeSession } from "./client.mjs";

const identity = (bytes) => ({
  byteLength: String(bytes.length),
  sha256: createHash("sha256").update(bytes).digest("hex"),
});

test("binary authority capture is immutable raw evidence without a JSON quality claim", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    const bytes = Buffer.from([0x00, 0xff, 0x80, 0x50, 0x4b]);
    const captured = await session.capture(
      [bytes],
      {},
      { sourceKind: "authority", identity: identity(bytes) },
    );
    assert.equal(captured.captureOnly, true);
    assert.equal(captured.sha256, identity(bytes).sha256);
    const read = await session.command("read-source", {
      source: captured.source,
      offset: "0",
      maximum: "65536",
    });
    assert.deepEqual(read.data, bytes);
    const checked = await session.capture([Buffer.from("0")], {
      formatContract: "producer-json-compact-body",
    });
    assert.notEqual(checked.source, captured.source);
    for await (const event of session.events())
      if (event.type === "terminal")
        assert.equal(event.contractSatisfied, true);
    const counts = (await session.command("metrics")).result;
    assert.equal(counts.physicalSources, "1");
    assert.equal(counts.logicalSources, "0");
    assert.equal(counts.sourceBytes, "6");
  } finally {
    await session.close();
  }
});

test("native member provenance binds a frozen independent authority to actual checked bytes", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    await session.command("census-provider", {
      id: "storage",
      kind: "native",
      minimum: "1",
    });
    const bytes = Buffer.from([0xff, 0x00]),
      pin = identity(bytes);
    const authority = await session.capture(
      [bytes],
      {},
      { sourceKind: "authority", identity: pin },
    );
    await session.command("census-authority", {
      provider: "storage",
      path: "storage.bin",
      source: authority.source,
      identity: pin,
    });
    await session.command("census-add", {
      provider: "storage",
      path: "storage.bin!/one.json",
      identity: identity(Buffer.from("0")),
      origin: {
        source: authority.source,
        kind: "archive-member",
        memberPath: "one.json",
        path: "storage.bin",
        ...pin,
      },
    });
    await session.command("census-close-inventory", { provider: "storage" });
    const captured = await session.capture(
      [Buffer.from("0")],
      { formatContract: "producer-json-compact-body" },
      { sourceKind: "native" },
    );
    for await (const event of session.events())
      if (event.type === "terminal")
        assert.equal(event.contractSatisfied, true);
    await session.command("census-bind", {
      path: "storage.bin!/one.json",
      source: captured.source,
    });
    await session.command("census-close-provider", { provider: "storage" });
    assert.equal(
      (await session.command("census-status")).result.complete,
      true,
    );
    const member = (await session.command("census-next", { after: "" })).result
      .member;
    assert.deepEqual(member.origin, {
      source: authority.source,
      kind: "archive-member",
      memberPath: "one.json",
    });
  } finally {
    await session.close();
  }
});

test("independent native expected identity is available before member delivery", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    await session.command("census-provider", {
      id: "storage",
      kind: "native",
      minimum: "1",
    });
    const bytes = Buffer.from([0xff, 0x00]),
      pin = identity(bytes),
      expected = identity(Buffer.from("0"));
    const authority = await session.capture(
      [bytes],
      {},
      { sourceKind: "authority", identity: pin },
    );
    await session.command("census-authority", {
      provider: "storage",
      path: "storage.bin",
      source: authority.source,
      identity: pin,
    });
    await session.command("census-add", {
      provider: "storage",
      path: "storage.bin!/one.json",
      identity: expected,
      origin: {
        source: authority.source,
        kind: "archive-member",
        memberPath: "one.json",
        path: "storage.bin",
        ...pin,
      },
    });
    const member = (
      await session.command("census-get", { path: "storage.bin!/one.json" })
    ).result.member;
    assert.equal(member.source, "0");
    assert.equal(member.sha256, expected.sha256);
    assert.equal(member.byteLength, "1");
  } finally {
    await session.close();
  }
});

test("native origin cannot forge the independent authority digest", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    await session.command("census-provider", {
      id: "storage",
      kind: "native",
      minimum: "1",
    });
    const bytes = Buffer.from([0xff, 0x00]),
      pin = identity(bytes);
    const authority = await session.capture(
      [bytes],
      {},
      { sourceKind: "authority", identity: pin },
    );
    await session.command("census-authority", {
      provider: "storage",
      path: "storage.bin",
      source: authority.source,
      identity: pin,
      observation: "original-file",
    });
    await assert.rejects(
      session.command("census-add", {
        provider: "storage",
        path: "storage.bin!/one.json",
        identity: identity(Buffer.from("0")),
        origin: {
          source: authority.source,
          kind: "archive-member",
          memberPath: "one.json",
          path: "storage.bin",
          sha256: "0".repeat(64),
          byteLength: "2",
        },
      }),
      /census-native-origin-identity/,
    );
  } finally {
    await session.close();
  }
});

test("a giant native member preserves independent authority bytes through actual spill", async () => {
  const session = new NativeSession();
  try {
    await session.configure({ managedMemoryTargetBytes: "16777216" });
    await session.command("census-provider", {
      id: "storage",
      kind: "native",
      minimum: "1",
    });
    const bytes = Buffer.from([0xff, 0x00]),
      pin = identity(bytes),
      block = Buffer.alloc(65536, 97);
    const authority = await session.capture(
      [bytes],
      {},
      { sourceKind: "authority", identity: pin },
    );
    await session.command("census-authority", {
      provider: "storage",
      path: "storage.bin",
      source: authority.source,
      identity: pin,
    });
    const hash = createHash("sha256").update('"');
    for (let index = 0; index < 200; index++) hash.update(block);
    const expected = {
      byteLength: String(200 * 65536 + 2),
      sha256: hash.update('"').digest("hex"),
    };
    await session.command("census-add", {
      provider: "storage",
      path: "storage.bin!/large.json",
      identity: expected,
      origin: {
        source: authority.source,
        kind: "archive-member",
        memberPath: "large.json",
        path: "storage.bin",
        ...pin,
      },
    });
    function* body() {
      yield Buffer.from('"');
      for (let index = 0; index < 200; index++) yield block;
      yield Buffer.from('"');
    }
    const captured = await session.capture(
      body(),
      { formatContract: "producer-json-compact-body" },
      { sourceKind: "native", identity: expected, includeValueEvents: false },
    );
    for await (const event of session.events())
      if (event.type === "terminal")
        assert.equal(event.contractSatisfied, true);
    await session.command("census-bind", {
      path: "storage.bin!/large.json",
      source: captured.source,
    });
    await session.command("census-close-inventory", { provider: "storage" });
    await session.command("census-close-provider", { provider: "storage" });
    assert.equal(
      (await session.command("census-status")).result.complete,
      true,
    );
    assert.equal((await session.command("metrics")).result.transitions, "1");
    assert.deepEqual(
      (
        await session.command("read-source", {
          source: authority.source,
          offset: "0",
          maximum: "65536",
        })
      ).data,
      bytes,
    );
  } finally {
    await session.close();
  }
});

test("authority observations replay from the same adaptive census", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    await session.command("census-provider", {
      id: "storage",
      kind: "native",
      minimum: "0",
    });
    const bytes = Buffer.from([0xff, 0x00]),
      pin = identity(bytes);
    const authority = await session.capture(
      [bytes],
      {},
      { sourceKind: "authority", identity: pin },
    );
    await session.command("census-authority", {
      provider: "storage",
      path: "storage.bin",
      source: authority.source,
      identity: pin,
      observation: "original-file",
    });
    const first = (
      await session.command("census-next-authority", { after: "" })
    ).result.authority;
    assert.equal(first.path, "storage.bin");
    assert.equal(first.source, authority.source);
    assert.equal(first.observation, "original-file");
    assert.equal(
      (await session.command("census-next-authority", { after: first.path }))
        .result.authority,
      null,
    );
  } finally {
    await session.close();
  }
});
