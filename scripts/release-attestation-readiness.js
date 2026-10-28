// SPDX-License-Identifier: AGPL-3.0-only
/** Observe indexed proof without retrying publication or native cryptography. */
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { gh, verifyTag } from "./release-provider.js";
import { repository, jsonBytes, validVersion } from "./release-contract.js";
import { native, budgets } from "./qualification-process.js";
import { createRepositoryReader } from "./github-evidence.js";
import { verifyDraftAssets } from "./release-assets.js";
import { artifactLimits } from "./artifact-policy.js";

function inventory(value) {
  assert.ok(
    Array.isArray(value?.attestations),
    "Malformed attestation inventory",
  );
  for (const entry of value.attestations) {
    assert.ok(
      Number.isSafeInteger(entry?.repository_id) && entry.repository_id > 0,
      "Malformed attestation repository identity",
    );
    const inline = entry.bundle != null;
    if (inline)
      assert.ok(
        typeof entry.bundle === "object" && !Array.isArray(entry.bundle),
        "Malformed inline attestation bundle",
      );
    let remote = false;
    if (entry.bundle_url != null) {
      assert.equal(
        typeof entry.bundle_url,
        "string",
        "Malformed attestation bundle URL",
      );
      if (entry.bundle_url) {
        const url = new URL(entry.bundle_url);
        assert.ok(
          url.protocol === "https:" &&
            !url.username &&
            !url.password &&
            !url.hash,
          "Unsafe attestation bundle URL",
        );
        remote = true;
      }
    }
    assert.ok(
      inline || remote,
      "Attestation has no supported bundle representation",
    );
  }
  return value.attestations;
}

export async function observeReleaseAttestation(
  request,
  {
    now = Date.now,
    sleep = delay,
    deadline = now() + budgets.read,
    fetchImpl = fetch,
    token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN,
  } = {},
) {
  const start = now();
  validVersion(request.release.version);
  assert.match(request.release.source.commit, /^[a-f0-9]{40}$/u);
  assert.match(request.tagSha, /^[a-f0-9]{40}$/u);
  assert.match(request.manifestSha, /^[a-f0-9]{64}$/u);
  assert.ok(Number.isSafeInteger(request.releaseId) && request.releaseId > 0);
  assert.equal(typeof request.prerelease, "boolean");
  const read = createRepositoryReader({
    repository,
    token,
    fetchImpl,
    now,
    sleep,
    deadline,
    budgetMs: budgets.read,
  });
  const tag = `v${request.release.version}`,
    encodedTag = encodeURIComponent(tag);
  const unchanged = async () => {
    const reference = await read(`/git/ref/tags/${encodedTag}`);
    assert.equal(
      reference.object.sha,
      request.tagSha,
      "Release tag changed during attestation observation",
    );
    const annotation = await read(`/git/tags/${request.tagSha}`);
    verifyTag(reference, annotation, request.release);
    const live = await read(`/releases/tags/${encodedTag}`);
    assert.equal(
      live.id,
      request.releaseId,
      "Release identity changed during attestation observation",
    );
    assert.equal(live.tag_name, tag);
    assert.equal(live.immutable, true);
    assert.equal(live.draft, false);
    assert.equal(live.prerelease, request.prerelease);
    verifyDraftAssets(request.assets, live.assets);
  };
  const target = `/attestations/sha1%3A${request.tagSha}?predicate_type=release&per_page=100`;
  const control = `/attestations/sha256%3A${request.manifestSha}?predicate_type=provenance&per_page=100`;
  await unchanged();
  for (let observation = 1; ; observation++) {
    let pending;
    try {
      pending = inventory(await read(target)).length === 0;
    } catch (error) {
      if (error.httpStatus !== 404) throw error;
      pending = true;
    }
    if (!pending) {
      await unchanged();
      return {
        releaseId: request.releaseId,
        tagSha: request.tagSha,
        observations: observation,
        elapsedMs: now() - start,
      };
    }
    // Contents access does not prove attestation access. The release-local build
    // attestation must be visible under this same reader/token before any wait.
    assert.ok(
      inventory(await read(control)).length > 0,
      "Cannot distinguish attestation absence from access failure",
    );
    await unchanged();
    const remaining = deadline - now();
    assert.ok(
      remaining > 0,
      "Release attestation observation budget exhausted",
    );
    const wait = Math.min(budgets.read / 4, remaining);
    console.error(
      JSON.stringify({
        phase: "release-attestation-observation",
        state: "pending",
        observation,
        delayMs: wait,
        remainingMs: remaining,
      }),
    );
    await sleep(wait);
  }
}

function observeNative(request) {
  const input = jsonBytes({
    ...request,
    release: {
      version: request.release.version,
      source: { commit: request.release.source.commit },
    },
    deadline: Date.now() + budgets.read,
  });
  assert.ok(
    input.length <= artifactLimits.proofBytes,
    "Attestation request exceeds bound",
  );
  const observed = JSON.parse(
    native(process.execPath, [fileURLToPath(import.meta.url)], {
      input,
      timeout: budgets.read + budgets.read / 4,
      phase: "release-attestation-observation",
    }),
  );
  assert.equal(observed.releaseId, request.releaseId);
  assert.equal(observed.tagSha, request.tagSha);
  return observed;
}

export function verifyReleaseAttestation(
  request,
  { observe = observeNative, verify = gh } = {},
) {
  const observed = observe(request);
  assert.ok(
    !observed || typeof observed.then !== "function",
    "Readiness executor must complete synchronously",
  );
  if (observed)
    console.error(
      JSON.stringify({
        phase: "release-attestation-observation",
        state: "visible",
        ...observed,
      }),
    );
  return verify([
    "release",
    "verify",
    `v${request.release.version}`,
    "--repo",
    repository,
    "--format",
    "json",
  ]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of process.stdin) {
      size += chunk.byteLength;
      assert.ok(
        size <= artifactLimits.proofBytes,
        "Attestation request exceeds bound",
      );
      chunks.push(chunk);
    }
    const request = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)),
    );
    const observed = await observeReleaseAttestation(request, {
      deadline: request.deadline,
    });
    process.stdout.write(jsonBytes(observed));
  } catch (error) {
    console.error(
      JSON.stringify({
        releaseAttestationError: {
          message: error.message,
          code: error.code,
          httpStatus: error.httpStatus,
        },
      }),
    );
    process.exitCode = 1;
  }
}
