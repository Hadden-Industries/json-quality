// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import contractCohort from "../schemas/contract-cohort.json" with { type: "json" };
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { temporaryDirectory } from "./temporary-directory.js";
import {
  installMinimalConsumer,
  verifyMinimalInstalledFiles,
} from "../scripts/consumer-minimal.js";
import { archiveInventory, sha256 } from "../scripts/release-contract.js";
import { isolatedNpmEnvironment } from "../scripts/release-inventory.js";
import { readPackReport } from "../scripts/pack.js";
import {
  MINIMAL_CLI_CASES,
  MINIMAL_CLI_COMMANDS,
  assertInstalledPolicyDigest,
} from "../scripts/consumer-cli-probe.js";
import { validateMinimalCli } from "../scripts/consumer-layouts.js";

test("minimal CLI evidence rejects missing, duplicate, stale and substituted observations", () => {
  const corePackage = {
      name: "@hadden-industries/json-quality",
      version: "1.2.3",
      integrity: "sha512-Ynl0ZXM=",
      sha256: "c".repeat(64),
    },
    nativePackage = {
      name: "@hadden-industries/json-quality-win32-x64",
      version: "1.2.3",
      integrity: "sha512-Ynl0ZXM=",
    };
  const receipt = {
    status: "passed",
    packageVersion: "1.2.3",
    cohortVersion: contractCohort.cohortVersion,
    policy: "package-defaults",
    defaultPolicySha256: "a".repeat(64),
    command: "npm exec -- json-quality",
    cases: [...MINIMAL_CLI_CASES],
    commands: structuredClone(MINIMAL_CLI_COMMANDS),
    generatedLockSha256: "b".repeat(64),
    packageName: "@hadden-industries/json-quality",
    specifier: "file:fixture.tgz",
    routing: "npm-generated-lock-with-transported-file-archives",
    corePackage,
    nativePackage,
  };
  validateMinimalCli(
    receipt,
    "1.2.3",
    "producer-archive",
    "a".repeat(64),
    corePackage,
    nativePackage,
  );
  for (const change of [
    (value) => value.cases.pop(),
    (value) => value.cases.push(value.cases[0]),
    (value) => value.commands.pop(),
    (value) => value.commands[0].argv.push("--json"),
    (value) => (value.commands[0].exitCode = 1),
    (value) => (value.cohortVersion = 4),
    (value) => (value.routing = "anonymous-registry"),
    (value) => (value.defaultPolicySha256 = "f".repeat(64)),
    (value) => delete value.corePackage,
    (value) => delete value.nativePackage,
    (value) => (value.corePackage.integrity = "sha512-ZGlmZmVyZW50"),
    (value) => (value.corePackage.sha256 = "f".repeat(64)),
    (value) => (value.corePackage.version = "1.2.4"),
    (value) => (value.nativePackage.integrity = "sha512-ZGlmZmVyZW50"),
    (value) => (value.nativePackage.version = "1.2.4"),
  ]) {
    const corrupted = structuredClone(receipt);
    change(corrupted);
    assert.throws(() =>
      validateMinimalCli(
        corrupted,
        "1.2.3",
        "producer-archive",
        "a".repeat(64),
        corePackage,
        nativePackage,
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

test("native npm binds its dependency-only generated lock and installed bytes to frozen packages", async (t) => {
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
    writeFileSync(join(source, "payload.js"), "// frozen executable payload\n");
    writeFileSync(join(source, "defaults.json"), "{}\n");
    // Fixture archives use the qualified producer's keyed npm pack report;
    // dependency resolution, installation and inventory retain the consumer npm.
    const { filename } = readPackReport(
      execFileSync(
        process.env.JSON_QUALITY_PRODUCER_NODE ?? process.execPath,
        [
          process.env.JSON_QUALITY_PRODUCER_NPM ?? npmCliPath,
          "pack",
          "--ignore-scripts",
          "--json",
          "--pack-destination",
          directory,
        ],
        { cwd: source, env, encoding: "utf8", windowsHide: true },
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
  const seedLock = readFileSync(join(seed, "package-lock.json")),
    frozenLock = JSON.parse(seedLock),
    frozen = await Promise.all(
      [
        [core, coreArchive],
        [companion, nativeArchive],
      ].map(async ([name, archive]) => ({
        name,
        version: "1.2.3",
        integrity: frozenLock.packages[`node_modules/${name}`].integrity,
        sha256: sha256(readFileSync(archive)),
        files: (await archiveInventory(archive, npmCliPath)).files,
      })),
    ),
    options = {
      root,
      npmCliPath,
      env,
      packageName: core,
      specifier: `file:${coreArchive}`,
      seedLock,
      corePackage: frozen[0],
      nativePackage: frozen[1],
    };
  // npm still resolves the real same-version archives. A different frozen SRI
  // must fail before the offline install creates any executable package tree.
  for (const key of ["corePackage", "nativePackage"])
    for (const [field, substituted] of [
      ["integrity", "sha512-ZGlmZmVyZW50"],
      ["version", "1.2.4"],
    ]) {
      const refusedRoot = join(directory, `refused-${key}-${field}`);
      assert.throws(
        () =>
          installMinimalConsumer({
            ...options,
            root: refusedRoot,
            [key]: { ...options[key], [field]: substituted },
          }),
        /Minimal lock differs from frozen package/u,
      );
      assert.equal(existsSync(join(refusedRoot, "node_modules")), false);
    }
  const result = installMinimalConsumer(options);
  assert.deepEqual(result.corePackage, {
    name: core,
    version: "1.2.3",
    integrity: frozen[0].integrity,
    sha256: frozen[0].sha256,
  });
  assert.deepEqual(result.nativePackage, {
    name: companion,
    version: "1.2.3",
    integrity: frozen[1].integrity,
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
  // Matching metadata and default bytes cannot hide changed core/native code.
  verifyMinimalInstalledFiles(root, frozen);
  for (const expected of frozen) {
    const payload = join(root, "node_modules", expected.name, "payload.js"),
      original = readFileSync(payload);
    writeFileSync(payload, "// substituted executable payload\n");
    assert.throws(
      () => verifyMinimalInstalledFiles(root, frozen),
      /Minimal installed payload differs/u,
    );
    writeFileSync(payload, original);
  }
  verifyMinimalInstalledFiles(root, frozen);
});
