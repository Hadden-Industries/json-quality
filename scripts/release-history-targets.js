// SPDX-License-Identifier: AGPL-3.0-only
/** Each qualified target is bounded separately under the same signed history commit. */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { jsonBytes, sha256, readJson } from "./release-records.js";
import {
  historyTargetDescriptors,
  readHistoryTarget,
  originalHistoryTargetBytes,
} from "./release-provider.js";
import { verifyStableAssets } from "./release-asset-identity.js";
import {
  verifyQualifiedTarget,
  qualifiedStageSummaries,
} from "./qualified-release-contract.js";

export function writeQualifiedTargetBundle(output, previous, additions = []) {
  mkdirSync(join(output, "release-targets"), { recursive: true });
  const refs = [];
  const add = (record) => {
    const expected = {
      version: record.version,
      manifestSha256: record.manifestSha256,
      releaseId: record.release.id,
    };
    verifyQualifiedTarget(record, expected);
    const prior = refs.find((ref) => ref.version === record.version),
      path = join(output, "release-targets", `${record.manifestSha256}.json`);
    if (prior) {
      assert.equal(prior.manifestSha256, record.manifestSha256);
      assert.equal(prior.releaseId, record.release.id);
      const original = readJson(path);
      assert.equal(original.source, record.source);
      verifyStableAssets(original.release.assets, record.release.assets);
      assert.equal(
        original.tag.reference.object.sha,
        record.tag.reference.object.sha,
      );
      // New observations cannot replace the already authenticated subject.
      // Additional writer settlements belong in the history entry model.
      return;
    }
    const bytes = originalHistoryTargetBytes(record) ?? jsonBytes(record);
    assert.ok(
      bytes.length <= 20000000,
      "Target checkpoint exceeds its individual authenticated reader bound",
    );
    writeFileSync(path, bytes, { flush: true });
    const ref = {
      ...expected,
      size: bytes.length,
      sha256: sha256(bytes),
      settledStages: qualifiedStageSummaries(record),
    };
    if (prior) refs[refs.indexOf(prior)] = ref;
    else refs.push(ref);
  };
  for (const ref of previous ? historyTargetDescriptors(previous) : [])
    add(readHistoryTarget(previous, ref));
  for (const record of additions) add(record);
  return refs;
}
