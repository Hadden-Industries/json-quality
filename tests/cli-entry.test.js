// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { temporaryDirectory } from "./temporary-directory.js";

for (const [filename, help] of [
  ["cli.js", /check-source/u],
  ["qualification-cli.js", /trusted-commit-id/u],
]) {
  test(`the symlinked ${filename} binary runs, while importing it stays inert`, (t) => {
    const root = temporaryDirectory(t, "json-quality-cli-entry-"),
      target = fileURLToPath(new URL(`../src/${filename}`, import.meta.url)),
      link = join(root, "installed-bin.mjs"),
      wrapper = join(root, "import-only.mjs"),
      run = (entry, args = []) =>
        spawnSync(process.execPath, [entry, ...args], {
          encoding: "utf8",
          windowsHide: true,
          timeout: 30000,
        });
    try {
      symlinkSync(target, link, "file");
    } catch (error) {
      if (process.platform === "win32" && error.code === "EPERM") {
        t.skip("Windows host does not permit file symlinks.");
        return;
      }
      throw error;
    }
    const helpResult = run(link, ["--help"]);
    assert.equal(helpResult.error, undefined);
    assert.equal(helpResult.status, 0, helpResult.stderr);
    assert.match(helpResult.stdout, help);
    const refused = run(link, ["--not-a-supported-option"]);
    assert.equal(refused.status, 2, refused.stderr + refused.stdout);
    assert.ok(refused.stdout.length + refused.stderr.length > 0);
    writeFileSync(
      wrapper,
      `import ${JSON.stringify(new URL(`../src/${filename}`, import.meta.url).href)};\nconsole.log('import stayed inert');\n`,
    );
    const imported = run(wrapper);
    assert.equal(imported.status, 0, imported.stderr);
    assert.equal(imported.stdout.trim(), "import stayed inert");
    assert.equal(imported.stderr, "");
  });
}
