// SPDX-License-Identifier: AGPL-3.0-only
/** Read-only public-native admission before the separately dispatched core request. */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { nativePlatformSpec } from "../src/native-packages.js";
import { loadNativeComponent } from "../src/native-component.js";
import { normalizeSource } from "../src/native-normalization.js";
import {
  readJson,
  save,
  sha256,
  verifyArchive,
  verifyProvenance,
} from "./release-contract.js";
import { verifyBundle } from "./release-evidence.js";
import { registryBytes, verifyPublicMetadata } from "./qualify-registry.js";
import { isolatedNpmEnvironment } from "./release-inventory.js";
import { npmCommand, native } from "./qualification-process.js";

export async function qualifyNativeStage(directory, output, env = process.env) {
  mkdirSync(output, { recursive: true });
  const release = verifyBundle(directory, env.MANIFEST_SHA),
    context = readJson(join(directory, "context.json"));
  assert.notEqual(
    context.nativeStage.run,
    env.GITHUB_RUN_ID,
    "Core requires a new dispatch after owner native approvals",
  );
  const platform = nativePlatformSpec().platform,
    subject = release.platformArchives.find(
      (value) => value.platform === platform,
    );
  assert.ok(subject);
  const origin = context.packageOrigins[subject.package];
  assert.equal(origin.integrity, subject.archive.integrity);
  const metadata = JSON.parse(
    await registryBytes(
      `https://registry.npmjs.org/${encodeURIComponent(subject.package)}/${encodeURIComponent(subject.version)}`,
      1048576,
    ),
  );
  verifyPublicMetadata(metadata, subject);
  const bytes = await registryBytes(
    metadata.dist.tarball,
    subject.archive.size,
  );
  verifyArchive(bytes, subject.archive);
  const workspace = mkdtempSync(join(tmpdir(), "json-native-stage-"));
  try {
    const isolation = isolatedNpmEnvironment(workspace, {
      ...env,
      GH_TOKEN: "",
      GITHUB_TOKEN: "",
      ACTIONS_ID_TOKEN_REQUEST_URL: "",
      ACTIONS_ID_TOKEN_REQUEST_TOKEN: "",
    });
    save(join(workspace, "package.json"), {
      private: true,
      dependencies: { [subject.package]: subject.version },
    });
    npmCommand(
      [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--registry=https://registry.npmjs.org/",
      ],
      { cwd: workspace, env: isolation },
    );
    const lock = readJson(join(workspace, "package-lock.json"));
    save(join(output, "package-lock.json"), lock);
    assert.equal(
      lock.packages[`node_modules/${subject.package}`]?.integrity,
      subject.archive.integrity,
      "Installed native differs from frozen public bytes",
    );
    const audit = JSON.parse(
      npmCommand(
        [
          "audit",
          "signatures",
          "--json",
          "--include-attestations",
          "--ignore-scripts",
          "--registry=https://registry.npmjs.org/",
        ],
        { cwd: workspace, env: isolation },
      ),
    );
    verifyProvenance(audit, { ...release, ...subject }, origin);
    // The child releases its loaded Windows addon before the disposable install is removed.
    native(
      process.execPath,
      [
        fileURLToPath(import.meta.url),
        "probe",
        join(workspace, "node_modules", subject.package),
        workspace,
      ],
      { phase: "public-native-operation" },
    );
    const record = {
      schemaVersion: 1,
      state: "native-public-qualified",
      package: subject.package,
      platform,
      version: subject.version,
      integrity: subject.archive.integrity,
      origin,
      manifestSha256: env.MANIFEST_SHA,
      reviewSha256: env.REVIEW_SHA,
      controller: env.GITHUB_SHA,
      run: env.GITHUB_RUN_ID,
      attempt: env.GITHUB_RUN_ATTEMPT,
      operation: "NFC literal transformation preserves numeric lexeme",
      signaturesSha256: sha256(Buffer.from(JSON.stringify(audit))),
    };
    save(join(output, "native-public.json"), record);
    save(join(output, "signatures.json"), audit);
    return record;
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

/** Successful installation alone cannot prove the optional native was present or used. */
export function verifyNativeStageProofs(release, context, reports, env) {
  assert.equal(
    reports.length,
    2,
    "Both native platforms must pass before core staging",
  );
  assert.notEqual(
    context.nativeStage.run,
    env.GITHUB_RUN_ID,
    "Core requires a new dispatch",
  );
  for (const subject of release.platformArchives) {
    const found = reports.filter(
      (record) => record.platform === subject.platform,
    );
    assert.equal(found.length, 1, "Missing or duplicate native platform");
    const record = found[0];
    assert.equal(record.state, "native-public-qualified");
    for (const [key, value] of Object.entries({
      package: subject.package,
      version: subject.version,
      integrity: subject.archive.integrity,
      manifestSha256: env.MANIFEST_SHA,
      reviewSha256: env.REVIEW_SHA,
      controller: env.GITHUB_SHA,
      run: env.GITHUB_RUN_ID,
    }))
      assert.equal(record[key], value);
    assert.match(record.attempt, /^[1-9]\d*$/u);
    assert.ok(Number(record.attempt) <= Number(env.GITHUB_RUN_ATTEMPT));
    assert.deepEqual(record.origin, context.packageOrigins[subject.package]);
    assert.equal(record.origin.integrity, subject.archive.integrity);
    assert.ok(record.operation && record.signaturesSha256);
  }
  return reports;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === "probe") {
    assert.equal(process.argv.length, 5);
    const component = await loadNativeComponent(resolve(process.argv[3]));
    assert.equal(
      await normalizeSource(' { "e\\u0301": "e\\u0301", "n": 1e2 } ', {
        component,
        temporaryDirectory: resolve(process.argv[4]),
      }),
      ' { "é": "é", "n": 1e2 } ',
    );
  } else {
    assert.equal(process.argv.length, 4);
    await qualifyNativeStage(
      ...process.argv.slice(2).map((path) => resolve(path)),
    );
  }
}
