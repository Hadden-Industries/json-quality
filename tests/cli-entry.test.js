// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { temporaryDirectory } from "./temporary-directory.js";
import { readFileSync } from "node:fs";
import { discoverCli } from "../src/cli-discovery.js";

test("CLI discovery parses contextual help before operation admission", () => {
  assert.match(discoverCli([]).discovery, /Usage: json-quality/u);
  for (const command of [
    "check",
    "check-files",
    "check-source",
    "format",
    "normalize",
  ])
    assert.match(
      discoverCli([command, "--help"]).discovery,
      new RegExp("Usage: json-quality " + command + " ", "u"),
    );
  assert.match(
    discoverCli(["format", "--root", "ignored", "--help"]).discovery,
    /policy-aware stdin/u,
  );
  assert.deepEqual(
    discoverCli(["format", "--dry-run", "--", "-file.json"]).positionals,
    ["-file.json"],
  );
  for (const args of [
    ["format"],
    ["normalize", "--write"],
    ["format", "--no-write"],
    ["format", "--write", "--dry-run"],
    ["check", "--", "a.json"],
    ["check", "--stdin"],
    ["check-source", "--root", "."],
    ["check-files", "--stdin"],
    ["check-files", "--contract", "{}", "a.json"],
    ["format", "--stdin", "--root", "."],
    ["format", "--stdin", "--write"],
    ["format", "--stdin", "a.json"],
    ["check", "--transform-controls", "false"],
    ["check", "--quiet", "--ndjson"],
    ["check", "--diagnostic-display-level", "bad"],
    ["check", "--help", "--not-supported"],
    ["--help", "--version"],
    ["check", "--version"],
    ["--help", "--ndjson"],
    ["check", "--root", "a", "--root", "b"],
    [
      "check-source",
      "--stdin-filepath",
      "a.json",
      "--stdin-filepath",
      "a.json",
    ],
  ])
    assert.throws(() => discoverCli(args), TypeError, args.join(" "));
});

for (const filename of ["cli.js", "qualification-cli.js"]) {
  test(`discovery ${filename} works outside Git with invalid resource environment`, (t) => {
    const cwd = temporaryDirectory(t, "json-quality-discovery-"),
      entry = fileURLToPath(new URL(`../src/${filename}`, import.meta.url)),
      version = JSON.parse(
        readFileSync(new URL("../package.json", import.meta.url), "utf8"),
      ).version,
      env = {
        ...process.env,
        JSON_QUALITY_LIMITS: "obsolete",
        JSON_QUALITY_CAPACITY_LIMITS: "invalid",
      };
    for (const name of [
      "JSON_QUALITY_TRUSTED_ROOT",
      "JSON_QUALITY_CANDIDATE_ROOT",
      "JSON_QUALITY_TRUSTED_COMMIT_ID",
      "JSON_QUALITY_CANDIDATE_COMMIT_ID",
      "JSON_QUALITY_TRUSTED_SHA",
      "JSON_QUALITY_CANDIDATE_SHA",
    ])
      delete env[name];
    const run = (args) =>
      spawnSync(process.execPath, [entry, ...args], {
        cwd,
        env,
        encoding: "utf8",
        windowsHide: true,
        timeout: 30000,
      });
    for (const flag of ["--version", "-v"]) {
      const result = run([flag]);
      assert.equal(result.status, 0, result.stderr + result.stdout);
      assert.equal(result.stdout, version + "\n");
      assert.equal(result.stderr, "");
    }
    for (const args of [[], ["--help"]]) {
      const result = run(args);
      assert.equal(result.status, 0, result.stderr + result.stdout);
      assert.match(result.stdout, /Usage:/u);
      assert.equal(result.stderr, "");
    }
    for (const args of [
      ["--version", "--help"],
      ["--help", "--unknown-option"],
    ]) {
      const result = run(args);
      assert.equal(result.status, 2, result.stdout + result.stderr);
    }
  });
}

test("qualification partial and obsolete environment do not become no-operation help", (t) => {
  const cwd = temporaryDirectory(t, "json-quality-qualification-env-"),
    entry = fileURLToPath(
      new URL("../src/qualification-cli.js", import.meta.url),
    );
  for (const supplied of [
    { JSON_QUALITY_TRUSTED_ROOT: cwd },
    { JSON_QUALITY_TRUSTED_SHA: "obsolete" },
  ]) {
    const env = { ...process.env };
    for (const name of [
      "JSON_QUALITY_TRUSTED_ROOT",
      "JSON_QUALITY_CANDIDATE_ROOT",
      "JSON_QUALITY_TRUSTED_COMMIT_ID",
      "JSON_QUALITY_CANDIDATE_COMMIT_ID",
      "JSON_QUALITY_TRUSTED_SHA",
      "JSON_QUALITY_CANDIDATE_SHA",
    ])
      delete env[name];
    const result = spawnSync(process.execPath, [entry], {
      cwd,
      env: { ...env, ...supplied },
      encoding: "utf8",
      windowsHide: true,
      timeout: 30000,
    });
    assert.equal(result.status, 2, result.stdout + result.stderr);
    assert.doesNotMatch(result.stdout, /^Usage:/u);
  }
});

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
