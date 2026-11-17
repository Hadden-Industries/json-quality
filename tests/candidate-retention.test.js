// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { retainLatestCandidate } from "../scripts/candidate-retention.js";
import { createReceipt } from "../scripts/ci-proof.js";
import { sha256 } from "../scripts/release-records.js";
import { qualifiedCiFixture } from "./ci-proof-fixture.js";

async function retentionWorld() {
  const f = qualifiedCiFixture(2);
  for (const lane of f.records) {
    lane.schemaVersion = 3;
    lane.releaseEvidence = { manifestSha256: "b".repeat(64) };
  }
  const receipt = await createReceipt({
    ctx: f.ctx,
    matrix: f.matrix,
    records: f.records,
    needs: f.needs,
    read: f.read,
    now: f.now - 1000,
    sleep: async () => {},
  });
  const bytes = Buffer.from(JSON.stringify(receipt));
  Object.assign(f.artifact, {
    digest: `sha256:${sha256(bytes)}`,
    size_in_bytes: bytes.length,
  });
  const expires_at = new Date(f.now + 3600000).toISOString();
  const artifacts = [
    f.artifact,
    { ...f.records[0].transport, expired: false, expires_at },
    ...f.records.map((lane, index) => ({
      id: 600 + index,
      name: `consumer-${lane.lane.os}-${lane.lane.node}-${lane.runAttempt}${index === 0 ? "-recovery-2" : ""}`,
      digest: `sha256:${"c".repeat(64)}`,
      size_in_bytes: 123,
      expired: false,
      created_at: new Date(f.now - 3000).toISOString(),
      expires_at,
      workflow_run: f.artifact.workflow_run,
    })),
    ...[
      "qualified-producer-1",
      "consumer-ubuntu-26.04-26.13.1-1-recovery-3",
      "ci-proof-60-1-recovery-2.json",
    ].map((name, index) => ({
      id: 900 + index,
      name,
      expired: false,
      digest: `sha256:${"d".repeat(64)}`,
      size_in_bytes: 123,
      workflow_run: { id: 60 },
    })),
    {
      id: 910,
      name: "qualified-producer-1",
      expired: false,
      workflow_run: { id: 50 },
    },
    {
      id: 920,
      name: "native-linux-full-1",
      expired: false,
      workflow_run: { id: 60 },
    },
  ];
  const runs = [
    f.run,
    { ...f.run, id: 60 },
    { ...f.run, id: 50, head_sha: "e".repeat(40) },
  ];
  const state = { mainMoved: false, activeRelease: false, incomplete: false };
  let mainReads = 0;
  const read = async (path, options) => {
    if (path === "/git/ref/heads/main")
      return {
        object: {
          sha: state.mainMoved && ++mainReads > 1 ? "f".repeat(40) : f.main.sha,
        },
      };
    if (path === "/actions/artifacts/501/zip") return bytes;
    if (path === "/actions/artifacts?per_page=100&page=1")
      return {
        total_count: artifacts.length + Number(state.incomplete),
        artifacts,
      };
    if (path === "/actions/runs?per_page=100&page=1") {
      const selected = state.activeRelease
        ? [
            ...runs,
            {
              id: 80,
              path: ".github/workflows/stage-release.yml",
              status: "in_progress",
              conclusion: null,
            },
          ]
        : runs;
      return { total_count: selected.length, workflow_runs: selected };
    }
    if (path === "/pulls?state=open&per_page=100&page=1")
      return [{ head: { sha: "e".repeat(40) } }];
    const artifact = artifacts.find(
      ({ id }) => path === `/actions/artifacts/${id}`,
    );
    return artifact ?? f.read(path, options);
  };
  const deleted = [];
  const run = () =>
    retainLatestCandidate({
      environment: {
        GITHUB_REPOSITORY: f.main.repository,
        GITHUB_REPOSITORY_ID: "11",
        GITHUB_RUN_ID: "72",
        GITHUB_RUN_ATTEMPT: "1",
        GITHUB_REF: "refs/heads/main",
        GITHUB_SHA: f.main.sha,
      },
      snapshot: f.main.snapshot,
      now: () => f.now,
      read,
      remove: async (id) => deleted.push(id),
    });
  return { run, deleted, state, f };
}

test("retention authenticates the real successor and deletes only unused originals and recovery aliases", async () => {
  const world = await retentionWorld();
  const result = await world.run();
  assert.deepEqual(world.deleted, [900, 901, 902]);
  assert.ok(
    result.retainedArtifactIds.includes(600),
    "Recovered successor lane remains selected",
  );
  assert.equal(
    result.effectiveArtifactExpiry,
    new Date(world.f.now + 3600000).toISOString(),
  );
});

test("retention leaves custody intact for active releases, incomplete inventories and concurrent main movement", async () => {
  for (const mode of ["activeRelease", "incomplete", "mainMoved"]) {
    const world = await retentionWorld();
    world.state[mode] = true;
    if (mode === "activeRelease")
      assert.equal((await world.run()).state, "retained-no-safe-cleanup");
    else await assert.rejects(world.run());
    assert.deepEqual(world.deleted, []);
  }
});
