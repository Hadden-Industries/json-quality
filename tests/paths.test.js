// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { isPathContained } from "../src/paths.js";

test("lexical containment distinguishes equality, descendants, parents and sibling prefixes", () => {
  const root = join(tmpdir(), "json-quality-containment");
  for (const [path, expected] of [
    [root, true],
    [join(root, "nested", "source.json"), true],
    [dirname(root), false],
    [root + "-sibling", false],
    [join(root, "..", "outside", "source.json"), false],
  ])
    assert.equal(isPathContained(root, path), expected, path);
});
