// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { NativeSession } from "./client.mjs";

test("populated preservation tries retain exact selection through a real spill", async () => {
  const core = new NativeSession();
  const value = "e\u0301";
  const values = Array.from({ length: 128 }, () => value);
  const contract = {
    formatContract: "producer-json-compact-body",
    allowSourceRewrites: false,
    owner: "Pin index oracle",
    reason: "Preserve exact decomposed test values",
    nfcExemptStringValues: values.map((_, i) => ({
      pointer: `/${i}`,
      sha256: createHash("sha256").update(value).digest("hex"),
      byteLength: "3",
    })),
  };
  const check = async (input) => {
    await core.capture([Buffer.from(JSON.stringify(input))], contract, {
      includeValueEvents: false,
      retainValues: true,
    });
    const findings = [];
    let terminal;
    for await (const event of core.events()) {
      if (event.type === "finding") findings.push(event);
      if (event.type === "terminal") terminal = event;
    }
    return { findings, terminal };
  };
  try {
    await core.configure({ maxManagedMemoryBytes: "16777216" });
    await core.command("adopt-control-state", { byteLength: "6291456" });
    for (let i = 0; i < 64; i++)
      assert.equal((await check(values)).terminal.contractSatisfied, true);
    const metrics = (await core.command("metrics")).result;
    assert.equal(metrics.spillTransitionCount, "1");
    assert.ok(BigInt(metrics.managedPeakBytes) <= 16777216n);
    assert.ok(BigInt(metrics.scratchPeakBytes) > 0n);
    const extra = await check([...values, value]);
    assert.equal(
      extra.findings.filter((f) => f.messageId === "unnormalized").length,
      1,
    );
    assert.equal(extra.terminal.contractSatisfied, false);
  } finally {
    await core.close();
  }
});
