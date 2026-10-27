// SPDX-License-Identifier: AGPL-3.0-only
/** Owner-selected readback reconciliation. It grants no replay of an unknown request. */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
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
  releaseArtifactBytes,
} from "./release-contract.js";
import { api, gh, provider, optionalApi } from "./release-provider.js";
import { npmCommand } from "./qualification-process.js";
import { verifyNativeAssets } from "./release-asset-verification.js";

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
    assert.equal(intent.run, String(record.run));
    assert.equal(intent.attempt, String(record.attempt));
    assert.equal(intent.manifestSha256, manifestSha);
    const subject =
      record.phase === "stage"
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
            intent.operation.startsWith("upload:")
          : ["npm-latest", "github-latest", "completion-readback"].includes(
              intent.operation,
            ),
    );
    if (outcome) {
      assert.equal(
        outcome.intentSha256,
        sha256(Buffer.from(JSON.stringify(intent) + "\n")),
      );
      assert.ok(["completed", "outcome-unknown"].includes(outcome.state));
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
    key = (value) => `${value.phase}:${value.run}:${value.attempt}`;
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
      record.run === selected.run && record.attempt === selected.attempt;
    const root = join(scratch, `${phase}-${record.run}-${record.attempt}`);
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
export function reconcilePromotionLabels(record, records, tags, latest) {
  assert.equal(
    tags.latest,
    record.targetVersion,
    "Unknown npm label effect has not been observed applied",
  );
  const githubLatest = latest?.tag_name ?? null;
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
  );
  let release = current,
    manifestSha = env.MANIFEST_SHA;
  if (record.manifestSha256 !== manifestSha) {
    assert.equal(record.phase, "stage");
    assert.equal(
      record.disposition,
      "abandon-family",
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
    release = verifyManifest(JSON.parse(bytes));
    assert.notEqual(release.version, current.version);
    manifestSha = record.manifestSha256;
  }
  const journal = regularBytes(
    join(directory, effectJournal(record.phase, record)),
  );
  const records = verifyRecoveryRecord(record, release, manifestSha, journal);
  const original = observe(record.run, record.attempt);
  assert.equal(original.run.status, "completed");
  const first = records[0];
  assert.equal(original.run.head_sha, first.controller);
  let observed;
  if (record.phase === "stage") {
    // Settle only attempted members. An abandoned family never supplies admission
    // for its missing members or authority to repeat any request.
    const stages = [];
    const attempted = records.filter((entry) => entry.state === "intent");
    assert.equal(
      new Set(attempted.map((entry) => entry.package)).size,
      attempted.length,
    );
    assert.equal(
      record.stages?.length,
      attempted.length,
      "Owner must identify exactly the attempted native stages",
    );
    if (attempted.length !== 3)
      assert.equal(
        record.disposition,
        "abandon-family",
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
    if (record.disposition === "abandon-family")
      return {
        record,
        observed: { ...observed, state: "abandoned-family-observed" },
        priorLabels: {},
      };
    assert.deepEqual(
      stages.map((entry) => entry.package),
      releasePackages(release).map((entry) => entry.package),
    );
    const context = readJson(join(directory, "context.json"));
    context.stage = {
      run: String(record.run),
      attempt: String(record.attempt),
      controller: first.controller,
    };
    if (!existsSync(join(directory, "stage-outcome.json")))
      save(join(directory, "stage-outcome.json"), {
        schemaVersion: 1,
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
    const attestations = verifyAssets(release.version, scratch, intent.assets);
    invoke([
      "release",
      "verify",
      `v${release.version}`,
      "--repo",
      repository,
      "--format",
      "json",
    ]);
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
  } else if (observeCurrent) {
    const tags = npmViewObject(
      readNpm([
        "view",
        release.package,
        "dist-tags",
        "--json",
        "--registry=https://registry.npmjs.org/",
      ]),
    );
    const latest = readLatest("releases/latest");
    observed = reconcilePromotionLabels(record, records, tags, latest);
  } else observed = { state: "retained-original" };
  const priorLabels = {};
  if (record.phase === "promote") {
    if (prior) {
      assert.equal(prior.record.targetVersion, record.targetVersion);
      Object.assign(priorLabels, prior.priorLabels);
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
  }
  return { record, observed, priorLabels };
}
