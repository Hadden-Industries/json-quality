// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, readFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { temporaryDirectory } from "./temporary-directory.js";
import { createHash } from "node:crypto";
import {
  observeRepositorySource,
  identifyRepositorySource,
} from "../src/repository-source.js";
import { replaceObservedSource } from "../src/guarded-replacement.js";
const candidate = {
  byteLength: "3",
  sha256: createHash("sha256").update("[]\n").digest("hex"),
};

test("a changed byte preimage refuses replacement", async (t) => {
  const root = temporaryDirectory(t, "json-quality-preimage-");
  writeFileSync(join(root, "data.json"), "{}\n");
  const before = await identifyRepositorySource({
    root,
    member: observeRepositorySource(root, "data.json"),
  });
  writeFileSync(join(root, "data.json"), '{"new":true}\n');
  await assert.rejects(
    replaceObservedSource({
      root,
      member: before,
      candidate,
      chunks: [Buffer.from("[]\n")],
    }),
    /Source changed/u,
  );
  assert.equal(readFileSync(join(root, "data.json"), "utf8"), '{"new":true}\n');
});

test("a same-byte file identity replacement also refuses the write", async (t) => {
  const root = temporaryDirectory(t, "json-quality-preimage-");
  writeFileSync(join(root, "data.json"), "{}\n");
  const before = await identifyRepositorySource({
    root,
    member: observeRepositorySource(root, "data.json"),
  });
  writeFileSync(join(root, "new.json"), "{}\n");
  renameSync(join(root, "new.json"), join(root, "data.json"));
  await assert.rejects(
    replaceObservedSource({
      root,
      member: before,
      candidate,
      chunks: [Buffer.from("[]\n")],
    }),
    /Source changed/u,
  );
});
