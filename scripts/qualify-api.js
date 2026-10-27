// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { native, budgets } from "./qualification-process.js";
import { isolatedNpmEnvironment } from "./release-inventory.js";
import { checkPackage } from "./check-package.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const metadata = JSON.parse(readFileSync(join(root, "package.json")));
const version = (name) =>
  JSON.parse(
    readFileSync(
      join(root, "node_modules", ...name.split("/"), "package.json"),
    ),
  ).version;

/** Real installed resolution, with explicitly installed ESLint/Node type tooling. */
export async function qualifyPublicApi({
  directory,
  archive,
  platforms,
  npm,
  installedRoot,
  files,
}) {
  await checkPackage(installedRoot, { files });
  const installedMetadata = JSON.parse(
    readFileSync(join(installedRoot, "package.json")),
  );
  const consumer = join(directory, "api-consumer");
  mkdirSync(consumer);
  writeFileSync(
    join(consumer, "package.json"),
    JSON.stringify({
      private: true,
      type: "module",
      dependencies: {
        [metadata.name]: `file:${archive}`,
        eslint: version("eslint"),
        "@types/node": version("@types/node"),
      },
      overrides: platforms,
    }),
  );
  native(
    process.execPath,
    [
      npm,
      "install",
      "--ignore-scripts",
      "--engine-strict",
      "--no-audit",
      "--no-fund",
    ],
    {
      cwd: consumer,
      env: isolatedNpmEnvironment(directory),
      timeout: budgets.install,
      phase: "public-api-tooling",
    },
  );
  writeFileSync(
    join(consumer, "consumer-types.mts"),
    readFileSync(new URL("./consumer-types.mts", import.meta.url)),
  );
  writeFileSync(
    join(consumer, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        module: "NodeNext",
        moduleResolution: "NodeNext",
        target: "ES2024",
        types: ["node"],
        skipLibCheck: false,
      },
      files: ["consumer-types.mts"],
    }),
  );
  native(
    process.execPath,
    [
      join(root, "node_modules", "typescript", "bin", "tsc"),
      "-p",
      "tsconfig.json",
    ],
    { cwd: consumer, timeout: budgets.read, phase: "packed-api-types" },
  );
  writeFileSync(
    join(consumer, "plugin-probe.mjs"),
    [
      'import assert from "node:assert/strict";',
      'import {Linter} from "eslint";',
      'import plugin from "@hadden-industries/json-quality/eslint";',
      `assert.equal(plugin.meta.name,${JSON.stringify(metadata.name)});`,
      `assert.equal(plugin.meta.version,${JSON.stringify(installedMetadata.version)});`,
      "const linter=new Linter();",
      'assert.equal(linter.verify("JSON.stringify(left) === JSON.stringify(right);",[plugin.configs.recommended],{filename:"example.js"}).length,2);',
      'assert.equal(linter.verify("writeFile(path, JSON.stringify(value));",[plugin.configs.recommended],{filename:"example.js"}).length,0);',
    ].join("\n"),
  );
  const output = native(process.execPath, ["plugin-probe.mjs"], {
    cwd: consumer,
    timeout: budgets.read,
    phase: "packed-eslint-config",
  });
  assert.equal(output, "");
}
