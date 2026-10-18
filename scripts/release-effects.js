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
  regularBytes,
  repository,
  save,
  sha256,
  verifyDecision,
  lanes,
  verifyManifest,
  verifyRun,
  effectJournal,
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
} from "./release-provider.js";
import { isolatedNpmEnvironment, verifyAudit } from "./release-inventory.js";
import { qualifySecurity } from "./release-security.js";
import { native, npmCommand } from "./qualification-process.js";

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
      /^[^\x00-\x1f]{1,256}$/u.test(stage.stageId),
  );
  return { stageId: stage.stageId, state: "staged-awaiting-owner" };
}
export function promotionPlan(
  release,
  tags,
  expected,
  target = release.version,
) {
  assert.ok(
    Object.hasOwn(expected, "latest"),
    "Prior latest must explicitly include absence",
  );
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
  return { before: tags.latest ?? null, after: target };
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
  // A nonexistent package requires an independently authorized owner bootstrap.
  const metadata = JSON.parse(
    npmCommand(
      [
        "view",
        release.package,
        "--json",
        "--registry=https://registry.npmjs.org/",
      ],
      { env: isolation },
    ),
  );
  assert.equal(
    metadata.name,
    release.package,
    "First-package bootstrap is incomplete",
  );
  assert.ok(
    !metadata.versions?.includes(release.version),
    "Version is already public",
  );
  const journal = join(
    directory,
    effectJournal("stage", {
      run: env.GITHUB_RUN_ID,
      attempt: env.GITHUB_RUN_ATTEMPT,
    }),
  );
  writeFileSync(journal, "", { flag: "wx", flush: true });
  const outcome = journalEffect(
    journal,
    release,
    "stage",
    () => {
      currentMain(env);
      const response = npmCommand(
        [
          "stage",
          "publish",
          resolve(directory, release.archive.filename),
          "--ignore-scripts",
          "--access=public",
          "--tag=pilot",
          "--provenance",
          "--json",
          "--registry=https://registry.npmjs.org/",
        ],
        { env: isolation, phase: "npm-stage" },
      );
      save(join(directory, "stage-native.json"), Buffer.from(response));
      return JSON.parse(response);
    },
    { env, verify: (value) => verifyStageResponse(value, release) },
  );
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
    result: outcome.result,
    origin: context.stage,
    journalSha256: sha256(regularBytes(journal)),
  });
  return outcome;
}
function githubRelease(release) {
  return api(`releases/tags/v${release.version}`);
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
    save(join(bundle, item.name), regularBytes(join(directory, item.source)));
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
  const { release, context } = refreshAdmission(directory, "archive", env, {
    historyRoot: scratch,
  });
  signedTag(release);
  assert.equal(
    api("immutable-releases").enabled,
    true,
    "Enable repository immutability before publication",
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
  save(join(directory, "release-acceptance.json"), acceptance);
  const draft = githubRelease(release);
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
  const observed = githubRelease(release);
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
      sha256(regularBytes(join(readback, asset.name))),
      asset.sha256,
      "Downloaded draft bytes differ",
    );
  journalEffect(
    journal,
    release,
    "archive",
    () => {
      currentMain(env);
      assert.equal(api("immutable-releases").enabled, true);
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
      for (const asset of assets)
        gh([
          "release",
          "verify-asset",
          `v${release.version}`,
          join(readback, asset.name),
          "--repo",
          repository,
          "--format",
          "json",
        ]);
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
  if (isPrerelease(release.version)) {
    const tags = JSON.parse(
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
    JSON.parse(
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
  assert.equal(
    githubBefore,
    expected.githubLatest,
    "GitHub latest changed before promotion",
  );
  const target = env.RESTORE_VERSION || release.version;
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
    const metadata = JSON.parse(
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
  const plan = promotionPlan(release, before, expected, target);
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
        assert.equal(
          optionalApi("releases/latest")?.tag_name ?? null,
          expected.githubLatest,
          "Another GitHub promotion intervened",
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
      { env, before: expected.githubLatest ?? null },
    );
  if (!readFileSync(journal, "utf8").trim())
    journalEffect(
      journal,
      release,
      "completion-readback",
      () => ({ npm: tags(), github: api("releases/latest") }),
      { env },
    );
  save(join(directory, "completion.json"), {
    schemaVersion: 1,
    manifestSha256: env.MANIFEST_SHA,
    source: release.source.commit,
    version: target,
    priorLabels: expected,
    npm: tags(),
    github: api("releases/latest"),
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
      save(
        join(
          directory,
          `no-effect-${phase}-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}.json`,
        ),
        {
          schemaVersion: 1,
          state: "no-request",
          phase,
          run: process.env.GITHUB_RUN_ID,
          attempt: process.env.GITHUB_RUN_ATTEMPT,
          controller: process.env.GITHUB_SHA,
          manifestSha256: process.env.MANIFEST_SHA,
        },
      );
    throw error;
  } finally {
    sealBundle(directory, process.env.MANIFEST_SHA);
  }
}
