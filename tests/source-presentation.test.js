// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { temporaryRepository } from "./temporary-repository.js";
import { formatJsonValue } from "../src/index.js";
import { fixtureStream, repositoryEvents } from "./repository-fixture.js";

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function fixture(t, bytes = Buffer.from(' { "n": 1 }\r\n')) {
  const root = temporaryRepository(t, "json-quality-source-presentation-"),
    policy = {
      schemaVersion: 2,
      defaults: {
        formatContract: "prettier-json",
        allowFormatWrites: true,
        normalization: "NFC",
      },
      exceptions: [
        {
          paths: [".git/**"],
          exclude: true,
          owner: "Git",
          reason: "External state.",
        },
      ],
      nativeSources: [
        {
          id: "originals",
          provider: "owner",
          owner: "Native owner",
          reason: "Independent original source admission.",
        },
      ],
      preserveSourcePresentation: [
        {
          paths: ["original.blob"],
          owner: "Original source owner",
          reason: "Original presentation bound to native census.",
        },
      ],
    },
    save = async () =>
      writeFileSync(
        join(root, ".json-quality.json"),
        await formatJsonValue(policy),
      );
  await save();
  writeFileSync(join(root, "original.blob"), bytes);
  const identity = {
      path: "original.blob",
      sha256: digest(bytes),
      byteLength: String(bytes.length),
    },
    delivery = { bytes };
  return {
    root,
    policy,
    save,
    bytes,
    identity,
    delivery,
    options: {
      root,
      nativeProviders: {
        owner: async () => ({
          authorities: fixtureStream(identity),
          inventory: fixtureStream({
            ...identity,
            source: { ...identity, kind: "content-addressed" },
          }),
          documents: fixtureStream({
            path: identity.path,
            chunks: fixtureStream(delivery.bytes),
          }),
          close() {},
        }),
      },
    },
  };
}

test("source presentation is retained only after complete native admission", async (t) => {
  const f = await fixture(t),
    events = await repositoryEvents(f.options),
    terminal = events.find(
      (event) => event.type === "terminal" && event.path === "original.blob",
    );
  assert.equal(events.at(-1).contractSatisfied, true);
  assert.equal(terminal.presentationChecked, false);
  assert.equal(terminal.expectedMatched, true);
  f.delivery.bytes = Buffer.from(f.bytes);
  f.delivery.bytes[1] ^= 1;
  await assert.rejects(repositoryEvents(f.options), /identity/u);
  await assert.rejects(
    repositoryEvents({ root: f.root }),
    /Missing trusted native provider/u,
  );
});
test("source retention checks semantics and blocks every repair write", async (t) => {
  const f = await fixture(t, Buffer.from('{"n":9007199254740992}\r\n'));
  writeFileSync(join(f.root, "authored.json"), '{"x":1}');
  const before = readFileSync(join(f.root, "authored.json")),
    events = await repositoryEvents(f.options, "format");
  assert.equal(events.at(-1).type, "write-failure");
  assert.equal(events.at(-1).written, "0");
  assert.ok(
    events.some(
      (event) =>
        event.type === "finding" && event.messageId === "unsafeInteger",
    ),
  );
  assert.deepEqual(readFileSync(join(f.root, "authored.json")), before);
});
test("source presentation cannot hide an ordinary physical presentation finding", async (t) => {
  const f = await fixture(t);
  f.policy.preserveSourcePresentation[0].paths = ["**/*"];
  await f.save();
  writeFileSync(join(f.root, "ordinary.json"), '{"x":1}');
  const events = await repositoryEvents(f.options);
  assert.ok(
    events.some(
      (event) =>
        event.path === "ordinary.json" &&
        event.type === "finding" &&
        event.phase === "presentation",
    ),
  );
});
test("original presentation retains only separately pinned exact semantic diagnostics", async (t) => {
  const f = await fixture(t, Buffer.from('{"n":9007199254740992}\r\n'));
  f.policy.exceptions.push({
    paths: [f.identity.path],
    owner: "Conformance owner",
    reason: "Exact original negative fixture.",
    allowFormatWrites: false,
    expected: {
      sha256: f.identity.sha256,
      byteLength: f.identity.byteLength,
      diagnostics: [
        {
          severity: "error",
          phase: "lint",
          ruleId: "json/no-unsafe-values",
          messageId: "unsafeInteger",
          line: "1",
          column: "6",
          endLine: "1",
          endColumn: "22",
        },
      ],
    },
  });
  await f.save();
  const admitted = await repositoryEvents(f.options);
  assert.equal(admitted.at(-1).contractSatisfied, true);
  const terminal = admitted.find(
    (event) => event.type === "terminal" && event.path === "original.blob",
  );
  assert.equal(terminal.qualityPassed, false);
  assert.equal(terminal.expectedMatched, true);
  f.policy.exceptions.at(-1).expected.diagnostics = [];
  await f.save();
  assert.equal(
    (await repositoryEvents(f.options)).at(-1).contractSatisfied,
    false,
  );
});
test("stale source selection and unsafe patterns cannot deliver an execution verdict", async (t) => {
  const f = await fixture(t);
  f.policy.preserveSourcePresentation[0].paths = ["missing/**/*.json"];
  await f.save();
  await assert.rejects(
    repositoryEvents(f.options),
    /Unmatched source-presentation/u,
  );
  f.policy.preserveSourcePresentation[0].paths = ["../**"];
  await f.save();
  await assert.rejects(repositoryEvents(f.options), /Unsafe/u);
});
test("logical originals retain presentation only after frozen physical-pointer and byte linkage", async (t) => {
  const f = await fixture(t);
  delete f.policy.nativeSources;
  f.policy.preserveSourcePresentation[0].paths = ["logical/*.json"];
  await f.save();
  writeFileSync(
    join(f.root, "corpus.json"),
    await formatJsonValue({ source: f.bytes.toString("utf8") }),
  );
  const options = () => ({
    root: f.root,
    logicalProviders: [
      {
        definition: {
          id: "logical",
          minimumDocuments: 1,
          containerPaths: ["corpus.json"],
        },
        inventory: () =>
          fixtureStream({
            path: "logical/original.json",
            containerPath: "corpus.json",
            pointer: "/source",
            encoding: "utf8",
            sha256: digest(f.bytes),
            byteLength: String(f.bytes.length),
          }),
      },
    ],
  });
  const events = await repositoryEvents(options());
  assert.equal(events.at(-1).contractSatisfied, true);
  assert.equal(
    events.find(
      (event) =>
        event.type === "terminal" && event.path === "logical/original.json",
    ).presentationChecked,
    false,
  );
  writeFileSync(
    join(f.root, "corpus.json"),
    await formatJsonValue({ source: "changed" }),
  );
  await assert.rejects(repositoryEvents(options()), /identity|provenance/u);
});
test("narrow NFC pins coexist with original presentation while unpinned values stay checked", async (t) => {
  const f = await fixture(t, Buffer.from('{"value":"e\u0301"}\r\n')),
    value = Buffer.from("e\u0301");
  f.policy.exceptions.push({
    paths: [f.identity.path],
    owner: "Original Unicode owner",
    reason: "Exact approved boundary value.",
    allowFormatWrites: false,
    preserveNfcValues: [
      {
        pointer: "/value",
        sha256: digest(value),
        byteLength: String(value.length),
      },
    ],
  });
  await f.save();
  assert.equal(
    (await repositoryEvents(f.options)).at(-1).contractSatisfied,
    true,
  );
  f.policy.exceptions.pop();
  await f.save();
  const events = await repositoryEvents(f.options);
  assert.equal(events.at(-1).contractSatisfied, false);
  assert.ok(
    events.some(
      (event) => event.type === "finding" && event.messageId === "unnormalized",
    ),
  );
});
