// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { createRepositoryExecution } from "../../src/repository-execution.js";
import { rewriteRepository } from "../../src/repository-rewrite.js";
import { createRepositorySession } from "../../src/session-surface.js";
import { nativeTemporaryRoot, verifiedComponent } from "./client.mjs";

async function fixture(documents, run, executionOptions = {}) {
  const root = await mkdtemp(join(nativeTemporaryRoot, "repository-rewrite-"));
  let execution;
  try {
    execFileSync("git", ["-C", root, "init", "--quiet"], { windowsHide: true });
    await writeFile(
      join(root, ".json-quality.json"),
      JSON.stringify(
        {
          schemaVersion: 2,
          defaults: {
            formatContract: "prettier-json",
            normalization: "NFC",
            allowFormatWrites: true,
          },
          exceptions: [
            {
              paths: [".git/**"],
              owner: "Git",
              reason: "Repository metadata",
              exclude: true,
            },
          ],
        },
        null,
        2,
      ) + "\n",
    );
    for (const [path, bytes] of Object.entries(documents))
      await writeFile(join(root, path), bytes);
    execution = await createRepositoryExecution({
      root,
      component: verifiedComponent,
      temporaryDirectory: nativeTemporaryRoot,
      retainValues: true,
      ...executionOptions,
    });
    for await (const event of execution.events()) void event;
    await run(root, execution);
  } finally {
    await execution?.close();
    await rm(root, { recursive: true, force: true });
  }
}

test("repository formatting admits all peers before replacing multiple sources", async () => {
  await fixture(
    { "a.json": '{"a":1}', "b.json": '{"b":2}' },
    async (root, execution) => {
      const events = [];
      for await (const event of rewriteRepository(
        execution,
        { root },
        "format",
      ))
        events.push(event);
      assert.equal(events.at(-1).type, "write-terminal", events.at(-1).message);
      assert.equal(events.at(-1).written, "2");
      assert.ok(
        events.findIndex((event) => event.type === "write-preflight") <
          events.findIndex((event) => event.type === "written"),
      );
      assert.equal(
        await readFile(join(root, "a.json"), "utf8"),
        '{\n  "a": 1\n}\n',
      );
      assert.equal(
        await readFile(join(root, "b.json"), "utf8"),
        '{\n  "b": 2\n}\n',
      );
    },
  );
});

test("advanced facade delivers versioned candidate and write completion events", async () => {
  await fixture({ "value.json": '{"a":1}' }, async (root) => {
    const session = await createRepositorySession(verifiedComponent, {
      root,
      temporaryDirectory: nativeTemporaryRoot,
    });
    try {
      assert.throws(() => session.rewrite("format"), /check-required/);
      for await (const event of session.events()) void event;
      let terminal;
      for await (const event of session.rewrite("format")) terminal = event;
      assert.equal(terminal.type, "write-terminal", terminal.message);
      assert.equal(terminal.schemaVersion, 2);
      assert.equal(terminal.written, "1");
      assert.throws(() => session.rewrite("format"), /already-consumed/);
    } finally {
      await session.close();
    }
  });
});

test("a bad unselected peer prevents every otherwise valid replacement", async () => {
  await fixture(
    { "a.json": '{"a":1}', "b.json": "9007199254740992\n" },
    async (root, execution) => {
      let terminal;
      for await (const event of rewriteRepository(
        execution,
        { root },
        "format",
        { files: ["a.json"] },
      ))
        terminal = event;
      assert.equal(terminal.type, "write-failure");
      assert.equal(terminal.written, "0");
      assert.equal(terminal.preflightComplete, false);
      assert.equal(await readFile(join(root, "a.json"), "utf8"), '{"a":1}');
    },
  );
});

test("explicit NFC replacement preserves numeric lexemes and full postconditions", async () => {
  await fixture(
    { "a.json": '{\n  "a": "é",\n  "n": 1.00\n}\n' },
    async (root, execution) => {
      let terminal;
      for await (const event of rewriteRepository(
        execution,
        { root },
        "normalize",
        { files: ["a.json"] },
      ))
        terminal = event;
      assert.equal(terminal.type, "write-terminal", terminal.message);
      assert.equal(
        await readFile(join(root, "a.json"), "utf8"),
        '{\n  "a": "é",\n  "n": 1.00\n}\n',
      );
    },
  );
});

test("root NFC preflight rechecks actual changed logical JSON before its container is replaced", async () => {
  const embedded = '"é"\n',
    input = JSON.stringify({ embedded }, null, 2) + "\n",
    identity = {
      sha256: createHash("sha256").update(embedded).digest("hex"),
      byteLength: String(Buffer.byteLength(embedded)),
    },
    logicalProviders = [
      {
        definition: {
          id: "embedded",
          minimumDocuments: 1,
          containerPaths: ["container.json"],
        },
        async *inventory() {
          yield {
            path: "embedded.json",
            containerPath: "container.json",
            pointer: "/embedded",
            encoding: "utf8",
            ...identity,
          };
        },
      },
    ];
  await fixture(
    { "container.json": input },
    async (root, execution) => {
      let logicalComplete = false,
        terminal;
      for await (const event of rewriteRepository(
        execution,
        { root },
        "normalize",
        { files: ["container.json"] },
      )) {
        if (
          event.type === "terminal" &&
          event.scope === "candidate" &&
          event.path === "embedded.json"
        )
          logicalComplete = event.contractSatisfied;
        if (event.type === "written") assert.equal(logicalComplete, true);
        terminal = event;
      }
      assert.equal(terminal.type, "write-terminal", terminal.message);
      assert.equal(
        JSON.parse(await readFile(join(root, "container.json"), "utf8"))
          .embedded,
        '"é"\n',
      );
    },
    { logicalProviders },
  );
});

test("Git ignore protects explicit writes while its JSON remains a checked peer", async () => {
  await fixture(
    { ".gitignore": "ignored.json\n", "ignored.json": "0\n" },
    async (root, execution) => {
      assert.ok(
        (await execution.core.command("census-get", { path: "ignored.json" }))
          .result.member.source,
      );
      let terminal;
      for await (const event of rewriteRepository(
        execution,
        { root },
        "format",
        { files: ["ignored.json"] },
      ))
        terminal = event;
      assert.equal(terminal.type, "write-failure");
      assert.equal(terminal.written, "0");
      assert.match(terminal.message, /Protected/);
      assert.equal(await readFile(join(root, "ignored.json"), "utf8"), "0\n");
    },
  );
});

test("late peer mutation yields truthful partial completion", async () => {
  await fixture({ "a.json": "0", "b.json": "1" }, async (root, execution) => {
    let terminal;
    for await (const event of rewriteRepository(
      execution,
      { root },
      "format",
    )) {
      if (event.type === "written" && event.path === "a.json")
        await writeFile(join(root, "b.json"), "2");
      terminal = event;
    }
    assert.equal(terminal.type, "write-failure");
    assert.equal(terminal.written, "1");
    assert.equal(terminal.preflightComplete, true);
    assert.equal(await readFile(join(root, "a.json"), "utf8"), "0\n");
    assert.equal(await readFile(join(root, "b.json"), "utf8"), "2");
  });
});

test("new JSON membership after an owned rename cannot hide behind changed directory timestamps", async () => {
  await fixture({ "a.json": "0", "b.json": "1" }, async (root, execution) => {
    let terminal;
    for await (const event of rewriteRepository(
      execution,
      { root },
      "format",
    )) {
      if (event.type === "written" && event.path === "a.json") {
        await mkdir(join(root, "new"));
        await writeFile(join(root, "new", "extra.json"), "0\n");
      }
      terminal = event;
    }
    assert.equal(terminal.type, "write-failure");
    assert.equal(terminal.written, "1");
    assert.match(terminal.message, /New directory/);
  });
});
