// SPDX-License-Identifier: AGPL-3.0-only
/** Adapted exact-source CodeQL admission from Markdown Quality, AGPL-3.0-only. */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readJson,
  regularBytes,
  save,
  sha256,
  verifyManifest,
} from "./release-contract.js";
import { api, pages } from "./release-provider.js";
import { securityScans } from "./security-scans.js";
import { ubuntuRunner } from "./runner-policy.js";

export function verifyCodeql(analyses, source, policy) {
  assert.match(source, /^[a-f0-9]{40}$/u);
  const linux = ubuntuRunner(policy);
  return securityScans.map(({ key, language, os, category }) => {
    const matches = analyses.filter(
      (analysis) =>
        analysis.commit_sha === source &&
        analysis.ref === "refs/heads/main" &&
        analysis.category === category &&
        [
          "security.yml",
          "release-qualification.yml",
          "release-registry.yml",
          "main-qualification.yml",
        ].some(
          (workflow) =>
            analysis.analysis_key === `.github/workflows/${workflow}:codeql`,
        ) &&
        analysis.tool?.name === "CodeQL",
    );
    assert.ok(matches.length, `Missing exact-source CodeQL ${key}`);
    assert.ok(
      matches.every((value) => Number.isSafeInteger(value.id) && value.id > 0),
    );
    const analysis = [...matches].sort((a, b) => b.id - a.id)[0];
    for (const duplicate of matches.filter((value) => value.id === analysis.id))
      assert.deepEqual(
        duplicate,
        analysis,
        "Conflicting CodeQL analysis identity",
      );
    assert.equal(analysis.error, "");
    assert.equal(analysis.warning, "");
    assert.equal(
      analysis.results_count,
      0,
      "Exact-source findings block release",
    );
    assert.ok(
      Number.isSafeInteger(analysis.rules_count) && analysis.rules_count > 0,
    );
    const environment = JSON.parse(analysis.environment);
    assert.equal(environment.language, language);
    assert.equal(environment.os, os.startsWith("ubuntu-") ? linux : os);
    if (language === "c-cpp") {
      assert.equal(environment.key, key);
    }
    return analysis;
  });
}
export function verifySarif(sarif, analysis) {
  assert.equal(sarif.version, "2.1.0");
  assert.equal(sarif.runs.length, 1);
  const run = sarif.runs[0];
  assert.equal(run.automationDetails.id, `${analysis.category}/`);
  assert.equal(run.tool.driver.name, "CodeQL");
  assert.equal(run.tool.driver.semanticVersion, analysis.tool.version);
  assert.equal(analysis.results_count, 0);
  assert.deepEqual(run.results ?? [], []);
  const tools = [run.tool.driver, ...(run.tool.extensions ?? [])],
    rules = tools.flatMap((tool) => tool.rules ?? []);
  assert.equal(rules.length, analysis.rules_count);
  assert.ok(
    run.tool.extensions?.some(
      (tool) => tool.name.endsWith("-queries") && tool.semanticVersion,
    ),
  );
  return {
    analysis: analysis.id,
    sarifSha256: sha256(Buffer.from(JSON.stringify(sarif))),
    rules: rules.map(({ id }) => id),
    queryPacks: tools.map(({ name, semanticVersion }) => ({
      name,
      version: semanticVersion,
    })),
    findings: 0,
  };
}
export function qualifySecurity(
  release,
  manifestBytes,
  { historical = false } = {},
) {
  verifyManifest(release, { historical });
  const analyses = pages(
    "code-scanning/analyses?ref=refs%2Fheads%2Fmain&tool_name=CodeQL&per_page=100",
  );
  const selected = verifyCodeql(
    analyses,
    release.source.commit,
    release.policy,
  );
  return {
    schemaVersion: 2,
    source: release.source.commit,
    manifestSha256: sha256(manifestBytes),
    run: process.env.GITHUB_RUN_ID,
    attempt: process.env.GITHUB_RUN_ATTEMPT,
    checkedAt: new Date().toISOString(),
    analyses: selected,
    scans: selected.map((analysis) =>
      verifySarif(
        api(`code-scanning/analyses/${analysis.id}`, [
          "-H",
          "Accept: application/sarif+json",
        ]),
        analysis,
      ),
    ),
  };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 4);
  const [directory, output] = process.argv.slice(2);
  mkdirSync(output, { recursive: true });
  const bytes = regularBytes(join(directory, "release-manifest.json"));
  save(
    join(output, "security.json"),
    qualifySecurity(readJson(join(directory, "release-manifest.json")), bytes),
  );
}
