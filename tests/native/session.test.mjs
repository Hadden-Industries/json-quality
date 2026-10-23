// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { access, mkdir, readdir, rmdir } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import test from "node:test";
import { NativeSession, nativeTemporaryRoot } from "./client.mjs";

async function collect(session) {
  const events = [];
  for await (const event of session.events()) events.push(event);
  return { events, terminal: events.at(-1) };
}

test("unperformed NFC derivation is refused without losing decoded bytes", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    await session.capture([Buffer.from('"e\u0301"')], {
      normalization: "preserve",
      formatContract: "producer-json-compact-body",
    });
    const { events, terminal } = await collect(session);
    assert.equal(terminal.qualityPassed, true);
    const value = events.find(
      (event) => event.type === "value" && event.kind === "string",
    ).id;
    await assert.rejects(
      session.read(value, "nfc-utf8"),
      /value-representation/,
    );
    assert.equal(
      (await session.read(value, "decoded-utf8")).data.toString(),
      "e\u0301",
    );
    assert.equal(
      (await session.command("metrics")).result.scratchPeakBytes,
      "0",
    );
  } finally {
    await session.close();
  }
});

test("preserved normalization still rejects exact duplicate keys", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    await session.capture([Buffer.from('{"é":1,"é":2}')], {
      normalization: "preserve",
      formatContract: "producer-json-compact-body",
    });
    const { events, terminal } = await collect(session);
    assert.equal(terminal.qualityPassed, false);
    assert.deepEqual(
      events
        .filter((event) => event.type === "finding" && event.phase === "lint")
        .map((event) => event.messageId),
      ["duplicateKey"],
    );
  } finally {
    await session.close();
  }
});

test("materialization refusal and release preserve exact fragment access", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    await session.capture([Buffer.from('"fragment"')], {
      formatContract: "producer-json-compact-body",
    });
    const { events, terminal } = await collect(session);
    assert.equal(terminal.qualityPassed, true);
    const value = events.find((event) => event.type === "value").id;
    const fields = { value, representation: "decoded-utf8" };
    await assert.rejects(
      session.command("reserve-materialization", { ...fields, maximum: "7" }),
      /materialization-capacity/,
    );
    await assert.rejects(
      session.read(value, "decoded-utf8", "01"),
      /integer-wire-form/,
    );
    await assert.rejects(
      session.read(value, "decoded-utf8", "0", 8),
      /invalid-range-request/,
    );
    const before = (await session.command("metrics")).result.managedBytes;
    const { result } = await session.command("reserve-materialization", {
      ...fields,
      maximum: "8",
    });
    assert.equal(result.byteLength, "8");
    await assert.rejects(
      session.command("release-materialization", { reservation: "wrong" }),
      /materialization-authority/,
    );
    await assert.rejects(
      session.command("reserve-materialization", { ...fields, maximum: "8" }),
      /materialization-already-reserved/,
    );
    assert.equal(
      (await session.read(value, "decoded-utf8", "2", "3")).data.toString(),
      "agm",
    );
    await session.command("release-materialization", {
      reservation: result.reservation,
    });
    assert.equal(
      (await session.command("metrics")).result.managedBytes,
      before,
    );
    assert.equal(
      (await session.read(value, "decoded-utf8")).data.toString(),
      "fragment",
    );
  } finally {
    await session.close();
  }
});

test("identified capture verifies its declared bytes before exposing values", async () => {
  const bytes = Buffer.from('"source"');
  const identity = {
    sha256: createHash("sha256").update(bytes).digest("hex"),
    byteLength: String(bytes.length),
  };
  const session = new NativeSession();
  try {
    await session.configure();
    const captured = await session.capture(
      [bytes],
      { formatContract: "producer-json-compact-body" },
      { identity },
    );
    const { events, terminal } = await collect(session);
    assert.equal(terminal.contractSatisfied, true);
    assert.ok(events.every((event) => event.source === captured.source));
    await assert.rejects(
      session.capture([Buffer.from('"mutate"')], {}, { identity }),
      /source-identity-digest/,
    );
  } finally {
    await session.close();
  }
});

test("materialization cannot consume memory already owned by retained state", async () => {
  const session = new NativeSession();
  try {
    await session.configure({ managedMemoryTargetBytes: "16777216" });
    function* input() {
      yield Buffer.from('"');
      const block = Buffer.alloc(65536, 97);
      for (let index = 0; index < 80; index++) yield block;
      yield Buffer.from('"\n');
    }
    await session.capture(input());
    const { events, terminal } = await collect(session);
    assert.equal(terminal.qualityPassed, true);
    assert.equal(terminal.transitions, "0");
    const value = events.find((event) => event.type === "value").id;
    await assert.rejects(
      session.command("reserve-materialization", {
        value,
        representation: "decoded-utf8",
        maximum: "5242880",
      }),
      /materialization-budget/,
    );
    assert.deepEqual(
      (await session.read(value, "decoded-utf8", "5242878", "2")).data,
      Buffer.from("aa"),
    );
  } finally {
    await session.close();
  }
});

test("elapsed deadline applies to unfinished capture and still allows cleanup", async () => {
  const session = new NativeSession();
  try {
    await session.configure({ maxCheckTimeMs: "100" });
    await session.command("begin-source", { contract: {} });
    await setTimeout(150);
    await assert.rejects(session.command("metrics"), /check-time-capacity/);
  } finally {
    await session.close();
  }
  await assert.rejects(access(session.scratch), { code: "ENOENT" });
});

test("cancellation interrupts work off the JavaScript event loop and cleans a real spill", async () => {
  const directory = join(
    nativeTemporaryRoot,
    "json-quality-cancel-ž-😀-" + randomUUID(),
  );
  const first = join(directory, "p".repeat(120));
  const working = join(first, "q".repeat(120));
  for (const path of [directory, first, working]) await mkdir(path);
  const session = new NativeSession({ temporaryDirectory: working });
  try {
    await session.configure({
      managedMemoryTargetBytes: "16777216",
      maxFileBytes: null,
    });
    function* input() {
      yield Buffer.from('"');
      const block = Buffer.from("\\u0061".repeat(8191));
      for (let index = 0; index < 400; ++index) yield block;
      yield Buffer.from('"\n');
    }
    await session.capture(input());
    assert.equal((await session.command("metrics")).result.transitions, "1");
    const checking = session.command("next");
    const timer = globalThis.setTimeout(() => session.cancel(), 10);
    try {
      await assert.rejects(checking, /cancelled/);
    } finally {
      globalThis.clearTimeout(timer);
    }
  } finally {
    await session.close();
    assert.deepEqual(await readdir(working), []);
    for (const path of [working, first, directory]) await rmdir(path);
  }
});
