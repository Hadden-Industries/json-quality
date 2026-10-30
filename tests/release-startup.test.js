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

const root = fileURLToPath(new URL("../", import.meta.url));
const blockPackages = `
  import { registerHooks } from "node:module";
  registerHooks({ resolve(specifier, context, nextResolve) {
    if (specifier === "ajv/dist/2020.js") throw new Error("fixture: publisher dependency unavailable");
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
      "release:effect"
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
