// SPDX-License-Identifier: AGPL-3.0-only
// Independent UO 015a356e1fac8bcea3fcfb213954a191ab6f6851 acceptance vectors,
// migrated to the cohort-2 shared source reader and explicit producer writers.
import test from "node:test";
import assert from "node:assert/strict";
import { checkFixture } from "./source-fixture.js";
import { jsonTokenMeaning } from "./json-token-meaning.js";
import {
  normalizeJsonSource,
  formatJsonSource,
  jsonContract,
} from "../src/index.js";
import {
  JSON_SUFFIX,
  isStrictJsonPath,
  STRICT_JSON_GLOBS,
} from "../src/json-paths.js";
import policy from "../.json-quality.json" with { type: "json" };

async function qualityMessages(text, path = "new/data.json", overrides = {}) {
  const selected = jsonContract(path, policy, { tracked: true });
  return (
    await checkFixture(Buffer.from(text), {
      path,
      ...(selected.allowEmptyKeys
        ? { allowEmptyKeys: selected.allowEmptyKeys }
        : {}),
      ...overrides,
    })
  ).findings.filter((finding) => finding.phase !== "presentation");
}

test("BOM and fatal UTF-8 admission applies before any presentation envelope", async () => {
  for (const bytes of [
    [0xef, 0xbb, 0xbf],
    [0xef, 0xbb, 0xbf, 123, 125, 10],
    [0xef, 0xbb, 0xbf, 0xef, 0xbb, 0xbf, 123, 125],
    [0xff],
    [0xc0, 0xaf],
    [0xe2, 0x82],
  ]) {
    for (const formatContract of [
      "prettier-json",
      "producer-json-body",
      "producer-json-indent",
      "producer-json-indent-body",
      "producer-json-compact",
    ]) {
      const result = await checkFixture(Buffer.from(bytes), { formatContract });
      assert.equal(result.terminal.contractSatisfied, false);
      assert.ok(result.findings.some((finding) => finding.phase === "bytes"));
    }
  }
});
test("input views exclude surrounding bytes and interior U+FEFF survives check and writers", async () => {
  const bytes = Uint8Array.from([0xef, 0xbb, 0xbf, 123, 125, 10]);
  assert.equal(
    (await checkFixture(bytes.subarray(3))).terminal.contractSatisfied,
    true,
  );
  const text = '{\n  "a\uFEFFb": "\uFEFF"\n}\n';
  assert.deepEqual(await qualityMessages(text), []);
  assert.equal(await normalizeJsonSource(text), text);
  assert.equal(await formatJsonSource(text), text);
  await assert.rejects(normalizeJsonSource("\uFEFF{}\n"));
});
test("JSON discovery, strict dialects and tracked boundaries retain their separate meanings", () => {
  for (const [path, discovered, strict] of [
    ["new/data.json", true, true],
    ["dist/ontology.jsonld", true, true],
    ["reports/result.sarif", true, true],
    [".json", true, true],
    ["new/data.jsonc", true, false],
    ["new/data.json5", true, false],
    ["new/data.jsonl", true, false],
    ["new/data.ndjson", true, false],
    ["new/data.JSON", true, false],
    ["new/data.json.txt", false, false],
  ]) {
    assert.equal(JSON_SUFFIX.test(path), discovered);
    assert.equal(isStrictJsonPath(path), strict);
  }
  assert.deepEqual(STRICT_JSON_GLOBS, [
    "**/*.json",
    "**/*.jsonld",
    "**/*.sarif",
  ]);
});
test("strict grammar rejects comments, trailing commas, alternate quotes and missing EOF", async () => {
  for (const text of [
    '{/* comment */"x":1}',
    '{"x":1,}',
    "{'x':1}",
    "{x:1}",
    "{} false",
    "NaN",
    "01",
  ])
    assert.ok(
      (await qualityMessages(text)).some(
        (finding) => finding.phase === "syntax",
      ),
      text,
    );
});
test("decoded and nested duplicates fail without changing caller input", async () => {
  for (const text of [
    '{"name":"first","name":"second"}',
    '{"a":1,"\\u0061":2}',
    '{"nested":{"x":0,"x":1}}',
  ]) {
    const bytes = Buffer.from(text),
      before = Buffer.from(bytes),
      result = await checkFixture(bytes);
    assert.ok(
      result.findings.some(
        (finding) => finding.ruleId === "json/no-duplicate-keys",
      ),
    );
    assert.deepEqual(bytes, before);
  }
});
test("unsafe numbers and unpaired escaped surrogates are rejected by shared admission", async () => {
  for (const text of [
    "9007199254740992",
    "-9007199254740992",
    "1e400",
    "1e-400",
    "5e-324",
    '"\\ud800"',
    '"\\udfff"',
  ])
    assert.ok((await qualityMessages(text)).length, text);
});
test("valid scalar, empty and finite boundary values remain accepted", async () => {
  for (const text of [
    "9007199254740991",
    "-9007199254740991",
    "-0",
    "1e+03",
    "0.123456789012345678901",
    "2.2250738585072014e-308",
    '"\\ud83d\\ude00"',
    "null",
    "false",
    '""',
    "[]",
    "{}",
  ])
    assert.deepEqual(await qualityMessages(text), [], text);
});
test("meaningful keys reject decoded empty/edge whitespace", async () => {
  for (const text of [
    '{"":0}',
    '{" ":0}',
    '{"\\t\\n":0}',
    '{"\\u00a0":0}',
    '{" key":0}',
    '{"key ":0}',
    '{"\\u00a0key":0}',
    '[{"nested":{"key\\t":0}}]',
  ])
    assert.ok(
      (await qualityMessages(text)).some((finding) =>
        /(?:no-empty-keys|meaningful-keys)$/u.test(finding.ruleId),
      ),
      text,
    );
});
test("lockfile empty-key exception is an exact decoded pointer and preserves every other rule", async () => {
  for (const [text, path, valid] of [
    ['{"packages":{"":{}}}', "package-lock.json", true],
    ['{"packages":{"\\u0000":{}}}', "package-lock.json", true],
    ['{"packages":{"":{}}}', "nested/package-lock.json", true],
    ['{"packages":{"":{}}}', "new/data.json", false],
    ['{"packages":{"":{}}}', "new/package.json", false],
    ['{"":0,"packages":{"":{}}}', "package-lock.json", false],
    ['{"packages":{" ":{}}}', "package-lock.json", false],
    ['{"packages":{"":{"":0}}}', "package-lock.json", false],
    ['{"nested":{"packages":{"":{}}}}', "package-lock.json", false],
    ['{"packages":[{"":{}}]}', "package-lock.json", false],
    ['{"packages":{"":"e\\u0301"}}', "package-lock.json", false],
    ['{"packages":{"":0,"":1}}', "package-lock.json", false],
    ['{"packages":{"":{}," bad":0}}', "package-lock.json", false],
  ])
    assert.equal((await qualityMessages(text, path)).length === 0, valid, text);
});
test("pointer exceptions escape keys and retain array indices without weakening other rules", async () => {
  const options = {
    allowEmptyKeys: ["/a~1b/~0/0/"],
    normalization: "preserve",
  };
  assert.deepEqual(
    await qualityMessages(
      '{"a/b":{"~":[{"":"e\\u0301"}]}}',
      "source.json",
      options,
    ),
    [],
  );
  for (const text of [
    '{"a/b":{"~":[{}, {"":0}]}}',
    '{"a/b":{"~":[{" ":0}]}}',
    '{"a/b":{"~":[{"":"\\uffff"}]}}',
  ])
    assert.equal(
      (await qualityMessages(text, "source.json", options)).length,
      1,
    );
});
test("exact integral spellings outside the interoperable range fail", async () => {
  for (const text of [
    "9007199254740992.0",
    "-9007199254740992.000",
    "9007199254740993e0",
    "9.007199254740992e15",
    "90071992547409920e-1",
    "9007199254740992.00000000000000000001e20",
    "1e20",
    "1.7976931348623157e308",
  ])
    assert.ok(
      (await qualityMessages(text)).some(
        (finding) => finding.messageId === "integer",
      ),
      text,
    );
});
test("fractional precision, zero with large exponents and ordinary strings remain accepted", async () => {
  for (const text of [
    "9007199254740991.0",
    "-9.007199254740991e15",
    "90071992547409910e-1",
    "0.1",
    "9007199254740991.1",
    "9007199254740992.1",
    "9007199254740993e-1",
    "0e999999999999999999999999",
    "-0.000e-9999999999999999999999",
    "1.00000000000000000000000000000001",
    "1e+0000000000000000000000000",
    '{"key with interior spaces":"  preserved value  ","empty":""}',
  ])
    assert.deepEqual(await qualityMessages(text), [], text);
});
test("Unicode noncharacters fail directly and escaped, with exact stable scalar labels", async () => {
  for (const point of [
    0xfdd0,
    0xfdef,
    ...Array.from(
      { length: 34 },
      (_, index) => Math.floor(index / 2) * 0x10000 + 0xfffe + (index % 2),
    ),
  ]) {
    const character = String.fromCodePoint(point),
      escaped =
        point <= 0xffff
          ? `\\u${point.toString(16).padStart(4, "0")}`
          : `\\u${character.charCodeAt(0).toString(16)}\\u${character.charCodeAt(1).toString(16)}`;
    for (const text of [
      JSON.stringify(character),
      `"${escaped}"`,
      `{"${escaped}":0}`,
      `[{"nested":"${escaped}"}]`,
    ]) {
      const finding = (await qualityMessages(text)).find(
        (finding) => finding.messageId === "noncharacter",
      );
      assert.ok(finding, text);
      assert.equal(
        finding.arguments.codePoint,
        "U+" + point.toString(16).toUpperCase().padStart(4, "0"),
      );
    }
  }
});
test("valid supplementary characters and Unicode boundaries remain accepted", async () => {
  assert.deepEqual(
    await qualityMessages(
      JSON.stringify([
        "😀",
        "中文",
        "العربية",
        "\ufdcf",
        "\ufdf0",
        "\ufffd",
        String.fromCodePoint(0x10fffd),
      ]),
    ),
    [],
  );
});
test("numeric spellings agree with an independent BigInt boundary oracle", async () => {
  for (const value of [
    9007199254740989n,
    9007199254740991n,
    9007199254740992n,
    9007199254740993n,
    9007199254741000n,
  ])
    for (const signed of [value, -value])
      for (const text of [`${signed}.000`, `${signed}00e-2`, `${signed}e+0`])
        assert.equal(
          (await qualityMessages(text)).some(
            (finding) => finding.messageId === "integer",
          ),
          signed > 9007199254740991n || signed < -9007199254740991n,
        );
});
test("NFC applies to every decoded key/value and explicit repair retains other safety rules", async () => {
  for (const text of [
    '{"e\\u0301":1}',
    '{"key":"e\\u0301"}',
    '["é", {"nested":["e\\u0301"]}]',
    '"e\\u0301"',
  ])
    assert.ok(
      (await qualityMessages(text)).some(
        (finding) => finding.ruleId === "json-quality/normalized-strings",
      ),
    );
  assert.equal(
    await normalizeJsonSource('{"packages":{"":"e\\u0301"}}', {
      contract: { allowEmptyKeys: ["/packages/"] },
    }),
    '{"packages":{"":"é"}}',
  );
  for (const text of [
    '{" bad":"e\\u0301"}',
    '{"":"e\\u0301"}',
    '{"key":"\\uffff"}',
    "9007199254740992e0",
    '{"a":1,"\\u0061":2}',
    '{"n":1e400}',
    '{"x":"\\ud800"}',
    '{"x":1,}',
  ])
    await assert.rejects(normalizeJsonSource(text), /invalid or unsafe/u);
});
test("normalization collision is a visible finding and explicit repair never acquires output", async () => {
  for (const text of [
    '{"é":1,"e\\u0301":2}',
    '{"nested":{"e\\u0301":1,"\\u00e9":2}}',
    '[{"é":1,"e\\u0301":2}]',
  ]) {
    assert.ok(
      (await qualityMessages(text)).some(
        (finding) => finding.messageId === "collision",
      ),
    );
    await assert.rejects(normalizeJsonSource(text), /duplicate keys/u);
  }
  await assert.rejects(
    normalizeJsonSource('"e\\u0301"', {
      contract: { normalization: "preserve" },
    }),
    /cannot be normalized/u,
  );
});
test("explicit normalization preserves non-string tokens, whitespace and order and is idempotent", async () => {
  const source =
      '{"2":2,"1":1,"n":[-0,1e+03,1.0,0.123456789012345678901],"plain":"\\u0061","e\\u0301":"e\\u0301"}\r\n',
    output = await normalizeJsonSource(source);
  assert.equal(
    output,
    '{"2":2,"1":1,"n":[-0,1e+03,1.0,0.123456789012345678901],"plain":"\\u0061","é":"é"}\r\n',
  );
  assert.equal(await normalizeJsonSource(output), output);
});
test("producer presentation preserves order, escapes, negative zero and decimal lexemes", async () => {
  const source =
      '{"2":2,"1":1,"b":[-0,1e+03,1.0,0.123456789012345678901],"a":"\\u0061","e\\u0301":"e\\u0301"}',
    options = {
      contract: {
        normalization: "preserve",
        allowFormatWrites: false,
        owner: "Corpus owner",
        reason: "Retain literal Unicode spelling.",
      },
    },
    output = await formatJsonSource(source, options);
  assert.deepEqual(jsonTokenMeaning(output), jsonTokenMeaning(source));
  assert.equal(
    output,
    '{\n  "2": 2,\n  "1": 1,\n  "b": [\n    -0,\n    1e+03,\n    1.0,\n    0.123456789012345678901\n  ],\n  "a": "\\u0061",\n  "e\\u0301": "e\\u0301"\n}\n',
  );
  assert.equal(await formatJsonSource(output, options), output);
});
