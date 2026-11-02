// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { temporaryDirectory } from "./temporary-directory.js";
import {
  acquisitionResourceLimits,
  installationResourceLimits,
  verificationResourceLimits,
  nativeQualityCachePath,
} from "../src/acquire.js";

test("cold operation profiles reject accessors and proxies without evaluation", () => {
  for (const resolve of [
    acquisitionResourceLimits,
    installationResourceLimits,
    verificationResourceLimits,
  ]) {
    let touched = false;
    assert.throws(
      () =>
        resolve(
          Object.defineProperty({}, "unknown", {
            enumerable: true,
            get() {
              touched = true;
              throw new Error("evaluated");
            },
          }),
        ),
      /Invalid/,
    );
    assert.throws(
      () =>
        resolve(
          new Proxy(
            {},
            {
              ownKeys() {
                touched = true;
                throw new Error("evaluated");
              },
            },
          ),
        ),
      /Invalid/,
    );
    assert.equal(touched, false);
  }
});

test("native cache lookup honors only installation time and output controls", (t) => {
  const root = temporaryDirectory(t, "json-cache-controls-"),
    npmCliPath = join(root, "npm.cjs");
  writeFileSync(npmCliPath, "process.stdout.write('x'.repeat(2048));");
  assert.equal(nativeQualityCachePath(root, npmCliPath, true).length, 2048);
  assert.throws(() =>
    nativeQualityCachePath(root, npmCliPath, { maxCacheOutputBytes: 1 }),
  );
  assert.equal(
    nativeQualityCachePath(root, npmCliPath, { maxCacheOutputBytes: null })
      .length,
    2048,
  );
  writeFileSync(
    npmCliPath,
    "setTimeout(() => process.stdout.write('cache'), 1000);",
  );
  assert.throws(() =>
    nativeQualityCachePath(root, npmCliPath, { maxCacheLookupTimeMs: 1 }),
  );
});

test("standalone bootstrap validates operation environments before npm and ignores source capacity", (t) => {
  const root = temporaryDirectory(t, "json-cold-acquisition-"),
    script = join(root, "src", "acquire.mjs"),
    npmCliPath = join(root, "npm.cjs");
  mkdirSync(join(root, "src"));
  mkdirSync(join(root, "tooling", "markdown"), { recursive: true });
  copyFileSync(new URL("../src/acquire.js", import.meta.url), script);
  writeFileSync(npmCliPath, "process.stdout.write('ACQUIRED');");
  const env = {
    ...process.env,
    npm_execpath: npmCliPath,
    JSON_QUALITY_CAPACITY_LIMITS: "invalid ignored source selection",
  };
  for (const name of [
    "JSON_QUALITY_INSTALLATION_CONTROLS",
    "JSON_QUALITY_ACQUISITION_CONTROLS",
    "JSON_QUALITY_VERIFICATION_CONTROLS",
    "JSON_QUALITY_CLEANUP",
    "JSON_QUALITY_ACQUISITION_CLEANUP",
  ])
    delete env[name];
  const run = (extra = {}) =>
    spawnSync(process.execPath, [script, "markdown"], {
      env: { ...env, ...extra },
      encoding: "utf8",
      windowsHide: true,
      timeout: 10000,
    });
  assert.equal(run().stdout, "ACQUIRED");
  for (const [name, value] of [
    ["JSON_QUALITY_INSTALLATION_CONTROLS", '{"maxFiles":1}'],
    ["JSON_QUALITY_ACQUISITION_CONTROLS", '{"maxCacheLookupTimeMs":1}'],
    ["JSON_QUALITY_VERIFICATION_CONTROLS", '{"maxFiles":1}'],
    ["JSON_QUALITY_CLEANUP", "{}"],
  ]) {
    const result = run({ [name]: value });
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
  }
  writeFileSync(
    npmCliPath,
    "setTimeout(() => process.stdout.write('ACQUIRED'), 1000);",
  );
  assert.notEqual(
    run({ JSON_QUALITY_ACQUISITION_CONTROLS: '{"maxAcquisitionTimeMs":1}' })
      .status,
    0,
  );
  assert.equal(
    run({ JSON_QUALITY_ACQUISITION_CONTROLS: "false" }).stdout,
    "ACQUIRED",
  );
});
