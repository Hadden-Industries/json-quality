// SPDX-License-Identifier: AGPL-3.0-only
/** Signed history retains public qualification independently of writer settlements. */
import assert from "node:assert/strict";
import { mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  readJson,
  regularBytes,
  save,
  sha256,
  verifyManifest,
  verifyRun,
  lanes,
} from "./release-contract.js";
import { verifyQualifiedTarget } from "./qualified-release-contract.js";
import { verifyLane, verifySecurity } from "./release-evidence.js";
import {
  api,
  provider,
  producingAttempt,
  download,
  signedTag,
  gh,
  readHistoryRecord,
  readHistoryTarget,
} from "./release-provider.js";

/** Refresh native identities and compare original provider bytes with archived public evidence. */
export function collectQualifiedTarget(
  directory,
  scratch,
  { checkpoint } = {},
) {
  try {
    return collectOriginalQualifiedTarget(directory, scratch);
  } catch (error) {
    if (
      !checkpoint ||
      !(
        error.httpStatus === 404 ||
        /^(?:Expired native artifact|Missing or ambiguous native artifact)$/u.test(
          error.message,
        )
      )
    )
      throw error;
    const release = verifyManifest(
        readJson(join(directory, "release-manifest.json")),
        { historical: true },
      ),
      live = api(`releases/tags/v${release.version}`);
    assert.equal(live.immutable, true);
    assert.equal(live.draft, false);
    signedTag(release);
    gh([
      "release",
      "verify",
      `v${release.version}`,
      "--repo",
      "Hadden-Industries/json-quality",
      "--format",
      "json",
    ]);
    const manifestSha256 = sha256(
      regularBytes(join(directory, "release-manifest.json")),
    );
    const history = readHistoryRecord(checkpoint),
      record = readHistoryTarget(history, {
        version: release.version,
        manifestSha256,
        releaseId: live.id,
      });
    const checked = verifyQualifiedTarget(record, {
      version: release.version,
      manifestSha256,
      releaseId: live.id,
    });
    const assets = (values) =>
      values
        .map(({ name, digest, size }) => ({ name, digest, size }))
        .sort((a, b) => a.name.localeCompare(b.name));
    assert.deepEqual(assets(record.release.assets), assets(live.assets));
    for (const [name, bytes] of checked.files)
      if (name.startsWith("public-"))
        assert.deepEqual(regularBytes(join(directory, name)), bytes);
    return { record, signatureDueBy: null };
  }
}
function collectOriginalQualifiedTarget(directory, scratch) {
  const release = verifyManifest(
      readJson(join(directory, "release-manifest.json")),
      { historical: true },
    ),
    context = readJson(join(directory, "context.json"));
  const liveRelease = api(`releases/tags/v${release.version}`),
    tag = signedTag(release);
  assert.equal(liveRelease.immutable, true);
  assert.equal(liveRelease.draft, false);
  gh([
    "release",
    "verify",
    `v${release.version}`,
    "--repo",
    "Hadden-Industries/json-quality",
    "--format",
    "json",
  ]);
  gh([
    "release",
    "verify-asset",
    `v${release.version}`,
    join(directory, "release-manifest.json"),
    "--repo",
    "Hadden-Industries/json-quality",
    "--format",
    "json",
  ]);
  const observed = provider(context.registry.run, context.registry.attempt);
  verifyRun(observed, "registry", context.registry.controller, release.matrix);
  const artifacts = [];
  for (const lane of lanes(release.matrix)) {
    const original = producingAttempt(
      observed,
      `registry (${lane.os}, ${lane.node})`,
    );
    const acquired = download(
      context.registry.run,
      original,
      `registry-${lane.os}-${lane.node}-${original}`,
      scratch,
    );
    verifyLane(acquired.directory, release, lane, "public registry", {
      historical: true,
    });
    const archived = join(directory, `public-${lane.os}-${lane.node}`);
    for (const name of readdirSync(archived).filter((name) =>
      name.endsWith(".json"),
    ))
      assert.deepEqual(
        regularBytes(join(archived, name)),
        regularBytes(join(acquired.directory, name)),
        "Archived public evidence differs from original provider artifact",
      );
    artifacts.push(acquired.identity);
  }
  const securityAttempt = producingAttempt(observed, "security");
  const security = download(
    context.registry.run,
    securityAttempt,
    `public-security-${securityAttempt}`,
    scratch,
  );
  assert.deepEqual(
    regularBytes(join(directory, "public-security.json")),
    regularBytes(join(security.directory, "security.json")),
  );
  artifacts.push(security.identity);
  const providers = [
    { phase: "registry", origin: context.registry, provider: observed },
  ];
  for (const attempt of new Set(artifacts.map((artifact) => artifact.attempt)))
    if (attempt !== Number(context.registry.attempt))
      providers.push({
        phase: "registry-attempt",
        provider: provider(context.registry.run, attempt),
      });
  for (const [phase, origin] of [
    ["qualification", context.qualification],
    ["stage", context.nativeStage],
    ["stage", context.stage],
    ["archive", context.archive],
  ]) {
    if (!origin) continue;
    providers.push({
      phase,
      origin,
      provider: provider(origin.run, origin.attempt),
    });
  }
  const record = captureQualifiedTarget(directory, {
    providers,
    release,
    tag,
    liveRelease,
    artifacts,
  });
  const expires = artifacts
    .map((artifact) => api(`actions/artifacts/${artifact.id}`).expires_at)
    .filter(Boolean)
    .sort();
  return { record, signatureDueBy: expires[0] ?? null };
}

/** Capture exact evidence bytes only after original native providers and immutable custody pass. */
export function captureQualifiedTarget(
  directory,
  { providers, release, tag, liveRelease, artifacts },
) {
  const manifest = regularBytes(join(directory, "release-manifest.json")),
    context = readJson(join(directory, "context.json"));
  assert.deepEqual(
    verifyManifest(JSON.parse(manifest), { historical: true }),
    release,
  );
  assert.equal(liveRelease.immutable, true);
  assert.equal(liveRelease.draft, false);
  assert.equal(liveRelease.tag_name, `v${release.version}`);
  assert.equal(tag.annotation.object.sha, release.source.commit);
  const files = readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => ({
      path: join(entry.parentPath, entry.name),
      name: join(entry.parentPath, entry.name)
        .slice(directory.length + 1)
        .replaceAll("\\", "/"),
    }))
    .filter(
      ({ name }) =>
        (name.startsWith("public-") && name.endsWith(".json")) ||
        /^(?:context|release-manifest|release-review|release-acceptance|signed-tag|recovery-records|recovery-observations|stage-outcome|native-stage-outcome|registry-reconciliation|archive-outcome|archive-assets-intent|public-security|qualification-provider)\.json$/u.test(
          name,
        ) ||
        /^(?:stage|archive|promote(?:-npm|-github)?)-[1-9]\d*-[1-9]\d*\.jsonl(?:\.[a-f0-9]{64}\.ack\.json)?$/u.test(
          name,
        ),
    )
    .map(({ path, name }) => {
      const bytes = regularBytes(path);
      return {
        name,
        sha256: sha256(bytes),
        size: bytes.length,
        bytes: bytes.toString("base64"),
      };
    });
  const record = {
    schemaVersion: 1,
    version: release.version,
    source: release.source.commit,
    manifestSha256: sha256(manifest),
    manifest: manifest.toString("base64"),
    tag,
    release: {
      id: liveRelease.id,
      tag_name: liveRelease.tag_name,
      immutable: true,
      assets: liveRelease.assets.map(({ name, digest, size }) => ({
        name,
        digest,
        size,
      })),
    },
    qualification: {
      origin: context.registry,
      providers,
      artifacts:
        artifacts ??
        context.artifacts.filter(
          (value) => value.run === Number(context.registry.run),
        ),
      files,
    },
  };
  verifyQualifiedTarget(record, {
    version: release.version,
    manifestSha256: sha256(manifest),
    releaseId: liveRelease.id,
  });
  return record;
}

export function materializeQualifiedTarget(record, expected, directory) {
  const verified = verifyQualifiedTarget(record, expected);
  for (const [name, bytes] of verified.files) {
    const path = join(directory, name);
    mkdirSync(dirname(path), { recursive: true });
    save(path, bytes);
  }
  for (const lane of lanes(verified.release.matrix))
    verifyLane(
      join(directory, `public-${lane.os}-${lane.node}`),
      verified.release,
      lane,
      "public registry",
      { historical: true },
    );
  const security = record.qualification.artifacts.find((artifact) =>
    artifact.name.startsWith("public-security-"),
  );
  assert.ok(security);
  verifySecurity(
    readJson(join(directory, "public-security.json")),
    verified.release,
    expected.manifestSha256,
    verified.context.registry.run,
    String(security.attempt),
    { historical: true },
  );
  return verified;
}
