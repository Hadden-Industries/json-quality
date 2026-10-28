// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { journalEffect } from "../scripts/release-effects.js";
import { sha512, jsonBytes } from "../scripts/release-contract.js";
import { budgets } from "../scripts/qualification-budgets.js";
import {
  verifyReleaseAttestation,
  observeReleaseAttestation,
} from "../scripts/release-attestation-readiness.js";

test("publication waits for attestation readiness before its one native verification", (t) => {
  const root = mkdtempSync(join(tmpdir(), "json-release-readiness-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const release = {
    package: "@hadden-industries/json-quality",
    version: "1.0.0-rc.2",
    source: { commit: "b".repeat(40) },
    archive: { integrity: sha512(Buffer.from("archive")) },
  };
  const commands = [];
  let visible = false;
  const journal = join(root, "archive.jsonl");
  journalEffect(
    journal,
    release,
    "archive",
    () => {
      commands.push("publish");
      verifyReleaseAttestation(
        { release },
        {
          observe: () => {
            commands.push("readiness");
            visible = true;
          },
          verify: () => {
            commands.push("verify");
            if (!visible)
              throw new Error(
                "no attestations for tag v1.0.0-rc.2 (sha1:8f061b64523fd764d2f7be481d5e7e02a8120d80)",
              );
            return "verified";
          },
        },
      );
      return { immutable: true };
    },
    {
      env: {
        GITHUB_RUN_ID: "17",
        GITHUB_RUN_ATTEMPT: "1",
        GITHUB_SHA: "b".repeat(40),
        MANIFEST_SHA: "c".repeat(64),
      },
    },
  );
  assert.deepEqual(commands, ["publish", "readiness", "verify"]);
  const records = readFileSync(journal, "utf8")
    .trim()
    .split("\n")
    .map(JSON.parse);
  assert.deepEqual(
    records.map((record) => record.state),
    ["intent", "completed"],
  );
});

function fixture(
  targets,
  controls = [200],
  { slowRead = 0, advanceSleep = true, change } = {},
) {
  const request = {
    release: { version: "1.0.0-rc.2", source: { commit: "b".repeat(40) } },
    tagSha: "a".repeat(40),
    manifestSha: "c".repeat(64),
    releaseId: 17,
    prerelease: true,
    assets: [{ name: "candidate.tgz", size: 7, sha256: "d".repeat(64) }],
  };
  const state = {
    reference: {
      ref: "refs/tags/v1.0.0-rc.2",
      object: { type: "tag", sha: request.tagSha },
    },
    annotation: {
      sha: request.tagSha,
      tag: "v1.0.0-rc.2",
      object: { type: "commit", sha: request.release.source.commit },
      verification: { verified: true, reason: "valid" },
    },
    live: {
      id: 17,
      tag_name: "v1.0.0-rc.2",
      immutable: true,
      draft: false,
      prerelease: true,
      assets: [
        { name: "candidate.tgz", size: 7, digest: `sha256:${"d".repeat(64)}` },
      ],
    },
  };
  const calls = { targets: 0, controls: 0, sleeps: [], requests: 0 };
  let clock = 0;
  const response = (status) => {
    if (status === "malformed")
      return new Response(jsonBytes({ attestations: "invalid" }));
    if (status === "bad-member")
      return new Response(jsonBytes({ attestations: [{}] }));
    if (status === "empty")
      return new Response(jsonBytes({ attestations: [] }));
    if (["missing-bundle", "bad-url", "bad-inline"].includes(status))
      return new Response(
        jsonBytes({
          attestations: [
            {
              repository_id: 1417928678,
              ...(status === "bad-url"
                ? { bundle_url: "http://invalid.example.test/bundle" }
                : {}),
              ...(status === "bad-inline" ? { bundle: [] } : {}),
            },
          ],
        }),
      );
    const available = status === 200 || status === "inline";
    return new Response(
      jsonBytes(
        available
          ? {
              attestations: [
                {
                  repository_id: 1417928678,
                  ...(status === "inline"
                    ? { bundle: {} }
                    : {
                        bundle_url:
                          "https://bundles.example.test/attestation.json",
                      }),
                },
              ],
            }
          : { message: "Not Found" },
      ),
      { status: available ? 200 : status },
    );
  };
  const options = {
    token: "fixture-token",
    now: () => clock,
    sleep: async (wait) => {
      calls.sleeps.push(wait);
      if (advanceSleep) clock += wait;
      change?.(state);
    },
    fetchImpl: async (url) => {
      calls.requests++;
      clock += slowRead;
      const path = new URL(url).pathname;
      if (path.includes("/attestations/sha1%3A"))
        return response(targets[Math.min(calls.targets++, targets.length - 1)]);
      if (path.includes("/attestations/sha256%3A"))
        return response(
          controls[Math.min(calls.controls++, controls.length - 1)],
        );
      if (path.includes("/git/ref/"))
        return new Response(jsonBytes(state.reference));
      if (path.includes("/git/tags/"))
        return new Response(jsonBytes(state.annotation));
      if (path.includes("/releases/tags/"))
        return new Response(jsonBytes(state.live));
      throw new Error(`Unexpected readiness request ${path}`);
    },
  };
  return { request, state, calls, options };
}

test("empty and typed absent inventories wait only with a positive same-token attestation control", async () => {
  const f = fixture([404, "empty", 200]);
  const result = await observeReleaseAttestation(f.request, f.options);
  assert.deepEqual(result, {
    releaseId: 17,
    tagSha: "a".repeat(40),
    observations: 3,
    elapsedMs: budgets.read / 2,
  });
  assert.equal(f.calls.targets, 3);
  assert.equal(f.calls.controls, 2);
  assert.deepEqual(f.calls.sleeps, [budgets.read / 4, budgets.read / 4]);
});

test("legacy inline bundles remain supported for target and control inventories", async () => {
  const f = fixture([404, "inline"], ["inline"]);
  const observed = await observeReleaseAttestation(f.request, f.options);
  assert.equal(observed.observations, 2);
  assert.equal(f.calls.controls, 1);
});

test("authorization and malformed inventories never become readiness retries", async () => {
  for (const status of [
    401,
    403,
    "malformed",
    "bad-member",
    "missing-bundle",
    "bad-url",
    "bad-inline",
  ]) {
    const f = fixture([status]);
    await assert.rejects(observeReleaseAttestation(f.request, f.options));
    assert.equal(f.calls.targets, 1);
    assert.equal(f.calls.controls, 0);
    assert.deepEqual(f.calls.sleeps, []);
  }
  for (const status of [
    401,
    403,
    404,
    "empty",
    "malformed",
    "bad-member",
    "missing-bundle",
    "bad-url",
    "bad-inline",
  ]) {
    const f = fixture([404], [status]);
    await assert.rejects(observeReleaseAttestation(f.request, f.options));
    assert.equal(f.calls.targets, 1);
    assert.equal(f.calls.controls, 1);
    assert.deepEqual(f.calls.sleeps, []);
  }
});

test("loss of control access on a later poll stops observation", async () => {
  const f = fixture([404], [200, 403]);
  await assert.rejects(
    observeReleaseAttestation(f.request, f.options),
    (error) => error.httpStatus === 403,
  );
  assert.equal(f.calls.controls, 2);
  assert.equal(f.calls.sleeps.length, 1);
});

test("release, tag, source and asset identities cannot acquire a new baseline while pending", async () => {
  for (const change of [
    (state) => {
      state.reference.object.sha = "e".repeat(40);
    },
    (state) => {
      state.annotation.object.sha = "e".repeat(40);
    },
    (state) => {
      state.live.id++;
    },
    (state) => {
      state.live.immutable = false;
    },
    (state) => {
      state.live.draft = true;
    },
    (state) => {
      state.live.prerelease = false;
    },
    (state) => {
      state.live.assets[0].digest = `sha256:${"e".repeat(64)}`;
    },
  ]) {
    const f = fixture([404, 200], [200], { change });
    await assert.rejects(observeReleaseAttestation(f.request, f.options));
    assert.equal(f.calls.sleeps.length, 1);
  }
});

test("network reads and sleeps retain one deadline and cumulative request cap", async () => {
  const absent = fixture([404]);
  await assert.rejects(
    observeReleaseAttestation(absent.request, absent.options),
    /budget exhausted/,
  );
  assert.equal(
    absent.calls.sleeps.reduce((sum, value) => sum + value, 0),
    budgets.read,
  );
  const slow = fixture([404, 200], [200], { slowRead: budgets.read / 12 });
  await assert.rejects(
    observeReleaseAttestation(slow.request, slow.options),
    /budget exhausted/,
  );
  const stoppedClock = fixture([404], [200], { advanceSleep: false });
  await assert.rejects(
    observeReleaseAttestation(stoppedClock.request, stoppedClock.options),
    /budget exhausted/,
  );
  assert.equal(stoppedClock.calls.requests, 64);
});

test("the captured native missing-attestation error and cryptographic failures are terminal after readiness", () => {
  for (const message of [
    "no attestations for tag v1.0.0-rc.2 (sha1:8f061b64523fd764d2f7be481d5e7e02a8120d80)",
    "invalid signature",
    "wrong release tag",
  ]) {
    const original = new Error(message);
    let verifications = 0;
    assert.throws(
      () =>
        verifyReleaseAttestation(
          { release: { version: "1.0.0-rc.2" } },
          {
            observe: () => {},
            verify: () => {
              verifications++;
              throw original;
            },
          },
        ),
      (error) => error === original,
    );
    assert.equal(verifications, 1);
  }
  let verifications = 0;
  assert.throws(
    () =>
      verifyReleaseAttestation(
        { release: { version: "1.0.0-rc.2" } },
        {
          observe: () => {
            throw new Error("Readiness failed");
          },
          verify: () => {
            verifications++;
          },
        },
      ),
    /Readiness failed/,
  );
  assert.equal(verifications, 0);
});
