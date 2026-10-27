// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { bundleReleaseAssets } from "../scripts/release-assets.js";
import { releasePackages, sha256 } from "../scripts/release-contract.js";
import { native } from "../scripts/qualification-process.js";

test("hundreds of retained proof members produce ten independently verifiable release assets", (t) => {
  const root = mkdtempSync(join(tmpdir(), "json-quality-release-assets-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const input = join(root, "input"),
    scratch = join(root, "scratch");
  mkdirSync(input);
  mkdirSync(scratch);
  const release = {
    package: "@hadden-industries/json-quality",
    version: "1.0.0-rc.2",
    source: { commit: "a".repeat(40) },
    archive: { filename: "core.tgz" },
    platformArchives: ["linux-x64", "win32-x64"].map((platform) => ({
      package: `@hadden-industries/json-quality-${platform}`,
      version: "1.0.0-rc.2",
      archive: { filename: `${platform}.tgz` },
    })),
  };
  const direct = [
    ...releasePackages(release).map((subject) => subject.archive.filename),
    "source.tar.gz",
    "release-manifest.json",
    "release-review.json",
    "release-acceptance.json",
    "THIRD-PARTY-NOTICES.md",
  ];
  for (const name of direct) writeFileSync(join(input, name), name);
  const nested = join(input, "public-lane");
  mkdirSync(nested);
  for (let i = 0; i < 618; i++)
    writeFileSync(join(nested, `proof-${i}.json`), JSON.stringify({ lane: i }));
  writeFileSync(join(input, "evidence-index.json"), "previous admission index");
  const manifestSha = "b".repeat(64);
  const { bundle, assets } = bundleReleaseAssets(
    input,
    release,
    scratch,
    manifestSha,
  );
  assert.equal(assets.length, 10);
  assert.equal(readdirSync(bundle).length, 10);
  const manifest = JSON.parse(
    readFileSync(join(bundle, "release-assets.json")),
  );
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(manifest.manifestSha256, manifestSha);
  assert.equal(manifest.evidence.files.length, 618);
  for (const asset of assets) {
    const bytes = readFileSync(join(bundle, asset.name));
    assert.equal(sha256(bytes), asset.sha256);
    assert.equal(bytes.length, asset.size);
  }
  const extracted = join(root, "extracted");
  mkdirSync(extracted);
  native(process.platform === "win32" ? "python" : "python3", [
    fileURLToPath(new URL("../scripts/extract-artifact.py", import.meta.url)),
    join(bundle, "release-evidence.zip"),
    extracted,
    "1048576",
  ]);
  const index = JSON.parse(
    readFileSync(join(extracted, "evidence-index.json")),
  );
  assert.deepEqual(index.files, manifest.evidence.files);
  assert.equal(index.manifestSha256, manifestSha);
  assert.equal(index.source, release.source.commit);
  assert.deepEqual(readdirSync(extracted).sort(), [
    "evidence-index.json",
    "public-lane",
  ]);
  for (const entry of index.files) {
    const bytes = readFileSync(join(extracted, entry.name));
    assert.deepEqual(bytes, readFileSync(join(input, entry.name)));
    assert.equal(sha256(bytes), entry.sha256);
    assert.equal(bytes.length, entry.size);
  }
  writeFileSync(join(input, "driver.log"), "diagnostic");
  const refused = join(root, "refused");
  mkdirSync(refused);
  assert.throws(
    () => bundleReleaseAssets(input, release, refused, manifestSha),
    /failed/,
  );
});
