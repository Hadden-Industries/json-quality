// SPDX-License-Identifier: AGPL-3.0-only
import { npmCommand } from "./qualification-process.js";
import { runPromotionService } from "./promotion-entry.js";
import { applyNpmAvailability } from "./promotion-service.js";

runPromotionService("npm", applyNpmAvailability, ({ release, isolation }) => ({
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
}));
