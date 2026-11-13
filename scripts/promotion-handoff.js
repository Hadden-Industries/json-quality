// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import { join } from "node:path";
import {
  effectJournal,
  readJson,
  regularBytes,
  repository,
  sha256,
  releasePackages,
} from "./release-contract.js";
import { api, provider, producingAttempt } from "./release-provider.js";

export function verifyNpmContinuation(
  record,
  journal,
  env,
  release,
  target,
  expected,
) {
  assert.ok([1, 2].includes(record.schemaVersion));
  assert.equal(record.state, "npm-complete");
  assert.equal(record.repository, repository);
  assert.equal(record.controller, env.GITHUB_SHA);
  assert.equal(record.source, release.source.commit);
  assert.equal(record.manifestSha256, env.MANIFEST_SHA);
  assert.equal(record.reviewSha256, env.REVIEW_SHA);
  assert.equal(record.acceptanceSha256, env.ACCEPTANCE_SHA);
  assert.equal(record.restorationSha256, env.RESTORATION_SHA || null);
  assert.equal(record.version, target);
  assert.deepEqual(record.priorLabels, expected);
  assert.ok(["npm-only", "npm-and-github"].includes(record.availability));
  assert.equal(record.origin.run, env.GITHUB_RUN_ID);
  assert.match(record.origin.attempt, /^[1-9]\d*$/u);
  assert.ok(Number(record.origin.attempt) <= Number(env.GITHUB_RUN_ATTEMPT));
  assert.equal(record.origin.service, "npm");
  assert.equal(record.journal, effectJournal("promote", record.origin));
  assert.equal(record.journalSha256, sha256(journal));
  assert.equal(record.npm.latest ?? null, target);
  if (record.schemaVersion === 2 && target === null)
    assert.equal(record.targetIntegrity ?? null, null);
  else assert.equal(typeof record.targetIntegrity, "string");
  const lines = verifyPromotionJournal(
    "npm",
    journal,
    record.origin,
    release,
    env,
    record.schemaVersion === 2 ? record.family : null,
  );
  if (record.schemaVersion === 2) {
    assert.equal(record.operationId, env.OPERATION_SHA);
    assert.deepEqual(record.family, expected);
    assert.equal(record.family.operationId, record.operationId);
    assert.deepEqual(
      Object.keys(record.packages).sort(),
      record.family.subjects.map((subject) => subject.package).sort(),
    );
    for (const subject of record.family.subjects) {
      assert.equal(
        record.packages[subject.package].latest ?? null,
        subject.target,
      );
      assert.equal(
        record.targetIntegrities[subject.package],
        subject.integrity ?? null,
      );
    }
    return record;
  }
  assert.deepEqual(record.npm, lines.at(-1).result.npm);
  assert.equal(
    record.githubLatest,
    lines.at(-1).result.github.latest?.tag_name ?? null,
  );
  return record;
}

export function verifyPromotionJournal(
  service,
  journal,
  origin,
  release,
  env,
  expectedFamily = null,
  { allowPartial = false, allowUnconfirmed } = {},
) {
  const raw = journal.toString("utf8").trim();
  const lines = raw ? raw.split("\n").map((line) => JSON.parse(line)) : [];
  const family = expectedFamily ?? lines[0]?.guard?.family;
  if (family) {
    assert.equal(family.operationId, env.OPERATION_SHA);
    assert.ok(lines.length <= 6 && (allowPartial || lines.length % 2 === 0));
    const changes =
      service === "npm"
        ? family.subjects.filter(
            (subject) => subject.selected && subject.prior !== subject.target,
          ).length
        : 1;
    if (allowPartial)
      assert.ok(Math.ceil(lines.length / 2) <= Math.max(changes, 1));
    else
      assert.equal(
        lines.length,
        Math.max(changes, 1) * 2,
        "Missing family writer request outcome",
      );
    if (!changes && lines.length)
      assert.equal(lines[0].operation, "completion-readback");
    assert.equal(
      new Set(
        lines
          .filter((_, index) => index % 2 === 0)
          .map((line) => line.operation),
      ).size,
      Math.ceil(lines.length / 2),
    );
    if (allowPartial) {
      const expected =
        service === "npm"
          ? family.subjects
              .filter(
                (subject) =>
                  subject.selected && subject.prior !== subject.target,
              )
              .map((subject) => `npm-latest:${subject.package}`)
          : ["github-latest", "completion-readback"];
      if (!expected.length) expected.push("completion-readback");
      for (const intent of lines.filter((_, index) => index % 2 === 0))
        assert.ok(expected.includes(intent.operation));
    } else if (service === "npm")
      assert.deepEqual(
        lines
          .filter((_, index) => index % 2 === 0)
          .map((line) => line.operation)
          .sort(),
        (changes
          ? family.subjects
              .filter(
                (subject) =>
                  subject.selected && subject.prior !== subject.target,
              )
              .map((subject) => `npm-latest:${subject.package}`)
          : ["completion-readback"]
        ).sort(),
      );
    else {
      const marker = (value) =>
        value ? [value.id, value.tag_name, value.prerelease] : null;
      const noOp =
        isDeepStrictEqual(
          marker(family.github.prior),
          marker(family.github.target),
        ) &&
        isDeepStrictEqual(
          marker(family.github.targetPrior),
          marker(family.github.target),
        );
      assert.equal(
        lines[0].operation,
        noOp ? "completion-readback" : "github-latest",
      );
    }
  } else
    assert.equal(
      lines.length,
      2,
      "Exactly one service request/readback per attempt is required",
    );
  for (let index = 0; index < lines.length; index += 2) {
    const [intent, outcome] = lines.slice(index, index + 2);
    assert.equal(intent.schemaVersion, 2);
    assert.equal(intent.state, "intent");
    assert.equal(intent.service, service);
    assert.ok(
      [`${service}-latest`, "completion-readback"].includes(intent.operation) ||
        (service === "npm" &&
          family &&
          intent.operation === `npm-latest:${intent.package}`),
    );
    assert.equal(intent.run, origin.run);
    assert.equal(intent.attempt, origin.attempt);
    assert.equal(intent.manifestSha256, env.MANIFEST_SHA);
    assert.equal(intent.controller, env.GITHUB_SHA);
    assert.equal(intent.source, release.source.commit);
    const subject = family
      ? releasePackages(release).find(
          (value) => value.package === intent.package,
        )
      : release;
    assert.ok(subject);
    assert.equal(intent.package, subject.package);
    assert.equal(intent.version, release.version);
    assert.equal(intent.integrity, subject.archive.integrity);
    if (family) assert.deepEqual(intent.guard.family, family);
    if (outcome?.state !== "completed")
      assert.ok(
        allowUnconfirmed?.(intent, outcome),
        "Unconfirmed writer lacks authenticated native acknowledgement",
      );
    assert.equal(
      outcome?.intentSha256 ??
        sha256(Buffer.from(JSON.stringify(intent) + "\n")),
      sha256(Buffer.from(JSON.stringify(intent) + "\n")),
    );
  }
  return lines;
}

/** The native transport already checked ID/digest/size/source and bounded extraction. */
export function admitNpmContinuation(
  directory,
  env,
  release,
  target,
  expected,
) {
  const record = readJson(join(directory, "npm-continuation.json"));
  assert.equal(record.journal, effectJournal("promote", record.origin));
  const checked = verifyNpmContinuation(
    record,
    regularBytes(join(directory, record.journal)),
    env,
    release,
    target,
    expected,
  );
  const artifact = api(`actions/artifacts/${env.NPM_CONTINUATION_ID}`);
  assert.equal(artifact.id, Number(env.NPM_CONTINUATION_ID));
  assert.equal(artifact.expired, false);
  assert.match(artifact.digest, /^sha256:[a-f0-9]{64}$/u);
  assert.ok(
    new RegExp(
      `^effect-promote-npm-${record.origin.attempt}(?:-recovery-[23])?$`,
      "u",
    ).test(artifact.name),
  );
  assert.equal(artifact.workflow_run.id, Number(record.origin.run));
  assert.equal(
    artifact.workflow_run.repository_id,
    Number(env.GITHUB_REPOSITORY_ID),
  );
  assert.equal(artifact.workflow_run.head_sha, env.GITHUB_SHA);
  assert.equal(
    producingAttempt(
      provider(record.origin.run, env.GITHUB_RUN_ATTEMPT),
      "npm",
    ),
    Number(record.origin.attempt),
  );
  return checked;
}

export function verifyGithubContinuation(
  github,
  journal,
  npmBytes,
  release,
  env,
) {
  assert.ok([1, 2].includes(github.schemaVersion));
  assert.equal(github.state, "github-complete");
  assert.equal(github.origin.service, "github");
  assert.equal(github.origin.run, env.GITHUB_RUN_ID);
  assert.match(github.origin.attempt, /^[1-9]\d*$/u);
  assert.ok(Number(github.origin.attempt) <= Number(env.GITHUB_RUN_ATTEMPT));
  assert.equal(github.journal, effectJournal("promote", github.origin));
  assert.equal(github.journalSha256, sha256(journal));
  assert.equal(github.npmContinuationSha256, sha256(npmBytes));
  const records = verifyPromotionJournal(
    "github",
    journal,
    github.origin,
    release,
    env,
    github.schemaVersion === 2 ? github.family : null,
  );
  if (github.schemaVersion === 2) {
    const npm = JSON.parse(npmBytes);
    assert.equal(github.operationId, env.OPERATION_SHA);
    assert.deepEqual(github.family, npm.family);
    assert.equal(github.operationId, npm.operationId);
    assert.deepEqual(records.at(-1).result.packages, github.packages);
    assert.deepEqual(records.at(-1).result.github, github.github);
    assert.equal(github.github.latest.id, github.family.github.target.id);
    assert.equal(
      github.github.latest.tag_name,
      github.family.github.target.tag_name,
    );
    assert.equal(
      github.github.latest.prerelease,
      github.family.github.target.prerelease,
    );
    return github;
  }
  assert.deepEqual(records.at(-1).result, {
    npm: github.npm,
    github: github.github,
  });
  assert.equal(github.npm.latest, JSON.parse(npmBytes).version);
  assert.equal(github.github.tag_name, `v${github.npm.latest}`);
  assert.equal(github.github.immutable, true);
  return github;
}

export function admitGithubContinuation(directory, env, release) {
  assert.equal(
    env.GITHUB_RESULT,
    "success",
    "Dual-service completion requires a successful GitHub writer",
  );
  const github = readJson(join(directory, "github-continuation.json"));
  assert.equal(github.journal, effectJournal("promote", github.origin));
  verifyGithubContinuation(
    github,
    regularBytes(join(directory, github.journal)),
    regularBytes(join(directory, "npm-continuation.json")),
    release,
    env,
  );
  const artifact = api(`actions/artifacts/${env.GITHUB_CONTINUATION_ID}`);
  assert.equal(artifact.id, Number(env.GITHUB_CONTINUATION_ID));
  assert.equal(artifact.expired, false);
  assert.match(artifact.digest, /^sha256:[a-f0-9]{64}$/u);
  assert.ok(
    new RegExp(
      `^effect-promote-github-${github.origin.attempt}(?:-recovery-[23])?$`,
      "u",
    ).test(artifact.name),
  );
  assert.equal(artifact.workflow_run.id, Number(env.GITHUB_RUN_ID));
  assert.equal(
    artifact.workflow_run.repository_id,
    Number(env.GITHUB_REPOSITORY_ID),
  );
  assert.equal(artifact.workflow_run.head_sha, env.GITHUB_SHA);
  assert.equal(
    producingAttempt(
      provider(env.GITHUB_RUN_ID, env.GITHUB_RUN_ATTEMPT),
      "github",
    ),
    Number(github.origin.attempt),
  );
  return github;
}

/** Completed GitHub evidence supersedes the npm predecessor's pending label. */
export function promotionRecoveryFor(continuation, recovery, github = null) {
  if (!continuation) return recovery;
  return {
    record: recovery?.record ?? {},
    observed: {
      npmLatest: continuation.version,
      githubLatest: github ? github.github.tag_name : continuation.githubLatest,
    },
    priorLabels: continuation.priorLabels,
  };
}
