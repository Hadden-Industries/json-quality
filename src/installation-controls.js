// SPDX-License-Identifier: AGPL-3.0-only
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
