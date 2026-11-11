// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { npmCli } from "./qualification-process.js";

const semver = createRequire(npmCli())("semver");
export const nodeSupport = JSON.parse(
  readFileSync(new URL("../assets/node-support.json", import.meta.url), "utf8"),
);
const production = Object.entries(
  JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url)))
    .packages,
).filter(([path, entry]) => path && !entry.dev);

// Older release manifests carry their original explicit development range.
export function producerNpmRange({ version, range = `>=${version}` }) {
  return range;
}

/** Installability is a floor; the explicit LTS policy owns qualification. */
export function validatePolicy(policy) {
  assert.equal(policy.schemaVersion, 2);
  assert.equal(semver.valid(policy.minimum), policy.minimum);
  assert.equal(semver.prerelease(policy.minimum), null);
  assert.ok(
    Array.isArray(policy.testedLtsMajors) && policy.testedLtsMajors.length > 0,
  );
  assert.equal(
    new Set(policy.testedLtsMajors).size,
    policy.testedLtsMajors.length,
  );
  assert.ok(Array.isArray(policy.preLtsMajors));
  assert.equal(new Set(policy.preLtsMajors).size, policy.preLtsMajors.length);
  assert.ok(
    policy.preLtsMajors.every((major) =>
      policy.testedLtsMajors.includes(major),
    ),
  );
  for (const major of policy.testedLtsMajors)
    assert.ok(
      Number.isSafeInteger(major) && major >= semver.major(policy.minimum),
    );
  assert.equal(policy.support?.otherEngineCompatibleReleases, "best-effort");
  for (const version of [policy.minimum, policy.reference]) {
    assert.equal(semver.valid(version), version);
    assert.equal(semver.prerelease(version), null);
    for (const [path, entry] of production)
      assert.ok(
        !entry.engines?.node || semver.satisfies(version, entry.engines.node),
        `${path} does not support ${version}`,
      );
  }
  assert.equal(semver.valid(policy.reference), policy.reference);
  assert.equal(semver.prerelease(policy.reference), null);
  assert.ok(
    semver.gte(policy.reference, policy.minimum) &&
      policy.testedLtsMajors.includes(semver.major(policy.reference)),
    "Reference is outside qualified LTS policy",
  );
  if (policy.compatibilityPins !== undefined) {
    assert.ok(Array.isArray(policy.compatibilityPins));
    for (const version of policy.compatibilityPins) {
      assert.equal(semver.valid(version), version);
      assert.equal(semver.prerelease(version), null);
      assert.ok(semver.gte(version, policy.minimum));
    }
    assert.deepEqual(
      policy.compatibilityPins
        .map((version) => semver.major(version))
        .sort((a, b) => a - b),
      policy.testedLtsMajors
        .filter((major) => major !== semver.major(policy.reference))
        .sort((a, b) => a - b),
      "Pin exactly one stable version for each non-reference family",
    );
  }
  for (const version of [policy.consumerNpm, policy.producerNpm?.version]) {
    assert.equal(semver.valid(version), version);
    assert.equal(semver.prerelease(version), null);
  }
  assert.ok(
    semver.satisfies(
      policy.producerNpm.version,
      producerNpmRange(policy.producerNpm),
    ),
  );
  assert.ok(Array.isArray(policy.platforms) && policy.platforms.length > 0);
  assert.equal(new Set(policy.platforms).size, policy.platforms.length);
  assert.ok(
    policy.platforms.every(
      (platform) =>
        typeof platform === "string" && /^[a-z]+-[a-z0-9.]+$/u.test(platform),
    ),
  );
  return policy;
}

/** Resolve exact CI pins and retain support for legacy release policies. */
export function qualificationMatrix(releases, policy = nodeSupport) {
  validatePolicy(policy);
  if (policy.compatibilityPins) {
    return {
      os: policy.platforms,
      node: [
        ...new Set([
          policy.minimum,
          ...policy.compatibilityPins,
          policy.reference,
        ]),
      ].sort(semver.compare),
    };
  }
  assert.ok(
    Array.isArray(releases) && releases.length > 0 && releases.length <= 10000,
  );
  const versions = releases.map((release) => {
    assert.match(release?.version, /^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u);
    assert.ok(semver.valid(release.version));
    return release.version.slice(1);
  });
  assert.ok(versions.includes(policy.reference), "Missing reference release");
  assert.ok(versions.includes(policy.minimum), "Missing minimum release");
  const nodes = policy.testedLtsMajors.map((major) => {
    const qualified = releases
      .filter(
        (release) =>
          (release.lts || policy.preLtsMajors.includes(major)) &&
          semver.prerelease(release.version) === null &&
          semver.major(release.version) === major,
      )
      .map((release) => release.version.slice(1));
    const latest = semver.maxSatisfying(
      qualified,
      `>=${major}.0.0 <${major + 1}.0.0`,
    );
    assert.ok(latest);
    return latest;
  });
  return {
    os: policy.platforms,
    node: [...new Set([policy.minimum, ...nodes, policy.reference])].sort(
      semver.compare,
    ),
  };
}

export function resolveQualificationMatrix() {
  assert.ok(
    nodeSupport.compatibilityPins,
    "CI requires exact compatibility pins",
  );
  return qualificationMatrix();
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 2);
  console.log(JSON.stringify(await resolveQualificationMatrix()));
}
