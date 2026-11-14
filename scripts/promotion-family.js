// SPDX-License-Identifier: AGPL-3.0-only
/** Exact family scopes and one-shot effects. Completion observation has no mutations. */
import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import { createRequire } from "node:module";
import { journalEffect } from "./release-records.js";
import {
  releasePackages,
  isPrerelease,
  validVersion,
} from "./release-contract.js";
import { retryDelay, transientReadError } from "./github-evidence.js";
import { npmCli } from "./qualification-process.js";
import { npmFamilyLabel, npmLabelOperation } from "./npm-availability.js";

const sleep = (ms) =>
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const marker = (value) =>
  value
    ? { id: value.id, tag_name: value.tag_name, prerelease: value.prerelease }
    : null;
const familyLabelValue = (family, tags) => tags[npmFamilyLabel(family)] ?? null;

/** Every package, including excluded packages, has an explicit reviewed preimage. */
export function verifyFamilyScope(family, release) {
  assert.equal(family.schemaVersion, 2);
  npmFamilyLabel(family);
  assert.match(family.operationId, /^[a-f0-9]{64}$/u);
  assert.deepEqual(
    family.subjects.map((value) => value.package).sort(),
    releasePackages(release)
      .map((value) => value.package)
      .sort(),
  );
  assert.equal(family.subjects.length, 3);
  for (const subject of family.subjects) {
    assert.equal(typeof subject.selected, "boolean");
    for (const name of ["prior", "target"])
      assert.ok(
        Object.hasOwn(subject, name) &&
          (subject[name] === null || typeof subject[name] === "string"),
      );
    for (const name of ["prior", "target"])
      if (subject[name] !== null) validVersion(subject[name]);
    if (!subject.selected)
      assert.equal(
        subject.target,
        subject.prior,
        "Excluded labels cannot change",
      );
    if (subject.target === null && subject.selected)
      assert.equal(
        subject.removalApproved,
        true,
        "Label removal requires explicit approval",
      );
    if (subject.target !== null)
      assert.match(subject.integrity, /^sha512-[A-Za-z0-9+/]+=*$/u);
    if (subject.selected && subject.prior === subject.target)
      assert.equal(
        subject.noOpApproved,
        true,
        "Pre-existing target requires an approved no-op",
      );
  }
  const github = family.github;
  assert.ok(
    !github.guards ||
      (Array.isArray(github.guards) && github.guards.length <= 4),
  );
  if (github.guards) {
    assert.equal(
      new Set(github.guards.map((guard) => guard.id)).size,
      github.guards.length,
      "Excluded release guards must be distinct",
    );
    for (const guard of github.guards) {
      assert.ok(Number.isSafeInteger(guard.id) && guard.id > 0);
      assert.match(guard.tag_name, /^v\S+$/u);
      validVersion(guard.tag_name.slice(1));
      assert.equal(typeof guard.prerelease, "boolean");
    }
  }
  assert.equal(typeof github.selected, "boolean");
  assert.ok(Object.hasOwn(github, "prior"));
  for (const value of [github.prior, github.target])
    if (value !== null) {
      assert.ok(Number.isSafeInteger(value.id) && value.id > 0);
      assert.match(value.tag_name, /^v\S+$/u);
      validVersion(value.tag_name.slice(1));
      assert.equal(typeof value.prerelease, "boolean");
    }
  if (!github.selected)
    assert.deepEqual(marker(github.target), marker(github.prior));
  if (github.selected) {
    assert.equal(
      github.target.prerelease,
      false,
      "GitHub latest requires an approved stable classification",
    );
    assert.equal(
      isPrerelease(github.target.tag_name.slice(1)),
      false,
      "A release candidate cannot become GitHub latest",
    );
    assert.ok(
      github.targetPrior,
      "Target release classification preimage must be reviewed",
    );
    assert.equal(github.targetPrior.id, github.target.id);
    assert.equal(github.targetPrior.tag_name, github.target.tag_name);
    assert.equal(typeof github.targetPrior.prerelease, "boolean");
    if (
      isDeepStrictEqual(marker(github.prior), marker(github.target)) &&
      isDeepStrictEqual(marker(github.targetPrior), marker(github.target))
    )
      assert.equal(
        github.noOpApproved,
        true,
        "Pre-existing GitHub target requires an approved no-op",
      );
  }
  if (["promote", "restore"].includes(family.operation)) {
    assert.ok(
      family.subjects.every(
        (subject) => subject.selected && subject.target !== null,
      ),
    );
    const versions = new Set(family.subjects.map((subject) => subject.target));
    assert.equal(
      versions.size,
      1,
      "Ordinary operation requires one package family",
    );
    const version = [...versions][0];
    assert.equal(
      isPrerelease(version),
      false,
      "Stable family operation requires stable SemVer",
    );
    assert.equal(github.selected, true);
    assert.equal(github.target.tag_name, `v${version}`);
    assert.equal(github.target.prerelease, false);
  }
  if (family.operation === "align") {
    const core = family.subjects.find(
      (subject) => subject.package === release.package,
    );
    assert.equal(core.selected, false);
    assert.equal(core.target, release.version);
    assert.equal(isPrerelease(core.target), false);
    assert.equal(github.selected, false);
    assert.equal(github.prior.tag_name, `v${core.target}`);
    assert.equal(github.prior.prerelease, false);
    assert.ok(
      family.subjects
        .filter((subject) => subject.package !== release.package)
        .every((subject) => subject.selected && subject.target === core.target),
    );
  }
  if (family.operation === "retire-pilot") {
    assert.equal(family.stableVersion, release.version);
    assert.equal(isPrerelease(family.stableVersion), false);
    validVersion(family.retiredVersion);
    assert.equal(isPrerelease(family.retiredVersion), false);
    // A stable release must not retire a later candidate, even if its owner
    // accidentally supplies that candidate as the reviewed preimage.
    assert.ok(
      createRequire(npmCli())("semver").lte(
        family.retiredVersion,
        family.stableVersion,
      ),
      "A newer pilot cannot be retired by this stable release",
    );
    assert.equal(
      github.selected,
      false,
      "Pilot retirement has no GitHub write authority",
    );
    assert.equal(github.prior?.tag_name, `v${family.stableVersion}`);
    assert.equal(github.prior.prerelease, false);
    for (const subject of family.subjects) {
      assert.equal(subject.selected, true);
      assert.equal(
        subject.target,
        null,
        "Pilot retirement requires an absent target",
      );
      assert.equal(
        subject.integrity ?? null,
        null,
        "An absent pilot target has no integrity",
      );
      assert.ok(
        subject.prior === null || subject.prior === family.retiredVersion,
      );
    }
  }
  if (family.operation === "emergency-core-restore") {
    assert.equal(github.selected, false);
    assert.deepEqual(
      family.subjects
        .filter((subject) => subject.selected)
        .map((subject) => subject.package),
      [release.package],
    );
    assert.ok(
      github.guards?.length >= 2,
      "Emergency restoration must guard affected and target release identities",
    );
    assert.equal(
      new Set(github.guards.map((guard) => guard.id)).size,
      github.guards.length,
      "Excluded release guards must be distinct",
    );
  }
  return family;
}

export function familyOrder(family, release) {
  return ["win32-x64", "linux-x64"]
    .map((platform) =>
      family.subjects.find(
        (value) =>
          value.package ===
          release.platformArchives.find(
            (subject) => subject.platform === platform,
          ).package,
      ),
    )
    .concat(family.subjects.find((value) => value.package === release.package));
}

function verifyGithubGuards(family, state, allowTarget = false) {
  const actual = marker(state.latest),
    prior = marker(family.github.prior),
    target = marker(family.github.target);
  assert.ok(
    isDeepStrictEqual(actual, prior) ||
      (allowTarget && isDeepStrictEqual(actual, target)),
    "GitHub latest drifted outside the approved release identity transition",
  );
  if (family.github.selected) {
    assert.equal(
      state.target?.id,
      family.github.target.id,
      "GitHub target release ID changed",
    );
    assert.equal(state.target.immutable, true);
    assert.equal(state.target.draft, false);
    const observed = marker(state.target);
    assert.ok(
      isDeepStrictEqual(observed, marker(family.github.targetPrior)) ||
        (allowTarget && isDeepStrictEqual(observed, target)),
      "GitHub target classification drifted outside the approved transition",
    );
  }
  for (const guard of family.github.guards ?? []) {
    const found = [
      state.affected,
      state.target,
      ...(state.releases ?? []),
    ].find((value) => value?.id === guard.id);
    assert.deepEqual(
      marker(found),
      marker(guard),
      "Excluded GitHub release changed",
    );
  }
  return state;
}

/** Strict guards run immediately before each effect; they never poll a stale preimage. */
export function guardFamily(
  family,
  operations,
  completed = new Set(),
  { githubTarget = false } = {},
) {
  const packages = {};
  for (const subject of family.subjects) {
    const tags = operations.readPackageTags(subject.package);
    assert.equal(
      familyLabelValue(family, tags),
      completed.has(subject.package) ? subject.target : subject.prior,
      `Prior ${npmFamilyLabel(family)} label changed: ${subject.package}`,
    );
    if (family.operation === "retire-pilot")
      assert.equal(
        tags.latest,
        family.stableVersion,
        "Stable latest changed during pilot retirement",
      );
    packages[subject.package] = tags;
  }
  return {
    packages,
    github: verifyGithubGuards(
      family,
      operations.readGithubState(),
      githubTarget,
    ),
  };
}

/** Native read errors are classified by the maintained reader; admission errors never retry. */
function retryable(error) {
  if (transientReadError(error) || error?.retryable === true) return true;
  let code;
  try {
    code = JSON.parse(error.stdout).error?.code;
  } catch {
    /* Preserve unclassified native failures. */
  }
  return [
    "ECONNRESET",
    "ETIMEDOUT",
    "EAI_AGAIN",
    "E408",
    "E429",
    "E500",
    "E502",
    "E503",
    "E504",
  ].includes(code);
}

/** One deadline includes all provider subprocesses, retries and propagation waits. */
export function observeFamilyCompletion(
  family,
  operations,
  { npmOnly = false, deadline } = {},
) {
  const now = operations.now ?? (() => performance.now()),
    wallNow = operations.wallNow ?? Date.now;
  const pause = operations.sleep ?? sleep,
    random = operations.random ?? Math.random;
  const end = deadline ?? now() + 300_000;
  const confirmed = { packages: {}, github: null };
  let retryAt = null,
    lastError = null;
  const unconfirmed = () => ({
    state: "completion-unconfirmed",
    lastConfirmed: confirmed,
    earliestUsefulRetryAt: retryAt,
    error: lastError,
  });
  const observe = (read, accept, key) => {
    let attempt = 0;
    for (;;) {
      if (now() >= end) return false;
      let error;
      try {
        const value = read(end);
        const done = accept(value);
        if (key === "github") confirmed.github = value;
        else confirmed.packages[key] = value;
        if (done && now() < end) return true;
      } catch (caught) {
        if (!retryable(caught)) throw caught;
        error = caught;
        lastError = {
          code: caught.code ?? null,
          httpStatus: caught.httpStatus ?? null,
          message: caught.message,
        };
      }
      const backoff = retryDelay(
        undefined,
        Math.min(attempt++, 4),
        wallNow(),
        random,
      );
      const wait = Math.max(
        Math.min(backoff, 16_000),
        error?.retryAfterMs ?? 0,
        error?.retryAt ? Date.parse(error.retryAt) - wallNow() : 0,
      );
      if (error?.retryAt || error?.retryAfterMs)
        retryAt = new Date(wallNow() + wait).toISOString();
      if (wait >= end - now()) return false;
      pause(wait);
    }
  };
  for (const subject of family.subjects) {
    if (
      !observe(
        (limit) => operations.readPackageTags(subject.package, limit),
        (tags) => {
          if (family.operation === "retire-pilot")
            assert.equal(
              tags.latest,
              family.stableVersion,
              "Stable latest changed during pilot retirement",
            );
          const value = familyLabelValue(family, tags);
          assert.ok(
            value === subject.target || value === subject.prior,
            `Unexpected third ${npmFamilyLabel(family)} value: ${subject.package}`,
          );
          return value === subject.target;
        },
        subject.package,
      )
    )
      return unconfirmed();
  }
  if (
    !observe(
      (limit) => {
        operations.verifyTargets?.(limit);
        return operations.readGithubState(limit);
      },
      (state) => {
        verifyGithubGuards(family, state, !npmOnly && family.github.selected);
        const expected =
          npmOnly || !family.github.selected
            ? family.github.prior
            : family.github.target;
        const latest = state.latest;
        if (!isDeepStrictEqual(marker(latest), marker(expected))) return false;
        if (
          !npmOnly &&
          family.github.selected &&
          !isDeepStrictEqual(marker(state.target), marker(family.github.target))
        )
          return false;
        if (latest) {
          assert.equal(latest.immutable, true);
          assert.equal(latest.draft, false);
        }
        return true;
      },
      "github",
    )
  )
    return unconfirmed();
  return { state: "completed", ...confirmed };
}

/** The npm service owns only explicitly selected package labels, in native-first order. */
export function applyNpmFamily(input, operations) {
  const { family, release, env, journal } = input;
  assert.equal(env.PROMOTION_SERVICE, "npm");
  assert.ok(!operations.writeGithubLatest);
  verifyFamilyScope(family, release);
  const completed = new Set(),
    now = operations.now ?? (() => performance.now());
  const deadline = now() + 300_000;
  guardFamily(family, operations);
  for (const subject of familyOrder(family, release)) {
    if (!subject.selected || subject.prior === subject.target) {
      completed.add(subject.package);
      continue;
    }
    operations.assertCurrent();
    const before = guardFamily(family, operations, completed);
    const candidate = releasePackages(release).find(
      (value) => value.package === subject.package,
    );
    journalEffect(
      journal,
      { ...release, ...candidate },
      npmLabelOperation(family, subject.package),
      (acknowledge) => {
        operations.writePackageLabel(subject.package, subject.target);
        acknowledge();
        const partial = {
          ...family,
          subjects: family.subjects.map((value) =>
            value.package === subject.package || completed.has(value.package)
              ? value
              : { ...value, target: value.prior },
          ),
        };
        const result = observeFamilyCompletion(partial, operations, {
          npmOnly: true,
          deadline,
        });
        if (result.state !== "completed")
          throw Object.assign(
            new Error("Acknowledged npm write awaits confirmed readback"),
            { requestAcknowledged: true, completion: result },
          );
        return {
          ...result,
          operationId: family.operationId,
          package: subject.package,
          target: subject.target,
          integrity: subject.integrity,
        };
      },
      {
        preRequest: () => guardFamily(family, operations, completed),
        env,
        before,
        guard: {
          operationId: family.operationId,
          family,
          targetVersion: subject.target,
          targetIntegrity: subject.integrity,
        },
      },
    );
    completed.add(subject.package);
  }
  const result = observeFamilyCompletion(family, operations, {
    npmOnly: true,
    deadline,
  });
  if (result.state !== "completed")
    throw Object.assign(new Error("npm family completion unconfirmed"), {
      completion: result,
    });
  if (
    !family.subjects.some(
      (subject) => subject.selected && subject.prior !== subject.target,
    )
  ) {
    journalEffect(journal, release, "completion-readback", () => result, {
      env,
      guard: { operationId: family.operationId, family },
    });
  }
  return result;
}

export function applyGithubFamily(input, operations) {
  const { family, release, env, journal, continuation } = input;
  assert.equal(env.PROMOTION_SERVICE, "github");
  assert.ok(!operations.writePackageLabel && !operations.writeNpmLatest);
  verifyFamilyScope(family, release);
  assert.equal(
    family.github.selected,
    true,
    "Scope does not authorize a GitHub mutation",
  );
  assert.equal(
    continuation?.operationId,
    family.operationId,
    "Authenticated family npm predecessor required",
  );
  for (const subject of family.subjects)
    assert.equal(
      familyLabelValue(family, operations.readPackageTags(subject.package)),
      subject.target,
    );
  const before = verifyGithubGuards(family, operations.readGithubState());
  operations.assertCurrent();
  const noOp =
    isDeepStrictEqual(
      marker(family.github.prior),
      marker(family.github.target),
    ) &&
    isDeepStrictEqual(
      marker(family.github.targetPrior),
      marker(family.github.target),
    );
  return journalEffect(
    journal,
    release,
    noOp ? "completion-readback" : "github-latest",
    (acknowledge) => {
      if (!noOp) operations.writeGithubLatest(family.github.target);
      if (!noOp) acknowledge();
      const result = observeFamilyCompletion(family, operations);
      if (result.state !== "completed")
        throw Object.assign(
          new Error("Acknowledged GitHub write awaits confirmed readback"),
          { requestAcknowledged: !noOp, completion: result },
        );
      return result;
    },
    {
      preRequest: () => {
        for (const subject of family.subjects)
          assert.equal(
            familyLabelValue(
              family,
              operations.readPackageTags(subject.package),
            ),
            subject.target,
          );
        verifyGithubGuards(family, operations.readGithubState());
      },
      env,
      before,
      guard: {
        operationId: family.operationId,
        family,
        targetReleaseId: family.github.target.id,
      },
    },
  ).result;
}
