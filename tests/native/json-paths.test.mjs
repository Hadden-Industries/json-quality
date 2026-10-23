// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import {
  nativeJsonSourceFormat,
  jsonSourceFormat,
} from "../../src/json-paths.js";

test("native archive source maps use strict JSON without admitting unsupported dialects or ordinary map files", () => {
  const archive = { kind: "native", origin: { kind: "archive-member" } };
  assert.equal(
    nativeJsonSourceFormat("a.tgz!/package/index.d.ts.map", archive),
    "json",
  );
  for (const path of [
    "a.tgz!/package/a.json5",
    "a.tgz!/package/a.jsonc",
    "a.tgz!/package/a.map.json5",
  ])
    assert.throws(() => nativeJsonSourceFormat(path, archive), /Unsupported/);
  assert.throws(
    () => nativeJsonSourceFormat("index.map", { kind: "physical" }),
    /Unsupported/,
  );
  assert.throws(() => jsonSourceFormat("index.map"), /Unsupported/);
});
