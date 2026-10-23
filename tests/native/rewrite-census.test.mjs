// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { NativeSession } from "./client.mjs";

async function capture(core, text, contract = {}, options = {}) {
  const source = await core.capture([Buffer.from(text)], contract, options);
  const findings = [];
  let terminal;
  for await (const event of core.events()) {
    if (event.type === "finding") findings.push(event);
    if (event.type === "terminal") terminal = event;
  }
  return { ...source, terminal, findings };
}
async function physical(core, documents, resources = {}, controlStateBytes) {
  await core.configure(resources);
  if (controlStateBytes)
    await core.command("adopt-control-state", {
      byteLength: controlStateBytes,
    });
  await core.command("census-provider", {
    id: "tree",
    kind: "physical",
    minimum: "1",
  });
  const sources = {};
  for (const [path, text] of Object.entries(documents)) {
    await core.command("census-add", { provider: "tree", path });
    sources[path] = await capture(core, text);
    await core.command("census-bind", { path, source: sources[path].source });
  }
  await core.command("census-close-inventory", { provider: "tree" });
  await core.command("census-close-provider", { provider: "tree" });
  return sources;
}

test("writer census refuses preflight while an unselected peer still fails", async () => {
  const core = new NativeSession();
  try {
    const sources = await physical(core, { "a.json": "0", "b.json": "1" });
    await core.command("rewrite-start", { operation: "format" });
    await core.command("rewrite-select", { path: "a.json" });
    const candidate = await capture(
      core,
      "0\n",
      {},
      { transformOf: sources["a.json"].source },
    );
    await core.command("rewrite-bind", {
      path: "a.json",
      source: candidate.source,
    });
    await assert.rejects(core.command("rewrite-admit"), /peer-preflight/);
  } finally {
    await core.close();
  }
});

test("writer census retains every admitted candidate and truthful partial completion", async () => {
  const core = new NativeSession();
  try {
    const sources = await physical(core, { "a.json": "0", "b.json": "1" });
    await core.command("rewrite-start", { operation: "format" });
    for (const [path, text] of [
      ["a.json", "0\n"],
      ["b.json", "1\n"],
    ]) {
      await core.command("rewrite-select", { path });
      const candidate = await capture(
        core,
        text,
        {},
        { transformOf: sources[path].source },
      );
      await core.command("rewrite-bind", { path, source: candidate.source });
    }
    assert.equal(
      (await core.command("rewrite-admit")).result.preflightComplete,
      true,
    );
    assert.equal(
      (
        await core.command("rewrite-written", {
          path: "a.json",
          observation: "verified-a",
        })
      ).result.writesComplete,
      false,
    );
    const partial = (await core.command("rewrite-status")).result;
    assert.equal(partial.selected, "2");
    assert.equal(partial.written, "1");
    assert.equal(
      (await core.command("rewrite-next", { after: "a.json" })).result.candidate
        .path,
      "b.json",
    );
    assert.equal(
      (
        await core.command("rewrite-written", {
          path: "b.json",
          observation: "verified-b",
        })
      ).result.writesComplete,
      true,
    );
  } finally {
    await core.close();
  }
});

test("a candidate cannot substitute unrelated accepted bytes for its original source", async () => {
  const core = new NativeSession();
  try {
    await physical(core, { "a.json": "0" });
    await core.command("rewrite-start", { operation: "format" });
    await core.command("rewrite-select", { path: "a.json" });
    const unrelated = await capture(core, "1\n");
    await assert.rejects(
      core.command("rewrite-bind", {
        path: "a.json",
        source: unrelated.source,
      }),
      /unrelated-candidate/,
    );
  } finally {
    await core.close();
  }
});

test("writer state cannot acknowledge a replacement before complete candidate admission", async () => {
  const core = new NativeSession();
  try {
    await physical(core, { "a.json": "0" });
    await core.command("rewrite-start", { operation: "format" });
    await core.command("rewrite-select", { path: "a.json" });
    await assert.rejects(
      core.command("rewrite-written", {
        path: "a.json",
        observation: "verified-a",
      }),
      /preflight-required/,
    );
  } finally {
    await core.close();
  }
});

test("unsafe numeric peers cannot acquire a formatting candidate", async () => {
  const core = new NativeSession();
  try {
    await physical(core, { "a.json": "9007199254740992\n" });
    await core.command("rewrite-start", { operation: "format" });
    await assert.rejects(
      core.command("rewrite-select", { path: "a.json" }),
      /unsafe-source/,
    );
  } finally {
    await core.close();
  }
});

test("candidate census and captured references survive a real spill with all seventeen tables reconciled", async () => {
  const core = new NativeSession(),
    text = '"' + "a".repeat(524288) + '"\n';
  try {
    const sources = await physical(
      core,
      { "a.json": text, "b.json": text, "c.json": text },
      { managedMemoryTargetBytes: "16777216" },
      "6291456",
    );
    await core.command("rewrite-start", { operation: "format" });
    for (const path of Object.keys(sources)) {
      await core.command("rewrite-select", { path });
      const candidate = await capture(
        core,
        text,
        {},
        { transformOf: sources[path].source },
      );
      await core.command("rewrite-bind", { path, source: candidate.source });
    }
    const status = (await core.command("rewrite-admit")).result,
      metrics = (await core.command("metrics")).result;
    assert.equal(status.selected, "3");
    assert.equal(status.changed, "0");
    assert.equal(status.writesComplete, true);
    assert.equal(metrics.transitions, "1");
    assert.ok(BigInt(metrics.managedPeakBytes) <= 16777216n);
    assert.ok(BigInt(metrics.scratchPeakBytes) > 0n);
    assert.equal(
      (await core.command("rewrite-next", { after: "a.json" })).result.candidate
        .path,
      "b.json",
    );
  } finally {
    await core.close();
  }
});

test("NFC-changed logical container bytes require a complete recheck of their actual derived member", async () => {
  const core = new NativeSession(),
    original = '{"embedded":"\\\"é\\\""}\n';
  try {
    const sources = await physical(core, { "container.json": original }),
      source = sources["container.json"].source,
      value = (
        await core.command("select-value", { source, pointer: "/embedded" })
      ).result.value.id,
      bytes = Buffer.from('"é"'),
      identity = {
        sha256: createHash("sha256").update(bytes).digest("hex"),
        byteLength: String(bytes.length),
      },
      contract = { formatContract: "producer-json-compact-body" };
    await core.command("census-provider", {
      id: "embedded",
      kind: "logical",
      minimum: "1",
    });
    await core.command("census-add", {
      provider: "embedded",
      path: "embedded.json",
      containerSource: source,
      value,
      encoding: "utf8",
      identity,
    });
    const linked = (
      await core.command("begin-linked-source", {
        value,
        encoding: "utf8",
        contract,
        retainValues: true,
        identity,
      })
    ).result;
    for await (const event of core.events()) void event;
    await core.command("census-bind", {
      path: "embedded.json",
      source: linked.source,
    });
    await core.command("census-close-inventory", { provider: "embedded" });
    await core.command("census-close-provider", { provider: "embedded" });
    await core.command("rewrite-start", { operation: "normalize" });
    await core.command("rewrite-select", { path: "container.json" });
    const candidate = await capture(
      core,
      '{"embedded":"\\\"é\\\""}\n',
      { formatContract: "producer-json-compact" },
      { transformOf: source },
    );
    assert.equal(
      candidate.terminal.contractSatisfied,
      true,
      JSON.stringify(candidate.findings),
    );
    await core.command("rewrite-bind", {
      path: "container.json",
      source: candidate.source,
    });
    assert.equal(
      (await core.command("rewrite-dependent")).result.member.path,
      "embedded.json",
    );
    const selected = (
        await core.command("rewrite-corresponding-value", {
          source: candidate.source,
          value,
        })
      ).result.value.id,
      derived = (
        await core.command("begin-linked-source", {
          value: selected,
          encoding: "utf8",
          contract,
          retainValues: true,
        })
      ).result;
    for await (const event of core.events()) void event;
    await core.command("rewrite-bind", {
      path: "embedded.json",
      source: derived.source,
    });
    assert.equal((await core.command("rewrite-dependent")).result.member, null);
    assert.equal(
      (await core.command("rewrite-admit")).result.preflightComplete,
      true,
    );
  } finally {
    await core.close();
  }
});
