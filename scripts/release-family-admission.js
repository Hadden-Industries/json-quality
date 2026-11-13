// SPDX-License-Identifier: AGPL-3.0-only
/** Full, read-only admission for an explicitly approved family availability operation. */
import assert from "node:assert/strict";
import { mkdirSync, existsSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import {
  readJson,
  regularBytes,
  releaseArtifactBytes,
  save,
  sha256,
  verifyArchive,
  verifyManifest,
  verifyRun,
  verifyProvenance,
  verifyDecision,
  publicationOrigin,
  releasePackages,
  lanes,
  repository,
  npmViewObject,
  effectJournal,
} from "./release-contract.js";
import { guardFamily } from "./promotion-family.js";
import {
  api,
  gh,
  provider,
  signedTag,
  checkEnvironment,
} from "./release-provider.js";
import { acquireArchiveEvidence } from "./release-assets.js";
import { verifyPublicMetadata } from "./qualify-registry.js";
import { isolatedNpmEnvironment, verifyAudit } from "./release-inventory.js";
import { npmCommand } from "./qualification-process.js";
import { qualifySecurity } from "./release-security.js";
import {
  verifyOperationDecision,
  verifyScopedRestoration,
} from "./release-availability-contract.js";
import { readPackReport } from "./pack.js";
import { collectQualifiedTarget } from "./qualified-release-checkpoint.js";
import { retainedQualifiedTarget } from "./archived-release-evidence.js";
import { verifyQualifiedTarget } from "./qualified-release-contract.js";

/** Original successful public qualification is checked before refreshing retained-lock security. */
export function prepareFamilyPromotion(
  { directory, scratch, release, context, recovery, tags, currentGithubState },
  env,
) {
  const bytes = Buffer.from(env.OPERATION_JSON),
    decision = verifyOperationDecision(bytes, env.OPERATION_SHA, release, env),
    family = decision.family;
  const operationPath = join(directory, "availability-operation.json");
  for (const pending of recovery?.entries ?? []) {
    const conditional =
      pending.observed?.state === "family-conditional-repair-approved" ||
      pending.observed?.classification?.state === "conditional-repair-approved";
    if (!conditional) continue;
    assert.ok(
      family.subjects.every((subject) => subject.prior === subject.target),
      "An unresolved GitHub effect permits zero npm mutations",
    );
    assert.equal(family.github.selected, true);
    assert.deepEqual(family.github.prior, pending.record.expectedGithubLatest);
    if (pending.record.phase === "promote") {
      const records = regularBytes(
        join(directory, effectJournal("promote", pending.record)),
      )
        .toString()
        .trim()
        .split("\n")
        .map(JSON.parse);
      const originalFamily = records[0].guard.family;
      assert.deepEqual(
        family.github.target,
        originalFamily.github.target,
        "Conditional repair must select the original GitHub target",
      );
      assert.deepEqual(
        family.github.targetPrior,
        pending.record.expectedTarget,
      );
      for (const subject of family.subjects)
        assert.equal(
          subject.target,
          originalFamily.subjects.find(
            (value) => value.package === subject.package,
          ).target,
        );
    } else {
      assert.equal(
        family.github.target.id,
        pending.observed.classification.releaseId,
      );
      assert.equal(family.github.target.tag_name, `v${release.version}`);
    }
  }
  if (family.operation === "scoped-restore") {
    const original = decision.originalEffect;
    const settlement = recovery?.entries.find(
      ({ record }) =>
        record.phase === original.phase &&
        record.run === original.run &&
        record.attempt === original.attempt &&
        record.service === original.service,
    );
    verifyScopedRestoration(
      decision,
      release,
      settlement,
      regularBytes(join(directory, effectJournal(original.phase, original))),
      original.phase === "stage"
        ? (() => {
            const digest = settlement.record.reviewSha256;
            const reviews = ["release-review.json", "continuation-review.json"]
              .filter((name) => existsSync(join(directory, name)))
              .map((name) => regularBytes(join(directory, name)))
              .filter((value) => sha256(value) === digest);
            assert.equal(
              reviews.length,
              1,
              "Original stage review bytes are unavailable",
            );
            return verifyDecision(
              reviews[0],
              digest,
              release,
              env.MANIFEST_SHA,
              "review",
            );
          })()
        : null,
    );
  }
  if (existsSync(operationPath)) {
    const original = regularBytes(operationPath),
      root = join(directory, "recovery-operations", sha256(original));
    mkdirSync(root, { recursive: true });
    if (!existsSync(join(root, "availability-operation.json")))
      save(join(root, "availability-operation.json"), original);
    for (const name of ["npm-continuation.json", "github-continuation.json"]) {
      const path = join(directory, name);
      if (!existsSync(path)) continue;
      const handoff = regularBytes(path),
        value = JSON.parse(handoff);
      assert.equal(
        value.operationId,
        sha256(original),
        "Old handoff differs from retained original operation",
      );
      const retained = join(root, name);
      if (!existsSync(retained)) save(retained, handoff);
      else assert.deepEqual(regularBytes(retained), handoff);
      unlinkSync(path);
    }
    writeFileSync(operationPath, bytes, { flush: true });
  } else save(operationPath, bytes);
  const isolation = isolatedNpmEnvironment(scratch);
  const targets = [];
  for (const target of decision.targets) {
    const live = api(`releases/tags/v${target.version}`);
    assert.equal(live.id, target.releaseId);
    assert.equal(live.immutable, true);
    assert.equal(live.draft, false);
    if (
      family.operation === "scoped-restore" &&
      (!family.github.selected || live.id !== family.github.target.id)
    ) {
      const guard = family.github.guards?.find((value) => value.id === live.id);
      assert.deepEqual(
        guard && {
          id: guard.id,
          tag_name: guard.tag_name,
          prerelease: guard.prerelease,
        },
        { id: live.id, tag_name: live.tag_name, prerelease: live.prerelease },
        "Scoped restoration must guard each excluded qualified target release",
      );
    }
    const root = join(scratch, `qualified-target-${target.version}`);
    mkdirSync(root);
    gh([
      "release",
      "verify",
      `v${target.version}`,
      "--repo",
      repository,
      "--format",
      "json",
    ]);
    for (const file of ["release-manifest.json", "release-assets.json"]) {
      gh([
        "release",
        "download",
        `v${target.version}`,
        "--repo",
        repository,
        "--pattern",
        file,
        "--dir",
        root,
      ]);
      gh([
        "release",
        "verify-asset",
        `v${target.version}`,
        join(root, file),
        "--repo",
        repository,
        "--format",
        "json",
      ]);
    }
    const manifest = regularBytes(join(root, "release-manifest.json"));
    assert.equal(sha256(manifest), target.manifestSha256);
    const candidate = verifyManifest(JSON.parse(manifest));
    assert.equal(candidate.version, target.version);
    const originalTag = signedTag(candidate);
    const assetIndex = readJson(join(root, "release-assets.json"));
    const proofNames = (
      assetIndex.schemaVersion === 2
        ? assetIndex.evidence.files.map((file) => file.name)
        : assetIndex.assets.map((file) => file.source).filter(Boolean)
    ).filter(
      (name) =>
        (name.endsWith(".json") || name.endsWith(".jsonl")) &&
        !["release-manifest.json", "release-assets.json"].includes(name),
    );
    acquireArchiveEvidence(root, candidate, live.assets, proofNames);
    const archivedContext = readJson(join(root, "context.json"));
    let registry, retained;
    try {
      registry = provider(
        archivedContext.registry.run,
        archivedContext.registry.attempt,
      );
    } catch (error) {
      if (error.httpStatus !== 404) throw error;
      assert.ok(
        decision.historyCheckpoint,
        "Expired target qualification requires a complete signed checkpoint",
      );
      retained = retainedQualifiedTarget(decision.historyCheckpoint, target);
      const checked = verifyQualifiedTarget(retained, target);
      assert.deepEqual(checked.context.registry, archivedContext.registry);
      for (const [name, bytes] of checked.files)
        if (name.startsWith("public-") || name === "public-security.json")
          assert.deepEqual(
            regularBytes(join(root, name)),
            bytes,
            "Immutable archive differs from signed qualification checkpoint",
          );
      registry = checked.providers.find(
        (value) => value.phase === "registry",
      ).provider;
    }
    verifyRun(
      registry,
      "registry",
      archivedContext.registry.controller,
      candidate.matrix,
    );
    const audits = [];
    for (const lane of lanes(candidate.matrix))
      for (const layout of ["root", "isolated"]) {
        const publicRoot = join(root, `public-${lane.os}-${lane.node}`);
        const publication = readJson(join(publicRoot, "publication.json"));
        assert.deepEqual(publication.release, candidate);
        const signatures = readJson(
          join(publicRoot, `${layout}-signatures.json`),
        );
        const platform = lane.os.startsWith("windows")
          ? "win32-x64"
          : "linux-x64";
        for (const subject of releasePackages(candidate).filter(
          (value) => !value.platform || value.platform === platform,
        )) {
          verifyProvenance(
            signatures,
            { ...candidate, ...subject },
            publicationOrigin(publication, subject),
          );
        }
        const auditRoot = join(
          scratch,
          `target-audit-${target.version}-${lane.os}-${lane.node}-${layout}`,
        );
        mkdirSync(auditRoot);
        const lockBytes = regularBytes(join(publicRoot, `${layout}-lock.json`)),
          lock = JSON.parse(lockBytes);
        save(join(auditRoot, "package-lock.json"), lockBytes);
        save(join(auditRoot, "package.json"), {
          private: true,
          ...lock.packages[""],
        });
        const audit = JSON.parse(
          npmCommand(
            [
              "audit",
              "--omit=dev",
              "--json",
              "--ignore-scripts",
              "--registry=https://registry.npmjs.org/",
            ],
            { cwd: auditRoot, env: isolation },
          ),
        );
        verifyAudit(audit);
        audits.push({ lane, layout, lockSha256: sha256(lockBytes), audit });
      }
    for (const subject of releasePackages(candidate)) {
      const metadata = npmViewObject(
        npmCommand(
          [
            "view",
            `${subject.package}@${candidate.version}`,
            "--json",
            "--registry=https://registry.npmjs.org/",
          ],
          { env: isolation },
        ),
      );
      verifyPublicMetadata(metadata, subject.platform ? subject : candidate);
      const packed = readPackReport(
        npmCommand(
          [
            "pack",
            `${subject.package}@${candidate.version}`,
            "--json",
            "--ignore-scripts",
            "--pack-destination",
            root,
            "--registry=https://registry.npmjs.org/",
          ],
          { cwd: root, env: isolation },
        ),
      );
      verifyArchive(
        releaseArtifactBytes(join(root, packed.filename)),
        subject.archive,
      );
    }
    const security = {
      codeql: qualifySecurity(candidate, manifest),
      recipient: audits,
    };
    const checkpoint =
      retained ??
      collectQualifiedTarget(root, scratch, {
        checkpoint: decision.historyCheckpoint,
      }).record;
    assert.equal(
      checkpoint.tag.reference.object.sha,
      originalTag.reference.object.sha,
      "Qualified target tag object changed",
    );
    writeFileSync(
      join(directory, `qualified-target-${candidate.version}.json`),
      JSON.stringify(checkpoint, null, 2) + "\n",
      { flush: true },
    );
    targets.push({
      tagSha: originalTag.reference.object.sha,
      release: candidate,
      releaseId: live.id,
      assets: live.assets.map(({ name, digest, size }) => ({
        name,
        digest,
        size,
      })),
      manifestSha256: target.manifestSha256,
      registry: archivedContext.registry,
      security,
    });
  }
  for (const subject of family.subjects.filter(
    (value) => value.selected && value.target !== null,
  )) {
    const target = targets.find(
      (value) => value.release.version === subject.target,
    );
    assert.ok(target, "Selected label target lacks original qualification");
    const expected = releasePackages(target.release).find(
      (value) => value.package === subject.package,
    );
    assert.equal(subject.integrity, expected.archive.integrity);
  }
  if (family.github.selected) {
    checkEnvironment("github-release");
    const target = targets.find(
      (value) => `v${value.release.version}` === family.github.target.tag_name,
    );
    assert.equal(target?.releaseId, family.github.target.id);
  }
  if (family.operation === "emergency-core-restore") {
    const affected = api(`releases/${decision.sourceReleaseId}`);
    assert.equal(affected.tag_name, `v${release.version}`);
    assert.equal(affected.immutable, true);
    assert.equal(affected.draft, false);
    const core = family.subjects.find(
        (subject) => subject.package === release.package,
      ),
      target = targets.find((value) => value.release.version === core.target);
    assert.ok(target);
    const targetRelease = api(`releases/${target.releaseId}`);
    const marker = ({ id, tag_name, prerelease }) => ({
      id,
      tag_name,
      prerelease,
    });
    assert.deepEqual(
      family.github.guards.map((guard) => guard.id).sort(),
      [affected.id, target.releaseId].sort(),
      "Emergency restore must guard exactly the affected and selected target releases",
    );
    for (const live of [affected, targetRelease])
      assert.deepEqual(
        marker(family.github.guards.find((guard) => guard.id === live.id)),
        marker(live),
      );
  }
  if (
    family.operation === "scoped-restore" &&
    decision.sourceReleaseId !== null &&
    decision.sourceReleaseId !==
      (family.github.selected ? family.github.target.id : null)
  ) {
    const affected = api(`releases/${decision.sourceReleaseId}`),
      guard = family.github.guards?.find((value) => value.id === affected.id);
    assert.equal(affected.tag_name, `v${release.version}`);
    assert.equal(affected.immutable, true);
    assert.equal(affected.draft, false);
    assert.deepEqual(
      guard && {
        id: guard.id,
        tag_name: guard.tag_name,
        prerelease: guard.prerelease,
      },
      {
        id: affected.id,
        tag_name: affected.tag_name,
        prerelease: affected.prerelease,
      },
      "Scoped restoration must guard the excluded affected release",
    );
  }
  const operations = {
    readPackageTags: tags,
    readGithubState: currentGithubState,
  };
  guardFamily(family, operations);
  const security = {
    source: qualifySecurity(
      release,
      regularBytes(join(directory, "release-manifest.json")),
    ),
    targets,
    checkedAt: new Date().toISOString(),
  };
  writeFileSync(
    join(directory, "promotion-security-admit.json"),
    JSON.stringify(security, null, 2) + "\n",
    { flush: true },
  );
  return {
    release,
    family,
    target: family.subjects.find((value) => value.package === release.package)
      .target,
    expected: family.subjects,
    availability: family.github.selected ? "npm-and-github" : "npm-only",
    planOptions: { npmOnly: !family.github.selected },
    isolation,
    targets,
    security,
    context,
  };
}
