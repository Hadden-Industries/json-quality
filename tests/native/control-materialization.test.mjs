// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { NativeSession } from "./client.mjs";

test("control JSON reserves its byte and object state before materialization", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    const captured = await session.capture([Buffer.from('{"a":"0","b":[1]}')], {
      formatContract: "producer-json-compact-body",
    });
    for await (const event of session.events())
      if (event.type === "terminal")
        assert.equal(event.contractSatisfied, true);
    const value = (
        await session.command("select-value", {
          source: captured.source,
          pointer: "",
        })
      ).result.value,
      before = (await session.command("metrics")).result.managedBytes,
      reserved = (
        await session.command("reserve-control-materialization", {
          value: value.id,
          representation: "source-json",
          maximum: "1024",
        })
      ).result;
    assert.ok(
      BigInt(reserved.managedReservationBytes) >
        5n * BigInt(value.rawByteLength),
    );
    const during = BigInt(
      (await session.command("metrics")).result.managedBytes,
    );
    assert.ok(
      during >= BigInt(before) + BigInt(reserved.managedReservationBytes),
    );
    await session.command("release-materialization", {
      reservation: reserved.reservation,
    });
    assert.equal(
      BigInt((await session.command("metrics")).result.managedBytes),
      during - BigInt(reserved.managedReservationBytes),
    );
  } finally {
    await session.close();
  }
});

test("retained policy state occupies the same budget before repository storage begins", async () => {
  const session = new NativeSession();
  try {
    await session.configure({ managedMemoryTargetBytes: "16777216" });
    await assert.rejects(
      session.command("adopt-control-state", { byteLength: "16777216" }),
      /control-state-budget/,
    );
    await session.command("adopt-control-state", { byteLength: "1048576" });
    await session.capture([Buffer.from("0")], {
      formatContract: "producer-json-compact-body",
    });
    for await (const event of session.events())
      if (event.type === "terminal")
        assert.equal(event.contractSatisfied, true);
    assert.equal(
      (await session.command("metrics")).result.controlStateReservationBytes,
      "1048576",
    );
  } finally {
    await session.close();
  }
});
