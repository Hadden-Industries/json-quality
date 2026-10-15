// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { appendFileSync } from "node:fs";

// Retain reference executables before setup-node selects a consumer runtime.
assert.ok(process.env.GITHUB_ENV && process.env.npm_execpath);
appendFileSync(
  process.env.GITHUB_ENV,
  `JSON_QUALITY_PRODUCER_NODE=${process.execPath}\nJSON_QUALITY_PRODUCER_NPM=${process.env.npm_execpath}\n`,
);
