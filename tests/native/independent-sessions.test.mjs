// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { NativeSession } from "./client.mjs";

test("independent sessions overlap spill work with isolated metadata and allocation owners", async () => {
  const sessions = [new NativeSession(), new NativeSession()];
  try {
    await Promise.all(
      sessions.map(async (session, index) => {
        await session.configure({ managedMemoryTargetBytes: "16777216" });
        function* input() {
          yield Buffer.from('"');
          const block = Buffer.alloc(65536, 65 + index);
          for (let part = 0; part < 192; part++) yield block;
          yield Buffer.from('"');
        }
        const captured = await session.capture(
          input(),
          {
            formatContract: "producer-json-compact-body",
          },
          { includeValueEvents: false, retainValues: true },
        );
        let terminal;
        for await (const event of session.events())
          if (event.type === "terminal") terminal = event;
        assert.equal(terminal.contractSatisfied, true);
        const value = (
            await session.command("select-value", {
              source: captured.source,
              pointer: "",
            })
          ).result.value.id,
          fragment = await session.read(value, "decoded-utf8", "0", "5"),
          metrics = (await session.command("metrics")).result;
        assert.equal(
          fragment.data.toString(),
          String.fromCharCode(65 + index).repeat(5),
        );
        assert.equal(metrics.transitions, "1");
        assert.ok(BigInt(metrics.managedPeakBytes) <= 16777216n);
        assert.ok(BigInt(metrics.scratchPeakBytes) > 0n);
      }),
    );
  } finally {
    await Promise.all(sessions.map((session) => session.close()));
  }
});
