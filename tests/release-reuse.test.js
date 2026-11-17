// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { writerWorld } from "./release-entry-fixture.mjs";
import { temporaryDirectory } from "./temporary-directory.js";
import {
  promoteManifest,
  mergeQualificationContext,
  reuseQualification,
} from "../scripts/release-reuse.js";
import {
  releaseCommit,
  verifyBuildEvidence,
} from "../scripts/release-promotion-evidence.js";
import {
  jsonBytes,
  sha256,
  verifyManifest,
  verifyRun,
} from "../scripts/release-contract.js";
import {
  auditFrozenLock,
  qualifyFrozenGraphs,
} from "../scripts/release-assurance.js";
import { qualifiedCiFixture } from "./ci-proof-fixture.js";
import { createReceipt } from "../scripts/ci-proof.js";
import { mkdirSync } from "node:fs";
import { sha512 } from "../scripts/release-contract.js";

test("complete reuse admits all original attempts and layouts without invoking a producer", async (t) => {
  const f = qualifiedCiFixture(2);
  const world = writerWorld(t, "stage", { schema3: true });
  const release = structuredClone(world.release);
  release.source.commit = f.ctx.sha;
  release.source.tree = f.ctx.snapshot.tree;
  release.version = f.records[0].consumers.root.packageVersion;
  release.matrix = f.matrix;
  release.policy = JSON.parse(
    readFileSync(new URL("../assets/node-support.json", import.meta.url)),
  );
  release.toolchain = {
    node: release.policy.reference,
    npm: release.policy.producerNpm.version,
  };
  const lock = Buffer.from('{"lockfileVersion":3,"packages":{}}\n');
  release.source.lockSha256 = sha256(lock);
  release.archive.files.find(
    ({ path }) => path === "assets/default-json-quality-policy.json",
  ).sha256 = f.ctx.snapshot.defaultPolicySha256;
  const payloads = new Map();
  for (const subject of [
    { package: release.package, archive: release.archive },
    ...release.platformArchives,
  ]) {
    subject.version = release.version;
    const bytes = Buffer.from(subject.package);
    payloads.set(subject.archive.filename, bytes);
    Object.assign(subject.archive, {
      size: bytes.length,
      sha256: sha256(bytes),
      integrity: sha512(bytes),
    });
  }
  release.distribution.packing.source = release.source.commit;
  for (const subject of release.distribution.subjects) {
    const archive =
      subject.package === release.package
        ? release.archive
        : release.platformArchives.find(
            (item) => item.package === subject.package,
          ).archive;
    subject.archiveSha256 = archive.sha256;
    subject.files = archive.files;
  }
  for (const subject of release.distribution.native)
    subject.archiveSha256 = release.platformArchives.find(
      (item) => item.package === subject.package,
    ).archive.sha256;
  verifyManifest(release);
  const manifestBytes = jsonBytes(release);
  for (const lane of f.records) {
    lane.schemaVersion = 3;
    lane.releaseEvidence = { manifestSha256: sha256(manifestBytes) };
    for (const consumer of Object.values(lane.consumers)) {
      consumer.archiveSha256 = release.archive.sha256;
      const native = release.platformArchives.find(
        (item) => item.package === consumer.nativePackage.name,
      );
      consumer.nativePackage.integrity = native.archive.integrity;
      consumer.minimalCli.nativePackage.integrity = native.archive.integrity;
      consumer.minimalCli.corePackage.sha256 = release.archive.sha256;
      consumer.minimalCli.corePackage.integrity = release.archive.integrity;
    }
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
  receipt.assurance = {
    policySha256: "a".repeat(64),
    scans: [{ analysis: 1 }],
  };
  const proofBytes = jsonBytes(receipt);
  Object.assign(f.artifact, {
    digest: `sha256:${sha256(proofBytes)}`,
    size_in_bytes: proofBytes.length,
  });
  const artifacts = f.records.map((lane, index) => ({
    id: 600 + index,
    name: `consumer-${lane.lane.os}-${lane.lane.node}-${lane.runAttempt}`,
    expired: false,
    digest: `sha256:${"b".repeat(64)}`,
    size_in_bytes: 100,
    created_at: new Date(f.now - 3000).toISOString(),
    workflow_run: f.artifact.workflow_run,
  }));
  let calls = 0;
  const read = async (path, options) => {
    calls++;
    if (path === "/git/ref/heads/main") return { object: { sha: f.main.sha } };
    if (path === "/actions/artifacts/501/zip") return proofBytes;
    if (path === "/actions/runs/71/artifacts?per_page=100")
      return {
        total_count: artifacts.length + 1,
        artifacts: [f.artifact, ...artifacts],
      };
    const found = artifacts.find(
      ({ id }) => path === `/actions/artifacts/${id}`,
    );
    return found ?? f.read(path, options);
  };
  let transfers = 0;
  const destination = join(world.root, "reused");
  const result = await reuseQualification({
    matrix: f.matrix,
    read,
    snapshot: f.main.snapshot,
    now: () => f.now,
    destination,
    environment: {
      GITHUB_REPOSITORY: "Hadden-Industries/json-quality",
      GITHUB_REPOSITORY_ID: "11",
      GITHUB_RUN_ID: "72",
      GITHUB_RUN_ATTEMPT: "1",
      GITHUB_EVENT_NAME: "workflow_dispatch",
      GITHUB_REF: "refs/heads/main",
      GITHUB_SHA: f.main.sha,
      RELEASE_VERSION: release.version,
    },
    download: async ({ id, destination: path }) => {
      transfers++;
      mkdirSync(path, { recursive: true });
      if (id === 502) {
        writeFileSync(join(path, "release-manifest.json"), manifestBytes);
        writeFileSync(join(path, "build-package-lock.json"), lock);
        for (const [name, bytes] of payloads)
          writeFileSync(join(path, name), bytes);
      } else {
        const lane = f.records[id - 600];
        for (const layout of ["root", "isolated"]) {
          const files = {
            [`${layout}-result.json`]: {
              ...lane.consumers[layout],
              status: "passed",
              layout,
              nativeToolchain: { npm: release.policy.consumerNpm },
            },
            [`${layout}-inventory.json`]: {
              layout,
              node: lane.lane.node,
              lockSha256: sha256(lock),
            },
            [`${layout}-audit.json`]: {
              auditReportVersion: 2,
              vulnerabilities: {},
              metadata: { vulnerabilities: { total: 0 } },
            },
            [`${layout}-locations.json`]: [{}],
            [`${layout}.cdx.json`]: { bomFormat: "CycloneDX" },
          };
          for (const [name, value] of Object.entries(files))
            writeFileSync(join(path, name), jsonBytes(value));
          writeFileSync(join(path, `${layout}-lock.json`), lock);
        }
      }
    },
  });
  assert.equal(result.reused, "true");
  let audits = 0;
  const current = qualifyFrozenGraphs(
    destination,
    join(world.root, "current-audits"),
    {
      run: (args) => {
        audits++;
        assert.equal(args[0], "audit");
        assert.ok(args.includes("--package-lock-only"));
        return JSON.stringify({
          auditReportVersion: 2,
          vulnerabilities: {},
          metadata: { vulnerabilities: { total: 0 } },
        });
      },
    },
  );
  assert.equal(audits, 1 + f.records.length * 2);
  assert.equal(current.results.length, audits);
  assert.equal(transfers, 1 + f.records.length);
  assert.deepEqual(
    readFileSync(join(destination, "build-qualification.json")),
    proofBytes,
  );
  for (const [name, bytes] of payloads)
    assert.deepEqual(readFileSync(join(destination, name)), bytes);
  // Native download has two metadata observations, a GET and one storage redirect.
  const nativeRequestEstimate = calls + transfers * 4 + 1;
  t.diagnostic(
    `Complete ${f.records.length}-lane partial-rerun admission: ${calls} metadata/proof calls plus ${transfers * 4} native transfer requests and one proof storage redirect = ${nativeRequestEstimate}.`,
  );
  assert.ok(nativeRequestEstimate > 64);
  assert.ok(nativeRequestEstimate < 96);
});

test("promotion preserves original subjects and exact proof/lock bytes while authorizing the landed commit", (t) => {
  const world = writerWorld(t, "stage", { schema3: true });
  const original = structuredClone(world.release);
  const lock = Buffer.from('{"lockfileVersion":3,"packages":{}}\n');
  original.source.lockSha256 = sha256(lock);
  const manifestBytes = jsonBytes(original);
  const receipt = {
    schemaVersion: 3,
    mode: "FULL",
    repository: "Hadden-Industries/json-quality",
    repositoryId: 11,
    runId: 71,
    runAttempt: 2,
    pullRequest: 17,
    matrix: original.matrix,
    snapshot: {
      commit: original.source.commit,
      tree: original.source.tree,
      parents: ["1".repeat(40), "2".repeat(40)],
    },
    assurance: { policySha256: "a".repeat(64), scans: [{ analysis: 10 }] },
    lanes: original.matrix.os.flatMap((os) =>
      original.matrix.node.map((node) => ({
        lane: { os, node },
        releaseEvidence: { manifestSha256: sha256(manifestBytes) },
        consumers: {
          root: {
            archiveSha256: original.archive.sha256,
            packageVersion: original.version,
          },
        },
      })),
    ),
  };
  // The exact noncompact serialization is deliberately the retained hash subject.
  // eslint-disable-next-line json-quality/no-json-stringify-identity
  const proofBytes = Buffer.from(JSON.stringify(receipt, null, 2) + "\n");
  const promoted = promoteManifest({
    manifestBytes,
    receipt,
    proofBytes,
    releaseSource: "f".repeat(40),
    selection: { run: { id: 71, run_attempt: 2 }, pr: { number: 17 } },
  });
  assert.equal(releaseCommit(promoted), "f".repeat(40));
  assert.equal(promoted.source.commit, original.source.commit);
  assert.deepEqual(promoted.distribution, original.distribution);
  assert.deepEqual(promoted.archive, original.archive);
  for (const [name, bytes] of [
    ["build-manifest.json", manifestBytes],
    ["build-qualification.json", proofBytes],
    ["build-package-lock.json", lock],
  ])
    writeFileSync(join(world.directory, name), bytes);
  assert.deepEqual(verifyBuildEvidence(promoted, world.directory), receipt);
  assert.deepEqual(
    readFileSync(join(world.directory, "build-qualification.json")),
    proofBytes,
  );
  const broken = structuredClone(promoted);
  broken.promotion.tree = "0".repeat(40);
  assert.throws(() => verifyManifest(broken));
  writeFileSync(
    join(world.directory, "build-package-lock.json"),
    "substituted",
  );
  assert.throws(() => verifyBuildEvidence(promoted, world.directory));
});

test("missing evidence stops reuse without publishing outputs or running a fresh path", async (t) => {
  const directory = temporaryDirectory(t, "json-reuse-stop-");
  const snapshot = {
    commit: "a".repeat(40),
    tree: "b".repeat(40),
    parents: ["c".repeat(40), "d".repeat(40)],
    workflow: "e".repeat(40),
    defaultPolicySha256: "f".repeat(64),
  };
  const environment = {
    GITHUB_REPOSITORY: "Hadden-Industries/json-quality",
    GITHUB_REF: "refs/heads/main",
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_SHA: snapshot.commit,
    GITHUB_REPOSITORY_ID: "11",
    GITHUB_RUN_ID: "72",
    GITHUB_RUN_ATTEMPT: "1",
  };
  assert.equal(
    mergeQualificationContext(environment, snapshot).event.before,
    snapshot.parents[0],
  );
  await assert.rejects(
    reuseQualification({
      environment,
      snapshot,
      destination: join(directory, "output"),
      read: async () => {
        throw new Error("Unavailable evidence");
      },
    }),
    /Unavailable evidence/u,
  );
  assert.equal(existsSync(join(directory, "output")), false);
  const entry = fileURLToPath(
    new URL("../scripts/release-reuse.js", import.meta.url),
  );
  const forced = spawnSync(
    process.execPath,
    [entry, join(directory, "output")],
    {
      env: {
        ...process.env,
        FORCE_FRESH: "true",
        GH_TOKEN: "",
        GITHUB_OUTPUT: "",
        GITHUB_STEP_SUMMARY: "",
      },
      encoding: "utf8",
      windowsHide: true,
    },
  );
  assert.equal(forced.status, 0, forced.stderr);
  assert.deepEqual(JSON.parse(forced.stdout).fresh, "true");
});

test("frozen audit uses original locks without install, scripts or mutation", () => {
  const lock = Buffer.from('{"lockfileVersion":3,"packages":{}}\n');
  const report = {
    auditReportVersion: 2,
    vulnerabilities: {},
    metadata: { vulnerabilities: { total: 0 } },
  };
  let calls = 0;
  assert.deepEqual(
    auditFrozenLock(
      lock,
      { name: "fixture" },
      {
        run: (args, options) => {
          calls++;
          assert.deepEqual(args, [
            "audit",
            "--package-lock-only",
            "--ignore-scripts",
            "--json",
            "--audit-level=none",
            "--include=dev",
            "--include=optional",
            "--include=peer",
          ]);
          assert.equal(options.env.NPM_CONFIG_IGNORE_SCRIPTS, "true");
          assert.deepEqual(
            readFileSync(join(options.cwd, "package-lock.json")),
            lock,
          );
          return JSON.stringify(report);
        },
      },
    ),
    report,
  );
  assert.equal(calls, 1);
  assert.throws(
    () =>
      auditFrozenLock(
        lock,
        {},
        {
          run: () =>
            JSON.stringify({ ...report, vulnerabilities: { bad: {} } }),
        },
      ),
    /Unresolved/u,
  );
});

test("promoted qualification admits only explicitly skipped fresh jobs and successful remaining gates", () => {
  const names = ["resolve", "product", "codeql", "security", "qualified"];
  const provider = {
    run: {
      id: 71,
      run_attempt: 1,
      repository: { full_name: "Hadden-Industries/json-quality" },
      path: ".github/workflows/release-qualification.yml",
      event: "workflow_dispatch",
      head_branch: "main",
      head_sha: "a".repeat(40),
      status: "completed",
      conclusion: "success",
    },
    jobs: {
      total_count: 5,
      jobs: names.map((name) => ({
        name,
        run_id: 71,
        run_attempt: 1,
        head_sha: "a".repeat(40),
        status: "completed",
        conclusion: ["product", "codeql"].includes(name)
          ? "skipped"
          : "success",
      })),
    },
  };
  verifyRun(
    provider,
    "qualification",
    "a".repeat(40),
    {},
    { reusedQualification: true },
  );
  provider.jobs.jobs.find(({ name }) => name === "security").conclusion =
    "skipped";
  assert.throws(() =>
    verifyRun(
      provider,
      "qualification",
      "a".repeat(40),
      {},
      { reusedQualification: true },
    ),
  );
});
