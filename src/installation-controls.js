// SPDX-License-Identifier: AGPL-3.0-only
import { execFileSync } from "node:child_process";
import {
  resourceDefaults,
  resolveResourceProfile,
} from "./resource-profile.js";

/** Quotas for the core and selected platform payload family. */
export function installationResources(/** @type {*} */ selected) {
  return resolveResourceProfile(
    resourceDefaults("installationControls"),
    undefined,
    selected,
  );
}

/** Query the selected npm CLI's cache under installation-specific controls. */
export function nativeQualityCachePath(
  /** @type {*} */ toolingRoot,
  /** @type {*} */ npmCliPath,
  /** @type {*} */ selected = undefined,
) {
  const controls = installationResources(selected);
  return execFileSync(
    process.execPath,
    [npmCliPath, "config", "get", "cache"],
    {
      cwd: toolingRoot,
      encoding: "utf8",
      windowsHide: true,
      timeout: controls.maxCacheLookupTimeMs ?? 0,
      maxBuffer: controls.maxCacheOutputBytes ?? Infinity,
    },
  ).trim();
}
