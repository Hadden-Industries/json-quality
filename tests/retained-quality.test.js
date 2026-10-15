// SPDX-License-Identifier: AGPL-3.0-only
// Acceptance vectors retained from UO 015a356e1fac8bcea3fcfb213954a191ab6f6851.
import test from "node:test";
import assert from "node:assert/strict";
import nativeConfig from "./native-json-config.mjs";
const nativeConfigPath = fileURLToPath(
  new URL("./native-json-config.mjs", import.meta.url),
);
/** Exercise native JSON decisions and repository selection without mocking the tools. */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { tokenize } from "@humanwhocodes/momoa";
import * as prettier from "prettier";
import { ESLint } from "eslint";
import {
  jsonLintConfig,
  normalizeJsonSource,
  isStrictJsonPath,
  JSON_SUFFIX,
  STRICT_JSON_GLOBS,
  jsonRules,
} from "../src/quality.js";
import { decodeJsonBytes } from "../src/json-bytes.js";
import {
  checkJsonPresentation,
  jsonFormatOptions,
} from "../src/presentation.js";
const root = fileURLToPath(new URL("../", import.meta.url));
const eslint = fileURLToPath(
  new URL("../node_modules/eslint/bin/eslint.js", import.meta.url),
);
for (const [index, vector] of [
  [0xef, 0xbb, 0xbf],
  [0xef, 0xbb, 0xbf, 123, 125, 10],
  [0xef, 0xbb, 0xbf, 0xef, 0xbb, 0xbf, 123, 125],
]
  .map((bytes) => [bytes])
  .entries()) {
  test(
    "byte admission rejects a leading UTF-8 BOM: %j" + " [" + (index + "]"),
    () =>
      ((bytes) => {
        assert.throws(
          () => decodeJsonBytes(Buffer.from(bytes)),
          /leading UTF-8 BOM/u,
        );
      })(...(Array.isArray(vector) ? vector : [vector])),
  );
}
for (const [index, vector] of [[0xff], [0xc0, 0xaf], [0xe2, 0x82]]
  .map((bytes) => [bytes])
  .entries()) {
  test(
    "byte admission retains fatal UTF-8 validation: %j" + " [" + (index + "]"),
    () =>
      ((bytes) => assert.throws(() => decodeJsonBytes(Buffer.from(bytes))))(
        ...(Array.isArray(vector) ? vector : [vector]),
      ),
  );
}
test("byte admission respects input views and preserves interior U+FEFF", () => {
  const bytes = Uint8Array.from([0xef, 0xbb, 0xbf, 123, 125, 10]);
  assert.equal(decodeJsonBytes(bytes.subarray(3)), "{}\n");
  assert.throws(() => decodeJsonBytes(bytes.buffer), /leading UTF-8 BOM/u);
  const text = '{"a\uFEFFb":"\uFEFF"}\n';
  assert.equal(decodeJsonBytes(Buffer.from(text)), text);
});
for (const [index, vector] of [
  "prettier-json",
  "producer-json-body",
  "producer-json-indent",
  "producer-json-indent-body",
  "producer-json-compact",
].entries()) {
  test(
    "%s cannot hide a BOM through its presentation envelope" +
      " [" +
      (index + "]"),
    async () =>
      (async (contract) => {
        const options = await jsonFormatOptions();
        const body = Buffer.from("{}\n");
        assert.equal(
          await checkJsonPresentation(body, contract, options),
          true,
        );
        await assert.rejects(
          checkJsonPresentation(
            Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), body]),
            contract,
            options,
          ),
          /leading UTF-8 BOM/u,
        );
      })(...(Array.isArray(vector) ? vector : [vector])),
  );
}
test("shared rule options retain meaningful exceptions and reject obsolete inputs", () => {
  assert.deepEqual(jsonRules()["json-quality/normalized-strings"], [
    "error",
    "NFC",
  ]);
  assert.partialDeepStrictEqual(
    jsonRules({
      normalization: "preserve",
      allowEmptyKeys: ["/packages/"],
    }),
    {
      "json-quality/normalized-strings": ["error", "preserve"],
      "json/no-empty-keys": "off",
      "json-quality/meaningful-keys": ["error", ["/packages/"]],
    },
  );
  for (const options of [
    "data",
    null,
    [],
    {
      lintProfile: "data",
    },
  ])
    assert.throws(() => jsonRules(options), /JSON rule options/u);
});
test("interior U+FEFF survives lint, normalization and presentation", async () => {
  const text = '{\n  "a\uFEFFb": "\uFEFF"\n}\n';
  assert.deepEqual(await qualityMessages(text), []);
  assert.equal(await normalizeJsonSource(text), text);
  assert.equal(
    await checkJsonPresentation(
      Buffer.from(text),
      "prettier-json",
      await jsonFormatOptions(),
    ),
    true,
  );
  await assert.rejects(
    normalizeJsonSource("\uFEFF{}\n"),
    /invalid JSON source/u,
  );
});
for (const [index, vector] of [
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
].entries()) {
  test(
    "JSON discovery and strict qualification agree for %s" +
      " [" +
      (index + "]"),
    () =>
      ((path, discovered, strict) => {
        assert.equal(JSON_SUFFIX.test(path), discovered);
        assert.equal(isStrictJsonPath(path), strict);
      })(...(Array.isArray(vector) ? vector : [vector])),
  );
}
test("native lint and formatting select the supported strict extensions", () => {
  assert.deepEqual(STRICT_JSON_GLOBS, [
    "**/*.json",
    "**/*.jsonld",
    "**/*.sarif",
  ]);
});
function lint(text, name = "package.json") {
  return spawnSync(
    process.execPath,
    [
      eslint,
      "--no-config-lookup",
      "--config",
      nativeConfigPath,
      "--stdin",
      "--stdin-filename",
      name,
      "--format",
      "json",
    ],
    {
      cwd: root,
      input: text,
      encoding: "utf8",
      windowsHide: true,
    },
  );
}
test("native strict JSON rejects duplicate keys before any formatting", () => {
  const result = lint('{"name":"first","name":"second"}');
  assert.equal(result.status, 1);
  assert.ok(
    JSON.parse(result.stdout)[0]
      .messages.map((message) => message.ruleId)
      .includes("json/no-duplicate-keys"),
  );
});
for (const [index, vector] of [
  '{"a":1,"\\u0061":2}',
  '{"nested":{"x":0,"x":1}}',
].entries()) {
  test("decoded and nested duplicates fail: %s" + " [" + (index + "]"), () =>
    ((text) => {
      const result = lint(text);
      assert.equal(result.status, 1);
      assert.equal(
        JSON.parse(result.stdout)[0].messages.some(
          (message) => message.ruleId === "json/no-duplicate-keys",
        ),
        true,
      );
    })(...(Array.isArray(vector) ? vector : [vector])),
  );
}
for (const [index, vector] of [
  '{/* comment */"x":1}',
  '{"x":1,}',
  "{'x':1}",
  "{x:1}",
  "{} false",
  "NaN",
  "01",
].entries()) {
  test("strict dialect rejects %s" + " [" + (index + "]"), () =>
    ((text) => {
      const result = lint(text);
      assert.equal(result.status, 1);
      assert.ok(JSON.parse(result.stdout)[0].fatalErrorCount > 0);
    })(...(Array.isArray(vector) ? vector : [vector])),
  );
}
for (const [index, vector] of [
  "9007199254740992",
  "-9007199254740992",
  "1e400",
  "1e-400",
  "5e-324",
  '"\\ud800"',
  '"\\udfff"',
].entries()) {
  test("native interoperability rejects %s" + " [" + (index + "]"), () =>
    ((text) => {
      const result = lint(text);
      assert.equal(result.status, 1);
      assert.equal(
        JSON.parse(result.stdout)[0].messages.some(
          (message) => message.ruleId === "json/no-unsafe-values",
        ),
        true,
      );
    })(...(Array.isArray(vector) ? vector : [vector])),
  );
}
for (const [index, vector] of [
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
].entries()) {
  test(
    "valid scalar, empty value and qualified number passes: %s" +
      " [" +
      (index + "]"),
    () =>
      ((text) => {
        assert.equal(lint(text).status, 0);
      })(...(Array.isArray(vector) ? vector : [vector])),
  );
} // The real native config is cached across lexical vectors; CLI tests below
// separately prove repository discovery and writer refusal.
const qualityLinter = new ESLint({
  cwd: root,
  overrideConfigFile: true,
  overrideConfig: nativeConfig,
});
async function qualityMessages(text, path = "new/data.json") {
  const [result] = await qualityLinter.lintText(text, {
    filePath: path,
  });
  return result.messages;
}
for (const [index, vector] of [
  '{"":0}',
  '{" ":0}',
  '{"\\t\\n":0}',
  '{"\\u00a0":0}',
  '{" key":0}',
  '{"key ":0}',
  '{"\\u00a0key":0}',
  '[{"nested":{"key\\t":0}}]',
].entries()) {
  test(
    "meaningful keys reject decoded empty/edge whitespace: %s" +
      " [" +
      (index + "]"),
    async () =>
      (async (text) => {
        assert.ok(
          (await qualityMessages(text)).some((finding) =>
            /(?:no-empty-keys|meaningful-keys)$/u.test(finding.ruleId),
          ),
        );
      })(...(Array.isArray(vector) ? vector : [vector])),
  );
}
for (const [index, vector] of [
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
].entries()) {
  test(
    "lockfile exception is pointer-scoped: %s (%s)" + " [" + (index + "]"),
    async () =>
      (async (text, path, valid) => {
        assert.equal((await qualityMessages(text, path)).length === 0, valid);
      })(...(Array.isArray(vector) ? vector : [vector])),
  );
}
test("pointer exceptions escape keys and retain array indices without weakening other rules", async () => {
  const linter = new ESLint({
    overrideConfigFile: true,
    overrideConfig: jsonLintConfig([
      {
        path: "source.json",
        allowEmptyKeys: ["/a~1b/~0/0/"],
        normalization: "preserve",
      },
    ]),
  });
  const check = async (text) =>
    (
      await linter.lintText(text, {
        filePath: "source.json",
      })
    )[0];
  assert.equal((await check('{"a/b":{"~":[{"":"e\\u0301"}]}}')).errorCount, 0);
  assert.equal((await check('{"a/b":{"~":[{}, {"":0}]}}')).errorCount, 1);
  assert.equal((await check('{"a/b":{"~":[{" ":0}]}}')).errorCount, 1);
  assert.equal((await check('{"a/b":{"~":[{"":"\\uffff"}]}}')).errorCount, 1);
});
for (const [index, vector] of [
  "9007199254740992.0",
  "-9007199254740992.000",
  "9007199254740993e0",
  "9.007199254740992e15",
  "90071992547409920e-1",
  "9007199254740992.00000000000000000001e20",
  "1e20",
  "1.7976931348623157e308",
].entries()) {
  test(
    "exact integral values outside the safe range fail: %s" +
      " [" +
      (index + "]"),
    async () =>
      (async (text) => {
        assert.ok(
          (await qualityMessages(text)).some(
            (finding) =>
              finding.ruleId === "json-quality/interoperability" &&
              finding.messageId === "integer",
          ),
        );
      })(...(Array.isArray(vector) ? vector : [vector])),
  );
}
for (const [index, vector] of [
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
].entries()) {
  test(
    "valid spellings and ordinary fractional precision remain accepted: %s" +
      " [" +
      (index + "]"),
    async () =>
      (async (text) => {
        assert.deepEqual(await qualityMessages(text), []);
      })(...(Array.isArray(vector) ? vector : [vector])),
  );
}
for (const [index, vector] of [
  0xfdd0,
  0xfdef,
  ...Array.from(
    {
      length: 34,
    },
    (_, index) => Math.floor(index / 2) * 0x10000 + 0xfffe + (index % 2),
  ),
].entries()) {
  test(
    "Unicode noncharacter U+%s fails directly and after escape decoding" +
      " [" +
      (index + "]"),
    async () =>
      (async (point) => {
        const character = String.fromCodePoint(point);
        const escaped =
          [...character].length === 1 && point <= 0xffff
            ? `\\u${point.toString(16).padStart(4, "0")}`
            : `\\u${character.charCodeAt(0).toString(16)}\\u${character.charCodeAt(1).toString(16)}`;
        for (const text of [
          JSON.stringify(character),
          `"${escaped}"`,
          `{"${escaped}":0}`,
          `[{"nested":"${escaped}"}]`,
        ])
          assert.ok(
            (await qualityMessages(text)).some(
              (finding) =>
                finding.ruleId === "json-quality/interoperability" &&
                finding.messageId === "noncharacter",
            ),
          );
      })(...(Array.isArray(vector) ? vector : [vector])),
  );
}
test("valid supplementary characters and boundaries remain accepted", async () => {
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
      for (const text of [`${signed}.000`, `${signed}00e-2`, `${signed}e+0`]) {
        const messages = await qualityMessages(text);
        assert.equal(
          messages.some(({ messageId }) => messageId === "integer"),
          signed > 9007199254740991n || signed < -9007199254740991n,
        );
      }
});
test("opinionated rules expose no automatic native fix", async () => {
  const text = '{" bad":9007199254740992e0,"":"\\uffff"}';
  const linter = new ESLint({
    cwd: root,
    overrideConfigFile: true,
    overrideConfig: nativeConfig,
    fix: true,
  });
  const [result] = await linter.lintText(text, {
    filePath: "new/data.json",
  });
  assert.equal(result.output, undefined);
  assert.equal(result.errorCount, 4);
});
test("source/producer NFC preflight retains the complete quality contract", async () => {
  await assert.equal(
    await normalizeJsonSource('{"packages":{"":"e\\u0301"}}', {
      allowEmptyKeys: ["/packages/"],
    }),
    '{"packages":{"":"é"}}',
  );
  for (const text of [
    '{" bad":"e\\u0301"}',
    '{"":"e\\u0301"}',
    '{"key":"\\uffff"}',
    "9007199254740992e0",
  ])
    await assert.rejects(normalizeJsonSource(text), /invalid or unsafe/u);
});
for (const [index, vector] of [
  ['{"e\\u0301":1}', "package.json"],
  ['{"e\\u0301":1}', "new/data.json"],
  ['{"key":"e\\u0301"}', "new/data.json"],
  ['["é", {"nested":["e\\u0301"]}]', "new/data.json"],
  ['"e\\u0301"', "new/data.json"],
  ['{"key":"e\\u0301"}', "new/data.jsonld"],
].entries()) {
  test(
    "NFC applies to every decoded key and value: %s (%s)" +
      " [" +
      (index + "]"),
    () =>
      ((text, path) => {
        const result = lint(text, path);
        assert.equal(result.status, 1);
        assert.equal(
          JSON.parse(result.stdout)[0].messages.some(
            (message) => message.ruleId === "json-quality/normalized-strings",
          ),
          true,
        );
      })(...(Array.isArray(vector) ? vector : [vector])),
  );
}
test("native ESLint fix cannot mutate non-NFC JSON or collide its keys", () => {
  const text = '{"e\\u0301":1,"é":2}';
  const result = spawnSync(
    process.execPath,
    [
      eslint,
      "--no-config-lookup",
      "--config",
      nativeConfigPath,
      "--stdin",
      "--stdin-filename",
      "new.json",
      "--fix-dry-run",
      "--format",
      "json",
    ],
    {
      cwd: root,
      input: text,
      encoding: "utf8",
      windowsHide: true,
    },
  );
  const [report] = JSON.parse(result.stdout);
  assert.equal(result.status, 1);
  assert.equal(report.output, undefined);
  assert.equal(
    report.messages.some((message) => message.messageId === "collision"),
    true,
  );
});
test("source/producer normalization preserves all non-string tokens and is idempotent", async () => {
  const source =
    '{"2":2,"1":1,"n":[-0,1e+03,1.0,0.123456789012345678901],"plain":"\\u0061","e\\u0301":"e\\u0301"}\r\n';
  const output = await normalizeJsonSource(source);
  assert.equal(
    output,
    '{"2":2,"1":1,"n":[-0,1e+03,1.0,0.123456789012345678901],"plain":"\\u0061","é":"é"}\r\n',
  );
  assert.equal(await normalizeJsonSource(output), output);
});
for (const [index, vector] of [
  '{"é":1,"e\\u0301":2}',
  '{"nested":{"e\\u0301":1,"\\u00e9":2}}',
  '[{"é":1,"e\\u0301":2}]',
].entries()) {
  test(
    "producer normalization refuses NFC key collisions: %s" +
      " [" +
      (index + "]"),
    async () =>
      (async (text) => {
        await assert.rejects(normalizeJsonSource(text), /duplicate keys/);
      })(...(Array.isArray(vector) ? vector : [vector])),
  );
}
for (const [index, vector] of [
  '{"a":1,"\\u0061":2}',
  '{"n":1e400}',
  '{"x":"\\ud800"}',
  '{"x":1,}',
].entries()) {
  test(
    "producer normalization refuses invalid or unsafe input: %s" +
      " [" +
      (index + "]"),
    async () =>
      (async (text) => {
        await assert.rejects(normalizeJsonSource(text), /invalid or unsafe/);
      })(...(Array.isArray(vector) ? vector : [vector])),
  );
}
test("preserved producer identity cannot be normalized", async () => {
  await assert.rejects(
    normalizeJsonSource('"e\\u0301"', {
      normalization: "preserve",
    }),
    /Preserved/,
  );
});

/** Tokens preserve member/array order, decoded string values and exact numeric lexemes. */
function meaning(text) {
  return tokenize(text).map((token) => {
    const raw = text.slice(token.loc.start.offset, token.loc.end.offset);
    return [token.type, token.type === "String" ? JSON.parse(raw) : raw];
  });
}
test("native stringify presentation preserves order, escapes, negative zero and decimal lexemes", async () => {
  const text =
    '{"2":2,"1":1,"b":[-0,1e+03,1.0,0.123456789012345678901],"a":"\\u0061","e\\u0301":"e\\u0301"}';
  const options = await jsonFormatOptions();
  const output = await prettier.format(text, options);
  assert.deepEqual(meaning(output), meaning(text));
  assert.equal(
    output,
    '{\n  "2": 2,\n  "1": 1,\n  "b": [\n    -0,\n    1e+03,\n    1.0,\n    0.123456789012345678901\n  ],\n  "a": "\\u0061",\n  "e\\u0301": "e\\u0301"\n}\n',
  );
  assert.equal(await prettier.format(output, options), output);
});
