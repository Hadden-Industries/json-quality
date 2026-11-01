// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { openJsonSourceSession } from "../../src/index.js";

const text =
  [
    "{",
    '  "left": {',
    '    "Ḍ̇": 0,',
    '    "Ḍ̇": 1,',
    '    "Ḍ̇": 2',
    "  },",
    '  "right": {',
    '    "Ḍ̇": 0,',
    '    "Ḍ̇": 1',
    "  }",
    "}",
  ].join("\n") + "\n";

for (const normalization of ["NFC", "preserve"]) {
  for (const retainValues of [false, true]) {
    test(`${normalization} collision identities distinguish containing objects with retainValues=${retainValues}`, async () => {
      const session = await openJsonSourceSession();
      try {
        const events = [];
        for await (const event of session.check(
          {
            async *open() {
              yield Buffer.from(text);
            },
          },
          { normalization, formatContract: "prettier-json" },
          { retainValues },
        ))
          events.push(event);
        const collisions = events.filter((event) =>
          normalization === "NFC"
            ? event.type === "finding" && event.messageId === "collision"
            : event.type === "nfc-key-collision-risk",
        );
        assert.equal(collisions.length, normalization === "NFC" ? 3 : 4);
        const fields = (event) =>
          normalization === "NFC" ? event.arguments : event;
        const left = fields(collisions[0]).containerValue,
          right = fields(collisions.at(-1)).containerValue;
        for (const event of collisions.slice(0, -1)) {
          const identity = fields(event);
          assert.equal(identity.containerValue.kind, "value");
          assert.equal(identity.priorValue.kind, "value");
          assert.equal(
            session.sameReference(left, identity.containerValue),
            true,
          );
          assert.equal(session.sameReference(left, identity.priorValue), false);
          assert.equal(event.column, "5");
          assert.equal(event.endLine, event.line);
          assert.equal(identity.priorColumn, "5");
          assert.equal(identity.priorEndLine, identity.priorLine);
          assert.equal(identity.priorEndColumn, "10");
        }
        assert.equal(session.sameReference(left, right), false);
        assert.equal(collisions[0].line, "4");
        assert.equal(collisions[0].endColumn, "10");
        assert.equal(fields(collisions[0]).priorLine, "3");
        assert.equal(collisions[1].line, "5");
        assert.equal(collisions[1].endColumn, "9");
        assert.equal(collisions.at(-1).line, "9");
        assert.equal(fields(collisions.at(-1)).priorLine, "8");
        if (retainValues) {
          assert.equal(
            (await session.read(left, "json-pointer")).bytes.toString(),
            "/left",
          );
          assert.equal(
            (await session.read(right, "json-pointer")).bytes.toString(),
            "/right",
          );
          assert.equal((await session.describe(left)).valueKind, "object");
        } else {
          await assert.rejects(session.describe(left), /unknown-value/u);
          await assert.rejects(
            session.read(right, "json-pointer"),
            /unknown-value/u,
          );
        }
        assert.equal(events.at(-1).qualityPassed, normalization === "preserve");
      } finally {
        await session.close();
      }
    });
  }
}

test("retained collision object identity exposes its exact escaped pointer through bounded reads", async () => {
  const session = await openJsonSourceSession();
  try {
    const source = '{"a/b~c":[{"é":0,"é":1}]}',
      events = [];
    for await (const event of session.check(
      {
        async *open() {
          yield Buffer.from(source);
        },
      },
      {
        normalization: "preserve",
        formatContract: "producer-json-compact-body",
      },
      { retainValues: true },
    ))
      events.push(event);
    const collision = events.find(
        (event) => event.type === "nfc-key-collision-risk",
      ),
      chunks = [];
    for await (const bytes of session.fragments(
      collision.containerValue,
      "json-pointer",
    ))
      chunks.push(bytes);
    assert.equal(Buffer.concat(chunks).toString(), "/a~1b~0c/0");
    assert.equal(events.at(-1).qualityPassed, true);
  } finally {
    await session.close();
  }
});

test("JSONL collision container identities stay distinct when record-local pointers are both empty", async () => {
  const session = await openJsonSourceSession();
  try {
    const events = [];
    for await (const event of session.check(
      {
        async *open() {
          yield Buffer.from('{"é":0,"é":1}\n{"é":0,"é":1}\n');
        },
      },
      {
        normalization: "preserve",
        format: "jsonl",
        formatContract: "producer-json-compact-body",
      },
      { retainValues: true },
    ))
      if (event.type === "nfc-key-collision-risk") events.push(event);
    assert.equal(events.length, 2);
    assert.deepEqual(
      events.map((event) => event.record),
      ["1", "2"],
    );
    assert.equal(
      session.sameReference(events[0].containerValue, events[1].containerValue),
      false,
    );
    for (const event of events)
      assert.equal(
        (
          await session.read(event.containerValue, "json-pointer")
        ).bytes.toString(),
        "",
      );
  } finally {
    await session.close();
  }
});

test("a giant containing-object pointer remains streamed while its collision identity stays bounded", async () => {
  const session = await openJsonSourceSession();
  try {
    const name = "segment/~".repeat(10000),
      source = Buffer.from(`{${JSON.stringify(name)}:{"é":0,"é":1}}`);
    let collision;
    for await (const event of session.check(
      {
        async *open() {
          for (let offset = 0; offset < source.length; offset += 65536)
            yield source.subarray(offset, offset + 65536);
        },
      },
      {
        normalization: "preserve",
        formatContract: "producer-json-compact-body",
      },
      { retainValues: true },
    ))
      if (event.type === "nfc-key-collision-risk") collision = event;
    assert.ok(collision);
    assert.ok(Buffer.byteLength(JSON.stringify(collision)) < 2048);
    const chunks = [];
    for await (const bytes of session.fragments(
      collision.containerValue,
      "json-pointer",
    )) {
      assert.ok(bytes.length <= 65536);
      chunks.push(bytes);
    }
    assert.ok(chunks.length > 1);
    assert.equal(
      Buffer.concat(chunks).toString(),
      "/" + name.replaceAll("~", "~0").replaceAll("/", "~1"),
    );
  } finally {
    await session.close();
  }
});
