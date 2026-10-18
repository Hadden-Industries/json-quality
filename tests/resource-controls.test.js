// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, readFileSync, cpSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { temporaryDirectory } from "./temporary-directory.js";
import { operationLimits, DEFAULT_LIMITS } from "../src/limits.js";
import {
  acquisitionResourceLimits,
  acquisitionCleanupOptions,
  nativeQualityCachePath,
} from "../src/acquire.js";
import { RESOURCE_OPTIONS, resourceCliLimits } from "../src/commands.js";
import { projectResourceLimits } from "../scripts/project-resource-limits.js";
import {
  runJsonQuality,
  inspectJsonInventory,
  formatJsonDocument,
  qualifyJsonConsumer,
  verifyJsonQualityInstallation,
  formatJsonSource,
} from "../src/index.js";

test("removed broad limits option cannot silently fall back to default capacities", async () => {
  await assert.rejects(
    runJsonQuality("inventory", { limits: false }),
    /operation options/u,
  );
  await assert.rejects(
    formatJsonSource("{}", { limits: false }),
    /formatting options/u,
  );
  await assert.rejects(
    inspectJsonInventory({ limits: false }),
    /Use capacityLimits/u,
  );
  await assert.rejects(
    formatJsonDocument({}, { limits: false }),
    /supplied formatting options/u,
  );
  await assert.rejects(
    qualifyJsonConsumer({ limits: false }),
    /Use capacityLimits/u,
  );
  await assert.rejects(
    verifyJsonQualityInstallation({ limits: false }),
    /Use capacityLimits/u,
  );
});

test("both public CLIs reject the removed environment name before loading roots", (t) => {
  const root = temporaryDirectory(t, "json-cli-removed-capacity-env-");
  const env = { ...process.env, JSON_QUALITY_LIMITS: "false" };
  delete env.JSON_QUALITY_CAPACITY_LIMITS;
  for (const [entry, args] of [
    ["../src/cli.js", ["inventory"]],
    ["../src/qualification-cli.js", []],
  ]) {
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(new URL(entry, import.meta.url)), ...args],
      { cwd: root, env, encoding: "utf8", windowsHide: true, timeout: 30000 },
    );
    assert.equal(result.status, 2);
    const message =
      entry === "../src/cli.js"
        ? result.stderr
        : JSON.parse(result.stdout).message;
    assert.match(message, /Use JSON_QUALITY_CAPACITY_LIMITS/u);
  }
});

test("cold acquisition and installed operations share canonical defaults and unlimited capacity", () => {
  assert.deepEqual(acquisitionResourceLimits({}), operationLimits({}));
  assert.deepEqual(acquisitionResourceLimits(true), operationLimits({}, true));
  assert.equal(projectResourceLimits().synchronized, true);
  const cold = acquisitionResourceLimits(false);
  const installed = operationLimits({}, false);
  assert.deepEqual(cold, installed);
  assert.ok(Object.values(cold).every((value) => value === Infinity));
  for (const capacityLimits of [
    { maxCacheOutputBytes: 0 },
    { unknown: 1 },
    null,
  ]) {
    assert.throws(() => acquisitionResourceLimits(capacityLimits));
    assert.throws(() => operationLimits({}, capacityLimits));
  }
  assert.equal(DEFAULT_LIMITS.maxRequestBytes, 48 * 1024 * 1024);
});

test("common CLI capacityLimits merge caller JSON with explicit flags and reject mixed bypasses", () => {
  const values = (args) =>
    parseArgs({ args, options: RESOURCE_OPTIONS, allowNegative: true }).values;
  assert.deepEqual(
    resourceCliLimits({ "max-git-time-ms": "300000" }, '{"maxFiles":2}'),
    { maxFiles: 2, maxGitTimeMs: 300000 },
  );
  assert.equal(resourceCliLimits(values(["--capacity-limits"]), "false"), true);
  assert.equal(
    resourceCliLimits(values(["--no-capacity-limits"]), '{"maxFiles":2}'),
    false,
  );
  assert.deepEqual(
    resourceCliLimits(
      values(["--capacity-limits", "--max-files", "5"]),
      "false",
    ),
    { maxFiles: 5 },
  );
  assert.throws(() =>
    resourceCliLimits(
      values(["--no-capacity-limits", "--max-files", "5"]),
      "true",
    ),
  );
  assert.equal(resourceCliLimits({}, "false"), false);
  assert.throws(() => resourceCliLimits({ "max-files": "2" }, "false"));
  assert.throws(() => resourceCliLimits({}, '{"maxFileBytes":0}'));
});

test("canonical positive boolean and finite override objects re-enable policy-disabled capacities", () => {
  const disabled = { capacityLimits: false };
  assert.ok(
    Object.values(operationLimits(disabled)).every(
      (value) => value === Infinity,
    ),
  );
  assert.deepEqual(operationLimits(disabled, true), DEFAULT_LIMITS);
  assert.deepEqual(operationLimits(disabled, {}), DEFAULT_LIMITS);
  assert.deepEqual(operationLimits(disabled, { maxFiles: 7 }), {
    ...DEFAULT_LIMITS,
    maxFiles: 7,
  });
  assert.equal(
    operationLimits({ capacityLimits: { maxFiles: 9 } }, true).maxFiles,
    9,
  );
  assert.ok(
    Object.values(operationLimits({ capacityLimits: true }, false)).every(
      (value) => value === Infinity,
    ),
  );
});

test("native cache lookup uses caller output capacity rather than its former 16 KiB ceiling", (t) => {
  const root = temporaryDirectory(t, "json-cache-resource-");
  const nativeNpm = join(root, "cache-path.cjs");
  writeFileSync(nativeNpm, 'process.stdout.write("x".repeat(20000));\n');
  assert.throws(() =>
    nativeQualityCachePath(root, nativeNpm, { maxCacheOutputBytes: 1024 }),
  );
  assert.equal(
    nativeQualityCachePath(root, nativeNpm, { maxCacheOutputBytes: 32768 })
      .length,
    20000,
  );
  assert.equal(nativeQualityCachePath(root, nativeNpm, false).length, 20000);
  assert.deepEqual(
    acquisitionCleanupOptions({ maxRetries: 0, retryDelay: 0 }),
    { maxRetries: 0, retryDelay: 0 },
  );
});

test("producer npm setup admits resource overrides before dependencies are installed", (t) => {
  const root = temporaryDirectory(t, "json-cold-resource-");
  mkdirSync(join(root, "scripts"));
  mkdirSync(join(root, "assets"));
  writeFileSync(join(root, "package.json"), '{"type":"module"}\n');
  cpSync(new URL("../src/", import.meta.url), join(root, "src"), {
    recursive: true,
  });
  cpSync(new URL("../schemas/", import.meta.url), join(root, "schemas"), {
    recursive: true,
  });
  writeFileSync(
    join(root, "scripts/qualification-process.js"),
    readFileSync(
      new URL("../scripts/qualification-process.js", import.meta.url),
    ),
  );
  writeFileSync(
    join(root, "assets/node-support.json"),
    readFileSync(new URL("../assets/node-support.json", import.meta.url)),
  );
  const nativeNpm = join(root, "npm-fixture.cjs");
  writeFileSync(
    nativeNpm,
    "process.stdout.write(JSON.stringify(process.argv.slice(2)));\n",
  );
  for (const [encoded, timeoutMs] of [
    [undefined, DEFAULT_LIMITS.maxAcquisitionTimeMs],
    ["{}", DEFAULT_LIMITS.maxAcquisitionTimeMs],
    ["true", DEFAULT_LIMITS.maxAcquisitionTimeMs],
    ['{"maxAcquisitionTimeMs":700000}', 700000],
    ["false", 0],
  ]) {
    const env = {
      ...process.env,
      NODE_PATH: "",
      JSON_QUALITY_PRODUCER_NPM: nativeNpm,
    };
    delete env.JSON_QUALITY_CAPACITY_LIMITS;
    delete env.JSON_QUALITY_LIMITS;
    if (encoded !== undefined) env.JSON_QUALITY_CAPACITY_LIMITS = encoded;
    const result = spawnSync(
      process.execPath,
      [join(root, "scripts/qualification-process.js"), "producer-npm"],
      {
        cwd: root,
        env,
        encoding: "utf8",
        windowsHide: true,
        timeout: 30000,
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout).slice(0, 2), [
      "install",
      "--global",
    ]);
    const started = result.stderr
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .find(({ state }) => state === "started");
    assert.equal(started.timeoutMs, timeoutMs);
  }
  const rejected = spawnSync(
    process.execPath,
    [join(root, "scripts/qualification-process.js"), "producer-npm"],
    {
      cwd: root,
      env: {
        ...process.env,
        NODE_PATH: "",
        JSON_QUALITY_PRODUCER_NPM: nativeNpm,
        JSON_QUALITY_LIMITS: "false",
      },
      encoding: "utf8",
      windowsHide: true,
      timeout: 30000,
    },
  );
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /Use JSON_QUALITY_CAPACITY_LIMITS/u);
  assert.equal(rejected.stdout, "");
});
