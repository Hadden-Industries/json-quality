// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { NativeSession } from "./client.mjs";

async function captured(core, text, transformOf) {
  const source = await core.capture(
    [Buffer.from(text)],
    { checkPresentation: false },
    { retainValues: true, transformOf },
  );
  let terminal;
  for await (const event of core.events())
    if (event.type === "terminal") terminal = event;
  assert.equal(terminal.qualityPassed, true);
  return source.source;
}

test("retained meaning comparison preserves decoded strings, ordering, literals and exact number lexemes", async () => {
  const core = new NativeSession();
  try {
    await core.configure({ managedMemoryTargetBytes: "16777216" });
    const first = await captured(core, '{"n":1e0,"v":[true,null,"\\u0061"]}'),
      same = await captured(
        core,
        ' { "n": 1e0, "v": [true, null, "a"] } ',
        first,
      ),
      facts = (await core.command("source-statistics", { source: first }))
        .result;
    assert.equal(facts.indexedValues, "8");
    assert.equal(
      (await core.command("compare-sources", { first, second: same })).result
        .sameMeaning,
      true,
    );
    for (const text of [
      '{"n":1,"v":[true,null,"a"]}',
      '{"v":[true,null,"a"],"n":1e0}',
      '{"n":1e0,"v":[false,null,"a"]}',
    ]) {
      const second = await captured(core, text, first);
      assert.equal(
        (await core.command("compare-sources", { first, second })).result
          .sameMeaning,
        false,
      );
    }
  } finally {
    await core.close();
  }
});

test("writer workspace can cause one spill, then refuses excess without invalidating existing sources", async () => {
  const core = new NativeSession();
  try {
    await core.configure({ managedMemoryTargetBytes: "16777216" });
    const first = await captured(core, '"' + "x".repeat(3 * 1024 * 1024) + '"');
    await core.command("resize-control-state", { byteLength: "6291456" });
    assert.equal((await core.command("metrics")).result.transitions, "1");
    await assert.rejects(
      core.command("resize-control-state", { byteLength: "16777216" }),
      /control-state-budget/,
    );
    assert.equal(
      (await core.command("source-statistics", { source: first })).result
        .indexedValues,
      "1",
    );
    await core.command("resize-control-state", { byteLength: "1" });
    assert.ok(
      BigInt((await core.command("metrics")).result.managedPeakBytes) <=
        16777216n,
    );
  } finally {
    await core.close();
  }
});

test("dense ordered source comparison completes within its finite operation deadline", async () => {
  const core = new NativeSession();
  try {
    await core.configure({
      managedMemoryTargetBytes: "67108864",
      maxCheckTimeMs: "10000",
    });
    const first = await captured(core, "[" + "0,".repeat(39999) + "0]");
    const second = await captured(
      core,
      "[\n" + "0,\n".repeat(39999) + "0\n]",
      first,
    );
    for (const source of [first, second])
      assert.equal(
        (await core.command("source-statistics", { source })).result
          .indexedValues,
        "40001",
      );
    assert.equal(
      (await core.command("compare-sources", { first, second })).result
        .sameMeaning,
      true,
    );
  } finally {
    await core.close();
  }
});
