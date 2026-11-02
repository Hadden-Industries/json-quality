// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { createValueSession } from "../src/value-session.js";

function core() {
  return {
    captures: [],
    commands: [],
    closed: false,
    async capture(chunks, contract, options) {
      const parts = [];
      for await (const chunk of chunks) parts.push(chunk);
      this.captures.push({ bytes: Buffer.concat(parts), contract, options });
      return {
        source: String(this.captures.length),
        byteLength: "6",
        sha256: "a".repeat(64),
      };
    },
    async *events() {
      yield { type: "terminal", contractSatisfied: true };
    },
    async command(name, options) {
      this.commands.push({ name, options });
      if (name === "read-source")
        return {
          result: { byteOffset: options.byteOffset, totalByteLength: "4" },
          data: Buffer.from("é"),
        };
      return {
        result: { value: { id: "7", kind: "string", byteLength: "2" } },
      };
    },
    async read(id, representation, byteOffset, maximumBytes) {
      this.commands.push({
        name: "read-value",
        options: { id, representation, byteOffset, maximumBytes },
      });
      return {
        result: { byteOffset, totalByteLength: "4" },
        data: Buffer.from("é"),
      };
    },
    cancel() {},
    async close() {
      this.closed = true;
    },
  };
}

async function sourceReference(session, options) {
  let source;
  for await (const event of session.check([Buffer.from('"éé"')], {}, options))
    if (event.type === "source") source = event.source;
  return source;
}

test("referenceId labels cannot forge or transfer private session authority", async () => {
  const first = createValueSession(core()),
    second = createValueSession(core());
  try {
    const source = await sourceReference(first);
    const value = await first.select(source);
    assert.equal(typeof source.referenceId, "string");
    assert.equal(typeof value.referenceId, "string");
    assert.equal(Object.hasOwn(source, "identity"), false);
    assert.equal(Object.hasOwn(value, "identity"), false);
    const copied = JSON.parse(JSON.stringify(source));
    await assert.rejects(first.select(copied), /foreign-or-invalid-reference/u);
    await assert.rejects(
      second.select(source),
      /foreign-or-invalid-reference/u,
    );
    assert.throws(
      () => first.sameReference(source, copied),
      /foreign-or-invalid-reference/u,
    );
    assert.equal(first.sameReference(value, await first.select(source)), true);
    assert.equal(first.sameReference(source, value), false);
    await first.close();
    await assert.rejects(first.select(source), /closed-session/u);
  } finally {
    await first.close();
    await second.close();
  }
});

test("byte range metadata and command arguments use byte units", async () => {
  const owner = core(),
    session = createValueSession(owner);
  try {
    const source = await sourceReference(session),
      value = await session.select(source);
    const range = await session.read(value, "decoded-utf8", "2", "2");
    assert.equal(range.bytes.toString(), "é");
    assert.equal(range.bytes.length, 2);
    assert.equal(range.byteOffset, "2");
    assert.equal(range.totalByteLength, "4");
    assert.equal(Object.hasOwn(range, "offset"), false);
    assert.deepEqual(owner.commands.at(-1).options, {
      id: "7",
      representation: "decoded-utf8",
      byteOffset: "2",
      maximumBytes: "2",
    });
    const sourceRange = await session.readSource(source, "1", "2");
    assert.equal(sourceRange.byteOffset, "1");
    assert.deepEqual(owner.commands.at(-1), {
      name: "read-source",
      options: { source: "1", byteOffset: "1", maximumBytes: "2" },
    });
  } finally {
    await session.close();
  }
});

test("pointer streams preserve their byte identity and source event retention is independent", async () => {
  const owner = core(),
    session = createValueSession(owner);
  try {
    const source = await sourceReference(session, {
      includeValueEvents: true,
      retainValues: false,
    });
    assert.equal(owner.captures[0].options.includeValueEvents, true);
    assert.equal(owner.captures[0].options.retainValues, false);
    const identity = { sha256: "b".repeat(64), byteLength: "3" };
    const pointerByteChunks = (async function* () {
      yield Buffer.from("/é");
    })();
    const value = await session.selectByPointerStream(
      source,
      pointerByteChunks,
      { identity, record: "2" },
    );
    assert.equal(value.valueKind, "string");
    assert.equal(owner.captures[1].bytes.toString(), "/é");
    assert.equal(owner.captures[1].options.identity, identity);
    assert.equal(owner.captures[1].options.includeValueEvents, false);
    assert.equal(owner.captures[1].options.retainValues, false);
    assert.deepEqual(owner.commands.at(-1), {
      name: "select-value-pointer-source",
      options: { source: "1", pointerSource: "2", record: "2" },
    });
    assert.equal(session.selectStream, undefined);
  } finally {
    await session.close();
  }
});

test("collision advisory IDs become scoped references and completed previews preserve the session", async () => {
  const owner = core(),
    session = createValueSession(owner);
  try {
    let source, advisory;
    const events = (async function* () {
      yield {
        type: "source",
        source: "1",
        byteLength: "2",
        sha256: "a".repeat(64),
      };
      yield {
        type: "nfc-key-collision-risk",
        source: "1",
        value: "7",
        priorValue: "8",
        containerValue: "6",
      };
      yield { type: "normalization-preview-terminal", complete: true };
    })();
    for await (const event of session.projectRepositoryEvents(events)) {
      if (event.type === "source") source = event.source;
      if (event.type === "nfc-key-collision-risk") advisory = event;
    }
    for (const reference of [
      advisory.value,
      advisory.priorValue,
      advisory.containerValue,
    ]) {
      assert.equal(reference.kind, "value");
      assert.equal(typeof reference.referenceId, "string");
      await assert.rejects(
        session.describe({ ...reference }),
        /foreign-or-invalid-reference/u,
      );
    }
    assert.equal(typeof source.referenceId, "string");
    const nextSource = await sourceReference(session);
    const selected = await session.select(nextSource);
    assert.equal(session.sameReference(advisory.value, selected), true);
  } finally {
    await session.close();
  }
});
