// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { lstatSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/** Neutral Git setup; callers retain every policy, payload and expected decision. */
export function temporaryRepository(t, prefix) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  t.after(() => {
    assert.equal(lstatSync(root).isSymbolicLink(), false);
    assert.equal(realpathSync(root), root);
    assert.equal(dirname(root), realpathSync(tmpdir()));
    rmSync(root, { recursive: true });
  });
  execFileSync("git", ["init", "-q", root], { windowsHide: true });
  return root;
}
