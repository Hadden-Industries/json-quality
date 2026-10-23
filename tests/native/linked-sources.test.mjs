// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { NativeSession } from "./client.mjs";

const contract = { formatContract: "producer-json-compact-body" };
async function collect(session) {
  const events = [];
  for await (const event of session.events()) events.push(event);
  return { events, terminal: events.at(-1) };
}
async function container(session, text) {
  await session.capture([Buffer.from(text)], contract);
  const result = await collect(session);
  assert.equal(result.terminal.qualityPassed, true);
  return result.events.filter(
    (event) => event.type === "value" && event.kind === "string",
  );
}

test("linked UTF-8 members retain container identity across successive checks", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    const values = await container(session, '["0","true"]');
    for (const [index, value] of values.entries()) {
      const expected = index ? "true" : "0";
      const { result: captured } = await session.command(
        "begin-linked-source",
        {
          value: value.id,
          encoding: "utf8",
          contract,
          includeValueEvents: true,
        },
      );
      const { terminal } = await collect(session);
      assert.equal(terminal.qualityPassed, true);
      assert.notEqual(captured.source, value.source);
      assert.equal(
        terminal.sourceSha256,
        createHash("sha256").update(expected).digest("hex"),
      );
      assert.deepEqual(terminal.linkage, {
        containerSource: value.source,
        value: value.id,
        encoding: "utf8",
      });
      assert.equal(
        (await session.read(value.id, "decoded-utf8")).data.toString(),
        expected,
      );
    }
  } finally {
    await session.close();
  }
});

test("base64 linked capture agrees with independent canonical encoding", async () => {
  for (const text of ["0", "[]", "{}", "true", '"é"', '{"a":1}', '"😀"']) {
    const session = new NativeSession();
    try {
      await session.configure();
      const [value] = await container(
        session,
        JSON.stringify(Buffer.from(text).toString("base64")),
      );
      const identity = {
        sha256: createHash("sha256").update(text).digest("hex"),
        byteLength: String(Buffer.byteLength(text)),
      };
      const { result: captured } = await session.command(
        "begin-linked-source",
        {
          value: value.id,
          encoding: "base64",
          identity,
          contract,
          includeValueEvents: true,
        },
      );
      const { events, terminal } = await collect(session);
      assert.equal(terminal.qualityPassed, true);
      assert.equal(captured.sha256, identity.sha256);
      const root = events.find(
        (event) => event.type === "value" && event.parent === "0",
      );
      assert.equal(
        (await session.read(root.id, "source-json")).data.toString(),
        text,
      );
    } finally {
      await session.close();
    }
  }
});

test("noncanonical base64 cannot produce a successful linked source", async () => {
  for (const encoded of [
    "MA",
    "MA===",
    "MB==",
    "W11=",
    "M A=",
    "MA==MA==",
    "====",
    "MA=A",
  ]) {
    const session = new NativeSession();
    try {
      await session.configure();
      const [value] = await container(session, JSON.stringify(encoded));
      await assert.rejects(
        session.command("begin-linked-source", {
          value: value.id,
          encoding: "base64",
          contract,
        }),
        /linked-base64-/,
      );
    } finally {
      await session.close();
    }
  }
});

test("provisional values from an invalid container cannot become linked sources", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    await session.capture([Buffer.from('["MA==",]')], contract);
    const { events, terminal } = await collect(session);
    assert.equal(terminal.parserComplete, false);
    const value = events.find(
      (event) => event.type === "value" && event.kind === "string",
    );
    await assert.rejects(
      session.command("begin-linked-source", {
        value: value.id,
        encoding: "base64",
        contract,
      }),
      /linked-source-container-incomplete/,
    );
  } finally {
    await session.close();
  }
});

test("giant linked base64 uses bounded fragments and the same adaptive store", async () => {
  const session = new NativeSession();
  try {
    await session.configure({ managedMemoryTargetBytes: "16777216" });
    const groups = 2 * 1024 * 1024;
    function* encoded() {
      yield Buffer.from('"ImFh');
      const block = Buffer.from("YWFh".repeat(16384));
      for (let index = 0; index < groups / 16384; ++index) yield block;
      yield Buffer.from('YSI="');
    }
    await session.capture(encoded(), contract);
    const parent = await collect(session);
    assert.equal(parent.terminal.qualityPassed, true);
    assert.equal(parent.terminal.transitions, "1");
    const value = parent.events.find((event) => event.type === "value");
    const expectedHash = createHash("sha256").update('"aa');
    const decoded = Buffer.alloc(3 * 16384, 97);
    for (let index = 0; index < groups / 16384; ++index)
      expectedHash.update(decoded);
    expectedHash.update('a"');
    const identity = {
      sha256: expectedHash.digest("hex"),
      byteLength: String(3 * groups + 5),
    };
    await session.command("begin-linked-source", {
      value: value.id,
      encoding: "base64",
      identity,
      contract,
      includeValueEvents: true,
    });
    const { events, terminal } = await collect(session);
    assert.equal(terminal.qualityPassed, true);
    assert.equal(terminal.sourceSha256, identity.sha256);
    assert.equal(terminal.transitions, "1");
    assert.ok(BigInt(terminal.managedPeakBytes) <= 16777216n);
    const child = events.find((event) => event.type === "value");
    assert.equal(child.byteLength, String(3 * groups + 3));
    assert.equal(
      (
        await session.read(
          child.id,
          "decoded-utf8",
          String(3 * groups + 1),
          "2",
        )
      ).data.toString(),
      "aa",
    );
    assert.equal(
      (await session.read(value.id, "decoded-utf8", "0", "4")).data.toString(),
      "ImFh",
    );
  } finally {
    await session.close();
  }
});
