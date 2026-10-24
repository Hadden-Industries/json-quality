// SPDX-License-Identifier: AGPL-3.0-only
/** Anonymous exact-version readback; all public behavior reuses qualify-package.js. */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  regularBytes,
  save,
  verifyArchive,
  verifyManifest,
} from "./release-contract.js";
import { verifyBundle } from "./release-evidence.js";
import { budgets, native } from "./qualification-process.js";

export async function registryBytes(url, maximum, fetcher = fetch) {
  const location = new URL(url);
  assert.equal(location.origin, "https://registry.npmjs.org");
  assert.ok(!location.username && !location.password);
  const response = await fetcher(location, {
    redirect: "error",
    signal: AbortSignal.timeout(60000),
  });
  assert.equal(response.status, 200, "Public version unavailable");
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    assert.ok(size <= maximum, "Registry response exceeds bound");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
export function verifyPublicMetadata(metadata, release) {
  assert.equal(metadata.name, release.package);
  assert.equal(metadata.version, release.version);
  assert.equal(metadata.license, "AGPL-3.0-only");
  assert.equal(metadata.dist.integrity, release.archive.integrity);
  const url = new URL(metadata.dist.tarball);
  assert.equal(url.origin, "https://registry.npmjs.org");
  assert.ok(!url.username && !url.password);
  assert.ok(
    metadata.dist.attestations?.url && metadata.dist.signatures?.length,
    "Native signatures and provenance metadata required",
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 4);
  const [directory, output] = process.argv.slice(2).map((p) => resolve(p));
  mkdirSync(output, { recursive: true });
  const release = verifyManifest(
    verifyBundle(directory, process.env.MANIFEST_SHA),
  );
  const context = JSON.parse(regularBytes(join(directory, "context.json")));
  const metadata = JSON.parse(
    await registryBytes(
      `https://registry.npmjs.org/${encodeURIComponent(release.package)}/${encodeURIComponent(release.version)}`,
      1048576,
    ),
  );
  verifyPublicMetadata(metadata, release);
  const archive = await registryBytes(
    metadata.dist.tarball,
    release.archive.size,
  );
  verifyArchive(archive, release.archive);
  // Public bytes have been independently acquired; install remains an anonymous registry install.
  const tarball = join(output, release.archive.filename);
  save(tarball, archive);
  const proof = join(directory, `${release.archive.filename}.provenance.json`);
  const publication = join(output, "publication.json");
  save(publication, { release, origin: context.stage });
  save(join(output, "registry-metadata.json"), metadata);
  const npm = process.env.JSON_QUALITY_CONSUMER_NPM;
  assert.ok(npm);
  assert.ok(
    release.matrix.node.includes(process.env.JSON_QUALITY_EXPECTED_NODE),
  );
  for (const layout of ["root", "isolated"])
    native(
      process.execPath,
      [
        "scripts/qualify-package.js",
        "--archive",
        tarball,
        "--provenance",
        proof,
        "--npm",
        npm,
        "--registry",
        "--layout",
        layout,
        "--evidence",
        output,
        "--publication",
        publication,
        "--signatures",
        "--expected-node",
        process.env.JSON_QUALITY_EXPECTED_NODE,
        "--expected-npm",
        release.policy.consumerNpm,
        "--output",
        join(output, `${layout}-result.json`),
      ],
      { phase: `public-${layout}-consumer`, timeout: budgets.suite },
    );
}
