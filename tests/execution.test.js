// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFileSync, readFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { temporaryRepository } from "./temporary-repository.js";
import { openJsonRepositorySession } from "../src/index.js";
import { fixtureStream, repositoryEvents } from "./repository-fixture.js";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
function repository(t) {
  const root = temporaryRepository(t, "json-quality-test-"),
    policy = {
      schemaVersion: 3,
      defaults: {
        formatContract: "prettier-json",
        allowFormatWrites: true,
        normalization: "NFC",
      },
      exceptions: [
        {
          paths: [".git/**", "**/node_modules/**"],
          exclude: true,
          owner: "Git and npm",
          reason: "External installations; tracked JSON remains included.",
        },
      ],
    },
    save = () =>
      writeFileSync(
        join(root, ".json-quality.json"),
        JSON.stringify(policy, null, 2) + "\n",
      );
  save();
  return { root, policy, save };
}
test("independent public sessions retain immutable event and resource state", async (t) => {
  const { root } = repository(t);
  writeFileSync(join(root, "source.json"), "{}\n");
  const first = await repositoryEvents({ root }),
    second = await repositoryEvents({ root });
  assert.equal(second.at(-1).contractSatisfied, true);
  assert.notEqual(first[0].requestId, second[0].requestId);
  assert.throws(() => {
    first[0].resources.runtime.maxCheckTimeMs = "0";
  }, TypeError);
  assert.equal(second[0].resources.runtime.maxCheckTimeMs, "120000");
});
test("many sibling external boundaries reconcile through the bounded adaptive census", async (t) => {
  const { root } = repository(t),
    peers = 200;
  for (let index = 0; index < peers; index++) {
    const directory = join(root, `peer-${index}`);
    mkdirSync(join(directory, "node_modules"), { recursive: true });
    writeFileSync(join(directory, "data.json"), "{}\n");
    writeFileSync(
      join(directory, "node_modules", "outside.json"),
      "invalid outside boundary",
    );
  }
  const events = await repositoryEvents({
    root,
    runtimeControls: { managedMemoryTargetBytes: 16777216 },
  });
  assert.equal(events.at(-1).members, String(peers + 1));
  assert.equal(events.at(-1).contractSatisfied, true);
  assert.equal(
    events.some((event) => event.path?.includes("node_modules")),
    false,
  );
  for (const event of events)
    if (event.type === "terminal")
      assert.ok(BigInt(event.managedPeakBytes) <= 16777216n);
});
test("complete discovery includes hidden, untracked and Git-ignored generated JSON", async (t) => {
  const { root } = repository(t);
  writeFileSync(join(root, ".gitignore"), "dist/\n");
  mkdirSync(join(root, "dist"));
  writeFileSync(join(root, "dist", "generated.json"), '{"x":9007199254740992}');
  writeFileSync(join(root, ".hidden.json"), "{}\n");
  const events = await repositoryEvents({ root });
  assert.deepEqual(
    events
      .filter((event) => event.type === "source")
      .map((event) => event.path),
    [".hidden.json", ".json-quality.json", "dist/generated.json"],
  );
  assert.equal(events.at(-1).contractSatisfied, false);
  assert.ok(
    events.some(
      (event) =>
        event.path === "dist/generated.json" &&
        event.type === "finding" &&
        event.phase === "lint",
    ),
  );
});
test("tracked hidden JSON in a pruned ancestor is checked and cannot acquire write permission", async (t) => {
  const { root } = repository(t),
    path = "node_modules/.hidden.json";
  mkdirSync(join(root, "node_modules"));
  writeFileSync(join(root, ".gitignore"), "node_modules/\n");
  const original = '{"n":1}\n';
  writeFileSync(join(root, path), original);
  execFileSync("git", ["-C", root, "add", "--force", path], {
    windowsHide: true,
  });
  const events = await repositoryEvents({ root }, "format");
  assert.equal(events.at(-1).type, "write-failure");
  assert.equal(events.at(-1).written, "0");
  assert.ok(
    events.some(
      (event) =>
        event.type === "finding" &&
        event.path === path &&
        event.phase === "presentation",
    ),
  );
  assert.equal(readFileSync(join(root, path), "utf8"), original);
  writeFileSync(join(root, path), '{"name":"A\\u030a"}\n');
  const normalized = await repositoryEvents({ root }, "normalize", [path]);
  assert.equal(normalized.at(-1).type, "write-failure");
  assert.match(normalized.at(-1).message, /Protected/u);
});
test(
  "Windows Git casing cannot make a rescued hidden JSON source writable",
  { skip: process.platform !== "win32" },
  async (t) => {
    const { root } = repository(t),
      actualPath = "node_modules/.hidden.json",
      trackedPath = "NODE_MODULES/.hidden.json",
      original = '{"n":1}\n';
    mkdirSync(join(root, "node_modules"));
    writeFileSync(join(root, actualPath), original);
    const oid = execFileSync(
      "git",
      ["-C", root, "hash-object", "-w", "--", actualPath],
      { encoding: "utf8", windowsHide: true },
    ).trim();
    execFileSync(
      "git",
      [
        "-C",
        root,
        "update-index",
        "--add",
        "--cacheinfo",
        "100644",
        oid,
        trackedPath,
      ],
      { windowsHide: true },
    );
    const events = await repositoryEvents({ root }, "format");
    assert.equal(events.at(-1).type, "write-failure");
    assert.equal(events.at(-1).written, "0");
    assert.equal(readFileSync(join(root, actualPath), "utf8"), original);
  },
);
test("consumer ESLint/formatter configuration cannot weaken complete checking", async (t) => {
  const { root } = repository(t);
  writeFileSync(
    join(root, "eslint.config.js"),
    'throw new Error("Consumer configuration executed");',
  );
  writeFileSync(
    join(root, ".prettierrc.json"),
    '{"parser":"babel","tabWidth":8}',
  );
  writeFileSync(join(root, "source.json"), '{"n":9007199254740992}');
  const events = await repositoryEvents({ root });
  assert.equal(events.at(-1).contractSatisfied, false);
  assert.ok(
    events.some(
      (event) =>
        event.type === "finding" && event.messageId === "unsafeInteger",
    ),
  );
});
test("explicit formatting repairs valid authored bytes with fixed package options", async (t) => {
  const { root } = repository(t);
  writeFileSync(join(root, "source.json"), '{"x":1.00e+2}');
  const events = await repositoryEvents({ root }, "format");
  assert.equal(events.at(-1).type, "write-terminal");
  assert.equal(events.at(-1).written, "1");
  assert.equal(
    readFileSync(join(root, "source.json"), "utf8"),
    '{\n  "x": 1.00e+2\n}\n',
  );
});
test("an invalid unselected peer blocks every formatting write", async (t) => {
  const { root } = repository(t);
  writeFileSync(join(root, "source.json"), '{"x":1}');
  writeFileSync(join(root, "peer.json"), '{"x":1,"x":2}');
  const events = await repositoryEvents({ root }, "format", ["source.json"]);
  assert.equal(events.at(-1).type, "write-failure");
  assert.equal(events.at(-1).written, "0");
  assert.equal(readFileSync(join(root, "source.json"), "utf8"), '{"x":1}');
});
test("producer presentation protects both formatting and normalization effects", async (t) => {
  const { root, policy, save } = repository(t);
  policy.exceptions.push({
    paths: ["producer.json"],
    formatContract: "producer-json-compact",
    owner: "Producer",
    reason: "Producer owns exact presentation.",
  });
  save();
  const bytes = '{"x":"e\\u0301"}\n';
  writeFileSync(join(root, "producer.json"), bytes);
  for (const operation of ["format", "normalize"]) {
    const events = await repositoryEvents({ root }, operation, [
      "producer.json",
    ]);
    assert.equal(events.at(-1).type, "write-failure");
    assert.equal(events.at(-1).written, "0");
    assert.match(events.at(-1).message, /Protected/u);
    assert.equal(readFileSync(join(root, "producer.json"), "utf8"), bytes);
  }
});
test("policy and invocation byte capacities can be raised or bypassed without changing runtime controls", async (t) => {
  const { root, policy, save } = repository(t);
  policy.capacityLimits = { maxFiles: 1 };
  save();
  writeFileSync(join(root, "source.json"), "{}\n");
  await assert.rejects(repositoryEvents({ root }), /file-capacity/u);
  for (const capacityLimits of [{ maxFiles: 2 }, false]) {
    const events = await repositoryEvents({ root, capacityLimits });
    assert.equal(events.at(-1).contractSatisfied, true);
    assert.equal(
      events[0].resources.runtime.managedMemoryTargetBytes,
      "33554432",
    );
  }
});
test("a real source above 32 MiB is streamed only after raising source byte capacity", async (t) => {
  const { root } = repository(t),
    bytes = Buffer.from('"' + "x".repeat(33 * 1024 * 1024) + '"\n');
  writeFileSync(join(root, "large.json"), bytes);
  await assert.rejects(repositoryEvents({ root }), /source-byte-capacity/u);
  const events = await repositoryEvents({
    root,
    capacityLimits: { maxFileBytes: bytes.length },
  });
  assert.equal(events.at(-1).contractSatisfied, true);
  const terminal = events.find(
    (event) => event.type === "terminal" && event.path === "large.json",
  );
  assert.equal(terminal.transitions, "1");
  assert.ok(BigInt(terminal.managedPeakBytes) <= 33554432n);
});
test("literal brackets in selected filenames cannot become tool globs", async (t) => {
  const { root } = repository(t);
  writeFileSync(join(root, "data[1].json"), '{"x":1}');
  const events = await repositoryEvents({ root }, "format", ["data[1].json"]);
  assert.equal(events.at(-1).type, "write-terminal");
  assert.equal(
    readFileSync(join(root, "data[1].json"), "utf8"),
    '{\n  "x": 1\n}\n',
  );
});
test("malformed UTF-8 never authorizes normalization or replaces original bytes", async (t) => {
  const { root } = repository(t),
    bytes = Buffer.from([
      0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xc3, 0x28, 0x22, 0x7d,
    ]);
  writeFileSync(join(root, "data.json"), bytes);
  const events = await repositoryEvents({ root }, "normalize", ["data.json"]);
  assert.equal(events.at(-1).type, "write-failure");
  assert.equal(events.at(-1).written, "0");
  assert.deepEqual(readFileSync(join(root, "data.json")), bytes);
});
test("late peer mutation reports earlier writes and leaves subsequent files untouched", async (t) => {
  const { root } = repository(t);
  for (const path of ["a.json", "b.json", "c.json"])
    writeFileSync(join(root, path), '{"x":1}');
  const session = await openJsonRepositorySession({ root });
  let terminal;
  try {
    for await (const event of session.events()) terminal = event;
    for await (const event of session.rewrite("format")) {
      if (event.type === "written" && event.path === "a.json")
        writeFileSync(join(root, "b.json"), '{"changed":true}');
      terminal = event;
    }
  } finally {
    await session.close();
  }
  assert.equal(terminal.type, "write-failure");
  assert.equal(terminal.written, "1");
  assert.equal(terminal.preflightComplete, true);
  assert.equal(readFileSync(join(root, "a.json"), "utf8"), '{\n  "x": 1\n}\n');
  assert.equal(readFileSync(join(root, "b.json"), "utf8"), '{"changed":true}');
  assert.equal(readFileSync(join(root, "c.json"), "utf8"), '{"x":1}');
  assert.ok(readdirSync(root).every((path) => !path.endsWith(".tmp")));
});
test("JSONL execution reports exact admitted record counts after default framing presentation", async (t) => {
  const { root } = repository(t);
  writeFileSync(join(root, "records.jsonl"), "{}\n{}\n");
  const events = await repositoryEvents({ root });
  assert.equal(events.at(-1).contractSatisfied, true);
  assert.equal(
    events.find(
      (event) => event.type === "terminal" && event.path === "records.jsonl",
    ).recordCount,
    "2",
  );
});
test("exact expected container findings require every pinned logical linkage", async (t) => {
  const { root, policy, save } = repository(t),
    bytes = Buffer.from('{\n  "x": "\uFDD0"\n}\n'),
    container = Buffer.from(
      JSON.stringify({ artifacts: [{ text: bytes.toString() }] }, null, 2) +
        "\n",
    ),
    member = {
      path: "logical/source.json",
      sha256: hash(bytes),
      byteLength: String(bytes.length),
      containerPath: "bundle.json",
      pointer: "/artifacts/0/text",
      encoding: "utf8",
    };
  writeFileSync(join(root, "bundle.json"), container);
  const expected = (value, line, column, endColumn) => ({
    sha256: hash(value),
    byteLength: String(value.length),
    diagnostics: [
      {
        severity: "error",
        phase: "lint",
        ruleId: "json-quality/interoperability",
        messageId: "noncharacter",
        codePoint: "U+FDD0",
        line,
        column,
        endLine: line,
        endColumn,
      },
    ],
  });
  policy.exceptions.push(
    {
      paths: ["bundle.json"],
      allowFormatWrites: false,
      owner: "Negative-vector oracle",
      reason: "Exact original negative source and actual container.",
      expected: {
        ...expected(container, "4", "15", "39"),
        linkedDocuments: [
          {
            path: member.path,
            pointer: member.pointer,
            encoding: member.encoding,
            sha256: member.sha256,
            byteLength: member.byteLength,
          },
        ],
      },
    },
    {
      paths: [member.path],
      allowFormatWrites: false,
      owner: "Negative-vector oracle",
      reason: "Intentional Unicode counterexample.",
      expected: expected(bytes, "2", "8", "11"),
    },
  );
  save();
  await assert.rejects(
    repositoryEvents({ root }),
    /Missing required logical document/u,
  );
  const options = () => ({
    root,
    logicalProviders: [
      {
        definition: {
          id: "logical",
          minimumDocuments: 1,
          containerPaths: [member.containerPath],
        },
        inventory: () => fixtureStream(member),
      },
    ],
  });
  const events = await repositoryEvents(options());
  assert.equal(events.at(-1).contractSatisfied, true);
  assert.equal(
    events.filter(
      (event) => event.type === "terminal" && event.expectedMatched === true,
    ).length,
    2,
  );
  policy.exceptions.at(-2).expected.linkedDocuments[0].pointer =
    "/artifacts/0/absent";
  save();
  await assert.rejects(repositoryEvents(options()), /pointer|linkage/u);
});
