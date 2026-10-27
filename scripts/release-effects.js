// SPDX-License-Identifier: AGPL-3.0-only
/** Deliberate one-shot effects. A lost response is retained as unknown, never retried.
 * Adapted from the AGPL-3.0-only Markdown Quality release implementation.
 */
import assert from "node:assert/strict";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
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
  lanes,
  verifyManifest,
  verifyRun,
  effectJournal,
  releasePackages,
} from "./release-contract.js";
import { refreshAdmission, verifyBundle } from "./release-evidence.js";
import {
  api,
  currentMain,
  decisionAsset,
  evidenceIndex,
  gh,
  optionalApi,
  signedTag,
  sealBundle,
  provider,
  pages,
} from "./release-provider.js";
import { isolatedNpmEnvironment, verifyAudit } from "./release-inventory.js";
import { qualifySecurity } from "./release-security.js";
import { native, npmCommand } from "./qualification-process.js";
import { verifyNativeAssets } from "./release-asset-verification.js";

export function journalEffect(
  path,
  subject,
  operation,
  request,
  { env = process.env, before = null, verify = (value) => value } = {},
) {
  if (existsSync(path)) {
    const prior = readFileSync(path, "utf8").trim();
    const records = prior
      ? prior.split("\n").map((line) => JSON.parse(line))
      : [];
    assert.equal(records.length % 2, 0, "Unresolved prior journal request");
    for (let i = 0; i < records.length; i += 2) {
      assert.equal(
        records[i + 1].state,
        "completed",
        "Unknown request cannot be retried",
      );
      assert.ok(
        records[i].operation !== operation,
        "Request operation was already journalled",
      );
    }
  }
  const intent = {
    state: "intent",
    package: subject.package,
    version: subject.version,
    source: subject.source.commit,
    manifestSha256: env.MANIFEST_SHA,
    integrity: subject.archive.integrity,
    operation,
    run: env.GITHUB_RUN_ID,
    attempt: env.GITHUB_RUN_ATTEMPT,
    controller: env.GITHUB_SHA,
    before,
    requestedAt: new Date().toISOString(),
  };
  const line = Buffer.from(JSON.stringify(intent) + "\n");
  appendFileSync(path, line, { flag: "a", flush: true });
  try {
    const result = verify(request());
    const outcome = {
      state: "completed",
      intentSha256: sha256(line),
      result,
      observedAt: new Date().toISOString(),
    };
    appendFileSync(path, JSON.stringify(outcome) + "\n", { flush: true });
    return outcome;
  } catch (error) {
    appendFileSync(
      path,
      JSON.stringify({
        state: "outcome-unknown",
        intentSha256: sha256(line),
        nextAction:
          "Inspect native state and retained request/response; do not repeat this request.",
      }) + "\n",
      { flush: true },
    );
    throw error;
  }
}
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
  assert.equal(
    tags.pilot,
    release.version,
    "Pilot no longer identifies this release",
  );
  assert.equal(isPrerelease(target), false, "Prerelease cannot become latest");
  return { before: expected.latest, after: target };
}
export function verifyDraftAssets(expected, observed) {
  assert.equal(
    new Set(observed.map((asset) => asset.name)).size,
    observed.length,
  );
  assert.deepEqual(
    observed.map((asset) => asset.name).sort(),
    expected.map((asset) => asset.name).sort(),
    "Incomplete or extra GitHub assets",
  );
  for (const asset of expected) {
    const actual = observed.find((item) => item.name === asset.name);
    assert.equal(actual.size, asset.size);
    assert.equal(actual.digest, `sha256:${asset.sha256}`);
  }
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
  const { release, context } = refreshAdmission(directory, "stage", env, {
    historyRoot: scratch,
  });
  const isolation = npmEnvironment(scratch);
  // Preflight the entire family before the first privileged effect.
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
    );
    assert.equal(
      metadata.name,
      subject.package,
      "First-package bootstrap is incomplete",
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
  for (const subject of releasePackages(release)) {
    const outcome = journalEffect(
      journal,
      { ...release, ...subject },
      `stage:${subject.package}`,
      () => {
        currentMain(env);
        const response = npmCommand(
          [
            "stage",
            "publish",
            resolve(directory, subject.archive.filename),
            "--ignore-scripts",
            "--access=public",
            "--tag=pilot",
            "--provenance",
            "--json",
            "--registry=https://registry.npmjs.org/",
          ],
          { env: isolation, phase: "npm-stage" },
        );
        save(
          join(directory, `stage-native-${stages.length}.json`),
          Buffer.from(response),
        );
        return JSON.parse(response);
      },
      { env, verify: (value) => verifyStageResponse(value, subject) },
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
  context.stage = {
    run: env.GITHUB_RUN_ID,
    attempt: env.GITHUB_RUN_ATTEMPT,
    controller: env.GITHUB_SHA,
  };
  writeContext(directory, context);
  save(join(directory, "stage-outcome.json"), {
    schemaVersion: 1,
    manifestSha256: env.MANIFEST_SHA,
    subject: {
      package: release.package,
      version: release.version,
      source: release.source.commit,
      integrity: release.archive.integrity,
    },
    result,
    origin: context.stage,
    journalSha256: sha256(regularBytes(journal)),
  });
  return { state: "completed", result };
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
function archiveAssets(directory, release, scratch) {
  const bundle = join(scratch, "assets");
  mkdirSync(bundle);
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
  const members = evidenceIndex(directory).filter(
    ({ name }) => name !== "evidence-index.json",
  );
  const assets = members.map((entry) => ({
    ...entry,
    source: entry.name,
    name: entry.name.replaceAll("/", "--"),
  }));
  assert.equal(new Set(assets.map(({ name }) => name)).size, assets.length);
  for (const item of assets)
    save(
      join(bundle, item.name),
      releaseArtifactBytes(join(directory, item.source)),
    );
  const assetManifest = jsonBytes({
    schemaVersion: 1,
    manifestSha256: process.env.MANIFEST_SHA,
    source: release.source.commit,
    assets,
  });
  save(join(bundle, "release-assets.json"), assetManifest);
  assets.push({
    name: "release-assets.json",
    size: assetManifest.length,
    sha256: sha256(assetManifest),
  });
  return { bundle, assets };
}
export function archive(directory, scratch, env = process.env) {
  const { release, context, recovery } = refreshAdmission(
    directory,
    "archive",
    env,
    {
      historyRoot: scratch,
    },
  );
  signedTag(release);
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
    completePrerelease(directory, scratch, release, env, recovery.archive);
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
  const { bundle, assets } = archiveAssets(directory, release, scratch);
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
        currentMain(env);
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
      { env },
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
      currentMain(env);
      verifyArchiveSettings(decision);
      signedTag(release);
      gh([
        "release",
        "edit",
        `v${release.version}`,
        "--repo",
        repository,
        "--draft=false",
        `--prerelease=${isPrerelease(release.version)}`,
        "--latest=false",
      ]);
      const result = githubRelease(release);
      assert.equal(result.id, draft.id);
      assert.equal(result.immutable, true);
      assert.equal(result.draft, false);
      verifyDraftAssets(assets, result.assets);
      gh([
        "release",
        "verify",
        `v${release.version}`,
        "--repo",
        repository,
        "--format",
        "json",
      ]);
      verifyNativeAssets(release.version, readback, assets);
      return { id: result.id, immutable: true, assets };
    },
    { env },
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
  completePrerelease(directory, scratch, release, env);
}
export function recordNoRequest(directory, phase, env) {
  const origin = { run: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT };
  assert.ok(
    !existsSync(join(directory, effectJournal(phase, origin))) ||
      regularBytes(join(directory, effectJournal(phase, origin))).length === 0,
    "No-request marker conflicts with a request journal",
  );
  const path = join(
      directory,
      `no-effect-${phase}-${origin.run}-${origin.attempt}.json`,
    ),
    marker = {
      schemaVersion: 1,
      state: "no-request",
      phase,
      ...origin,
      controller: env.GITHUB_SHA,
      manifestSha256: env.MANIFEST_SHA,
    };
  if (existsSync(path)) assert.deepEqual(readJson(path), marker);
  else save(path, marker);
}
function completePrerelease(directory, scratch, release, env, recovery = null) {
  if (isPrerelease(release.version)) {
    const tags = npmViewObject(
      npmCommand(
        [
          "view",
          release.package,
          "dist-tags",
          "--json",
          "--registry=https://registry.npmjs.org/",
        ],
        { env: isolatedNpmEnvironment(scratch) },
      ),
    );
    const live = githubRelease(release);
    assert.equal(tags.pilot, release.version);
    assert.equal(live.prerelease, true);
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
      github: live,
      state: "completed-prerelease",
      ...(recovery ? { recovery } : {}),
      observedAt: new Date().toISOString(),
    });
  }
}
export function promote(directory, scratch, env = process.env) {
  const { release, context, recovery } = refreshAdmission(
    directory,
    "promote",
    env,
    {
      historyRoot: scratch,
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
  const isolation = npmEnvironment(scratch);
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
  const githubPriorForThisEffect = verifyGithubPromotionState(
    githubBefore,
    expected,
    target,
    recovery?.promote,
  );
  assert.equal(
    isPrerelease(target),
    false,
    "Stable labels require a stable native SemVer target",
  );
  let auditRelease = release,
    auditDirectory = directory;
  if (env.RESTORE_VERSION) {
    const restoration = verifyDecision(
      regularBytes(join(directory, "release-restoration.json")),
      env.RESTORATION_SHA,
      release,
      env.MANIFEST_SHA,
      "restoration",
    );
    assert.equal(restoration.targetVersion, target);
    assert.equal(restoration.previousLatest, expected.latest);
    const prior = api(`releases/tags/v${target}`);
    assert.equal(prior.immutable, true);
    assert.equal(prior.draft, false);
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
    for (const name of [
      "release-manifest.json",
      "context.json",
      "release-assets.json",
    ]) {
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
    const targetRelease = verifyManifest(JSON.parse(manifestBytes)),
      targetContext = readJson(join(targetRoot, "context.json")),
      targetAssets = readJson(join(targetRoot, "release-assets.json"));
    assert.equal(targetRelease.package, release.package);
    assert.equal(targetRelease.version, target);
    assert.equal(targetRelease.archive.integrity, restoration.targetIntegrity);
    signedTag(targetRelease);
    verifyRun(
      provider(targetContext.registry.run, targetContext.registry.attempt),
      "registry",
      targetContext.registry.controller,
      targetRelease.matrix,
    );
    verifyDraftAssets(
      [
        ...targetAssets.assets,
        {
          name: "release-assets.json",
          sha256: sha256(regularBytes(join(targetRoot, "release-assets.json"))),
          size: regularBytes(join(targetRoot, "release-assets.json")).length,
        },
      ],
      prior.assets,
    );
    for (const lane of lanes(targetRelease.matrix))
      for (const layout of ["root", "isolated"]) {
        const relative = `public-${lane.os}-${lane.node}/${layout}-lock.json`;
        const matches = targetAssets.assets.filter(
          (asset) => asset.source === relative,
        );
        assert.equal(matches.length, 1);
        const asset = matches[0];
        gh([
          "release",
          "download",
          `v${target}`,
          "--repo",
          repository,
          "--pattern",
          asset.name,
          "--dir",
          targetRoot,
        ]);
        gh([
          "release",
          "verify-asset",
          `v${target}`,
          join(targetRoot, asset.name),
          "--repo",
          repository,
          "--format",
          "json",
        ]);
        const lockBytes = regularBytes(join(targetRoot, asset.name));
        assert.equal(sha256(lockBytes), asset.sha256);
        mkdirSync(join(targetRoot, `public-${lane.os}-${lane.node}`), {
          recursive: true,
        });
        save(join(targetRoot, relative), lockBytes);
      }
    auditRelease = targetRelease;
    auditDirectory = targetRoot;
  }
  const plan = promotionPlan(
    release,
    before,
    expected,
    target,
    recovery?.promote,
  );
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
  save(join(directory, "promotion-security.json"), {
    codeql: qualifySecurity(
      auditRelease,
      regularBytes(join(auditDirectory, "release-manifest.json")),
    ),
    recipient: refreshedAudits,
    checkedAt: new Date().toISOString(),
  });
  const journal = join(
    directory,
    effectJournal("promote", {
      run: env.GITHUB_RUN_ID,
      attempt: env.GITHUB_RUN_ATTEMPT,
    }),
  );
  writeFileSync(journal, "", { flag: "wx", flush: true });
  if (!(recovery?.promote?.observed.npmLatest === target))
    journalEffect(
      journal,
      release,
      "npm-latest",
      () => {
        currentMain(env);
        promotionPlan(release, tags(), expected, target);
        npmCommand(
          [
            "dist-tag",
            "add",
            `${release.package}@${target}`,
            "latest",
            "--registry=https://registry.npmjs.org/",
          ],
          { env: isolation, phase: "npm-latest" },
        );
        const observed = tags();
        assert.equal(observed.latest, target);
        return observed;
      },
      { env, before: plan.before },
    );
  // A failure after npm success remains a truthful partial cross-service outcome.
  if (!(recovery?.promote?.observed.githubLatest === `v${target}`))
    journalEffect(
      journal,
      release,
      "github-latest",
      () => {
        currentMain(env);
        assert.equal(tags().latest, target, "Another promotion intervened");
        verifyGithubPromotionState(
          optionalApi("releases/latest")?.tag_name ?? null,
          expected,
          target,
          recovery?.promote,
        );
        gh([
          "release",
          "edit",
          `v${target}`,
          "--repo",
          repository,
          "--latest=true",
        ]);
        const latest = api("releases/latest");
        assert.equal(latest.tag_name, `v${target}`);
        assert.equal(latest.immutable, true);
        return { id: latest.id, tag: latest.tag_name };
      },
      { env, before: githubPriorForThisEffect },
    );
  if (!readFileSync(journal, "utf8").trim())
    journalEffect(
      journal,
      release,
      "completion-readback",
      () => verifyCompletedLabels(target, tags(), api("releases/latest")),
      { env },
    );
  const completed = verifyCompletedLabels(
    target,
    tags(),
    api("releases/latest"),
  );
  save(join(directory, "completion.json"), {
    schemaVersion: 1,
    manifestSha256: env.MANIFEST_SHA,
    source: release.source.commit,
    version: target,
    priorLabels: expected,
    ...completed,
    state: "completed",
    observedAt: new Date().toISOString(),
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 5);
  const [phase, directory, scratch] = process.argv.slice(2);
  assert.ok(["stage", "archive", "promote"].includes(phase));
  mkdirSync(scratch, { recursive: true });
  try {
    verifyBundle(directory, process.env.MANIFEST_SHA);
    ({ stage, archive, promote })[phase](directory, scratch);
  } catch (error) {
    const journal = join(
      directory,
      effectJournal(phase, {
        run: process.env.GITHUB_RUN_ID,
        attempt: process.env.GITHUB_RUN_ATTEMPT,
      }),
    );
    if (!existsSync(journal) || !regularBytes(journal).length)
      recordNoRequest(directory, phase, process.env);
    throw error;
  } finally {
    sealBundle(directory, process.env.MANIFEST_SHA);
  }
}
