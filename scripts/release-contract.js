// SPDX-License-Identifier: AGPL-3.0-only
/** Repository-specific identities; npm/GitHub retain native format/crypto ownership.
 * Admission patterns adapted from Hadden-Industries/markdown-quality (AGPL-3.0-only),
 * reference 2aa6843f01edfb2e0bc7f4bbd97fcd749eb6ed0d.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { lstatSync, readFileSync, writeFileSync } from "node:fs";
import { posix } from "node:path";
import Ajv from "ajv/dist/2020.js";
import { npmCli } from "./qualification-process.js";

export const repository = "Hadden-Industries/json-quality";
export const packageName = "@hadden-industries/json-quality";
export function effectJournal(phase, origin) {
  assert.ok(["stage", "archive", "promote"].includes(phase));
  for (const value of [origin.run, origin.attempt])
    assert.match(String(value), /^[1-9]\d{0,15}$/u);
  return `${phase}-${origin.run}-${origin.attempt}.jsonl`;
}
export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export const sha512 = (bytes) =>
  "sha512-" + createHash("sha512").update(bytes).digest("base64");
export const jsonBytes = (value) =>
  Buffer.from(JSON.stringify(value, null, 2) + "\n");
export function save(path, value) {
  writeFileSync(path, Buffer.isBuffer(value) ? value : jsonBytes(value), {
    flag: "wx",
    flush: true,
  });
}
export function regularBytes(path, limit = 20000000) {
  const stat = lstatSync(path);
  assert.ok(
    stat.isFile() && !stat.isSymbolicLink() && stat.size <= limit,
    "Unsafe or oversized evidence file",
  );
  return readFileSync(path);
}
export const readJson = (path) => JSON.parse(regularBytes(path));
export function validVersion(version) {
  assert.ok(typeof version === "string" && version.length <= 256);
  const parsed = createRequire(npmCli())("semver").parse(version);
  assert.ok(parsed, "Exact native npm SemVer required");
  assert.equal(
    parsed.build.length,
    0,
    "npm publishing normalizes build metadata",
  );
  const canonical = `${parsed.major}.${parsed.minor}.${parsed.patch}${parsed.prerelease.length ? "-" + parsed.prerelease.join(".") : ""}${parsed.build.length ? "+" + parsed.build.join(".") : ""}`;
  assert.equal(canonical, version, "Exact native npm SemVer required");
  return version;
}
export const isPrerelease = (version) =>
  createRequire(npmCli())("semver").prerelease(validVersion(version)) !== null;
export function safeMember(path) {
  assert.ok(
    typeof path === "string" &&
      path.length <= 512 &&
      !/[\\:\x00-\x1f]/u.test(path) &&
      !path.startsWith("/") &&
      path.split("/").every((part) => part && part !== "." && part !== ".."),
    "Unsafe archive member",
  );
  return path;
}
const validate = new Ajv({ allErrors: true, strict: true }).compile(
  readJson(new URL("../schemas/release-manifest.schema.json", import.meta.url)),
);
export function verifyManifest(release) {
  assert.ok(
    validate(release),
    `Invalid release manifest: ${JSON.stringify(validate.errors)}`,
  );
  validVersion(release.version);
  const { matrix, policy } = release;
  assert.deepEqual([...matrix.os].sort(), [...policy.platforms].sort());
  assert.ok(matrix.node.includes(policy.reference));
  for (const version of policy.minimums)
    assert.ok(matrix.node.includes(version), "Missing floor lane");
  const semver = createRequire(npmCli())("semver");
  for (const node of matrix.node)
    assert.ok(
      policy.minimums.some((floor) => semver.satisfies(node, `^${floor}`)),
    );
  assert.equal(release.toolchain.node, policy.reference);
  assert.equal(release.toolchain.npm, policy.producerNpm.version);
  const paths = release.archive.files.map(({ path }) => safeMember(path));
  assert.equal(
    new Set(paths.map((path) => path.toLowerCase())).size,
    paths.length,
    "Colliding archive members",
  );
  for (const path of [
    "package.json",
    "LICENSE",
    "THIRD-PARTY-NOTICES.md",
    "README.md",
    "src/index.js",
    "src/cli.js",
    "schemas/configuration.schema.json",
    "schemas/result.schema.json",
  ])
    assert.ok(paths.includes(path), `Missing shipment ${path}`);
  assert.ok(
    paths.every(
      (path) => !/^(?:node_modules|tests|scripts|\.git)\//u.test(path),
    ),
  );
  return release;
}
export function validateFrozenMatrix(matrix, policy) {
  assert.deepEqual([...matrix.os].sort(), [...policy.platforms].sort());
  assert.equal(new Set(matrix.node).size, matrix.node.length);
  assert.ok(matrix.node.length <= 9 && matrix.node.includes(policy.reference));
  const semver = createRequire(npmCli())("semver");
  for (const minimum of policy.minimums)
    assert.ok(matrix.node.includes(minimum));
  for (const node of matrix.node)
    assert.ok(
      semver.valid(node) === node &&
        policy.minimums.some((floor) => semver.satisfies(node, `^${floor}`)),
    );
  return matrix;
}
export function verifyArchive(bytes, archive) {
  assert.equal(bytes.length, archive.size);
  assert.equal(sha256(bytes), archive.sha256, "Tarball SHA256 differs");
  assert.equal(
    sha512(bytes),
    archive.integrity,
    "Tarball npm integrity differs",
  );
}
/** Interpret only a successful native cryptographic audit; never verify DSSE ourselves. */
export function verifyProvenance(audit, release, origin) {
  assert.deepEqual(audit.invalid, []);
  assert.deepEqual(audit.missing, []);
  const matching = audit.verified.filter(
    (record) =>
      record.name === release.package && record.version === release.version,
  );
  assert.equal(
    matching.length,
    1,
    "Missing or duplicate native verified provenance",
  );
  const record = matching[0];
  assert.equal(record.registry, "https://registry.npmjs.org/");
  const bundles = record.attestationBundles.filter(
    (entry) => entry.predicateType === "https://slsa.dev/provenance/v1",
  );
  assert.equal(bundles.length, 1);
  const statement = JSON.parse(
    Buffer.from(bundles[0].bundle.dsseEnvelope.payload, "base64"),
  );
  assert.equal(statement._type, "https://in-toto.io/Statement/v1");
  assert.equal(statement.predicateType, "https://slsa.dev/provenance/v1");
  const definition = statement.predicate.buildDefinition;
  assert.equal(
    definition.buildType,
    "https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1",
  );
  assert.deepEqual(definition.externalParameters.workflow, {
    ref: "refs/heads/main",
    repository: `https://github.com/${repository}`,
    path: ".github/workflows/stage-release.yml",
  });
  assert.deepEqual(definition.resolvedDependencies, [
    {
      uri: `git+https://github.com/${repository}@refs/heads/main`,
      digest: { gitCommit: origin.controller },
    },
  ]);
  assert.equal(
    definition.internalParameters.github.event_name,
    "workflow_dispatch",
  );
  assert.equal(
    statement.predicate.runDetails.builder.id,
    "https://github.com/actions/runner/github-hosted",
  );
  assert.equal(
    statement.predicate.runDetails.metadata.invocationId,
    `https://github.com/${repository}/actions/runs/${origin.run}/attempts/${origin.attempt}`,
  );
  return {
    package: release.package,
    version: release.version,
    source: release.source.commit,
    publisher: origin,
    verifier: "npm audit signatures --include-attestations",
  };
}
/** Native tar reader, bounded before buffering; never extract untrusted entries. */
export async function archiveInventory(path, npm = npmCli()) {
  const tar = createRequire(npm)("tar");
  const files = [],
    contents = new Map();
  let total = 0;
  await tar.t({
    file: path,
    strict: true,
    onReadEntry(entry) {
      assert.equal(entry.type, "File", "Linked or non-file archive member");
      assert.ok(entry.path.startsWith("package/"));
      const name = safeMember(entry.path.slice(8));
      assert.ok(
        !contents.has(name.toLowerCase()) && files.length < 4096,
        "Duplicate or excess archive entry",
      );
      total += entry.size;
      assert.ok(
        entry.size <= 4000000 && total <= 32000000,
        "Expanded archive exceeds bound",
      );
      contents.set(name.toLowerCase(), null);
      const chunks = [];
      entry.on("data", (chunk) => chunks.push(chunk));
      entry.on("end", () => {
        const bytes = Buffer.concat(chunks);
        assert.equal(bytes.length, entry.size);
        files.push({ path: name, size: bytes.length, sha256: sha256(bytes) });
        contents.set(name.toLowerCase(), bytes);
      });
    },
  });
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  assert.ok(files.length);
  return { files, contents };
}
/** Installed documentation can only link to shipped files or explicit remote URLs. */
export function verifyShippedLinks(files, contents) {
  const members = new Set(files.map(({ path }) => path));
  for (const { path } of files.filter(({ path }) => path.endsWith(".md"))) {
    const source = contents.get(path.toLowerCase()).toString("utf8");
    const links = [
      ...source.matchAll(
        /\]\((?:<([^>]+)>|([^\s)]+))(?:\s+[^)]*)?\)|^\[[^\]]+\]:\s*(\S+)/gmu,
      ),
    ].map((m) => m[1] || m[2] || m[3]);
    for (const link of links) {
      if (/^(?:[a-z][a-z0-9+.-]*:|#)/iu.test(link)) continue;
      const target = decodeURIComponent(link.split("#")[0]);
      assert.ok(
        !target.startsWith("/"),
        `Repository-only link ${path}: ${link}`,
      );
      const resolved = posix.normalize(posix.join(posix.dirname(path), target));
      assert.ok(
        members.has(resolved) || members.has(posix.join(resolved, "README.md")),
        `Unshipped link ${path}: ${link}`,
      );
    }
  }
}
export const lanes = (matrix) =>
  matrix.os.flatMap((os) => matrix.node.map((node) => ({ os, node })));
export const workflows = Object.freeze({
  qualification: "release-qualification.yml",
  stage: "stage-release.yml",
  registry: "release-registry.yml",
  archive: "github-release.yml",
  promote: "promote-release.yml",
});
export function expectedJobs(phase, matrix) {
  if (phase === "qualification")
    return [
      "resolve",
      "product / Reference producer",
      ...lanes(matrix).map(
        ({ os, node }) => `product / Qualify ${os} / Node ${node}`,
      ),
      "product / Complete runtime qualification",
      "security",
      "qualified",
    ];
  if (phase === "registry")
    return [
      "admit",
      ...lanes(matrix).map(({ os, node }) => `registry (${os}, ${node})`),
      "security",
      "qualified",
    ];
  return ["admit", phase];
}
export function verifyRun(
  provider,
  phase,
  source,
  matrix,
  { reconciled = false } = {},
) {
  const { run, jobs } = provider;
  assert.equal(run.repository.full_name, repository);
  assert.equal(run.path, `.github/workflows/${workflows[phase]}`);
  assert.equal(run.event, "workflow_dispatch");
  assert.equal(run.head_branch, "main");
  assert.equal(run.head_sha, source);
  assert.equal(run.status, "completed");
  if (reconciled)
    assert.ok(
      ["stage", "archive"].includes(phase) &&
        ["success", "failure", "cancelled", "timed_out"].includes(
          run.conclusion,
        ),
    );
  else assert.equal(run.conclusion, "success");
  const names = expectedJobs(phase, matrix);
  assert.equal(jobs.total_count, names.length, "Incomplete provider jobs");
  assert.equal(jobs.jobs.length, names.length, "Truncated provider jobs");
  assert.deepEqual(jobs.jobs.map(({ name }) => name).sort(), names.sort());
  for (const job of jobs.jobs) {
    assert.equal(job.status, "completed");
    if (reconciled && job.name === phase)
      assert.ok(
        ["success", "failure", "cancelled", "timed_out"].includes(
          job.conclusion,
        ),
      );
    else assert.equal(job.conclusion, "success", job.name);
    assert.equal(job.head_sha, run.head_sha);
    assert.equal(job.run_id, run.id);
    assert.equal(job.run_attempt, run.run_attempt);
  }
  return provider;
}
export function manualControl(env, phase) {
  assert.equal(env.GITHUB_REPOSITORY, repository);
  assert.equal(env.GITHUB_EVENT_NAME, "workflow_dispatch");
  assert.equal(env.GITHUB_REF, "refs/heads/main");
  assert.equal(
    env.GITHUB_ACTOR?.toLowerCase(),
    "maksymshostak",
    "Owner dispatch required",
  );
  if (env.GITHUB_TRIGGERING_ACTOR)
    assert.equal(env.GITHUB_TRIGGERING_ACTOR.toLowerCase(), "maksymshostak");
  assert.equal(
    env.GITHUB_WORKFLOW_REF,
    `${repository}/.github/workflows/${workflows[phase]}@refs/heads/main`,
  );
  assert.match(env.GITHUB_SHA, /^[a-f0-9]{40}$/u);
  for (const key of ["GITHUB_RUN_ID", "GITHUB_RUN_ATTEMPT"])
    assert.match(env[key], /^[1-9]\d{0,15}$/u);
}
export function verifyDecision(bytes, digest, release, manifestSha, phase) {
  assert.match(digest, /^[a-f0-9]{64}$/u);
  assert.equal(sha256(bytes), digest);
  const record = JSON.parse(bytes);
  assert.equal(record.schemaVersion, 1);
  assert.equal(record.phase, phase);
  assert.equal(record.owner, "maksymshostak");
  assert.equal(record.source, release.source.commit);
  assert.equal(record.version, release.version);
  assert.equal(record.manifestSha256, manifestSha);
  assert.ok(Number.isFinite(Date.parse(record.acceptedAt)));
  const names =
    phase === "review"
      ? ["semver", "security", "rights", "retention"]
      : ["consumer", "pilot", "restoration"];
  assert.ok(["review", "pilot", "restoration"].includes(phase));
  assert.deepEqual(Object.keys(record.decisions).sort(), names.sort());
  for (const name of names) {
    const decision = record.decisions[name];
    assert.equal(decision.outcome, "accepted");
    assert.ok(decision.rationale?.trim().length >= 20);
    assert.ok(decision.reviewer?.trim());
    assert.ok(decision.evidence?.length);
    for (const evidence of decision.evidence) {
      assert.match(evidence.sha256, /^[a-f0-9]{64}$/u);
      const url = new URL(evidence.url);
      assert.equal(url.protocol, "https:");
      assert.ok(!url.username && !url.password);
    }
  }
  if (phase === "review")
    assert.equal(record.decisions.security.independent, true);
  else {
    assert.match(record.reviewSha256, /^[a-f0-9]{64}$/u);
    assert.match(String(record.registryRun), /^[1-9]\d{0,15}$/u);
    assert.match(String(record.registryAttempt), /^[1-9]\d{0,15}$/u);
  }
  return record;
}
