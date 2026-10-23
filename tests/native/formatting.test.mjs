// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { formatSource } from "../../src/native-formatting.js";
import { nativeTemporaryRoot, verifiedComponent } from "./client.mjs";

const options = {
  component: verifiedComponent,
  temporaryDirectory: nativeTemporaryRoot,
};
test("retained formatter uses native preflight, Prettier guard and complete same-reader postcheck", async () => {
  const input = ' {"number":1,"text":"é","values":[true,null,false]} ',
    expected =
      '{\n  "number": 1,\n  "text": "é",\n  "values": [\n    true,\n    null,\n    false\n  ]\n}\n';
  assert.equal(
    await formatSource(input, { ...options, capacityLimits: { maxFiles: 1 } }),
    expected,
  );
  assert.equal(await formatSource(expected, options), expected);
});

test("writer refuses unsafe input or insufficient working space without returning transformed data", async () => {
  await assert.rejects(
    formatSource('{"same":0,"same":1}', options),
    /Cannot format/,
  );
  await assert.rejects(formatSource('"é"', options), /Cannot format/);
  await assert.rejects(
    formatSource("0", {
      ...options,
      runtimeControls: { managedMemoryTargetBytes: 16777216 },
    }),
    /control-state-budget/,
  );
  await assert.rejects(
    formatSource('"' + "x".repeat(2097152) + '"'),
    /transform-source-capacity/,
  );
});
