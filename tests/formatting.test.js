// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { tokenize } from "@humanwhocodes/momoa";
import {
  formatJsonSource,
  formatJsonValue,
  checkJsonDocument,
} from "../src/index.js";

test("public printer preserves token spelling, order and unnormalized source values", async () => {
  const source = '{"z":1.00e+2,"x":"e\\u0301","a":[2,1]}';
  const printed = await formatJsonSource(source);
  const tokens = (text) =>
    tokenize(text).map((token) =>
      text.slice(token.loc.start.offset, token.loc.end.offset),
    );
  assert.deepEqual(tokens(printed), tokens(source));
  assert.equal(await formatJsonSource(printed), printed);
  assert.ok(
    (await checkJsonDocument(Buffer.from(printed))).findings.some(
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
    await formatJsonValue({ z: 1, a: ["e\u0301", null] }),
    '{\n  "z": 1,\n  "a": [\n    "é",\n    null\n  ]\n}\n',
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
  await assert.rejects(formatJsonSource("{}", { limits: { maxFileBytes: 1 } }));
  await assert.rejects(formatJsonSource("{}", { parser: "json5" }));
  assert.equal(await formatJsonSource("{}", { limits: false }), "{}\n");
});
