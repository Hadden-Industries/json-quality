// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { sourceContract } from "../../src/source-contract.js";
import { admitJsonPolicy } from "../../src/configuration.js";

const expectation = (byteLength) => ({
  expected: { byteLength, sha256: "0".repeat(64), diagnostics: [] },
});

test("cohort 3 controls accept exact decimal boundaries and reject lossy or old wire forms", () => {
  assert.equal(
    sourceContract({ formatContract: "prettier-json", normalization: "NFC" })
      .normalization,
    "NFC",
  );
  assert.equal(
    sourceContract(expectation("18446744073709551615")).expected.byteLength,
    "18446744073709551615",
  );
  for (const value of [
    1,
    "01",
    "+1",
    "-1",
    "1.0",
    "18446744073709551616",
    "1".repeat(21),
  ])
    assert.throws(
      () => sourceContract(expectation(value)),
      /Invalid JSON source contract/,
    );
  assert.throws(
    () => sourceContract({ contentBase64: "MA==" }),
    /Invalid JSON source contract/,
  );
  assert.throws(
    () => sourceContract({ checkPresentation: false }),
    /Invalid JSON source contract/,
  );
  assert.throws(
    () =>
      admitJsonPolicy({
        schemaVersion: 1,
        defaults: {
          formatContract: "prettier-json",
          allowFormatWrites: true,
          normalization: "NFC",
        },
        exceptions: [],
      }),
    /Invalid/,
  );
});

test("bounded control snapshot rejects getters before evaluating them", () => {
  let reads = 0;
  assert.throws(() =>
    sourceContract({
      get format() {
        reads++;
        return "json";
      },
    }),
  );
  assert.equal(reads, 0);
  const input = { format: "json" },
    snapshot = sourceContract(input);
  input.format = "obsolete";
  assert.equal(snapshot.format, "json");
});

test("NFC preservation keeps complete typed owner and value pin admission", () => {
  const valid = {
    allowFormatWrites: false,
    owner: "fixture owner",
    reason: "Exact protocol value.",
    preserveNfcValues: [
      { pointer: "/value", sha256: "0".repeat(64), byteLength: "3" },
    ],
  };
  assert.equal(sourceContract(valid).preserveNfcValues[0].byteLength, "3");
  assert.throws(
    () => sourceContract({ ...valid, normalization: "preserve" }),
    /Invalid protected/,
  );
  assert.throws(
    () => sourceContract({ ...valid, owner: " " }),
    /Invalid JSON source contract/,
  );
  assert.throws(
    () =>
      sourceContract({
        ...valid,
        preserveNfcValues: [{ ...valid.preserveNfcValues[0], byteLength: 3 }],
      }),
    /Invalid JSON source contract/,
  );
});
