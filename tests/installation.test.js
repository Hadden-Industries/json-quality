// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { temporaryDirectory } from "./temporary-directory.js";
import { createRequire } from "node:module";
import { gzipSync } from "node:zlib";
import {
  jsonQualitySourceCoordinate,
  jsonQualityAcquisitionBootstrap,
  verifyJsonQualityInstallation,
} from "../src/installation.js";
import { readPackReport } from "../scripts/pack.js";

const name = "@hadden-industries/json-quality";
const git = "git+https://github.com/Hadden-Industries/json-quality.git#";
const npm = process.env.npm_execpath;
assert.ok(npm, "Run the maintained tests through npm.");
const npmRequire = createRequire(npm);

test("source coordinates admit exact versions and full producer commits only", () => {
  assert.deepEqual(jsonQualitySourceCoordinate("1.2.3"), {
    kind: "registry",
    version: "1.2.3",
  });
  assert.deepEqual(jsonQualitySourceCoordinate(`npm:${name}@1.2.3-rc.1`), {
    kind: "registry",
    version: "1.2.3-rc.1",
  });
  assert.deepEqual(jsonQualitySourceCoordinate(git + "a".repeat(40)), {
    kind: "git",
    commit: "a".repeat(40),
  });
  for (const value of [
    "*",
    ">=1.2.3",
    "^1.2.3",
    "latest",
    "file:../json-quality",
    git + "main",
    git + "abc123",
    git + "a".repeat(40) + "::path:subdirectory",
    "git+https://github.com/example/other.git#" + "a".repeat(40),
    "npm:other@1.2.3",
  ])
    assert.throws(() => jsonQualitySourceCoordinate(value));
});

async function installation(
  t,
  source = "1.2.3",
  { nativeBinary = false } = {},
) {
  const root = temporaryDirectory(t, "json-quality-installation-");
  const producer = join(root, "producer");
  mkdirSync(producer);
  const manifest = {
    name,
    version: "1.2.3",
    type: "module",
    files: ["index.js", "src/acquire.js"],
  };
  const payload = "export const approved = true;\n";
  const binary = nativeBinary
    ? join(
        process.env.JSON_QUALITY_NATIVE_TEST_ARTIFACTS ??
          fileURLToPath(
            new URL(
              "../native/prebuilt/" +
                process.platform +
                "-" +
                process.arch +
                "/",
              import.meta.url,
            ),
          ),
        "json-quality.node",
      )
    : null;
  if (nativeBinary) {
    manifest.files.push("native-component.node");
    copyFileSync(binary, join(producer, "native-component.node"));
  }
  writeFileSync(join(producer, "package.json"), JSON.stringify(manifest));
  writeFileSync(join(producer, "index.js"), payload);
  mkdirSync(join(producer, "src"));
  writeFileSync(
    join(producer, "src/acquire.js"),
    jsonQualityAcquisitionBootstrap(),
  );
  const packed = readPackReport(
    execFileSync(
      process.env.JSON_QUALITY_PRODUCER_NODE ?? process.execPath,
      [
        process.env.JSON_QUALITY_PRODUCER_NPM ?? npm,
        "pack",
        "--ignore-scripts",
        "--json",
        "--pack-destination",
        root,
      ],
      { cwd: producer, encoding: "utf8", windowsHide: true },
    ),
  );
  const bytes = readFileSync(join(root, packed.filename));
  const cachePath = join(root, "cache");
  await npmRequire("cacache").put(
    join(cachePath, "_cacache"),
    "independent-packed-fixture",
    bytes,
  );
  const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
  const toolingRoot = join(root, "consumer");
  const installedRoot = join(toolingRoot, "node_modules", name);
  mkdirSync(installedRoot, { recursive: true });
  writeFileSync(join(installedRoot, "package.json"), JSON.stringify(manifest));
  writeFileSync(join(installedRoot, "index.js"), payload);
  mkdirSync(join(installedRoot, "src"));
  if (nativeBinary)
    copyFileSync(binary, join(installedRoot, "native-component.node"));
  writeFileSync(
    join(installedRoot, "src/acquire.js"),
    jsonQualityAcquisitionBootstrap(),
  );
  writeFileSync(
    join(toolingRoot, "package.json"),
    JSON.stringify({ private: true, devDependencies: { [name]: source } }),
  );
  const lock = {
    lockfileVersion: 3,
    packages: {
      "": { devDependencies: { [name]: source } },
      [`node_modules/${name}`]: {
        version: "1.2.3",
        resolved: source.startsWith(git)
          ? source
          : "https://registry.npmjs.org/@hadden-industries/json-quality/-/json-quality-1.2.3.tgz",
        integrity,
      },
    },
  };
  writeFileSync(join(toolingRoot, "package-lock.json"), JSON.stringify(lock));
  // Fixture bookkeeping is not part of the closed public verifier request.
  return Object.defineProperties(
    { toolingRoot, cachePath },
    {
      installedRoot: { value: installedRoot },
      lock: { value: lock },
    },
  );
}

test("native packed fixture validates cached bytes independently of installed files", async (t) => {
  const context = await installation(t);
  const result = await verifyJsonQualityInstallation(context);
  assert.equal(result.files, 3);
  writeFileSync(
    join(context.installedRoot, "index.js"),
    "export const approved = false;\n",
  );
  await assert.rejects(
    verifyJsonQualityInstallation(context),
    /payload differs/u,
  );
});

test("a real native binary member is streamed independently of the JSON file-byte admission", async (t) => {
  const context = await installation(t, "1.2.3", { nativeBinary: true });
  assert.equal(
    (
      await verifyJsonQualityInstallation({
        ...context,
        capacityLimits: { maxFileBytes: 1 },
      })
    ).files,
    4,
  );
  const binary = join(context.installedRoot, "native-component.node");
  const bytes = readFileSync(binary);
  bytes[0] ^= 1;
  writeFileSync(binary, bytes);
  await assert.rejects(
    verifyJsonQualityInstallation({ ...context, capacityLimits: false }),
    /payload differs/,
  );
});

test("installation verification rejects unknown controls and honors pre-aborted cancellation", async () => {
  await assert.rejects(
    verifyJsonQualityInstallation({ toolingRoot: "absent", backend: "other" }),
    /verification options/,
  );
  const controller = new AbortController();
  controller.abort(new Error("deliberate stop"));
  await assert.rejects(
    verifyJsonQualityInstallation({
      toolingRoot: "absent",
      signal: controller.signal,
    }),
    /deliberate stop/,
  );
});

test("a full Git selection retains the same cached-payload proof", async (t) => {
  const context = await installation(t, git + "a".repeat(40));
  assert.equal(
    (await verifyJsonQualityInstallation(context)).coordinate.commit,
    "a".repeat(40),
  );
  context.lock.packages[`node_modules/${name}`].resolved = git + "b".repeat(40);
  writeFileSync(
    join(context.toolingRoot, "package-lock.json"),
    JSON.stringify(context.lock),
  );
  await assert.rejects(
    verifyJsonQualityInstallation(context),
    /resolved source/u,
  );
});

test("native Git lock transport canonicalization retains exact producer and commit admission", async (t) => {
  const commit = "a".repeat(40);
  const context = await installation(t, git + commit);
  const entry = context.lock.packages[`node_modules/${name}`];
  entry.resolved = `git+ssh://git@github.com/Hadden-Industries/json-quality.git#${commit}`;
  const save = () =>
    writeFileSync(
      join(context.toolingRoot, "package-lock.json"),
      JSON.stringify(context.lock),
    );
  save();
  assert.equal(
    (await verifyJsonQualityInstallation(context)).coordinate.commit,
    commit,
  );
  for (const resolved of [
    `git+http://github.com/Hadden-Industries/json-quality.git#${commit}`,
    `git://github.com/Hadden-Industries/json-quality.git#${commit}`,
    `https://github.com/Hadden-Industries/json-quality.git#${commit}`,
    `github:Hadden-Industries/json-quality#${commit}`,
    `git+ssh://other@github.com/Hadden-Industries/json-quality.git#${commit}`,
    `git+ssh://git@github.com/other/json-quality.git#${commit}`,
    `git+ssh://git@github.com/Hadden-Industries/other.git#${commit}`,
    `git+ssh://git@github.example/Hadden-Industries/json-quality.git#${commit}`,
    `git+ssh://git@github.com/Hadden-Industries/json-quality.git#${"b".repeat(40)}`,
    `git+https://github.com/Hadden-Industries/json-quality.git#${commit}::path:subdirectory`,
    "git+https://github.com/Hadden-Industries/json-quality.git#main",
    "git+https://github.com/Hadden-Industries/json-quality.git#semver:^1.0.0",
    "not a source coordinate",
  ]) {
    entry.resolved = resolved;
    save();
    await assert.rejects(
      verifyJsonQualityInstallation(context),
      /resolved source/u,
    );
  }
});

test("default verification follows the same native cache policy as acquisition", async (t) => {
  const context = await installation(t);
  const previous = process.env.npm_config_cache;
  process.env.npm_config_cache = context.cachePath;
  try {
    assert.equal(
      (
        await verifyJsonQualityInstallation({
          toolingRoot: context.toolingRoot,
        })
      ).files,
      3,
    );
  } finally {
    if (previous === undefined) delete process.env.npm_config_cache;
    else process.env.npm_config_cache = previous;
  }
});

test("consumer bootstraps are generated from one shared source and drift fails", async (t) => {
  const context = await installation(t);
  const bootstrapPath = join(context.toolingRoot, "bootstrap.mjs");
  writeFileSync(
    bootstrapPath,
    jsonQualityAcquisitionBootstrap().replaceAll("\r\n", "\n"),
  );
  assert.equal(
    (await verifyJsonQualityInstallation({ ...context, bootstrapPath })).files,
    3,
  );
  writeFileSync(
    bootstrapPath,
    jsonQualityAcquisitionBootstrap() + "\n// unreviewed change\n",
  );
  await assert.rejects(
    verifyJsonQualityInstallation({ ...context, bootstrapPath }),
    /bootstrap differs/u,
  );
});

for (const headerOptions of [
  { path: "package/../outside.js", type: "File" },
  {
    path: "package/index.js",
    type: "SymbolicLink",
    linkpath: "../../outside.js",
  },
]) {
  test(`cache payload rejects unsafe archive member ${headerOptions.path} (${headerOptions.type}) without extraction`, async (t) => {
    const context = await installation(t);
    const header = new (npmRequire("tar").Header)({
      ...headerOptions,
      mode: 0o644,
      size: 0,
    });
    header.encode();
    const bytes = gzipSync(Buffer.concat([header.block, Buffer.alloc(1024)]));
    await npmRequire("cacache").put(
      join(context.cachePath, "_cacache"),
      "unsafe-independent-fixture",
      bytes,
    );
    context.lock.packages[`node_modules/${name}`].integrity =
      `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
    writeFileSync(
      join(context.toolingRoot, "package-lock.json"),
      JSON.stringify(context.lock),
    );
    await assert.rejects(
      verifyJsonQualityInstallation(context),
      /repository-relative|non-file/u,
    );
    assert.equal(
      readFileSync(join(context.installedRoot, "index.js"), "utf8"),
      "export const approved = true;\n",
    );
  });
}

test("payload bounds can be raised or bypassed without waiving file identity", async (t) => {
  const context = await installation(t);
  await assert.rejects(
    verifyJsonQualityInstallation({
      ...context,
      capacityLimits: { maxFiles: 1 },
    }),
    /resource limit/u,
  );
  assert.equal(
    (
      await verifyJsonQualityInstallation({
        ...context,
        capacityLimits: { maxFiles: 10 },
      })
    ).files,
    3,
  );
  assert.equal(
    (await verifyJsonQualityInstallation({ ...context, capacityLimits: false }))
      .files,
    3,
  );
  writeFileSync(join(context.installedRoot, "unexpected.js"), "unexpected\n");
  await assert.rejects(
    verifyJsonQualityInstallation({ ...context, capacityLimits: false }),
    /payload differs/u,
  );
});

for (const type of ["SolarisACL", "SparseFile", "ExtendedHeader"]) {
  test(`cached payload rejects ignored ${type} members before installed-file comparison`, async (t) => {
    const context = await installation(t);
    const chunks = [];
    const add = (path, memberType, payload) => {
      const header = new (npmRequire("tar").Header)({
        path,
        type: memberType,
        mode: 0o644,
        size: payload.length,
      });
      header.encode();
      chunks.push(
        header.block,
        payload,
        Buffer.alloc((512 - (payload.length % 512)) % 512),
      );
    };
    for (const path of ["package.json", "index.js", "src/acquire.js"])
      add(
        `package/${path}`,
        "File",
        readFileSync(join(context.installedRoot, path)),
      );
    add("package/../outside", type, Buffer.alloc(9000, 65));
    chunks.push(Buffer.alloc(1024));
    const bytes = gzipSync(Buffer.concat(chunks));
    await npmRequire("cacache").put(
      join(context.cachePath, "_cacache"),
      "ignored-member-independent-fixture",
      bytes,
    );
    context.lock.packages[`node_modules/${name}`].integrity =
      `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
    writeFileSync(
      join(context.toolingRoot, "package-lock.json"),
      JSON.stringify(context.lock),
    );
    await assert.rejects(
      verifyJsonQualityInstallation({
        ...context,
        capacityLimits: { maxFileBytes: 8192, maxTotalBytes: 8192 },
      }),
      /Unsupported or oversized package archive member/u,
    );
    assert.equal(
      readFileSync(join(context.installedRoot, "index.js"), "utf8"),
      "export const approved = true;\n",
    );
  });
}
