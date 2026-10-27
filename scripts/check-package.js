// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { publint } from "publint";
import { stageCore } from "./package-stage.js";

export async function checkPackage(
  directory,
  {
    files = readdirSync(directory, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => ({
        path: join(entry.parentPath, entry.name)
          .slice(directory.length + 1)
          .replaceAll("\\", "/"),
      })),
  } = {},
) {
  const metadata = JSON.parse(readFileSync(join(directory, "package.json")));
  assert.equal(metadata.name, "@hadden-industries/json-quality");
  assert.match(metadata.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u);
  assert.equal(metadata.license, "AGPL-3.0-only");
  assert.equal(metadata.type, "module");
  assert.equal(metadata.engines.node, ">=22.13.0");
  assert.deepEqual(metadata.bin, {
    "json-quality": "src/cli.js",
    "json-quality-qualify": "src/qualification-cli.js",
  });
  assert.equal(metadata.types, "./types/index.d.ts");
  assert.deepEqual(
    Object.keys(metadata.exports).sort(),
    [
      ".",
      "./eslint",
      "./configuration-schema",
      "./source-contract-schema",
      "./event-schema",
      "./contract-cohort",
    ].sort(),
  );
  for (const key of [".", "./eslint"]) {
    assert.equal(Object.keys(metadata.exports[key])[0], "types");
    assert.ok(
      readFileSync(join(directory, metadata.exports[key].types)).length,
    );
    assert.ok(
      readFileSync(join(directory, metadata.exports[key].import)).length,
    );
  }
  assert.equal(
    metadata.repository.url,
    "https://github.com/Hadden-Industries/json-quality.git",
  );
  for (const specifier of Object.values({
    ...metadata.dependencies,
    ...metadata.optionalDependencies,
  }))
    assert.match(
      specifier,
      /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u,
      "Runtime dependency must be exact",
    );
  for (const specifier of Object.values(metadata.devDependencies))
    assert.match(specifier, /^>=/u);
  assert.equal(metadata.peerDependencies.eslint, ">=9");
  assert.equal(metadata.peerDependenciesMeta.eslint.optional, true);
  assert.ok(
    !metadata.scripts || Object.keys(metadata.scripts).length === 0,
    "Published package must have no lifecycle/tooling scripts",
  );
  for (const { path } of files)
    assert.ok(
      !/^(?:tests|scripts|tooling|\.git|node_modules|docs\/plans|native\/prebuilt)(?:\/|$)|(?:^|\/)(?:\.env(?:\..*)?|\.npmrc|[^/]*\.log)$/u.test(
        path,
      ),
      `Forbidden package member: ${path}`,
    );
  for (const required of [
    "package.json",
    "LICENSE",
    "README.md",
    "types/index.d.ts",
    "types/eslint/index.d.ts",
  ])
    assert.ok(
      files.some((file) => file.path === required),
      `Required package member missing: ${required}`,
    );
  const { messages } = await publint({
    pkgDir: directory,
    strict: true,
    pack: false,
  });
  assert.deepEqual(
    messages.filter((message) => message.type === "error"),
    [],
    "Strict publint rejected the shipped package",
  );
  return { metadata: "passed", publint: "passed" };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv[2])
    console.log(JSON.stringify(await checkPackage(process.argv[2])));
  else {
    const scratch = mkdtempSync(
      join(tmpdir(), "json-quality-package-contract-"),
    );
    try {
      const staged = join(scratch, "package");
      stageCore(fileURLToPath(new URL("../", import.meta.url)), staged);
      console.log(JSON.stringify(await checkPackage(staged)));
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }
}
