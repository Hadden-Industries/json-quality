// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import {
  checkJsonDocument,
  checkJsonLines,
  normalizeJsonSource,
  readJsonPolicy,
} from "../src/index.js";
import { mkdtempSync, writeFileSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";

// Independent SHA-256 identity of the decoded UTF-8 Kelvin-sign language tag.
const pin = {
  pointer: "/language",
  sha256: "14971fb7c5dc2552e42577c7dfad95c6f8ea49ef61a06eddeb10b7fcec2f3cdb",
  byteLength: 6,
};
const contract = {
  allowFormatWrites: false,
  normalization: "NFC",
  formatContract: "producer-json-compact-body",
  exceptions: [
    {
      owner: "Language fixture owner",
      reason: "Retain the intentional non-ASCII language tag.",
    },
  ],
  preserveNfcValues: [pin],
};
const nativeFindings = async (text) =>
  (await checkJsonDocument(Buffer.from(text), contract)).findings;

test("value preservation admits only the exact decoded value at its declared pointer", async () => {
  assert.deepEqual(await nativeFindings('{"language":"en-K"}'), []);
  const escaped = await nativeFindings('{"language":"en-\\u212a"}');
  assert.deepEqual(
    escaped.filter((f) => f.phase === "lint"),
    [],
  );
  assert(escaped.some((f) => f.phase === "presentation"));
  for (const text of [
    '{"language":"en-K"}',
    "{}",
    '{"language":null}',
    '{"other":"en-K"}',
  ]) {
    assert(
      (await nativeFindings(text)).some(
        (f) => f.messageId === "preservationMismatch",
      ),
      text,
    );
  }
});

test("preserving one value cannot waive other values, keys or NFC collisions", async () => {
  for (const text of [
    '{"language":"en-K","other":"e\\u0301"}',
    '{"language":"en-K","e\\u0301":1}',
    '{"language":"en-K","e\\u0301":1,"é":2}',
  ]) {
    const found = await nativeFindings(text);
    assert(found.some((f) => f.messageId === "unnormalized"));
    assert(!found.some((f) => f.messageId === "preservationMismatch"));
  }
  assert(
    (await nativeFindings('{"language":"en-K","other":"\\uFDD0"}')).some(
      (f) => f.messageId === "noncharacter",
    ),
  );
  await assert.rejects(
    normalizeJsonSource('{"language":"en-K"}', contract),
    /preserv/iu,
  );
});

test("JSONL pins use one unique record identity and survive record reordering", async () => {
  const selected = {
    ...contract,
    path: "vectors.jsonl",
    preserveNfcValues: [
      { ...pin, record: { pointer: "/id", value: "intentional" } },
    ],
  };
  for (const text of [
    '{"id":"intentional","language":"en-K"}\n{"id":"ordinary","language":"en-K"}\n',
    '{"id":"ordinary","language":"en-K"}\n{"id":"intentional","language":"en-K"}\n',
  ]) {
    assert.deepEqual(
      (await checkJsonLines(Buffer.from(text), selected)).findings,
      [],
    );
  }
  for (const text of [
    '{"id":"ordinary","language":"en-K"}\n',
    '{"id":"intentional","language":"en-K"}\n{"id":"intentional","language":"en-K"}\n',
  ]) {
    assert(
      (await checkJsonLines(Buffer.from(text), selected)).findings.some(
        (f) => f.messageId === "nfc-record-identity-mismatch",
      ),
    );
  }
  const additional = await checkJsonLines(
    Buffer.from(
      '{"id":"intentional","language":"en-K"}\n{"id":"other","language":"en-K"}\n',
    ),
    selected,
  );
  assert(
    additional.findings.some(
      (f) => f.messageId === "unnormalized" && f.record === 2,
    ),
  );
});

test("policy admission requires exact protected paths, attributable ownership and unique document/record locations", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "json-nfc-policy-"));
  t.after(() => {
    const target = realpathSync(root);
    assert.equal(dirname(target), realpathSync(tmpdir()));
    assert(basename(target).startsWith("json-nfc-policy-"));
    rmSync(target, { recursive: true });
  });
  const rule = {
    paths: ["fixture.json"],
    allowFormatWrites: false,
    owner: "Fixture owner",
    reason: "Retain intentional input spelling",
    preserveNfcValues: [pin],
  };
  const write = (entry) =>
    writeFileSync(
      join(root, ".json-quality.json"),
      JSON.stringify(
        {
          schemaVersion: 1,
          defaults: {
            formatContract: "prettier-json",
            allowFormatWrites: true,
            normalization: "NFC",
          },
          exceptions: [entry],
        },
        null,
        2,
      ) + "\n",
    );
  write(rule);
  await readJsonPolicy(root);
  for (const change of [
    (value) => delete value.owner,
    (value) => delete value.allowFormatWrites,
    (value) => (value.paths = ["**/*.json"]),
    (value) => (value.normalization = "preserve"),
    (value) => value.preserveNfcValues.push({ ...pin, sha256: "a".repeat(64) }),
    (value) =>
      (value.preserveNfcValues[0].record = {
        pointer: "/id",
        value: "fixture",
      }),
    (value) => (value.paths = ["fixture.jsonl"]),
  ]) {
    const changed = structuredClone(rule);
    change(changed);
    write(changed);
    await assert.rejects(readJsonPolicy(root));
  }
});
