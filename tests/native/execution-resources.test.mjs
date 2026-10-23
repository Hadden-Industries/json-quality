// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { resolveExecutionResources } from "../../src/execution-resources.js";
import { NativeSession } from "./client.mjs";

test("resource resolution preserves admission precedence and independent runtime controls", async () => {
  const policy = {
      capacityLimits: { maxFileBytes: 1024 },
      runtimeControls: { managedMemoryTargetBytes: 16777216 },
    },
    selected = resolveExecutionResources(policy, {
      capacityLimits: { maxFileBytes: 2048 },
    }),
    bypassed = resolveExecutionResources(policy, { capacityLimits: false });
  assert.equal(selected.admission.maxFileBytes, 2048);
  assert.equal(selected.native.maxFileBytes, "2048");
  assert.equal(selected.runtime.managedMemoryTargetBytes, 16777216);
  assert.ok(Object.values(bypassed.admission).every((value) => value === null));
  assert.equal(bypassed.runtime.managedMemoryTargetBytes, 16777216);
  assert.equal(
    resolveExecutionResources({ capacityLimits: false }).admission.maxFiles,
    null,
  );
  assert.equal(
    resolveExecutionResources(
      { capacityLimits: false },
      { capacityLimits: true },
    ).admission.maxFiles,
    50000,
  );
  const core = new NativeSession();
  try {
    const actual = (await core.configure(selected.native)).result.resources;
    assert.equal(actual.admission.maxFileBytes, selected.native.maxFileBytes);
    assert.equal(
      actual.runtime.managedMemoryTargetBytes,
      selected.native.managedMemoryTargetBytes,
    );
  } finally {
    await core.close();
  }
});

test("resource options reject removed names, coercion and nonfinite working controls", () => {
  for (const invocation of [
    { limits: false },
    { runtimeControls: false },
    { runtimeControls: { managedMemoryTargetBytes: Infinity } },
    { runtimeControls: { maxConcurrency: 2 } },
    { capacityLimits: { maxFiles: "1" } },
    { capacityLimits: { unknown: 1 } },
  ])
    assert.throws(() => resolveExecutionResources({}, invocation), TypeError);
});
