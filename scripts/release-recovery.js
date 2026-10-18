// SPDX-License-Identifier: AGPL-3.0-only
/** Owner-selected readback reconciliation. It grants no replay of an unknown request. */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  jsonBytes,
  readJson,
  regularBytes,
  repository,
  save,
  sha256,
  verifyManifest,
  effectJournal,
  retainedRecoveries,
} from "./release-contract.js";
import { api, gh, provider, optionalApi } from "./release-provider.js";
import { npmCommand } from "./qualification-process.js";

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
    assert.equal(intent.package, release.package);
    assert.equal(intent.version, release.version);
    assert.equal(intent.source, release.source.commit);
    assert.equal(intent.integrity, release.archive.integrity);
    assert.match(intent.controller, /^[a-f0-9]{40}$/u);
    assert.ok(
      record.phase === "stage"
        ? intent.operation === "stage"
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
  const release = verifyManifest(
    readJson(join(directory, "release-manifest.json")),
  );
  const journal = regularBytes(
    join(directory, effectJournal(record.phase, record)),
  );
  const records = verifyRecoveryRecord(
    record,
    release,
    env.MANIFEST_SHA,
    journal,
  );
  const original = observe(record.run, record.attempt);
  assert.equal(original.run.status, "completed");
  const first = records[0];
  assert.equal(original.run.head_sha, first.controller);
  let observed;
  if (record.phase === "stage") {
    assert.ok(
      typeof record.stageId === "string" &&
        /^[^\x00-\x1f]{1,256}$/u.test(record.stageId),
    );
    const metadata = JSON.parse(
      readNpm([
        "view",
        `${release.package}@${release.version}`,
        "--json",
        "--registry=https://registry.npmjs.org/",
      ]),
    );
    assert.equal(metadata.dist.integrity, release.archive.integrity);
    assert.equal(metadata.name, release.package);
    assert.equal(metadata.version, release.version);
    assert.ok(
      metadata.dist.attestations?.url && metadata.dist.signatures?.length,
    );
    observed = {
      publicVersion: metadata.version,
      integrity: metadata.dist.integrity,
    };
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
          stageId: record.stageId,
          state: "public-observed-awaiting-qualification",
        },
        origin: context.stage,
        journalSha256: sha256(journal),
      });
    writeFileSync(join(directory, "context.json"), jsonBytes(context), {
      flush: true,
    });
  } else if (record.phase === "archive") {
    const live = api(`releases/tags/v${release.version}`);
    assert.equal(live.immutable, true);
    assert.equal(live.draft, false);
    const intent = readJson(join(directory, "archive-assets-intent.json"));
    assert.deepEqual(
      live.assets.map((a) => a.name).sort(),
      intent.assets.map((a) => a.name).sort(),
    );
    for (const asset of intent.assets) {
      const actual = live.assets.find((a) => a.name === asset.name);
      assert.equal(actual.digest, `sha256:${asset.sha256}`);
      assert.equal(actual.size, asset.size);
      gh([
        "release",
        "download",
        `v${release.version}`,
        "--repo",
        repository,
        "--pattern",
        asset.name,
        "--dir",
        scratch,
      ]);
      assert.equal(
        sha256(regularBytes(join(scratch, asset.name))),
        asset.sha256,
      );
      gh([
        "release",
        "verify-asset",
        `v${release.version}`,
        join(scratch, asset.name),
        "--repo",
        repository,
        "--format",
        "json",
      ]);
    }
    gh([
      "release",
      "verify",
      `v${release.version}`,
      "--repo",
      repository,
      "--format",
      "json",
    ]);
    if (!existsSync(join(directory, "archive-outcome.json")))
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
    observed = { immutableRelease: live.id, assets: intent.assets };
  } else if (observeCurrent) {
    const tags = JSON.parse(
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
