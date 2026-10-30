// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { npmCommand } from "./qualification-process.js";
import { runPromotionService } from "./promotion-entry.js";
import { applyNpmAvailability } from "./promotion-service.js";
import { fileURLToPath } from "node:url";

export function runNpmPromotion(directory, scratch, env = process.env) {
  return runPromotionService(
    "npm",
    applyNpmAvailability,
    ({ release, isolation }) => ({
      writeNpmLatest: (target) =>
        npmCommand(
          [
            "dist-tag",
            "add",
            `${release.package}@${target}`,
            "latest",
            "--registry=https://registry.npmjs.org/",
          ],
          { env: isolation, phase: "npm-latest" },
        ),
    }),
    [process.execPath, fileURLToPath(import.meta.url), directory, scratch],
    env,
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 4);
  runNpmPromotion(...process.argv.slice(2));
}
