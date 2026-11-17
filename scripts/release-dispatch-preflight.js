// SPDX-License-Identifier: AGPL-3.0-only
/** Validate a whole dispatch locally; this command cannot reserve or dispatch a run. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "yaml";
import { sha256, verifyDecision, verifyManifest } from "./release-contract.js";

export function preflightDispatch(
  workflow,
  request,
  { release, manifestSha256 } = {},
) {
  assert.ok(
    Object.hasOwn(workflow.on ?? {}, "workflow_dispatch"),
    "Selected workflow is not manually dispatchable",
  );
  assert.deepEqual(Object.keys(request).sort(), ["inputs", "ref"]);
  assert.ok(
    ["main", "refs/heads/main"].includes(request.ref),
    "Release dispatch must select main",
  );
  const declared = workflow.on?.workflow_dispatch?.inputs ?? {};
  const inputs = request.inputs;
  assert.ok(inputs && typeof inputs === "object" && !Array.isArray(inputs));
  assert.ok(Object.keys(inputs).length <= 25);
  if (release) {
    verifyManifest(release);
    if (inputs.version !== undefined)
      assert.equal(inputs.version, release.version);
    if (inputs.manifest_sha !== undefined && manifestSha256 !== undefined)
      assert.equal(
        inputs.manifest_sha,
        manifestSha256,
        "Selected manifest bytes differ",
      );
  }
  for (const key of Object.keys(inputs))
    assert.ok(Object.hasOwn(declared, key), `Undeclared input: ${key}`);
  for (const [key, spec] of Object.entries(declared)) {
    if (!Object.hasOwn(inputs, key)) {
      assert.ok(
        !spec.required || Object.hasOwn(spec, "default"),
        `Missing required input: ${key}`,
      );
      continue;
    }
    const value = inputs[key];
    if (spec.type === "boolean") assert.equal(typeof value, "boolean", key);
    else if (spec.type === "number")
      assert.ok(typeof value === "number" && Number.isFinite(value), key);
    else assert.equal(typeof value, "string", key);
    if (spec.required)
      assert.notEqual(value, "", `Empty required input: ${key}`);
    if (spec.type === "choice") assert.ok(spec.options.includes(value), key);
    if (key.endsWith("_json") && value) {
      JSON.parse(value);
      const digest = key.slice(0, -5) + "_sha";
      if (Object.hasOwn(declared, digest))
        assert.equal(
          inputs[digest],
          sha256(Buffer.from(value)),
          `Digest binding: ${key}`,
        );
      if (release && ["review_json", "acceptance_json"].includes(key))
        verifyDecision(
          Buffer.from(value),
          inputs[digest],
          release,
          inputs.manifest_sha,
          key === "review_json" ? "review" : "acceptance",
        );
    }
    if (key.endsWith("_sha") && value)
      assert.match(value, /^[a-f0-9]{64}$/u, key);
  }
  // GitHub documents characters; UTF-8 bytes of escaped inputs is deliberately
  // conservative and includes JSON quoting/Unicode across the complete object.
  const inputBytes = Buffer.byteLength(JSON.stringify(inputs), "utf8");
  assert.ok(
    inputBytes <= 65535,
    "Complete escaped dispatch inputs exceed 65,535-byte policy",
  );
  return { valid: true, inputCount: Object.keys(inputs).length, inputBytes };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.ok(
    [4, 5].includes(process.argv.length),
    "Use WORKFLOW.yml REQUEST.json [MANIFEST.json]",
  );
  const [name, path, manifest] = process.argv.slice(2);
  assert.match(name, /^[a-z][a-z0-9-]+\.yml$/u);
  const document = parseDocument(
    readFileSync(
      new URL(`../.github/workflows/${name}`, import.meta.url),
      "utf8",
    ),
    { uniqueKeys: true },
  );
  assert.equal(document.errors.length, 0);
  const manifestBytes = manifest
    ? readFileSync(join(process.cwd(), manifest))
    : undefined;
  console.log(
    JSON.stringify(
      preflightDispatch(document.toJS(), JSON.parse(readFileSync(path)), {
        release: manifestBytes ? JSON.parse(manifestBytes) : undefined,
        manifestSha256: manifestBytes ? sha256(manifestBytes) : undefined,
      }),
    ),
  );
}
