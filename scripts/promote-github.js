// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { gh } from "./release-provider.js";
import { repository } from "./release-contract.js";
import { runPromotionService } from "./promotion-entry.js";
import { applyGithubAvailability } from "./promotion-service.js";
import { fileURLToPath } from "node:url";

export function runGithubPromotion(directory, scratch, env = process.env) {
  return runPromotionService(
    "github",
    applyGithubAvailability,
    () => ({
      writeGithubLatest: (target) =>
        gh([
          "release",
          "edit",
          `v${target}`,
          "--repo",
          repository,
          "--latest=true",
        ]),
    }),
    [process.execPath, fileURLToPath(import.meta.url), directory, scratch],
    env,
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 4);
  runGithubPromotion(...process.argv.slice(2));
}
