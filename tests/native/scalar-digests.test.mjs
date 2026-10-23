// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { NativeSession } from "./client.mjs";

test("successive empty, escaped, Unicode and fragmented scalar digests match independent messages", async () => {
  const session = new NativeSession(),
    values = [
      "first",
      "",
      "é",
      "😀",
      "é",
      "x".repeat(150000),
      "",
      ...Array.from({ length: 150 }, (_, index) => "distinct_" + index),
    ];
  try {
    await session.configure();
    await session.capture([Buffer.from(JSON.stringify(values))], {
      formatContract: "producer-json-compact-body",
    });
    let index = 0;
    for await (const event of session.events()) {
      if (event.type !== "value" || event.kind !== "string") continue;
      assert.equal(
        event.sha256,
        createHash("sha256").update(values[index]).digest("hex"),
      );
      assert.equal(event.byteLength, String(Buffer.byteLength(values[index])));
      index++;
    }
    assert.equal(index, values.length);
  } finally {
    await session.close();
  }
});
