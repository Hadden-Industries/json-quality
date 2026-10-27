// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkArchitecture } from "../scripts/check-architecture.js";
import { temporaryDirectory } from "./temporary-directory.js";

function fixture(t, files = {}, metadata = {}) {
  const root = temporaryDirectory(t, "json-architecture-");
  const write = (path, bytes) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), bytes);
  };
  write(
    "package.json",
    JSON.stringify({
      name: "architecture-fixture",
      version: "1.0.0",
      type: "module",
      files: ["src/", "schemas/"],
      exports: { ".": "./src/index.js" },
      ...metadata,
    }),
  );
  write("src/index.js", 'export { value } from "./value.js";\n');
  write("src/value.js", "export const value = 1;\n");
  for (const [path, bytes] of Object.entries(files)) write(path, bytes);
  return { root, write };
}

test("architecture admits real native graph and npm membership for a valid package", async (t) => {
  const { root } = fixture(t);
  const result = await checkArchitecture(root);
  assert.ok(result.modules >= 2);
  assert.ok(result.files >= 3);
});

test("architecture admits declared production imports, conditional exports, bins and public self-imports", async (t) => {
  const { root } = fixture(
    t,
    {
      "src/value.js": 'import "production-only"; export const value=1;\n',
      "src/cli.js": "export {};\n",
      "scripts/probe.mjs": 'import "architecture-fixture/value";\n',
      "node_modules/production-only/package.json":
        '{"name":"production-only","version":"1.0.0","main":"index.js"}',
      "node_modules/production-only/index.js": "export {};\n",
    },
    {
      dependencies: { "production-only": "1.0.0" },
      exports: {
        ".": { import: "./src/index.js", default: "./src/index.js" },
        "./value": "./src/value.js",
        "./denied": null,
      },
      bin: { fixture: "src/cli.js" },
      main: "./src/index.js",
    },
  );
  const result = await checkArchitecture(root);
  assert.equal(result.runtimeModules, 3);
});

test("architecture rejects a real runtime cycle with native path evidence", async (t) => {
  const { root } = fixture(t, {
    "src/value.js":
      'export { other } from "./cycle.js"; export const value = 1;\n',
    "src/cycle.js":
      'import {value} from "./value.js"; export const other=value;\n',
  });
  await assert.rejects(
    checkArchitecture(root),
    /authored-cycles.*src\/value\.js/u,
  );
});

test("architecture includes CI action entry scripts in native syntax admission", async (t) => {
  const { root } = fixture(t, {
    ".github/actions/probe/action.mjs": "export const = ;\n",
  });
  await assert.rejects(checkArchitecture(root), /syntax/u);
});

for (const [rule, files, metadata] of [
  ["unresolved", { "src/value.js": 'import "./missing.js";\n' }],
  [
    "runtime-to-development",
    {
      "src/value.js": 'import "../tests/support.js";\n',
      "tests/support.js": "export {};\n",
    },
  ],
  [
    "runtime-to-development",
    {
      "src/disconnected.js": 'import "../scripts/helper.js";\n',
      "scripts/helper.js": "export {};\n",
    },
  ],
  [
    "runtime-to-dev-dependency",
    {
      "src/value.js": 'import "development-only";\n',
      "node_modules/development-only/package.json":
        '{"name":"development-only","version":"1.0.0","main":"index.js"}',
      "node_modules/development-only/index.js": "export {};\n",
    },
    { devDependencies: { "development-only": "1.0.0" } },
  ],
  [
    "undeclared-package",
    {
      "scripts/helper.js": 'import "unlisted-package";\n',
      "node_modules/unlisted-package/package.json":
        '{"name":"unlisted-package","version":"1.0.0","main":"index.js"}',
      "node_modules/unlisted-package/index.js": "export {};\n",
    },
  ],
  [
    "foundations-stay-independent",
    {
      "src/json-paths.js": 'import "./bridge.js";\n',
      "src/bridge.js": 'import "./repository-check.js";\n',
      "src/repository-check.js": "export {};\n",
    },
  ],
  [
    "shared-tooling-stays-independent",
    {
      "scripts/test-impact.js": 'import "./bridge.js";\n',
      "scripts/bridge.js": 'import "./qualify-package.js";\n',
      "scripts/qualify-package.js": "export {};\n",
    },
  ],
]) {
  test(`architecture enforces ${rule} for ${Object.keys(files)[0]}`, async (t) => {
    const { root } = fixture(t, files, metadata);
    await assert.rejects(checkArchitecture(root), new RegExp(rule, "u"));
  });
}

test("native package closure rejects an existing local import omitted from npm membership", async (t) => {
  const { root } = fixture(t, {}, { files: ["src/index.js"] });
  assert.equal(existsSync(join(root, "src/value.js")), true);
  await assert.rejects(
    checkArchitecture(root),
    /Unshipped dependency: src\/index\.js -> src\/value\.js/u,
  );
});

test("native package closure also covers imported JSON resources", async (t) => {
  const { root } = fixture(
    t,
    {
      "src/value.js":
        'import schema from "../schemas/value.json" with {type:"json"}; export const value=schema.value;\n',
      "schemas/value.json": '{"value":1}\n',
    },
    { files: ["src/"] },
  );
  await assert.rejects(
    checkArchitecture(root),
    /Unshipped dependency:.*schemas\/value\.json/u,
  );
});

for (const metadata of [
  { exports: { ".": "./src/index.js", "./missing": "./src/missing.js" } },
  { bin: { fixture: "bin/missing.js" } },
]) {
  test(`native package closure rejects a missing declared ${Object.keys(metadata)[0]}`, async (t) => {
    const { root } = fixture(t, {}, metadata);
    await assert.rejects(checkArchitecture(root), /Unshipped entrypoint:/u);
  });
}

test("a disconnected shipped JavaScript module cannot disappear from graph coverage", async (t) => {
  const { root } = fixture(
    t,
    { "assets/disconnected.js": "export {};\n" },
    { files: ["src/", "assets/"] },
  );
  await assert.rejects(
    checkArchitecture(root),
    /Missing runtime graph root: assets\/disconnected\.js/u,
  );
});

test("unavailable analysis preserves failure and the CLI exits nonzero", async (t) => {
  const root = temporaryDirectory(t, "json-architecture-unavailable-");
  assert.equal(existsSync(join(root, "src")), false);
  await assert.rejects(checkArchitecture(root), /runtime source root/u);
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(
        new URL("../scripts/check-architecture.js", import.meta.url),
      ),
      "--unexpected",
    ],
    { encoding: "utf8", windowsHide: true },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Use npm run check:architecture/u);
});

test("malformed runtime source cannot produce a passing architecture report", async (t) => {
  const { root } = fixture(t, { "src/value.js": "export const = ;\n" });
  await assert.rejects(checkArchitecture(root));
});
