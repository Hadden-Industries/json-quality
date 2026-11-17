// SPDX-License-Identifier: AGPL-3.0-only
/** Isolated native providers for real dispatcher journeys; no repository or registry writes. */
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  sha256,
  jsonBytes,
  releasePackages,
  verifyDecision,
  verifyManifest,
} from "../scripts/release-contract.js";
import { prepareWriterAdmission } from "../scripts/release-writer-admission.js";
import { verifyOperationDecision } from "../scripts/release-availability-contract.js";
import { verifyBuildEvidence } from "../scripts/release-promotion-evidence.js";
import writerBaseline from "../assets/release-writer-baseline.json" with { type: "json" };

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const legacy = JSON.parse(
  readFileSync(
    new URL("./fixtures/release/qualified-1.0.0.json", import.meta.url),
  ),
);
const repository = "Hadden-Industries/json-quality";
export function writerWorld(
  t,
  phase,
  { npmTag, schema3 = false, promoted = false, pilotRetirement = false } = {},
) {
  schema3 ||= promoted;
  const root = mkdtempSync(join(tmpdir(), "json-writer-entry-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const directory = join(root, "admitted"),
    scratch = join(root, "scratch");
  mkdirSync(directory);
  mkdirSync(scratch);
  const release = JSON.parse(Buffer.from(legacy.manifest, "base64")),
    packages = releasePackages(release);
  if (schema3 || promoted) {
    const origins = JSON.parse(
      readFileSync(join(repositoryRoot, "native/production-origins.json")),
    );
    release.schemaVersion = 3;
    release.distribution = {
      schemaVersion: 1,
      packing: { source: release.source.commit },
      subjects: packages.map((subject) => ({
        package: subject.package,
        archiveSha256: subject.archive.sha256,
        files: subject.archive.files,
      })),
      native: release.platformArchives.map((subject) => ({
        package: subject.package,
        platform: subject.platform,
        archiveSha256: subject.archive.sha256,
        buildEvidenceSha256: subject.archive.files.find(
          (file) => file.path === "build-evidence.json",
        ).sha256,
        artifacts: Object.fromEntries(
          subject.archive.files
            .filter(
              (file) =>
                file.path.endsWith(".node") ||
                file.path.endsWith(".dll") ||
                file.path === "json-quality-native",
            )
            .map((file) => [
              file.path,
              { sha256: file.sha256, bytes: file.size },
            ]),
        ),
        notices: subject.archive.files
          .filter((file) => file.path.startsWith("notices/"))
          .map((file) => ({ path: file.path.slice(8), sha256: file.sha256 })),
        components: [{ name: "retained-native-components" }],
        origin: origins.platforms[subject.platform],
      })),
    };
    verifyManifest(release);
  }
  if (promoted) {
    const landed = release.source.commit;
    release.source.commit = "b".repeat(40);
    release.distribution.packing.source = release.source.commit;
    const lock = Buffer.from('{"lockfileVersion":3,"packages":{}}\n');
    release.source.lockSha256 = sha256(lock);
    const build = jsonBytes(release);
    const proof = jsonBytes({
      schemaVersion: 3,
      mode: "FULL",
      repository,
      repositoryId: 11,
      runId: 71,
      runAttempt: 1,
      pullRequest: 17,
      snapshot: {
        commit: release.source.commit,
        tree: release.source.tree,
        parents: ["1".repeat(40), "2".repeat(40)],
      },
      matrix: release.matrix,
      assurance: { policySha256: "c".repeat(64), scans: [{ analysis: 1 }] },
      lanes: release.matrix.os.flatMap((os) =>
        release.matrix.node.map((node) => ({
          lane: { os, node },
          releaseEvidence: { manifestSha256: sha256(build) },
          consumers: { root: { archiveSha256: release.archive.sha256 } },
        })),
      ),
    });
    release.schemaVersion = 4;
    release.promotion = {
      schemaVersion: 1,
      repository,
      workflow: ".github/workflows/ci.yml",
      repositoryId: 11,
      buildCommit: release.source.commit,
      releaseCommit: landed,
      tree: release.source.tree,
      parents: ["1".repeat(40), "2".repeat(40)],
      buildManifestSha256: sha256(build),
      proofSha256: sha256(proof),
      run: 71,
      attempt: 1,
      pullRequest: 17,
    };
    writeFileSync(join(directory, "build-manifest.json"), build);
    writeFileSync(join(directory, "build-qualification.json"), proof);
    writeFileSync(join(directory, "build-package-lock.json"), lock);
    verifyManifest(release);
    verifyBuildEvidence(release, directory);
  }
  const manifest =
    schema3 || promoted
      ? jsonBytes(release)
      : Buffer.from(legacy.manifest, "base64");
  writeFileSync(join(directory, "release-manifest.json"), manifest);
  writeFileSync(join(directory, "signed-tag.json"), jsonBytes(legacy.tag));
  const controller = "a".repeat(40),
    run = "17",
    attempt = "1";
  const env = {
    ...process.env,
    GITHUB_REPOSITORY: repository,
    GITHUB_REPOSITORY_ID: "11",
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_REF: "refs/heads/main",
    GITHUB_ACTOR: "MaksymShostak",
    GITHUB_TRIGGERING_ACTOR: "MaksymShostak",
    GITHUB_WORKFLOW_REF: `${repository}/.github/workflows/${phase === "stage" ? "stage-release" : "promote-release"}.yml@refs/heads/main`,
    GITHUB_SHA: controller,
    GITHUB_RUN_ID: run,
    GITHUB_RUN_ATTEMPT: attempt,
    JSON_QUALITY_PRODUCER_NODE: process.execPath,
    JSON_QUALITY_PRODUCER_NPM: process.env.npm_execpath,
    MANIFEST_SHA: sha256(manifest),
    REVIEW_SHA: "",
    ACCEPTANCE_SHA: "b".repeat(64),
    EXPECTED_LABELS: "",
    RESTORE_VERSION: "",
    RESTORATION_SHA: "",
    STAGE_PHASE: "natives",
    CONTINUATION_REVIEW_SHA: "",
    NPM_TOKEN: "",
    NODE_AUTH_TOKEN: "",
    GH_TOKEN: "fixture-read-only",
    GITHUB_OUTPUT: join(root, "output"),
    ACTIONS_ID_TOKEN_REQUEST_URL: "https://example.invalid/oidc",
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: "fixture-oidc",
    ADMISSION_ARTIFACT_ID: "50",
    ADMISSION_ARTIFACT_DIGEST: "c".repeat(64),
    RELEASE_PROVIDER_FIXTURE: join(root, "provider.json"),
    RELEASE_ADMITTED_DIRECTORY: directory,
  };
  const review = {
    schemaVersion: 1,
    phase: "review",
    owner: "maksymshostak",
    source: release.source.commit,
    version: release.version,
    manifestSha256: env.MANIFEST_SHA,
    acceptedAt: "2026-11-13T00:00:00Z",
    ...(npmTag ? { npmTag } : {}),
    ...(schema3
      ? {
          priorAvailability: {
            npmLatest: Object.fromEntries(
              packages.map((subject) => [subject.package, "0.9.0"]),
            ),
            githubLatest: { id: 1, tag_name: "v0.9.0", prerelease: false },
          },
        }
      : {}),
    decisions: Object.fromEntries(
      ["semver", "security", "rights", "retention"].map((name) => [
        name,
        {
          outcome: "accepted",
          rationale: "Specific isolated publication proof was reviewed.",
          reviewer: "owner",
          independent: name === "security",
          evidence: [
            {
              url: "https://example.invalid/owner-review",
              sha256: "d".repeat(64),
            },
          ],
        },
      ]),
    ),
  };
  const reviewBytes = jsonBytes(review);
  env.REVIEW_SHA = sha256(reviewBytes);
  verifyDecision(
    reviewBytes,
    env.REVIEW_SHA,
    release,
    env.MANIFEST_SHA,
    "review",
  );
  writeFileSync(join(directory, "release-review.json"), reviewBytes);
  const context = {
    schemaVersion: 1,
    repository,
    qualification: { run: "16", attempt: "1" },
    artifacts: [],
  };
  writeFileSync(join(directory, "context.json"), jsonBytes(context));
  const prior = {
    id: 1,
    tag_name: "v0.9.0",
    immutable: true,
    draft: false,
    prerelease: false,
    assets: [],
  };
  const target = {
    id: 437217191,
    tag_name: "v1.0.0",
    immutable: true,
    draft: false,
    prerelease: true,
    assets: legacy.release.assets,
  };
  const jobs = [
    "admit",
    ...(phase === "stage" ? ["stage"] : ["npm", "github", "complete"]),
  ].map((name, index) => ({
    id: index + 1,
    name,
    run_id: 17,
    run_attempt: 1,
    head_sha: controller,
    status: name === "admit" ? "completed" : "in_progress",
    conclusion: name === "admit" ? "success" : null,
    runner_id: index + 1,
    started_at: "2026-11-13T00:00:00Z",
    completed_at: name === "admit" ? "2026-11-13T00:01:00Z" : null,
    steps: [
      {
        name: "Apply admitted release effect",
        status: "completed",
        conclusion: "success",
        started_at: "2026-11-13T00:00:00Z",
        completed_at: "2026-11-13T00:01:00Z",
      },
    ],
  }));
  const runRecord = {
    id: 17,
    run_attempt: 1,
    repository: { id: 11, full_name: repository },
    head_repository: { id: 11, full_name: repository },
    head_branch: "main",
    head_sha: controller,
    event: "workflow_dispatch",
    path: `.github/workflows/${phase === "stage" ? "stage-release" : "promote-release"}.yml`,
    status: "in_progress",
    conclusion: null,
    ...(phase === "promote" && {
      workflow_id: writerBaseline.workflows.promote.id,
      run_number: writerBaseline.workflows.promote.runs.length + 1,
    }),
  };
  const artifact = (id, name, digest = "sha256:" + "c".repeat(64)) => ({
    id,
    name,
    digest,
    expired: false,
    size_in_bytes: 1024,
    workflow_run: {
      id: Number(env.GITHUB_RUN_ID),
      repository_id: 11,
      head_repository_id: 11,
      head_sha: controller,
    },
  });
  const state = {
    calls: [],
    mutations: [],
    singleton: true,
    npm: Object.fromEntries(
      packages.map((subject) => [
        subject.package,
        { latest: "0.9.0", pilot: release.version },
      ]),
    ),
    github: { latest: prior, releases: { prior, target } },
    routes: {
      "git/ref/heads/main": {
        ref: "refs/heads/main",
        object: { sha: controller },
      },
      "actions/runs/17/attempts/1": runRecord,
      "actions/runs/17/attempts/1/jobs?per_page=100": {
        total_count: jobs.length,
        jobs,
      },
      "actions/artifacts/50": artifact(50, `admitted-${phase}-1`),
      "git/ref/tags/v1.0.0": legacy.tag.reference,
      [`git/tags/${legacy.tag.annotation.sha}`]: legacy.tag.annotation,
    },
  };
  let prepared = null;
  if (phase === "promote") {
    const family = {
      schemaVersion: 2,
      operation: "promote",
      subjects: packages.map((subject) => ({
        package: subject.package,
        prior: "0.9.0",
        target: release.version,
        integrity: subject.archive.integrity,
        selected: true,
      })),
      github: {
        prior,
        target: { ...target, prerelease: false },
        targetPrior: target,
        selected: true,
      },
    };
    if (pilotRetirement) {
      target.prerelease = false;
      family.operation = "retire-pilot";
      family.stableVersion = release.version;
      family.retiredVersion = release.version;
      family.github = { selected: false, prior: target, target };
      for (const subject of family.subjects) {
        subject.prior = release.version;
        subject.target = null;
        subject.removalApproved = true;
        delete subject.integrity;
        state.npm[subject.package].latest = release.version;
      }
      state.github.latest = target;
    }
    const operation = {
      schemaVersion: 2,
      phase: "availability",
      owner: "maksymshostak",
      source: release.source.commit,
      version: release.version,
      sourceReleaseId: target.id,
      manifestSha256: env.MANIFEST_SHA,
      originalReviewSha256: env.REVIEW_SHA,
      controllerSource: controller,
      controlDeltaSha256: "d".repeat(64),
      acceptedAt: "2026-11-13T00:00:00Z",
      rationale: "Promote the independently qualified exact isolated family.",
      targets: [
        {
          version: release.version,
          releaseId: target.id,
          manifestSha256: env.MANIFEST_SHA,
        },
      ],
      family,
    };
    if (pilotRetirement)
      operation.retiredTarget = { ...operation.targets[0], prerelease: false };
    env.OPERATION_JSON = JSON.stringify(operation);
    env.OPERATION_SHA = sha256(Buffer.from(env.OPERATION_JSON));
    verifyOperationDecision(
      Buffer.from(env.OPERATION_JSON),
      env.OPERATION_SHA,
      release,
      env,
    );
    writeFileSync(
      join(directory, "availability-operation.json"),
      env.OPERATION_JSON,
    );
    prepared = {
      family: { ...family, operationId: env.OPERATION_SHA },
      targets: [
        {
          release,
          releaseId: target.id,
          assets: target.assets,
          tagSha: legacy.tag.reference.object.sha,
        },
      ],
      availability: pilotRetirement ? "npm-only" : "npm-and-github",
      security: {},
    };
  }
  const receipt = prepareWriterAdmission(
    directory,
    phase,
    { release, context },
    env,
    prepared,
  );
  env.ADMISSION_RECEIPT_SHA = receipt.sha256;
  const gitDirectory = join(root, "public-tag.git");
  assert.equal(
    spawnSync("git", ["init", "--bare", "--quiet", gitDirectory], {
      windowsHide: true,
    }).status,
    0,
  );
  const inserted = spawnSync(
    "git",
    ["--git-dir", gitDirectory, "hash-object", "-w", "-t", "tag", "--stdin"],
    {
      input: Buffer.from(legacy.tagObject, "base64"),
      encoding: "utf8",
      windowsHide: true,
    },
  );
  assert.equal(inserted.status, 0);
  assert.equal(inserted.stdout.trim(), legacy.tag.annotation.sha);
  state.gitDirectory = gitDirectory;
  writeFileSync(env.RELEASE_PROVIDER_FIXTURE, JSON.stringify(state));
  return {
    root,
    directory,
    scratch,
    env,
    release,
    prepared,
    artifact,
    state: () => JSON.parse(readFileSync(env.RELEASE_PROVIDER_FIXTURE)),
    update: (change) => {
      const current = JSON.parse(readFileSync(env.RELEASE_PROVIDER_FIXTURE));
      change(current);
      writeFileSync(env.RELEASE_PROVIDER_FIXTURE, JSON.stringify(current));
    },
    retainNativeArtifact: (id, name, from = directory) => {
      const path = join(root, `${id}.zip`);
      const packed = spawnSync(
        "python",
        [
          join(repositoryRoot, "scripts/pack-artifact.py"),
          from,
          path,
          "100000000",
        ],
        { windowsHide: true, encoding: "utf8" },
      );
      assert.equal(packed.status, 0, packed.stderr);
      const bytes = readFileSync(path),
        current = JSON.parse(readFileSync(env.RELEASE_PROVIDER_FIXTURE));
      const identity = {
        ...artifact(id, name, "sha256:" + sha256(bytes)),
        size_in_bytes: bytes.length,
      };
      if (id === 50)
        env.ADMISSION_ARTIFACT_DIGEST = identity.digest.replace(
          /^sha256:/u,
          "",
        );
      current.routes[`actions/artifacts/${id}`] = identity;
      current.routes[`actions/runs/${env.GITHUB_RUN_ID}`] =
        current.routes[`actions/runs/${env.GITHUB_RUN_ID}/attempts/1`];
      const inventory = (current.routes[
        `actions/runs/${env.GITHUB_RUN_ID}/artifacts?per_page=100`
      ] ??= { total_count: 0, artifacts: [] });
      inventory.artifacts.push(identity);
      inventory.total_count++;
      current.binary ??= {};
      current.binary[`actions/artifacts/${id}/zip`] = bytes.toString("base64");
      const writer = /^effect-promote-(npm|github)-1$/u.exec(name);
      if (writer) {
        const provider = current.routes[
          `actions/runs/${env.GITHUB_RUN_ID}/attempts/1/jobs?per_page=100`
        ].jobs.find((job) => job.name === writer[1]);
        provider.steps.push({
          name: "Run ./.github/actions/upload-writer-evidence",
          status: "completed",
          conclusion: "success",
          started_at: "2026-11-13T00:01:01Z",
          completed_at: "2026-11-13T00:01:02Z",
        });
        const receipt = {
          phase: "release-writer-artifact",
          schemaVersion: 1,
          repositoryId: 11,
          headRepositoryId: 11,
          workflow: env.GITHUB_WORKFLOW_REF,
          controller,
          run: Number(env.GITHUB_RUN_ID),
          attempt: 1,
          job: writer[1],
          step: 1,
          id,
          name,
          digest: identity.digest,
          size: identity.size_in_bytes,
        };
        current.binary[`actions/jobs/${provider.id}/logs`] = Buffer.from(
          [
            "##[start-action display=Reconcile writer evidence upload 1;id=__self_3.first]",
            JSON.stringify(receipt),
            "##[end-action id=__self_3.first;outcome=success;conclusion=success;duration_ms=100]",
          ]
            .map((line) => `2026-11-13T00:01:01.1Z ${line}\n`)
            .join(""),
        ).toString("base64");
      }
      writeFileSync(env.RELEASE_PROVIDER_FIXTURE, JSON.stringify(current));
      return identity;
    },
    independent: (extra = {}) => {
      const current = JSON.parse(readFileSync(env.RELEASE_PROVIDER_FIXTURE));
      const observed = current.routes[`actions/runs/${run}/attempts/1`];
      const jobs =
        current.routes[`actions/runs/${run}/attempts/1/jobs?per_page=100`].jobs;
      observed.status = "completed";
      observed.conclusion = jobs.some((job) => job.conclusion === "failure")
        ? "failure"
        : "success";
      current.routes[`actions/runs/${run}`] = observed;
      const completion = jobs.find((job) => job.name === "complete");
      if (completion.status !== "completed") {
        completion.status = "completed";
        completion.conclusion = "skipped";
        completion.completed_at = "2026-11-13T00:03:00Z";
      }
      writeFileSync(env.RELEASE_PROVIDER_FIXTURE, JSON.stringify(current));
      const output = mkdtempSync(join(root, "observer-")),
        work = mkdtempSync(join(root, "observer-work-"));
      const result = spawnSync(
        process.execPath,
        [
          "--import",
          new URL("./release-provider-fixture-hook.mjs", import.meta.url).href,
          "scripts/complete-promotion.js",
          output,
          work,
        ],
        {
          cwd: repositoryRoot,
          windowsHide: true,
          timeout: 30_000,
          encoding: "utf8",
          env: {
            ...env,
            GITHUB_RUN_ID: "18",
            GITHUB_RUN_ATTEMPT: "1",
            COMPLETION_RUN: "17",
            COMPLETION_ATTEMPT: "1",
            ACTIONS_ID_TOKEN_REQUEST_URL: "",
            ACTIONS_ID_TOKEN_REQUEST_TOKEN: "",
            ...extra,
          },
        },
      );
      return { ...result, output };
    },
    run: (command, extra = {}) =>
      spawnSync(
        process.execPath,
        [
          "--import",
          new URL("./release-provider-fixture-hook.mjs", import.meta.url).href,
          ...(command === "publication"
            ? [
                "--input-type=module",
                "--eval",
                `import {readFileSync} from "node:fs"; import {join} from "node:path"; import {completeFamilyPublication} from "./scripts/release-effects.js"; const directory=process.env.RELEASE_ADMITTED_DIRECTORY; completeFamilyPublication(directory, ${JSON.stringify(scratch)}, JSON.parse(readFileSync(join(directory,"release-manifest.json"))), process.env, process.env.PUBLICATION_RECOVERY ? {} : null);`,
              ]
            : command === "complete"
              ? ["scripts/complete-promotion.js", directory, scratch]
              : ["scripts/release-command.js", command, directory, scratch]),
        ],
        {
          cwd: repositoryRoot,
          windowsHide: true,
          timeout: 30_000,
          encoding: "utf8",
          env: { ...env, ...extra },
        },
      ),
  };
}
