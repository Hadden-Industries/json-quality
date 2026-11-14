// SPDX-License-Identifier: AGPL-3.0-only
/** Owner-selected readback reconciliation. It grants no replay of an unknown request. */
import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  jsonBytes,
  readJson,
  npmViewObject,
  regularBytes,
  repository,
  save,
  sha256,
  verifyManifest,
  effectJournal,
  retainedRecoveries,
  releasePackages,
  workflows,
  releaseArtifactBytes,
  verifyProvenance,
} from "./release-contract.js";
import {
  api,
  gh,
  provider,
  optionalApi,
  readHistoryRecord,
} from "./release-provider.js";
import { npmCommand } from "./qualification-process.js";
import { verifyNativeAssets } from "./release-asset-verification.js";
import { verifyReleaseAttestation } from "./release-attestation-readiness.js";
import { isolatedNpmEnvironment } from "./release-inventory.js";
import { verifyFamilyScope } from "./promotion-family.js";
import { npmFamilyLabel, npmLabelOperation } from "./npm-availability.js";
import { requestedIntents } from "./release-records.js";
import { verifyStageCancellation } from "./reject-release-stages.js";

export function verifyArchiveIntent(directory, record, manifestSha) {
  assert.equal(record.disposition, "complete-read-only");
  assert.match(record.assetsIntentSha256, /^[a-f0-9]{64}$/u);
  const bytes = regularBytes(join(directory, "archive-assets-intent.json"));
  assert.equal(
    sha256(bytes),
    record.assetsIntentSha256,
    "Archive intent differs from owner recovery decision",
  );
  const intent = JSON.parse(bytes);
  assert.equal(intent.schemaVersion, 1);
  assert.equal(intent.manifestSha256, manifestSha);
  assert.ok(
    Array.isArray(intent.assets) &&
      intent.assets.length > 0 &&
      intent.assets.length <= 4096,
  );
  const names = new Set();
  for (const asset of intent.assets) {
    assert.match(asset.name, /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,240}$/u);
    assert.match(asset.sha256, /^[a-f0-9]{64}$/u);
    assert.ok(Number.isSafeInteger(asset.size) && asset.size >= 0);
    assert.ok(!names.has(asset.name), "Duplicate archive intent asset");
    names.add(asset.name);
  }
  return intent;
}

export function verifyRecoveryRecord(record, release, manifestSha, journal) {
  assert.equal(record.schemaVersion, 1);
  assert.equal(record.owner, "maksymshostak");
  assert.equal(record.manifestSha256, manifestSha);
  assert.equal(record.version, release.version);
  assert.ok(["stage", "archive", "promote"].includes(record.phase));
  if (record.service) {
    assert.equal(record.phase, "promote");
    assert.ok(["npm", "github"].includes(record.service));
  }
  assert.match(String(record.run), /^[1-9]\d{0,15}$/u);
  assert.match(String(record.attempt), /^[1-9]\d{0,15}$/u);
  assert.ok(
    Number.isFinite(Date.parse(record.acceptedAt)) &&
      record.rationale?.trim().length >= 20,
  );
  assert.equal(
    record.journalSha256,
    sha256(journal),
    "Recovery must bind original journal bytes",
  );
  const records = journal
    .toString("utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.ok(records.length >= 1);
  for (let i = 0; i < records.length; i += 2) {
    const [intent, outcome] = records.slice(i, i + 2);
    assert.equal(intent.state, "intent");
    if (record.service) {
      assert.equal(intent.schemaVersion, 2);
      assert.equal(intent.service, record.service);
      assert.ok(
        intent.operation === "completion-readback" ||
          intent.operation === `${record.service}-latest` ||
          (record.service === "npm" &&
            intent.guard?.family &&
            intent.operation ===
              npmLabelOperation(intent.guard.family, intent.package)),
      );
    } else
      assert.ok(
        !intent.service,
        "Service journal requires an explicit service recovery",
      );
    assert.equal(intent.run, String(record.run));
    assert.equal(intent.attempt, String(record.attempt));
    assert.equal(intent.manifestSha256, manifestSha);
    const subject =
      record.phase === "stage" ||
      (record.service === "npm" && intent.guard?.family)
        ? releasePackages(release).find(
            (entry) => entry.package === intent.package,
          )
        : release;
    assert.ok(subject, "Unknown recovery package");
    assert.equal(intent.package, subject.package);
    assert.equal(intent.version, release.version);
    assert.equal(intent.source, release.source.commit);
    assert.equal(intent.integrity, subject.archive.integrity);
    assert.match(intent.controller, /^[a-f0-9]{40}$/u);
    assert.ok(
      record.phase === "stage"
        ? intent.operation === `stage:${subject.package}`
        : record.phase === "archive"
          ? intent.operation === "archive" ||
            intent.operation.startsWith("upload:") ||
            intent.operation === "github-classification"
          : ["npm-latest", "github-latest", "completion-readback"].includes(
              intent.operation,
            ) ||
            (record.service === "npm" &&
              intent.guard?.family &&
              intent.operation ===
                npmLabelOperation(intent.guard.family, subject.package)),
    );
    if (outcome) {
      if (outcome.state === "request-not-sent")
        assert.equal(outcome.requestStarted, false);
      assert.equal(
        outcome.intentSha256,
        sha256(Buffer.from(JSON.stringify(intent) + "\n")),
      );
      assert.ok(
        ["completed", "outcome-unknown", "request-not-sent"].includes(
          outcome.state,
        ),
      );
    } else
      assert.equal(
        i,
        records.length - 1,
        "Only the final outcome can be absent",
      );
  }
  return records;
}
export function retainRecovery(directory, record) {
  const records = retainedRecoveries(directory),
    key = (value) => effectJournal(value.phase, value);
  const existing = records.filter((value) => key(value) === key(record));
  for (const value of existing)
    assert.equal(
      sha256(jsonBytes(value)),
      sha256(jsonBytes(record)),
      "An original recovery record cannot be replaced",
    );
  if (!existing.length) records.push(record);
  assert.ok(records.length <= 100);
  writeFileSync(join(directory, "recovery-records.json"), jsonBytes(records), {
    flush: true,
  });
}
export function reconcileObserved(
  directory,
  scratch,
  env = process.env,
  readers = {},
) {
  const explicit = env.RECOVERY_JSON ? JSON.parse(env.RECOVERY_JSON) : null;
  if (explicit)
    assert.ok(["stage", "archive", "promote"].includes(explicit.phase));
  const result = { entries: [] };
  const records = retainedRecoveries(directory);
  if (
    explicit &&
    !records.some(
      (record) => sha256(jsonBytes(record)) === sha256(jsonBytes(explicit)),
    )
  )
    records.push(explicit);
  for (const record of records) {
    const phase = record.phase;
    const selected =
      explicit?.phase === phase
        ? explicit
        : records.findLast((value) => value.phase === phase);
    const observeCurrent =
      record.run === selected.run &&
      record.attempt === selected.attempt &&
      record.service === selected.service;
    const root = join(scratch, effectJournal(phase, record) + "-readback");
    mkdirSync(root, { recursive: true });
    const entry = reconcileOne(
      directory,
      root,
      env,
      record,
      result[phase],
      observeCurrent,
      readers,
    );
    result.entries.push(entry);
    result[phase] = entry;
  }
  if (explicit) retainRecovery(directory, explicit);
  return result.entries.length ? result : null;
}
function npmOnlyRecoveryGuard(record, records) {
  const intents = records.filter((entry) => entry.state === "intent");
  assert.ok(
    intents.length &&
      intents.every((entry) => entry.guard?.availability === "npm-only"),
  );
  assert.ok(
    !intents.some((entry) => entry.operation === "github-latest"),
    "npm-only recovery cannot conceal a GitHub write",
  );
  const guard = intents[0].guard;
  for (const intent of intents) assert.deepEqual(intent.guard, guard);
  assert.equal(guard.targetVersion, record.targetVersion);
  assert.ok(Object.hasOwn(record, "expectedGithubLatest"));
  assert.equal(
    record.expectedGithubLatest,
    guard.githubState.latest?.tag_name ?? null,
  );
  return guard;
}
export function reconcilePromotionLabels(
  record,
  records,
  tags,
  latest,
  targetRelease,
) {
  const family = records[0].guard?.family;
  if (family) {
    if (record.service === "github") assert.equal(family.github.selected, true);
    assert.equal(
      record.operationId,
      family.operationId,
      "Recovery must select the original family operation",
    );
    const marker = (value) =>
      value
        ? {
            id: value.id,
            tag_name: value.tag_name,
            prerelease: value.prerelease,
          }
        : null;
    const attempted = new Set(
      requestedIntents(records)
        .filter(
          (entry) =>
            entry.operation === npmLabelOperation(family, entry.package),
        )
        .map((entry) => entry.package),
    );
    for (const subject of family.subjects) {
      const expected =
        record.service === "github" || attempted.has(subject.package)
          ? subject.target
          : subject.prior;
      assert.equal(
        tags[subject.package]?.[npmFamilyLabel(family)] ?? null,
        expected,
        "Family label does not settle the original attempted requests",
      );
      if (family.operation === "retire-pilot")
        assert.equal(
          tags[subject.package]?.latest,
          family.stableVersion,
          "Stable latest changed during pilot retirement recovery",
        );
    }
    const expectedGithub =
      record.service === "github" &&
      records.some((entry) => entry.operation === "github-latest")
        ? family.github.target
        : family.github.prior;
    let conditionalRepair = false;
    if (
      record.service === "github" &&
      !isDeepStrictEqual(marker(latest), marker(expectedGithub))
    ) {
      assert.equal(
        record.githubAction,
        "repair-current-label",
        "Unknown GitHub effect requires applied readback or explicit owner conditional repair",
      );
      assert.ok(
        Object.hasOwn(record, "expectedGithubLatest") &&
          Object.hasOwn(record, "expectedTarget"),
      );
      assert.deepEqual(marker(latest), record.expectedGithubLatest);
      assert.deepEqual(marker(latest), marker(family.github.prior));
      assert.deepEqual(marker(targetRelease), record.expectedTarget);
      assert.equal(targetRelease.immutable, true);
      assert.equal(targetRelease.draft, false);
      assert.ok(
        isDeepStrictEqual(
          marker(targetRelease),
          marker(family.github.targetPrior),
        ) ||
          isDeepStrictEqual(
            marker(targetRelease),
            marker(family.github.target),
          ),
      );
      conditionalRepair = true;
    } else
      assert.deepEqual(
        marker(latest),
        marker(expectedGithub),
        "GitHub identity does not settle the original operation",
      );
    if (record.service === "github" && !conditionalRepair) {
      assert.deepEqual(
        marker(targetRelease),
        marker(family.github.target),
        "GitHub target classification has not settled the original effect",
      );
      assert.equal(targetRelease.immutable, true);
      assert.equal(targetRelease.draft, false);
    }
    if (latest) {
      assert.equal(latest.immutable, true);
      assert.equal(latest.draft, false);
    }
    return {
      state: conditionalRepair
        ? "family-conditional-repair-approved"
        : "family-effects-settled",
      operationId: family.operationId,
      packages: tags,
      github: marker(latest),
    };
  }
  assert.equal(
    tags.latest,
    record.targetVersion,
    "Unknown npm label effect has not been observed applied",
  );
  const githubLatest = latest?.tag_name ?? null;
  if (record.availability === "npm-only") {
    const guard = npmOnlyRecoveryGuard(record, records);
    assert.equal(
      githubLatest,
      record.expectedGithubLatest,
      "GitHub latest changed during npm-only recovery",
    );
    return {
      npmLatest: tags.latest,
      githubLatest,
      githubState: guard.githubState,
    };
  }
  assert.ok(
    !records.some((entry) => entry.guard?.availability === "npm-only"),
    "npm-only recovery requires explicit matching scope",
  );
  if (
    records.some((r) => r.operation === "github-latest") &&
    githubLatest !== `v${record.targetVersion}`
  ) {
    assert.equal(
      record.githubAction,
      "repair-current-label",
      "An unknown GitHub request requires explicit owner repair authority",
    );
    assert.ok(Object.hasOwn(record, "expectedGithubLatest"));
    assert.equal(
      githubLatest,
      record.expectedGithubLatest,
      "GitHub label changed since owner repair decision",
    );
  }
  return { npmLatest: tags.latest, githubLatest };
}
function reconcileOne(
  directory,
  scratch,
  env,
  record,
  prior,
  observeCurrent,
  readers,
) {
  const observe = readers.provider ?? provider,
    readNpm = readers.npmCommand ?? npmCommand,
    readLatest = readers.optionalApi ?? optionalApi;
  const current = verifyManifest(
    readJson(join(directory, "release-manifest.json")),
    { historical: readers.historical === true },
  );
  let release = current,
    manifestSha = env.MANIFEST_SHA;
  if (record.manifestSha256 !== manifestSha) {
    assert.equal(record.phase, "stage");
    assert.ok(
      ["abandon-family", "supersede"].includes(record.disposition),
      "Cross-version recovery requires explicit owner abandonment",
    );
    assert.match(record.manifestSha256, /^[a-f0-9]{64}$/u);
    const bytes = regularBytes(
      join(
        directory,
        "recovery-subjects",
        record.manifestSha256,
        "release-manifest.json",
      ),
    );
    assert.equal(sha256(bytes), record.manifestSha256);
    release = verifyManifest(JSON.parse(bytes), {
      historical: readers.historical === true,
    });
    assert.notEqual(release.version, current.version);
    manifestSha = record.manifestSha256;
  }
  const journal = regularBytes(
    join(directory, effectJournal(record.phase, record)),
  );
  const records = verifyRecoveryRecord(record, release, manifestSha, journal);
  const original = observe(record.run, record.attempt);
  assert.equal(String(original.run.id), String(record.run));
  assert.equal(String(original.run.run_attempt), String(record.attempt));
  assert.equal(original.run.status, "completed");
  assert.equal(original.run.repository.full_name, repository);
  assert.equal(original.run.head_repository.full_name, repository);
  assert.equal(
    original.run.path,
    `.github/workflows/${workflows[record.phase]}`,
  );
  assert.equal(original.run.event, "workflow_dispatch");
  assert.equal(original.run.head_branch, "main");
  const first = records[0];
  assert.equal(original.run.head_sha, first.controller);
  let observed;
  if (record.phase === "stage") {
    // Settle only attempted members. An abandoned family never supplies admission
    // for its missing members or authority to repeat any request.
    const stages = [];
    const attempted = requestedIntents(records);
    assert.equal(
      new Set(attempted.map((entry) => entry.package)).size,
      attempted.length,
    );
    assert.equal(
      record.stages?.length,
      attempted.length,
      "Owner must identify exactly the attempted native stages",
    );
    const nativeOutcome = existsSync(
      join(directory, "native-stage-outcome.json"),
    )
      ? readJson(join(directory, "native-stage-outcome.json"))
      : null;
    const coreOnly =
      attempted.length === 1 &&
      attempted[0].package === release.package &&
      nativeOutcome?.schemaVersion === 2;
    if (attempted.length !== 3 && !coreOnly)
      assert.ok(
        ["abandon-family", "supersede", "restore-labels"].includes(
          record.disposition,
        ),
        "A partial family requires explicit owner abandonment",
      );
    for (const intent of attempted) {
      const subject = releasePackages(release).find(
        (entry) => entry.package === intent.package,
      );
      const selected = record.stages.filter(
        (entry) => entry.package === subject.package,
      );
      assert.equal(selected.length, 1);
      // eslint-disable-next-line no-control-regex -- Reject provider identifier controls.
      assert.match(selected[0].stageId, /^[^\x00-\x1f]{1,256}$/u);
      const outcome = records[records.indexOf(intent) + 1];
      if (outcome?.state === "completed")
        assert.equal(
          selected[0].stageId,
          outcome.result.stageId,
          "Owner stage identity contradicts the original completed outcome",
        );
      if (
        ["supersede", "restore-labels"].includes(record.disposition) &&
        selected[0].settlement === "rejected"
      ) {
        const history = (readers.readHistoryRecord ?? readHistoryRecord)(
          record.cancellationCheckpoint,
        );
        assert.equal(history.schemaVersion, 2);
        const matches = history.stageCancellations?.filter(
          (item) => item.stageId === selected[0].stageId,
        );
        assert.equal(
          matches?.length,
          1,
          "Rejection requires native proof retained under an owner-signed history checkpoint",
        );
        verifyStageCancellation(matches[0], {
          run: String(record.run),
          attempt: String(record.attempt),
          manifestSha256: manifestSha,
          journalSha256: record.journalSha256,
          package: subject.package,
          version: release.version,
          integrity: subject.archive.integrity,
          stageId: selected[0].stageId,
        });
        stages.push({
          package: subject.package,
          stageId: selected[0].stageId,
          state: "rejected-confirmed",
          proofSha256: sha256(jsonBytes(matches[0])),
        });
        continue;
      }
      const metadata = npmViewObject(
        readNpm([
          "view",
          `${subject.package}@${release.version}`,
          "--json",
          "--registry=https://registry.npmjs.org/",
        ]),
      );
      assert.equal(metadata.dist.integrity, subject.archive.integrity);
      assert.equal(metadata.name, subject.package);
      assert.equal(metadata.version, release.version);
      assert.ok(
        metadata.dist.attestations?.url && metadata.dist.signatures?.length,
      );
      stages.push({
        package: subject.package,
        version: release.version,
        integrity: metadata.dist.integrity,
        stageId: selected[0].stageId,
        state: "public-observed-awaiting-qualification",
      });
    }
    assert.equal(
      new Set(stages.map((entry) => entry.stageId)).size,
      stages.length,
    );
    observed = { stages };
    if (["supersede", "restore-labels"].includes(record.disposition)) {
      assert.match(record.reviewSha256, /^[a-f0-9]{64}$/u);
      for (const [index, intent] of attempted.entries()) {
        assert.equal(
          intent.guard?.reviewSha256,
          record.reviewSha256,
          "Supersession must bind the actual original review",
        );
        if (stages[index].state === "rejected-confirmed") continue;
        const subject = releasePackages(release).find(
          (entry) => entry.package === intent.package,
        );
        const root = mkdtempSync(
          join(scratch, `superseded-recipient-${index}-`),
        );
        try {
          const isolation = isolatedNpmEnvironment(root);
          save(join(root, "package.json"), {
            private: true,
            dependencies: { [subject.package]: release.version },
          });
          // Inspect either native platform without running installation scripts or loading its binary.
          readNpm(
            [
              "install",
              "--force",
              "--ignore-scripts",
              "--no-audit",
              "--no-fund",
              "--registry=https://registry.npmjs.org/",
            ],
            { cwd: root, env: isolation },
          );
          const lock = readJson(join(root, "package-lock.json"));
          assert.equal(
            lock.packages[`node_modules/${subject.package}`].integrity,
            subject.archive.integrity,
          );
          const signatures = JSON.parse(
            readNpm(
              [
                "audit",
                "signatures",
                "--json",
                "--include-attestations",
                "--ignore-scripts",
                "--registry=https://registry.npmjs.org/",
              ],
              { cwd: root, env: isolation },
            ),
          );
          const origin = {
            run: intent.run,
            attempt: intent.attempt,
            controller: intent.controller,
          };
          verifyProvenance(signatures, { ...release, ...subject }, origin);
          const proof = {
            package: subject.package,
            integrity: subject.archive.integrity,
            origin,
            signatures,
          };
          const bytes = jsonBytes(proof),
            path = join(directory, `stage-settlement-${sha256(bytes)}.json`);
          if (!existsSync(path)) save(path, bytes);
          else assert.deepEqual(regularBytes(path), bytes);
          stages[index] = {
            ...stages[index],
            origin,
            state: "public-provenance-verified",
            proofSha256: sha256(bytes),
          };
        } finally {
          rmSync(root, { recursive: true, force: true });
        }
      }
      return {
        record,
        observed: {
          stages,
          state:
            record.disposition === "supersede"
              ? "superseded-family-reconciled"
              : "staged-labels-settled",
        },
        priorLabels: {},
      };
    }
    if (record.disposition === "abandon-family")
      return {
        record,
        observed: { ...observed, state: "abandoned-family-observed" },
        priorLabels: {},
      };
    if (coreOnly) {
      assert.equal(nativeOutcome.manifestSha256, manifestSha);
      assert.deepEqual(
        nativeOutcome.result.stages.map((entry) => entry.package).sort(),
        release.platformArchives.map((entry) => entry.package).sort(),
      );
      for (const subject of release.platformArchives) {
        const origin = nativeOutcome.origins[subject.package];
        assert.equal(origin.integrity, subject.archive.integrity);
        assert.equal(origin.run, nativeOutcome.origin.run);
        assert.equal(origin.attempt, nativeOutcome.origin.attempt);
        const originalJournal = regularBytes(
          join(directory, effectJournal("stage", origin)),
        );
        assert.equal(sha256(originalJournal), nativeOutcome.journalSha256);
      }
      stages.unshift(...nativeOutcome.result.stages);
    }
    assert.deepEqual(
      stages.map((entry) => entry.package),
      releasePackages(release).map((entry) => entry.package),
    );
    const context = readJson(join(directory, "context.json"));
    context.stage = {
      run: String(record.run),
      attempt: String(record.attempt),
      controller: first.controller,
      ...(coreOnly
        ? { phase: "core", reviewSha256: first.guard?.reviewSha256 }
        : {}),
    };
    if (coreOnly) {
      context.nativeStage = nativeOutcome.origin;
      context.packageOrigins = {
        ...nativeOutcome.origins,
        [release.package]: {
          ...context.stage,
          package: release.package,
          integrity: release.archive.integrity,
          stageId: stages.at(-1).stageId,
        },
      };
    }
    if (!existsSync(join(directory, "stage-outcome.json")))
      save(join(directory, "stage-outcome.json"), {
        schemaVersion: coreOnly ? 2 : 1,
        manifestSha256: env.MANIFEST_SHA,
        subject: {
          package: release.package,
          version: release.version,
          source: release.source.commit,
          integrity: release.archive.integrity,
        },
        result: {
          stageId: stages.at(-1).stageId,
          state: "public-observed-awaiting-qualification",
          stages,
        },
        origin: context.stage,
        ...(coreOnly ? { origins: context.packageOrigins } : {}),
        journalSha256: sha256(journal),
      });
    writeFileSync(join(directory, "context.json"), jsonBytes(context), {
      flush: true,
    });
  } else if (record.phase === "archive") {
    const readApi = readers.api ?? api,
      invoke = readers.gh ?? gh,
      verifyAssets = readers.verifyNativeAssets ?? verifyNativeAssets;
    const live = readApi(`releases/tags/v${release.version}`);
    assert.equal(live.immutable, true);
    assert.equal(live.draft, false);
    const intent = verifyArchiveIntent(directory, record, manifestSha);
    assert.deepEqual(
      live.assets.map((a) => a.name).sort(),
      intent.assets.map((a) => a.name).sort(),
    );
    invoke([
      "release",
      "download",
      `v${release.version}`,
      "--repo",
      repository,
      "--dir",
      scratch,
    ]);
    for (const asset of intent.assets) {
      const actual = live.assets.find((a) => a.name === asset.name);
      assert.equal(actual.digest, `sha256:${asset.sha256}`);
      assert.equal(actual.size, asset.size);
      const bytes = releaseArtifactBytes(join(scratch, asset.name));
      assert.equal(bytes.length, asset.size);
      assert.equal(sha256(bytes), asset.sha256);
    }
    verifyReleaseAttestation(
      {
        release,
        releaseId: live.id,
        prerelease: live.prerelease,
        assets: intent.assets,
        manifestSha,
        tagSha: readJson(join(directory, "signed-tag.json")).reference.object
          .sha,
      },
      { observe: readers.observeReleaseAttestation, verify: invoke },
    );
    const attestations = verifyAssets(release.version, scratch, intent.assets);
    if (existsSync(join(directory, "archive-outcome.json"))) {
      const archived = readJson(join(directory, "archive-outcome.json"));
      assert.equal(archived.manifestSha256, env.MANIFEST_SHA);
      assert.equal(archived.release.id, live.id);
      assert.deepEqual(archived.assets, intent.assets);
    } else
      save(join(directory, "archive-outcome.json"), {
        schemaVersion: 1,
        manifestSha256: env.MANIFEST_SHA,
        release: live,
        assets: intent.assets,
      });
    const context = readJson(join(directory, "context.json"));
    context.archive = {
      run: String(record.run),
      attempt: String(record.attempt),
      controller: first.controller,
    };
    writeFileSync(join(directory, "context.json"), jsonBytes(context), {
      flush: true,
    });
    observed = {
      immutableRelease: live.id,
      assets: intent.assets,
      attestations,
    };
    const classification = records.findLast(
      (entry) =>
        entry.state === "intent" && entry.operation === "github-classification",
    );
    const classificationOutcome =
      classification && records[records.indexOf(classification) + 1];
    if (
      classification &&
      (!classificationOutcome ||
        classificationOutcome.state === "outcome-unknown")
    ) {
      const latest = readLatest("releases/latest"),
        marker = (value) =>
          value
            ? {
                id: value.id,
                tag_name: value.tag_name,
                prerelease: value.prerelease,
              }
            : null;
      if (live.prerelease === false && latest?.id === live.id)
        observed.classification = {
          state: "applied-observed",
          latest: marker(latest),
          releaseId: live.id,
        };
      else {
        assert.equal(
          record.githubAction,
          "repair-current-label",
          "Unknown classification requires applied readback or an explicit owner conditional repair",
        );
        assert.ok(Object.hasOwn(record, "expectedGithubLatest"));
        assert.deepEqual(marker(latest), record.expectedGithubLatest);
        assert.deepEqual(marker(latest), classification.before);
        assert.equal(live.prerelease, true);
        observed.classification = {
          state: "conditional-repair-approved",
          latest: marker(latest),
          releaseId: live.id,
          originalOutcome: "unknown",
        };
      }
    }
  } else if (observeCurrent) {
    const family = records[0].guard?.family;
    if (family) {
      verifyFamilyScope(family, release);
      assert.equal(record.operationId, family.operationId);
      const operation = regularBytes(
        join(
          directory,
          "recovery-operations",
          family.operationId,
          "availability-operation.json",
        ),
      );
      assert.equal(
        sha256(operation),
        family.operationId,
        "Original operation bytes are required to settle unknown effects",
      );
      assert.deepEqual(
        { ...JSON.parse(operation).family, operationId: family.operationId },
        family,
      );
      for (const intent of records.filter((entry) => entry.state === "intent"))
        assert.deepEqual(intent.guard.family, family);
    }
    const readTags = (packageName) =>
      npmViewObject(
        readNpm([
          "view",
          packageName,
          "dist-tags",
          "--json",
          "--registry=https://registry.npmjs.org/",
        ]),
      );
    const tags = family
      ? Object.fromEntries(
          family.subjects.map((subject) => [
            subject.package,
            readTags(subject.package),
          ]),
        )
      : readTags(release.package);
    const latest = readLatest("releases/latest");
    const targetRelease =
      family && record.service === "github"
        ? (readers.api ?? api)(`releases/${family.github.target.id}`)
        : undefined;
    observed = reconcilePromotionLabels(
      record,
      records,
      tags,
      latest,
      targetRelease,
    );
  } else observed = { state: "retained-original" };
  const priorLabels = {};
  if (record.phase === "promote") {
    if (prior) {
      assert.equal(prior.record.targetVersion, record.targetVersion);
      Object.assign(priorLabels, prior.priorLabels);
    }
    if (record.service) {
      const intents = records.filter((entry) => entry.state === "intent");
      const original = intents[0].guard;
      if (original.family)
        return { record, observed, priorLabels: original.family };
      assert.equal(original.availability, record.availability);
      assert.equal(original.targetVersion, record.targetVersion);
      assert.ok(
        Object.hasOwn(original.priorLabels, "latest") &&
          Object.hasOwn(original.priorLabels, "githubLatest"),
      );
      for (const intent of intents)
        assert.deepEqual(intent.guard.priorLabels, original.priorLabels);
      for (const [key, value] of Object.entries(priorLabels))
        assert.equal(original.priorLabels[key], value);
      Object.assign(priorLabels, original.priorLabels);
    }
    for (const intent of records.filter((value) => value.state === "intent")) {
      if (
        intent.operation === "npm-latest" &&
        !Object.hasOwn(priorLabels, "latest")
      )
        priorLabels.latest = intent.before;
      if (
        intent.operation === "github-latest" &&
        !Object.hasOwn(priorLabels, "githubLatest")
      )
        priorLabels.githubLatest = intent.before;
    }
    if (record.availability === "npm-only") {
      const guard = npmOnlyRecoveryGuard(record, records);
      if (!Object.hasOwn(priorLabels, "githubLatest"))
        priorLabels.githubLatest = guard.githubState.latest?.tag_name ?? null;
    }
  }
  return { record, observed, priorLabels };
}
