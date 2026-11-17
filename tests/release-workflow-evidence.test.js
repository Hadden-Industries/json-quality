// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import baseline from "../assets/release-writer-baseline.json" with { type: "json" };
import nodeSupport from "../assets/node-support.json" with { type: "json" };
import { repository, workflows } from "../scripts/release-contract.js";
import { sha256 } from "../scripts/release-records.js";
import { readWriterArtifactReceipt } from "../scripts/writer-artifact-receipt.js";
import { verifyWriterReservations } from "../scripts/release-writer-reservations.js";
import {
  captureStageInventory,
  verifyStageInventory,
} from "../scripts/release-stage-inventory.js";
import {
  materializeStageZip,
  writeStageParts,
  stagePartPath,
  verifyStagePredecessors,
} from "../scripts/release-stage-payload.js";
import { pilotDeleteRefusal } from "../scripts/rejected-pilot-request.js";
import { verifyMatrixRunner } from "../scripts/runner-policy.js";
import {
  carryHistoryStages,
  readHistoryRecord,
  verifyDeletedWriterRoles,
} from "../scripts/release-provider.js";
import {
  acquireStagePredecessor,
  observeStagePredecessor,
} from "../scripts/stage-predecessor.js";

const controller = "a".repeat(40);
const digest = "b".repeat(64);

test("a reconciled writer upload must come from its original composite reconciliation", () => {
  const run = {
    id: 101,
    run_attempt: 2,
    head_sha: controller,
    repository: { id: 31, full_name: repository },
    head_repository: { id: 31, full_name: repository },
    path: ".github/workflows/stage-release.yml",
  };
  const job = {
    id: 909,
    name: "stage",
    steps: [
      {
        name: "Run ./.github/actions/upload-writer-evidence",
        status: "completed",
        conclusion: "success",
        started_at: "2026-11-16T00:00:00Z",
        completed_at: "2026-11-16T00:00:02Z",
      },
    ],
  };
  const receipt = {
    phase: "release-writer-artifact",
    schemaVersion: 1,
    repositoryId: 31,
    headRepositoryId: 31,
    workflow: `${repository}/${run.path}@refs/heads/main`,
    controller,
    run: 101,
    attempt: 2,
    job: "stage",
    step: 2,
    id: 811,
    name: "effect-stage-2-recovery-2",
    digest: `sha256:${digest}`,
    size: 500,
  };
  const lines = [
    `##[start-action display=Reconcile writer evidence upload 2;id=__self_3.second]`,
    JSON.stringify(receipt),
    "##[end-action id=__self_3.second;outcome=success;conclusion=success;duration_ms=100]",
  ];
  const read = (values) =>
    readWriterArtifactReceipt(
      Buffer.from(
        values.map((line) => `2026-11-16T00:00:01.1Z ${line}`).join("\n"),
      ),
      run,
      job,
      "effect-stage-2",
    );
  assert.deepEqual(read(lines), receipt);
  assert.throws(() => read(lines.slice(1)), /outside/u);
  assert.throws(() => read([...lines, ...lines]), /unique/u);
  assert.throws(() =>
    read([lines[0], JSON.stringify({ ...receipt, attempt: 3 }), lines[2]]),
  );
  const named = lines.map((line) => line.replaceAll("__self_3", "effect"));
  assert.deepEqual(read(named), receipt);
  assert.throws(() => read(named.slice(1)), /outside/u);
  assert.throws(() => read([...named, ...named]), /unique/u);
  assert.throws(
    () => read(lines.map((line) => line.replaceAll("__self_3", "unrelated"))),
    /outside/u,
  );
});

test("a deleted reserved writer requires complete signed original observations", () => {
  const policy = baseline.workflows.stage;
  const visible = policy.runs.map((id, index) => ({
    id,
    workflow_id: policy.id,
    run_number: index + 1,
  }));
  const number = visible.length + 1,
    attempt = 1;
  const reservation = { number, attempt, controller };
  const expect = (retained) =>
    verifyWriterReservations("stage", visible, retained, [], [reservation]);
  assert.throws(() => expect([]), /missing from the signed attempt/u);
  const provider = {
    run: {
      id: 999,
      run_number: number,
      run_attempt: attempt,
      workflow_id: policy.id,
      head_branch: "main",
      event: "workflow_dispatch",
      status: "completed",
      head_sha: controller,
    },
    jobs: {
      total_count: 1,
      jobs: [
        {
          id: 888,
          run_id: 999,
          run_attempt: 1,
          head_sha: controller,
          status: "completed",
        },
      ],
    },
  };
  expect([{ phase: "stage", controller, run: "999", attempt: "1", provider }]);
  assert.throws(() =>
    expect([
      {
        phase: "stage",
        controller,
        run: "999",
        attempt: "1",
        provider: { ...provider, jobs: { ...provider.jobs, jobs: [] } },
      },
    ]),
  );
});

test("a deleted promotion needs every original effect and permits a retained rerun", () => {
  const run = {
    id: 999,
    run_attempt: 1,
    head_sha: controller,
    repository: { full_name: repository },
    path: ".github/workflows/promote-release.yml",
    head_branch: "main",
    event: "workflow_dispatch",
    status: "completed",
  };
  const step = {
    name: "Apply admitted release effect",
    status: "completed",
    conclusion: "success",
    started_at: "2026-11-16T09:00:00Z",
    completed_at: "2026-11-16T09:01:00Z",
  };
  const jobs = ["npm", "github"].map((name, index) => ({
    ...step,
    id: index + 1,
    runner_id: index + 2,
    name,
    run_id: run.id,
    run_attempt: 1,
    head_sha: controller,
    steps: [step],
  }));
  const provider = { run, jobs: { total_count: 2, jobs } };
  const row = (service, provider) => ({
    phase: "promote",
    run: String(run.id),
    attempt: String(provider.run.run_attempt),
    service,
    provider,
  });
  const npm = row("npm", provider);
  const github = row("github", provider);
  const rerun = row("npm", {
    run: { ...run, run_attempt: 2 },
    jobs: {
      total_count: 2,
      jobs: jobs.map((job) => ({ ...job, run_attempt: 2 })),
    },
  });
  assert.throws(
    () => verifyDeletedWriterRoles("promote", run.id, [npm, rerun]),
    /omits an original writer role/u,
  );
  verifyDeletedWriterRoles("promote", run.id, [npm, github, rerun]);
});

test("an uncaught native failure keeps opted-out diagnostics out of stderr", () => {
  const module = new URL("../scripts/qualification-process.js", import.meta.url)
    .href;
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      `import { native } from ${JSON.stringify(module)};
     native(process.execPath, ["--eval", "process.stderr.write('private-child-output'); process.exitCode=1"], { logFailureOutput: false });`,
    ],
    { encoding: "utf8", windowsHide: true },
  );
  assert.equal(result.status, 1, result.error?.message);
  assert.match(result.stderr, /Native phase native failed/u);
  assert.doesNotMatch(result.stderr, /private-child-output/u);
});

test("pending npm observations cover exact family, effect identity, freshness and ownership", () => {
  const stageId = "private-native-id";
  const capture = (phase) =>
    captureStageInventory(phase, digest, digest, (args) => {
      if (args[0] === "--version") return nodeSupport.producerNpm.version;
      if (args[0] === "whoami") return "maksymshostak";
      return JSON.stringify(
        args[2].endsWith("-win32-x64")
          ? [{ packageName: args[2], status: "pending", id: stageId }]
          : [],
      );
    });
  assert.throws(
    () =>
      captureStageInventory("stage", digest, digest, ([arg]) =>
        arg === "--version"
          ? nodeSupport.producerNpm.version
          : "different-account",
      ),
    /Authenticate as the npm release owner/u,
  );
  const record = capture("stage");
  const native = Object.keys(record.packages).find(
    (name) => record.packages[name].pending.length,
  );
  assert.ok(native);
  assert.ok(!JSON.stringify(record).includes(stageId));
  const env = (value) => {
    const bytes = JSON.stringify(value);
    return {
      MANIFEST_SHA: digest,
      REVIEW_SHA: digest,
      OPERATION_SHA: digest,
      ACCEPTANCE_SHA: digest,
      STAGE_INVENTORY_JSON: bytes,
      STAGE_INVENTORY_SHA: sha256(Buffer.from(bytes)),
    };
  };
  const verify = (phase, record, options = {}) =>
    verifyStageInventory(phase, env(record), { list: () => [], ...options });
  for (const phase of ["stage", "archive", "promote"])
    assert.throws(() => verify(phase, capture(phase)), /Unrelated pending/u);
  verify("stage", record, { allowedStages: [{ package: native, stageId }] });
  assert.throws(
    () =>
      verify("stage", record, {
        now: Date.parse(record.observedAt) + 3_600_001,
      }),
    /stale/u,
  );
  assert.throws(
    () =>
      verify("stage", record, {
        allowedStages: [{ package: native, stageId }],
        list: () => [
          {
            id: 999,
            status: "completed",
            event: "workflow_dispatch",
            head_branch: "main",
            path: `.github/workflows/${workflows.stage}`,
            repository: { full_name: repository },
            updated_at: new Date(
              Date.parse(record.observedAt) + 1,
            ).toISOString(),
          },
        ],
      }),
    /changed after/u,
  );
});

test("retained staging accepts only exact original and bounded recovery names", () => {
  const ref = {
    run: "7",
    attempt: "1",
    stagePhase: "natives",
    controller,
    manifestSha256: digest,
    reviewSha256: digest,
    sha256: digest,
    size: 1,
    parts: [{ size: 1, sha256: digest }],
    artifact: { id: 1, jobId: 2, digest: `sha256:${digest}` },
    provider: {
      run: { id: 7, run_attempt: 1, head_sha: controller },
      jobs: { total_count: 1, jobs: [{ id: 2, name: "stage" }] },
    },
  };
  const verify = (name) =>
    verifyStagePredecessors(
      [{ ...ref, artifact: { ...ref.artifact, name } }],
      1,
    );
  for (const name of [
    "effect-stage-1",
    "effect-stage-1-recovery-2",
    "effect-stage-1-recovery-3",
  ])
    verify(name);
  for (const name of [
    "effect-stage-11",
    "effect-stage-1-recovery-1",
    "effect-stage-1-recovery-4",
    "effect-stage-1-recovery-2-extra",
    "other-effect-stage-1",
    "effect-stage-1\n",
  ])
    assert.throws(() => verify(name));
});

test("retained staging transport checks both each part and the whole original", (t) => {
  const root = mkdtempSync(
    join(tmpdir(), "json-quality-retained-payload-test-"),
  );
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const bytes = Buffer.from("exact original native payload");
  const ref = {
    size: bytes.length,
    sha256: sha256(bytes),
    parts: writeStageParts(root, bytes),
  };
  const target = join(root, "payload.zip");
  assert.throws(
    () => materializeStageZip(ref, target, () => Buffer.alloc(bytes.length)),
    /part digest/u,
  );
  assert.equal(existsSync(target), false);
  const read = (part) => readFileSync(join(root, stagePartPath(part.sha256)));
  assert.throws(
    () => materializeStageZip({ ...ref, sha256: digest }, target, read),
    /whole|complete stage ZIP/u,
  );
  assert.equal(existsSync(target), false);
  materializeStageZip(ref, target, read);
  assert.deepEqual(readFileSync(target), bytes);
});

test("expired native and core staging inputs use only the exact signed predecessor", (t) => {
  const root = mkdtempSync(
    join(tmpdir(), "json-quality-stage-predecessor-test-"),
  );
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const bytes = Buffer.from("original staged ZIP");
  const hash = sha256(bytes);
  const parts = [{ size: bytes.length, sha256: hash }];
  const repositoryIdentity = { id: 42, full_name: repository };
  const stages = ["natives", "core"].map((stagePhase, index) => {
    const run = String(20 + index);
    return {
      run,
      attempt: "1",
      stagePhase,
      controller,
      manifestSha256: digest,
      reviewSha256: digest,
      size: bytes.length,
      sha256: hash,
      parts,
      artifact: {
        id: 200 + index,
        jobId: 90 + index,
        digest: `sha256:${hash}`,
        name: "effect-stage-1",
      },
      provider: {
        run: {
          id: Number(run),
          run_attempt: 1,
          head_sha: controller,
          status: "completed",
          conclusion: "success",
          path: `.github/workflows/${workflows.stage}`,
          event: "workflow_dispatch",
          head_branch: "main",
          repository: repositoryIdentity,
          head_repository: repositoryIdentity,
        },
        jobs: {
          total_count: 1,
          jobs: [
            {
              id: 90 + index,
              name: "stage",
              status: "completed",
              run_id: Number(run),
              run_attempt: 1,
              head_sha: controller,
            },
          ],
        },
      },
    };
  });
  const tag = "release-history-fixture";
  const tagSha = "c".repeat(40);
  const signed = (stagePredecessors) => {
    const index = Buffer.from(
      JSON.stringify({
        schemaVersion: 3,
        repository,
        entries: [],
        stagePredecessors,
      }),
    );
    const checkpoint = { tag, tagSha, sha256: sha256(index) };
    const record = readHistoryRecord(
      checkpoint,
      (path) =>
        path.startsWith("git/ref/")
          ? { ref: `refs/tags/${tag}`, object: { sha: tagSha, type: "tag" } }
          : {
              sha: tagSha,
              tag,
              object: { sha: controller, type: "commit" },
              verification: { verified: true, reason: "valid" },
            },
      (path) => {
        if (path === `contents/release-history.json?ref=${controller}`)
          return index;
        assert.equal(path, `contents/${stagePartPath(hash)}?ref=${controller}`);
        return bytes;
      },
      () => {},
    );
    return { checkpoint, record };
  };
  const { checkpoint, record } = signed(stages);
  const missing = () => {
    throw Object.assign(new Error("Native evidence missing"), {
      httpStatus: 404,
    });
  };
  const nativeOnly = signed([stages[0]]).record;
  const coreOnly = signed([stages[1]]).record;
  const { stagePredecessors } = carryHistoryStages(coreOnly, root, nativeOnly);
  assert.deepEqual(stagePredecessors, [stages[1], stages[0]]);
  assert.deepEqual(readFileSync(join(root, stagePartPath(hash))), bytes);
  assert.throws(
    () =>
      observeStagePredecessor(
        { run: stages[1].run, attempt: stages[1].attempt },
        nativeOnly,
        missing,
      ),
    { httpStatus: 404 },
  );
  let extracted = 0;
  const options = {
    history: () => record,
    provider: missing,
    download: missing,
    api: missing,
    extract: (archive) => {
      extracted++;
      assert.deepEqual(readFileSync(archive), bytes);
    },
  };
  for (const ref of stages) {
    const expected = {
      run: ref.run,
      attempt: ref.attempt,
      stagePhase: ref.stagePhase,
      manifestSha256: digest,
      reviewSha256: digest,
    };
    assert.throws(
      () =>
        acquireStagePredecessor(
          { ...expected, reviewSha256: hash },
          root,
          checkpoint,
          options,
        ),
      /No complete signed/u,
    );
    assert.throws(
      () =>
        acquireStagePredecessor(expected, root, checkpoint, {
          ...options,
          api: () => ({ ...ref.artifact, digest: `sha256:${digest}` }),
        }),
      /strictly equal/u,
    );
    assert.equal(
      acquireStagePredecessor(expected, root, checkpoint, options).identity.id,
      ref.artifact.id,
    );
  }
  assert.equal(extracted, 2);
});

test("only an explicit machine response to the exact pilot DELETE creates a refusal", () => {
  const packageName = "@hadden-industries/json-quality-win32-x64";
  const endpoint =
    "https://registry.npmjs.org/-/package/@hadden-industries%2fjson-quality-win32-x64/dist-tags/pilot";
  const reply = (summary, facts = {}) => ({
    facts: { exit: 1, signal: null, timeout: false, ...facts },
    stdout: JSON.stringify({ error: { code: "E401", summary } }),
  });
  assert.deepEqual(
    pilotDeleteRefusal(
      reply(`401 Unauthorized - DELETE ${endpoint} - refused`),
      packageName,
    ),
    { method: "DELETE", status: 401, endpoint, exit: 1 },
  );
  assert.equal(
    pilotDeleteRefusal(reply("401 Unauthorized"), packageName),
    null,
  );
  assert.equal(
    pilotDeleteRefusal(
      reply(`401 Unauthorized - DELETE ${endpoint}`, { timeout: true }),
      packageName,
    ),
    null,
  );
  assert.equal(
    pilotDeleteRefusal(
      reply(`401 Unauthorized - DELETE ${endpoint}?extra=1`),
      packageName,
    ),
    null,
  );
});

test("a matching runner display cannot hide a substituted native label", () => {
  const job = {
    name: "native-public (windows-2025-vs2026)",
    conclusion: "success",
    labels: ["windows-2025"],
  };
  assert.throws(
    () => verifyMatrixRunner(job, "windows-2025-vs2026", true),
    /labels differ/u,
  );
  verifyMatrixRunner(
    { ...job, labels: ["windows-2025-vs2026"] },
    "windows-2025-vs2026",
    true,
  );
  verifyMatrixRunner(
    { ...job, conclusion: "skipped", labels: undefined },
    "windows-2025-vs2026",
    true,
  );
});
