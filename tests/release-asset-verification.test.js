// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import { checkAssets } from "../scripts/release-asset-verification.js";

function fixture(t, count = 19) {
  const directory = mkdtempSync(
    join(tmpdir(), "json-quality-asset-verification-"),
  );
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const assets = Array.from({ length: count }, (_, index) => ({
    name: `${index}.json`,
  }));
  for (const asset of assets) writeFileSync(join(directory, asset.name), "{}");
  return { version: "1.0.0-rc.1", directory, assets };
}
test("all assets receive native verification with at most six distinct-cache workers", async (t) => {
  const input = fixture(t),
    visited = [],
    caches = new Map();
  let running = 0,
    maximum = 0;
  const result = await checkAssets(input, async (args, signal, cache) => {
    assert.equal(signal.aborted, false);
    assert.deepEqual(args.slice(0, 3), [
      "release",
      "verify-asset",
      "v1.0.0-rc.1",
    ]);
    assert.deepEqual(args.slice(4), [
      "--repo",
      "Hadden-Industries/json-quality",
      "--format",
      "json",
    ]);
    assert.equal(
      caches.get(cache) ?? 0,
      0,
      "Concurrent native TUF updaters share a cache",
    );
    caches.set(cache, 1);
    running++;
    maximum = Math.max(maximum, running);
    await setTimeout(3);
    visited.push(args[3]);
    running--;
    caches.set(cache, 0);
    return "a".repeat(64);
  });
  assert.equal(maximum, 6);
  assert.equal(caches.size, 6);
  assert.equal(new Set(visited).size, input.assets.length);
  assert.deepEqual(
    result.map(({ name }) => name),
    input.assets.map(({ name }) => name),
  );
});
test("a native failure aborts active children and refuses a partial success", async (t) => {
  const input = fixture(t);
  let started = 0,
    completed = 0;
  await assert.rejects(
    checkAssets(input, async (_args, signal) => {
      started++;
      if (started === 2) throw new Error("signature mismatch");
      try {
        await setTimeout(40, undefined, { signal });
      } finally {
        completed++;
      }
      return "a".repeat(64);
    }),
    /signature mismatch/u,
  );
  assert.ok(started <= 6);
  assert.equal(completed, started - 1, "Outstanding children were not awaited");
});
test("duplicate, traversal and missing asset inputs fail before native invocation", async (t) => {
  const input = fixture(t, 2);
  for (const assets of [
    [input.assets[0], input.assets[0]],
    [{ name: "../escape" }],
    [{ name: "missing.json" }],
    [],
  ]) {
    let invoked = false;
    await assert.rejects(
      checkAssets({ ...input, assets }, async () => {
        invoked = true;
      }),
    );
    assert.equal(invoked, false);
  }
});
