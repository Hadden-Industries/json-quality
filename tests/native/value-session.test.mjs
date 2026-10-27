// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createValueSession } from "../../src/value-session.js";
import { admitJsonPolicy } from "../../src/configuration.js";
import { NativeSession } from "./client.mjs";
const contract = { formatContract: "producer-json-compact-body" };
async function checked(session, text) {
  let source;
  for await (const event of session.check([Buffer.from(text)], contract)) {
    if (event.type === "source") source = event.source;
    if (event.type === "terminal") assert.equal(event.contractSatisfied, true);
  }
  return source;
}

test("immediate child iteration preserves source order, member names and nested capabilities", async () => {
  const core = new NativeSession(),
    session = createValueSession(core);
  try {
    await core.configure();
    const source = await checked(
      session,
      '{"z":1,"nested":[true,{"inside":"value"}],"a/b~":null,"last":[]}',
    );
    const root = await session.select(source);
    const names = [],
      kinds = [],
      ordinals = [];
    let nested;
    for await (const child of session.children(root)) {
      names.push(
        (await session.read(child.name, "decoded-utf8")).bytes.toString(),
      );
      kinds.push(child.value.valueKind);
      ordinals.push(child.ordinal);
      if (child.ordinal === "0")
        assert.equal(
          (await session.read(child.value, "number-lexeme")).bytes.toString(),
          "1",
        );
      if (child.ordinal === "1") nested = child.value;
    }
    assert.deepEqual(names, ["z", "nested", "a/b~", "last"]);
    assert.deepEqual(kinds, ["number", "array", "null", "array"]);
    assert.deepEqual(ordinals, ["0", "1", "2", "3"]);
    const arrayKinds = [];
    for await (const child of session.children(nested)) {
      assert.equal(child.name, null);
      arrayKinds.push(child.value.valueKind);
    }
    assert.deepEqual(arrayKinds, ["true", "object"]);
    assert.equal(
      (await session.children(await session.select(source, "/last")).next())
        .done,
      true,
    );
    await assert.rejects(
      session.children(await session.select(source, "/z")).next(),
      /value-not-container/u,
    );
    await assert.rejects(
      session.children({ ...root }).next(),
      /foreign-or-invalid-reference/u,
    );
    const paused = session.children(root);
    assert.equal((await paused.next()).done, false);
    await session.close();
    await assert.rejects(paused.next(), /closed-session/u);
  } finally {
    await session.close();
  }
});

test("scoped capabilities reject sibling-session and forged references without losing valid reads", async () => {
  const firstCore = new NativeSession(),
    secondCore = new NativeSession(),
    first = createValueSession(firstCore),
    second = createValueSession(secondCore);
  try {
    await firstCore.configure();
    await secondCore.configure();
    const firstSource = await checked(first, '"first"'),
      secondSource = await checked(second, '"second"'),
      value = await first.select(firstSource);
    await assert.rejects(
      second.select(firstSource),
      /foreign-or-invalid-reference/,
    );
    await assert.rejects(
      second.read(value, "decoded-utf8"),
      /foreign-or-invalid-reference/,
    );
    await assert.rejects(
      first.select({ ...firstSource }),
      /foreign-or-invalid-reference/,
    );
    assert.equal(
      (await first.read(value, "decoded-utf8")).bytes.toString(),
      "first",
    );
    assert.equal(
      (
        await second.read(await second.select(secondSource), "decoded-utf8")
      ).bytes.toString(),
      "second",
    );
    await first.close();
    await assert.rejects(first.read(value, "decoded-utf8"), /closed-session/);
  } finally {
    await first.close();
    await second.close();
  }
});

test("child iteration keeps duplicate members distinct across actual spill without decoding giant siblings", async () => {
  const core = new NativeSession(),
    session = createValueSession(core);
  try {
    await core.configure({ managedMemoryTargetBytes: "16777216" });
    async function* chunks() {
      yield Buffer.from('{"a":0,"a":1,"tail":["');
      const part = Buffer.alloc(65536, 120);
      for (let index = 0; index < 192; index++) yield part;
      yield Buffer.from('"]}');
    }
    let source,
      terminal,
      duplicate = false;
    for await (const event of session.check(chunks(), contract)) {
      if (event.type === "source") source = event.source;
      if (event.messageId === "duplicateKey") duplicate = true;
      if (event.type === "terminal") terminal = event;
    }
    assert.equal(terminal.parserComplete, true);
    assert.equal(terminal.contractSatisfied, false);
    assert.equal(duplicate, true);
    assert.equal((await core.command("metrics")).result.transitions, "1");
    const names = [],
      ordinals = [],
      values = [];
    let tail;
    for await (const child of session.children(await session.select(source))) {
      names.push(
        (await session.read(child.name, "decoded-utf8")).bytes.toString(),
      );
      ordinals.push(child.ordinal);
      if (child.ordinal === "2") tail = child.value;
      else
        values.push(
          (await session.read(child.value, "number-lexeme")).bytes.toString(),
        );
    }
    assert.deepEqual(names, ["a", "a", "tail"]);
    assert.deepEqual(ordinals, ["0", "1", "2"]);
    assert.deepEqual(values, ["0", "1"]);
    let count = 0;
    for await (const child of session.children(tail)) {
      count++;
      assert.equal(child.name, null);
      assert.equal(child.value.byteLength, "12582912");
      assert.equal(
        (
          await session.read(child.value, "decoded-utf8", "12582911", "1")
        ).bytes.toString(),
        "x",
      );
    }
    assert.equal(count, 1);
  } finally {
    await session.close();
  }
});

test("bounded materialization refuses excess, charges one lease and invalidates released bytes", async () => {
  const core = new NativeSession(),
    session = createValueSession(core);
  try {
    await core.configure();
    const value = await session.select(await checked(session, '"fragment"'));
    await assert.rejects(
      session.materialize(value, "decoded-utf8", "7"),
      /materialization-capacity/,
    );
    assert.equal(
      (await session.read(value, "decoded-utf8")).bytes.toString(),
      "fragment",
    );
    const before = (await core.command("metrics")).result.managedBytes,
      lease = await session.materialize(value, "decoded-utf8", "8");
    assert.equal(lease.bytes.toString(), "fragment");
    assert.equal(
      BigInt((await core.command("metrics")).result.managedBytes),
      BigInt(before) + 8n,
    );
    await Promise.all([lease.release(), lease.release()]);
    assert.throws(() => lease.bytes, /released-materialization/);
    assert.equal((await core.command("metrics")).result.managedBytes, before);
    const retryLease = await session.materialize(value, "decoded-utf8", "8"),
      pending = core.command("metrics");
    await assert.rejects(retryLease.release(), /concurrent-native-request/);
    await pending;
    assert.equal(retryLease.bytes.toString(), "fragment");
    await retryLease.release();
    assert.equal((await core.command("metrics")).result.managedBytes, before);
    const lastLease = await session.materialize(value, "decoded-utf8", "8");
    await session.close();
    assert.throws(() => lastLease.bytes, /closed-session/);
    await lastLease.release();
  } finally {
    await session.close();
  }
});

test("an early reference remains readable after a giant source forces actual spill", async () => {
  const core = new NativeSession(),
    session = createValueSession(core);
  try {
    await core.configure({ managedMemoryTargetBytes: "16777216" });
    const early = await session.select(await checked(session, '"early"'));
    async function* chunks() {
      yield Buffer.from('"');
      const fragment = Buffer.alloc(65536, 120);
      for (let index = 0; index < 192; index++) yield fragment;
      yield Buffer.from('"');
    }
    let source;
    for await (const event of session.check(chunks(), contract)) {
      if (event.type === "source") source = event.source;
      if (event.type === "terminal")
        assert.equal(event.contractSatisfied, true);
    }
    assert.equal((await core.command("metrics")).result.transitions, "1");
    assert.equal(
      (await session.read(early, "decoded-utf8")).bytes.toString(),
      "early",
    );
    let length = 0;
    for await (const fragment of session.fragments(
      await session.select(source),
      "decoded-utf8",
    )) {
      assert.ok(fragment.length <= 65536);
      assert.ok(fragment.every((byte) => byte === 120));
      length += fragment.length;
    }
    assert.equal(length, 192 * 65536);
  } finally {
    await session.close();
  }
});

test("a giant escaped pointer selects its exact retained value through bounded streams", async () => {
  const core = new NativeSession(),
    session = createValueSession(core),
    fragment = Buffer.alloc(65536, 120),
    count = 192;
  try {
    await core.configure({ managedMemoryTargetBytes: "16777216" });
    async function* document() {
      yield Buffer.from('{"');
      for (let index = 0; index < count; index++) yield fragment;
      yield Buffer.from('/~":0}');
    }
    let source;
    for await (const event of session.check(document(), contract)) {
      if (event.type === "source") source = event.source;
      if (event.type === "terminal")
        assert.equal(event.contractSatisfied, true);
    }
    const hash = createHash("sha256").update("/");
    for (let index = 0; index < count; index++) hash.update(fragment);
    hash.update("~1~0");
    async function* pointer() {
      yield Buffer.from("/");
      for (let index = 0; index < count; index++) yield fragment;
      // Escape pairs deliberately cross transport fragment boundaries.
      for (const part of ["~", "1", "~", "0"]) yield Buffer.from(part);
    }
    const selected = await session.selectStream(source, pointer(), {
      identity: {
        byteLength: String(1 + count * fragment.length + 4),
        sha256: hash.digest("hex"),
      },
    });
    assert.equal(
      (await session.read(selected, "source-json")).bytes.toString(),
      "0",
    );
    assert.equal((await core.command("metrics")).result.transitions, "1");
  } finally {
    await session.close();
  }
});

test("malformed streamed pointers refuse selection while completed values stay readable", async () => {
  const core = new NativeSession(),
    session = createValueSession(core);
  try {
    await core.configure();
    const source = await checked(session, '{"a":[0]}'),
      value = await session.select(source, "/a/0");
    for (const [bytes, error] of [
      [Buffer.from("/a/~"), /pointer-escape/],
      [Buffer.from("/missing/~2"), /pointer-escape/],
      [Buffer.from("/a/00"), /pointer-not-found/],
      [Buffer.from([47, 255]), /invalid-utf8/],
      [Buffer.from([47, 0xc3]), /truncated-utf8/],
    ]) {
      await assert.rejects(
        session.selectStream(source, [bytes], {
          identity: {
            byteLength: String(bytes.length),
            sha256: createHash("sha256").update(bytes).digest("hex"),
          },
        }),
        error,
      );
      assert.equal(
        (await session.read(value, "source-json")).bytes.toString(),
        "0",
      );
    }
  } finally {
    await session.close();
  }
});

test("bounded policy materialization runs complete Ajv admission before explicit ownership transfer", async () => {
  const core = new NativeSession(),
    session = createValueSession(core),
    next = new NativeSession();
  try {
    await core.configure();
    const source = await checked(
        session,
        '{"schemaVersion":3,"defaults":{"formatContract":"prettier-json","allowFormatWrites":true,"normalization":"NFC"},"exceptions":[]}',
      ),
      value = await session.select(source),
      lease = await session.materializeControl(value, "1024", admitJsonPolicy);
    assert.equal(lease.value.defaults.normalization, "NFC");
    const owned = await lease.transfer();
    assert.throws(() => lease.value, /released-materialization/);
    await session.close();
    await next.configure();
    await next.command("adopt-control-state", {
      byteLength: owned.managedReservationBytes,
    });
    assert.equal(owned.value.schemaVersion, 3);
    await next.capture([Buffer.from("0")], contract);
    for await (const event of next.events())
      if (event.type === "terminal")
        assert.equal(event.contractSatisfied, true);
    assert.equal(
      (await next.command("metrics")).result.controlStateReservationBytes,
      owned.managedReservationBytes,
    );
  } finally {
    await session.close();
    await next.close();
  }
});

test("invalid policy domains release their reservation without becoming a quality verdict", async () => {
  const core = new NativeSession(),
    session = createValueSession(core);
  try {
    await core.configure();
    const value = await session.select(
      await checked(session, '{"schemaVersion":999}'),
    );
    await assert.rejects(
      session.materializeControl(value, "1024", admitJsonPolicy),
      /Invalid JSON policy structure/,
    );
    assert.equal(
      (await session.read(value, "source-json")).bytes.toString(),
      '{"schemaVersion":999}',
    );
    const lease = await session.materialize(value, "source-json", "1024");
    await lease.release();
  } finally {
    await session.close();
  }
});

test("a finite metadata subtree excludes unrelated sibling nodes from its reservation", async () => {
  const core = new NativeSession(),
    session = createValueSession(core);
  try {
    await core.configure({ managedMemoryTargetBytes: "16777216" });
    const text =
      '{"metadata":{"path":"member.json"},"other":[' +
      "0,".repeat(39999) +
      "0]}";
    const source = await checked(session, text);
    const lease = await session.materializeControl(
      await session.select(source, "/metadata"),
      "128",
      (metadata) => {
        assert.deepEqual(metadata, { path: "member.json" });
        return true;
      },
    );
    assert.ok(BigInt(lease.managedReservationBytes) < 32768n);
    assert.equal(lease.value.path, "member.json");
    await lease.release();
  } finally {
    await session.close();
  }
});

test("a positive-looking subtree in a source with duplicate keys cannot enter the control bridge", async () => {
  const core = new NativeSession(),
    session = createValueSession(core);
  try {
    await core.configure();
    let source, terminal;
    for await (const event of session.check(
      [Buffer.from('{"metadata":{"path":"member.json"},"x":0,"x":1}')],
      contract,
    )) {
      if (event.type === "source") source = event.source;
      if (event.type === "terminal") terminal = event;
    }
    assert.equal(terminal.qualityPassed, false);
    let called = false;
    await assert.rejects(
      session.materializeControl(
        await session.select(source, "/metadata"),
        "128",
        () => {
          called = true;
        },
      ),
      /control-materialization-source/,
    );
    assert.equal(called, false);
  } finally {
    await session.close();
  }
});

test("large control-object reservation refuses before invoking its JS domain materializer", async () => {
  const core = new NativeSession(),
    session = createValueSession(core);
  try {
    await core.configure({ managedMemoryTargetBytes: "16777216" });
    const text =
        "{" +
        Array.from({ length: 40000 }, (_, index) => `"k${index}":0`).join(",") +
        "}",
      value = await session.select(await checked(session, text));
    let called = false;
    await assert.rejects(
      session.materializeControl(value, "1048576", () => {
        called = true;
      }),
      /materialization-budget/,
    );
    assert.equal(called, false);
    assert.equal(
      (await session.read(value, "source-json", "0", "1")).bytes.toString(),
      "{",
    );
    const metrics = (await core.command("metrics")).result;
    assert.equal(metrics.transitions, "1");
    assert.ok(BigInt(metrics.managedPeakBytes) <= 16777216n);
  } finally {
    await session.close();
  }
});
