// SPDX-License-Identifier: AGPL-3.0-only
/** Refresh advisories for frozen graphs without installing or executing their packages. */
import assert from "node:assert/strict";
import {
  renameSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  existsSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { requireCleanAudit } from "./check-security.js";
import { isolatedNpmEnvironment } from "./release-inventory.js";
import { npmCommand, budgets } from "./qualification-process.js";
import {
  readJson,
  regularBytes,
  save,
  sha256,
  lanes,
} from "./release-contract.js";
import { verifyBuildEvidence } from "./release-promotion-evidence.js";
import { provider, producingAttempt, download } from "./release-provider.js";

/** Exact lock bytes are the audit subject; npm audit fix is never used. */
export function auditFrozenLock(
  lockBytes,
  metadata,
  { run = npmCommand } = {},
) {
  const scratch = mkdtempSync(join(tmpdir(), "json-quality-frozen-audit-"));
  try {
    writeFileSync(join(scratch, "package-lock.json"), lockBytes);
    writeFileSync(join(scratch, "package.json"), JSON.stringify(metadata));
    const raw = run(
      [
        "audit",
        "--package-lock-only",
        "--ignore-scripts",
        "--json",
        "--audit-level=none",
        "--include=dev",
        "--include=optional",
        "--include=peer",
      ],
      {
        cwd: scratch,
        env: isolatedNpmEnvironment(scratch),
        timeout: budgets.collection,
        phase: "frozen-complete-graph-audit",
      },
    );
    assert.deepEqual(
      readFileSync(join(scratch, "package-lock.json")),
      lockBytes,
      "Audit rewrote qualified lock bytes",
    );
    const report = JSON.parse(raw);
    requireCleanAudit(report);
    return report;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/** Every retained recipient graph and the original producer graph get current observations. */
export function qualifyFrozenGraphs(
  directory,
  output,
  { run = npmCommand, recipients = directory } = {},
) {
  const release = readJson(join(directory, "release-manifest.json"));
  if (release.promotion) verifyBuildEvidence(release, directory);
  const locks = [
    ["root", regularBytes(join(directory, "build-package-lock.json"))],
  ];
  assert.equal(sha256(locks[0][1]), release.source.lockSha256);
  for (const lane of lanes(release.matrix))
    for (const layout of ["root", "isolated"]) {
      const target = join(recipients, `candidate-${lane.os}-${lane.node}`);
      const lock = regularBytes(join(target, `${layout}-lock.json`));
      assert.equal(
        readJson(join(target, `${layout}-inventory.json`)).lockSha256,
        sha256(lock),
      );
      locks.push([`${lane.os}-${lane.node}-${layout}`, lock]);
    }
  mkdirSync(output, { recursive: true });
  const results = locks.map(([name, bytes]) => {
    const lock = JSON.parse(bytes);
    const metadata = {
      ...lock.packages[""],
      name: lock.name,
      version: lock.version,
    };
    const report = auditFrozenLock(bytes, metadata, { run });
    save(join(output, `${name}-audit.json`), report);
    return { name, graphLockSha256: sha256(bytes), status: "passed" };
  });
  const policy = {
    schemaVersion: 1,
    observedAt: new Date().toISOString(),
    advisorySource:
      "https://registry.npmjs.org/-/npm/v1/security/advisories/bulk",
    policySha256: sha256(readFileSync(fileURLToPath(import.meta.url))),
    results,
  };
  save(join(output, "audit-policy.json"), policy);
  return policy;
}

/** Collect original fresh-path recipients before refreshing their frozen graphs. */
export function qualifyReleaseAssurance(
  directory,
  output,
  {
    run = npmCommand,
    environment = process.env,
    observe = provider,
    acquire = download,
  } = {},
) {
  const release = readJson(join(directory, "release-manifest.json"));
  const firstLane = lanes(release.matrix)[0];
  if (
    !release.promotion &&
    !existsSync(join(directory, `candidate-${firstLane.os}-${firstLane.node}`))
  ) {
    // Current-run recipient artifacts can originate in older attempts on a rerun.
    const observed = observe(
      environment.GITHUB_RUN_ID,
      environment.GITHUB_RUN_ATTEMPT,
    );
    const cache = new Map();
    assert.equal(
      observed.run.path,
      ".github/workflows/release-qualification.yml",
    );
    // Transport and extracted recipients are inputs, not retained observations.
    // Keep them outside both the admitted bundle and the uploaded output.
    const scratch = mkdtempSync(
      join(tmpdir(), "json-quality-assurance-inputs-"),
    );
    try {
      for (const lane of lanes(release.matrix)) {
        const attempt = producingAttempt(
          observed,
          `product / Qualify ${lane.os} / Node ${lane.node}`,
          observe,
          cache,
        );
        const artifact = acquire(
          environment.GITHUB_RUN_ID,
          attempt,
          `consumer-${lane.os}-${lane.node}-${attempt}`,
          scratch,
        );
        renameSync(
          artifact.directory,
          join(scratch, `candidate-${lane.os}-${lane.node}`),
        );
      }
      return qualifyFrozenGraphs(directory, output, {
        run,
        recipients: scratch,
      });
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }
  return qualifyFrozenGraphs(directory, output, { run });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 4);
  qualifyReleaseAssurance(...process.argv.slice(2));
}
