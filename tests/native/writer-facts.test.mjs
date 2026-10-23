// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { NativeSession } from "./client.mjs";

test("unselected presentation leaves shared syntax and semantic rules active", async () => {
  const core = new NativeSession();
  try {
    await core.configure();
    await core.capture([Buffer.from('{"a":1}')], { checkPresentation: false });
    let terminal;
    for await (const event of core.events()) terminal = event;
    assert.equal(terminal.qualityPassed, true);
    assert.equal(terminal.presentationChecked, false);
    assert.equal(terminal.presentationSelected, false);
    await core.capture([Buffer.from('{"a":1,"a":2}')], {
      checkPresentation: false,
    });
    let duplicate = false;
    for await (const event of core.events()) {
      if (event.ruleId === "json/no-duplicate-keys") duplicate = true;
      terminal = event;
    }
    assert.equal(duplicate, true);
    assert.equal(terminal.qualityPassed, false);
  } finally {
    await core.close();
  }
});

test("native value descriptions retain exact source byte spans for bounded explicit writers", async () => {
  const core = new NativeSession(),
    bytes = Buffer.from(' \n["e\\u0301",1e2]');
  try {
    await core.configure();
    const captured = await core.capture([bytes], { checkPresentation: false });
    for await (const event of core.events())
      if (event.type === "terminal") assert.equal(event.parserComplete, true);
    const value = (
        await core.command("select-value", {
          source: captured.source,
          pointer: "/0",
        })
      ).result.value,
      description = (await core.command("describe-value", { value: value.id }))
        .result.value;
    assert.equal(description.sourceByteOffset, "3");
    assert.equal(description.rawByteLength, "9");
    const read = await core.read(value.id, "source-json");
    assert.deepEqual(read.data, bytes.subarray(3, 12));
    assert.equal((await core.read(value.id, "nfc-utf8")).data.toString(), "é");
  } finally {
    await core.close();
  }
});
