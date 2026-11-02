// SPDX-License-Identifier: AGPL-3.0-only
/** Shared read-only admission. Mutation capabilities are supplied only by service entry points. */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  readJson,
  regularBytes,
  save,
  sha256,
  verifyManifest,
  verifyDecision,
  verifyRun,
  isPrerelease,
  npmViewObject,
  releaseNpmTag,
  restorationAvailability,
  releasePackages,
  repository,
  lanes,
} from "./release-contract.js";
import { refreshAdmission } from "./release-evidence.js";
import {
  api,
  optionalApi,
  gh,
  decisionAsset,
  provider,
  signedTag,
} from "./release-provider.js";
import { isolatedNpmEnvironment, verifyAudit } from "./release-inventory.js";
import { npmCommand } from "./qualification-process.js";
import { qualifySecurity } from "./release-security.js";
import { acquireArchiveEvidence } from "./release-assets.js";
import { verifyPublicMetadata } from "./qualify-registry.js";
import {
  promotionPlan,
  verifyDraftAssets,
  verifyGithubPromotionState,
  verifyNpmOnlyGithubState,
} from "./release-effects.js";
import {
  admitNpmContinuation,
  admitGithubContinuation,
  promotionRecoveryFor,
} from "./promotion-handoff.js";
const githubRelease = (release) => api(`releases/tags/v${release.version}`);

export function preparePromotion(
  directory,
  scratch,
  service,
  env = process.env,
) {
  assert.ok(["npm", "github", "complete"].includes(service));
  const { release, context, recovery } = refreshAdmission(
    directory,
    "promote",
    env,
    {
      historyRoot: scratch,
      environmentName:
        service === "github" ? "github-release" : "npm-promotion",
    },
  );
  const archiveProvider = context.archive;
  assert.ok(archiveProvider);
  const archived = readJson(join(directory, "archive-outcome.json"));
  const live = githubRelease(release);
  assert.equal(live.id, archived.release.id);
  assert.equal(live.immutable, true);
  assert.equal(live.draft, false);
  verifyDraftAssets(archived.assets, live.assets);
  gh([
    "release",
    "verify",
    `v${release.version}`,
    "--repo",
    repository,
    "--format",
    "json",
  ]);
  const bytes = decisionAsset(release, "release-acceptance.json", scratch);
  const acceptance = verifyDecision(
    bytes,
    env.ACCEPTANCE_SHA,
    release,
    env.MANIFEST_SHA,
    "pilot",
  );
  assert.equal(acceptance.registryRun, context.registry.run);
  assert.equal(acceptance.registryAttempt, context.registry.attempt);
  assert.equal(acceptance.reviewSha256, env.REVIEW_SHA);
  const isolation = isolatedNpmEnvironment(scratch);
  const tags = () =>
    npmViewObject(
      npmCommand(
        [
          "view",
          release.package,
          "dist-tags",
          "--json",
          "--registry=https://registry.npmjs.org/",
        ],
        { env: isolation },
      ),
    );
  const before = tags(),
    expected = JSON.parse(env.EXPECTED_LABELS);
  assert.ok(
    Object.hasOwn(expected, "githubLatest"),
    "Prior GitHub latest must include explicit absence",
  );
  const githubBefore = optionalApi("releases/latest")?.tag_name ?? null;
  const target = env.RESTORE_VERSION || release.version;
  const continuation =
    service === "npm"
      ? null
      : admitNpmContinuation(directory, env, release, target, expected);
  const githubContinuation =
    service === "complete" && continuation.availability === "npm-and-github"
      ? admitGithubContinuation(directory, env, release)
      : null;
  const promotionRecovery = promotionRecoveryFor(
    continuation,
    recovery?.promote,
    githubContinuation,
  );
  const restoration = env.RESTORE_VERSION
    ? verifyDecision(
        regularBytes(join(directory, "release-restoration.json")),
        env.RESTORATION_SHA,
        release,
        env.MANIFEST_SHA,
        "restoration",
      )
    : null;
  const availability = restoration
    ? restorationAvailability(restoration, expected)
    : "npm-and-github";
  const npmOnly = availability === "npm-only";
  if (continuation) assert.equal(continuation.availability, availability);
  if (recovery?.promote)
    assert.equal(
      recovery.promote.record.availability ?? "npm-and-github",
      availability,
      "Recovery availability scope changed",
    );
  const planOptions = {
    reviewedTag: releaseNpmTag(
      readJson(join(directory, "release-review.json")),
    ),
    npmOnly,
  };
  if (npmOnly)
    assert.equal(
      githubBefore,
      expected.githubLatest,
      "GitHub latest changed before npm-only restoration",
    );
  if (!npmOnly)
    verifyGithubPromotionState(
      githubBefore,
      expected,
      target,
      promotionRecovery,
    );
  if (!npmOnly)
    assert.equal(
      isPrerelease(target),
      false,
      "Stable labels require a stable native SemVer target",
    );
  let auditRelease = release,
    auditDirectory = directory,
    githubSnapshot;
  const currentGithubState = () => ({
    latest: optionalApi("releases/latest"),
    affected: githubRelease(release),
    target: api(`releases/tags/v${target}`),
  });
  if (env.RESTORE_VERSION) {
    assert.equal(restoration.targetVersion, target);
    assert.equal(restoration.previousLatest, expected.latest);
    const prior = api(`releases/tags/v${target}`);
    assert.equal(prior.immutable, true);
    assert.equal(prior.draft, false);
    if (npmOnly) {
      assert.equal(live.prerelease, restoration.affectedPrerelease);
      assert.equal(prior.prerelease, restoration.targetPrerelease);
      const observed = {
        latest: optionalApi("releases/latest"),
        affected: live,
        target: prior,
      };
      assert.equal(
        observed.latest?.tag_name ?? null,
        expected.githubLatest,
        "GitHub latest changed before npm-only restoration",
      );
      githubSnapshot = verifyNpmOnlyGithubState(observed, observed);
      if (recovery?.promote?.observed.githubState) {
        verifyNpmOnlyGithubState(
          recovery.promote.observed.githubState,
          githubSnapshot,
        );
        githubSnapshot = recovery.promote.observed.githubState;
      }
      verifyNpmOnlyGithubState(githubSnapshot, currentGithubState());
    }
    gh([
      "release",
      "verify",
      `v${target}`,
      "--repo",
      repository,
      "--format",
      "json",
    ]);
    const metadata = npmViewObject(
      npmCommand(["view", `${release.package}@${target}`, "--json"], {
        env: isolation,
      }),
    );
    assert.equal(metadata.version, target);
    assert.equal(metadata.dist.integrity, restoration.targetIntegrity);
    const targetRoot = join(scratch, "restoration-target");
    mkdirSync(targetRoot);
    for (const name of ["release-manifest.json", "release-assets.json"]) {
      gh([
        "release",
        "download",
        `v${target}`,
        "--repo",
        repository,
        "--pattern",
        name,
        "--dir",
        targetRoot,
      ]);
      gh([
        "release",
        "verify-asset",
        `v${target}`,
        join(targetRoot, name),
        "--repo",
        repository,
        "--format",
        "json",
      ]);
    }
    const manifestBytes = regularBytes(
      join(targetRoot, "release-manifest.json"),
    );
    assert.match(restoration.targetManifestSha256, /^[a-f0-9]{64}$/u);
    assert.equal(sha256(manifestBytes), restoration.targetManifestSha256);
    const targetRelease = verifyManifest(JSON.parse(manifestBytes));
    acquireArchiveEvidence(targetRoot, targetRelease, prior.assets, [
      "context.json",
      ...lanes(targetRelease.matrix).flatMap((lane) =>
        ["root", "isolated"].map(
          (layout) => `public-${lane.os}-${lane.node}/${layout}-lock.json`,
        ),
      ),
    ]);
    const targetContext = readJson(join(targetRoot, "context.json"));
    assert.equal(targetRelease.package, release.package);
    assert.equal(targetRelease.version, target);
    assert.equal(targetRelease.archive.integrity, restoration.targetIntegrity);
    for (const subject of releasePackages(targetRelease)) {
      const current =
        subject.package === release.package
          ? metadata
          : npmViewObject(
              npmCommand(
                [
                  "view",
                  `${subject.package}@${target}`,
                  "--json",
                  "--registry=https://registry.npmjs.org/",
                ],
                { env: isolation },
              ),
            );
      verifyPublicMetadata(current, subject.platform ? subject : targetRelease);
    }
    signedTag(targetRelease);
    verifyRun(
      provider(targetContext.registry.run, targetContext.registry.attempt),
      "registry",
      targetContext.registry.controller,
      targetRelease.matrix,
    );
    auditRelease = targetRelease;
    auditDirectory = targetRoot;
  }
  promotionPlan(
    release,
    before,
    expected,
    target,
    promotionRecovery,
    planOptions,
  );
  if (continuation) {
    assert.equal(continuation.targetIntegrity, auditRelease.archive.integrity);
    if (npmOnly)
      verifyNpmOnlyGithubState(
        continuation.githubSnapshot,
        currentGithubState(),
      );
  }
  const refreshedAudits = [];
  for (const lane of lanes(auditRelease.matrix))
    for (const layout of ["root", "isolated"]) {
      const root = join(scratch, `audit-${lane.os}-${lane.node}-${layout}`);
      mkdirSync(root);
      const lockBytes = regularBytes(
          join(
            auditDirectory,
            `public-${lane.os}-${lane.node}`,
            `${layout}-lock.json`,
          ),
        ),
        lock = JSON.parse(lockBytes);
      save(join(root, "package-lock.json"), lockBytes);
      save(join(root, "package.json"), { private: true, ...lock.packages[""] });
      const audit = JSON.parse(
        npmCommand(
          [
            "audit",
            "--omit=dev",
            "--json",
            "--ignore-scripts",
            "--registry=https://registry.npmjs.org/",
          ],
          { cwd: root, env: isolation, phase: "promotion-recipient-audit" },
        ),
      );
      verifyAudit(audit);
      refreshedAudits.push({
        lane,
        layout,
        lockSha256: sha256(lockBytes),
        audit,
      });
    }
  const security = {
    codeql: qualifySecurity(
      auditRelease,
      regularBytes(join(auditDirectory, "release-manifest.json")),
    ),
    recipient: refreshedAudits,
    checkedAt: new Date().toISOString(),
  };
  save(join(directory, `promotion-security-${service}.json`), security);
  return {
    release,
    target,
    expected,
    availability,
    planOptions,
    recovery: promotionRecovery,
    githubSnapshot,
    tags,
    currentGithubState,
    isolation,
    auditRelease,
    continuation,
    githubContinuation,
    security,
  };
}
