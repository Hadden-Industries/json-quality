// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { delimiter, join } from "node:path";
import { gitObjectAuthority } from "../src/git-objects.js";
import { isPathContained } from "../src/paths.js";
import { temporaryDirectory } from "./temporary-directory.js";

test(
  "a Windows 8.3 PATH spelling cannot place Git inside a checkout",
  { skip: process.platform !== "win32" },
  (t) => {
    const root = temporaryDirectory(t, "json-quality-git-authority-");
    const tools = join(root, "planted-tools");
    mkdirSync(tools);
    // Never executed: only the external-executable selection guard is under test.
    writeFileSync(join(tools, "git.exe"), "");
    const short = execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "(New-Object -ComObject Scripting.FileSystemObject).GetFolder($env:PROBE_PATH).ShortPath",
      ],
      {
        encoding: "utf8",
        env: { ...process.env, PROBE_PATH: tools },
        windowsHide: true,
      },
    ).trim();
    if (short === tools)
      return t.skip("The path is already short or 8.3 names are disabled.");
    const original = process.env.PATH;
    t.after(() => {
      process.env.PATH = original;
    });
    process.env.PATH = short + delimiter + (original ?? "");
    // Qualification resolves its roots natively, to their long spelling.
    const checkout = realpathSync.native(root);
    let selected;
    try {
      selected = gitObjectAuthority([checkout]).executable;
    } catch (error) {
      assert.match(String(error), /External native Git executable/u);
      return;
    }
    assert.equal(
      isPathContained(checkout, realpathSync.native(selected)),
      false,
      selected,
    );
  },
);
