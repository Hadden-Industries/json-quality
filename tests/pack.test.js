// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { readPackReport, runNpmPack } from "../scripts/pack.js";
import {
  assertNativeExecutableModes,
  verifyShippedLinks,
} from "../scripts/release-contract.js";
import { temporaryDirectory } from "./temporary-directory.js";

test("shared native packing distinguishes inspection from archive writing without running lifecycle scripts", (t) => {
  const root = temporaryDirectory(t, "json-native-pack-");
  const destination = temporaryDirectory(t, "json-native-pack-output-");
  const npm = process.env.npm_execpath;
  assert.ok(npm, "Run the maintained test entry point through npm.");
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src", "index.js"), "export const value = 1;\n");
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: "pack-fixture",
      version: "1.0.0",
      type: "module",
      files: ["src/"],
      scripts: {
        prepack:
          "node -e \"require('node:fs').writeFileSync('prepack-ran', 'unexpected')\"",
      },
    }),
  );
  const inspected = runNpmPack(root, { npm });
  assert.equal(inspected.name, "pack-fixture");
  assert.deepEqual(inspected.files.map(({ path }) => path).sort(), [
    "package.json",
    "src/index.js",
  ]);
  assert.deepEqual(readdirSync(root).sort(), ["package.json", "src"]);
  assert.deepEqual(readdirSync(destination), []);

  const packed = runNpmPack(root, { npm, destination });
  assert.equal(packed.filename, "pack-fixture-1.0.0.tgz");
  assert.deepEqual(readdirSync(destination), ["pack-fixture-1.0.0.tgz"]);
  const archive = readFileSync(join(destination, "pack-fixture-1.0.0.tgz"));
  assert.equal(
    packed.integrity,
    "sha512-" + createHash("sha512").update(archive).digest("base64"),
  );
  assert.deepEqual(readdirSync(root).sort(), ["package.json", "src"]);
});

test("native npm 12 pack reporting admits exactly one package and rejects legacy shapes", () => {
  const npm = process.env.npm_execpath;
  assert.ok(npm, "Run the maintained test entry point through npm.");
  const output = execFileSync(
    process.execPath,
    [npm, "pack", "--ignore-scripts", "--dry-run", "--json"],
    {
      cwd: fileURLToPath(new URL("../", import.meta.url)),
      encoding: "utf8",
      windowsHide: true,
    },
  );
  const report = readPackReport(output);
  assert.equal(report.name, "@hadden-industries/json-quality");
  const nativeExecutable = report.files.find(
    ({ path }) => path === "native/prebuilt/linux-x64/json-quality-native",
  );
  assert.ok(nativeExecutable, "The Linux native executable must ship.");
  if (process.platform === "win32") {
    assert.equal(nativeExecutable.mode & 0o111, 0);
    assert.throws(
      () => assertNativeExecutableModes(report.files),
      /POSIX producer/u,
    );
  } else {
    assert.notEqual(nativeExecutable.mode & 0o111, 0);
    assert.doesNotThrow(() => assertNativeExecutableModes(report.files));
  }
  assert.ok(report.files.some((file) => file.path === "src/cli.js"));
  verifyShippedLinks(
    report.files,
    new Map(
      report.files
        .filter(({ path }) => path.endsWith(".md"))
        .map(({ path }) => [
          path.toLowerCase(),
          readFileSync(new URL("../" + path, import.meta.url)),
        ]),
    ),
  );
  for (const path of [
    "src/native-session.js",
    "src/installed-component.js",
    "schemas/event.schema.json",
    "schemas/source-contract.schema.json",
    "schemas/contract-cohort.json",
    "src/json-format-options.json",
  ])
    assert.ok(
      report.files.some((file) => file.path === path),
      path,
    );
  assert.throws(() => readPackReport(JSON.stringify([report])), /exactly one/u);
  assert.deepEqual(
    readPackReport(JSON.stringify({ [report.name]: report })),
    report,
  );
  assert.throws(() => readPackReport("[]"), /exactly one/u);
  assert.throws(
    () => readPackReport(JSON.stringify([report, report])),
    /exactly one/u,
  );
});
