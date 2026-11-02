// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { resolveExecutionResources } from "../../src/execution-resources.js";
import { NativeSession } from "./client.mjs";

test("resource resolution preserves admission precedence and independent runtime controls", async () => {
  const policy = {
      capacityLimits: { maxSourceBytes: 1024 },
      runtimeControls: { maxManagedMemoryBytes: 16777216 },
    },
    selected = resolveExecutionResources(policy, {
      capacityLimits: { maxSourceBytes: 2048 },
    }),
    bypassed = resolveExecutionResources(policy, { capacityLimits: false });
  assert.equal(selected.admission.maxSourceBytes, 2048);
  assert.equal(selected.native.maxSourceBytes, "2048");
  assert.equal(selected.runtime.maxManagedMemoryBytes, 16777216);
  assert.ok(Object.values(bypassed.admission).every((value) => value === null));
  assert.equal(bypassed.runtime.maxManagedMemoryBytes, 16777216);
  assert.equal(
    resolveExecutionResources({ capacityLimits: false }).admission
      .maxPhysicalAndNativeSources,
    null,
  );
  assert.equal(
    resolveExecutionResources(
      { capacityLimits: false },
      { capacityLimits: true },
    ).admission.maxPhysicalAndNativeSources,
    50000,
  );
  const core = new NativeSession();
  try {
    const actual = (await core.configure(selected.native)).result.resources;
    assert.equal(
      actual.admission.maxSourceBytes,
      selected.native.maxSourceBytes,
    );
    assert.equal(
      actual.runtime.maxManagedMemoryBytes,
      selected.native.maxManagedMemoryBytes,
    );
  } finally {
    await core.close();
  }
});

test("resource options reject removed names, coercion and nonfinite numeric quotas", () => {
  for (const invocation of [
    { limits: false },
    { runtimeControls: null },
    { runtimeControls: { maxManagedMemoryBytes: Infinity } },
    { runtimeControls: { maxConcurrency: 2 } },
    { capacityLimits: { maxPhysicalAndNativeSources: "1" } },
    { capacityLimits: { unknown: 1 } },
  ])
    assert.throws(() => resolveExecutionResources({}, invocation), TypeError);
});
