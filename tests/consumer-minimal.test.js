// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { temporaryDirectory } from "./temporary-directory.js";
import { installMinimalConsumer } from "../scripts/consumer-minimal.js";
import { isolatedNpmEnvironment } from "../scripts/release-inventory.js";
import { readPackReport } from "../scripts/pack.js";
import {
  MINIMAL_CLI_CASES,
  MINIMAL_CLI_COMMANDS,
  assertInstalledPolicyDigest,
} from "../scripts/consumer-cli-probe.js";
import { validateMinimalCli } from "../scripts/consumer-layouts.js";

test("minimal CLI evidence rejects missing, duplicate, stale and substituted observations", () => {
  const receipt = {
    status: "passed",
    packageVersion: "1.2.3",
    cohortVersion: 4,
    policy: "package-defaults",
    defaultPolicySha256: "a".repeat(64),
    command: "npm exec -- json-quality",
    cases: [...MINIMAL_CLI_CASES],
    commands: structuredClone(MINIMAL_CLI_COMMANDS),
    generatedLockSha256: "b".repeat(64),
    packageName: "@hadden-industries/json-quality",
    specifier: "file:fixture.tgz",
    routing: "npm-generated-lock-with-transported-file-archives",
  };
  validateMinimalCli(receipt, "1.2.3", "producer-archive", "a".repeat(64));
  for (const change of [
    (value) => value.cases.pop(),
    (value) => value.cases.push(value.cases[0]),
    (value) => value.commands.pop(),
    (value) => value.commands[0].argv.push("--json"),
    (value) => (value.commands[0].exitCode = 1),
    (value) => (value.cohortVersion = 3),
    (value) => (value.routing = "anonymous-registry"),
    (value) => (value.defaultPolicySha256 = "f".repeat(64)),
  ]) {
    const corrupted = structuredClone(receipt);
    change(corrupted);
    assert.throws(() =>
      validateMinimalCli(
        corrupted,
        "1.2.3",
        "producer-archive",
        "a".repeat(64),
      ),
    );
  }
});

test("the installed execution digest must match the exact packaged default asset", () => {
  const expected = "a".repeat(64);
  assertInstalledPolicyDigest({ defaultPolicySha256: expected }, expected);
  assert.throws(
    () =>
      assertInstalledPolicyDigest(
        { defaultPolicySha256: "f".repeat(64) },
        expected,
      ),
    /different packaged default policy/iu,
  );
});

test("native npm reconciles transported companion routing into a dependency-only generated lock", (t) => {
  const directory = temporaryDirectory(t, "json-minimal-lock-routing-"),
    npmCliPath = process.env.npm_execpath,
    env = isolatedNpmEnvironment(directory),
    core = "@fixture/json-minimal-core",
    companion = "@fixture/json-minimal-native";
  assert.ok(npmCliPath);
  const npm = (args, cwd) =>
    execFileSync(process.execPath, [npmCliPath, ...args], {
      cwd,
      env,
      encoding: "utf8",
      windowsHide: true,
    });
  const pack = (name, optionalDependencies = undefined) => {
    const source = join(directory, name.split("/").at(-1));
    mkdirSync(source);
    writeFileSync(
      join(source, "package.json"),
      JSON.stringify({ name, version: "1.2.3", optionalDependencies }),
    );
    const { filename } = readPackReport(
      npm(
        ["pack", "--ignore-scripts", "--json", "--pack-destination", directory],
        source,
      ),
    );
    return join(directory, filename);
  };
  const nativeArchive = pack(companion),
    coreArchive = pack(core, { [companion]: "1.2.3" }),
    seed = join(directory, "seed");
  mkdirSync(seed);
  writeFileSync(
    join(seed, "package.json"),
    JSON.stringify({
      name: "transport-installer",
      version: "0.0.0",
      private: true,
      dependencies: { [core]: `file:${coreArchive}` },
      overrides: { [core]: { [companion]: `file:${nativeArchive}` } },
    }),
  );
  npm(
    ["install", "--offline", "--ignore-scripts", "--no-audit", "--no-fund"],
    seed,
  );
  const root = join(directory, "minimal");
  const result = installMinimalConsumer({
    root,
    npmCliPath,
    env,
    packageName: core,
    specifier: `file:${coreArchive}`,
    seedLock: readFileSync(join(seed, "package-lock.json")),
  });
  assert.equal(
    result.routing,
    "npm-generated-lock-with-transported-file-archives",
  );
  const manifest = JSON.parse(readFileSync(join(root, "package.json"))),
    lock = JSON.parse(readFileSync(join(root, "package-lock.json")));
  assert.deepEqual(
    Object.keys(manifest).sort(),
    ["name", "version", "private", "devDependencies"].sort(),
  );
  assert.deepEqual(
    Object.keys(lock.packages).sort(),
    ["", `node_modules/${core}`, `node_modules/${companion}`].sort(),
  );
  assert.equal(
    resolve(root, lock.packages[`node_modules/${companion}`].resolved.slice(5)),
    nativeArchive,
  );
  assert.ok(
    existsSync(
      join(root, "node_modules", ...companion.split("/"), "package.json"),
    ),
  );
});
