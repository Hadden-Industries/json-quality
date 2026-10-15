// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

if (!process.env.npm_execpath)
  throw new Error("Run Node policy tools through npm.");
const semver = createRequire(process.env.npm_execpath)("semver");
export const nodeSupport = JSON.parse(
  readFileSync(new URL("../assets/node-support.json", import.meta.url), "utf8"),
);
const production = Object.entries(
  JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url)))
    .packages,
).filter(([path, entry]) => path && !entry.dev);

/** Current package scope excludes odd and unqualified future Node families. */
export function validatePolicy(policy) {
  assert.equal(policy.schemaVersion, 1);
  assert.ok(Array.isArray(policy.minimums) && policy.minimums.length > 0);
  const families = new Set();
  for (const version of policy.minimums) {
    assert.equal(semver.valid(version), version);
    assert.equal(semver.prerelease(version), null);
    const family = semver.major(version);
    assert.ok(
      [22, 24, 26].includes(family) && !families.has(family),
      "Unsupported or duplicate Node family",
    );
    families.add(family);
    for (const [path, entry] of production)
      assert.ok(
        !entry.engines?.node || semver.satisfies(version, entry.engines.node),
        `${path} does not support ${version}`,
      );
  }
  assert.equal(semver.valid(policy.reference), policy.reference);
  assert.equal(semver.prerelease(policy.reference), null);
  assert.ok(
    policy.minimums.some((minimum) =>
      semver.satisfies(policy.reference, `^${minimum}`),
    ),
    "Reference is outside supported families",
  );
  for (const version of [policy.consumerNpm, policy.producerNpm?.version]) {
    assert.equal(semver.valid(version), version);
    assert.equal(semver.prerelease(version), null);
  }
  assert.ok(
    semver.satisfies(policy.producerNpm.version, policy.producerNpm.range),
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

/** Freeze minimum/latest/reference selections using npm's native semver. */
export function qualificationMatrix(releases, policy = nodeSupport) {
  validatePolicy(policy);
  assert.ok(
    Array.isArray(releases) && releases.length > 0 && releases.length <= 10000,
  );
  const versions = releases.map((release) => {
    assert.match(release?.version, /^v\d+\.\d+\.\d+$/u);
    assert.ok(semver.valid(release.version));
    return release.version.slice(1);
  });
  assert.ok(versions.includes(policy.reference), "Missing reference release");
  const nodes = policy.minimums.flatMap((minimum) => {
    assert.ok(versions.includes(minimum), "Missing minimum release");
    const latest = semver.maxSatisfying(versions, `^${minimum}`);
    assert.ok(latest);
    return [
      minimum,
      latest,
      ...(semver.satisfies(policy.reference, `^${minimum}`)
        ? [policy.reference]
        : []),
    ];
  });
  return {
    os: policy.platforms,
    node: [...new Set(nodes)].sort(semver.compare),
  };
}

export async function resolveQualificationMatrix() {
  const response = await fetch("https://nodejs.org/dist/index.json", {
    redirect: "error",
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(response.status, 200);
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    assert.ok(size <= 1048576, "Node metadata exceeds its bound");
    chunks.push(chunk);
  }
  return qualificationMatrix(JSON.parse(Buffer.concat(chunks)));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 2);
  console.log(JSON.stringify(await resolveQualificationMatrix()));
}
