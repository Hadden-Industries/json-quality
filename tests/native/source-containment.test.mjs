// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import {
  mkdtemp,
  mkdir,
  writeFile,
  rename,
  symlink,
  rm,
  readFile,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  observeRepositorySource,
  repositorySourceFragments,
} from "../../src/repository-source.js";

test("EOF containment survives attempted same-file ancestor substitution", async (t) => {
  const scratch = await mkdtemp(join(tmpdir(), "json-source-containment-")),
    root = join(scratch, "root"),
    ancestor = join(root, "nested"),
    outside = join(scratch, "outside");
  let fragments;
  try {
    await mkdir(ancestor, { recursive: true });
    await writeFile(join(ancestor, "source.json"), "{}\n");
    const member = observeRepositorySource(root, "nested/source.json");
    fragments = repositorySourceFragments({ root, member });
    assert.equal((await fragments.next()).value.toString(), "{}\n");
    try {
      await rename(ancestor, outside);
    } catch (error) {
      if (process.platform !== "win32" || error.code !== "EPERM") throw error;
      assert.equal((await fragments.next()).done, true);
      t.diagnostic(
        "Windows denied ancestor rename while the admitted descriptor was open; Linux exercises the substitution branch.",
      );
      return;
    }
    await symlink(
      outside,
      ancestor,
      process.platform === "win32" ? "junction" : "dir",
    );
    await assert.rejects(fragments.next(), /Nonregular|leaves repository/u);
    assert.equal(await readFile(join(outside, "source.json"), "utf8"), "{}\n");
  } finally {
    await fragments?.return();
    await rm(scratch, { recursive: true, force: true });
  }
});
