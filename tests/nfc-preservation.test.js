// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { normalizeJsonSource, resolveJsonQualityPolicy } from "../src/index.js";
import { checkFixture } from "./source-fixture.js";

// Independent SHA-256 identity of the decoded UTF-8 Kelvin-sign language tag.
const pin = {
  pointer: "/language",
  sha256: "14971fb7c5dc2552e42577c7dfad95c6f8ea49ef61a06eddeb10b7fcec2f3cdb",
  byteLength: "6",
};
const contract = {
  allowSourceRewrites: false,
  normalization: "NFC",
  formatContract: "producer-json-compact-body",
  owner: "Language fixture owner",
  reason: "Retain the intentional non-ASCII language tag.",
  nfcExemptStringValues: [pin],
};
const nativeFindings = async (text) =>
  (await checkFixture(Buffer.from(text), contract)).findings;

test("indexed pin paths retain root, escaped, array and duplicate-key semantics", async () => {
  const value = "e\u0301";
  const sha256 = createHash("sha256").update(value).digest("hex");
  for (const [document, pointer] of [
    [value, ""],
    [{ "a/b~c": [{ é: value }] }, "/a~1b~0c/0/é"],
  ]) {
    const result = await checkFixture(Buffer.from(JSON.stringify(document)), {
      ...contract,
      nfcExemptStringValues: [{ pointer, sha256, byteLength: "3" }],
    });
    assert.equal(result.terminal.contractSatisfied, true);
  }
  const badIndex = await checkFixture(Buffer.from(JSON.stringify([value])), {
    ...contract,
    nfcExemptStringValues: [{ pointer: "/00", sha256, byteLength: "3" }],
  });
  assert.ok(
    badIndex.findings.some((f) => f.messageId === "preservationMismatch"),
  );
  const repeated = await checkFixture(
    Buffer.from('{"x":"e\\u0301","x":"other"}'),
    {
      ...contract,
      nfcExemptStringValues: [{ pointer: "/x", sha256, byteLength: "3" }],
    },
  );
  assert.ok(repeated.findings.some((f) => f.messageId === "duplicateKey"));
  assert.equal(
    repeated.findings.filter((f) => f.messageId === "preservationMismatch")
      .length,
    1,
  );
});

test("wide pin inventories match exact values without waiving unpinned siblings", async () => {
  const value = "e\u0301";
  const sha256 = createHash("sha256").update(value).digest("hex");
  const values = Array.from({ length: 256 }, () => value);
  const selected = {
    ...contract,
    nfcExemptStringValues: values.map((_, i) => ({
      pointer: `/${i}`,
      sha256,
      byteLength: "3",
    })),
  };
  const checked = await checkFixture(
    Buffer.from(JSON.stringify(values)),
    selected,
  );
  assert.equal(checked.terminal.contractSatisfied, true);
  const extra = await checkFixture(
    Buffer.from(JSON.stringify([...values, value])),
    selected,
  );
  assert.equal(
    extra.findings.filter((f) => f.messageId === "unnormalized").length,
    1,
  );
});

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
    normalizeJsonSource('{"language":"en-K"}', {
      contract: {
        normalization: contract.normalization,
        allowSourceRewrites: false,
        nfcExemptStringValues: contract.nfcExemptStringValues,
        owner: contract.owner,
        reason: contract.reason,
      },
    }),
    /preserv/iu,
  );
});

test("JSONL pins use one unique record identity and survive record reordering", async () => {
  const selected = {
    ...contract,
    path: "vectors.jsonl",
    format: "jsonl",
    nfcExemptStringValues: [
      { ...pin, record: { pointer: "/id", value: "intentional" } },
    ],
  };
  for (const text of [
    '{"id":"intentional","language":"en-K"}\n{"id":"ordinary","language":"en-K"}\n',
    '{"id":"ordinary","language":"en-K"}\n{"id":"intentional","language":"en-K"}\n',
  ]) {
    assert.deepEqual(
      (await checkFixture(Buffer.from(text), selected)).findings,
      [],
    );
  }
  for (const text of [
    '{"id":"ordinary","language":"en-K"}\n',
    '{"id":"intentional","language":"en-K"}\n{"id":"intentional","language":"en-K"}\n',
  ]) {
    assert(
      (await checkFixture(Buffer.from(text), selected)).findings.some(
        (f) => f.messageId === "nfc-record-identity-mismatch",
      ),
    );
  }
  const additional = await checkFixture(
    Buffer.from(
      '{"id":"intentional","language":"en-K"}\n{"id":"other","language":"en-K"}\n',
    ),
    selected,
  );
  assert(
    additional.findings.some(
      (f) => f.messageId === "unnormalized" && f.record === "2",
    ),
  );
});

test("policy admission requires exact protected paths, attributable ownership and unique document/record locations", () => {
  const rule = {
    paths: ["fixture.json"],
    allowSourceRewrites: false,
    owner: "Fixture owner",
    reason: "Retain intentional input spelling",
    nfcExemptStringValues: [pin],
  };
  const policyFor = (entry) => ({
    schemaVersion: 4,
    defaults: {
      formatContract: "prettier-json",
      allowSourceRewrites: true,
      normalization: "NFC",
    },
    exceptions: [entry],
  });
  resolveJsonQualityPolicy(policyFor(rule));
  for (const change of [
    (value) => delete value.owner,
    (value) => delete value.allowSourceRewrites,
    (value) => (value.paths = ["**/*.json"]),
    (value) => (value.normalization = "preserve"),
    (value) =>
      value.nfcExemptStringValues.push({ ...pin, sha256: "a".repeat(64) }),
    (value) =>
      (value.nfcExemptStringValues[0].record = {
        pointer: "/id",
        value: "fixture",
      }),
    (value) => (value.paths = ["fixture.jsonl"]),
  ]) {
    const changed = structuredClone(rule);
    change(changed);
    assert.throws(() => resolveJsonQualityPolicy(policyFor(changed)));
  }
});
