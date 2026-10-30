// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";

export function validatePerformance(report, { source, node, os, operation }) {
  assert.equal(
    report.schemaVersion,
    2,
    "Obsolete process observation contract",
  );
  assert.equal(report.status, "passed");
  assert.equal(report.environment.node, `v${node}`);
  const platform = os.startsWith("windows") ? "win32" : "linux";
  assert.equal(report.environment.platform, platform);
  assert.equal(report.workload.operation, operation);
  assert.ok(
    Number.isSafeInteger(report.workload.repetitions) &&
      report.workload.repetitions > 0,
  );
  assert.equal(report.identities.length, 1);
  assert.equal(report.identities[0].variant, "candidate");
  assert.equal(report.identities[0].head, source);
  assert.match(report.identities[0].sourceSha256, /^[a-f0-9]{64}$/u);
  assert.equal(report.samples.length, report.workload.repetitions);
  assert.equal(report.observations.length, report.workload.repetitions + 1);
  for (const [index, sample] of report.samples.entries()) {
    assert.equal(sample.variant, "candidate");
    assert.equal(sample.repetition, index);
    assert.deepEqual(sample.identity, report.identities[0].nativeIdentity);
    assert.deepEqual(
      sample.tree,
      Object.fromEntries(
        Object.entries(report.observations[index + 1]).filter(
          ([key]) => !["variant", "repetition"].includes(key),
        ),
      ),
    );
  }
  for (const [index, tree] of report.observations.entries()) {
    assert.equal(tree.variant, "candidate");
    assert.equal(tree.repetition, index - 1);
    assert.equal(tree.schemaVersion, 1);
    assert.equal(tree.platform, platform);
    assert.equal(tree.status, "passed");
    assert.equal(tree.cleanup, "passed");
    assert.equal(tree.quiescence, "passed");
    assert.equal(tree.exitCode, 0);
    assert.equal(tree.timedOut, false);
    assert.equal(tree.cancelled, false);
    assert.equal(tree.units, "bytes");
    assert.equal(tree.driverIncluded, true);
    assert.equal(tree.controllerIncluded, false);
    assert.equal(
      tree.method,
      platform === "win32" ? "windows-job" : "linux-process-group",
    );
    assert.equal(
      tree.metric,
      platform === "win32" ? "peak-committed-bytes" : "sampled-sum-rss-bytes",
    );
    assert.ok(Number.isFinite(tree.peakBytes) && tree.peakBytes > 0);
    assert.ok(Number.isSafeInteger(tree.samples) && tree.samples > 0);
    assert.ok(Number.isSafeInteger(tree.processCount) && tree.processCount > 0);
  }
}
