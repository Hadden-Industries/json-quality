// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { lstatSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/** Allocate a test-owned directory and clean only its unchanged contained path. */
export function temporaryDirectory(t, prefix) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  t.after(() => {
    assert.equal(lstatSync(root).isSymbolicLink(), false);
    assert.equal(realpathSync(root), root);
    assert.equal(dirname(root), realpathSync(tmpdir()));
    rmSync(root, { recursive: true });
  });
  return root;
}
