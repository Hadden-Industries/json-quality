// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import * as api from "../../src/index.js";

test("the public cohort exposes sessions and events without aggregate compatibility entrypoints", () => {
  for (const name of [
    "openJsonSourceSession",
    "openJsonRepositorySession",
    "validateJsonQualityEvent",
    "formatJsonSource",
    "formatJsonValue",
    "normalizeJsonSource",
  ])
    assert.equal(typeof api[name], "function", name);
  for (const name of [
    "runJsonQuality",
    "checkJsonDocument",
    "checkJsonLines",
    "validateJsonQualityResult",
    "inspectJsonInventory",
    "checkJsonInventory",
    "formatJsonDocument",
    "decodeJsonBytes",
    "readJsonPolicy",
  ])
    assert.equal(Object.hasOwn(api, name), false, name);
});

test("public lossless numeric reads and explicit domain materialization share one scoped lifetime", async () => {
  const session = await api.openJsonSourceSession();
  let source, terminal;
  try {
    for await (const event of session.check({
      async *open() {
        yield Buffer.from('{\n  "v": 1.00\n}\n');
      },
    })) {
      assert.equal(api.validateJsonQualityEvent(event), true);
      if (event.type === "source") source = event.source;
      if (event.type === "terminal") terminal = event;
    }
    assert.equal(terminal.parserComplete, true);
    assert.equal(terminal.rulesComplete, true);
    assert.equal(terminal.diagnosticsComplete, true);
    assert.equal(terminal.contractSatisfied, true);
    const value = await session.select(source, "/v");
    assert.equal(
      (await session.read(value, "number-lexeme")).bytes.toString(),
      "1.00",
    );
    const root = await session.select(source),
      materialized = await session.materializeControl(
        root,
        "1024",
        (value) => value.v === 1,
      );
    assert.deepEqual(materialized.value, { v: 1 });
    await materialized.release();
    await session.close();
    await assert.rejects(
      session.read(value, "number-lexeme"),
      /closed-session/,
    );
  } finally {
    await session.close();
  }
});

test("public finite producer/source/NFC writers use the packaged shared core", async () => {
  assert.equal(await api.formatJsonSource('{"v":1.00}'), '{\n  "v": 1.00\n}\n');
  const formatted = await api.formatJsonValue({ v: 1 });
  assert.deepEqual(JSON.parse(formatted), { v: 1 });
  assert.equal(await api.normalizeJsonSource('{"v":"e\\u0301"}'), '{"v":"é"}');
  await assert.rejects(
    api.formatJsonSource("x".repeat(2097153)),
    /transform-source-capacity/,
  );
  await assert.rejects(
    api.openJsonSourceSession({ backend: "other" }),
    /session options/,
  );
});
