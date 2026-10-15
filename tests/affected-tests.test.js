// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import {
  planAffected,
  selectTests,
  runTests,
} from "../scripts/affected-tests.js";

function fixture(t, extraFiles = {}) {
  const root = mkdtempSync(join(tmpdir(), "json-impact-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync("git", ["-C", root, ...args], {
      windowsHide: true,
      encoding: "utf8",
    });
  const write = (path, text) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  git("init", "-q");
  write("package.json", '{"type":"module"}\n');
  write("src/a.js", "export default 1;\n");
  write("src/b.js", "export default 2;\n");
  write(
    "tests/a.test.js",
    'import a from "../src/a.js";\nimport assert from "node:assert/strict";\nassert.equal(a, 1);\n',
  );
  write(
    "tests/b.test.js",
    'import b from "../src/b.js";\nimport assert from "node:assert/strict";\nassert.equal(b, 2);\n',
  );
  for (const [path, bytes] of Object.entries(extraFiles)) write(path, bytes);
  git("add", ".");
  git(
    "-c",
    "commit.gpgsign=false",
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "-qm",
    "fixture baseline",
  );
  return { root, write, base: git("rev-parse", "HEAD").trim() };
}

test("affected selection uses native reach and retains old edges removed by the change", async (t) => {
  const f = fixture(t);
  f.write("src/a.js", "export default 3;\n");
  let plan = await planAffected(f.root, f.base);
  assert.equal(plan.mode, "affected", plan.reason);
  assert.deepEqual(plan.tests, ["tests/a.test.js"]);
  f.write("tests/a.test.js", "// The old import was removed.\n");
  plan = await planAffected(f.root, f.base);
  assert.equal(plan.mode, "affected", plan.reason);
  assert.deepEqual(plan.tests, ["tests/a.test.js"]);
});

test("snapshot graphs retain schema resources and imported package scripts", async (t) => {
  const f = fixture(t, {
    "schemas/value.json": '{"value":1}\n',
    "src/a.js":
      'import schema from "../schemas/value.json" with {type:"json"}; export default schema.value;\n',
    "scripts/helper.js": 'export {default} from "../src/b.js";\n',
    "tests/b.test.js":
      'import b from "../scripts/helper.js"; import assert from "node:assert/strict"; assert.equal(b,2);\n',
  });
  f.write(
    "src/a.js",
    'import schema from "../schemas/value.json" with {type:"json"}; export default schema.value + 1;\n',
  );
  const plan = await planAffected(f.root, f.base);
  assert.equal(plan.mode, "affected", plan.reason);
  assert.deepEqual(plan.tests, ["tests/a.test.js"]);
});

test("deleted dependencies use the old graph, unresolved retained imports fall back", async (t) => {
  const f = fixture(t);
  rmSync(join(f.root, "src/a.js"));
  let plan = await planAffected(f.root, f.base);
  assert.equal(plan.mode, "full");
  f.write("tests/a.test.js", "// Removed dependency and import.\n");
  plan = await planAffected(f.root, f.base);
  assert.equal(plan.mode, "affected", plan.reason);
  assert.deepEqual(plan.tests, ["tests/a.test.js"]);
});

test("uncertain scopes and graph extraction failures select the complete suite", async (t) => {
  const f = fixture(t);
  assert.equal((await planAffected(f.root)).mode, "full");
  assert.equal((await planAffected(f.root, f.base)).mode, "full");
  f.write("src/a.js", "export ???\n");
  assert.equal((await planAffected(f.root, f.base)).mode, "full");
  f.write("src/a.js", "export default 1;\n");
  f.write("schemas/input.json", "{}\n");
  assert.equal((await planAffected(f.root, f.base)).mode, "full");
});

test("declared non-import relations compose with native reachability", async (t) => {
  const f = fixture(t);
  // Capture real public graphs through the selector's worker, not invented graph records.
  const { spawnSync } = await import("node:child_process");
  const worker = new URL("../scripts/affected-tests.js", import.meta.url);
  const { fileURLToPath } = await import("node:url");
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(worker), "--graph-worker"],
    { cwd: f.root, encoding: "utf8", windowsHide: true },
  );
  assert.equal(result.status, 0, result.stderr);
  const selected = await selectTests(
    [JSON.parse(result.stdout)],
    ["src/a.js"],
    ["tests/a.test.js", "tests/b.test.js"],
    [
      {
        dependency: "tests/a.test.js",
        consumer: "tests/b.test.js",
        kind: "fixture-process",
      },
    ],
  );
  assert.deepEqual(selected, ["tests/a.test.js", "tests/b.test.js"]);
});

test("failed selected tests keep their exit status", (t) => {
  const f = fixture(t);
  f.write("tests/a.test.js", "throw new Error('Expected selected failure');\n");
  assert.equal(
    runTests(f.root, { mode: "affected", tests: ["tests/a.test.js"] }),
    1,
  );
});
