// SPDX-License-Identifier: AGPL-3.0-only
// Context remains data across the process boundary; no generated JavaScript.
import { runJsonQualityCli } from "../src/index.js";
process.exitCode = await runJsonQualityCli(
  JSON.parse(process.argv[2]),
  async () => {
    console.error("CONTEXT_LOADED");
    return JSON.parse(process.argv[3]);
  },
);
