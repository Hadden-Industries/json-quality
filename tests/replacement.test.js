// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, readFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { temporaryDirectory } from "./temporary-directory.js";
import { captureSource, replaceSource } from "../src/replacement.js";

test("a changed byte preimage refuses replacement", (t) => {
  const root = temporaryDirectory(t, "json-quality-preimage-");
  writeFileSync(join(root, "data.json"), "{}\n");
  const before = captureSource(root, "data.json");
  writeFileSync(join(root, "data.json"), '{"new":true}\n');
  assert.throws(
    () => replaceSource(root, "data.json", before, Buffer.from("[]\n")),
    /changed after preflight/u,
  );
  assert.equal(readFileSync(join(root, "data.json"), "utf8"), '{"new":true}\n');
});

test("a same-byte file identity replacement also refuses the write", (t) => {
  const root = temporaryDirectory(t, "json-quality-preimage-");
  writeFileSync(join(root, "data.json"), "{}\n");
  const before = captureSource(root, "data.json");
  writeFileSync(join(root, "new.json"), "{}\n");
  renameSync(join(root, "new.json"), join(root, "data.json"));
  assert.throws(
    () => replaceSource(root, "data.json", before, Buffer.from("[]\n")),
    /changed after preflight/u,
  );
});
