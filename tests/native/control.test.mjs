// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { encodeNativeControl } from "../../src/native-control.js";

test("control admission bounds escaped UTF-8 bytes before encoding", () => {
  const input = {
      text: "a\n\u0000é😀\ud800",
      absent: undefined,
      values: [null, true, false, -0, 1e100],
    },
    expected = Buffer.from(
      '{"text":"a\\n\\u0000é😀\\ud800","values":[null,true,false,0,1e+100]}',
    );
  assert.deepEqual(encodeNativeControl(input, expected.length), expected);
  assert.throws(
    () => encodeNativeControl(input, expected.length - 1),
    /control-envelope-size/,
  );
  assert.throws(
    () => encodeNativeControl({ text: "x".repeat(8 * 1024 * 1024) }),
    /control-envelope-size/,
  );
});

test("control admission refuses executable accessors and custom serializers", () => {
  const getter = Object.defineProperty({}, "value", {
      enumerable: true,
      get() {
        assert.fail("Control getter executed.");
      },
    }),
    serializer = Object.defineProperty({}, "toJSON", {
      value() {
        assert.fail("Control serializer executed.");
      },
    });
  for (const input of [getter, serializer, new Date(), { value: Infinity }])
    assert.throws(() => encodeNativeControl(input), /native-control-data/);
  const cycle = {};
  cycle.self = cycle;
  assert.throws(() => encodeNativeControl(cycle), /native-control-data/);
});
