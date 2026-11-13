// SPDX-License-Identifier: AGPL-3.0-only
/** Public qualification checkpoint validation has no provider or command dependencies. */
import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import { requestedIntents } from "./release-records.js";
import {
  verifyLane,
  verifySecurity,
} from "./release-qualification-contract.js";
import {
  sha256,
  verifyManifest,
  verifyRun,
  lanes,
  safeMember,
  releasePackages,
  publicationOrigin,
  verifyProvenance,
  effectJournal,
} from "./release-contract.js";

/** Only a natively owner-signed checkpoint may supply these records after provider expiry. */
export function verifyQualifiedTarget(record, expected) {
  assert.equal(record.schemaVersion, 1);
  assert.equal(record.version, expected.version);
  assert.equal(record.manifestSha256, expected.manifestSha256);
  const manifest = Buffer.from(record.manifest, "base64");
  assert.equal(sha256(manifest), expected.manifestSha256);
  const release = verifyManifest(JSON.parse(manifest));
  assert.equal(release.version, record.version);
  assert.equal(release.source.commit, record.source);
  assert.equal(record.release.id, expected.releaseId);
  assert.equal(record.release.tag_name, `v${release.version}`);
  assert.equal(record.release.immutable, true);
  assert.equal(record.tag.reference.object.sha, record.tag.annotation.sha);
  assert.equal(record.tag.annotation.object.sha, release.source.commit);
  const proof = record.qualification;
  assert.ok(
    proof && Array.isArray(proof.providers) && Array.isArray(proof.files),
  );
  assert.ok(proof.files.length > 0 && proof.files.length <= 4096);
  assert.equal(
    new Set(proof.files.map((file) => file.name)).size,
    proof.files.length,
  );
  const files = new Map(
    proof.files.map((file) => {
      safeMember(file.name);
      const bytes = Buffer.from(file.bytes, "base64");
      assert.equal(bytes.length, file.size);
      assert.equal(sha256(bytes), file.sha256);
      return [file.name, bytes];
    }),
  );
  const context = JSON.parse(files.get("context.json"));
  if (files.has("signed-tag.json"))
    assert.equal(
      JSON.parse(files.get("signed-tag.json")).reference.object.sha,
      record.tag.reference.object.sha,
      "Retained tag object differs from original admission",
    );
  assert.deepEqual(context.registry, proof.origin);
  const registry = proof.providers.filter(
    (value) => value.phase === "registry",
  );
  assert.equal(registry.length, 1);
  verifyRun(
    registry[0].provider,
    "registry",
    proof.origin.controller,
    release.matrix,
  );
  assert.equal(registry[0].provider.run.id, Number(proof.origin.run));
  assert.equal(
    registry[0].provider.run.run_attempt,
    Number(proof.origin.attempt),
  );
  for (const [phase, origin] of [
    ["qualification", context.qualification],
    ["stage", context.nativeStage],
    ["stage", context.stage],
    ["archive", context.archive],
  ]) {
    if (!origin) continue;
    const matches = proof.providers.filter(
      (item) =>
        item.phase === phase &&
        item.origin.run === origin.run &&
        item.origin.attempt === origin.attempt,
    );
    assert.ok(
      matches.length > 0,
      `Missing original ${phase} provider inventory`,
    );
    for (const item of matches) {
      assert.deepEqual(item.origin, origin);
      assert.equal(item.provider.run.id, Number(origin.run));
      assert.equal(item.provider.run.run_attempt, Number(origin.attempt));
      let reconciled = false;
      if (
        ["stage", "archive"].includes(phase) &&
        item.provider.run.conclusion !== "success"
      ) {
        assert.ok(
          files.has("recovery-observations.json") &&
            files.has("recovery-records.json"),
          "Failed original writer requires retained native settlement",
        );
        const settled = JSON.parse(
          files.get("recovery-observations.json"),
        ).filter(
          ({ record: decision }) =>
            decision.phase === phase &&
            decision.run === origin.run &&
            decision.attempt === origin.attempt,
        );
        assert.equal(settled.length, 1);
        const { record: decision, observed } = settled[0];
        assert.equal(decision.owner, "maksymshostak");
        assert.equal(decision.version, release.version);
        assert.equal(decision.manifestSha256, expected.manifestSha256);
        assert.ok(
          JSON.parse(files.get("recovery-records.json")).some((entry) =>
            isDeepStrictEqual(entry, decision),
          ),
        );
        const journal = files.get(effectJournal(phase, origin));
        assert.ok(journal);
        assert.equal(sha256(journal), decision.journalSha256);
        const intents = requestedIntents(
          journal.toString("utf8").trim().split("\n").map(JSON.parse),
        );
        for (const intent of intents) {
          assert.equal(intent.run, origin.run);
          assert.equal(intent.attempt, origin.attempt);
          assert.equal(intent.controller, item.provider.run.head_sha);
          assert.equal(intent.manifestSha256, expected.manifestSha256);
        }
        if (phase === "stage")
          for (const intent of intents) {
            const actual = observed.stages.filter(
              (entry) => entry.package === intent.package,
            );
            assert.equal(actual.length, 1);
            assert.equal(actual[0].version, release.version);
            assert.equal(actual[0].integrity, intent.integrity);
            assert.equal(
              actual[0].stageId,
              decision.stages.find((entry) => entry.package === intent.package)
                ?.stageId,
            );
          }
        else {
          assert.equal(decision.disposition, "complete-read-only");
          assert.ok(
            files.has("archive-assets-intent.json"),
            "Signed archive settlement lacks original assets intent",
          );
          assert.equal(
            sha256(files.get("archive-assets-intent.json")),
            decision.assetsIntentSha256,
          );
          assert.equal(observed.immutableRelease, record.release.id);
          assert.deepEqual(
            observed.assets
              .map(({ name, sha256: digest, size }) => ({
                name,
                digest: `sha256:${digest}`,
                size,
              }))
              .sort((a, b) => a.name.localeCompare(b.name)),
            [...record.release.assets].sort((a, b) =>
              a.name.localeCompare(b.name),
            ),
          );
        }
        if (
          phase === "archive" &&
          intents.some((intent) => intent.operation === "github-classification")
        ) {
          const lines = journal
              .toString("utf8")
              .trim()
              .split("\n")
              .map(JSON.parse),
            outcome =
              lines[
                lines.findIndex(
                  (entry) =>
                    entry.state === "intent" &&
                    entry.operation === "github-classification",
                ) + 1
              ];
          if (!outcome || outcome.state === "outcome-unknown") {
            assert.ok(
              ["applied-observed", "conditional-repair-approved"].includes(
                observed.classification?.state,
              ),
              "Unknown archive classification requires its own native settlement",
            );
            assert.equal(observed.classification.releaseId, record.release.id);
            if (
              observed.classification.state === "conditional-repair-approved"
            ) {
              assert.equal(decision.githubAction, "repair-current-label");
              assert.deepEqual(
                observed.classification.latest,
                decision.expectedGithubLatest,
              );
            } else
              assert.equal(
                observed.classification.latest.id,
                record.release.id,
              );
          }
        }
        reconciled = true;
      }
      verifyRun(
        item.provider,
        phase,
        origin.controller ?? release.source.commit,
        release.matrix,
        {
          stagePhase: phase === "stage" ? origin.phase : undefined,
          reconciled,
        },
      );
    }
  }
  const artifactIds = new Set();
  for (const artifact of proof.artifacts) {
    assert.equal(artifact.run, Number(proof.origin.run));
    assert.ok(
      Number.isSafeInteger(artifact.id) &&
        artifact.id > 0 &&
        !artifactIds.has(artifact.id),
    );
    artifactIds.add(artifact.id);
    assert.match(artifact.digest, /^sha256:[a-f0-9]{64}$/u);
    assert.ok(
      Number.isSafeInteger(artifact.attempt) &&
        artifact.attempt > 0 &&
        artifact.attempt <= Number(proof.origin.attempt),
    );
    const producer =
      artifact.attempt === Number(proof.origin.attempt)
        ? registry[0].provider
        : proof.providers.find(
            (item) =>
              item.phase === "registry-attempt" &&
              item.provider.run.id === artifact.run &&
              item.provider.run.run_attempt === artifact.attempt,
          )?.provider;
    assert.ok(
      producer,
      "Original public artifact attempt inventory is missing",
    );
    assert.equal(producer.run.head_sha, proof.origin.controller);
    assert.equal(
      producer.run.repository.full_name,
      "Hadden-Industries/json-quality",
    );
    const jobName = artifact.name.startsWith("public-security-")
      ? "security"
      : artifact.name.replace(
          /^registry-(.+)-(\d+\.\d+\.\d+)-\d+(?:-recovery-[23])?$/u,
          "registry ($1, $2)",
        );
    const jobs = producer.jobs.jobs.filter((job) => job.name === jobName);
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].conclusion, "success");
    assert.equal(jobs[0].status, "completed");
    assert.equal(jobs[0].run_id, artifact.run);
    assert.equal(jobs[0].run_attempt, artifact.attempt);
    assert.equal(jobs[0].head_sha, proof.origin.controller);
    const original = context.artifacts.filter(
      (value) => value.name === artifact.name,
    );
    if (artifact.name.startsWith("registry-") || original.length) {
      assert.equal(original.length, 1);
      assert.deepEqual(
        artifact,
        original[0],
        "Public artifact identity differs from original qualification context",
      );
    }
  }
  assert.equal(
    proof.artifacts.length,
    lanes(release.matrix).length + 1,
    "Missing original public qualification artifacts",
  );
  const security = proof.artifacts.filter((artifact) =>
    artifact.name.startsWith("public-security-"),
  );
  assert.equal(
    security.length,
    1,
    "Original public security artifact is required",
  );
  assert.ok(
    files.has("public-security.json"),
    "Original public security bytes are required",
  );
  verifySecurity(
    JSON.parse(files.get("public-security.json")),
    release,
    expected.manifestSha256,
    proof.origin.run,
    String(security[0].attempt),
  );
  for (const lane of lanes(release.matrix)) {
    const prefix = `public-${lane.os}-${lane.node}/`;
    const virtual = (path) => {
      const bytes = files.get(path.replaceAll("\\", "/"));
      assert.ok(bytes, `Missing retained qualification file ${path}`);
      return bytes;
    };
    verifyLane(prefix.slice(0, -1), release, lane, "public registry", {
      read: (path) => JSON.parse(virtual(path)),
      bytes: virtual,
    });
    for (const subject of releasePackages(release)) {
      const name = subject.platform
        ? `registry-metadata-${subject.platform}.json`
        : "registry-metadata.json";
      const metadata = JSON.parse(virtual(prefix + name));
      assert.equal(metadata.name, subject.package);
      assert.equal(metadata.version, release.version);
      assert.equal(metadata.dist.integrity, subject.archive.integrity);
    }
    const publication = JSON.parse(files.get(prefix + "publication.json"));
    assert.deepEqual(publication.release, release);
    for (const layout of ["root", "isolated"]) {
      for (const name of [
        `${layout}-result.json`,
        `${layout}-lock.json`,
        `${layout}-signatures.json`,
        `${layout}-inventory.json`,
        `${layout}-audit.json`,
      ])
        assert.ok(
          files.has(prefix + name),
          `Missing retained target evidence ${prefix + name}`,
        );
      const signatures = JSON.parse(
        files.get(prefix + `${layout}-signatures.json`),
      );
      const platform = lane.os.startsWith("windows")
        ? "win32-x64"
        : "linux-x64";
      for (const subject of releasePackages(release).filter(
        (value) => !value.platform || value.platform === platform,
      ))
        verifyProvenance(
          signatures,
          { ...release, ...subject },
          publicationOrigin(publication, subject),
        );
    }
    assert.equal(
      proof.artifacts.filter(
        (artifact) =>
          artifact.name ===
            `registry-${lane.os}-${lane.node}-${artifact.attempt}` ||
          artifact.name.startsWith(
            `registry-${lane.os}-${lane.node}-${artifact.attempt}-recovery-`,
          ),
      ).length,
      1,
    );
  }
  return { release, context, files, providers: proof.providers };
}

/** Compact closure is emitted only alongside a fully verified target by the checkpoint writer. */
export function qualifiedStageSummaries(record) {
  const { files, context, release } = verifyQualifiedTarget(record, {
    version: record.version,
    manifestSha256: record.manifestSha256,
    releaseId: record.release.id,
  });
  const names = new Set(
    [context.nativeStage, context.stage]
      .filter(Boolean)
      .map((origin) => effectJournal("stage", origin)),
  );
  return [...files]
    .filter(([name]) => names.has(name))
    .map(([, journal]) => {
      const intents = requestedIntents(
        journal.toString().trim().split("\n").map(JSON.parse),
      );
      if (!intents.length) return null;
      for (const intent of intents) {
        assert.equal(intent.version, record.version);
        assert.equal(intent.manifestSha256, record.manifestSha256);
        assert.equal(intent.source, record.source);
        const subject = releasePackages(release).find(
          (subject) => subject.package === intent.package,
        );
        assert.ok(subject);
        assert.equal(intent.integrity, subject.archive.integrity);
        const origin =
          context.packageOrigins?.[intent.package] ?? context.stage;
        for (const key of ["run", "attempt", "controller"])
          assert.equal(
            intent[key],
            origin[key],
            "Compact summary must bind the actual publication origin",
          );
        const records = journal.toString().trim().split("\n").map(JSON.parse),
          outcome =
            records[
              records.findIndex(
                (entry) =>
                  entry.state === "intent" && entry.package === intent.package,
              ) + 1
            ];
        if (outcome?.state !== "completed") {
          const observations = JSON.parse(
            files.get("recovery-observations.json") ?? "[]",
          );
          assert.ok(
            observations.some(
              ({ record: decision, observed }) =>
                decision.phase === "stage" &&
                decision.run === intent.run &&
                decision.attempt === intent.attempt &&
                decision.journalSha256 === sha256(journal) &&
                observed.stages?.some(
                  (stage) =>
                    stage.package === intent.package &&
                    stage.version === intent.version &&
                    stage.integrity === intent.integrity,
                ),
            ),
            "Compact unknown request requires its verified scoped settlement",
          );
        }
      }
      return {
        run: intents[0].run,
        attempt: intents[0].attempt,
        controller: intents[0].controller,
        journalSha256: sha256(journal),
        subjects: intents.map(
          ({ package: name, version, source, manifestSha256, integrity }) => ({
            package: name,
            version,
            source,
            manifestSha256,
            integrity,
          }),
        ),
      };
    })
    .filter(Boolean);
}
