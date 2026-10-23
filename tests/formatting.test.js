// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { tokenize } from "@humanwhocodes/momoa";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { temporaryRepository } from "./temporary-repository.js";
import {
  formatJsonSource,
  formatJsonValue,
  jsonFormatOptions,
} from "../src/index.js";
import { checkFixture } from "./source-fixture.js";

test("API formatting and native preservation checking ignore consumer formatter settings", async (t) => {
  const root = temporaryRepository(t, "json-quality-formatter-config-");
  writeFileSync(
    join(root, ".prettierrc.json"),
    '{"parser":"babel","useTabs":true,"tabWidth":8,"endOfLine":"crlf"}',
  );
  writeFileSync(
    join(root, ".editorconfig"),
    "root = true\n[*]\nindent_style = tab\n",
  );
  const output = execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      `const {formatJsonSource} = await import(process.argv[1]); process.stdout.write(await formatJsonSource('{"outer":{"n":1.00e+2}}'));`,
      new URL("../src/index.js", import.meta.url).href,
    ],
    { cwd: root, encoding: "utf8", windowsHide: true },
  );
  assert.equal(output, '{\n  "outer": {\n    "n": 1.00e+2\n  }\n}\n');
  const options = await jsonFormatOptions();
  options.tabWidth = 9;
  assert.equal((await jsonFormatOptions()).tabWidth, 2);
});

test("public printer preserves token spelling, order and unnormalized source values", async () => {
  const source = '{"z":1.00e+2,"x":"e\\u0301","a":[2,1]}';
  await assert.rejects(formatJsonSource(source), /invalid or unsafe/u);
  const preservation = {
    contract: {
      normalization: "preserve",
      allowFormatWrites: false,
      owner: "Fixture owner",
      reason: "Keep the independent decomposed literal.",
    },
  };
  const printed = await formatJsonSource(source, preservation);
  const tokens = (text) =>
    tokenize(text).map((token) =>
      text.slice(token.loc.start.offset, token.loc.end.offset),
    );
  assert.deepEqual(tokens(printed), tokens(source));
  assert.equal(await formatJsonSource(printed, preservation), printed);
  assert.ok(
    (await checkFixture(Buffer.from(printed))).findings.some(
      (f) => f.messageId === "unnormalized",
    ),
  );
});

test("public value printer rejects lossy values without invoking their accessors", async () => {
  let calls = 0;
  const getter = Object.defineProperty({}, "x", {
    enumerable: true,
    get() {
      calls++;
      return 1;
    },
  });
  const custom = {
    toJSON() {
      calls++;
      return {};
    },
  };
  const sparse = Array(2);
  const cyclic = {};
  cyclic.self = cyclic;
  const extended = [1];
  extended.extra = 2;
  const symbolic = { [Symbol("hidden")]: 1 };
  const hidden = Object.defineProperty({}, "x", { value: 1 });
  class CustomArray extends Array {
    toJSON() {
      calls++;
      return { replaced: true };
    }
  }
  for (const value of [
    undefined,
    NaN,
    Infinity,
    1n,
    new Date(),
    getter,
    custom,
    sparse,
    cyclic,
    extended,
    symbolic,
    hidden,
    [undefined],
    new CustomArray(1, 2),
    -0,
    { negativeZero: -0 },
  ])
    await assert.rejects(formatJsonValue(value), TypeError);
  assert.equal(calls, 0);
  assert.equal(
    await formatJsonValue({ z: 1, a: ["é", null] }),
    '{\n  "z": 1,\n  "a": [\n    "é",\n    null\n  ]\n}\n',
  );
});

test("pure formatting retains strict syntax and resource admission", async () => {
  for (const source of [
    '{"x":1,}',
    "//comment\n{}",
    "{} {}",
    "\uFEFF{}",
    "{x:1}",
  ])
    await assert.rejects(formatJsonSource(source));
  await assert.rejects(
    formatJsonSource("{}", { capacityLimits: { maxFileBytes: 1 } }),
  );
  await assert.rejects(formatJsonSource("{}", { parser: "json5" }));
  assert.equal(await formatJsonSource("{}", { capacityLimits: false }), "{}\n");
});
