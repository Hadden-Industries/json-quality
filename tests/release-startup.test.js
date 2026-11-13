// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parseDocument } from "yaml";
import { sha256 } from "../scripts/release-contract.js";
import { runReleaseCommand } from "../scripts/release-command.js";
import { writerWorld } from "./release-entry-fixture.mjs";
import { prepareWriterAdmission } from "../scripts/release-writer-admission.js";
import { mkdirSync } from "node:fs";

const root = fileURLToPath(new URL("../", import.meta.url));

test("ordinary native staging dispatch loads without project packages and preserves omitted or explicit channel", async (t) => {
  for (const npmTag of [undefined, "latest"])
    await t.test(npmTag ?? "omitted pilot", (subtest) => {
      const world = writerWorld(subtest, "stage", { npmTag });
      const result = world.run("stage");
      assert.equal(result.status, 0, result.stderr);
      const state = world.state();
      assert.equal(state.mutations.length, 2);
      assert.ok(
        state.mutations.every(
          (request) =>
            request.service === "stage" &&
            request.package !== world.release.package &&
            request.args.includes(`--tag=${npmTag ?? "pilot"}`) &&
            request.args.includes("--fetch-retries=0"),
        ),
      );
      const context = JSON.parse(
        readFileSync(join(world.directory, "context.json")),
      );
      assert.equal(context.nativeStage.run, "17");
      assert.equal(context.stage, undefined);
      assert.equal(Object.keys(context.packageOrigins).length, 2);
    });
});

test("ordinary family writers and read-only completion run without project packages or repeated npm writes", (t) => {
  const world = writerWorld(t, "promote");
  world.retainNativeArtifact(50, "admitted-promote-1");
  const npm = world.run("promote-npm");
  assert.equal(npm.status, 0, npm.stderr);
  world.retainNativeArtifact(60, "effect-promote-npm-1");
  const expected = [
    world.release.package + "-win32-x64",
    world.release.package + "-linux-x64",
    world.release.package,
  ];
  assert.deepEqual(
    world.state().mutations.map((value) => value.package),
    expected,
  );
  world.update((state) => {
    const job = state.routes[
      "actions/runs/17/attempts/1/jobs?per_page=100"
    ].jobs.find((value) => value.name === "npm");
    job.status = "completed";
    job.conclusion = "success";
    job.completed_at = "2026-11-13T00:02:00Z";
  });
  const github = world.run("promote-github", {
    ACTIONS_ID_TOKEN_REQUEST_URL: "",
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: "",
    NPM_CONTINUATION_ID: "60",
  });
  assert.equal(github.status, 0, github.stderr);
  world.retainNativeArtifact(61, "effect-promote-github-1");
  assert.deepEqual(
    world.state().mutations.map((value) => value.service),
    ["npm", "npm", "npm", "github"],
  );
  world.update((state) => {
    const job = state.routes[
      "actions/runs/17/attempts/1/jobs?per_page=100"
    ].jobs.find((value) => value.name === "github");
    job.status = "completed";
    job.conclusion = "success";
    job.completed_at = "2026-11-13T00:03:00Z";
  });
  const completed = world.run("complete", {
    ACTIONS_ID_TOKEN_REQUEST_URL: "",
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: "",
    NPM_CONTINUATION_ID: "60",
    GITHUB_CONTINUATION_ID: "61",
    NPM_RESULT: "success",
    GITHUB_RESULT: "success",
  });
  assert.equal(completed.status, 0, completed.stderr);
  const state = world.state();
  assert.equal(state.mutations.length, 4);
  assert.equal(state.github.latest.id, 437217191);
  assert.equal(state.github.latest.prerelease, false);
  assert.equal(
    JSON.parse(
      readFileSync(join(world.directory, "promotion-completion-17-1.json")),
    ).state,
    "completed",
  );
  const independent = world.independent();
  assert.equal(independent.status, 0, independent.stderr);
  assert.equal(
    JSON.parse(
      readFileSync(join(independent.output, "promotion-completion-18-1.json")),
    ).state,
    "completed",
  );
  assert.equal(world.state().mutations.length, 4);
});

test("independent observer preserves a failed writer as unresolved without propagation reads or requests", (t) => {
  const world = writerWorld(t, "promote");
  world.retainNativeArtifact(50, "admitted-promote-1");
  world.retainNativeArtifact(60, "effect-promote-npm-1");
  world.update((state) => {
    const jobs =
      state.routes["actions/runs/17/attempts/1/jobs?per_page=100"].jobs;
    for (const job of jobs.filter((value) => value.name !== "admit")) {
      job.status = "completed";
      job.conclusion = job.name === "npm" ? "failure" : "skipped";
      job.completed_at = "2026-11-13T00:02:00Z";
    }
  });
  const observed = world.independent();
  assert.notEqual(observed.status, 0);
  assert.ok(
    existsSync(join(observed.output, "promotion-completion-18-1.json")),
    observed.stderr,
  );
  const result = JSON.parse(
    readFileSync(join(observed.output, "promotion-completion-18-1.json")),
  );
  assert.equal(result.state, "writer-outcome-unresolved");
  assert.equal(result.origin.run, "17");
  assert.equal(world.state().mutations.length, 0);
  assert.ok(
    !world.state().calls.some((call) => call.args.includes("dist-tags")),
  );
});

test("independent completion confirms acknowledged GitHub propagation without another request", (t) => {
  const world = writerWorld(t, "promote");
  world.retainNativeArtifact(50, "admitted-promote-1");
  assert.equal(world.run("promote-npm").status, 0);
  world.retainNativeArtifact(60, "effect-promote-npm-1");
  const settle = (service, conclusion) =>
    world.update((state) => {
      const job = state.routes[
        "actions/runs/17/attempts/1/jobs?per_page=100"
      ].jobs.find((value) => value.name === service);
      Object.assign(job, {
        status: "completed",
        conclusion,
        completed_at: "2026-11-13T00:03:00Z",
      });
    });
  settle("npm", "success");
  const written = world.run("promote-github", {
    NPM_CONTINUATION_ID: "60",
    ACTIONS_ID_TOKEN_REQUEST_URL: "",
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: "",
  });
  assert.equal(written.status, 0, written.stderr);
  const path = join(world.directory, "promote-github-17-1.jsonl");
  const [intent, outcome] = readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .map(JSON.parse);
  assert.equal(outcome.requestAcknowledged, true);
  writeFileSync(
    path,
    JSON.stringify(intent) +
      "\n" +
      JSON.stringify({
        ...outcome,
        state: "outcome-unknown",
        result: undefined,
      }) +
      "\n",
  );
  rmSync(join(world.directory, "github-continuation.json"));
  world.retainNativeArtifact(61, "effect-promote-github-1");
  settle("github", "failure");
  const observed = world.independent();
  assert.equal(observed.status, 0, observed.stderr);
  assert.equal(
    JSON.parse(
      readFileSync(join(observed.output, "promotion-completion-18-1.json")),
    ).state,
    "completed",
  );
  assert.equal(world.state().mutations.length, 4);
});

test("an acknowledged partial npm family stays incomplete without propagation reads", (t) => {
  const world = writerWorld(t, "promote");
  world.retainNativeArtifact(50, "admitted-promote-1");
  const written = world.run("promote-npm");
  assert.equal(written.status, 0, written.stderr);
  const path = join(world.directory, "promote-npm-17-1.jsonl");
  writeFileSync(
    path,
    readFileSync(path, "utf8").split("\n").slice(0, 2).join("\n") + "\n",
  );
  rmSync(join(world.directory, "npm-continuation.json"));
  world.retainNativeArtifact(60, "effect-promote-npm-1");
  world.update((state) => {
    state.calls = [];
    for (const job of state.routes[
      "actions/runs/17/attempts/1/jobs?per_page=100"
    ].jobs.filter((value) => value.name !== "admit"))
      Object.assign(job, {
        status: "completed",
        conclusion: job.name === "npm" ? "failure" : "skipped",
        completed_at: "2026-11-13T00:03:00Z",
      });
  });
  const observed = world.independent();
  assert.notEqual(observed.status, 0);
  assert.equal(
    JSON.parse(
      readFileSync(join(observed.output, "promotion-completion-18-1.json")),
    ).state,
    "writer-operation-incomplete",
  );
  assert.ok(
    !world.state().calls.some((call) => call.args.includes("dist-tags")),
  );
  assert.equal(world.state().mutations.length, 3);
});

test("ordinary writer rejects substituted admission and an incomplete predecessor before any effect", (t) => {
  const changed = writerWorld(t, "stage");
  const response = changed.run("stage", {
    ADMISSION_RECEIPT_SHA: "0".repeat(64),
  });
  assert.notEqual(response.status, 0);
  assert.match(response.stderr, /receipt was substituted/u);
  assert.deepEqual(changed.state().mutations, []);
  const missing = writerWorld(t, "promote");
  const github = missing.run("promote-github", {
    ACTIONS_ID_TOKEN_REQUEST_URL: "",
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: "",
    NPM_CONTINUATION_ID: "60",
  });
  assert.notEqual(github.status, 0);
  assert.deepEqual(missing.state().mutations, []);
});

test("ordinary core dispatcher requires both exact native provider artifacts before its one request", async (t) => {
  for (const failure of [
    null,
    "skipped",
    "attempt",
    "digest",
    "controller",
    "missing-proof",
    "channel-drift",
    "tag-object",
  ])
    await t.test(failure ?? "both native platforms", (subtest) => {
      const world = writerWorld(subtest, "stage", {
        schema3: true,
        npmTag: "latest",
      });
      assert.equal(world.run("stage").status, 0);
      const context = JSON.parse(
        readFileSync(join(world.directory, "context.json")),
      );
      world.env.GITHUB_RUN_ID = "18";
      world.env.STAGE_PHASE = "core";
      world.update((state) => {
        for (const subject of world.release.platformArchives)
          state.npm[subject.package].latest = world.release.version;
        if (failure === "channel-drift")
          state.npm[world.release.platformArchives[0].package].latest = "0.9.0";
        state.routes["actions/runs/18/attempts/1"] = {
          ...state.routes["actions/runs/17/attempts/1"],
          id: 18,
        };
        const jobs = state.routes[
          "actions/runs/17/attempts/1/jobs?per_page=100"
        ].jobs.map((job) => ({ ...job, run_id: 18 }));
        for (const [index, os] of world.release.matrix.os.entries())
          jobs.push({
            ...jobs[0],
            id: 100 + index,
            name: `native-public (${os})`,
            status: "completed",
            conclusion:
              failure === "skipped" && index === 0 ? "skipped" : "success",
          });
        state.routes["actions/runs/18/attempts/1/jobs?per_page=100"] = {
          total_count: jobs.length,
          jobs,
        };
        state.routes["actions/artifacts/50"] = world.artifact(
          50,
          "admitted-stage-1",
        );
      });
      world.env.ADMISSION_RECEIPT_SHA = prepareWriterAdmission(
        world.directory,
        "stage",
        { release: world.release, context },
        world.env,
      ).sha256;
      for (const [index, subject] of world.release.platformArchives.entries()) {
        const output = join(world.root, `native-proof-${index}`);
        mkdirSync(output);
        const signatures = Buffer.from("{}\n");
        writeFileSync(join(output, "signatures.json"), signatures);
        const record = {
          schemaVersion: 1,
          state: "native-public-qualified",
          package: subject.package,
          platform: subject.platform,
          version: subject.version,
          integrity: subject.archive.integrity,
          origin: context.packageOrigins[subject.package],
          manifestSha256: world.env.MANIFEST_SHA,
          reviewSha256: world.env.REVIEW_SHA,
          controller:
            failure === "controller" && index === 0
              ? "f".repeat(40)
              : world.env.GITHUB_SHA,
          run: "18",
          attempt: failure === "attempt" && index === 0 ? "2" : "1",
          operation: "Native NFC operation fixture",
          signaturesSha256: sha256(Buffer.from("{}")),
        };
        if (failure !== "missing-proof" || index !== 0)
          writeFileSync(
            join(output, "native-public.json"),
            JSON.stringify(record),
          );
        world.retainNativeArtifact(
          80 + index,
          `native-public-${subject.platform}-1`,
          output,
        );
      }
      if (failure === "digest")
        world.update((state) => {
          state.routes[
            "actions/runs/18/artifacts?per_page=100"
          ].artifacts[0].digest = "sha256:" + "f".repeat(64);
        });
      if (failure === "tag-object") {
        const frozen = JSON.parse(
          readFileSync(join(world.directory, "signed-tag.json")),
        );
        frozen.reference.object.sha = "f".repeat(40);
        frozen.annotation.sha = "f".repeat(40);
        writeFileSync(
          join(world.directory, "signed-tag.json"),
          JSON.stringify(frozen),
        );
      }
      const result = world.run("stage");
      assert.equal(result.status === 0, !failure, result.stderr);
      const core = world
        .state()
        .mutations.filter(
          (request) => request.package === world.release.package,
        );
      assert.equal(core.length, failure ? 0 : 1);
      if (!failure) {
        const outcome = JSON.parse(
          readFileSync(join(world.directory, "stage-outcome.json")),
        );
        assert.equal(outcome.origins[world.release.package].run, "18");
        for (const subject of world.release.platformArchives)
          assert.equal(outcome.origins[subject.package].run, "17");
      }
    });
});

test("immutable publication completion preserves owner channel and RC classification without redundant npm writes", async (t) => {
  for (const version of ["1.0.0", "1.0.0-rc.1"])
    for (const npmTag of [undefined, "latest"])
      await t.test(`${version} ${npmTag ?? "omitted pilot"}`, (subtest) => {
        const world = writerWorld(subtest, "stage", { npmTag });
        const release = { ...world.release, schemaVersion: 3, version };
        writeFileSync(
          join(world.directory, "release-manifest.json"),
          JSON.stringify(release),
        );
        const state = world.state(),
          target = { ...state.github.releases.target, tag_name: `v${version}` };
        const prior = {
          id: state.github.latest.id,
          tag_name: state.github.latest.tag_name,
          prerelease: state.github.latest.prerelease,
        };
        const review = JSON.parse(
          readFileSync(join(world.directory, "release-review.json")),
        );
        review.priorAvailability = { githubLatest: prior };
        writeFileSync(
          join(world.directory, "release-review.json"),
          JSON.stringify(review),
        );
        writeFileSync(
          join(world.directory, "archive-outcome.json"),
          JSON.stringify({
            release: target,
            assets: target.assets.map(({ name, digest, size }) => ({
              name,
              sha256: digest.slice(7),
              size,
            })),
          }),
        );
        world.update((current) => {
          current.github.releases.target = target;
          for (const tags of Object.values(current.npm))
            tags[npmTag ?? "pilot"] = version;
        });
        const completed = world.run("publication");
        assert.equal(completed.status, 0, completed.stderr);
        const result = JSON.parse(
            readFileSync(join(world.directory, "completion.json")),
          ),
          stableLatest = version === "1.0.0" && npmTag === "latest";
        assert.equal(result.github.prerelease, !stableLatest);
        assert.equal(
          world.state().github.latest.id,
          stableLatest ? target.id : prior.id,
        );
        assert.deepEqual(
          world.state().mutations.map((request) => request.service),
          stableLatest ? ["github"] : [],
        );
        // Already immutable recovery uses the same target ID and never acquires write authority.
        rmSync(join(world.directory, "completion.json"));
        const recovered = world.run("publication", {
          PUBLICATION_RECOVERY: "1",
        });
        assert.equal(recovered.status, 0, recovered.stderr);
        assert.equal(world.state().mutations.length, stableLatest ? 1 : 0);
      });
});

test("release preparation refuses ambiguous and incomplete operations before reading release inputs", () => {
  const scripts = JSON.parse(readFileSync(join(root, "package.json"))).scripts;
  const freeze = scripts["freeze:release-manifest"].split(" ").slice(1);
  const emit = scripts["emit:release-matrix"].split(" ").slice(1);
  for (const args of [
    freeze,
    [...freeze, "first", "second"],
    [...emit, "unexpected-directory"],
    ["scripts/release-prepare.js", "resolve"],
    ["scripts/release-prepare.js", "directory-only"],
  ]) {
    const result = spawnSync(process.execPath, args, {
      cwd: root,
      env: { ...process.env, RELEASE_MATRIX: "malformed" },
      encoding: "utf8",
      windowsHide: true,
      timeout: 10000,
    });
    assert.equal(result.error, undefined);
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /Expected freeze-manifest DIRECTORY or resolve-matrix/u,
    );
    assert.equal(result.stdout, "");
  }
});

const blockPackages = `
  import { registerHooks } from "node:module";
  registerHooks({ resolve(specifier, context, nextResolve) {
    if (context.parentURL?.endsWith("/scripts/release-command.js") && ["./release-effects.js", "./promote-npm.js", "./promote-github.js"].includes(specifier)) throw new Error("fixture: publisher dependency unavailable");
    return nextResolve(specifier, context);
  }});
`;

const promotion = parseDocument(
  readFileSync(join(root, ".github/workflows/promote-release.yml"), "utf8"),
).toJS();
const effectCommand = (phase) => {
  if (phase.startsWith("promote-")) {
    const job = promotion.jobs[phase.slice("promote-".length)];
    return job.steps
      .find((step) => step.name === "Apply admitted release effect")
      .run.split(' "${{')[0]
      .split(" ");
  }
  return [
    ...JSON.parse(readFileSync(join(root, "package.json"))).scripts[
      "execute:release-action"
    ].split(" "),
    phase,
  ];
};

for (const phase of ["stage", "archive", "promote-npm", "promote-github"])
  test(`${phase} import failure retains a sealed no-request record and still fails`, (t) => {
    const directory = mkdtempSync(
      join(tmpdir(), "json-quality-release-startup-"),
    );
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const manifest = Buffer.from('{"original":"qualified bytes"}\n');
    writeFileSync(join(directory, "release-manifest.json"), manifest);
    const manifestSha = sha256(manifest);
    const command = effectCommand(phase);
    assert.equal(command.shift(), "node");
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        `data:text/javascript,${encodeURIComponent(blockPackages)}`,
        ...command,
        directory,
        join(directory, "scratch"),
      ],
      {
        cwd: root,
        env: {
          ...process.env,
          GITHUB_RUN_ID: "17",
          GITHUB_RUN_ATTEMPT: "2",
          GITHUB_SHA: "a".repeat(40),
          MANIFEST_SHA: manifestSha,
        },
        encoding: "utf8",
        windowsHide: true,
        timeout: 10000,
      },
    );
    assert.equal(result.error, undefined);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /fixture: publisher dependency unavailable/u);
    const service = phase.startsWith("promote-")
      ? phase.slice("promote-".length)
      : null;
    const markerName = `no-effect-${phase}-17-2.json`;
    assert.ok(
      existsSync(join(directory, markerName)),
      "Import failure must be distinguished from an unknown publication outcome",
    );
    assert.deepEqual(JSON.parse(readFileSync(join(directory, markerName))), {
      schemaVersion: 1,
      state: "no-request",
      phase: service ? "promote" : phase,
      ...(service ? { service } : {}),
      run: "17",
      attempt: "2",
      controller: "a".repeat(40),
      manifestSha256: manifestSha,
    });
    assert.deepEqual(
      readFileSync(join(directory, "release-manifest.json")),
      manifest,
    );
    const index = JSON.parse(
      readFileSync(join(directory, "evidence-index.json")),
    );
    assert.equal(index.manifestSha256, manifestSha);
    assert.ok(index.files.some(({ name }) => name === markerName));
    assert.ok(!existsSync(join(directory, `${phase}-17-2.jsonl`)));
  });

test("startup recovery cannot relabel an existing request or changed candidate as no-request", async (t) => {
  const directory = mkdtempSync(
    join(tmpdir(), "json-quality-release-startup-"),
  );
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const manifest = Buffer.from('{"original":"qualified bytes"}\n');
  writeFileSync(join(directory, "release-manifest.json"), manifest);
  const env = {
    GITHUB_RUN_ID: "17",
    GITHUB_RUN_ATTEMPT: "2",
    GITHUB_SHA: "a".repeat(40),
    MANIFEST_SHA: sha256(manifest),
  };
  const failure = new Error("original import failure");
  const load = async () => {
    throw failure;
  };
  const journal = Buffer.from(
    '{"state":"intent","operation":"original request"}\n',
  );
  writeFileSync(join(directory, "stage-17-2.jsonl"), journal);
  await assert.rejects(
    runReleaseCommand(
      ["stage", directory, join(directory, "scratch")],
      env,
      load,
    ),
    (error) =>
      error.errors[0] === failure && /conflicts/u.test(error.errors[1].message),
  );
  assert.deepEqual(readFileSync(join(directory, "stage-17-2.jsonl")), journal);
  assert.ok(!existsSync(join(directory, "no-effect-stage-17-2.json")));
  writeFileSync(join(directory, "release-manifest.json"), "changed bytes");
  await assert.rejects(
    runReleaseCommand(
      ["archive", directory, join(directory, "scratch")],
      env,
      load,
    ),
    AggregateError,
  );
  assert.ok(!existsSync(join(directory, "no-effect-archive-17-2.json")));
});

test("release startup records and GitHub GET reader load without any installed npm packages", () => {
  const hook = `import {registerHooks} from "node:module"; registerHooks({resolve(specifier, context, next) { if (!/^(?:node:|file:|data:|[./]|[A-Za-z]:)/u.test(specifier)) throw new Error("Unexpected package dependency: " + specifier); return next(specifier, context); }});`;
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      `data:text/javascript,${encodeURIComponent(hook)}`,
      "--input-type=module",
      "--eval",
      'await import("./scripts/release-command.js"); await import("./scripts/github-evidence.js");',
    ],
    { cwd: root, encoding: "utf8", windowsHide: true, timeout: 10000 },
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
});

test("the dispatcher forwards the original controller environment to exactly one selected writer", async () => {
  const env = { GITHUB_SHA: "b".repeat(40), MANIFEST_SHA: "c".repeat(64) };
  const calls = [];
  const implementation = {
    runReleaseEffect: (...args) => calls.push(["effect", ...args]),
    runNpmPromotion: (...args) => calls.push(["npm", ...args]),
    runGithubPromotion: (...args) => calls.push(["github", ...args]),
  };
  const loaded = [];
  for (const command of ["stage", "archive", "promote-npm", "promote-github"]) {
    await runReleaseCommand(
      [command, "admitted", "scratch"],
      env,
      async (path) => {
        loaded.push(path);
        return implementation;
      },
    );
  }
  assert.deepEqual(loaded, [
    "./release-effects.js",
    "./release-effects.js",
    "./promote-npm.js",
    "./promote-github.js",
  ]);
  assert.deepEqual(calls, [
    ["effect", "stage", "admitted", "scratch", env],
    ["effect", "archive", "admitted", "scratch", env],
    ["npm", "admitted", "scratch", env],
    ["github", "admitted", "scratch", env],
  ]);
});
