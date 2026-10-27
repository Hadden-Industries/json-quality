// SPDX-License-Identifier: AGPL-3.0-only
/** Repository-specific identities; npm/GitHub retain native format/crypto ownership.
 * Admission patterns adapted from Hadden-Industries/markdown-quality (AGPL-3.0-only),
 * reference 2aa6843f01edfb2e0bc7f4bbd97fcd749eb6ed0d.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import {
  createReadStream,
  existsSync,
  lstatSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { join, posix } from "node:path";
import Ajv from "ajv/dist/2020.js";
import { npmCli } from "./qualification-process.js";
import {
  PACKAGE_VERIFICATION_CAPABILITIES as packageCapabilities,
  packageTarSink,
} from "../src/package-payload.js";
import { nativePackages } from "../src/native-packages.js";

export const repository = "Hadden-Industries/json-quality";
export const packageName = "@hadden-industries/json-quality";
// Three bounded package archives plus retained qualification evidence in one ZIP.
export const releaseTransportMaximumBytes =
  packageCapabilities.maximumExpandedBytes;
const linuxNativeExecutable = "json-quality-native";

/** The Linux package must also be directly runnable by a non-Node host. */
export function assertNativeExecutableModes(files) {
  const executable = files.find(({ path }) => path === linuxNativeExecutable);
  if (
    !executable ||
    !Number.isSafeInteger(executable.mode) ||
    (executable.mode & 0o111) === 0
  )
    throw new Error("The Linux package lost its native executable mode.");
}
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
/** Binary release artifacts share package transport bounds; metadata keeps its own bound. */
export function releaseArtifactBytes(path) {
  return regularBytes(
    path,
    /\.(?:tgz|tar\.gz)$/u.test(String(path))
      ? packageCapabilities.maximumArchiveBytes
      : 20000000,
  );
}
export const readJson = (path) => JSON.parse(regularBytes(path));
/** npm 12 wraps view results in an array; admit exactly one selected object. */
export function npmViewObject(raw) {
  const result = JSON.parse(raw);
  if (Array.isArray(result))
    assert.equal(result.length, 1, "Expected exactly one npm view result");
  const value = Array.isArray(result) ? result[0] : result;
  assert.ok(
    value && typeof value === "object" && !Array.isArray(value),
    "Expected an npm view object",
  );
  return value;
}
export function retainedRecoveries(directory) {
  const path = join(directory, "recovery-records.json");
  const records = existsSync(path) ? readJson(path) : [];
  assert.ok(Array.isArray(records) && records.length <= 100);
  for (const phase of ["stage", "archive", "promote"]) {
    const legacy = join(directory, `recovery-${phase}.json`);
    if (existsSync(legacy)) records.push(readJson(legacy));
  }
  const unique = new Map();
  for (const record of records) {
    const key = effectJournal(record.phase, record);
    if (unique.has(key))
      assert.equal(
        sha256(jsonBytes(unique.get(key))),
        sha256(jsonBytes(record)),
        "Conflicting retained recovery",
      );
    unique.set(key, record);
  }
  return [...unique.values()];
}
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
      // eslint-disable-next-line no-control-regex -- Reject archive path controls.
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
  assert.deepEqual(
    release.platformArchives.map((entry) => entry.platform).sort(),
    Object.keys(nativePackages).sort(),
    "Missing, duplicate or unexpected platform archive",
  );
  for (const entry of release.platformArchives) {
    const spec = nativePackages[entry.platform];
    assert.equal(entry.package, spec.package);
    assert.equal(entry.version, release.version);
    for (const required of [
      "package.json",
      "LICENSE",
      "component.json",
      "json-quality.node",
      spec.executable,
    ])
      assert.ok(
        entry.archive.files.some((file) => file.path === required),
        `Missing native shipment ${required}`,
      );
  }
  assert.equal(
    new Set(releasePackages(release).map((entry) => entry.archive.filename))
      .size,
    3,
    "Colliding package archive names",
  );
  for (const { archive } of releasePackages(release)) {
    const paths = archive.files.map(({ path }) => safeMember(path));
    assert.equal(
      new Set(paths.map((path) => path.toLowerCase())).size,
      paths.length,
      "Colliding archive members",
    );
    assert.ok(
      archive.size <= packageCapabilities.maximumArchiveBytes,
      "Release archive exceeds package transport capability",
    );
    let expandedBytes = 0n;
    for (const member of archive.files) {
      assert.ok(
        Number.isSafeInteger(member.size) &&
          member.size <= packageCapabilities.maximumMemberBytes,
        "Release member exceeds package transport capability",
      );
      expandedBytes += BigInt(member.size);
    }
    assert.ok(
      expandedBytes <= BigInt(packageCapabilities.maximumExpandedBytes),
      "Release expanded bytes exceed package transport capability",
    );
  }
  const { matrix, policy } = release;
  assert.deepEqual([...matrix.os].sort(), [...policy.platforms].sort());
  assert.ok(matrix.node.includes(policy.reference));
  assert.ok(matrix.node.includes(policy.minimum), "Missing floor lane");
  for (const major of policy.testedLtsMajors)
    assert.ok(
      matrix.node.some((node) => Number(node.split(".")[0]) === major),
      "Missing LTS lane",
    );
  const semver = createRequire(npmCli())("semver");
  for (const node of matrix.node)
    assert.ok(
      semver.gte(node, policy.minimum) &&
        policy.testedLtsMajors.includes(semver.major(node)),
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
    "schemas/event.schema.json",
    "schemas/source-contract.schema.json",
    "schemas/contract-cohort.json",
  ])
    assert.ok(paths.includes(path), `Missing shipment ${path}`);
  assert.ok(
    paths.every(
      (path) => !/^(?:node_modules|tests|scripts|\.git)\//u.test(path),
    ),
  );
  return release;
}
/** One frozen publication family; stage platform packages before its core. */
export function releasePackages(release) {
  return [
    ...release.platformArchives,
    {
      package: release.package,
      version: release.version,
      archive: release.archive,
    },
  ];
}
export function validateFrozenMatrix(matrix, policy) {
  assert.deepEqual([...matrix.os].sort(), [...policy.platforms].sort());
  assert.equal(new Set(matrix.node).size, matrix.node.length);
  assert.ok(matrix.node.length <= 9 && matrix.node.includes(policy.reference));
  const semver = createRequire(npmCli())("semver");
  assert.ok(matrix.node.includes(policy.minimum));
  for (const major of policy.testedLtsMajors)
    assert.ok(
      matrix.node.some((node) => semver.major(node) === major),
      "Missing LTS lane",
    );
  for (const node of matrix.node)
    assert.ok(
      semver.valid(node) === node &&
        semver.gte(node, policy.minimum) &&
        policy.testedLtsMajors.includes(semver.major(node)),
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
/** Native tar inventory shares acquisition's bounded decompressor transport.
 * Hash binary bodies incrementally; retain only finite JSON/Markdown controls
 * needed by release identity and shipped-link checks. Never extract entries.
 */
export async function archiveInventory(path, npm = npmCli()) {
  const tar = createRequire(npm)("tar");
  const files = [],
    contents = new Map();
  let total = 0,
    retained = 0,
    indexBytes = 0,
    archiveBytes = 0;
  const parser = new tar.Parser({
    strict: true,
    maxMetaEntrySize: packageCapabilities.maximumArchiveMetadataBytes,
    maxDecompressionRatio: 128,
  });
  const sink = packageTarSink(parser);
  parser.on("ignoredEntry", () =>
    sink.destroy(new Error("Unsupported or oversized package archive member.")),
  );
  parser.on("entry", (entry) => {
    try {
      assert.equal(entry.type, "File", "Linked or non-file archive member");
      assert.ok(entry.path.startsWith("package/"));
      const name = safeMember(entry.path.slice(8));
      if (name === linuxNativeExecutable)
        assertNativeExecutableModes([{ path: name, mode: entry.mode }]);
      assert.ok(
        !contents.has(name.toLowerCase()) &&
          contents.size < packageCapabilities.maximumMembers,
        "Duplicate or excess archive entry",
      );
      assert.ok(Number.isSafeInteger(entry.size) && entry.size >= 0);
      total += entry.size;
      indexBytes += Buffer.byteLength(name) * 4 + 384;
      assert.ok(
        entry.size <= packageCapabilities.maximumMemberBytes &&
          total <= packageCapabilities.maximumExpandedBytes &&
          indexBytes <= packageCapabilities.maximumIndexBytes &&
          Buffer.byteLength(name) <= packageCapabilities.maximumPathBytes &&
          name.split("/").length <= packageCapabilities.maximumDepth,
        "Expanded archive exceeds bound",
      );
      const retain = /\.(?:json|md)$/iu.test(name);
      if (retain) {
        retained += entry.size;
        assert.ok(
          entry.size <= 4000000 && retained <= 32000000,
          "Retained release controls exceed bound",
        );
      }
      contents.set(name.toLowerCase(), null);
      const chunks = [],
        hash = createHash("sha256");
      let length = 0;
      entry.on("error", (error) => sink.destroy(error));
      entry.on("data", (chunk) => {
        length += chunk.length;
        if (length > entry.size) {
          sink.destroy(new Error("Package member exceeds declared size."));
          return;
        }
        hash.update(chunk);
        if (retain) chunks.push(chunk);
      });
      entry.on("end", () => {
        if (length !== entry.size) {
          sink.destroy(new Error("Package member differs from declared size."));
          return;
        }
        files.push({ path: name, size: length, sha256: hash.digest("hex") });
        if (retain) contents.set(name.toLowerCase(), Buffer.concat(chunks));
      });
    } catch (error) {
      sink.destroy(error);
    }
  });
  await pipeline(
    createReadStream(path, { highWaterMark: 65536 }),
    new Transform({
      transform(chunk, encoding, done) {
        archiveBytes += chunk.length;
        done(
          archiveBytes > packageCapabilities.maximumArchiveBytes
            ? new Error("Compressed package archive exceeds bound.")
            : null,
          chunk,
        );
      },
    }),
    sink,
    {
      signal: AbortSignal.timeout(
        packageCapabilities.maximumVerificationTimeMs,
      ),
    },
  );
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
      "codeql / Scan actions",
      "codeql / Scan javascript-typescript",
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
