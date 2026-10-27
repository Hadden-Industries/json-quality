// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { openJsonSourceSession } from "../../src/sessions.js";
import { NativeSession } from "./client.mjs";
import { resolveExecutionResources } from "../../src/execution-resources.js";

const unlimited = { capacityLimits: false, runtimeControls: false },
  contract = { formatContract: "producer-json-compact-body" },
  source = (text) => ({
    async *open() {
      yield Buffer.from(text);
    },
  });

test("unlimited ordinary checking and pointer selection cross 4096 containers", async () => {
  const session = await openJsonSourceSession(unlimited),
    depth = 4097;
  try {
    assert.ok(
      Object.values(session.resources.runtime).every((value) => value === null),
    );
    let captured, terminal;
    for await (const event of session.check(
      source("[".repeat(depth) + "0" + "]".repeat(depth)),
      contract,
    )) {
      assert.notEqual(event.type, "finding");
      if (event.type === "source") captured = event.source;
      if (event.type === "terminal") terminal = event;
    }
    assert.equal(terminal?.contractSatisfied, true);
    assert.equal(terminal?.diagnosticsComplete, true);
    const selected = await session.select(captured, "/0".repeat(depth));
    assert.ok(selected);
    assert.equal(
      (await session.read(selected, "number-lexeme")).bytes.toString(),
      "0",
    );
    assert.equal(
      (await session.read(selected, "json-pointer")).bytes.toString(),
      "/0".repeat(depth),
    );
  } finally {
    await session.close();
  }
});

test("an explicit 1 KiB budget remains binding beside otherwise unlimited reads", async () => {
  const session = await openJsonSourceSession({
    ...unlimited,
    capacityLimits: { maxFileBytes: 1024 },
  });
  let successfulTerminal = false;
  try {
    await assert.rejects(async () => {
      for await (const event of session.check(
        source('"' + "x".repeat(1024) + '"'),
        contract,
      ))
        if (event.type === "terminal" && event.contractSatisfied)
          successfulTerminal = true;
    }, /source-byte-capacity/);
    assert.equal(successfulTerminal, false);
  } finally {
    await session.close();
  }
});

test("an unlimited incremental opener is cancelled and settled without a terminal", async () => {
  const session = await openJsonSourceSession(unlimited);
  let opened,
    settled = false,
    successfulTerminal = false;
  const ready = new Promise((resolve) => {
    opened = resolve;
  });
  const reading = (async () => {
    for await (const event of session.check(
      {
        async *open({ signal }) {
          try {
            yield Buffer.from('"partial');
            opened();
            await new Promise((resolve) => {
              if (signal.aborted) resolve();
              else signal.addEventListener("abort", resolve, { once: true });
            });
            signal.throwIfAborted();
          } finally {
            settled = true;
          }
        },
      },
      contract,
    ))
      if (event.type === "terminal" && event.contractSatisfied)
        successfulTerminal = true;
  })();
  const rejected = assert.rejects(reading);
  await ready;
  await session.close();
  await rejected;
  assert.equal(settled, true);
  assert.equal(successfulTerminal, false);
});

test("unlimited aggregate quotas retain finite buffers and the adaptive working target", async () => {
  const session = new NativeSession(),
    block = Buffer.alloc(65536, 120),
    blocks = 640;
  function* input() {
    yield Buffer.from('"');
    for (let index = 0; index < blocks; index++) yield block;
    yield Buffer.from('"');
  }
  try {
    await session.configure(resolveExecutionResources({}, unlimited).native);
    const captured = await session.capture(input(), contract, {
      retainValues: false,
      includeValueEvents: false,
    });
    assert.equal(captured.byteLength, String(block.length * blocks + 2));
    let terminal;
    for await (const event of session.events())
      if (event.type === "terminal") terminal = event;
    assert.equal(terminal?.contractSatisfied, true);
    const metrics = (await session.command("metrics")).result;
    assert.equal(metrics.transitions, "1");
    assert.ok(BigInt(metrics.scratchPeakBytes) > 0n);
    assert.ok(BigInt(metrics.managedPeakBytes) < 40n * 1048576n);
    console.log(
      JSON.stringify({
        operation: "unlimited ordinary spill",
        sourceBytes: captured.byteLength,
        fragmentBytes: block.length,
        metrics,
      }),
    );
  } finally {
    await session.close();
  }
});

test("an explicit scratch budget produces an honest failure beside unlimited allocation and time", async () => {
  const session = new NativeSession();
  try {
    await session.configure(
      resolveExecutionResources(
        {},
        {
          capacityLimits: false,
          runtimeControls: {
            ...resolveExecutionResources({}, unlimited).runtime,
            maxTemporaryBytes: 1,
          },
        },
      ).native,
    );
    function* input() {
      yield Buffer.from('"');
      const block = Buffer.alloc(65536, 120);
      for (let index = 0; index < 640; index++) yield block;
      yield Buffer.from('"');
    }
    await assert.rejects(
      session.capture(input(), contract),
      /temporary-reservation/,
    );
  } finally {
    await session.close();
  }
});
