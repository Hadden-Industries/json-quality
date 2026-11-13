// SPDX-License-Identifier: AGPL-3.0-only
/** Real offline npm graph contract, exercised by producer and consumer suites. */
import assert from "node:assert/strict";
import test from "node:test";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { native } from "../scripts/qualification-process.js";
import { jsonBytes } from "../scripts/release-contract.js";
import { archiveInventory, sha256 } from "../scripts/release-contract.js";
import {
  nativeSourceInputs,
  reconcileNativeDistribution,
  acquireNativeProduction,
} from "../scripts/release-distribution.js";
import { fileURLToPath } from "node:url";
import { runNpmPack } from "../scripts/pack.js";
import {
  isolatedNpmEnvironment,
  installedInventory,
  installProductionRecipient,
  verifySbom,
} from "../scripts/release-inventory.js";
function temp(t) {
  const directory = mkdtempSync(
    join(tmpdir(), "json-quality-recipient-graph-"),
  );
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test("real packed native payloads conserve original producer bytes, linked components and notices", async (t) => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const scratch = temp(t);
  const inputs = nativeSourceInputs(root),
    dependencies = JSON.parse(
      readFileSync(join(root, "native/dependencies.json")),
    );
  const origins = JSON.parse(
    readFileSync(join(root, "native/production-origins.json")),
  );
  for (const platform of ["win32-x64", "linux-x64"]) {
    const directory = join(root, "native/prebuilt", platform),
      build = JSON.parse(readFileSync(join(directory, "build-evidence.json")));
    const packed = runNpmPack(directory, {
      npm: process.env.npm_execpath,
      destination: scratch,
    });
    const file = join(scratch, packed.filename);
    const inventory = await archiveInventory(file);
    const subject = {
      platform,
      package: JSON.parse(readFileSync(join(directory, "package.json"))).name,
      archive: { sha256: sha256(readFileSync(file)) },
    };
    const origin = origins.platforms[platform];
    const original = {
      origin,
      files: Object.fromEntries(
        ["build-evidence.json", ...Object.keys(build.artifactFiles)].map(
          (path) => [path, sha256(readFileSync(join(directory, path)))],
        ),
      ),
    };
    const result = reconcileNativeDistribution(
      subject,
      inventory,
      inputs,
      dependencies,
      original,
    );
    assert.equal(
      result.sourceInputsSha256,
      "d5d1b3766d160006f396d2b25371783b876ebe8b58b7d27f3a9743945ae70689",
    );
    assert.equal(
      result.artifacts["json-quality.node"].sha256,
      build.artifactFiles["json-quality.node"],
    );
    assert.ok(result.components.some(({ name }) => name === "sqlite"));
    assert.ok(
      result.notices.some(({ path }) => path === "sqlite-dedication.txt"),
    );
    for (const removed of [
      "json-quality.node",
      "notices/sqlite-dedication.txt",
    ])
      assert.throws(() =>
        reconcileNativeDistribution(
          subject,
          {
            ...inventory,
            files: inventory.files.filter(({ path }) => path !== removed),
          },
          inputs,
          dependencies,
          original,
        ),
      );
    assert.throws(
      () =>
        reconcileNativeDistribution(
          subject,
          inventory,
          { ...inputs, "native/build.py": "0".repeat(64) },
          dependencies,
          original,
        ),
      /input manifest differs/u,
    );
    assert.throws(
      () =>
        reconcileNativeDistribution(subject, inventory, inputs, dependencies, {
          ...original,
          files: { ...original.files, "json-quality.node": "0".repeat(64) },
        }),
      /original producer/u,
    );
    const provider = () => ({
      run: {
        id: Number(origin.run),
        run_attempt: Number(origin.attempt),
        repository: { full_name: origins.repository },
        head_repository: { full_name: origins.repository },
        path: origin.workflow,
        head_sha: origin.controller,
        status: "completed",
        conclusion: "success",
      },
      jobs: {
        total_count: 1,
        jobs: [
          {
            id: origin.jobId,
            name: origin.job,
            run_id: Number(origin.run),
            run_attempt: Number(origin.attempt),
            head_sha: origin.controller,
            conclusion: "success",
          },
        ],
      },
    });
    const transport = {
      directory,
      identity: { id: origin.artifactId, digest: origin.artifactDigest },
    };
    assert.deepEqual(
      acquireNativeProduction(origin, scratch, {
        provider,
        download: () => transport,
      }).files,
      original.files,
    );
    assert.throws(() =>
      acquireNativeProduction(origin, scratch, {
        provider,
        download: () => ({
          ...transport,
          identity: { ...transport.identity, id: origin.artifactId + 1 },
        }),
      }),
    );
  }
});

test("recipient production SBOM conserves shared production dependencies while omitting optional development peers", async (t) => {
  const directory = temp(t),
    npm = process.env.npm_execpath,
    tar = createRequire(npm)("tar"),
    env = isolatedNpmEnvironment(directory);
  const pack = (name, dependencies = {}, extra = {}) => {
    const path = join(directory, name),
      archive = join(directory, `${name}.tgz`);
    mkdirSync(path);
    writeFileSync(
      join(path, "package.json"),
      jsonBytes({
        name,
        version: "1.0.0",
        license: "MIT",
        dependencies,
        ...extra,
      }),
    );
    tar.c(
      { sync: true, gzip: true, cwd: path, prefix: "package/", file: archive },
      ["package.json"],
    );
    return `file:${archive.replaceAll("\\", "/")}`;
  };
  const shared = pack("shared-production-dependency"),
    devOnly = pack("development-only-dependency"),
    production = pack(
      "production-fixture",
      {
        "shared-production-dependency": shared,
      },
      {
        peerDependencies: { "development-fixture": "*" },
        peerDependenciesMeta: { "development-fixture": { optional: true } },
      },
    ),
    development = pack("development-fixture", {
      "shared-production-dependency": shared,
      "development-only-dependency": devOnly,
    }),
    metadata = {
      name: "recipient-fixture",
      version: "1.0.0",
      license: "MIT",
      dependencies: { "production-fixture": production },
      devDependencies: { "development-fixture": development },
      scripts: { postinstall: "exit 99" },
    };
  writeFileSync(join(directory, "package.json"), jsonBytes(metadata));
  const run = (args) =>
    native(process.execPath, [npm, ...args, "--ignore-scripts", "--offline"], {
      cwd: directory,
      env,
    });
  run(["install", "--no-audit", "--no-fund"]);
  const original = readFileSync(join(directory, "package-lock.json")),
    before = await installedInventory(directory, npm);
  assert.ok(
    before.some((entry) => entry.name === "shared-production-dependency"),
  );
  assert.ok(
    !JSON.parse(original).packages["node_modules/shared-production-dependency"]
      .dev,
  );
  const devEntry =
    JSON.parse(original).packages["node_modules/development-only-dependency"];
  assert.equal(devEntry.devOptional, true);
  assert.ok(!devEntry.dev && !devEntry.optional);
  installProductionRecipient(directory, npm, directory);
  const inventory = await installedInventory(directory, npm),
    bom = JSON.parse(run(["sbom", "--omit=dev", "--sbom-format=cyclonedx"]));
  assert.deepEqual(
    readFileSync(join(directory, "package-lock.json")),
    original,
  );
  assert.ok(
    inventory.some((entry) => entry.name === "shared-production-dependency"),
  );
  assert.ok(!inventory.some((entry) => entry.name === "development-fixture"));
  assert.ok(
    !inventory.some((entry) => entry.name === "development-only-dependency"),
  );
  assert.equal(
    JSON.parse(readFileSync(join(directory, "package.json"))).dependencies[
      "production-fixture"
    ],
    production,
  );
  verifySbom(bom, JSON.parse(original), directory, inventory);
  assert.throws(
    () =>
      verifySbom(
        bom,
        JSON.parse(original),
        directory,
        inventory.filter(
          (entry) => entry.name !== "shared-production-dependency",
        ),
      ),
    /Missing required installed location/,
  );
});
