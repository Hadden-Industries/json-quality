// SPDX-License-Identifier: AGPL-3.0-only
/** Deliberate one-shot effects. A lost response is retained as unknown, never retried.
 * Adapted from the AGPL-3.0-only Markdown Quality release implementation.
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isPrerelease,
  jsonBytes,
  readJson,
  npmViewObject,
  regularBytes,
  releaseArtifactBytes,
  repository,
  save,
  sha256,
  verifyDecision,
  effectJournal,
  releasePackages,
  releaseNpmTag,
} from "./release-contract.js";
import { verifyNativeStageProofs } from "./qualify-native-stage.js";
import { consumeWriterAdmission } from "./release-writer-admission.js";
import {
  api,
  currentMain,
  decisionAsset,
  gh,
  optionalApi,
  signedTag,
  sealBundle,
  pages,
  provider,
  download,
  producingAttempt,
} from "./release-provider.js";
import { isolatedNpmEnvironment } from "./release-inventory.js";
import { native, npmCommand } from "./qualification-process.js";
import { verifyNativeAssets } from "./release-asset-verification.js";
import { verifyReleaseAttestation } from "./release-attestation-readiness.js";
import { bundleReleaseAssets, verifyDraftAssets } from "./release-assets.js";
export { verifyDraftAssets } from "./release-assets.js";
import { recordNoRequest, journalEffect } from "./release-records.js";
export { recordNoRequest, journalEffect };

export function verifyStageResponse(response, release) {
  assert.deepEqual(Object.keys(response), [release.package]);
  const stage = response[release.package];
  assert.equal(stage.name, release.package);
  assert.equal(stage.version, release.version);
  assert.equal(stage.integrity, release.archive.integrity);
  assert.ok(
    typeof stage.stageId === "string" &&
      // eslint-disable-next-line no-control-regex -- Reject provider identifier controls.
      /^[^\x00-\x1f]{1,256}$/u.test(stage.stageId),
  );
  return { stageId: stage.stageId, state: "staged-awaiting-owner" };
}
export function promotionPlan(
  release,
  tags,
  expected,
  target = release.version,
  recovery = null,
  { reviewedTag = "pilot", npmOnly = false } = {},
) {
  assert.ok(
    Object.hasOwn(expected, "latest"),
    "Prior latest must explicitly include absence",
  );
  if (recovery) {
    assert.equal(tags.latest, target);
    assert.equal(recovery.observed.npmLatest, target);
    assert.ok(
      Object.hasOwn(recovery.priorLabels, "latest"),
      "Original npm prior label is required",
    );
    assert.equal(
      recovery.priorLabels.latest,
      expected.latest,
      "Recovery must preserve the original prior npm label",
    );
    if (Object.hasOwn(recovery.priorLabels, "githubLatest"))
      assert.equal(recovery.priorLabels.githubLatest, expected.githubLatest);
  } else
    assert.equal(
      tags.latest ?? null,
      expected.latest,
      "Prior latest changed; never overwrite a concurrent promotion",
    );
  assert.ok(["pilot", "latest"].includes(reviewedTag));
  if (npmOnly || reviewedTag === "latest")
    assert.equal(
      expected.latest,
      release.version,
      "Reviewed latest no longer identifies the affected release",
    );
  else
    assert.equal(
      tags.pilot,
      release.version,
      "Pilot no longer identifies this release",
    );
  if (!npmOnly)
    assert.equal(
      isPrerelease(target),
      false,
      "Prerelease cannot become latest",
    );
  return { before: expected.latest, after: target };
}
function assertFrozenTag(directory, release) {
  assert.equal(
    signedTag(release).reference.object.sha,
    readJson(join(directory, "signed-tag.json")).reference.object.sha,
    "Original release tag object changed",
  );
}
function writeContext(directory, context) {
  writeFileSync(join(directory, "context.json"), jsonBytes(context), {
    flush: true,
  });
}
function npmEnvironment(directory) {
  const env = isolatedNpmEnvironment(directory);
  assert.ok(
    env.ACTIONS_ID_TOKEN_REQUEST_URL && env.ACTIONS_ID_TOKEN_REQUEST_TOKEN,
    "OIDC runner authority required",
  );
  assert.equal(
    npmCommand(["--version"]).trim(),
    readJson("assets/node-support.json").producerNpm.version,
  );
  return env;
}
export function stage(directory, scratch, env = process.env) {
  const { release, context } = consumeWriterAdmission(directory, "stage", env);
  const isolation = npmEnvironment(scratch);
  const review = readJson(
    join(
      directory,
      context.continuationReviewSha256
        ? "continuation-review.json"
        : "release-review.json",
    ),
  );
  const phase = env.STAGE_PHASE || "natives";
  const verifyTag = () =>
    assert.equal(
      signedTag(release).reference.object.sha,
      readJson(join(directory, "signed-tag.json")).reference.object.sha,
      "Original release tag object changed",
    );
  verifyTag();
  assert.ok(["natives", "core"].includes(phase));
  if (phase === "core") {
    const observed = provider(env.GITHUB_RUN_ID, env.GITHUB_RUN_ATTEMPT);
    const reports = release.platformArchives.map((subject) => {
      const os = release.matrix.os.find((value) =>
        value.startsWith(
          subject.platform === "win32-x64" ? "windows" : "ubuntu",
        ),
      );
      const name = `native-public (${os})`;
      const jobs = observed.jobs.jobs.filter((job) => job.name === name);
      assert.equal(jobs.length, 1);
      assert.equal(jobs[0].status, "completed");
      assert.equal(jobs[0].conclusion, "success");
      assert.equal(jobs[0].head_sha, env.GITHUB_SHA);
      assert.equal(jobs[0].run_id, Number(env.GITHUB_RUN_ID));
      assert.equal(jobs[0].run_attempt, Number(env.GITHUB_RUN_ATTEMPT));
      const attempt = producingAttempt(observed, name);
      const acquired = download(
        env.GITHUB_RUN_ID,
        attempt,
        `native-public-${subject.platform}-${attempt}`,
        scratch,
      );
      const record = readJson(join(acquired.directory, "native-public.json"));
      assert.equal(record.attempt, String(attempt));
      const signatures = regularBytes(
        join(acquired.directory, "signatures.json"),
      );
      assert.equal(
        sha256(Buffer.from(JSON.stringify(JSON.parse(signatures)))),
        record.signaturesSha256,
      );
      save(join(directory, `native-public-${subject.platform}.json`), {
        ...record,
        artifact: acquired.identity,
        providerJob: jobs[0],
      });
      return record;
    });
    verifyNativeStageProofs(release, context, reports, env);
  }
  const selected = releasePackages(release).filter((subject) =>
    phase === "natives" ? subject.platform : !subject.platform,
  );
  if (release.schemaVersion >= 3) {
    const latest = optionalApi("releases/latest");
    const marker = (value) =>
      value
        ? {
            id: value.id,
            tag_name: value.tag_name,
            prerelease: value.prerelease,
          }
        : null;
    assert.deepEqual(
      marker(latest),
      review.priorAvailability.githubLatest,
      "GitHub latest changed across owner approvals",
    );
  }
  const stageGuards = () => {
    currentMain(env);
    verifyTag();
    if (release.schemaVersion < 3) return;
    const marker = (value) =>
      value
        ? {
            id: value.id,
            tag_name: value.tag_name,
            prerelease: value.prerelease,
          }
        : null;
    assert.deepEqual(
      marker(optionalApi("releases/latest")),
      review.priorAvailability.githubLatest,
    );
    for (const subject of releasePackages(release)) {
      const metadata = npmViewObject(
          npmCommand(
            [
              "view",
              subject.package,
              "--json",
              "--registry=https://registry.npmjs.org/",
            ],
            { env: isolation },
          ),
        ),
        tags = metadata["dist-tags"] ?? {};
      const publicNative = phase === "core" && subject.platform;
      if (publicNative)
        assert.equal(
          tags[releaseNpmTag(review)],
          release.version,
          "Approved native channel changed before core request",
        );
      const latest =
        publicNative && releaseNpmTag(review) === "latest"
          ? release.version
          : review.priorAvailability.npmLatest[subject.package];
      assert.equal(
        tags.latest ?? null,
        latest,
        "Package default changed before stage request",
      );
    }
  };
  // Preflight the entire family before the first privileged effect.
  for (const subject of phase === "natives"
    ? releasePackages(release)
    : selected) {
    const metadata = npmViewObject(
      npmCommand(
        [
          "view",
          subject.package,
          "--json",
          "--registry=https://registry.npmjs.org/",
        ],
        { env: isolation },
      ),
    );
    assert.equal(
      metadata.name,
      subject.package,
      "First-package bootstrap is incomplete",
    );
    if (release.schemaVersion >= 3)
      assert.equal(
        metadata["dist-tags"]?.latest ?? null,
        review.priorAvailability.npmLatest[subject.package],
        "Npm default changed across owner approval boundary",
      );
    assert.ok(
      !metadata.versions?.includes(release.version),
      "Version is already public",
    );
  }
  const journal = join(
    directory,
    effectJournal("stage", {
      run: env.GITHUB_RUN_ID,
      attempt: env.GITHUB_RUN_ATTEMPT,
    }),
  );
  writeFileSync(journal, "", { flag: "wx", flush: true });
  const stages = [];
  for (const subject of selected) {
    const outcome = journalEffect(
      journal,
      { ...release, ...subject },
      `stage:${subject.package}`,
      () => {
        const response = npmCommand(
          stagePublishArguments(directory, subject, review),
          { env: isolation, phase: "npm-stage" },
        );
        save(
          join(
            directory,
            `stage-native-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}-${stages.length}.json`,
          ),
          Buffer.from(response),
        );
        return JSON.parse(response);
      },
      {
        preRequest: stageGuards,
        env,
        guard: {
          reviewSha256: context.continuationReviewSha256 ?? env.REVIEW_SHA,
        },
        verify: (value) => verifyStageResponse(value, subject),
      },
    );
    stages.push({
      package: subject.package,
      version: subject.version,
      integrity: subject.archive.integrity,
      ...outcome.result,
    });
  }
  const result = {
    stageId: stages.at(-1).stageId,
    state: "staged-awaiting-owner",
    stages,
  };
  const origin = {
    run: env.GITHUB_RUN_ID,
    attempt: env.GITHUB_RUN_ATTEMPT,
    controller: env.GITHUB_SHA,
    phase,
    reviewSha256: context.continuationReviewSha256 ?? env.REVIEW_SHA,
  };
  context.packageOrigins ??= {};
  for (const subject of selected)
    context.packageOrigins[subject.package] = {
      ...origin,
      package: subject.package,
      integrity: subject.archive.integrity,
      stageId: stages.find((value) => value.package === subject.package)
        .stageId,
    };
  if (phase === "natives") context.nativeStage = origin;
  else {
    context.stage = origin;
    const native = readJson(join(directory, "native-stage-outcome.json"));
    assert.equal(native.manifestSha256, env.MANIFEST_SHA);
    assert.deepEqual(native.origin, context.nativeStage);
    result.stages = releasePackages(release).map((subject) =>
      [...native.result.stages, ...stages].find(
        (value) => value.package === subject.package,
      ),
    );
  }
  writeContext(directory, context);
  const outcomePath = join(
    directory,
    phase === "natives" ? "native-stage-outcome.json" : "stage-outcome.json",
  );
  save(outcomePath, {
    schemaVersion: 2,
    manifestSha256: env.MANIFEST_SHA,
    subject: {
      package: release.package,
      version: release.version,
      source: release.source.commit,
      integrity: release.archive.integrity,
    },
    result,
    origin,
    origins: context.packageOrigins,
    journalSha256: sha256(regularBytes(journal)),
  });
  return { state: "completed", result };
}
export function stagePublishArguments(directory, subject, review) {
  return [
    "stage",
    "publish",
    resolve(directory, subject.archive.filename),
    "--ignore-scripts",
    "--access=public",
    `--tag=${releaseNpmTag(review)}`,
    "--provenance",
    "--json",
    "--fetch-retries=0",
    "--registry=https://registry.npmjs.org/",
  ];
}
function githubRelease(release) {
  return api(`releases/tags/v${release.version}`);
}
export function findDraft(release, list = pages) {
  const matches = list("releases?per_page=100").filter(
    (item) => item.tag_name === `v${release.version}`,
  );
  assert.equal(matches.length, 1, "Missing or ambiguous release draft");
  assert.equal(matches[0].draft, true);
  assert.ok(Number.isSafeInteger(matches[0].id) && matches[0].id > 0);
  return matches[0];
}
/** The workflow token cannot read Administration settings. Bind the owner's native read. */
export function verifyArchiveSettings(decision, now = Date.now()) {
  const settings = decision.immutableReleases;
  assert.equal(
    settings.evidence.url,
    `https://api.github.com/repos/${repository}/immutable-releases`,
  );
  assert.equal(
    sha256(Buffer.from(settings.responseJson)),
    settings.evidence.sha256,
  );
  assert.equal(JSON.parse(settings.responseJson).enabled, true);
  const checked = Date.parse(settings.checkedAt);
  assert.ok(
    Number.isFinite(checked) && checked <= now && now - checked <= 3600000,
    "Owner native settings read must be at most one hour old",
  );
}
export function verifyCompletedLabels(target, npm, github) {
  assert.equal(npm.latest, target, "npm latest changed before completion");
  assert.equal(
    github.tag_name,
    `v${target}`,
    "GitHub latest changed before completion",
  );
  assert.equal(github.immutable, true);
  return { npm, github };
}
/** Compare only immutable identity and mutable labels; counters and timestamps may advance. */
export function verifyNpmOnlyGithubState(expected, actual) {
  assert.equal(
    actual.latest?.tag_name ?? null,
    expected.latest?.tag_name ?? null,
    "GitHub latest changed during npm-only restoration",
  );
  assert.equal(
    actual.latest?.id ?? null,
    expected.latest?.id ?? null,
    "GitHub latest identity changed during npm-only restoration",
  );
  for (const key of ["affected", "target"]) {
    for (const field of ["id", "tag_name", "prerelease", "immutable", "draft"])
      assert.equal(
        actual[key]?.[field],
        expected[key]?.[field],
        `GitHub ${key} ${field} changed during npm-only restoration`,
      );
    assert.equal(actual[key].immutable, true);
    assert.equal(actual[key].draft, false);
    assert.ok(Number.isSafeInteger(actual[key].id) && actual[key].id > 0);
    assert.equal(typeof actual[key].prerelease, "boolean");
  }
  const compact = (value) =>
    value
      ? Object.fromEntries(
          ["id", "tag_name", "prerelease", "immutable", "draft"].map(
            (field) => [field, value[field]],
          ),
        )
      : null;
  return {
    latest: compact(actual.latest),
    affected: compact(actual.affected),
    target: compact(actual.target),
  };
}
export function verifyGithubPromotionState(actual, expected, target, recovery) {
  const authorized =
    recovery?.observed.githubLatest === `v${target}`
      ? `v${target}`
      : recovery?.record.githubAction === "repair-current-label"
        ? recovery.record.expectedGithubLatest
        : expected.githubLatest;
  assert.notEqual(
    authorized,
    undefined,
    "Explicit current GitHub label is required",
  );
  assert.equal(
    actual,
    authorized,
    "GitHub latest changed before the admitted effect",
  );
  return authorized;
}
function archiveAssets(directory, release, scratch, manifestSha256) {
  // This exact source archive supplies complete corresponding source and notices.
  const source = join(directory, "source.tar.gz");
  native("git", [
    "archive",
    "--format=tar.gz",
    `--output=${source}`,
    release.source.commit,
  ]);
  for (const name of ["LICENSE", "THIRD-PARTY-NOTICES.md"])
    save(
      join(directory, name),
      native("git", ["show", `${release.source.commit}:${name}`], {
        encoding: null,
      }),
    );
  return bundleReleaseAssets(directory, release, scratch, manifestSha256);
}
export function archive(directory, scratch, env = process.env) {
  const { release, context, recovery } = consumeWriterAdmission(
    directory,
    "archive",
    env,
  );
  assert.equal(
    signedTag(release).reference.object.sha,
    readJson(join(directory, "signed-tag.json")).reference.object.sha,
    "Original release tag object changed",
  );
  const acceptance = decisionAsset(release, "release-acceptance.json", scratch);
  const decision = verifyDecision(
    acceptance,
    env.ACCEPTANCE_SHA,
    release,
    env.MANIFEST_SHA,
    "pilot",
  );
  assert.equal(decision.registryRun, context.registry.run);
  assert.equal(decision.registryAttempt, context.registry.attempt);
  assert.equal(decision.reviewSha256, env.REVIEW_SHA);
  const acceptancePath = join(directory, "release-acceptance.json");
  if (existsSync(acceptancePath))
    assert.equal(sha256(regularBytes(acceptancePath)), sha256(acceptance));
  else save(acceptancePath, acceptance);
  if (recovery?.archive) {
    assert.equal(recovery.archive.record.disposition, "complete-read-only");
    assert.equal(context.archive.run, String(recovery.archive.record.run));
    assert.equal(
      context.archive.attempt,
      String(recovery.archive.record.attempt),
    );
    assert.ok(recovery.archive.observed.immutableRelease);
    recordNoRequest(directory, "archive", env);
    completeSelectedAvailability(
      directory,
      scratch,
      release,
      env,
      recovery.archive,
    );
    return;
  }
  assert.ok(
    !context.archive,
    "An archived release requires read-only reconciliation",
  );
  assert.ok(
    env.JSON_QUALITY_BUILD_ATTESTATION,
    "Native build attestation bundle is required before immutable archival",
  );
  const attestation = regularBytes(env.JSON_QUALITY_BUILD_ATTESTATION);
  save(join(directory, "build-attestation.jsonl"), attestation);
  const verified = [];
  for (const file of [
    ...releasePackages(release).map((subject) => subject.archive.filename),
    "release-manifest.json",
  ]) {
    const result = JSON.parse(
      gh([
        "attestation",
        "verify",
        join(directory, file),
        "--bundle",
        env.JSON_QUALITY_BUILD_ATTESTATION,
        "--repo",
        repository,
        "--signer-workflow",
        `${repository}/.github/workflows/github-release.yml`,
        "--signer-digest",
        env.GITHUB_SHA,
        "--source-digest",
        env.GITHUB_SHA,
        "--format",
        "json",
      ]),
    );
    assert.ok(
      Array.isArray(result) && result.length > 0,
      "Native attestation verification returned no verified bundle",
    );
    verified.push({ file, verification: result });
  }
  save(join(directory, "build-attestation-verification.json"), {
    schemaVersion: 1,
    controller: env.GITHUB_SHA,
    subjects: verified,
  });
  verifyArchiveSettings(decision);
  const draft = findDraft(release);
  assert.equal(draft.draft, true);
  assert.equal(draft.tag_name, `v${release.version}`);
  const { bundle, assets } = archiveAssets(
    directory,
    release,
    scratch,
    env.MANIFEST_SHA,
  );
  save(join(directory, "archive-assets-intent.json"), {
    schemaVersion: 1,
    manifestSha256: env.MANIFEST_SHA,
    assets,
  });
  const journal = join(
    directory,
    effectJournal("archive", {
      run: env.GITHUB_RUN_ID,
      attempt: env.GITHUB_RUN_ATTEMPT,
    }),
  );
  writeFileSync(journal, "", { flag: "wx", flush: true });
  for (const existing of draft.assets) {
    const expected = assets.find(({ name }) => name === existing.name);
    assert.ok(expected, "Unexpected draft asset");
    assert.equal(existing.digest, `sha256:${expected.sha256}`);
    assert.equal(existing.size, expected.size);
  }
  for (const asset of assets.filter(
    ({ name }) => !draft.assets.some((item) => item.name === name),
  )) {
    journalEffect(
      journal,
      release,
      `upload:${asset.name}`,
      () => {
        gh([
          "release",
          "upload",
          `v${release.version}`,
          join(bundle, asset.name),
          "--repo",
          repository,
        ]);
        return { asset: asset.name, sha256: asset.sha256 };
      },
      {
        env,
        preRequest: () => {
          currentMain(env);
          verifyArchiveSettings(decision);
          assertFrozenTag(directory, release);
        },
      },
    );
  }
  const observed = api(`releases/${draft.id}`);
  verifyDraftAssets(assets, observed.assets);
  const readback = join(scratch, "readback");
  mkdirSync(readback);
  gh([
    "release",
    "download",
    `v${release.version}`,
    "--repo",
    repository,
    "--dir",
    readback,
  ]);
  for (const asset of assets)
    assert.equal(
      sha256(releaseArtifactBytes(join(readback, asset.name))),
      asset.sha256,
      "Downloaded draft bytes differ",
    );
  journalEffect(
    journal,
    release,
    "archive",
    () => {
      gh([
        "release",
        "edit",
        `v${release.version}`,
        "--repo",
        repository,
        "--draft=false",
        `--prerelease=${release.schemaVersion >= 3 ? true : isPrerelease(release.version)}`,
        "--latest=false",
      ]);
      const result = githubRelease(release);
      assert.equal(result.id, draft.id);
      assert.equal(result.immutable, true);
      assert.equal(result.draft, false);
      verifyDraftAssets(assets, result.assets);
      verifyReleaseAttestation({
        release,
        releaseId: result.id,
        prerelease: result.prerelease,
        assets,
        manifestSha: env.MANIFEST_SHA,
        tagSha: readJson(join(directory, "signed-tag.json")).reference.object
          .sha,
      });
      verifyNativeAssets(release.version, readback, assets);
      return { id: result.id, immutable: true, assets };
    },
    {
      env,
      preRequest: () => {
        currentMain(env);
        verifyArchiveSettings(decision);
        assertFrozenTag(directory, release);
      },
    },
  );
  context.archive = {
    run: env.GITHUB_RUN_ID,
    attempt: env.GITHUB_RUN_ATTEMPT,
    controller: env.GITHUB_SHA,
  };
  writeContext(directory, context);
  save(join(directory, "archive-outcome.json"), {
    schemaVersion: 1,
    manifestSha256: env.MANIFEST_SHA,
    release: githubRelease(release),
    assets,
  });
  completeSelectedAvailability(directory, scratch, release, env);
}
function completeSelectedAvailability(
  directory,
  scratch,
  release,
  env,
  recovery = null,
) {
  if (release.schemaVersion >= 3)
    return completeFamilyPublication(
      directory,
      scratch,
      release,
      env,
      recovery,
    );
  const prerelease = isPrerelease(release.version);
  const npmTag = releaseNpmTag(
    readJson(join(directory, "release-review.json")),
  );
  if (prerelease || npmTag === "latest") {
    const packages = releasePackages(release).map((subject) => {
      const tags = npmViewObject(
        npmCommand(
          [
            "view",
            subject.package,
            "dist-tags",
            "--json",
            "--registry=https://registry.npmjs.org/",
          ],
          { env: isolatedNpmEnvironment(scratch) },
        ),
      );
      assert.equal(
        tags[npmTag],
        release.version,
        "Owner-selected npm availability changed",
      );
      return { package: subject.package, tags };
    });
    const tags = packages.find(
      (subject) => subject.package === release.package,
    ).tags;
    const live = githubRelease(release);
    assert.equal(live.prerelease, prerelease);
    if (prerelease)
      assert.notEqual(
        optionalApi("releases/latest")?.tag_name,
        `v${release.version}`,
      );
    save(join(directory, "completion.json"), {
      schemaVersion: 1,
      manifestSha256: env.MANIFEST_SHA,
      source: release.source.commit,
      version: release.version,
      npm: tags,
      npmTag,
      packages,
      github: live,
      state: prerelease
        ? "completed-prerelease"
        : "completed-owner-selected-npm",
      ...(recovery ? { recovery } : {}),
      observedAt: new Date().toISOString(),
    });
  }
}

/** Immutable custody is established before a stable direct-latest classification effect. */
export function completeFamilyPublication(
  directory,
  scratch,
  release,
  env,
  recovery,
) {
  const context = readJson(join(directory, "context.json"));
  const review = readJson(
      join(
        directory,
        context.continuationReviewSha256
          ? "continuation-review.json"
          : "release-review.json",
      ),
    ),
    npmTag = releaseNpmTag(review);
  const prior = review.priorAvailability.githubLatest;
  const marker = (value) =>
    value
      ? { id: value.id, tag_name: value.tag_name, prerelease: value.prerelease }
      : null;
  const archived = readJson(join(directory, "archive-outcome.json"));
  const readPackages = () =>
    releasePackages(release).map((subject) => {
      const tags = npmViewObject(
        npmCommand(
          [
            "view",
            subject.package,
            "dist-tags",
            "--json",
            "--registry=https://registry.npmjs.org/",
          ],
          { env: isolatedNpmEnvironment(scratch) },
        ),
      );
      assert.equal(
        tags[npmTag],
        release.version,
        "Owner-selected package channel changed",
      );
      return {
        package: subject.package,
        integrity: subject.archive.integrity,
        tags,
      };
    });
  const packages = readPackages();
  let live = githubRelease(release);
  assert.equal(live.id, archived.release.id);
  assert.equal(live.immutable, true);
  assert.equal(live.draft, false);
  verifyDraftAssets(archived.assets, live.assets);
  const stableDefault = !isPrerelease(release.version) && npmTag === "latest";
  if (stableDefault && !recovery) {
    assert.deepEqual(marker(optionalApi("releases/latest")), prior);
    assert.equal(live.prerelease, true);
    const journal = join(
      directory,
      effectJournal("archive", {
        run: env.GITHUB_RUN_ID,
        attempt: env.GITHUB_RUN_ATTEMPT,
      }),
    );
    journalEffect(
      journal,
      release,
      "github-classification",
      () => {
        gh([
          "release",
          "edit",
          `v${release.version}`,
          "--repo",
          repository,
          "--prerelease=false",
          "--latest=true",
        ]);
        live = githubRelease(release);
        assert.equal(live.id, archived.release.id);
        assert.equal(live.prerelease, false);
        assert.equal(optionalApi("releases/latest")?.id, live.id);
        return { releaseId: live.id, prerelease: false, latest: true };
      },
      {
        env,
        before: prior,
        preRequest: () => {
          currentMain(env);
          readPackages();
          assert.deepEqual(marker(optionalApi("releases/latest")), prior);
          const current = githubRelease(release);
          assert.equal(current.id, live.id);
          assert.equal(current.immutable, true);
          verifyDraftAssets(archived.assets, current.assets);
          assertFrozenTag(directory, release);
        },
        guard: {
          targetReleaseId: live.id,
          npmTag,
          integrities: packages.map(({ package: name, integrity }) => ({
            package: name,
            integrity,
          })),
        },
      },
    );
  }
  live = githubRelease(release);
  assert.equal(live.id, archived.release.id);
  assert.equal(live.immutable, true);
  verifyDraftAssets(archived.assets, live.assets);
  assert.equal(live.prerelease, !stableDefault);
  if (stableDefault)
    assert.equal(
      optionalApi("releases/latest")?.id,
      live.id,
      "Classification incomplete; read-only recovery cannot acquire write authority",
    );
  else
    assert.deepEqual(
      marker(optionalApi("releases/latest")),
      prior,
      "GitHub latest changed during pilot/RC publication",
    );
  save(join(directory, "completion.json"), {
    schemaVersion: 2,
    manifestSha256: env.MANIFEST_SHA,
    source: release.source.commit,
    version: release.version,
    npmTag,
    packages,
    github: live,
    priorGithubLatest: prior,
    state: stableDefault
      ? "completed-stable-default"
      : isPrerelease(release.version)
        ? "completed-prerelease"
        : "completed-pilot-publication",
    observedAt: new Date().toISOString(),
  });
}
/** Caller admits owner decisions, immutable targets and fresh security before this seam. */
export function applyAvailability(
  {
    journal,
    release,
    target,
    expected,
    planOptions,
    recovery,
    githubSnapshot,
    env = process.env,
  },
  operations,
) {
  const {
    assertCurrent,
    readNpmTags,
    writeNpmLatest,
    readGithubState,
    writeGithubLatest,
  } = operations;
  const npmOnly = planOptions.npmOnly;
  if (npmOnly)
    assert.equal(
      githubSnapshot.latest?.tag_name ?? null,
      expected.githubLatest,
      "GitHub latest changed before npm-only restoration",
    );
  const plan = promotionPlan(
    release,
    readNpmTags(),
    expected,
    target,
    recovery,
    planOptions,
  );
  const guard = npmOnly
    ? {
        availability: "npm-only",
        targetVersion: target,
        githubState: githubSnapshot,
      }
    : undefined;
  const verifyCompletion = () => {
    const npm = readNpmTags();
    const github = readGithubState();
    if (!npmOnly) return verifyCompletedLabels(target, npm, github.latest);
    assert.equal(npm.latest, target, "npm latest changed before completion");
    return { npm, github: verifyNpmOnlyGithubState(githubSnapshot, github) };
  };
  if (npmOnly) verifyNpmOnlyGithubState(githubSnapshot, readGithubState());
  const githubPrior = npmOnly
    ? expected.githubLatest
    : verifyGithubPromotionState(
        readGithubState().latest?.tag_name ?? null,
        expected,
        target,
        recovery,
      );
  if (!(recovery?.observed.npmLatest === target))
    journalEffect(
      journal,
      release,
      "npm-latest",
      () => {
        assertCurrent();
        promotionPlan(
          release,
          readNpmTags(),
          expected,
          target,
          null,
          planOptions,
        );
        if (npmOnly)
          verifyNpmOnlyGithubState(githubSnapshot, readGithubState());
        writeNpmLatest(target);
        const observed = readNpmTags();
        assert.equal(observed.latest, target);
        if (npmOnly)
          verifyNpmOnlyGithubState(githubSnapshot, readGithubState());
        return observed;
      },
      { env, before: plan.before, guard },
    );
  if (!npmOnly && !(recovery?.observed.githubLatest === `v${target}`))
    journalEffect(
      journal,
      release,
      "github-latest",
      () => {
        assertCurrent();
        assert.equal(
          readNpmTags().latest,
          target,
          "Another promotion intervened",
        );
        verifyGithubPromotionState(
          readGithubState().latest?.tag_name ?? null,
          expected,
          target,
          recovery,
        );
        writeGithubLatest(target);
        const latest = readGithubState().latest;
        assert.equal(latest.tag_name, `v${target}`);
        assert.equal(latest.immutable, true);
        return { id: latest.id, tag: latest.tag_name };
      },
      { env, before: githubPrior },
    );
  if (!readFileSync(journal, "utf8").trim())
    journalEffect(journal, release, "completion-readback", verifyCompletion, {
      env,
      guard,
    });
  return { plan, completed: verifyCompletion() };
}

export function runReleaseEffect(phase, directory, scratch, env = process.env) {
  assert.ok(
    ["stage", "archive"].includes(phase),
    "Promotion requires the service-specific entry point",
  );
  mkdirSync(scratch, { recursive: true });
  try {
    ({ stage, archive })[phase](directory, scratch, env);
  } catch (error) {
    const journal = join(
      directory,
      effectJournal(phase, {
        run: env.GITHUB_RUN_ID,
        attempt: env.GITHUB_RUN_ATTEMPT,
      }),
    );
    if (!existsSync(journal) || !regularBytes(journal).length)
      recordNoRequest(directory, phase, env);
    throw error;
  } finally {
    sealBundle(directory, env.MANIFEST_SHA);
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 5);
  runReleaseEffect(...process.argv.slice(2));
}
