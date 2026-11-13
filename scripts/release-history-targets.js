// SPDX-License-Identifier: AGPL-3.0-only
/** Each qualified target is bounded separately under the same signed history commit. */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { jsonBytes, sha256, readJson } from "./release-records.js";
import {
  historyTargetDescriptors,
  readHistoryTarget,
} from "./release-provider.js";
import {
  verifyQualifiedTarget,
  qualifiedStageSummaries,
} from "./qualified-release-contract.js";

const richness = (record) => {
  const context = JSON.parse(
    Buffer.from(
      record.qualification.files.find((file) => file.name === "context.json")
        .bytes,
      "base64",
    ),
  );
  return (
    Number(!!context.archive) * 2 +
    Number(
      record.qualification.files.some(
        (file) => file.name === "archive-outcome.json",
      ),
    )
  );
};
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
      assert.deepEqual(original.release.assets, record.release.assets);
      assert.equal(
        original.tag.reference.object.sha,
        record.tag.reference.object.sha,
      );
      if (richness(record) < richness(original)) return;
    }
    const bytes = jsonBytes(record);
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
