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
