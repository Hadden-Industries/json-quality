// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  decodeGitIgnoreDecisions,
  ignoredGitPaths,
  gitIgnoreBatchLimits,
} from "../../src/git-ignore.js";
import { resolveExecutionResources } from "../../src/execution-resources.js";

const execution = { numericResources: resolveExecutionResources() },
  records = (...fields) => Buffer.from(fields.join("\0") + "\0");

test("ignore response requires one strict, complete decision per supplied path", () => {
  const paths = ["ignored.json", "keep.json", "plain.json"],
    valid = records(
      ".gitignore",
      "1",
      "*.json",
      paths[0],
      ".gitignore",
      "2",
      "!keep.json",
      paths[1],
      "",
      "",
      "",
      paths[2],
    );
  assert.deepEqual(
    [...decodeGitIgnoreDecisions(valid, paths, 0)],
    ["ignored.json"],
  );
  for (let boundary = 0; boundary < valid.length; boundary++) {
    const fragments = [valid.subarray(0, boundary), valid.subarray(boundary)];
    assert.deepEqual(
      [...decodeGitIgnoreDecisions(Buffer.concat(fragments), paths, 0)],
      ["ignored.json"],
    );
  }
  for (const invalid of [
    Buffer.alloc(0),
    valid.subarray(0, -1),
    valid.subarray(0, valid.indexOf(0) + 1),
    records("", "", "", "foreign.json"),
    records("", "", "", paths[0], "", "", "", paths[0], "", "", "", paths[2]),
    records(
      "",
      "1",
      "*.json",
      paths[0],
      "",
      "",
      "",
      paths[1],
      "",
      "",
      "",
      paths[2],
    ),
    Buffer.concat([Buffer.from([0xff]), valid]),
  ])
    assert.throws(() => decodeGitIgnoreDecisions(invalid, paths, 0));
  // Whole-record truncation is also incomplete, even with a successful exit.
  assert.throws(
    () => decodeGitIgnoreDecisions(records("", "", "", paths[0]), paths, 1),
    /Incomplete/,
  );
  assert.throws(
    () => decodeGitIgnoreDecisions(valid, paths, 1),
    /Inconsistent/,
  );
  assert.throws(
    () =>
      decodeGitIgnoreDecisions(
        records("", "", "", "plain.json"),
        ["plain.json"],
        0,
      ),
    /Inconsistent/,
  );
});

test("real Git preserves negation, nested rules, local excludes, literal hyphens and Unicode", async () => {
  const root = await mkdtemp(join(tmpdir(), "json-ignore-rules-"));
  try {
    execFileSync("git", ["-C", root, "init", "--quiet", "--template="], {
      windowsHide: true,
    });
    await mkdir(join(root, "nested"));
    await mkdir(join(root, ".git/info"));
    await writeFile(join(root, ".gitignore"), "*.json\n!keep.json\n!nested/\n");
    await writeFile(join(root, "nested/.gitignore"), "!allowed.json\n");
    await writeFile(join(root, ".git/info/exclude"), "private.txt\n");
    const paths = [
        "ignored.json",
        "keep.json",
        "nested/allowed.json",
        "nested/blocked.json",
        "-literal.json",
        "white space é.json",
        "plain.txt",
        "private.txt",
      ],
      ignored = await ignoredGitPaths(root, paths, execution);
    assert.deepEqual(
      [...ignored],
      [
        "ignored.json",
        "nested/blocked.json",
        "-literal.json",
        "white space é.json",
        "private.txt",
      ],
    );
    assert.deepEqual(
      [...(await ignoredGitPaths(root, ["plain.txt"], execution))],
      [],
    );
    // A matching negation yields exit zero in verbose mode but grants permission.
    assert.deepEqual(
      [...(await ignoredGitPaths(root, ["keep.json"], execution))],
      [],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("ignore input is admitted by count and encoded bytes before spawning", async () => {
  const limits = gitIgnoreBatchLimits(execution.numericResources);
  assert.equal(limits.maximumPaths, 256);
  await assert.rejects(
    ignoredGitPaths(
      "unused",
      Array.from({ length: 257 }, (_, index) => `${index}.json`),
      execution,
    ),
    /path-capacity/,
  );
  await assert.rejects(
    ignoredGitPaths(
      "unused",
      ["a".repeat(limits.maximumInputBytes)],
      execution,
    ),
    /input-capacity/,
  );
  await assert.rejects(
    ignoredGitPaths("unused", ["bad\npath.json"], execution),
    /repository-relative/,
  );
  await assert.rejects(
    ignoredGitPaths("unused", ["\ud800.json"], execution),
    /encoding/,
  );
  assert.deepEqual([...(await ignoredGitPaths("unused", [], execution))], []);
});

test("ignore subprocess excludes inherited Git configuration injection", async () => {
  const root = await mkdtemp(join(tmpdir(), "json-ignore-environment-")),
    keys = ["GIT_CONFIG_COUNT", "GIT_CONFIG_KEY_0", "GIT_CONFIG_VALUE_0"],
    previous = keys.map((key) => process.env[key]);
  try {
    execFileSync("git", ["-C", root, "init", "--quiet", "--template="], {
      windowsHide: true,
    });
    await writeFile(join(root, "injected-excludes"), "victim.json\n");
    process.env.GIT_CONFIG_COUNT = "1";
    process.env.GIT_CONFIG_KEY_0 = "core.excludesFile";
    process.env.GIT_CONFIG_VALUE_0 = join(root, "injected-excludes");
    assert.deepEqual(
      [...(await ignoredGitPaths(root, ["victim.json"], execution))],
      [],
    );
  } finally {
    for (let index = 0; index < keys.length; index++) {
      if (previous[index] === undefined) delete process.env[keys[index]];
      else process.env[keys[index]] = previous[index];
    }
    await rm(root, { recursive: true, force: true });
  }
});

test("long repeated ignore metadata is retried as smaller settled queries", async () => {
  const root = await mkdtemp(join(tmpdir(), "json-ignore-output-batches-"));
  try {
    execFileSync("git", ["-C", root, "init", "--quiet", "--template="], {
      windowsHide: true,
    });
    await writeFile(join(root, ".gitignore"), "*".repeat(200) + ".json\n");
    const paths = Array.from({ length: 100 }, (_, index) => `${index}.json`),
      bounded = {
        numericResources: resolveExecutionResources(
          {},
          { capacityLimits: { maxGitOutputBytes: 8192 } },
        ),
      };
    assert.deepEqual([...(await ignoredGitPaths(root, paths, bounded))], paths);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
