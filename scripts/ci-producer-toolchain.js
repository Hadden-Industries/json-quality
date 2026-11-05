// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { appendFileSync } from "node:fs";
import { producerToolchain } from "./qualification-process.js";

// Export producer Node/npm paths before setup-node selects a consumer runtime.
assert.ok(process.env.GITHUB_ENV && process.env.npm_execpath);
const { executable, cli } = producerToolchain({
  npm_execpath: process.env.npm_execpath,
  JSON_QUALITY_PRODUCER_NODE: process.execPath,
  JSON_QUALITY_PRODUCER_NPM: process.env.npm_execpath,
});
appendFileSync(
  process.env.GITHUB_ENV,
  `JSON_QUALITY_PRODUCER_NODE=${executable}\nJSON_QUALITY_PRODUCER_NPM=${cli}\n`,
);
