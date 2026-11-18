// SPDX-License-Identifier: AGPL-3.0-only
/** Owner observations protect writes from independent pending registry approvals. */
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import nodeSupport from "../assets/node-support.json" with { type: "json" };
import { npmCommand } from "./qualification-process.js";
import { pages } from "./release-provider.js";
import { workflows } from "./release-contract.js";
import { releasePackageNames, repository } from "./release-identity.js";
import { sha256, save } from "./release-records.js";

const family = [...releasePackageNames].sort();
const registry = "https://registry.npmjs.org/";
const owner = "maksymshostak";
const command = "npm stage list";
const sha = /^[a-f0-9]{64}$/u;
const terminals = new Set(["approved", "published", "rejected"]);
const hour = 3_600_000;
const stageIdentity = (id) => sha256(Buffer.from(id));

/** The exact already-approved decision these live observations supplement. */
export function releaseDecisionDigest(phase, env) {
  if (phase === "stage") return env.CONTINUATION_REVIEW_SHA || env.REVIEW_SHA;
  if (phase === "archive") return env.ACCEPTANCE_SHA;
  assert.equal(phase, "promote");
  return env.OPERATION_SHA || env.RESTORATION_SHA || env.ACCEPTANCE_SHA;
}

export function captureStageInventory(
  phase,
  manifestSha256,
  decisionSha256,
  read = npmCommand,
) {
  assert.ok(["stage", "archive", "promote"].includes(phase));
  assert.match(manifestSha256, sha);
  assert.match(decisionSha256, sha);
  const invoke = (args) =>
    read(args, {
      phase: "owner-pending-stage-inventory",
      logFailureOutput: false,
    });
  assert.equal(
    invoke(["--version"]).trim(),
    nodeSupport.producerNpm.version,
    "Select the pinned producer npm before capturing the owner inventory",
  );
  assert.equal(
    invoke(["whoami", `--registry=${registry}`])
      .trim()
      .toLowerCase(),
    owner,
    "Authenticate as the npm release owner before capturing inventory",
  );
  // Use the first read's timestamp so an intervening stage cannot age out of the comparison.
  const observedAt = new Date().toISOString();
  const packages = Object.fromEntries(
    family.map((name) => {
      const output = invoke([
        "stage",
        "list",
        name,
        "--json",
        `--registry=${registry}`,
      ]);
      const entries = JSON.parse(output);
      assert.ok(Array.isArray(entries));
      const seen = new Set();
      const pending = [];
      for (const entry of entries) {
        assert.equal(entry.packageName, name);
        assert.ok(
          typeof entry.id === "string" &&
            entry.id.length &&
            !seen.has(entry.id),
        );
        seen.add(entry.id);
        if (terminals.has(entry.status)) continue;
        assert.equal(entry.status, "pending", "Unknown native stage status");
        pending.push(stageIdentity(entry.id));
      }
      return [
        name,
        {
          responseSha256: sha256(Buffer.from(output)),
          pending: pending.sort(),
        },
      ];
    }),
  );
  return {
    schemaVersion: 1,
    repository,
    phase,
    manifestSha256,
    decisionSha256,
    observedAt,
    registry,
    owner,
    command,
    npm: nodeSupport.producerNpm.version,
    packages,
  };
}

/** Recheck the admitted, bounded owner snapshot against current stage-capable runs. */
export function verifyStageInventory(
  phase,
  env,
  {
    allowedStages = [],
    now = Date.now(),
    list = () =>
      pages(
        `actions/workflows/${workflows.stage}/runs?per_page=100`,
        "workflow_runs",
      ),
  } = {},
) {
  assert.match(
    env.STAGE_INVENTORY_SHA ?? "",
    sha,
    "Owner npm stage inventory is required",
  );
  const bytes = Buffer.from(env.STAGE_INVENTORY_JSON ?? "");
  assert.ok(bytes.length > 0 && bytes.length <= 32 * 1024);
  assert.equal(
    sha256(bytes),
    env.STAGE_INVENTORY_SHA,
    "Owner inventory digest differs",
  );
  const inventory = JSON.parse(bytes);
  assert.equal(inventory.schemaVersion, 1);
  assert.equal(inventory.repository, repository);
  assert.equal(inventory.phase, phase);
  assert.equal(inventory.registry, registry);
  assert.equal(inventory.owner, owner);
  assert.equal(inventory.command, command);
  assert.equal(inventory.npm, nodeSupport.producerNpm.version);
  assert.match(inventory.manifestSha256, sha);
  assert.match(inventory.decisionSha256, sha);
  assert.equal(inventory.manifestSha256, env.MANIFEST_SHA);
  assert.equal(inventory.decisionSha256, releaseDecisionDigest(phase, env));
  const observed = Date.parse(inventory.observedAt);
  assert.ok(
    observed <= now && now - observed <= hour,
    "Owner npm stage inventory is stale",
  );
  assert.deepEqual(Object.keys(inventory.packages).sort(), family);
  const seen = new Set();
  for (const name of family) {
    const { pending, responseSha256 } = inventory.packages[name];
    assert.match(responseSha256, sha);
    assert.ok(Array.isArray(pending));
    for (const digest of pending) {
      assert.match(digest, sha);
      assert.ok(!seen.has(digest), "Duplicate pending stage identity");
      seen.add(digest);
      assert.ok(
        phase === "stage" &&
          allowedStages.some(
            ({ package: subject, stageId }) =>
              name === subject &&
              typeof stageId === "string" &&
              digest === stageIdentity(stageId),
          ),
        `Unrelated pending npm stage for ${name}`,
      );
    }
  }
  for (const run of list()) {
    assert.equal(run.repository.full_name, repository);
    assert.equal(run.path, `.github/workflows/${workflows.stage}`);
    if (
      String(run.id) === env.GITHUB_RUN_ID ||
      run.head_branch !== "main" ||
      run.event !== "workflow_dispatch"
    )
      continue;
    assert.ok(
      run.status === "completed" && Date.parse(run.updated_at) <= observed,
      "Another stage-capable attempt changed after the owner inventory",
    );
  }
}

/** Only the hosted writer has access to the protected release effects. */
export function requireHostedStageInventory(phase, env, allowedStages = []) {
  if (env.GITHUB_ACTIONS === "true")
    verifyStageInventory(phase, env, { allowedStages });
}

export function admittedStageOrigins(phase, env, context) {
  return phase === "stage" && env.STAGE_PHASE === "core"
    ? Object.values(context.packageOrigins ?? {}).filter(
        (origin) =>
          origin.run === context.nativeStage?.run &&
          origin.attempt === context.nativeStage?.attempt,
      )
    : [];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 7);
  assert.equal(process.argv[2], "capture-stage-inventory");
  const [phase, manifest, decision, output] = process.argv.slice(3);
  const inventory = captureStageInventory(phase, manifest, decision);
  save(output, inventory);
}
