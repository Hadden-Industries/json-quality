// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { runJsonQuality, checkJsonDocument } from "../src/index.js";
import resultSchema from "../schemas/result.schema.json" with { type: "json" };
import configurationSchema from "../schemas/configuration.schema.json" with { type: "json" };

// Run in a fresh process: public schema customization must not leak into another
// test or change the package's already-initialized runtime admission contract.
if (process.argv[2] === "writes") {
  resultSchema.properties.writes.required.pop();
  const result = await runJsonQuality("check", { root: process.argv[3] });
  assert.equal(result.status, "passed");
  assert.equal(result.schemaVersion, 4);
  assert.deepEqual(result.writes, {
    changed: [],
    unchanged: [],
    failed: [],
    unprocessed: [],
  });
} else {
  configurationSchema.properties.exceptions.items.properties.allowEmptyKeys.uniqueItems = false;
  await assert.rejects(
    checkJsonDocument(Buffer.from("{}\n"), {
      allowEmptyKeys: ["/packages/", "/packages/"],
    }),
    /duplicate|unique/u,
  );
}
