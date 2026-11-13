// SPDX-License-Identifier: AGPL-3.0-only
/** Owner-invoked local rejection. Never invoked by CI or by release admission. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { appendFileSync, existsSync } from "node:fs";
import {
  regularBytes,
  releaseArtifactBytes,
  verifyArchive,
  readJson,
  save,
  sha256,
  effectJournal,
  releasePackages,
  verifyManifest,
} from "./release-contract.js";
import { readHistoryRecord } from "./release-provider.js";
import { npmCommand } from "./qualification-process.js";
import { writeQualifiedTargetBundle } from "./release-history-targets.js";

/** Native rejection acknowledgement and authenticated complete inventory, under owner signature. */
export function verifyStageCancellation(certificate, expected) {
  assert.equal(certificate.schemaVersion, 1);
  for (const [key, value] of Object.entries(expected))
    assert.deepEqual(certificate[key], value);
  assert.match(certificate.stageId, /^[a-f0-9-]{36}$/iu);
  assert.equal(
    certificate.acknowledgement.trim(),
    `Staged package ${certificate.stageId} has been rejected.`,
  );
  assert.ok(
    certificate.authenticatedAs &&
      Number.isFinite(Date.parse(certificate.observedAt)),
  );
  assert.equal(certificate.authenticatedAs.toLowerCase(), "maksymshostak");
  assert.ok(Array.isArray(certificate.inventory));
  assert.ok(
    !certificate.inventory.some(
      (item) =>
        item.id === certificate.stageId ||
        (item.packageName === certificate.package &&
          item.version === certificate.version),
    ),
    "Rejected request remains in native stage inventory",
  );
  return certificate;
}

/** Calling this command is a separate, explicit owner rejection operation requiring npm 2FA. */
export function rejectReleaseStages(
  directory,
  decision,
  output,
  invoke = npmCommand,
  history = readHistoryRecord,
  environment = process.env,
) {
  assert.equal(decision.owner, "maksymshostak");
  assert.equal(decision.action, "reject-original-stages");
  const manifest = regularBytes(join(directory, "release-manifest.json")),
    release = verifyManifest(JSON.parse(manifest));
  assert.equal(sha256(manifest), decision.manifestSha256);
  const bytes = regularBytes(join(directory, effectJournal("stage", decision)));
  assert.equal(sha256(bytes), decision.journalSha256);
  const records = bytes.toString("utf8").trim().split("\n").map(JSON.parse);
  const intents = records.filter(
    (entry, index) =>
      index % 2 === 0 && records[index + 1]?.state !== "request-not-sent",
  );
  assert.ok(
    Array.isArray(decision.stages) &&
      decision.stages.length > 0 &&
      decision.stages.length <= intents.length,
  );
  assert.equal(
    new Set(decision.stages.map((entry) => entry.package)).size,
    decision.stages.length,
  );
  assert.equal(
    new Set(decision.stages.map((entry) => entry.stageId)).size,
    decision.stages.length,
  );
  const prior = history(decision.historyCheckpoint);
  assert.equal(prior.schemaVersion, 2);
  const logPath = output + ".jsonl",
    retained = existsSync(logPath)
      ? regularBytes(logPath)
          .toString("utf8")
          .trim()
          .split("\n")
          .map(JSON.parse)
      : [];
  const requested = decision.stages.map((selected) => {
    assert.match(selected.stageId, /^[a-f0-9-]{36}$/iu);
    const matches = intents.filter(
      (entry) => entry.package === selected.package,
    );
    assert.equal(matches.length, 1);
    const intent = matches[0],
      outcome = records[records.indexOf(intent) + 1];
    if (outcome?.state === "completed")
      assert.equal(
        outcome.result.stageId,
        selected.stageId,
        "Rejected stage differs from original acknowledgement",
      );
    const subject = releasePackages(release).find(
      (entry) => entry.package === intent.package,
    );
    assert.ok(subject);
    assert.equal(intent.integrity, subject.archive.integrity);
    assert.equal(intent.version, release.version);
    assert.equal(intent.manifestSha256, decision.manifestSha256);
    const expected = {
      run: String(decision.run),
      attempt: String(decision.attempt),
      manifestSha256: decision.manifestSha256,
      journalSha256: decision.journalSha256,
      package: intent.package,
      version: intent.version,
      integrity: intent.integrity,
      stageId: selected.stageId,
    };
    const previous = retained.filter(
      (entry) =>
        entry.stageId === selected.stageId ||
        entry.certificate?.stageId === selected.stageId,
    );
    for (const entry of previous)
      assert.deepEqual(
        entry.expected ??
          Object.fromEntries(
            Object.keys(expected).map((key) => [key, entry.certificate[key]]),
          ),
        expected,
      );
    const confirmed = previous.find(
      (entry) => entry.state === "rejected-confirmed",
    )?.certificate;
    if (confirmed) verifyStageCancellation(confirmed, expected);
    const acknowledged = previous.find(
      (entry) => entry.state === "rejection-acknowledged",
    );
    assert.ok(
      !previous.some((entry) => entry.state === "intent") ||
        acknowledged ||
        confirmed,
      "Original rejection outcome is unknown; reconcile it without repeating DELETE",
    );
    return { subject, intent, expected, confirmed, acknowledged };
  });
  const call = (args) => invoke(args, { env: environment });
  assert.equal(
    call(["--version"]).trim(),
    readJson(new URL("../assets/node-support.json", import.meta.url))
      .producerNpm.version,
    "Select the pinned producer npm before owner rejection",
  );
  const authenticatedAs = call([
    "whoami",
    "--registry=https://registry.npmjs.org/",
  ]).trim();
  assert.equal(authenticatedAs.toLowerCase(), "maksymshostak");
  // Native npm's captured-output process cannot prompt. The owner supplies a current OTP via the environment; never place it in arguments or retained evidence.
  if (requested.some((entry) => !entry.confirmed && !entry.acknowledged))
    assert.match(
      environment.NPM_CONFIG_OTP ?? "",
      /^\d{6,8}$/u,
      "Provide a current owner OTP in NPM_CONFIG_OTP; no interactive challenge is available in this captured-output route",
    );
  // Validate every new request before the first DELETE, including actual >20MB package bytes.
  for (const item of requested.filter(
    (entry) => !entry.confirmed && !entry.acknowledged,
  )) {
    const view = JSON.parse(
      call([
        "stage",
        "view",
        item.expected.stageId,
        "--json",
        "--registry=https://registry.npmjs.org/",
      ]),
    );
    assert.equal(view.id, item.expected.stageId);
    assert.equal(view.packageName, item.intent.package);
    assert.equal(view.version, item.intent.version);
    const tarball = releaseArtifactBytes(
      join(directory, item.subject.archive.filename),
    );
    verifyArchive(tarball, item.subject.archive);
    assert.equal(view.shasum, createHash("sha1").update(tarball).digest("hex"));
    item.view = view;
  }
  const certificates = [];
  const append = (entry) =>
    appendFileSync(logPath, JSON.stringify(entry) + "\n", { flush: true });
  for (const item of requested) {
    if (item.confirmed) {
      certificates.push(item.confirmed);
      continue;
    }
    let acknowledgement = item.acknowledged?.acknowledgement;
    if (!acknowledgement) {
      append({
        state: "intent",
        stageId: item.expected.stageId,
        expected: item.expected,
        view: item.view,
      });
      acknowledgement = invoke(
        [
          "stage",
          "reject",
          item.expected.stageId,
          "--fetch-retries=0",
          "--registry=https://registry.npmjs.org/",
        ],
        { env: { ...environment, NPM_CONFIG_OTP: environment.NPM_CONFIG_OTP } },
      );
      assert.equal(
        acknowledgement.trim(),
        `Staged package ${item.expected.stageId} has been rejected.`,
      );
      append({
        state: "rejection-acknowledged",
        stageId: item.expected.stageId,
        expected: item.expected,
        acknowledgement,
      });
    }
    const inventory = JSON.parse(
      call([
        "stage",
        "list",
        item.intent.package,
        "--json",
        "--registry=https://registry.npmjs.org/",
      ]),
    );
    const certificate = {
      schemaVersion: 1,
      ...item.expected,
      acknowledgement,
      inventory,
      authenticatedAs,
      observedAt: new Date().toISOString(),
    };
    verifyStageCancellation(certificate, item.expected);
    append({ state: "rejected-confirmed", certificate });
    certificates.push(certificate);
  }
  const stageCancellations = [...(prior.stageCancellations ?? [])];
  for (const certificate of certificates) {
    const existing = stageCancellations.filter(
      (entry) => entry.stageId === certificate.stageId,
    );
    assert.ok(existing.length <= 1);
    if (existing.length) assert.deepEqual(existing[0], certificate);
    else stageCancellations.push(certificate);
  }
  const prepared = {
    ...prior,
    stageCancellations,
    qualifiedTargetRefs: writeQualifiedTargetBundle(dirname(output), prior),
  };
  delete prepared.qualifiedTargets;
  if (existsSync(output)) assert.deepEqual(readJson(output), prepared);
  else save(output, prepared);
  return {
    state: "awaiting-owner-signature",
    output,
    nextAction:
      "Sign the full exact history bundle under a fresh release-history tag before supersession admission",
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 5);
  rejectReleaseStages(
    process.argv[2],
    readJson(process.argv[3]),
    process.argv[4],
  );
}
