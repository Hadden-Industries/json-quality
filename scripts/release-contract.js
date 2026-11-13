// SPDX-License-Identifier: AGPL-3.0-only
/** Repository-specific identities; npm/GitHub retain native format/crypto ownership.
 * Admission patterns adapted from Hadden-Industries/markdown-quality (AGPL-3.0-only),
 * reference 2aa6843f01edfb2e0bc7f4bbd97fcd749eb6ed0d.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { createReadStream, existsSync } from "node:fs";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { join, posix } from "node:path";
import { npmCli } from "./qualification-process.js";
import {
  DEFAULT_PACKAGE_VERIFICATION_LIMITS as packageCapabilities,
  packageTarSink,
} from "../src/package-payload.js";
import { nativePackages } from "../src/native-packages.js";
import { securityScans } from "./security-scans.js";
import { verifyDistributionInventory } from "./release-distribution.js";
import {
  effectJournal,
  sha256,
  sha512,
  jsonBytes,
  save,
  regularBytes,
  releaseArtifactBytes,
  readJson,
} from "./release-records.js";
export {
  effectJournal,
  sha256,
  sha512,
  jsonBytes,
  save,
  regularBytes,
  releaseArtifactBytes,
  readJson,
};

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
/** The digest-bound owner review selects availability independently of SemVer. */
export function releaseNpmTag(review) {
  const tag = Object.hasOwn(review, "npmTag") ? review.npmTag : "pilot";
  assert.ok(
    ["pilot", "latest"].includes(tag),
    "Unsupported owner-selected npm tag",
  );
  return tag;
}
/** Restoration scope is a separately reviewed decision, never inferred from SemVer. */
export function restorationAvailability(decision, expected) {
  const availability = decision.availability ?? "npm-and-github";
  assert.ok(
    ["npm-and-github", "npm-only"].includes(availability),
    "Unsupported restoration availability scope",
  );
  if (availability === "npm-only") {
    assert.ok(Object.hasOwn(decision, "expectedGithubLatest"));
    assert.equal(decision.expectedGithubLatest, expected?.githubLatest);
    assert.equal(typeof decision.affectedPrerelease, "boolean");
    assert.equal(typeof decision.targetPrerelease, "boolean");
  }
  return availability;
}
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
// Schema admission belongs to read-only jobs; narrow writers import identities only.
let manifestValidator;
/** Original schema-2 archives predate the effective-policy API, independently of Node policy. */
export function isLegacyReleaseManifest(release) {
  return (
    release.schemaVersion === 2 &&
    [
      "schemas/effective-policy.schema.json",
      "assets/default-json-quality-policy.json",
    ].every((path) => !release.archive.files.some((file) => file.path === path))
  );
}

export function verifyManifest(release, { historical = false } = {}) {
  const validate = (manifestValidator ??= new (createRequire(import.meta.url)(
    "ajv/dist/2020.js",
  ))({ allErrors: true, strict: true }).compile(
    readJson(
      new URL("../schemas/release-manifest.schema.json", import.meta.url),
    ),
  ));
  assert.ok(
    validate(release),
    `Invalid release manifest: ${JSON.stringify(validate.errors)}`,
  );
  if (release.schemaVersion >= 3 || release.distribution)
    verifyDistributionInventory(release);
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
  const { policy } = release;
  validateFrozenMatrix(release.matrix, policy);
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
    // Only readers of retained public qualification may use the original shipment contract.
    ...(historical && isLegacyReleaseManifest(release)
      ? []
      : [
          "schemas/effective-policy.schema.json",
          "assets/default-json-quality-policy.json",
        ]),
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
/** New publications carry one original origin per package; legacy records have one origin. */
export function publicationOrigin(publication, subject) {
  if (publication.origins !== undefined) {
    assert.deepEqual(
      Object.keys(publication.origins).sort(),
      releasePackages(publication.release)
        .map((value) => value.package)
        .sort(),
      "Incomplete package publication origins",
    );
    const origin = publication.origins[subject.package];
    assert.ok(origin, "Missing package publication origin");
    assert.equal(origin.integrity, subject.archive.integrity);
    assert.equal(origin.package, subject.package);
    for (const key of ["run", "attempt"])
      assert.match(origin[key], /^[1-9]\d{0,15}$/u);
    assert.match(origin.controller, /^[a-f0-9]{40}$/u);
    return origin;
  }
  assert.ok(publication.origin, "Missing legacy publication origin");
  return publication.origin;
}
export function validateFrozenMatrix(matrix, policy) {
  assert.deepEqual([...matrix.os].sort(), [...policy.platforms].sort());
  assert.equal(new Set(matrix.node).size, matrix.node.length);
  assert.ok(matrix.node.length <= 9 && matrix.node.includes(policy.reference));
  const semver = createRequire(npmCli())("semver");
  assert.ok([1, 2].includes(policy.schemaVersion));
  const minimums =
    policy.schemaVersion === 1 ? policy.minimums : [policy.minimum];
  assert.ok(Array.isArray(minimums) && minimums.length > 0);
  assert.ok(minimums.every((minimum) => semver.valid(minimum) === minimum));
  const floors = new Map(
    minimums.map((minimum) => [semver.major(minimum), minimum]),
  );
  assert.equal(floors.size, minimums.length, "Ambiguous runtime family floor");
  const majors =
    policy.schemaVersion === 1 ? [...floors.keys()] : policy.testedLtsMajors;
  for (const minimum of minimums)
    assert.ok(matrix.node.includes(minimum), "Missing floor lane");
  for (const major of majors)
    assert.ok(
      matrix.node.some((node) => semver.major(node) === major),
      "Missing LTS lane",
    );
  for (const node of matrix.node)
    assert.ok(
      semver.valid(node) === node &&
        majors.includes(semver.major(node)) &&
        semver.gte(
          node,
          policy.schemaVersion === 1
            ? floors.get(semver.major(node))
            : policy.minimum,
        ),
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
      ...securityScans.map(({ key }) => `codeql / Scan ${key}`),
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
  if (phase === "promote") return ["admit", "npm", "github", "complete"];
  return ["admit", phase];
}
export function verifyRun(
  provider,
  phase,
  source,
  matrix,
  {
    reconciled = false,
    historical = false,
    availability = "npm-and-github",
    stagePhase,
  } = {},
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
  const legacyPromotion =
    historical &&
    phase === "promote" &&
    jobs.jobs.some((job) => job.name === "promote");
  let names = legacyPromotion
    ? ["admit", "promote"]
    : expectedJobs(phase, matrix);
  if (historical && phase === "qualification") {
    const scans = jobs.jobs.filter((job) => job.name.startsWith("codeql /"));
    if (scans.length === 0)
      names = names.filter((name) => !name.startsWith("codeql /"));
    else if (scans.length <= 2)
      names = names.filter(
        (name) =>
          !name.startsWith("codeql /") ||
          [
            "codeql / Scan actions",
            "codeql / Scan javascript-typescript",
          ].includes(name),
      );
  }
  if (phase === "stage" && stagePhase) {
    assert.ok(["natives", "core"].includes(stagePhase));
    const nativeNames = jobs.jobs
      .filter(
        (job) =>
          job.name === "native-public" ||
          job.name.startsWith("native-public ("),
      )
      .map((job) => job.name);
    if (stagePhase === "core")
      assert.deepEqual(
        nativeNames.sort(),
        matrix.os.map((os) => `native-public (${os})`).sort(),
      );
    else
      assert.ok(
        (nativeNames.length === 1 && nativeNames[0] === "native-public") ||
          (nativeNames.length === 2 &&
            matrix.os.every((os) =>
              nativeNames.includes(`native-public (${os})`),
            )),
      );
    names = ["admit", "stage", ...nativeNames];
  }
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
    else if (
      phase === "stage" &&
      stagePhase === "natives" &&
      job.name.startsWith("native-public")
    )
      assert.equal(job.conclusion, "skipped");
    else if (
      phase === "promote" &&
      job.name === "github" &&
      availability === "npm-only"
    )
      assert.equal(job.conclusion, "skipped");
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
  if (phase === "review") {
    releaseNpmTag(record);
    assert.equal(record.decisions.security.independent, true);
    if (release.schemaVersion >= 3) {
      assert.ok(
        record.priorAvailability &&
          Object.hasOwn(record.priorAvailability, "githubLatest"),
        "Review requires explicit prior GitHub latest identity or absence",
      );
      assert.deepEqual(
        Object.keys(record.priorAvailability.npmLatest).sort(),
        releasePackages(release)
          .map((subject) => subject.package)
          .sort(),
      );
      for (const value of Object.values(record.priorAvailability.npmLatest))
        assert.ok(value === null || typeof value === "string");
      const github = record.priorAvailability.githubLatest;
      if (github !== null) {
        assert.ok(Number.isSafeInteger(github.id) && github.id > 0);
        assert.match(github.tag_name, /^v\S+$/u);
        assert.equal(typeof github.prerelease, "boolean");
      }
    }
  } else {
    assert.match(record.reviewSha256, /^[a-f0-9]{64}$/u);
    assert.match(String(record.registryRun), /^[1-9]\d{0,15}$/u);
    assert.match(String(record.registryAttempt), /^[1-9]\d{0,15}$/u);
  }
  return record;
}
