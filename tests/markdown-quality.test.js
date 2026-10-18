// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runNpmPack } from "../scripts/pack.js";
import { archiveInventory } from "../scripts/release-contract.js";

const repository = fileURLToPath(new URL("../", import.meta.url));
const toolingRoot = join(repository, "tooling/markdown");
const tooling = createRequire(join(toolingRoot, "package.json"));
const packageRoot = dirname(
  dirname(tooling.resolve("@hadden-industries/markdown-quality/result-schema")),
);
const metadata = JSON.parse(readFileSync(join(packageRoot, "package.json")));
const cli = join(packageRoot, metadata.bin["markdown-quality"]);
const { inspectSelection, processDocument, validateQualityResult } =
  await import(
    pathToFileURL(tooling.resolve("@hadden-industries/markdown-quality"))
  );
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Fixtures declare independent scope, link targets and exact preserved bytes. */
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "json-quality-markdown-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(
    join(root, ".markdown-quality.json"),
    readFileSync(join(repository, ".markdown-quality.json")),
  );
  return root;
}

/** Exercise the installed public command and its semantic result validator. */
function check(root, args = []) {
  const child = spawnSync(
    process.execPath,
    [cli, "check", "--root", root, "--json", ...args],
    { encoding: "utf8", windowsHide: true, timeout: 60000 },
  );
  assert.ifError(child.error);
  const report = JSON.parse(child.stdout);
  validateQualityResult(report, {
    operation: "check",
    exitCode: child.status,
  });
  return report;
}

test("the installed Markdown checker rejects missing non-Markdown links without writing", (t) => {
  const root = fixture(t);
  const original = "# Consumer\n\n[Payload](data.txt)\n";
  writeFileSync(join(root, "README.md"), original);
  const report = check(root);
  assert.equal(report.exitCode, 1);
  assert.ok(report.diagnostics.some(({ rule }) => rule === "local-target"));
  assert.deepEqual(report.written, []);
  assert.equal(readFileSync(join(root, "README.md"), "utf8"), original);
  writeFileSync(join(root, "data.txt"), "Independent local target\n");
  assert.equal(check(root).exitCode, 0);
});

test("Git and Prettier ignores cannot hide authored Markdown; exclusions retain supplied bytes", async (t) => {
  const root = fixture(t);
  execFileSync("git", ["init", "--quiet", root], { windowsHide: true });
  writeFileSync(join(root, ".gitignore"), "draft.md\ncoverage/\n");
  writeFileSync(join(root, ".prettierignore"), "**/*.md\n");
  writeFileSync(join(root, "draft.md"), "# Draft\n\n[Absent](missing.txt)\n");
  mkdirSync(join(root, "coverage"));
  writeFileSync(join(root, "coverage/generated.md"), "# Coverage\n");
  const report = check(root);
  assert.deepEqual(report.selection.files, [
    "coverage/generated.md",
    "draft.md",
  ]);
  assert.equal(report.exitCode, 1);
  // Exclusion semantics belong to this fixture, not the repository's authored scope.
  const policy = json(join(root, ".markdown-quality.json"));
  policy.exclude = ["verbatim/**"];
  writeFileSync(join(root, ".markdown-quality.json"), JSON.stringify(policy));
  const content = Buffer.from([0xff, 0x00, 0x0d, 0x0a]);
  const result = await processDocument({
    root,
    path: "verbatim/document.md",
    content,
    requestId: "excluded-payload",
  });
  validateQualityResult(result, { requestId: "excluded-payload" });
  assert.deepEqual(
    Buffer.from(result.document.contentBase64, "base64"),
    content,
  );
  assert.deepEqual(result.written, []);
});

test("root commands retain explicit-file scope and forward options to the public bins", (t) => {
  const root = fixture(t);
  writeFileSync(join(root, "README.md"), "# Consumer\n");
  writeFileSync(join(root, "other.md"), "# Other\n\n[Absent](missing.txt)\n");
  assert.ok(process.env.npm_execpath, "Run the maintained npm test command.");
  for (const command of [
    "check:markdown",
    "format:markdown",
    "inspect:markdown",
  ]) {
    const output = execFileSync(
      process.execPath,
      [
        process.env.npm_execpath,
        "run",
        "--silent",
        command,
        "--",
        "--root",
        root,
        "--json",
        "--",
        "README.md",
      ],
      { cwd: repository, encoding: "utf8", windowsHide: true, timeout: 60000 },
    );
    const report = JSON.parse(output);
    validateQualityResult(report, { exitCode: 0, selectionMode: "explicit" });
    assert.deepEqual(report.selection.files, ["README.md"]);
    assert.deepEqual(report.written, []);
  }
});

test("the root policy accounts for all tracked authored Markdown and checking is read-only", async () => {
  const tracked = execFileSync("git", ["ls-files", "-z", "--", "*.md"], {
    cwd: repository,
    encoding: "utf8",
    windowsHide: true,
  })
    .split("\0")
    .filter(Boolean)
    .sort();
  const before = tracked.map((path) =>
    sha256(readFileSync(join(repository, path))),
  );
  const inspection = await inspectSelection({ root: repository });
  validateQualityResult(inspection, { operation: "inspect", exitCode: 0 });
  assert.deepEqual(
    inspection.selection.inventory.map(({ path }) => path).sort(),
    tracked,
  );
  assert.deepEqual(
    inspection.selection.files.filter((path) => tracked.includes(path)),
    tracked,
  );
  assert.equal(check(repository).exitCode, 0);
  assert.deepEqual(
    tracked.map((path) => sha256(readFileSync(join(repository, path)))),
    before,
  );
});

test("source-bound archives and the isolated lock agree, and tooling cannot enter the product archive", async () => {
  const source = json(join(toolingRoot, "source.json"));
  assert.match(source.source, /^[a-f0-9]{40}$/u);
  const lock = json(join(toolingRoot, "package-lock.json"));
  for (const archive of source.archives) {
    assert.ok(archive.file.endsWith(`-${source.source}.tgz`));
    const bytes = readFileSync(join(toolingRoot, "archives", archive.file));
    assert.equal(sha256(bytes), archive.sha256);
    assert.equal(
      "sha512-" + createHash("sha512").update(bytes).digest("base64"),
      archive.integrity,
    );
    const name =
      "@hadden-industries/markdown-quality" +
      (archive.name === "core" ? "" : `-${archive.name}`);
    const entry = lock.packages[`node_modules/${name}`];
    assert.equal(entry.version, source.version);
    assert.equal(entry.integrity, archive.integrity);
    assert.equal(entry.resolved, `file:archives/${archive.file}`);
  }
  const core = source.archives.find(({ name }) => name === "core");
  const inventory = await archiveInventory(
    join(toolingRoot, "archives", core.file),
  );
  const identity = JSON.parse(
    inventory.contents.get("assets/source-identity.json"),
  );
  assert.deepEqual(identity, {
    head: source.source,
    tree: source.tree,
    clean: true,
    lockSha256: source.sourceLockSha256,
  });
  const packed = runNpmPack(repository, { npm: process.env.npm_execpath });
  assert.ok(
    packed.files.every(({ path }) => !/^(?:tooling|tests)\//u.test(path)),
  );
  const product = json(join(repository, "package.json"));
  assert.equal(product.dependencies[metadata.name], undefined);
});
