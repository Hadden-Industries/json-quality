// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseDocument } from "yaml";
import { gh } from "../scripts/release-provider.js";
import { budgets } from "../scripts/qualification-budgets.js";
import { downloadEvidence } from "../scripts/download-evidence.js";
import { registryBytes } from "../scripts/qualify-registry.js";
import { checkWorkflows } from "../scripts/check-workflows.js";
import {
  bundleReleaseAssets,
  acquireArchiveEvidence,
} from "../scripts/release-assets.js";
import {
  jsonBytes,
  releasePackages,
  sha256,
  sha512,
  restorationAvailability,
} from "../scripts/release-contract.js";
import {
  applyAvailability,
  stagePublishArguments,
  verifyNpmOnlyGithubState,
  journalEffect,
} from "../scripts/release-effects.js";
import {
  reconcilePromotionLabels,
  verifyRecoveryRecord,
} from "../scripts/release-recovery.js";
import {
  prepareWriterEvidence,
  reconcileWriterEvidence,
} from "../scripts/writer-evidence.js";
import {
  verifyStageCancellation,
  rejectReleaseStages,
} from "../scripts/reject-release-stages.js";
import { createHash } from "node:crypto";
import {
  reportPublicQualification,
  originalStageJournals,
} from "../scripts/release-public-state.js";

function temporary(t) {
  const root = mkdtempSync(join(tmpdir(), "json-quality-release-resilience-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
function release() {
  return {
    package: "@hadden-industries/json-quality",
    version: "1.0.0-rc.2",
    source: { commit: "a".repeat(40) },
    archive: { filename: "core.tgz", integrity: sha512(Buffer.from("core")) },
    platformArchives: ["linux-x64", "win32-x64"].map((platform) => ({
      package: `@hadden-industries/json-quality-${platform}`,
      version: "1.0.0-rc.2",
      archive: { filename: `${platform}.tgz` },
    })),
  };
}

test("raw writer transport adopts an unknown upload only after exact native readback", async (t) => {
  const root = temporary(t),
    source = join(root, "source");
  mkdirSync(source);
  writeFileSync(
    join(source, "original.jsonl"),
    '{"state":"outcome-unknown"}\n',
  );
  const env = {
    ...process.env,
    RUNNER_TEMP: root,
    GITHUB_OUTPUT: join(root, "output"),
    GITHUB_RUN_ID: "17",
    GITHUB_SHA: "a".repeat(40),
    GITHUB_REPOSITORY_ID: "11",
    UPLOAD_RESULT: "failure",
  };
  const record = prepareWriterEvidence(source, "effect-stage-1", env);
  const transport = join(record.path, "..", "transport.json");
  let reads = 0;
  const artifact = {
    id: 90,
    name: record.name,
    digest: record.digest,
    size_in_bytes: record.size,
    expired: false,
    workflow_run: { id: 17, repository_id: 11, head_sha: env.GITHUB_SHA },
  };
  const adopted = await reconcileWriterEvidence(transport, 1, env, {
    sleep: async () => {},
    read: async () => ({
      total_count: ++reads < 2 ? 0 : 1,
      artifacts: reads < 2 ? [] : [artifact],
    }),
  });
  assert.equal(adopted.id, 90);
  assert.equal(reads, 2);
  await assert.rejects(() =>
    reconcileWriterEvidence(transport, 1, env, {
      read: async () => ({
        total_count: 1,
        artifacts: [{ ...artifact, digest: "sha256:" + "0".repeat(64) }],
      }),
    }),
  );
  const fallback = await reconcileWriterEvidence(transport, 1, env, {
    sleep: async () => {},
    read: async () => ({ total_count: 0, artifacts: [] }),
  });
  assert.equal(fallback, null);
  assert.ok(existsSync(record.path + "-recovery-2"));
});

test("acknowledged writer uploads wait for their exact immutable ID within one read deadline", async (t) => {
  const root = temporary(t),
    source = join(root, "source");
  mkdirSync(source);
  writeFileSync(join(source, "journal.jsonl"), '{"state":"completed"}\n');
  const env = {
    ...process.env,
    RUNNER_TEMP: root,
    GITHUB_OUTPUT: join(root, "output"),
    GITHUB_RUN_ID: "17",
    GITHUB_SHA: "a".repeat(40),
    GITHUB_REPOSITORY_ID: "11",
    UPLOAD_RESULT: "success",
    UPLOAD_ID: "90",
  };
  const record = prepareWriterEvidence(source, "effect-stage-1", env),
    transport = join(record.path, "..", "transport.json"),
    artifact = {
      id: 90,
      name: record.name,
      digest: record.digest,
      size_in_bytes: record.size,
      expired: false,
      workflow_run: { id: 17, repository_id: 11, head_sha: env.GITHUB_SHA },
    };
  env.UPLOAD_DIGEST = record.digest.slice(7);
  let clock = 1000000,
    reads = 0;
  const waits = [];
  const result = await reconcileWriterEvidence(transport, 1, env, {
    now: () => clock,
    wallNow: () => clock,
    sleep: async (milliseconds) => {
      waits.push(milliseconds);
      clock += milliseconds;
    },
    read: async (path) => {
      assert.equal(path, "/actions/artifacts/90");
      if (++reads === 1)
        throw Object.assign(new Error("not visible yet"), {
          httpStatus: 404,
          retryAt: new Date(clock + 3000).toISOString(),
        });
      return artifact;
    },
  });
  assert.equal(result, artifact);
  assert.equal(reads, 2);
  assert.deepEqual(waits, [3000]);
  assert.ok(!existsSync(record.path + "-recovery-2"));
  for (const status of [401, 403, 500]) {
    let calls = 0;
    await assert.rejects(() =>
      reconcileWriterEvidence(transport, 1, env, {
        read: async () => {
          calls++;
          throw Object.assign(new Error("terminal provider response"), {
            httpStatus: status,
          });
        },
        sleep: async () => assert.fail("Terminal responses must not retry"),
      }),
    );
    assert.equal(calls, 1);
  }
  await assert.rejects(() =>
    reconcileWriterEvidence(transport, 1, env, {
      read: async () => ({ ...artifact, digest: "sha256:" + "0".repeat(64) }),
      sleep: async () => assert.fail("Changed evidence must not retry"),
    }),
  );
  for (const malformed of [null, false, 0, [], {}, { ...artifact, id: 91 }]) {
    let calls = 0;
    await assert.rejects(() =>
      reconcileWriterEvidence(transport, 1, env, {
        read: async () => {
          calls++;
          return malformed;
        },
        sleep: async () => assert.fail("Malformed evidence must not retry"),
      }),
    );
    assert.equal(calls, 1);
  }
  let expiredReads = 0;
  await assert.rejects(
    () =>
      reconcileWriterEvidence(transport, 1, env, {
        now: () => clock,
        wallNow: () => clock,
        sleep: async (milliseconds) => {
          assert.equal(milliseconds, budgets.read);
          clock += milliseconds;
        },
        read: async () => {
          expiredReads++;
          throw Object.assign(new Error("visibility deadline"), {
            httpStatus: 404,
            retryAt: new Date(clock + budgets.read * 2).toISOString(),
          });
        },
      }),
    /visibility deadline/u,
  );
  assert.equal(expiredReads, 1);
});

test("rejection settlement requires original request binding, native acknowledgement and full authenticated absence", () => {
  const expected = {
    run: "17",
    attempt: "1",
    journalSha256: "a".repeat(64),
    package: "@hadden-industries/json-quality-win32-x64",
    version: "1.1.0",
    integrity: "sha512-Ynl0ZXM=",
  };
  const stageId = "01234567-1234-4123-8123-0123456789ab";
  const proof = {
    schemaVersion: 1,
    ...expected,
    stageId,
    acknowledgement: `Staged package ${stageId} has been rejected.\n`,
    authenticatedAs: "MaksymShostak",
    inventory: [],
    observedAt: "2026-11-13T00:00:00Z",
  };
  assert.equal(verifyStageCancellation(proof, expected), proof);
  for (const change of [
    { acknowledgement: "404 Not Found" },
    { authenticatedAs: "" },
    { inventory: [{ id: stageId }] },
    { run: "18" },
  ])
    assert.throws(() =>
      verifyStageCancellation({ ...proof, ...change }, expected),
    );
});

test("owner rejection handles a pending subset and a 30MB archive, then resumes acknowledged readback without another DELETE", (t) => {
  const root = temporary(t),
    golden = JSON.parse(
      readFileSync(
        new URL("./fixtures/release/qualified-1.0.0.json", import.meta.url),
      ),
    ),
    release = JSON.parse(Buffer.from(golden.manifest, "base64"));
  const selected = release.platformArchives[1],
    payload = Buffer.alloc(30_368_399);
  selected.archive = {
    ...selected.archive,
    size: payload.length,
    sha256: sha256(payload),
    integrity: sha512(payload),
  };
  writeFileSync(join(root, selected.archive.filename), payload);
  writeFileSync(join(root, "release-manifest.json"), JSON.stringify(release));
  const ids = [
      "01234567-1234-4123-8123-0123456789ab",
      "01234567-1234-4123-8123-0123456789ac",
    ],
    manifestSha256 = sha256(readFileSync(join(root, "release-manifest.json")));
  const journal = Buffer.from(
    release.platformArchives
      .flatMap((subject, index) => {
        const intent = {
          state: "intent",
          package: subject.package,
          version: release.version,
          manifestSha256,
          integrity: subject.archive.integrity,
        };
        return [
          JSON.stringify(intent),
          JSON.stringify({
            state: "completed",
            intentSha256: sha256(Buffer.from(JSON.stringify(intent) + "\n")),
            result: { stageId: ids[index] },
          }),
        ];
      })
      .join("\n") + "\n",
  );
  writeFileSync(join(root, "stage-17-1.jsonl"), journal);
  const decision = {
    owner: "maksymshostak",
    action: "reject-original-stages",
    run: "17",
    attempt: "1",
    manifestSha256,
    journalSha256: sha256(journal),
    stages: [{ package: selected.package, stageId: ids[1] }],
    historyCheckpoint: {},
  };
  const output = join(root, "release-history.json"),
    calls = [];
  let listFails = true;
  const invoke = (args, options) => {
    calls.push(args.slice(0, 2));
    if (args[0] === "--version") return "12.2.2\n";
    if (args[0] === "whoami") return "MaksymShostak\n";
    if (args[1] === "view")
      return JSON.stringify({
        id: ids[1],
        packageName: selected.package,
        version: release.version,
        shasum: createHash("sha1").update(payload).digest("hex"),
      });
    if (args[1] === "reject") {
      assert.equal(options.env.NPM_CONFIG_OTP, "123456");
      assert.ok(args.includes("--fetch-retries=0"));
      return `Staged package ${ids[1]} has been rejected.\n`;
    }
    if (listFails) throw new Error("Readback unavailable");
    return "[]";
  };
  const history = () => ({
    schemaVersion: 2,
    repository: "Hadden-Industries/json-quality",
    entries: [],
  });
  assert.throws(
    () =>
      rejectReleaseStages(root, decision, output, invoke, history, {
        NPM_CONFIG_OTP: "123456",
      }),
    /Readback unavailable/,
  );
  listFails = false;
  const result = rejectReleaseStages(
    root,
    decision,
    output,
    invoke,
    history,
    {},
  );
  assert.equal(result.state, "awaiting-owner-signature");
  assert.equal(calls.filter((args) => args[1] === "reject").length, 1);
  assert.equal(calls.filter((args) => args[1] === "view").length, 1);
  const retained = JSON.parse(readFileSync(output));
  assert.equal(retained.stageCancellations.length, 1);
  assert.equal(retained.stageCancellations[0].stageId, ids[1]);
  assert.ok(
    !readFileSync(output + ".jsonl", "utf8").includes('123456"'),
    "OTP must not enter retained evidence",
  );
});

test("failed public qualification reports changed defaults and both staging origins without writes", (t) => {
  const root = temporary(t),
    golden = JSON.parse(
      readFileSync(
        new URL("./fixtures/release/qualified-1.0.0.json", import.meta.url),
      ),
    );
  const manifest = Buffer.from(golden.manifest, "base64"),
    release = JSON.parse(manifest);
  const origins = {
    nativeStage: { run: "17", attempt: "1", controller: "a".repeat(40) },
    stage: { run: "18", attempt: "1", controller: "b".repeat(40) },
  };
  writeFileSync(join(root, "release-manifest.json"), manifest);
  writeFileSync(join(root, "context.json"), JSON.stringify(origins));
  writeFileSync(join(root, "stage-17-1.jsonl"), "native original\n");
  writeFileSync(join(root, "stage-18-1.jsonl"), "core original\n");
  writeFileSync(
    join(root, "stage-outcome.json"),
    JSON.stringify({
      manifestSha256: sha256(manifest),
      result: {
        stages: releasePackages(release).map((subject, index) => ({
          package: subject.package,
          stageId: `original-${index}`,
        })),
      },
    }),
  );
  const result = reportPublicQualification(
    root,
    {
      MANIFEST_SHA: sha256(manifest),
      GITHUB_RUN_ID: "19",
      GITHUB_RUN_ATTEMPT: "1",
      NEEDS_JSON: JSON.stringify({
        admit: { result: "success" },
        registry: { result: "failure" },
        security: { result: "success" },
      }),
    },
    {
      npmCommand: (args) =>
        JSON.stringify({
          latest: args[1] === release.package ? "0.9.0" : release.version,
        }),
      optionalApi: () => null,
    },
  );
  assert.equal(result.state, "public-qualification-incomplete");
  assert.equal(
    result.observed.filter((entry) => entry.defaultIdentifiesCandidate).length,
    2,
  );
  assert.equal(
    result.githubClassification,
    "held-awaiting-successful-public-qualification",
  );
  assert.equal(result.originalStages.length, 2);
  assert.deepEqual(result.originalStages, originalStageJournals(root, origins));
  let reads = 0;
  const partial = reportPublicQualification(
    root,
    {
      MANIFEST_SHA: sha256(manifest),
      GITHUB_RUN_ID: "20",
      GITHUB_RUN_ATTEMPT: "1",
      NEEDS_JSON: JSON.stringify({ registry: { result: "failure" } }),
    },
    {
      npmCommand: () => {
        if (++reads === 2)
          throw Object.assign(new Error("provider unavailable"), {
            code: "ECONNRESET",
          });
        return JSON.stringify({ latest: release.version });
      },
      optionalApi: () => {
        throw Object.assign(new Error("provider unavailable"), {
          httpStatus: 503,
        });
      },
    },
  );
  assert.equal(partial.observed[0].state, "observed");
  assert.equal(partial.observed[1].state, "unavailable");
  assert.equal(partial.observed[2].state, "observed");
  assert.equal(partial.githubLatest.state, "unavailable");
  assert.ok(
    existsSync(join(root, "public-qualification-incomplete-20-1.json")),
  );
});

test("a durable pre-request guard refusal proves that no provider effect was attempted", (t) => {
  const root = temporary(t),
    path = join(root, "promote-npm-17-1.jsonl");
  let requests = 0;
  assert.throws(
    () =>
      journalEffect(
        path,
        release(),
        "npm-latest",
        () => {
          requests++;
        },
        {
          env: {
            GITHUB_RUN_ID: "17",
            GITHUB_RUN_ATTEMPT: "1",
            GITHUB_SHA: "a".repeat(40),
            MANIFEST_SHA: "b".repeat(64),
            PROMOTION_SERVICE: "npm",
          },
          preRequest: () => {
            throw new Error("Guard changed before request");
          },
        },
      ),
    /Guard changed/,
  );
  const lines = readFileSync(path, "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(requests, 0);
  assert.equal(lines[1].state, "request-not-sent");
  assert.equal(lines[1].requestStarted, false);
  assert.equal(
    lines[1].intentSha256,
    sha256(Buffer.from(JSON.stringify(lines[0]) + "\n")),
  );
});

test("GitHub binary operations inherit maintained transfer profiles and writes are never retried", () => {
  const calls = [];
  const invoke = (command, args, options) =>
    calls.push({ command, args, options });
  for (const args of [
    ["api", "repos/example"],
    ["release", "upload", "v1"],
    ["release", "download", "v1"],
  ])
    gh(args, {}, invoke);
  assert.deepEqual(
    calls.map((call) => call.options.timeout),
    [budgets.read, budgets.upload, budgets.collection],
  );
  let attempts = 0;
  assert.throws(
    () =>
      gh(["release", "upload", "v1"], {}, () => {
        attempts++;
        throw Object.assign(new Error("lost acknowledgement"), {
          code: "ECONNRESET",
        });
      }),
    /lost acknowledgement/,
  );
  assert.equal(attempts, 1);
});

test("artifact readback cannot start a fresh extraction window after its total deadline", async (t) => {
  const root = temporary(t),
    bytes = Buffer.from("not materialized");
  const metadata = {
    id: 1,
    expired: false,
    digest: `sha256:${sha256(bytes)}`,
    size_in_bytes: bytes.length,
    workflow_run: {
      id: 2,
      repository_id: 3,
      head_repository_id: 3,
      head_sha: "a".repeat(40),
    },
  };
  let reads = 0;
  await assert.rejects(
    downloadEvidence({
      id: 1,
      destination: join(root, "out"),
      runId: 2,
      repositoryId: 3,
      headSha: "a".repeat(40),
      deadline: 500,
      now: () => (reads >= 3 ? 1000 : 0),
      read: async (path) => {
        reads++;
        return path.endsWith("/zip") ? bytes : metadata;
      },
    }),
    /budget exhausted/,
  );
  assert.deepEqual(readdirSync(root), []);
});

test("registry availability retries exact coordinates with a shared deadline and fails closed on permanent/admission errors", async () => {
  const url = "https://registry.npmjs.org/%40fixture%2Fpackage/1.0.0-rc.2";
  for (const status of [404, 408, 429, 503]) {
    let clock = 0,
      calls = 0;
    const bytes = await registryBytes(
      url,
      16,
      async (location, options) => {
        assert.equal(location.href, url);
        assert.equal(options.redirect, "error");
        assert.equal(options.headers, undefined);
        return ++calls === 1
          ? new Response(null, { status, headers: { "retry-after": "2" } })
          : new Response("proof");
      },
      {
        now: () => clock,
        deadline: 10000,
        sleep: async (wait) => {
          clock += wait;
        },
      },
    );
    assert.equal(bytes.toString(), "proof");
    assert.equal(calls, 2);
    assert.ok(clock >= 2000);
  }
  let clock = 0,
    calls = 0;
  const collection = { bytes: 0 };
  const retried = await registryBytes(
    url,
    16,
    async () => {
      if (++calls === 1)
        return {
          status: 200,
          body: (async function* () {
            yield Buffer.from("part");
            throw Object.assign(new Error("socket reset"), {
              code: "ECONNRESET",
            });
          })(),
        };
      return new Response("proof");
    },
    {
      now: () => clock,
      deadline: 10000,
      sleep: async (wait) => {
        clock += wait;
      },
      collection,
    },
  );
  assert.equal(retried.toString(), "proof");
  assert.equal(calls, 2);
  assert.equal(collection.bytes, 9);
  clock = 0;
  calls = 0;
  await assert.rejects(
    registryBytes(
      url,
      16,
      async () => {
        calls++;
        return new Response(null, { status: 404 });
      },
      {
        now: () => clock,
        deadline: 3000,
        sleep: async (wait) => {
          clock += wait;
        },
      },
    ),
    /budget exhausted/,
  );
  assert.equal(calls, 2);
  calls = 0;
  await assert.rejects(
    registryBytes(url, 16, async () => {
      calls++;
      return new Response(null, { status: 403 });
    }),
    /HTTP 403/,
  );
  assert.equal(calls, 1);
  calls = 0;
  await assert.rejects(
    (async () =>
      JSON.parse(
        (
          await registryBytes(url, 16, async () => {
            calls++;
            return new Response("{bad");
          })
        ).toString(),
      ))(),
  );
  assert.equal(calls, 1);
});

test("workflow contracts reject undeclared npm scripts in package, action and workflow callers", () => {
  const cases = [
    [
      "package.json",
      (document) => {
        document.scripts["check:repository"] += " && npm run check:missing";
      },
    ],
    [
      ".github/actions/setup-producer/action.yml",
      (document) => {
        document.runs.steps.push({
          shell: "bash",
          run: "npm run check:missing",
        });
      },
    ],
    [
      ".github/workflows/ci.yml",
      (document) => {
        document.jobs.policy.steps.push({ run: "npm run check:missing" });
      },
    ],
  ];
  for (const [path, mutate] of cases) {
    const document = parseDocument(
      readFileSync(new URL("../" + path, import.meta.url), "utf8"),
    ).toJS();
    mutate(document);
    assert.throws(
      () =>
        checkWorkflows({
          overrides: { [path]: JSON.stringify(document) },
        }),
      /undeclared npm script check:missing/u,
    );
  }
});

test("workflow contracts reject reuse proof whose producer expires before the proof horizon", () => {
  const source = readFileSync(
    new URL("../.github/workflows/qualification.yml", import.meta.url),
    "utf8",
  );
  assert.ok(checkWorkflows().workflows > 0);
  assert.throws(
    () =>
      checkWorkflows({
        overrides: {
          ".github/workflows/qualification.yml": source.replace(
            "(inputs.release-mode || inputs.emit-proof)",
            "inputs.release-mode",
          ),
        },
      }),
    /retention/,
  );
});

test("release contracts reject missing setup, wrong draft authority and lost failure evidence before publication", () => {
  const cases = [
    [
      ".github/actions/setup-producer/action.yml",
      (doc) => {
        doc.runs.steps = doc.runs.steps.filter(
          (step) => step.run !== "npm run install:producer-dependencies",
        );
      },
      /frozen dependencies/u,
    ],
    [
      "package.json",
      (doc) => {
        doc.scripts["execute:release-action"] =
          "node scripts/release-effects.js";
      },
      /startup failures/u,
    ],
  ];
  for (const [workflow, writer] of [
    ["stage-release.yml", "stage"],
    ["github-release.yml", "archive"],
    ["promote-release.yml", "npm"],
  ]) {
    const path = `.github/workflows/${workflow}`;
    cases.push(
      [
        path,
        (doc) => {
          doc.jobs[writer].steps = doc.jobs[writer].steps.filter(
            (step) => step.uses !== "./.github/actions/setup-writer",
          );
        },
        /dependency setup/u,
      ],
      [
        path,
        (doc) => {
          doc.jobs[writer].steps.find(
            (step) => step.uses === "./.github/actions/setup-writer",
          ).if = "false";
        },
        /dependency setup/u,
      ],
      [
        path,
        (doc) => {
          const steps = doc.jobs[writer].steps;
          steps.unshift(
            steps.splice(
              steps.findIndex(
                (step) => step.name === "Apply admitted release effect",
              ),
              1,
            )[0],
          );
        },
        /follow dependency setup/u,
      ],
      [
        path,
        (doc) => {
          doc.jobs[writer].steps.push({
            uses: "actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1",
            with: { "node-version": "22.13.0" },
          });
        },
        /installed producer/u,
      ],
      [
        path,
        (doc) => {
          doc.jobs[writer].steps.find(
            (step) => step.uses === "./.github/actions/upload-writer-evidence",
          ).if = "success()";
        },
        /failed publisher evidence/u,
      ],
    );
  }
  for (const [workflow, job, permission] of [
    ["stage-release.yml", "stage", "write"],
    ["github-release.yml", "admit", "write"],
    ["github-release.yml", "archive", "read"],
  ]) {
    cases.push([
      `.github/workflows/${workflow}`,
      (doc) => {
        doc.jobs[job].permissions.contents = permission;
      },
      /draft visibility/u,
    ]);
  }
  for (const [path, mutate, message] of cases) {
    const doc = parseDocument(
      readFileSync(new URL(`../${path}`, import.meta.url), "utf8"),
    ).toJS();
    mutate(doc);
    assert.throws(
      () => checkWorkflows({ overrides: { [path]: JSON.stringify(doc) } }),
      message,
      path,
    );
  }
});

test("workflow checkouts reject output-derived revisions while retaining immutable source interfaces", () => {
  for (const path of [
    ".github/workflows/native-producer.yml",
    ".github/actions/setup-producer/action.yml",
  ]) {
    for (const ref of [
      "${{ steps.build.outputs.source_commit }}",
      "${{ needs.resolve.outputs.source_commit }}",
      "${{ steps['build'].outputs['source_commit'] }}",
      "${{ Steps.build.outputs.source_commit }}",
      "${{ NEEDS.resolve.outputs.source_commit }}",
      "${{ STEPS['build'].outputs['source_commit'] }}",
    ]) {
      const doc = parseDocument(
        readFileSync(new URL(`../${path}`, import.meta.url), "utf8"),
      ).toJS();
      const steps = doc.jobs?.component.steps ?? doc.runs.steps;
      steps.push({
        uses: "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
        with: { ref, "persist-credentials": false },
      });
      assert.throws(
        () => checkWorkflows({ overrides: { [path]: JSON.stringify(doc) } }),
        /output-derived checkout revision/u,
      );
    }
  }
  // Caller-selected full commits are validated by the existing reusable workflow.
  assert.ok(checkWorkflows().workflows > 0);
});

test("restoration reads actual bundled output and historical flat proof with exact member identities", (t) => {
  const root = temporary(t),
    input = join(root, "input"),
    scratch = join(root, "scratch"),
    subject = release();
  mkdirSync(input);
  mkdirSync(scratch);
  const content = new Map([
    ["source.tar.gz", Buffer.from("source")],
    [
      "release-manifest.json",
      jsonBytes({ source: subject.source, version: subject.version }),
    ],
    ["release-review.json", Buffer.from("review")],
    ["release-acceptance.json", Buffer.from("acceptance")],
    ["THIRD-PARTY-NOTICES.md", Buffer.from("notices")],
    [
      "context.json",
      jsonBytes({
        registry: {
          run: "123",
          attempt: "1",
          controller: subject.source.commit,
        },
      }),
    ],
    [
      "public-ubuntu-24.04-24.22.1/root-lock.json",
      jsonBytes({ lockfileVersion: 3, packages: {} }),
    ],
    [
      "public-ubuntu-24.04-24.22.1/isolated-lock.json",
      jsonBytes({ lockfileVersion: 3, packages: {} }),
    ],
  ]);
  for (const item of releasePackages(subject)) {
    const bytes = Buffer.from(item.archive.filename);
    Object.assign(item.archive, { size: bytes.length, sha256: sha256(bytes) });
    content.set(item.archive.filename, bytes);
  }
  for (const [path, bytes] of content) {
    const target = join(input, path);
    mkdirSync(join(target, ".."), { recursive: true });
    writeFileSync(target, bytes);
  }
  const manifestSha = sha256(content.get("release-manifest.json"));
  const packed = bundleReleaseAssets(input, subject, scratch, manifestSha);
  const requested = [...content.keys()].filter(
    (path) => path === "context.json" || path.endsWith("-lock.json"),
  );
  const check = (directory, source, assets) => {
    mkdirSync(directory);
    for (const name of ["release-manifest.json", "release-assets.json"])
      copyFileSync(join(source, name), join(directory, name));
    acquireArchiveEvidence(
      directory,
      subject,
      assets.map((asset) => ({
        name: asset.name,
        size: asset.size,
        digest: `sha256:${asset.sha256}`,
      })),
      requested,
      {
        acquire: (name) =>
          copyFileSync(join(source, name), join(directory, name)),
      },
    );
    for (const path of requested)
      assert.deepEqual(readFileSync(join(directory, path)), content.get(path));
  };
  check(join(root, "bundle-read"), packed.bundle, packed.assets);
  const legacy = join(root, "legacy");
  mkdirSync(legacy);
  const assets = [...content].map(([path, bytes]) => {
    const name = path.replaceAll("/", "--");
    writeFileSync(join(legacy, name), bytes);
    return { name, source: path, size: bytes.length, sha256: sha256(bytes) };
  });
  const legacyIndex = jsonBytes({
    schemaVersion: 1,
    source: subject.source.commit,
    manifestSha256: manifestSha,
    assets,
  });
  writeFileSync(join(legacy, "release-assets.json"), legacyIndex);
  check(join(root, "legacy-read"), legacy, [
    ...assets,
    {
      name: "release-assets.json",
      size: legacyIndex.length,
      sha256: sha256(legacyIndex),
    },
  ]);
  const corrupted = join(root, "corrupted");
  mkdirSync(corrupted);
  for (const name of ["release-manifest.json", "release-assets.json"])
    copyFileSync(join(packed.bundle, name), join(corrupted, name));
  assert.throws(
    () =>
      acquireArchiveEvidence(
        corrupted,
        subject,
        packed.assets.map((asset) => ({
          name: asset.name,
          size: asset.size,
          digest: `sha256:${asset.sha256}`,
        })),
        requested,
        {
          acquire: (name) =>
            writeFileSync(join(corrupted, name), "substituted"),
        },
      ),
    /differs/,
  );
  assert.equal(existsSync(join(corrupted, "context.json")), false);
});

test("reviewed RC latest can restore npm-only, rejects races and reconciles an unknown npm effect without a GitHub write", (t) => {
  const root = temporary(t),
    subject = release(),
    target = "1.0.0-rc.1";
  const expected = { latest: subject.version, githubLatest: null };
  const state = {
    latest: null,
    affected: {
      id: 2,
      tag_name: `v${subject.version}`,
      prerelease: true,
      immutable: true,
      draft: false,
    },
    target: {
      id: 1,
      tag_name: `v${target}`,
      prerelease: true,
      immutable: true,
      draft: false,
    },
  };
  const snapshot = verifyNpmOnlyGithubState(state, state);
  assert.equal(
    restorationAvailability(
      {
        availability: "npm-only",
        expectedGithubLatest: null,
        affectedPrerelease: true,
        targetPrerelease: true,
      },
      expected,
    ),
    "npm-only",
  );
  assert.throws(() =>
    restorationAvailability({ availability: "npm-only" }, expected),
  );
  assert.ok(
    stagePublishArguments(root, subject, { npmTag: "latest" }).includes(
      "--tag=latest",
    ),
  );
  const env = {
    MANIFEST_SHA: "b".repeat(64),
    GITHUB_RUN_ID: "100",
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_SHA: "c".repeat(40),
  };
  let tags = { latest: subject.version },
    github = structuredClone(state),
    npmWrites = 0,
    githubWrites = 0,
    loseResponse = false;
  const operations = {
    assertCurrent: () => {},
    readNpmTags: () => ({ ...tags }),
    readGithubState: () => structuredClone(github),
    writeNpmLatest: (value) => {
      npmWrites++;
      tags.latest = value;
      if (loseResponse) throw new Error("lost npm response");
    },
    writeGithubLatest: () => {
      githubWrites++;
      throw new Error("GitHub mutation forbidden in npm-only mode");
    },
  };
  const data = {
    release: subject,
    target,
    expected,
    planOptions: { reviewedTag: "latest", npmOnly: true },
    githubSnapshot: snapshot,
    env,
  };
  const journal = join(root, "normal.jsonl");
  writeFileSync(journal, "");
  const completed = applyAvailability(
    { ...data, journal },
    operations,
  ).completed;
  assert.equal(completed.npm.latest, target);
  assert.equal(npmWrites, 1);
  assert.equal(githubWrites, 0);
  assert.deepEqual(github, state);
  tags.latest = "concurrent";
  const raced = join(root, "raced.jsonl");
  writeFileSync(raced, "");
  assert.throws(
    () => applyAvailability({ ...data, journal: raced }, operations),
    /changed/,
  );
  tags.latest = subject.version;
  github.target.prerelease = false;
  assert.throws(
    () => applyAvailability({ ...data, journal: raced }, operations),
    /changed/,
  );
  assert.equal(npmWrites, 1);
  assert.equal(githubWrites, 0);
  github = structuredClone(state);
  github.latest = { id: 3, tag_name: "v2.0.0" };
  const concurrentSnapshot = verifyNpmOnlyGithubState(github, github);
  assert.throws(
    () =>
      applyAvailability(
        { ...data, journal: raced, githubSnapshot: concurrentSnapshot },
        operations,
      ),
    /GitHub latest changed/,
  );
  assert.equal(
    npmWrites,
    1,
    "A newly captured snapshot cannot replace owner intent",
  );
  assert.equal(githubWrites, 0);
  github = structuredClone(state);
  loseResponse = true;
  const unknown = join(root, "unknown.jsonl");
  writeFileSync(unknown, "");
  assert.throws(
    () => applyAvailability({ ...data, journal: unknown }, operations),
    /lost npm response/,
  );
  const raw = readFileSync(unknown),
    record = {
      schemaVersion: 1,
      owner: "maksymshostak",
      phase: "promote",
      version: subject.version,
      manifestSha256: env.MANIFEST_SHA,
      run: "100",
      attempt: "1",
      journalSha256: sha256(raw),
      acceptedAt: "2026-10-28T00:00:00Z",
      rationale:
        "Owner selected exact native npm readback without repeating the write.",
      targetVersion: target,
      availability: "npm-only",
      expectedGithubLatest: null,
    };
  const records = verifyRecoveryRecord(record, subject, env.MANIFEST_SHA, raw);
  const observed = reconcilePromotionLabels(record, records, tags, null);
  assert.equal(records.at(-1).state, "outcome-unknown");
  assert.throws(
    () =>
      reconcilePromotionLabels(record, records, tags, {
        tag_name: "vconcurrent",
      }),
    /changed/,
  );
  loseResponse = false;
  const recovered = join(root, "recovered.jsonl");
  writeFileSync(recovered, "");
  const priorWrites = npmWrites;
  applyAvailability(
    {
      ...data,
      journal: recovered,
      recovery: { record, observed, priorLabels: expected },
    },
    operations,
  );
  assert.equal(npmWrites, priorWrites);
  assert.equal(githubWrites, 0);
  assert.deepEqual(readFileSync(unknown), raw);
  assert.equal(
    JSON.parse(readFileSync(recovered, "utf8").split("\n")[0]).operation,
    "completion-readback",
  );
});
