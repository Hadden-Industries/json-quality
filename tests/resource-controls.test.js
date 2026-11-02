// SPDX-License-Identifier: AGPL-3.0-only
import { budgets } from "../scripts/qualification-process.js";
import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, readFileSync, cpSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { temporaryDirectory } from "./temporary-directory.js";
import { resolveExecutionResources } from "../src/execution-resources.js";
import { resourceDefaults } from "../src/resource-profile.js";
import {
  acquisitionResourceLimits,
  installationResourceLimits,
  verificationResourceLimits,
  acquisitionCleanupOptions,
  nativeQualityCachePath,
} from "../src/acquire.js";
import {
  RESOURCE_OPTIONS,
  RUNTIME_OPTIONS,
  resourceCliLimits,
  resourceCliControls,
} from "../src/commands.js";
import { projectResourceLimits } from "../scripts/project-resource-limits.js";
import {
  openJsonSourceSession,
  openJsonRepositorySession,
  qualifyGitJsonSources,
  verifyJsonQualityInstallation,
  formatJsonSource,
} from "../src/index.js";
const DEFAULT_LIMITS = resolveExecutionResources().admission;
const admission = (policy = {}, capacityLimits) =>
  resolveExecutionResources(policy, { capacityLimits }).admission;

test("unlimited resources remove every selected quota while preserving explicit caller budgets", () => {
  const policy = { capacityLimits: false, runtimeControls: false };
  const unlimited = resolveExecutionResources(policy);
  assert.ok(
    Object.values(unlimited.admission).every((value) => value === null),
  );
  assert.ok(Object.values(unlimited.runtime).every((value) => value === null));
  assert.ok(Object.values(unlimited.native).every((value) => value === null));
  const selected = resolveExecutionResources(policy, {
    capacityLimits: { maxSourceBytes: 1024 },
    runtimeControls: { maxCheckTimeMs: 1000 },
  });
  assert.equal(selected.admission.maxSourceBytes, 1024);
  assert.equal(selected.admission.maxTotalSourceBytes, null);
  assert.equal(selected.runtime.maxCheckTimeMs, 1000);
  assert.equal(selected.runtime.maxTemporaryBytes, null);
  assert.equal(selected.native.maxSourceBytes, "1024");
  assert.equal(selected.native.maxNestingDepth, null);
});

test("individual null controls and finite overrides do not inherit former runtime ceilings", () => {
  const selected = resolveExecutionResources(
    {},
    {
      capacityLimits: { maxSourceBytes: null },
      runtimeControls: {
        maxNestingDepth: 4097,
        maxCheckTimeMs: 172800000,
        maxTemporaryBytes: null,
        maxManagedMemoryBytes: null,
      },
    },
  );
  assert.equal(selected.admission.maxSourceBytes, null);
  assert.equal(selected.runtime.maxNestingDepth, 4097);
  assert.equal(selected.runtime.maxCheckTimeMs, 172800000);
  assert.equal(selected.native.maxManagedMemoryBytes, null);
  assert.ok(
    Object.values(resolveExecutionResources().runtime).every(
      (value) => value > 0,
    ),
  );
});

test("removed broad limits option cannot silently fall back to default capacities", async () => {
  await assert.rejects(
    openJsonRepositorySession({ limits: false }),
    /session options/u,
  );
  await assert.rejects(
    formatJsonSource("{}", { limits: false }),
    /writer options/u,
  );
  await assert.rejects(
    openJsonSourceSession({ limits: false }),
    /session options/u,
  );
  await assert.rejects(
    (async () => {
      for await (const event of qualifyGitJsonSources({ limits: false }))
        void event;
    })(),
    /qualification options/u,
  );
  await assert.rejects(
    verifyJsonQualityInstallation({ limits: false }),
    /installationControls|verification options/u,
  );
});

test("both public CLIs reject the removed environment name before loading roots", (t) => {
  const root = temporaryDirectory(t, "json-cli-removed-capacity-env-");
  const env = { ...process.env, JSON_QUALITY_LIMITS: "false" };
  delete env.JSON_QUALITY_CAPACITY_LIMITS;
  for (const [entry, args] of [
    ["../src/cli.js", ["check"]],
    ["../src/qualification-cli.js", []],
  ]) {
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(new URL(entry, import.meta.url)), ...args],
      {
        cwd: root,
        env,
        encoding: "utf8",
        windowsHide: true,
        timeout: budgets.read,
      },
    );
    assert.equal(result.status, 2);
    const message =
      entry === "../src/cli.js"
        ? result.stderr
        : JSON.parse(result.stdout).message;
    assert.match(message, /Use JSON_QUALITY_CAPACITY_LIMITS/u);
  }
});

test("source, installation, acquisition and verification profiles have independent canonical defaults", () => {
  assert.equal(projectResourceLimits().synchronized, true);
  for (const [name, resolve] of [
    ["installationControls", installationResourceLimits],
    ["acquisitionControls", acquisitionResourceLimits],
    ["verificationControls", verificationResourceLimits],
  ]) {
    const defaults = resourceDefaults(name);
    assert.deepEqual(resolve({}), defaults);
    assert.deepEqual(resolve(true), defaults);
    assert.ok(
      Object.values(resolve(false)).every((value) => value === Infinity),
    );
    const [first, second] = Object.keys(defaults);
    assert.equal(resolve({ [first]: null })[first], Infinity);
    if (second)
      assert.equal(resolve({ [first]: null })[second], defaults[second]);
    for (const invalid of [{ [first]: 0 }, { unknown: 1 }, null])
      assert.throws(() => resolve(invalid));
  }
  assert.throws(() => admission({}, { maxCacheOutputBytes: 1 }));
  assert.throws(() =>
    installationResourceLimits({ maxPhysicalAndNativeSources: 1 }),
  );
  assert.throws(() => acquisitionResourceLimits({ maxCacheLookupTimeMs: 1 }));
  assert.equal(DEFAULT_LIMITS.maxRequestBytes, 48 * 1024 * 1024);
});

test("CLI controls preserve explicit budgets beside unlimited selections", () => {
  const values = (args) =>
    parseArgs({ args, options: RESOURCE_OPTIONS, allowNegative: true }).values;
  assert.deepEqual(
    resourceCliLimits(
      { "max-git-time-ms": "300000" },
      '{"maxPhysicalAndNativeSources":2}',
    ),
    { maxPhysicalAndNativeSources: 2, maxGitTimeMs: 300000 },
  );
  assert.equal(resourceCliLimits(values(["--capacity-limits"]), "false"), true);
  assert.equal(
    resourceCliLimits(
      values(["--no-capacity-limits"]),
      '{"maxPhysicalAndNativeSources":2}',
    ),
    false,
  );
  assert.deepEqual(
    resourceCliLimits(
      values(["--capacity-limits", "--max-physical-and-native-sources", "5"]),
      "false",
    ),
    { maxPhysicalAndNativeSources: 5 },
  );
  assert.deepEqual(
    resourceCliLimits(
      values([
        "--no-capacity-limits",
        "--max-physical-and-native-sources",
        "5",
      ]),
      "true",
    ),
    { ...admission({}, false), maxPhysicalAndNativeSources: 5 },
  );
  assert.equal(resourceCliLimits({}, "false"), false);
  assert.deepEqual(
    resourceCliLimits({ "max-physical-and-native-sources": "2" }, "false"),
    {
      ...admission({}, false),
      maxPhysicalAndNativeSources: 2,
    },
  );
  assert.throws(() => resourceCliLimits({}, '{"maxSourceBytes":0}'));
  const allValues = (args) =>
    parseArgs({
      args,
      options: { ...RESOURCE_OPTIONS, ...RUNTIME_OPTIONS },
      allowNegative: true,
    }).values;
  const selected = resolveExecutionResources(
    {},
    resourceCliControls(
      allValues([
        "--no-capacity-limits",
        "--max-source-bytes",
        "1024",
        "--max-check-time-ms",
        "1000",
        "--max-nesting-depth",
        "null",
      ]),
      "false",
    ),
  );
  assert.equal(selected.admission.maxSourceBytes, 1024);
  assert.equal(selected.admission.maxTotalSourceBytes, null);
  assert.equal(selected.runtime.maxCheckTimeMs, 1000);
  assert.equal(selected.runtime.maxNestingDepth, null);
  assert.equal(selected.runtime.maxTemporaryBytes, null);
  const unlimited = resolveExecutionResources(
    {},
    resourceCliControls(
      allValues(["--no-capacity-limits", "--no-runtime-controls"]),
    ),
  );
  assert.ok(Object.values(unlimited.native).every((value) => value === null));
});

test("positive boolean re-enables defaults while override objects amend only named capacities", () => {
  const disabled = { capacityLimits: false };
  assert.ok(
    Object.values(admission(disabled)).every((value) => value === null),
  );
  assert.deepEqual(admission(disabled, true), DEFAULT_LIMITS);
  assert.deepEqual(admission(disabled, {}), admission({}, false));
  assert.deepEqual(admission(disabled, { maxPhysicalAndNativeSources: 7 }), {
    ...admission({}, false),
    maxPhysicalAndNativeSources: 7,
  });
  assert.equal(
    admission({ capacityLimits: { maxPhysicalAndNativeSources: 9 } }, true)
      .maxPhysicalAndNativeSources,
    9,
  );
  assert.ok(
    Object.values(admission({ capacityLimits: true }, false)).every(
      (value) => value === null,
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
  for (const name of ["qualification-process.js", "qualification-budgets.js"])
    writeFileSync(
      join(root, "scripts", name),
      readFileSync(new URL(`../scripts/${name}`, import.meta.url)),
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
    [undefined, resourceDefaults("acquisitionControls").maxAcquisitionTimeMs],
    ["{}", resourceDefaults("acquisitionControls").maxAcquisitionTimeMs],
    ["true", resourceDefaults("acquisitionControls").maxAcquisitionTimeMs],
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
    delete env.JSON_QUALITY_ACQUISITION_CONTROLS;
    if (encoded !== undefined) env.JSON_QUALITY_ACQUISITION_CONTROLS = encoded;
    const result = spawnSync(
      process.execPath,
      [join(root, "scripts/qualification-process.js"), "producer-npm"],
      {
        cwd: root,
        env,
        encoding: "utf8",
        windowsHide: true,
        timeout: budgets.read,
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
        JSON_QUALITY_ACQUISITION_CONTROLS: '{"maxFiles":1}',
      },
      encoding: "utf8",
      windowsHide: true,
      timeout: budgets.read,
    },
  );
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /Invalid JSON resource-limit overrides/u);
  assert.equal(rejected.stdout, "");
});
