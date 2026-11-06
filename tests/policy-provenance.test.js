// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  cpSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  unlinkSync,
  symlinkSync,
} from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { policyProvenance } from "../src/policy-provenance.js";
import {
  resolveJsonQualityPolicy,
  resolveJsonSourceContract,
} from "../src/configuration.js";
import {
  validateJsonQualityEvent,
  assertJsonQualityEvent,
} from "../src/events.js";
import { resolveExecutionResources } from "../src/execution-resources.js";
import {
  policyInputManifest,
  projectPolicyInputs,
} from "../scripts/project-policy-inputs.js";
import { temporaryDirectory } from "./temporary-directory.js";
import {
  readPolicyInputInventory,
  policyResolverFingerprint,
  policyInputInventoryPath,
} from "../src/policy-inputs.js";

const root = fileURLToPath(new URL("../", import.meta.url)),
  hash = (bytes) => createHash("sha256").update(bytes).digest("hex"),
  defaultDigest = hash(
    readFileSync(join(root, "assets/default-json-quality-policy.json")),
  ),
  resolverDigest = independentResolverDigest(root),
  commitId = "a".repeat(40),
  blobId = "b".repeat(40),
  member = (bytes) => ({
    sha256: hash(bytes),
    byteLength: String(Buffer.byteLength(bytes)),
    oid: blobId,
  });

test("four origin vectors hash the exact literal UTF-8 tuple without a trailing LF", () => {
  const bytes = "{}",
    identity = member(bytes);
  for (const [origin, observed, suffix] of [
    [
      { kind: "repository-file", path: ".json-quality.json" },
      identity,
      '"repository-file",".json-quality.json",null,null,"2","' +
        identity.sha256 +
        '"]',
    ],
    [
      { kind: "repository-absence", path: ".json-quality.json" },
      undefined,
      '"repository-absence",".json-quality.json",null,null,null,null]',
    ],
    [
      { kind: "git-blob", path: ".json-quality.json", commitId, blobId },
      identity,
      '"git-blob",".json-quality.json","' +
        commitId +
        '","' +
        blobId +
        '","2","' +
        identity.sha256 +
        '"]',
    ],
    [
      { kind: "git-absence", path: ".json-quality.json", commitId },
      undefined,
      '"git-absence",".json-quality.json","' + commitId + '",null,null,null]',
    ],
  ]) {
    // Independent literal tuple preimage, without the production control serializer.
    const preimage =
        '["json-quality-policy-inputs-v1","6","' +
        defaultDigest +
        '","' +
        resolverDigest +
        '",' +
        suffix,
      result = policyProvenance(origin, observed);
    assert.equal(
      result.policyInputsSha256,
      hash(Buffer.from(preimage, "utf8")),
    );
    assert.notEqual(
      result.policyInputsSha256,
      hash(Buffer.from(preimage + "\n", "utf8")),
    );
    assert.equal(result.defaultPolicySha256, defaultDigest);
    assert.equal(result.policyResolverInputsSha256, resolverDigest);
    assert.equal(Object.hasOwn(result, "effectivePolicySha256"), false);
    if (observed) {
      assert.equal(result.configurationByteLength, "2");
      assert.equal(result.configurationBytesSha256, identity.sha256);
    } else {
      assert.equal(Object.hasOwn(result, "configurationByteLength"), false);
      assert.equal(Object.hasOwn(result, "configurationBytesSha256"), false);
    }
  }
});

test("equal effective policies retain distinct explicit bytes and observed absence identities", () => {
  const first = "{}",
    second = " { }\n";
  assert.deepEqual(
    resolveJsonQualityPolicy(JSON.parse(first)),
    resolveJsonQualityPolicy(JSON.parse(second)),
  );
  assert.deepEqual(resolveJsonQualityPolicy(), resolveJsonQualityPolicy({}));
  const origin = { kind: "repository-file", path: ".json-quality.json" },
    a = policyProvenance({ ...origin }, member(first)),
    b = policyProvenance({ ...origin }, member(second)),
    absent = policyProvenance({
      kind: "repository-absence",
      path: ".json-quality.json",
    });
  assert.notEqual(a.configurationBytesSha256, b.configurationBytesSha256);
  assert.notEqual(a.policyInputsSha256, b.policyInputsSha256);
  assert.notEqual(a.policyInputsSha256, absent.policyInputsSha256);
  assert.equal(Object.hasOwn(absent, "configurationBytesSha256"), false);
});

test("closed origin shapes reject missing identities, noncanonical lengths and Git blob mismatches", () => {
  const valid = member("{}");
  for (const [origin, observed] of [
    [{ kind: "unknown", path: ".json-quality.json" }, undefined],
    [{ kind: "repository-absence", path: "other.json" }, undefined],
    [
      { kind: "repository-absence", path: ".json-quality.json", commitId },
      undefined,
    ],
    [
      { kind: "repository-file", path: ".json-quality.json", extra: true },
      valid,
    ],
    [{ kind: "repository-file", path: ".json-quality.json" }, undefined],
    [
      { kind: "repository-file", path: ".json-quality.json" },
      { byteLength: "2" },
    ],
    [
      { kind: "repository-file", path: ".json-quality.json" },
      { ...valid, byteLength: "02" },
    ],
    [
      { kind: "repository-file", path: ".json-quality.json" },
      { ...valid, byteLength: 2 },
    ],
    [
      { kind: "repository-file", path: ".json-quality.json" },
      { ...valid, sha256: "A".repeat(64) },
    ],
    [{ kind: "repository-absence", path: ".json-quality.json" }, valid],
    [{ kind: "git-absence", path: ".json-quality.json" }, undefined],
    [
      { kind: "git-absence", path: ".json-quality.json", commitId: "main" },
      undefined,
    ],
    [
      {
        kind: "git-absence",
        path: ".json-quality.json",
        commitId,
        blobId: null,
      },
      undefined,
    ],
    [{ kind: "git-blob", path: ".json-quality.json", commitId }, valid],
    [
      {
        kind: "git-blob",
        path: ".json-quality.json",
        commitId,
        blobId: "c".repeat(40),
      },
      valid,
    ],
    [
      {
        kind: "git-blob",
        path: ".json-quality.json",
        commitId,
        blobId: "not-an-oid",
      },
      { ...valid, oid: "not-an-oid" },
    ],
  ])
    assert.throws(
      () => policyProvenance(origin, observed),
      /configuration|origin|blob|identity|control/iu,
    );
});

test("execution event admission binds Git policy origin to qualification identities", () => {
  const event = {
    schemaVersion: 5,
    requestId: "provenance-test",
    type: "execution",
    resources: resolveExecutionResources({}).wire,
    coreSourceInputsSha256: "d".repeat(64),
    ...policyProvenance(
      { kind: "git-blob", path: ".json-quality.json", commitId, blobId },
      member("{}"),
    ),
    qualification: {
      trustedCommitId: commitId,
      candidateCommitId: "c".repeat(40),
      trustedPolicyBlobId: blobId,
      scope: "immutable-git-json",
    },
  };
  assert.equal(validateJsonQualityEvent(event), true);
  for (const mutate of [
    (copy) => {
      copy.qualification.trustedCommitId = "f".repeat(40);
    },
    (copy) => {
      copy.qualification.trustedPolicyBlobId = "f".repeat(40);
    },
    (copy) => {
      delete copy.qualification.trustedPolicyBlobId;
    },
    (copy) => {
      delete copy.qualification;
    },
  ]) {
    const copy = structuredClone(event);
    mutate(copy);
    assert.equal(validateJsonQualityEvent(copy), false);
    assert.throws(
      () => assertJsonQualityEvent(copy),
      /Invalid JSON Quality event/,
    );
  }
  const absent = {
    ...event,
    ...policyProvenance({
      kind: "git-absence",
      path: ".json-quality.json",
      commitId,
    }),
  };
  delete absent.configurationBytesSha256;
  delete absent.configurationByteLength;
  assert.equal(validateJsonQualityEvent(absent), false);
  delete absent.qualification.trustedPolicyBlobId;
  assert.equal(validateJsonQualityEvent(absent), true);
  const repository = {
    ...absent,
    ...policyProvenance({
      kind: "repository-absence",
      path: ".json-quality.json",
    }),
  };
  assert.equal(validateJsonQualityEvent(repository), false);
  delete repository.qualification;
  assert.equal(validateJsonQualityEvent(repository), true);
});

// Independent runtime preimage serialization, without a trailing LF.
function resolverPreimage(directory) {
  const inventory = JSON.parse(
      readFileSync(join(directory, policyInputInventoryPath)),
    ),
    metadata = JSON.parse(readFileSync(join(directory, "package.json")));
  return JSON.stringify([
    "json-quality-policy-resolver-inputs-v2",
    inventory.files.map((path) => [
      path,
      hash(readFileSync(join(directory, path))),
    ]),
    inventory.dependencies.map((name) => [name, metadata.dependencies[name]]),
  ]);
}
function independentResolverDigest(directory) {
  return hash(Buffer.from(resolverPreimage(directory), "utf8"));
}
function copiedInputs(
  t,
  directory = temporaryDirectory(t, "json-policy-input-manifest-"),
) {
  const inventory = readPolicyInputInventory(root);
  for (const path of [
    ...inventory.files,
    "package.json",
    policyInputInventoryPath,
  ]) {
    mkdirSync(dirname(join(directory, path)), { recursive: true });
    writeFileSync(join(directory, path), readFileSync(join(root, path)));
  }
  return { directory, inventory };
}

test("resolver inventory is canonical sorted local paths and selected dependencies without byte hashes", (t) => {
  const { directory, inventory } = copiedInputs(t),
    manifest = readFileSync(
      join(directory, "assets/json-quality-policy-inputs.json"),
      "utf8",
    ),
    paths = inventory.files;
  assert.deepEqual(Object.keys(inventory).sort(), [
    "dependencies",
    "files",
    "schemaVersion",
  ]);
  assert.equal(inventory.schemaVersion, 1);
  const contract = resolveJsonSourceContract(
    policyInputInventoryPath,
    resolveJsonQualityPolicy(
      JSON.parse(readFileSync(join(root, ".json-quality.json"))),
    ),
  );
  assert.equal(contract.formatContract, "producer-json-indent");
  assert.equal(contract.allowSourceRewrites, false);
  // json-identity-contract: bytes; owner: policy inventory format; reason: This assertion specifies generated member order, two-space indentation and one trailing LF.
  assert.equal(manifest, JSON.stringify(inventory, null, 2) + "\n");
  assert.equal(manifest, policyInputManifest(root));
  assert.equal(manifest, policyInputManifest(directory));
  assert.equal(manifest.endsWith("\n"), true);
  assert.equal(manifest.endsWith("\n\n"), false);
  assert.equal(paths.includes("assets/json-quality-policy-inputs.json"), false);
  assert.deepEqual(paths, [...paths].sort());
  assert.equal(new Set(paths).size, paths.length);
  assert.deepEqual(
    inventory.dependencies,
    [...new Set(inventory.dependencies)].sort(),
  );
  assert.ok(inventory.dependencies.includes("ajv"));
  assert.ok(!paths.includes("package.json"));
  for (const required of [
    "src/configuration.js",
    "src/policy-provenance.js",
    "src/paths.js",
    "schemas/configuration.schema.json",
    "schemas/effective-policy.schema.json",
    "assets/default-json-quality-policy.json",
  ])
    assert.ok(paths.includes(required), required);
  for (const path of paths) {
    assert.ok(
      !path.includes("\\") &&
        !path.includes(":") &&
        !path.startsWith("/") &&
        !path.startsWith("../"),
    );
    assert.ok(!path.startsWith("node_modules/"));
  }
  projectPolicyInputs(directory);
});

for (const layout of ["hoisted", "nested"]) {
  test(`resolver inventory admits ${layout} installed dependencies without importing their bytes`, (t) => {
    const fixture = temporaryDirectory(t, "json-policy-installed-layout-"),
      modules = join(fixture, "node_modules"),
      directory = join(modules, "@hadden-industries", "json-quality");
    copiedInputs(t, directory);
    const dependency =
      layout === "hoisted"
        ? join(modules, "ajv")
        : join(directory, "node_modules", "ajv");
    cpSync(join(root, "node_modules", "ajv"), dependency, {
      recursive: true,
    });
    // Exercise the real resolver against genuine installed dependency files.
    assert.equal(
      policyInputManifest(directory),
      readFileSync(join(root, policyInputInventoryPath), "utf8"),
    );
    assert.equal(
      policyResolverFingerprint(directory),
      policyResolverFingerprint(root),
    );
    const configuration = join(directory, "src/configuration.js");
    writeFileSync(
      configuration,
      'import "eslint";\n' + readFileSync(configuration, "utf8"),
    );
    assert.throws(
      () => policyInputManifest(directory),
      /Policy import requires a declared runtime dependency: eslint/u,
    );
    const escaping = relative(
      dirname(configuration),
      join(dependency, "dist/2020.js"),
    )
      .split(sep)
      .join("/");
    writeFileSync(
      configuration,
      `import ${JSON.stringify(escaping)};\n` +
        readFileSync(join(root, "src/configuration.js"), "utf8"),
    );
    assert.throws(
      () => policyInputManifest(directory),
      /Invalid repository-relative path|Policy local imports must not enter dependency packages/u,
    );
  });
}

test("runtime fingerprint hashes current input bytes and selected declarations without a trailing LF", (t) => {
  const { directory, inventory } = copiedInputs(t),
    manifest = readFileSync(join(directory, policyInputInventoryPath)),
    digest = policyResolverFingerprint(directory),
    preimage = resolverPreimage(directory);
  assert.equal(digest, hash(Buffer.from(preimage, "utf8")));
  assert.notEqual(digest, hash(Buffer.from(preimage + "\n", "utf8")));
  for (const path of inventory.files) {
    const source = join(directory, path),
      original = readFileSync(source);
    writeFileSync(source, Buffer.concat([original, Buffer.from("\n")]));
    assert.notEqual(policyResolverFingerprint(directory), digest, path);
    assert.deepEqual(
      readFileSync(join(directory, policyInputInventoryPath)),
      manifest,
    );
    writeFileSync(source, original);
    assert.equal(policyResolverFingerprint(directory), digest, path);
  }
});

test("a newly imported policy helper and its transitive local inputs enter the manifest", (t) => {
  const { directory } = copiedInputs(t),
    configuration = join(directory, "src/configuration.js");
  writeFileSync(
    configuration,
    'import "./policy-helper.js";\n' + readFileSync(configuration, "utf8"),
  );
  writeFileSync(
    join(directory, "src/policy-helper.js"),
    'export { value } from "./policy-helper-leaf.js";\n',
  );
  writeFileSync(
    join(directory, "src/policy-helper-leaf.js"),
    "export const value = true;\n",
  );
  const { files: paths } = JSON.parse(policyInputManifest(directory));
  assert.ok(paths.includes("src/policy-helper.js"));
  assert.ok(paths.includes("src/policy-helper-leaf.js"));
  assert.throws(() => projectPolicyInputs(directory), /inventory drifted/);
  projectPolicyInputs(directory, { write: true });
  assert.equal(
    readFileSync(join(directory, policyInputInventoryPath), "utf8"),
    policyInputManifest(directory),
  );
  assert.equal(
    policyResolverFingerprint(directory),
    independentResolverDigest(directory),
  );
});

test("literal dynamic local policy imports cannot escape the resolver input closure", (t) => {
  const { directory } = copiedInputs(t),
    configuration = join(directory, "src/configuration.js");
  writeFileSync(
    configuration,
    'const additionalPolicy = await import("./policy-dynamic.js");\n' +
      readFileSync(configuration, "utf8"),
  );
  writeFileSync(
    join(directory, "src/policy-dynamic.js"),
    "export const value = true;\n",
  );
  const { files } = JSON.parse(policyInputManifest(directory));
  assert.ok(files.includes("src/policy-dynamic.js"));
});

test("unrelated package metadata is fingerprint invariant while selected dependency versions are not", (t) => {
  const { directory, inventory } = copiedInputs(t),
    path = join(directory, "package.json"),
    metadata = JSON.parse(readFileSync(path)),
    initial = policyResolverFingerprint(directory);
  const changed = {
    ...metadata,
    version: "9.8.7",
    description: "Changed description",
    keywords: ["different"],
    scripts: { test: "unrelated" },
  };
  writeFileSync(path, JSON.stringify(changed));
  assert.equal(policyResolverFingerprint(directory), initial);
  const dependency = inventory.dependencies[0];
  assert.ok(dependency);
  changed.dependencies = { ...metadata.dependencies, [dependency]: "0.0.1" };
  writeFileSync(path, JSON.stringify(changed));
  assert.notEqual(policyResolverFingerprint(directory), initial);
  assert.equal(
    policyResolverFingerprint(directory),
    independentResolverDigest(directory),
  );
  writeFileSync(path, JSON.stringify({ ...metadata, name: "another-package" }));
  assert.throws(() => policyResolverFingerprint(directory));
});

test(
  "dependency-cruiser refuses unresolved escaping malformed and computed policy imports finitely",
  { timeout: 60000 },
  (t) => {
    const { directory } = copiedInputs(t),
      configuration = join(directory, "src/configuration.js"),
      original = readFileSync(configuration, "utf8");
    const outside = join(
      temporaryDirectory(t, "json-policy-outside-"),
      "policy.js",
    );
    writeFileSync(outside, "export const outside = true;\n");
    const escaping = relative(dirname(configuration), outside)
      .split(sep)
      .join("/");
    for (const prefix of [
      'import "./absent-policy-helper.js";',
      `import ${JSON.stringify(escaping)};`,
      'import "undeclared-policy-package";',
      "import { invalid syntax;",
      'const policyPath = "./configuration.js"; import(policyPath);',
      'const policyPath = "./configuration.js"; require(policyPath);',
      '/* eslint policy/closed: "off" */ const policyPath = "./configuration.js"; import(policyPath);',
    ]) {
      writeFileSync(configuration, prefix + "\n" + original);
      assert.throws(() => policyInputManifest(directory), undefined, prefix);
    }
  },
);

test("policy inventory rejects malformed stale missing and nonregular inputs", (t) => {
  const { directory, inventory } = copiedInputs(t),
    path = join(directory, policyInputInventoryPath),
    original = readFileSync(path);
  for (const value of [
    { ...inventory, schemaVersion: 2 },
    { ...inventory, extra: true },
    { ...inventory, files: [...inventory.files, inventory.files[0]] },
    { ...inventory, files: [...inventory.files].reverse() },
    {
      ...inventory,
      files: inventory.files.filter((path) => path !== "src/configuration.js"),
    },
    { ...inventory, files: [...inventory.files, "../escape.js"].sort() },
    { ...inventory, files: [...inventory.files, "package.json"].sort() },
    {
      ...inventory,
      files: [...inventory.files, policyInputInventoryPath].sort(),
    },
    {
      ...inventory,
      files: [...inventory.files, "node_modules/ajv/package.json"].sort(),
    },
    {
      ...inventory,
      dependencies: [...inventory.dependencies, inventory.dependencies[0]],
    },
  ]) {
    writeFileSync(path, JSON.stringify(value));
    assert.throws(() => readPolicyInputInventory(directory));
    assert.throws(() => policyResolverFingerprint(directory));
  }
  writeFileSync(path, "{");
  assert.throws(() => readPolicyInputInventory(directory));
  writeFileSync(path, original);
  const target = join(directory, "src/configuration.js");
  unlinkSync(target);
  assert.throws(() => policyResolverFingerprint(directory));
  mkdirSync(target);
  assert.throws(() => policyResolverFingerprint(directory));
  assert.throws(() => policyInputManifest(directory));
});

test("policy inventory and discovery refuse a symlinked local input", (t) => {
  const { directory } = copiedInputs(t),
    target = join(directory, "src/configuration.js"),
    linked = join(directory, "src/policy-link-target.js");
  writeFileSync(linked, readFileSync(target));
  unlinkSync(target);
  try {
    symlinkSync(linked, target, "file");
  } catch (error) {
    if (["EPERM", "EACCES"].includes(error.code)) {
      // Directory junctions exercise the same ancestor guard without Windows
      // file-symlink privilege. Both targets remain inside this test's root.
      writeFileSync(target, readFileSync(linked));
      const alias = "linked-source";
      try {
        symlinkSync(join(directory, "src"), join(directory, alias), "junction");
      } catch (junctionError) {
        if (["EPERM", "EACCES"].includes(junctionError.code)) {
          t.skip("Host permits neither file symlinks nor directory junctions");
          return;
        }
        throw junctionError;
      }
      const path = alias + "/policy-link-target.js";
      const inventory = readPolicyInputInventory(directory);
      inventory.files.push(path);
      inventory.files.sort();
      writeFileSync(
        join(directory, policyInputInventoryPath),
        JSON.stringify(inventory),
      );
      writeFileSync(
        target,
        'import "../' + path + '";\n' + readFileSync(target, "utf8"),
      );
      assert.throws(
        () => policyResolverFingerprint(directory),
        /Nonregular source path/,
      );
      assert.throws(() => policyInputManifest(directory));
      return;
    }
    throw error;
  }
  assert.throws(() => policyResolverFingerprint(directory));
  assert.throws(() => policyInputManifest(directory));
});
