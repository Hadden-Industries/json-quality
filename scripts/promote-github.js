// SPDX-License-Identifier: AGPL-3.0-only
import { gh } from "./release-provider.js";
import { repository } from "./release-contract.js";
import { runPromotionService } from "./promotion-entry.js";
import { applyGithubAvailability } from "./promotion-service.js";

runPromotionService("github", applyGithubAvailability, () => ({
  writeGithubLatest: (target) =>
    gh([
      "release",
      "edit",
      `v${target}`,
      "--repo",
      repository,
      "--latest=true",
    ]),
}));
