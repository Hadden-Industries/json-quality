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
export function reconcileObserved(directory, scratch, env = process.env) {
  const explicit = env.RECOVERY_JSON ? JSON.parse(env.RECOVERY_JSON) : null;
  if (explicit)
    assert.ok(["stage", "archive", "promote"].includes(explicit.phase));
  const result = { entries: [] };
  for (const phase of ["stage", "archive", "promote"]) {
    const path = join(directory, `recovery-${phase}.json`);
    const record =
      explicit?.phase === phase
        ? explicit
        : existsSync(path)
          ? readJson(path)
          : null;
    if (!record) continue;
    const root = join(scratch, phase);
    mkdirSync(root, { recursive: true });
    const entry = reconcileOne(directory, root, env, record, path);
    result.entries.push(entry);
    result[phase] = entry;
  }
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
function reconcileOne(directory, scratch, env, record, path) {
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
  const original = provider(record.run, record.attempt);
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
      npmCommand([
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
  } else {
    const tags = JSON.parse(
      npmCommand([
        "view",
        release.package,
        "dist-tags",
        "--json",
        "--registry=https://registry.npmjs.org/",
      ]),
    );
    const latest = optionalApi("releases/latest");
    observed = reconcilePromotionLabels(record, records, tags, latest);
  }
  if (
    env.RECOVERY_JSON &&
    JSON.parse(env.RECOVERY_JSON).phase === record.phase
  ) {
    if (existsSync(path))
      assert.equal(
        sha256(regularBytes(path)),
        sha256(jsonBytes(record)),
        "A retained recovery cannot be replaced",
      );
    else save(path, record);
  }
  return { record, observed };
}
