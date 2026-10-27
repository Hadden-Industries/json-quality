// SPDX-License-Identifier: AGPL-3.0-only
import { budgets } from "../../scripts/qualification-process.js";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { qualifyJsonConsumer } from "../../src/qualification.js";
import { validateJsonQualityEvent } from "../../src/events.js";

const policy = {
  schemaVersion: 3,
  defaults: {
    formatContract: "prettier-json",
    allowFormatWrites: true,
    normalization: "NFC",
  },
  exceptions: [],
};
const git = (root, ...args) =>
  execFileSync("git", ["-C", root, ...args], { windowsHide: true })
    .toString()
    .trim();
async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), "json-git-qualification-"));
  try {
    git(root, "init", "--quiet", "--template=");
    git(root, "config", "core.autocrlf", "false");
    await writeFile(
      join(root, ".json-quality.json"),
      JSON.stringify(policy, null, 2) + "\n",
    );
    await writeFile(join(root, "value.json"), "1.00\n");
    git(root, "add", ".");
    git(
      root,
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "--no-gpg-sign",
      "--quiet",
      "-m",
      "fixture",
    );
    const sha = git(root, "rev-parse", "HEAD");
    await run(
      {
        trustedRoot: root,
        candidateRoot: root,
        trustedSha: sha,
        candidateSha: sha,
      },
      root,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
async function collect(options) {
  const events = [];
  for await (const event of qualifyJsonConsumer(options)) {
    assert.equal(validateJsonQualityEvent(event), true, JSON.stringify(event));
    events.push(event);
  }
  return events;
}
test("qualification streams immutable blobs and declares its exact trusted/candidate scope", async () => {
  await fixture(async (options, root) => {
    // Working bytes have no authority over the immutable commit being checked.
    await writeFile(
      join(root, "value.json"),
      "candidate working bytes must not execute\n",
    );
    const events = await collect(options),
      terminal = events.at(-1);
    assert.equal(terminal.type, "execution-terminal");
    assert.equal(terminal.contractSatisfied, true);
    assert.equal(terminal.members, "2");
    assert.equal(terminal.domainComplete, false);
    assert.equal(events[0].qualification.candidateSha, options.candidateSha);
    assert.equal(events[0].qualification.scope, "immutable-git-json");
    assert.equal(events.filter((event) => event.type === "source").length, 2);
  });
});
test("candidate policy is ordinary data and cannot weaken the trusted policy", async () => {
  await fixture(async (options, root) => {
    await writeFile(join(root, "value.json"), '{"x":1,"x":2}\n');
    await writeFile(join(root, ".json-quality.json"), "{}\n");
    git(root, "add", ".");
    git(
      root,
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "--no-gpg-sign",
      "--quiet",
      "-m",
      "candidate",
    );
    options.candidateSha = git(root, "rev-parse", "HEAD");
    // A trusted commit may be an ancestor; immutable identity is independent of HEAD.
    const events = await collect(options);
    assert.equal(events.at(-1).contractSatisfied, false);
    assert.ok(events.some((event) => event.type === "finding"));
  });
});
test("qualification keeps finite runtime controls during admission bypass and rejects obsolete options", async () => {
  await fixture(async (options) => {
    const events = await collect({ ...options, capacityLimits: false });
    assert.equal(events[0].resources.admission.maxFileBytes, null);
    assert.equal(
      events[0].resources.runtime.managedMemoryTargetBytes,
      "33554432",
    );
    await assert.rejects(collect({ ...options, limits: false }), /options/u);
    const controller = new AbortController();
    controller.abort(new Error("stop qualification"));
    await assert.rejects(
      collect({ ...options, signal: controller.signal }),
      /stop qualification/u,
    );
  });
});

test("qualification rejects tree identities and unsupported tracked JSON dialects without a final verdict", async () => {
  await fixture(async (options, root) => {
    const tree = git(root, "rev-parse", "HEAD^{tree}");
    await assert.rejects(
      collect({ ...options, candidateSha: tree }),
      /must name a commit/u,
    );
    await writeFile(join(root, "unsupported.json5"), "{}\n");
    git(root, "add", ".");
    git(
      root,
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "--no-gpg-sign",
      "--quiet",
      "-m",
      "dialect",
    );
    await assert.rejects(
      collect({ ...options, candidateSha: git(root, "rev-parse", "HEAD") }),
      /Unsupported JSON source dialect/u,
    );
  });
});

test("qualification CLI delivers NDJSON for the immutable source scope", async () => {
  await fixture(async (options) => {
    const output = execFileSync(
      process.execPath,
      [
        fileURLToPath(
          new URL("../../src/qualification-cli.js", import.meta.url),
        ),
        "--trusted-root",
        options.trustedRoot,
        "--candidate-root",
        options.candidateRoot,
        "--trusted-sha",
        options.trustedSha,
        "--candidate-sha",
        options.candidateSha,
        "--request-id",
        "git-cli-fixture",
      ],
      {
        windowsHide: true,
        timeout: budgets.read,
        encoding: "utf8",
        maxBuffer: 1048576,
      },
    );
    const events = output
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.equal(events.at(-1).type, "execution-terminal");
    assert.equal(events.at(-1).contractSatisfied, true);
    for (const event of events) {
      assert.equal(validateJsonQualityEvent(event), true);
      assert.equal(event.requestId, "git-cli-fixture");
    }
  });
});

test("large Git JSON obeys byte admission and is streamed under admission bypass", async () => {
  await fixture(async (options, root) => {
    await writeFile(
      join(root, "large.json"),
      '"' + "x".repeat(2 * 1024 * 1024) + '"\n',
    );
    git(root, "add", ".");
    git(
      root,
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "--no-gpg-sign",
      "--quiet",
      "-m",
      "large",
    );
    const candidateSha = git(root, "rev-parse", "HEAD");
    await assert.rejects(
      collect({
        ...options,
        candidateSha,
        capacityLimits: { maxFileBytes: 1048576 },
      }),
      /source-byte-capacity/u,
    );
    const events = await collect({
      ...options,
      candidateSha,
      capacityLimits: false,
      runtimeControls: { managedMemoryTargetBytes: 16777216 },
    });
    assert.equal(events.at(-1).contractSatisfied, true);
    assert.ok(
      events.some(
        (event) => event.type === "source" && event.byteLength === "2097155",
      ),
    );
  });
});

test("raw qualification does not run Git fsmonitor or configured JSON filters", async () => {
  await fixture(async (options, root) => {
    const marker = join(root, "forbidden-command-ran"),
      script = join(root, ".git", "forbidden.cjs");
    await writeFile(
      script,
      `require("node:fs").writeFileSync(${JSON.stringify(marker)}, "ran");`,
    );
    const command = `"${process.execPath.replaceAll("\\", "/")}" "${script.replaceAll("\\", "/")}"`;
    git(root, "config", "core.fsmonitor", command);
    git(root, "config", "filter.evil.clean", command);
    git(root, "config", "filter.evil.required", "true");
    await writeFile(join(root, ".gitattributes"), "*.json filter=evil\n");
    const events = await collect(options);
    assert.equal(events.at(-1).contractSatisfied, true);
    assert.equal(existsSync(marker), false);
    // Independent negative control: the fixture really executes on a Git status
    // path. This occurs only after the qualifier has closed and was checked.
    git(root, "status", "--porcelain", "--untracked-files=no");
    assert.equal(existsSync(marker), true);
  });
});

test("tracked symlink JSON is rejected from its Git mode without opening checkout data", async () => {
  await fixture(async (options, root) => {
    const oid = git(root, "rev-parse", "HEAD:value.json");
    git(
      root,
      "update-index",
      "--add",
      "--cacheinfo",
      "120000",
      oid,
      "link.json",
    );
    git(
      root,
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "--no-gpg-sign",
      "--quiet",
      "-m",
      "symlink mode",
    );
    await assert.rejects(
      collect({ ...options, candidateSha: git(root, "rev-parse", "HEAD") }),
      /regular Git blobs/u,
    );
  });
});
