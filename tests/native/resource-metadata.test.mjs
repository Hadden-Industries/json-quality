// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { NativeSession } from "./client.mjs";
import { resolveExecutionResources } from "../../src/execution-resources.js";

const provider = "provider-" + "a".repeat(300);
const path = "é".repeat(33000) + ".json",
  observation = "observed-".repeat(9000);
const resources = (capacityLimits = false) =>
  resolveExecutionResources(
    {},
    {
      capacityLimits,
      runtimeControls: {
        maxManagedMemoryBytes: 67108864,
        maxCheckTimeMs: 60000,
      },
    },
  ).native;

test("native census round-trips extended Unicode paths and metadata through bounded reply fragments", async () => {
  const session = new NativeSession();
  try {
    const selected = (await session.configure(resources())).result.resources;
    assert.equal(selected.admission.maxRequestPathCodePoints, null);
    await session.command("census-provider", {
      id: provider,
      kind: "physical",
      minimum: "0",
    });
    await session.command("census-add", { provider, path, observation });
    const result = (await session.command("census-get", { path })).result
      .member;
    assert.equal(result.path, path);
    assert.equal(result.observation, observation);
    assert.equal(result.provider, provider);
    const again = (await session.command("census-get", { path })).result.member;
    assert.deepEqual(again, result);
  } finally {
    await session.close();
  }
});

test("native extended metadata retains finite path and complete output refusal with fresh retry", async () => {
  for (const [capacityLimits, expected] of [
    [{ maxRequestPathCodePoints: 100 }, /request-path-capacity/u],
    [
      { maxRequestPathCodePoints: null, maxToolOutputBytes: 5000 },
      /native-output-byte-capacity/u,
    ],
  ]) {
    const session = new NativeSession();
    try {
      await session.configure(resources(capacityLimits));
      await session.command("census-provider", {
        id: "paths",
        kind: "physical",
        minimum: "0",
      });
      if (capacityLimits.maxRequestPathCodePoints !== null)
        await assert.rejects(
          session.command("census-add", { provider: "paths", path }),
          expected,
        );
      else {
        await session.command("census-add", {
          provider: "paths",
          path,
          observation,
        });
        await assert.rejects(session.command("census-get", { path }), expected);
      }
    } finally {
      await session.close();
    }
  }
  const retry = new NativeSession();
  try {
    await retry.configure(resources());
    await retry.command("census-provider", {
      id: "paths",
      kind: "physical",
      minimum: "0",
    });
    await retry.command("census-add", { provider: "paths", path, observation });
    assert.equal(
      (await retry.command("census-get", { path })).result.member.path,
      path,
    );
  } finally {
    await retry.close();
  }
});
