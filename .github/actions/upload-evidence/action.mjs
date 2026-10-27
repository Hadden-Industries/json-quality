// SPDX-License-Identifier: AGPL-3.0-only
// Like OwlAPI's retain-artifact action, enter through the runner's JS handler so
// the maintained SDK receives artifact runtime credentials without shell exports.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { budgets, native } from "../../../scripts/qualification-process.js";

assert.ok(
  process.env.ACTIONS_RUNTIME_TOKEN && process.env.ACTIONS_RESULTS_URL,
  "Artifact uploads require the native JavaScript action runtime",
);
const mode = process.env.INPUT_MODE || "bundle";
assert.ok(["bundle", "upload"].includes(mode));
native(
  process.env.JSON_QUALITY_PRODUCER_NODE ?? process.execPath,
  [
    fileURLToPath(
      new URL("../../../scripts/upload-evidence.js", import.meta.url),
    ),
    mode,
    process.env.INPUT_PATH,
    process.env["INPUT_RETENTION-DAYS"],
    ...(mode === "bundle" ? [process.env.INPUT_NAME] : []),
  ],
  { phase: "artifact-action", timeout: budgets.uploadStep, stdio: "inherit" },
);
