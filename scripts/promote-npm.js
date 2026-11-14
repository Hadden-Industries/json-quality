// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { npmCommand } from "./qualification-process.js";
import { runPromotionService } from "./promotion-entry.js";
import { applyNpmAvailability } from "./promotion-service.js";
import { fileURLToPath } from "node:url";
import { npmLabelArguments, npmFamilyLabel } from "./npm-availability.js";

export function runNpmPromotion(directory, scratch, env = process.env) {
  return runPromotionService(
    "npm",
    applyNpmAvailability,
    ({ release, family, isolation }) => ({
      writeNpmLatest: (target) =>
        npmCommand(npmLabelArguments(release.package, target), {
          env: isolation,
          phase: "npm-latest",
        }),
      writePackageLabel: (packageName, target) =>
        npmCommand(
          npmLabelArguments(packageName, target, npmFamilyLabel(family)),
          {
            env: { ...isolation, NPM_CONFIG_FETCH_RETRIES: "0" },
            phase: "npm-family-label",
          },
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
