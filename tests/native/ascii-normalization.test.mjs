// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { NativeSession } from "./client.mjs";

test("decoded ASCII identity and late Unicode composition preserve exact NFC reads", async () => {
  const session = new NativeSession(),
    strings = [
      Array.from({ length: 128 }, (_, index) =>
        String.fromCharCode(index),
      ).join(""),
      "a".repeat(70000) + "e\u0301",
      "ASCII after Unicode",
      "",
    ],
    bytes = Buffer.from(JSON.stringify(strings));
  try {
    await session.configure();
    function* fragments() {
      for (let offset = 0; offset < bytes.length; offset += 4096)
        yield bytes.subarray(offset, offset + 4096);
    }
    await session.capture(fragments(), {
      formatContract: "producer-json-compact-body",
    });
    const references = [];
    let terminal;
    for await (const event of session.events()) {
      if (event.type === "value" && event.kind === "string")
        references.push(event.id);
      if (event.type === "terminal") terminal = event;
    }
    assert.equal(terminal.parserComplete, true);
    assert.equal(references.length, strings.length);
    for (let index = 0; index < references.length; index++) {
      const hash = createHash("sha256");
      let offset = 0;
      while (true) {
        const { data } = await session.read(
          references[index],
          "nfc-utf8",
          String(offset),
          "65536",
        );
        if (!data.length) break;
        hash.update(data);
        offset += data.length;
      }
      const expected = Buffer.from(strings[index].normalize("NFC"));
      assert.equal(offset, expected.length);
      assert.equal(
        hash.digest("hex"),
        createHash("sha256").update(expected).digest("hex"),
      );
    }
  } finally {
    await session.close();
  }
});

test("escaped ASCII keys still receive duplicate and whitespace diagnostics", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    await session.capture(
      [Buffer.from('{"a":0,"\\u0061":1,"\\u0020":2," a":3}')],
      {
        formatContract: "producer-json-compact-body",
      },
    );
    const rules = new Set();
    let terminal;
    for await (const event of session.events()) {
      if (event.type === "finding") rules.add(event.ruleId);
      if (event.type === "terminal") terminal = event;
    }
    assert.equal(terminal.parserComplete, true);
    assert.equal(terminal.qualityPassed, false);
    assert.ok(rules.has("json/no-duplicate-keys"));
    assert.ok(rules.has("json/no-empty-keys"));
    assert.ok(rules.has("json-quality/meaningful-keys"));
  } finally {
    await session.close();
  }
});

test("preserved non-ASCII bytes cannot be advertised as an NFC representation", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    await session.capture([Buffer.from('"e\\u0301"')], {
      normalization: "preserve",
      formatContract: "producer-json-compact-body",
    });
    let value;
    for await (const event of session.events())
      if (event.type === "value") value = event;
    assert.equal(value.nfcAvailable, false);
    await assert.rejects(session.read(value.id, "nfc-utf8"), /representation/);
  } finally {
    await session.close();
  }
});
