// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { formatSource } from "../../src/native-formatting.js";
import { normalizeSource } from "../../src/native-normalization.js";
import { NativeSession } from "./client.mjs";

for (const [name, transform, text, expected] of [
  ["format", formatSource, '{"n":1.00}', '{\n  "n": 1.00\n}\n'],
  ["normalize", normalizeSource, '{"v":"e\\u0301"}', '{"v":"é"}'],
]) {
  test(
    name +
      " shares the original configured store, policy charge and physical-source capacity",
    async () => {
      const core = new NativeSession(),
        base = "65536";
      try {
        await core.configure({ maxFiles: "1" });
        await core.command("adopt-control-state", { byteLength: base });
        const original = await core.capture([Buffer.from(text)]);
        for await (const event of core.events()) void event;
        const result = await transform(text, {
          core,
          parentSource: original.source,
          controlStateBytes: base,
          capacityLimits: { maxFiles: 1 },
        });
        assert.equal(result.text, expected);
        assert.notEqual(result.capture.source, original.source);
        assert.equal(
          result.capture.byteLength,
          String(Buffer.byteLength(expected)),
        );
        const held = (await core.command("metrics")).result;
        assert.ok(BigInt(held.controlStateReservationBytes) > BigInt(base));
        assert.equal(held.physicalSources, "1");
        await result.release();
        assert.equal(
          (await core.command("metrics")).result.controlStateReservationBytes,
          base,
        );
        assert.throws(() => result.text, /released-transform/);
        // The helper released only its own view; the execution still owns both
        // original and candidate facts and the configured one-file admission.
        assert.ok(
          (
            await core.command("source-statistics", {
              source: result.capture.source,
            })
          ).result.indexedValues,
        );
        await assert.rejects(
          core.capture([Buffer.from("0")]),
          /source-count-capacity/,
        );
      } finally {
        await core.close();
      }
    },
  );
}
