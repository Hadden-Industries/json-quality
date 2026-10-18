// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { temporaryRepository } from "./temporary-repository.js";
import { qualifyJsonConsumer } from "../src/qualification.js";

function commit(root) {
  const git = (args) =>
    execFileSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      windowsHide: true,
    });
  git(["add", "--force", "--", "."]);
  git([
    "-c",
    "user.name=Qualification fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "--quiet",
    "-m",
    "Independent consumer fixture",
  ]);
  return git(["rev-parse", "HEAD"]).trim();
}

function policy() {
  return {
    schemaVersion: 1,
    defaults: {
      formatContract: "prettier-json",
      allowFormatWrites: true,
      normalization: "NFC",
    },
    exceptions: [
      {
        paths: [".git/**"],
        exclude: true,
        owner: "Git",
        reason: "Git-owned state is not candidate document data.",
      },
    ],
  };
}

test("shared qualification ignores candidate policy relaxation and never executes candidate configuration", async (t) => {
  const trustedRoot = temporaryRepository(t, "json-ci-trusted-");
  const candidateRoot = temporaryRepository(t, "json-ci-candidate-");
  writeFileSync(
    join(trustedRoot, ".json-quality.json"),
    JSON.stringify(policy(), null, 2) + "\n",
  );
  const trustedSha = commit(trustedRoot);
  const candidatePolicy = policy();
  candidatePolicy.exceptions.push({
    paths: ["**/*.json"],
    exclude: true,
    owner: "Candidate",
    reason: "This candidate policy must not govern trusted checking.",
  });
  writeFileSync(
    join(candidateRoot, ".json-quality.json"),
    JSON.stringify(candidatePolicy, null, 2) + "\n",
  );
  writeFileSync(
    join(candidateRoot, "data.json"),
    '{"value":9007199254740992}\n',
  );
  writeFileSync(
    join(candidateRoot, "eslint.config.js"),
    'import {writeFileSync} from "node:fs"; writeFileSync("candidate-executed", "bad"); throw new Error("Candidate must remain data");',
  );
  const candidateSha = commit(candidateRoot);
  const result = await qualifyJsonConsumer({
    trustedRoot,
    candidateRoot,
    trustedSha,
    candidateSha,
  });
  assert.equal(result.result.status, "failed");
  assert.ok(result.result.findings.some(({ path }) => path === "data.json"));
  assert.equal(existsSync(join(candidateRoot, "candidate-executed")), false);
  assert.equal(existsSync(join(trustedRoot, "candidate-executed")), false);
});

test("shared qualification rejects dirty or mismatched immutable inputs", async (t) => {
  const root = temporaryRepository(t, "json-ci-identity-");
  writeFileSync(
    join(root, ".json-quality.json"),
    JSON.stringify(policy(), null, 2) + "\n",
  );
  const sha = commit(root);
  await assert.rejects(
    qualifyJsonConsumer({
      trustedRoot: root,
      candidateRoot: root,
      trustedSha: sha,
      candidateSha: "0".repeat(40),
    }),
    /identity/u,
  );
  writeFileSync(join(root, "untracked.json"), "{}\n");
  await assert.rejects(
    qualifyJsonConsumer({
      trustedRoot: root,
      candidateRoot: root,
      trustedSha: sha,
      candidateSha: sha,
    }),
    /dirty/u,
  );
});

test("shared qualification requires policy from the declared trusted commit", async (t) => {
  const trustedRoot = temporaryRepository(t, "json-ci-ignored-policy-");
  const candidateRoot = temporaryRepository(t, "json-ci-policy-candidate-");
  writeFileSync(join(trustedRoot, ".gitignore"), ".json-quality.json\n");
  const trustedSha = commit(trustedRoot);
  writeFileSync(
    join(trustedRoot, ".json-quality.json"),
    JSON.stringify(policy()),
  );
  writeFileSync(join(candidateRoot, "data.json"), "{}\n");
  const candidateSha = commit(candidateRoot);
  await assert.rejects(
    qualifyJsonConsumer({
      trustedRoot,
      candidateRoot,
      trustedSha,
      candidateSha,
    }),
    /regular blob/u,
  );
  unlinkSync(join(trustedRoot, ".json-quality.json"));
});

test("shared source-only qualification refuses logical admission requirements", async (t) => {
  const trustedRoot = temporaryRepository(t, "json-ci-logical-policy-");
  const candidateRoot = temporaryRepository(t, "json-ci-logical-candidate-");
  const trustedPolicy = policy();
  trustedPolicy.preserveSourcePresentation = [
    {
      paths: ["**/*.json"],
      owner: "Fixture adapter",
      reason: "The consumer owns source presentation.",
    },
  ];
  writeFileSync(
    join(trustedRoot, ".json-quality.json"),
    JSON.stringify(trustedPolicy),
  );
  const trustedSha = commit(trustedRoot);
  writeFileSync(join(candidateRoot, "data.json"), "{}\n");
  const candidateSha = commit(candidateRoot);
  await assert.rejects(
    qualifyJsonConsumer({
      trustedRoot,
      candidateRoot,
      trustedSha,
      candidateSha,
    }),
    /native\/logical admission/u,
  );
});

test("qualification resource overrides reach initial Git and nested scratch inventory", async (t) => {
  const root = temporaryRepository(t, "json-ci-resource-");
  const selected = policy();
  selected.capacityLimits = { maxGitOutputBytes: 1 };
  writeFileSync(
    join(root, ".json-quality.json"),
    JSON.stringify(selected, null, 2) + "\n",
  );
  writeFileSync(join(root, "data.json"), "{}\n");
  const sha = commit(root);
  const input = {
    trustedRoot: root,
    candidateRoot: root,
    trustedSha: sha,
    candidateSha: sha,
  };
  await assert.rejects(qualifyJsonConsumer(input), { code: "ENOBUFS" });
  assert.equal(
    (
      await qualifyJsonConsumer({
        ...input,
        capacityLimits: { maxGitOutputBytes: 65536 },
      })
    ).result.complete,
    true,
  );
  assert.equal(
    (await qualifyJsonConsumer({ ...input, capacityLimits: false })).result
      .complete,
    true,
  );
});

test("qualification can bootstrap a trusted policy larger than the default one MiB", async (t) => {
  const root = temporaryRepository(t, "json-ci-policy-resource-");
  const selected = policy();
  selected.exceptions[0].reason = "x".repeat(1024 * 1024);
  writeFileSync(
    join(root, ".json-quality.json"),
    JSON.stringify(selected, null, 2) + "\n",
  );
  writeFileSync(join(root, "data.json"), "{}\n");
  const sha = commit(root);
  const input = {
    trustedRoot: root,
    candidateRoot: root,
    trustedSha: sha,
    candidateSha: sha,
  };
  await assert.rejects(qualifyJsonConsumer(input), /bootstrap byte limit/u);
  assert.equal(
    (
      await qualifyJsonConsumer({
        ...input,
        capacityLimits: { maxPolicyBytes: 2 * 1024 * 1024 },
      })
    ).result.complete,
    true,
  );
});
