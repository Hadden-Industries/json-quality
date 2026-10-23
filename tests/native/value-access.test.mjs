// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { NativeSession } from "./client.mjs";

for (const text of [
  '{"payload":"0","payload":"1","safe":"2"}',
  '{"payload":"0","pay\\u006coad":"1","safe":"2"}',
]) {
  test(
    "ambiguous decoded object pointers refuse selection while exact value references remain readable: " +
      text,
    async () => {
      const session = new NativeSession();
      try {
        await session.configure();
        const captured = await session.capture([Buffer.from(text)], {
          formatContract: "producer-json-compact-body",
        });
        const values = [];
        for await (const event of session.events()) {
          if (event.type === "value" && event.kind === "string")
            values.push(event.id);
          if (event.type === "terminal") {
            assert.equal(event.parserComplete, true);
            assert.equal(event.qualityPassed, false);
          }
        }
        assert.equal(values.length, 3);
        await assert.rejects(
          session.command("select-value", {
            source: captured.source,
            pointer: "/payload",
          }),
          /pointer-ambiguous/,
        );
        assert.equal(
          (await session.read(values[0], "decoded-utf8")).data.toString(),
          "0",
        );
        const safe = (
          await session.command("select-value", {
            source: captured.source,
            pointer: "/safe",
          })
        ).result.value;
        assert.equal(
          (await session.read(safe.id, "decoded-utf8")).data.toString(),
          "2",
        );
      } finally {
        await session.close();
      }
    },
  );
}

const contract = { formatContract: "producer-json-compact-body" };

test("streamed pointer lookup reads an identified frozen pointer without a control-sized key copy", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    const captured = await session.capture(
      [Buffer.from('{"a/b~c":["selected"]}')],
      contract,
    );
    for await (const event of session.events())
      if (event.type === "terminal")
        assert.equal(event.contractSatisfied, true);
    const pointer = Buffer.from("/a~1b~0c/0");
    const frozen = await session.capture(
      [pointer],
      {},
      {
        sourceKind: "authority",
        identity: {
          byteLength: String(pointer.length),
          sha256: createHash("sha256").update(pointer).digest("hex"),
        },
      },
    );
    const selected = (
      await session.command("select-value-pointer-source", {
        source: captured.source,
        pointerSource: frozen.source,
      })
    ).result.value;
    assert.equal(
      (await session.read(selected.id, "decoded-utf8")).data.toString(),
      "selected",
    );
  } finally {
    await session.close();
  }
});
async function collect(session) {
  const events = [];
  for await (const event of session.events()) events.push(event);
  return { events, terminal: events.at(-1) };
}
async function select(session, source, pointer, fields = {}) {
  return (await session.command("select-value", { source, pointer, ...fields }))
    .result.value;
}

test("retained values can be selected after another parser has replaced their owner", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    const captured = await session.capture(
      [Buffer.from('{"a/b":{"~":[0,{"content":"é"}]}}')],
      contract,
      { includeValueEvents: false, retainValues: true },
    );
    const initial = await collect(session);
    assert.equal(initial.terminal.parserComplete, true);
    assert.ok(initial.events.every((event) => event.type !== "value"));
    const pointer = "/a~1b/~0/1/content";
    const value = await select(session, captured.source, pointer);
    assert.equal(
      (await session.read(value.id, "decoded-utf8")).data.toString(),
      "é",
    );
    assert.equal(
      (await session.read(value.id, "json-pointer")).data.toString(),
      pointer,
    );
    const object = await select(session, captured.source, "/a~1b/~0/1");
    assert.equal(object.closed, true);
    assert.equal(
      (await session.read(object.id, "source-json")).data.toString(),
      '{"content":"é"}',
    );
    await assert.rejects(
      select(session, captured.source, "/missing"),
      /pointer-not-found/,
    );
    await assert.rejects(
      select(session, captured.source, "/a~2b"),
      /pointer-escape/,
    );
    await session.capture([Buffer.from("0")], contract);
    await collect(session);
    assert.equal(
      (await select(session, captured.source, pointer)).id,
      value.id,
    );
    assert.equal(
      (await session.read(value.id, "json-pointer")).data.toString(),
      pointer,
    );
  } finally {
    await session.close();
  }
});

test("record-local pointers retain their physical JSONL record correlation", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    const captured = await session.capture(
      [Buffer.from('{"x":1}\n{"x":2}\n')],
      { ...contract, format: "jsonl" },
      { includeValueEvents: false, retainValues: true },
    );
    assert.equal((await collect(session)).terminal.qualityPassed, true);
    const value = await select(session, captured.source, "/x", { record: "2" });
    assert.equal(value.record, "2");
    assert.equal(
      (await session.read(value.id, "number-lexeme")).data.toString(),
      "2",
    );
    assert.equal(
      (await session.read(value.id, "json-pointer")).data.toString(),
      "/x",
    );
    await assert.rejects(
      select(session, captured.source, "/x", { record: "3" }),
      /pointer-not-found/,
    );
    assert.equal(
      (await session.read(value.id, "number-lexeme")).data.toString(),
      "2",
    );
  } finally {
    await session.close();
  }
});

test("ordinary checks refuse unretained selections without losing their root", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    const captured = await session.capture([Buffer.from('{"x":1}')], contract, {
      includeValueEvents: false,
    });
    assert.equal((await collect(session)).terminal.qualityPassed, true);
    await assert.rejects(
      select(session, captured.source, "/x"),
      /source-values-not-retained/,
    );
    const root = await select(session, captured.source, "");
    assert.equal((await session.read(root.id, "json-pointer")).data.length, 0);
    assert.equal(
      (await session.read(root.id, "source-json")).data.toString(),
      '{"x":1}',
    );
  } finally {
    await session.close();
  }
});

test("a finding under a giant key has a bounded, exact pointer across spill", async () => {
  const session = new NativeSession();
  try {
    await session.configure({ managedMemoryTargetBytes: "16777216" });
    const repetitions = 2 * 1024 * 1024,
      blockRepetitions = 8192;
    function* source() {
      yield Buffer.from('{"outer":{"');
      const block = Buffer.from("a/~".repeat(blockRepetitions));
      for (let index = 0; index < repetitions / blockRepetitions; index++)
        yield block;
      yield Buffer.from('":"é"}}');
    }
    await session.capture(source(), contract, { includeValueEvents: false });
    const { events, terminal } = await collect(session);
    assert.equal(terminal.parserComplete, true);
    assert.equal(terminal.rulesComplete, true);
    assert.equal(terminal.qualityPassed, false);
    assert.equal(terminal.transitions, "0");
    const finding = events.find(
      (event) => event.type === "finding" && event.messageId === "unnormalized",
    );
    assert.ok(finding);
    assert.ok(Buffer.byteLength(JSON.stringify(finding)) < 2048);
    await assert.rejects(
      session.command("reserve-materialization", {
        value: finding.value,
        representation: "json-pointer",
        maximum: "8",
      }),
      /materialization-capacity/,
    );
    assert.equal((await session.command("metrics")).result.transitions, "0");
    const expected = createHash("sha256").update("/outer/");
    const escaped = Buffer.from("a~1~0".repeat(blockRepetitions));
    for (let index = 0; index < repetitions / blockRepetitions; index++)
      expected.update(escaped);
    const actual = createHash("sha256");
    let offset = 0n,
      total;
    do {
      const { result, data } = await session.read(
        finding.value,
        "json-pointer",
        String(offset),
      );
      assert.ok(data.length <= 65536);
      assert.ok(data.length > 0);
      actual.update(data);
      total = BigInt(result.totalByteLength);
      offset += BigInt(data.length);
    } while (offset < total);
    assert.equal(total, BigInt(7 + 5 * repetitions));
    assert.equal(actual.digest("hex"), expected.digest("hex"));
    const metrics = (await session.command("metrics")).result;
    assert.equal(metrics.transitions, "1");
    assert.ok(BigInt(metrics.managedPeakBytes) <= 16777216n);
    assert.equal(
      (await session.read(finding.value, "decoded-utf8")).data.toString(),
      "é",
    );
  } finally {
    await session.close();
  }
});
