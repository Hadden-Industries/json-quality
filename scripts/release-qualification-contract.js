// SPDX-License-Identifier: AGPL-3.0-only
/** Shared read-only qualification contracts for live and retained evidence. */
import assert from "node:assert/strict";
import { join } from "node:path";
import {
  readJson,
  regularBytes,
  sha256,
  isLegacyReleaseManifest,
} from "./release-contract.js";
import {
  validateMinimalCli,
  frozenDefaultPolicyDigest,
} from "./consumer-layouts.js";
import { verifyAudit } from "./release-inventory.js";
import { securityScans } from "./security-scans.js";
import { verifyCodeql } from "./release-security.js";
export function verifyReport(
  report,
  release,
  lane,
  qualification,
  layout,
  { historical = false } = {},
) {
  assert.equal(report.status, "passed");
  assert.equal(report.sourceCommit, release.source.commit);
  assert.equal(report.archiveSha256, release.archive.sha256);
  assert.equal(report.node, lane.node);
  assert.equal(
    report.platform,
    lane.os.startsWith("windows") ? "win32" : "linux",
  );
  assert.equal(report.architecture, "x64");
  assert.equal(report.npm, release.policy.consumerNpm);
  assert.equal(report.nativeToolchain.npm, release.policy.consumerNpm);
  assert.equal(report.qualification, qualification);
  assert.equal(report.layout, layout);
  const legacy = historical && isLegacyReleaseManifest(release);
  assert.equal(report.publicExports, legacy ? 6 : 7);
  assert.equal(report.cliPhysicalFiles, 2);
  assert.equal(report.packageVersion, release.version);
  assert.equal(
    report.installSource,
    qualification === "public registry" ? "registry" : "producer-archive",
  );
  const platform = lane.os.startsWith("windows") ? "win32-x64" : "linux-x64",
    expected = release.platformArchives.find(
      (entry) => entry.platform === platform,
    );
  assert.deepEqual(report.nativePackage, {
    name: expected.package,
    version: release.version,
    integrity: expected.archive.integrity,
  });
  if (legacy)
    assert.equal(
      report.minimalCli,
      undefined,
      "Original recipients did not attest current CLI probes",
    );
  else
    validateMinimalCli(
      report.minimalCli,
      release.version,
      report.installSource,
      frozenDefaultPolicyDigest(release.archive.files),
      {
        name: "@hadden-industries/json-quality",
        version: release.version,
        integrity: release.archive.integrity,
        sha256: release.archive.sha256,
      },
      {
        name: expected.package,
        version: release.version,
        integrity: expected.archive.integrity,
      },
    );
}

export function verifyLane(
  directory,
  release,
  lane,
  qualification,
  { read = readJson, bytes = regularBytes, historical = false } = {},
) {
  for (const layout of ["root", "isolated"]) {
    verifyReport(
      read(join(directory, `${layout}-result.json`)),
      release,
      lane,
      qualification,
      layout,
      { historical },
    );
    verifyAudit(read(join(directory, `${layout}-audit.json`)));
    const inventory = read(join(directory, `${layout}-inventory.json`));
    assert.equal(inventory.layout, layout);
    assert.equal(inventory.node, lane.node);
    assert.equal(
      inventory.lockSha256,
      sha256(bytes(join(directory, `${layout}-lock.json`))),
    );
    assert.ok(read(join(directory, `${layout}-locations.json`)).length > 0);
    assert.equal(
      read(join(directory, `${layout}.cdx.json`)).bomFormat,
      "CycloneDX",
    );
    if (
      qualification === "public registry" &&
      lane.node === release.policy.reference
    ) {
      assert.equal(inventory.signatures, true);
      const signatures = read(join(directory, `${layout}-signatures.json`));
      assert.ok(
        !signatures.error &&
          (!signatures.invalid || signatures.invalid.length === 0),
      );
    }
  }
}
export function verifySecurity(
  record,
  release,
  manifestSha,
  run,
  attempt,
  { historical = false } = {},
) {
  assert.equal(record.source, release.source.commit);
  assert.equal(record.manifestSha256, manifestSha);
  assert.equal(record.run, String(run));
  assert.equal(record.attempt, String(attempt));
  const legacy =
    historical &&
    isLegacyReleaseManifest(release) &&
    record.schemaVersion === 1;
  assert.equal(
    record.schemaVersion,
    legacy ? 1 : 2,
    "Obsolete security contract",
  );
  const scans = legacy ? securityScans.slice(0, 2) : securityScans;
  assert.equal(record.scans.length, scans.length);
  assert.deepEqual(
    record.analyses.map((a) => a.category).sort(),
    scans.map(({ category }) => category).sort(),
  );
  if (legacy) {
    // Preserve the original two-language scope; fresh qualification still requires every scan.
    for (const analysis of record.analyses) {
      assert.equal(analysis.commit_sha, release.source.commit);
      assert.equal(analysis.ref, "refs/heads/main");
      assert.ok(
        [
          "dynamic/github-code-scanning/codeql:analyze",
          ".github/workflows/security.yml:codeql",
          ".github/workflows/release-qualification.yml:codeql",
          ".github/workflows/release-registry.yml:codeql",
        ].includes(analysis.analysis_key),
      );
      assert.equal(analysis.tool?.name, "CodeQL");
      assert.ok(Number.isSafeInteger(analysis.id) && analysis.id > 0);
      assert.equal(analysis.error, "");
      assert.equal(analysis.warning, "");
      assert.equal(analysis.results_count, 0);
      assert.ok(
        Number.isSafeInteger(analysis.rules_count) && analysis.rules_count > 0,
      );
      assert.equal(
        JSON.parse(analysis.environment).language,
        analysis.category.slice("/language:".length),
      );
    }
  } else
    assert.deepEqual(
      verifyCodeql(record.analyses, release.source.commit, release.policy),
      record.analyses,
    );
  assert.deepEqual(
    record.scans.map(({ analysis }) => analysis).sort((a, b) => a - b),
    record.analyses.map(({ id }) => id).sort((a, b) => a - b),
  );
  assert.ok(
    record.scans.every(
      (scan) =>
        scan.findings === 0 && scan.rules.length && scan.queryPacks.length,
    ),
  );
}
