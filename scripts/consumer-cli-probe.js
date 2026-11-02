// SPDX-License-Identifier: AGPL-3.0-only
// Dependency-only installed CLI proof: this module never imports the package SDK.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const name = "@hadden-industries/json-quality";
export const MINIMAL_CLI_CASES = Object.freeze([
  "satisfied-with-generated-lock",
  "presentation-only-format",
  "nfc-only-normalize",
  "zero-write-preview",
  "mixed-format-then-normalize",
  "mixed-normalize-then-format",
  "canonical-key-collision-refusal",
  "invalid-source-zero-writes",
  "generated-lock-write-protected",
  "sparse-global-preserve",
  "ndjson-current-cohort",
  "retired-cli-name-refusal",
]);
const command = (args, exitCode) => ({
    argv: ["npm", "exec", "--", "json-quality", ...args],
    exitCode,
  }),
  checkCommand = (code, root = true) =>
    command(["check", ...(root ? ["--root", "."] : [])], code),
  rewriteCommand = (verb, code, extra = []) =>
    command([verb, "--root", ".", ...extra, "--", "authored.json"], code);
export const MINIMAL_CLI_COMMANDS = Object.freeze([
  checkCommand(0),
  checkCommand(1),
  rewriteCommand("format", 0),
  checkCommand(0),
  checkCommand(1),
  rewriteCommand("normalize", 0, ["--dry-run"]),
  rewriteCommand("normalize", 0),
  checkCommand(0),
  ...[
    ["format", "normalize"],
    ["normalize", "format"],
  ].flatMap(([first, second]) => [
    checkCommand(1),
    rewriteCommand(first, 0),
    checkCommand(1),
    rewriteCommand(second, 0),
    checkCommand(0, false),
  ]),
  rewriteCommand("normalize", 2),
  checkCommand(1),
  rewriteCommand("format", 2),
  command(["format", "--root", ".", "--", "package-lock.json"], 2),
  checkCommand(0),
  rewriteCommand("normalize", 2),
  checkCommand(0, false),
  command(["check", "--ndjson"], 0),
  command(["check", "--json"], 2),
  command(["source"], 2),
]);
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function assertInstalledPolicyDigest(
  execution,
  expectedDefaultPolicySha256,
) {
  assert.equal(
    execution.defaultPolicySha256,
    expectedDefaultPolicySha256,
    "CLI execution used a different packaged default policy",
  );
}

/** Run from the graph root whose npm-generated lock is part of discovery. */
export function qualifyMinimalCli({
  root,
  npmCliPath,
  env,
  timeout,
  packageVersion,
}) {
  const metadata = JSON.parse(readFileSync(join(root, "package.json"))),
    installed = join(root, "node_modules", ...name.split("/")),
    installedMetadata = JSON.parse(
      readFileSync(join(installed, "package.json")),
    ),
    bin = join(
      root,
      "node_modules",
      ".bin",
      process.platform === "win32" ? "json-quality.cmd" : "json-quality",
    );
  assert.deepEqual(
    Object.keys(metadata).sort(),
    ["devDependencies", "name", "private", "version"].sort(),
  );
  assert.deepEqual(Object.keys(metadata.devDependencies), [name]);
  assert.equal(installedMetadata.version, packageVersion);
  assert.equal(installedMetadata.bin["json-quality"], "src/cli.js");
  assert.equal(
    installedMetadata.bin["json-quality-qualify-git"],
    "src/qualification-cli.js",
  );
  assert.equal(
    Object.hasOwn(installedMetadata.bin, "json-quality-qualify"),
    false,
  );
  assert.ok(existsSync(bin));
  if (process.platform === "win32")
    assert.match(
      readFileSync(bin, "utf8"),
      /@hadden-industries[\\/]json-quality[\\/]src[\\/]cli\.js/u,
    );
  else
    assert.equal(
      realpathSync(bin),
      realpathSync(join(installed, "src", "cli.js")),
    );
  assert.equal(existsSync(join(root, ".json-quality.json")), false);
  assert.equal(existsSync(join(root, "node_modules", "eslint")), false);
  const defaultPolicySha256 = digest(
      readFileSync(
        join(installed, "assets", "default-json-quality-policy.json"),
      ),
    ),
    lockBytes = readFileSync(join(root, "package-lock.json")),
    authored = join(root, "authored.json"),
    policy = join(root, ".json-quality.json"),
    cases = [],
    commands = [];
  const run = (args, expected) => {
    const result = spawnSync(
      process.execPath,
      [
        npmCliPath,
        "exec",
        "--offline",
        "--yes=false",
        "--registry=https://registry.npmjs.org/",
        "--",
        "json-quality",
        ...args,
      ],
      {
        cwd: root,
        env,
        windowsHide: true,
        encoding: "utf8",
        timeout,
        maxBuffer: 2097152,
      },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.equal(
      result.status,
      expected,
      `${args.join(" ")}\n${result.stderr}\n${result.stdout}`,
    );
    assert.deepEqual(readFileSync(join(root, "package-lock.json")), lockBytes);
    commands.push({
      argv: ["npm", "exec", "--", "json-quality", ...args],
      exitCode: result.status,
    });
    return result;
  };
  const check = (code) => run(["check", "--root", "."], code);
  const rewrite = (operation, code, extra = []) =>
    run([operation, "--root", ".", ...extra, "--", "authored.json"], code);
  const prepare = (text) => writeFileSync(authored, text);
  try {
    prepare("{}\n");
    check(0);
    cases.push("satisfied-with-generated-lock");
    prepare('{"label":"café"}');
    check(1);
    rewrite("format", 0);
    check(0);
    cases.push("presentation-only-format");
    prepare('{\n  "label": "e\\u0301"\n}\n');
    check(1);
    const previewBefore = readFileSync(authored);
    rewrite("normalize", 0, ["--dry-run"]);
    assert.deepEqual(readFileSync(authored), previewBefore);
    rewrite("normalize", 0);
    check(0);
    cases.push("nfc-only-normalize", "zero-write-preview");
    for (const order of [
      ["format", "normalize"],
      ["normalize", "format"],
    ]) {
      prepare('{"label":"e\\u0301"}');
      check(1);
      rewrite(order[0], 0);
      check(1);
      rewrite(order[1], 0);
      run(["check"], 0);
      cases.push(`mixed-${order.join("-then-")}`);
    }
    prepare('{"é":1,"e\\u0301":2}');
    const collision = readFileSync(authored);
    rewrite("normalize", 2);
    assert.deepEqual(readFileSync(authored), collision);
    cases.push("canonical-key-collision-refusal");
    prepare('{"broken":');
    const invalid = readFileSync(authored);
    check(1);
    rewrite("format", 2);
    assert.deepEqual(readFileSync(authored), invalid);
    cases.push("invalid-source-zero-writes");
    prepare("{}\n");
    run(["format", "--root", ".", "--", "package-lock.json"], 2);
    cases.push("generated-lock-write-protected");
    writeFileSync(
      policy,
      '{\n  "schemaVersion": 4,\n  "defaults": {\n    "normalization": "preserve"\n  }\n}\n',
    );
    prepare('{\n  "label": "e\\u0301"\n}\n');
    check(0);
    const preserved = readFileSync(authored);
    rewrite("normalize", 2);
    assert.deepEqual(readFileSync(authored), preserved);
    cases.push("sparse-global-preserve");
    rmSync(policy);
    prepare("{}\n");
    run(["check"], 0);
    const events = run(["check", "--ndjson"], 0)
      .stdout.trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.ok(events.every((event) => event.schemaVersion === 4));
    assert.equal(events.at(-1).type, "execution-terminal");
    const execution = events.find((event) => event.type === "execution");
    assertInstalledPolicyDigest(execution, defaultPolicySha256);
    assert.deepEqual(execution.configurationOrigin, {
      kind: "repository-absence",
      path: ".json-quality.json",
    });
    assert.match(execution.policyInputsSha256, /^[a-f0-9]{64}$/u);
    assert.equal(Object.hasOwn(execution, "policySha256"), false);
    cases.push("ndjson-current-cohort");
    run(["check", "--json"], 2);
    run(["source"], 2);
    cases.push("retired-cli-name-refusal");
    assert.deepEqual(cases, MINIMAL_CLI_CASES);
    assert.deepEqual(commands, MINIMAL_CLI_COMMANDS);
    const cohort = JSON.parse(
      readFileSync(join(installed, "schemas", "contract-cohort.json")),
    );
    assert.equal(cohort.cohortVersion, 4);
    return {
      status: "passed",
      packageVersion,
      cohortVersion: cohort.cohortVersion,
      policy: "package-defaults",
      defaultPolicySha256,
      command: "npm exec -- json-quality",
      cases,
      commands,
      generatedLockSha256: digest(lockBytes),
    };
  } finally {
    if (existsSync(policy)) rmSync(policy);
  }
}
