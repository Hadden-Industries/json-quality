// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { policyProvenance } from "../src/policy-provenance.js";
import { resolveJsonQualityPolicy } from "../src/configuration.js";
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

const root = fileURLToPath(new URL("../", import.meta.url)),
  hash = (bytes) => createHash("sha256").update(bytes).digest("hex"),
  defaultDigest = hash(
    readFileSync(join(root, "assets/default-json-quality-policy.json")),
  ),
  resolverDigest = hash(
    readFileSync(join(root, "assets/json-quality-policy-inputs.json")),
  ),
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
        '["json-quality-policy-inputs-v1","4","' +
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
    schemaVersion: 4,
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

function copiedInputs(t) {
  const directory = temporaryDirectory(t, "json-policy-input-manifest-"),
    [, entries] = JSON.parse(policyInputManifest(root));
  for (const [path] of entries) {
    mkdirSync(dirname(join(directory, path)), { recursive: true });
    writeFileSync(join(directory, path), readFileSync(join(root, path)));
  }
  projectPolicyInputs(directory, { write: true });
  return { directory, entries };
}

test("resolver input manifest is sorted, path-independent, closed and changes for every listed input", (t) => {
  const { directory, entries } = copiedInputs(t),
    manifest = readFileSync(
      join(directory, "assets/json-quality-policy-inputs.json"),
      "utf8",
    ),
    digest = hash(manifest),
    paths = entries.map(([path]) => path);
  assert.equal(manifest, policyInputManifest(root));
  assert.equal(manifest.endsWith("\n"), true);
  assert.equal(manifest.endsWith("\n\n"), false);
  assert.equal(paths.includes("assets/json-quality-policy-inputs.json"), false);
  assert.deepEqual(paths, [...paths].sort());
  for (const required of [
    "package.json",
    "src/configuration.js",
    "src/policy-provenance.js",
    "schemas/configuration.schema.json",
    "schemas/effective-policy.schema.json",
    "assets/default-json-quality-policy.json",
  ])
    assert.ok(paths.includes(required), required);
  for (const [path, digest] of entries) {
    assert.ok(
      !path.includes("\\") &&
        !path.includes(":") &&
        !path.startsWith("/") &&
        !path.startsWith("../"),
    );
    assert.match(digest, /^[a-f0-9]{64}$/u);
    assert.equal(digest, hash(readFileSync(join(directory, path))));
  }
  for (const [path] of entries) {
    const source = join(directory, path),
      original = readFileSync(source);
    writeFileSync(source, Buffer.concat([original, Buffer.from("\n")]));
    assert.notEqual(hash(policyInputManifest(directory)), digest, path);
    assert.throws(() => projectPolicyInputs(directory), /manifest drifted/);
    writeFileSync(source, original);
  }
  projectPolicyInputs(directory);
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
  const [, entries] = JSON.parse(policyInputManifest(directory)),
    paths = entries.map(([path]) => path);
  assert.ok(paths.includes("src/policy-helper.js"));
  assert.ok(paths.includes("src/policy-helper-leaf.js"));
  assert.throws(() => projectPolicyInputs(directory), /manifest drifted/);
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
  const [, entries] = JSON.parse(policyInputManifest(directory));
  assert.ok(entries.some(([path]) => path === "src/policy-dynamic.js"));
});
