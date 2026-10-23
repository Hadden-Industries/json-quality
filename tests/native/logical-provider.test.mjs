// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { checkLogicalProvider } from "../../src/logical-provider.js";
import { NativeSession } from "./client.mjs";

const contract = { formatContract: "producer-json-compact-body" };
const identity = (text) => ({
  byteLength: String(Buffer.byteLength(text)),
  sha256: createHash("sha256").update(text).digest("hex"),
});

test("logical provider selects the frozen physical pointer and streams its exact JSON", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    await session.command("census-provider", {
      id: "tree",
      kind: "physical",
      minimum: "1",
    });
    await session.command("census-add", {
      provider: "tree",
      path: "container.json",
    });
    const captured = await session.capture(
      [Buffer.from('{"a/b~c":"MA=="}')],
      contract,
      { includeValueEvents: false, retainValues: true },
    );
    for await (const event of session.events())
      if (event.type === "terminal")
        assert.equal(event.contractSatisfied, true);
    await session.command("census-bind", {
      path: "container.json",
      source: captured.source,
    });
    await session.command("census-close-inventory", { provider: "tree" });
    await session.command("census-close-provider", { provider: "tree" });
    const inventory = (async function* () {
      yield {
        path: "derived.json",
        containerPath: "container.json",
        pointer: "/a~1b~0c",
        encoding: "base64",
        ...identity("0"),
      };
    })();
    const events = [];
    for await (const event of checkLogicalProvider({
      session,
      inventory,
      definition: { id: "logical", minimumDocuments: 1 },
      contractFor: () => contract,
    }))
      events.push(event);
    assert.equal(events.filter(({ type }) => type === "terminal").length, 1);
    assert.equal(events.at(-1).path, "derived.json");
    assert.equal(events.at(-1).sourceSha256, identity("0").sha256);
    assert.equal(events.at(-1).contractSatisfied, true);
    assert.equal(
      (await session.command("census-status")).result.complete,
      true,
    );
    const logical = (
      await session.command("census-get", { path: "derived.json" })
    ).result.member;
    assert.equal(logical.linkage.containerSource, captured.source);
    assert.equal(logical.linkage.encoding, "base64");
    assert.equal(logical.linkage.value, events.at(-1).linkage.value);
    const read = await session.command("read-source", {
      source: logical.source,
      offset: "0",
      maximum: "65536",
    });
    assert.equal(read.data.toString(), "0");
  } finally {
    await session.close();
  }
});

for (const [scenario, text, pointer, pin, error] of [
  ["missing pointer", '{"payload":"0"}', "/missing", "0", /pointer-not-found/],
  [
    "non-string field",
    '{"payload":0}',
    "/payload",
    "0",
    /linked-source-needs-string/,
  ],
  [
    "changed decoded bytes",
    '{"payload":"0"}',
    "/payload",
    "1",
    /source-identity-digest/,
  ],
]) {
  test(`logical provider rejects ${scenario}`, async () => {
    const session = new NativeSession();
    try {
      await session.configure();
      await session.command("census-provider", {
        id: "tree",
        kind: "physical",
        minimum: "1",
      });
      await session.command("census-add", {
        provider: "tree",
        path: "container.json",
      });
      const captured = await session.capture([Buffer.from(text)], contract, {
        includeValueEvents: false,
        retainValues: true,
      });
      for await (const event of session.events())
        if (event.type === "terminal") assert.equal(event.parserComplete, true);
      await session.command("census-bind", {
        path: "container.json",
        source: captured.source,
      });
      const inventory = (async function* () {
        yield {
          path: "derived.json",
          containerPath: "container.json",
          pointer,
          encoding: "utf8",
          ...identity(pin),
        };
      })();
      await assert.rejects(async () => {
        for await (const event of checkLogicalProvider({
          session,
          inventory,
          definition: { id: "logical", minimumDocuments: 1 },
          contractFor: () => contract,
        }))
          assert.notEqual(event.type, "terminal");
      }, error);
    } finally {
      await session.close();
    }
  });
}

test("invalid logical JSON is completely checked and cannot turn membership completion into quality success", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    await session.command("census-provider", {
      id: "tree",
      kind: "physical",
      minimum: "1",
    });
    await session.command("census-add", {
      provider: "tree",
      path: "container.json",
    });
    const captured = await session.capture(
      [Buffer.from('{"payload":"not-json"}')],
      contract,
      { includeValueEvents: false, retainValues: true },
    );
    for await (const event of session.events())
      if (event.type === "terminal") assert.equal(event.parserComplete, true);
    await session.command("census-bind", {
      path: "container.json",
      source: captured.source,
    });
    await session.command("census-close-inventory", { provider: "tree" });
    await session.command("census-close-provider", { provider: "tree" });
    const inventory = (async function* () {
      yield {
        path: "derived.json",
        containerPath: "container.json",
        pointer: "/payload",
        encoding: "utf8",
        ...identity("not-json"),
      };
    })();
    let terminal;
    for await (const event of checkLogicalProvider({
      session,
      inventory,
      definition: { id: "logical", minimumDocuments: 1 },
      contractFor: () => contract,
    }))
      if (event.type === "terminal") terminal = event;
    assert.equal(terminal.parserComplete, false);
    assert.equal(terminal.rulesComplete, true);
    assert.equal(terminal.diagnosticsComplete, true);
    const status = (await session.command("census-status")).result;
    assert.equal(status.complete, true);
    assert.equal(status.contractSatisfied, false);
    assert.equal(status.qualityPassed, false);
  } finally {
    await session.close();
  }
});
