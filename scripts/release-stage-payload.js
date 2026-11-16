// SPDX-License-Identifier: AGPL-3.0-only
/** Content-addressed parts of an exact original staging transport. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { sha256, regularBytes } from "./release-records.js";

export const stagePartBytes = 16 * 1024 * 1024;
const sha = /^[a-f0-9]{64}$/u;
export const stagePartPath = (digest) => {
  assert.match(digest, sha);
  return `release-stage-parts/${digest}`;
};
const positive = (value) => Number.isSafeInteger(value) && value > 0;

export function verifyStagePredecessors(refs, maximum) {
  assert.ok(Array.isArray(refs));
  const seen = new Set();
  for (const ref of refs) {
    const key = `${ref.run}/${ref.attempt}`;
    assert.ok(!seen.has(key), "Duplicate retained staging predecessor");
    seen.add(key);
    assert.match(ref.run, /^[1-9]\d{0,15}$/u);
    assert.match(ref.attempt, /^[1-9]\d{0,15}$/u);
    assert.ok(["natives", "core"].includes(ref.stagePhase));
    assert.match(ref.controller, /^[a-f0-9]{40}$/u);
    for (const digest of [ref.manifestSha256, ref.reviewSha256, ref.sha256])
      assert.match(digest, sha);
    assert.ok(positive(ref.size) && ref.size <= maximum);
    assert.ok(
      Array.isArray(ref.parts) &&
        ref.parts.length === Math.ceil(ref.size / stagePartBytes),
    );
    let remaining = ref.size;
    for (const part of ref.parts) {
      assert.match(part.sha256, sha);
      assert.equal(part.size, Math.min(remaining, stagePartBytes));
      remaining -= part.size;
    }
    assert.equal(remaining, 0);
    const { artifact, provider } = ref;
    assert.ok(positive(artifact.id) && positive(artifact.jobId));
    assert.equal(artifact.digest, `sha256:${ref.sha256}`);
    assert.ok(
      new RegExp(`^effect-stage-${ref.attempt}(?:-recovery-[23])?$`, "u").test(
        artifact.name,
      ),
    );
    assert.equal(String(provider.run.id), ref.run);
    assert.equal(String(provider.run.run_attempt), ref.attempt);
    assert.equal(provider.run.head_sha, ref.controller);
    assert.equal(provider.jobs.total_count, provider.jobs.jobs.length);
    assert.ok(
      provider.jobs.jobs.some(
        (job) => job.name === "stage" && job.id === artifact.jobId,
      ),
    );
  }
}

export function writeStageParts(output, zip) {
  mkdirSync(join(output, "release-stage-parts"), { recursive: true });
  const parts = [];
  for (let offset = 0; offset < zip.length; offset += stagePartBytes) {
    const bytes = zip.subarray(offset, offset + stagePartBytes);
    const digest = sha256(bytes);
    const path = join(output, stagePartPath(digest));
    if (existsSync(path)) assert.equal(sha256(regularBytes(path)), digest);
    else writeFileSync(path, bytes, { flag: "wx" });
    parts.push({ size: bytes.length, sha256: digest });
  }
  return parts;
}

/** Validate all parts and the original whole transport before releasing the ZIP. */
export function materializeStageZip(ref, destination, readPart) {
  const file = openSync(destination, "wx");
  let complete = false;
  try {
    const hash = createHash("sha256");
    let size = 0;
    for (const part of ref.parts) {
      const bytes = readPart(part);
      assert.ok(Buffer.isBuffer(bytes));
      assert.equal(bytes.length, part.size);
      assert.equal(
        sha256(bytes),
        part.sha256,
        "Retained stage part digest differs",
      );
      hash.update(bytes);
      size += bytes.length;
      writeFileSync(file, bytes);
    }
    assert.equal(size, ref.size);
    assert.equal(
      hash.digest("hex"),
      ref.sha256,
      "Retained complete stage ZIP digest differs",
    );
    complete = true;
  } finally {
    closeSync(file);
    if (!complete) unlinkSync(destination);
  }
}
