// SPDX-License-Identifier: AGPL-3.0-only
/** Shared read-only qualification contracts for live and retained evidence. */
import assert from "node:assert/strict";
import { join } from "node:path";
import { readJson, regularBytes, sha256 } from "./release-contract.js";
import {
  validateMinimalCli,
  frozenDefaultPolicyDigest,
} from "./consumer-layouts.js";
import { verifyAudit } from "./release-inventory.js";
import { securityScans } from "./security-scans.js";
import { verifyCodeql } from "./release-security.js";
export function verifyReport(report, release, lane, qualification, layout) {
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
  assert.equal(report.publicExports, 7);
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
  { read = readJson, bytes = regularBytes } = {},
) {
  for (const layout of ["root", "isolated"]) {
    verifyReport(
      read(join(directory, `${layout}-result.json`)),
      release,
      lane,
      qualification,
      layout,
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
export function verifySecurity(record, release, manifestSha, run, attempt) {
  assert.equal(record.source, release.source.commit);
  assert.equal(record.manifestSha256, manifestSha);
  assert.equal(record.run, String(run));
  assert.equal(record.attempt, String(attempt));
  assert.equal(record.schemaVersion, 2, "Obsolete security contract");
  assert.equal(record.scans.length, securityScans.length);
  assert.deepEqual(
    record.analyses.map((a) => a.category).sort(),
    securityScans.map(({ category }) => category).sort(),
  );
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
