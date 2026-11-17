// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { writerWorld } from "./release-entry-fixture.mjs";
import { jsonBytes, sha256 } from "../scripts/release-contract.js";
import { promoteManifest } from "../scripts/release-reuse.js";
import {
  captureCiAssurance,
  qualifySecurity,
} from "../scripts/release-security.js";
import { securityScans } from "../scripts/security-scans.js";
import { ubuntuRunner, windowsRunner } from "../scripts/runner-policy.js";

function promotedSecurity(t) {
  const world = writerWorld(t, "stage", { schema3: true });
  const original = structuredClone(world.release);
  const lock = Buffer.from('{"lockfileVersion":3,"packages":{}}\n');
  original.source.lockSha256 = sha256(lock);
  const manifestBytes = jsonBytes(original);
  const analyses = securityScans.map(
    ({ key, language, os, category }, index) => ({
      id: index + 1,
      commit_sha: original.source.commit,
      ref: "refs/pull/17/merge",
      category,
      analysis_key: ".github/workflows/ci.yml:codeql",
      environment: JSON.stringify({
        key,
        language,
        os: os.startsWith("windows-")
          ? windowsRunner(original.policy)
          : ubuntuRunner(original.policy),
      }),
      tool: { name: "CodeQL", version: "2.0.0" },
      created_at: "2026-11-17T00:05:00Z",
      error: "",
      warning: "",
      results_count: 0,
      rules_count: 1,
    }),
  );
  const calls = { lists: 0 };
  const readers = {
    list: () => {
      calls.lists++;
      return analyses;
    },
    sarif: (id) => ({
      version: "2.1.0",
      runs: [
        {
          automationDetails: { id: `${analyses[id - 1].category}/` },
          tool: {
            driver: { name: "CodeQL", semanticVersion: "2.0.0" },
            extensions: [
              {
                name: `${securityScans[id - 1].key}-queries`,
                semanticVersion: "1.0.0",
                rules: [{ id: `rule-${id}` }],
              },
            ],
          },
          results: [],
        },
      ],
    }),
  };
  const receipt = {
    schemaVersion: 3,
    mode: "FULL",
    repository: "Hadden-Industries/json-quality",
    repositoryId: 11,
    runId: 71,
    runAttempt: 2,
    pullRequest: 17,
    matrix: original.matrix,
    snapshot: {
      commit: original.source.commit,
      tree: original.source.tree,
      parents: ["1".repeat(40), "2".repeat(40)],
    },
    executions: securityScans.map(({ key }) => ({
      job: {
        name: `CodeQL / Scan ${key}`,
        started_at: "2026-11-17T00:00:00Z",
        completed_at: "2026-11-17T00:10:00Z",
      },
    })),
    lanes: original.matrix.os.flatMap((os) =>
      original.matrix.node.map((node) => ({
        lane: { os, node },
        releaseEvidence: { manifestSha256: sha256(manifestBytes) },
        consumers: {
          root: {
            archiveSha256: original.archive.sha256,
            packageVersion: original.version,
          },
        },
      })),
    ),
  };
  receipt.assurance = captureCiAssurance(receipt, original.policy, readers);
  const proofBytes = jsonBytes(receipt);
  const promoted = promoteManifest({
    manifestBytes,
    receipt,
    proofBytes,
    releaseSource: "f".repeat(40),
    selection: { run: { id: 71, run_attempt: 2 }, pr: { number: 17 } },
  });
  for (const [name, bytes] of [
    ["release-manifest.json", jsonBytes(promoted)],
    ["build-manifest.json", manifestBytes],
    ["build-qualification.json", proofBytes],
    ["build-package-lock.json", lock],
  ])
    writeFileSync(join(world.directory, name), bytes);
  calls.lists = 0;
  return { world, original, promoted, analyses, readers, calls, proofBytes };
}

test("promoted admission retains its bundle-backed original analysis proof", (t) => {
  const f = promotedSecurity(t);
  const result = qualifySecurity(f.world.directory, {
    historical: true,
    ...f.readers,
  });
  assert.equal(result.source, f.promoted.source.commit);
  assert.equal(result.scans.length, securityScans.length);
  assert.equal(result.original.proofSha256, sha256(f.proofBytes));
  assert.equal(f.calls.lists, 1);
});

test("promoted admission rejects changed retained lock bytes before provider reads", (t) => {
  const f = promotedSecurity(t);
  writeFileSync(
    join(f.world.directory, "build-package-lock.json"),
    "substituted",
  );
  assert.throws(() => qualifySecurity(f.world.directory, f.readers));
  assert.equal(f.calls.lists, 0);
});

test("promoted admission refuses a clean analysis with changed query identity", (t) => {
  const f = promotedSecurity(t);
  assert.throws(
    () =>
      qualifySecurity(f.world.directory, {
        ...f.readers,
        sarif: (id) => {
          const value = f.readers.sarif(id);
          value.runs[0].tool.extensions[0].semanticVersion = "2.0.0";
          return value;
        },
      }),
    /inventory changed/u,
  );
});

test("legacy admission reads its source and exact manifest bytes from the same bundle", (t) => {
  const f = promotedSecurity(t);
  const bytes = jsonBytes(f.original);
  writeFileSync(join(f.world.directory, "release-manifest.json"), bytes);
  const result = qualifySecurity(f.world.directory, {
    historical: true,
    ...f.readers,
    list: () =>
      f.analyses.map((analysis) => ({
        ...analysis,
        ref: "refs/heads/main",
        analysis_key: ".github/workflows/security.yml:codeql",
      })),
  });
  assert.equal(result.source, f.original.source.commit);
  assert.equal(result.manifestSha256, sha256(bytes));
  assert.equal(result.original, undefined);
});
