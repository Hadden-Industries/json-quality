// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";
import { createHash } from "node:crypto";
import { NativeSession } from "./client.mjs";

const contract = { formatContract: "producer-json-compact-body" };
async function finish(session) {
  let terminal;
  for await (const event of session.events())
    if (event.type === "terminal") terminal = event;
  return terminal;
}

test("bounded transport batches freeze reused producer views across tiny fragments and EOF", async () => {
  const session = new NativeSession(),
    expected = Buffer.from(
      '"' +
        Array.from({ length: 97 }, (_, index) =>
          String.fromCharCode(97 + (index % 26)),
        ).join("") +
        '"',
    );
  function* input() {
    const byte = Buffer.alloc(1);
    byte[0] = 34;
    yield byte;
    for (let index = 0; index < 97; index++) {
      byte[0] = 97 + (index % 26);
      yield byte;
      if (index % 4 === 0) yield Buffer.alloc(0);
    }
    byte[0] = 34;
    yield byte;
    byte[0] = 255;
  }
  try {
    await session.configure();
    const captured = await session.capture(input(), contract, {
      identity: {
        byteLength: String(expected.length),
        sha256: createHash("sha256").update(expected).digest("hex"),
      },
    });
    assert.equal((await finish(session)).contractSatisfied, true);
    assert.deepEqual(
      (await readSource(session, captured.source)).data,
      expected,
    );
  } finally {
    await session.close();
  }
});
function readSource(session, source, offset = "0", maximum = "65536") {
  return session.command("read-source", { source, offset, maximum });
}

test("raw source bytes are frozen before grammar and survive subsequent sources", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    const bytes = Buffer.from(" \n0\t\n"),
      captured = await session.capture([bytes], contract);
    assert.deepEqual((await readSource(session, captured.source)).data, bytes);
    assert.equal((await finish(session)).parserComplete, true);
    await session.capture([Buffer.from("1")], contract);
    await finish(session);
    assert.deepEqual(
      (await readSource(session, captured.source, "1", "3")).data,
      bytes.subarray(1, 4),
    );
    await assert.rejects(
      readSource(session, captured.source, "999"),
      /stream-read-boundary/,
    );
    await assert.rejects(readSource(session, "999"), /unknown-source/);
    assert.deepEqual((await readSource(session, captured.source)).data, bytes);
  } finally {
    await session.close();
  }
});

test("invalid UTF-8 remains exact raw evidence and establishes no JSONL record count", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    const bytes = Buffer.from([0x30, 0x0a, 0xff]),
      captured = await session.capture([bytes], {
        ...contract,
        format: "jsonl",
      });
    const terminal = await finish(session);
    assert.equal(terminal.parserComplete, false);
    assert.equal(terminal.recordCount, null);
    assert.deepEqual((await readSource(session, captured.source)).data, bytes);
    assert.equal(
      (await session.command("metrics")).result.recordsAdmitted,
      "0",
    );
  } finally {
    await session.close();
  }
});

test("insufficient scratch for the owner marker fails before creating a directory", async () => {
  const session = new NativeSession();
  try {
    await session.configure({
      managedMemoryTargetBytes: "16777216",
      maxTemporaryBytes: "1",
    });
    function* source() {
      yield Buffer.from('"');
      const block = Buffer.alloc(65536, 97);
      for (let index = 0; index < 200; index++) yield block;
      yield Buffer.from('"');
    }
    await assert.rejects(
      session.capture(source(), contract),
      /temporary-reservation/,
    );
  } finally {
    await session.close();
  }
  await assert.rejects(access(session.scratch), { code: "ENOENT" });
});
