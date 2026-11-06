// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  mkdtemp,
  writeFile,
  readFile,
  rm,
  mkdir,
  stat,
} from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { subscribe, unsubscribe } from "node:diagnostics_channel";
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
          schemaVersion: 4,
          defaults: {
            formatContract: "prettier-json",
            normalization: "NFC",
            allowSourceRewrites: true,
          },
          exceptions: [
            {
              paths: [".git/**"],
              owner: "Git",
              reason: "Repository metadata",
              excludeUntrackedSources: true,
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

test("no-op repository formatting streams multiple ignore batches without per-file children", async () => {
  const documents = Object.fromEntries(
    Array.from({ length: 257 }, (_, index) => [`file-${index}.json`, "{}\n"]),
  );
  await fixture(documents, async (root, execution) => {
    let ignoreChildren = 0,
      terminal;
    const observe = ({ process: child }) =>
      child.once("spawn", () => {
        if (child.spawnargs.includes("check-ignore")) ignoreChildren++;
      });
    subscribe("child_process", observe);
    try {
      for await (const event of rewriteRepository(
        execution,
        { root },
        "format",
      ))
        terminal = event;
      assert.equal(terminal.type, "write-terminal", terminal.message);
      assert.equal(terminal.selectedPathCount, "258");
      assert.equal(terminal.writtenPathCount, "0");
      assert.equal(ignoreChildren, 2);
    } finally {
      unsubscribe("child_process", observe);
    }
  });
});

test("an ignore-rule change after preflight refuses the pending physical write", async () => {
  await fixture(
    { "a.json": '{"value":1}', ".gitignore": "" },
    async (root, execution) => {
      let terminal;
      for await (const event of rewriteRepository(
        execution,
        { root },
        "format",
        { files: ["a.json"] },
      )) {
        if (event.type === "write-preflight")
          await writeFile(join(root, ".gitignore"), "a.json\n");
        terminal = event;
      }
      assert.equal(terminal.type, "write-failure");
      assert.match(terminal.message, /Write permission changed/);
      assert.equal(terminal.writtenPathCount, "0");
      assert.equal(await readFile(join(root, "a.json"), "utf8"), '{"value":1}');
    },
  );
});

test("no-change effects avoid duplicate candidate traversal and retain final freshness", async () => {
  await fixture(
    { "a.json": "{}\n", "b.json": "[]\n" },
    async (root, execution) => {
      const commands = [];
      const command = execution.core.command.bind(execution.core);
      execution.core.command = (name, args) => {
        commands.push(name);
        return command(name, args);
      };
      let terminal;
      for await (const event of rewriteRepository(
        execution,
        { root },
        "format",
      ))
        terminal = event;
      assert.equal(terminal.type, "write-terminal", terminal.message);
      assert.equal(terminal.writtenPathCount, "0");
      assert.equal(
        commands.filter((name) => name === "rewrite-next").length,
        4,
      );
      assert.equal(
        commands.filter((name) => name === "rewrite-open").length,
        1,
      );
      assert.ok(commands.filter((name) => name === "rewrite-obs").length >= 12);
    },
  );
});

test("membership batching preserves oversized-path and small-request singleton checks", async () => {
  const longName = "q".repeat(150) + ".json";
  for (const maxRequestBytes of [65536, 4095]) {
    await fixture(
      { "a.json": "0", "b.json": "1", [longName]: "{}\n" },
      async (root, execution) => {
        const queries = [];
        const command = execution.core.command.bind(execution.core);
        execution.core.command = (name, args) => {
          if (name === "census-check-members" || name === "census-get")
            queries.push({ name, ...args });
          return command(name, args);
        };
        let terminal;
        for await (const event of rewriteRepository(
          execution,
          { root },
          "format",
          { files: ["a.json", "b.json"] },
        ))
          terminal = event;
        assert.equal(terminal.type, "write-terminal", terminal.message);
        assert.equal(terminal.writtenPathCount, "2");
        assert.ok(
          queries.some(
            (query) => query.name === "census-get" && query.path === longName,
          ),
        );
        const batches = queries.filter(
          (query) => query.name === "census-check-members",
        );
        assert.equal(batches.length > 0, maxRequestBytes >= 4096);
        for (const batch of batches) {
          assert.ok(batch.paths.length <= 16);
          assert.ok(
            batch.paths.reduce(
              (sum, path) => sum + 2 + 2 * Buffer.byteLength(path),
              0,
            ) <= 256,
          );
        }
      },
      { capacityLimits: { maxRequestBytes } },
    );
  }
});

test("one effect traversal still replaces changed policy last", async () => {
  const policy = {
    schemaVersion: 4,
    defaults: {
      formatContract: "prettier-json",
      normalization: "NFC",
      allowSourceRewrites: true,
    },
    exceptions: [
      {
        paths: [".git/**"],
        excludeUntrackedSources: true,
        owner: "Git",
        reason: "Metadata",
      },
    ],
  };
  await fixture(
    {
      "a.json": "0",
      "b.json": "1",
      ".json-quality.json": JSON.stringify(policy),
    },
    async (root, execution) => {
      const written = [];
      let terminal;
      for await (const event of rewriteRepository(
        execution,
        { root },
        "format",
      )) {
        if (event.type === "written") written.push(event.path);
        terminal = event;
      }
      assert.equal(terminal.type, "write-terminal", terminal.message);
      assert.deepEqual(written, ["a.json", "b.json", ".json-quality.json"]);
    },
  );
});

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
      assert.equal(events.at(-1).writtenPathCount, "2");
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
      for await (const event of session.check()) void event;
      let terminal;
      for await (const event of session.rewrite("format")) terminal = event;
      assert.equal(terminal.type, "write-terminal", terminal.message);
      assert.equal(terminal.schemaVersion, 5);
      assert.equal(terminal.writtenPathCount, "1");
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
      assert.equal(terminal.writtenPathCount, "0");
      assert.equal(terminal.preflightComplete, false);
      assert.equal(await readFile(join(root, "a.json"), "utf8"), '{"a":1}');
    },
  );
});

test("format preview preserves source observations and matches a fresh writer's exact candidates", async () => {
  const documents = {
    "changed.json": '{"value":"é","number":1.00}',
    "unchanged.json": "{}\n",
  };
  await fixture(documents, async (root, execution) => {
    const paths = [".json-quality.json", ...Object.keys(documents)],
      before = await Promise.all(
        paths.map(async (path) => ({
          bytes: await readFile(join(root, path)),
          observation: await stat(join(root, path), { bigint: true }),
        })),
      ),
      directoryBefore = await stat(root, { bigint: true }),
      events = [];
    for await (const event of rewriteRepository(execution, { root }, "format", {
      files: Object.keys(documents),
      dryRun: true,
    }))
      events.push(event);
    const terminal = events.at(-1),
      changes = events.filter(
        (event) => event.type === "format-preview-change",
      );
    assert.equal(terminal.type, "format-preview-terminal", terminal.message);
    assert.equal(terminal.preflightComplete, true);
    assert.equal(terminal.sourceObservationsComplete, true);
    assert.equal(terminal.selectedPathCount, "2");
    assert.equal(terminal.changedPathCount, "1");
    assert.equal(terminal.qualityPassed, false);
    assert.equal(terminal.findingCount, "1");
    assert.equal(changes.length, 2);
    assert.ok(
      !events.some((event) =>
        ["written", "write-terminal"].includes(event.type),
      ),
    );
    assert.ok(
      events.findIndex((event) => event.type === "write-preflight") <
        events.findIndex((event) => event.type === "format-preview-change"),
    );
    for (const [index, path] of paths.entries()) {
      assert.deepEqual(await readFile(join(root, path)), before[index].bytes);
      const observed = await stat(join(root, path), { bigint: true });
      assert.equal(observed.ino, before[index].observation.ino);
      assert.equal(observed.mtimeNs, before[index].observation.mtimeNs);
    }
    assert.equal(
      (await stat(root, { bigint: true })).mtimeNs,
      directoryBefore.mtimeNs,
    );
    for (const change of changes) {
      const source = Buffer.from(documents[change.path]);
      assert.equal(
        change.sourceSha256,
        createHash("sha256").update(source).digest("hex"),
      );
      assert.equal(change.sourceByteLength, String(source.length));
      assert.equal(change.changed, change.path === "changed.json");
      for (const [key, value] of Object.entries(
        execution.implementationIdentity,
      ))
        assert.deepEqual(change[key], value);
    }
    const fresh = await createRepositoryExecution({
      root,
      component: verifiedComponent,
      temporaryDirectory: nativeTemporaryRoot,
      retainValues: true,
    });
    try {
      for await (const event of fresh.events()) void event;
      const writeEvents = [];
      for await (const event of rewriteRepository(fresh, { root }, "format", {
        files: Object.keys(documents),
      }))
        writeEvents.push(event);
      assert.equal(
        writeEvents.at(-1).type,
        "write-terminal",
        writeEvents.at(-1).message,
      );
      assert.equal(writeEvents.at(-1).writtenPathCount, "1");
      for (const change of changes) {
        const bytes = await readFile(join(root, change.path));
        assert.equal(change.candidateByteLength, String(bytes.length));
        assert.equal(
          change.candidateSha256,
          createHash("sha256").update(bytes).digest("hex"),
        );
        const source = writeEvents.find(
          (event) =>
            event.type === "source" &&
            event.scope === "candidate" &&
            event.path === change.path,
        );
        assert.equal(change.candidateSha256, source.sha256);
        assert.equal(change.candidateByteLength, source.byteLength);
      }
    } finally {
      await fresh.close();
    }
  });
});

test("format preview without a selection reports every eligible unchanged candidate", async () => {
  await fixture({ "a.json": "{}\n" }, async (root, execution) => {
    const events = [];
    for await (const event of rewriteRepository(execution, { root }, "format", {
      dryRun: true,
    }))
      events.push(event);
    assert.deepEqual(
      events
        .filter((event) => event.type === "format-preview-change")
        .map((event) => [event.path, event.changed]),
      [
        [".json-quality.json", false],
        ["a.json", false],
      ],
    );
    assert.equal(
      events.at(-1).type,
      "format-preview-terminal",
      events.at(-1).message,
    );
    assert.equal(events.at(-1).selectedPathCount, "2");
    assert.equal(events.at(-1).changedPathCount, "0");
    assert.equal(events.at(-1).qualityPassed, true);
  });
});

test("format preview retains complete native refusal for an invalid unselected peer", async () => {
  await fixture(
    { "a.json": '{"a":1}', "b.json": "9007199254740992\n" },
    async (root, execution) => {
      const events = [];
      for await (const event of rewriteRepository(
        execution,
        { root },
        "format",
        { files: ["a.json"], dryRun: true },
      ))
        events.push(event);
      const terminal = events.at(-1);
      assert.equal(terminal.type, "format-preview-terminal", terminal.message);
      assert.equal(terminal.complete, true);
      assert.equal(terminal.preflightComplete, false);
      assert.equal(terminal.message, "rewrite-peer-preflight-failed");
      assert.ok(
        !events.some((event) =>
          ["written", "write-terminal", "format-preview-change"].includes(
            event.type,
          ),
        ),
      );
      assert.equal(await readFile(join(root, "a.json"), "utf8"), '{"a":1}');
      assert.equal(
        await readFile(join(root, "b.json"), "utf8"),
        "9007199254740992\n",
      );
    },
  );
});

test("format preview cannot transform a protected ignored source", async () => {
  await fixture(
    { ".gitignore": "ignored.json\n", "ignored.json": '{"a":1}' },
    async (root, execution) => {
      let terminal;
      for await (const event of rewriteRepository(
        execution,
        { root },
        "format",
        { files: ["ignored.json"], dryRun: true },
      ))
        terminal = event;
      assert.equal(terminal.type, "write-failure");
      assert.equal(terminal.preflightComplete, false);
      assert.equal(terminal.writtenPathCount, "0");
      assert.match(terminal.message, /Protected/);
      assert.equal(
        await readFile(join(root, "ignored.json"), "utf8"),
        '{"a":1}',
      );
    },
  );
});

test("format preview rechecks freshness after provisional candidate delivery", async () => {
  await fixture({ "a.json": '{"a":1}' }, async (root, execution) => {
    let terminal;
    for await (const event of rewriteRepository(execution, { root }, "format", {
      files: ["a.json"],
      dryRun: true,
    })) {
      if (event.type === "format-preview-change")
        await writeFile(join(root, "a.json"), '{"a":2}');
      terminal = event;
    }
    assert.equal(terminal.type, "write-failure");
    assert.equal(terminal.writtenPathCount, "0");
    assert.equal(terminal.complete, false);
    assert.equal(await readFile(join(root, "a.json"), "utf8"), '{"a":2}');
  });
});

test("format preview rechecks ignore protection after provisional candidate delivery", async () => {
  await fixture(
    { "a.json": '{"a":1}', ".gitignore": "" },
    async (root, execution) => {
      let terminal;
      for await (const event of rewriteRepository(
        execution,
        { root },
        "format",
        {
          files: ["a.json"],
          dryRun: true,
        },
      )) {
        if (event.type === "format-preview-change")
          await writeFile(join(root, ".gitignore"), "a.json\n");
        terminal = event;
      }
      assert.equal(terminal.type, "write-failure");
      assert.equal(terminal.writtenPathCount, "0");
      assert.equal(terminal.complete, false);
      assert.match(terminal.message, /Write permission changed/);
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
      assert.equal(terminal.writtenPathCount, "0");
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
    assert.equal(terminal.writtenPathCount, "1");
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
    assert.equal(terminal.writtenPathCount, "1");
    assert.match(terminal.message, /New directory/);
  });
});
