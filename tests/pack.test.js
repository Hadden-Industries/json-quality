// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { readPackReport, runNpmPack } from "../scripts/pack.js";
import {
  assertNativeExecutableModes,
  verifyShippedLinks,
} from "../scripts/release-contract.js";
import { temporaryDirectory } from "./temporary-directory.js";
import { stageCore } from "../scripts/package-stage.js";
import { producerToolchain } from "../scripts/qualification-process.js";

test("producer tooling requires a complete absolute pair and leaves consumer npm independent", () => {
  const cli = process.env.npm_execpath;
  assert.ok(cli);
  assert.deepEqual(producerToolchain({ npm_execpath: cli }), {
    executable: process.execPath,
    cli,
  });
  for (const pair of [
    { JSON_QUALITY_PRODUCER_NODE: process.execPath },
    { JSON_QUALITY_PRODUCER_NPM: cli },
    { JSON_QUALITY_PRODUCER_NODE: "", JSON_QUALITY_PRODUCER_NPM: cli },
    {
      JSON_QUALITY_PRODUCER_NODE: process.execPath,
      JSON_QUALITY_PRODUCER_NPM: "",
    },
    { JSON_QUALITY_PRODUCER_NODE: "node", JSON_QUALITY_PRODUCER_NPM: cli },
    {
      JSON_QUALITY_PRODUCER_NODE: process.execPath,
      JSON_QUALITY_PRODUCER_NPM: "npm.js",
    },
    {
      JSON_QUALITY_PRODUCER_NODE: process.execPath + "\n",
      JSON_QUALITY_PRODUCER_NPM: cli,
    },
    {
      JSON_QUALITY_PRODUCER_NODE: process.execPath,
      JSON_QUALITY_PRODUCER_NPM: cli + "\r",
    },
  ])
    assert.throws(
      () => producerToolchain({ npm_execpath: cli, ...pair }),
      /complete absolute pair/u,
    );
});

test("child-process packing uses retained producer Node and npm despite independent consumer selection", (t) => {
  const root = temporaryDirectory(t, "json-retained-producer-");
  const destination = temporaryDirectory(t, "json-retained-pack-");
  const executable = join(root, basename(process.execPath));
  copyFileSync(process.execPath, executable);
  const cli = join(root, "producer-npm.cjs");
  const consumer = join(root, "consumer-npm.cjs");
  const observed = join(root, "producer-node.txt");
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "retained-producer-fixture", version: "1.0.0" }),
  );
  writeFileSync(
    consumer,
    'throw new Error("Consumer npm must not pack producer archives");\n',
  );
  writeFileSync(
    cli,
    `require("node:fs").writeFileSync(${JSON.stringify(observed)}, process.execPath); require(${JSON.stringify(process.env.npm_execpath)});\n`,
  );
  const program = `import {runNpmPack} from ${JSON.stringify(new URL("../scripts/pack.js", import.meta.url).href)}; import {npmCommand} from ${JSON.stringify(new URL("../scripts/qualification-process.js", import.meta.url).href)}; const version = npmCommand(["--version"]).trim(); const report = runNpmPack(${JSON.stringify(root)}, {npm: process.env.npm_execpath, destination: ${JSON.stringify(destination)}}); console.log(JSON.stringify({report, version, consumer: process.env.JSON_QUALITY_CONSUMER_NPM, node: process.execPath}));`;
  const output = JSON.parse(
    execFileSync(process.execPath, ["--input-type=module", "-e", program], {
      env: {
        ...process.env,
        npm_execpath: consumer,
        JSON_QUALITY_CONSUMER_NPM: consumer,
        JSON_QUALITY_PRODUCER_NODE: executable,
        JSON_QUALITY_PRODUCER_NPM: cli,
      },
      encoding: "utf8",
      windowsHide: true,
    }),
  );
  assert.equal(readFileSync(observed, "utf8"), executable);
  assert.equal(output.node, process.execPath);
  assert.equal(output.consumer, consumer);
  assert.match(output.version, /^\d+\.\d+\.\d+$/u);
  assert.equal(output.report.name, "retained-producer-fixture");
  assert.ok(readFileSync(join(destination, output.report.filename)).length > 0);
});

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
  assert.ok(
    !report.files.some(({ path }) => path.startsWith("native/")),
    "The core must not ship platform payloads.",
  );
  const nativeReport = runNpmPack(
    fileURLToPath(new URL("../native/prebuilt/linux-x64/", import.meta.url)),
    { npm },
  );
  const nativeExecutable = nativeReport.files.find(
    ({ path }) => path === "json-quality-native",
  );
  assert.ok(
    nativeExecutable,
    "The Linux package must ship its standalone executable.",
  );
  // npm owns bin-mode normalization even when the producer runs on Windows.
  assert.notEqual(nativeExecutable.mode & 0o111, 0);
  assert.doesNotThrow(() => assertNativeExecutableModes(nativeReport.files));
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

test("producer staging publishes exact optional registry versions without changing development inputs", (t) => {
  const root = fileURLToPath(new URL("../", import.meta.url)),
    parent = temporaryDirectory(t, "json-core-stage-"),
    before = readFileSync(join(root, "package.json")),
    destination = join(parent, "core");
  const published = stageCore(root, destination);
  assert.deepEqual(readFileSync(join(root, "package.json")), before);
  assert.equal(published.scripts, undefined);
  assert.deepEqual(published.optionalDependencies, {
    "@hadden-industries/json-quality-linux-x64": published.version,
    "@hadden-industries/json-quality-win32-x64": published.version,
  });
  assert.ok(!readdirSync(destination).includes("native"));
  const report = runNpmPack(destination, { npm: process.env.npm_execpath });
  assert.ok(report.unpackedSize < 2 * 1024 * 1024);
  assert.ok(!report.files.some(({ path }) => /\.(?:node|exe)$/u.test(path)));
});
