// SPDX-License-Identifier: AGPL-3.0-only
// Resolve public numeric controls once; native wire integers are canonical text.
import {
  resolveResourceProfile,
  resourceDefaults,
} from "./resource-profile.js";

// Capture private schema-derived views before any external schema customization.
const admissionDefaults = resourceDefaults("capacityLimits"),
  runtimeDefaults = resourceDefaults("runtimeControls");

/** Resolve independently selected quotas without adding hidden finite ceilings.
 * An invocation object overrides only its named controls; true selects the
 * configured/default profile and false removes every quota in that group.
 * Internal wire metadata uses decimal strings/null and never JavaScript Infinity.
 */
export function resolveExecutionResources(
  /** @type {*} */ policy = {},
  /** @type {*} */ invocation = {},
) {
  if (
    !invocation ||
    typeof invocation !== "object" ||
    Array.isArray(invocation) ||
    Object.keys(invocation).some(
      (key) => !["capacityLimits", "runtimeControls"].includes(key),
    )
  )
    throw new TypeError("Invalid execution resource options.");
  const admission = resolveResourceProfile(
      admissionDefaults,
      policy.capacityLimits,
      invocation.capacityLimits,
    ),
    runtime = resolveResourceProfile(
      runtimeDefaults,
      policy.runtimeControls,
      invocation.runtimeControls,
    ),
    wire = (/** @type {*} */ values) =>
      Object.fromEntries(
        Object.entries(values).map(([name, value]) => [
          name,
          value === null ? null : String(value),
        ]),
      );
  const encoded = Object.freeze({
    admission: Object.freeze(wire(admission)),
    runtime: Object.freeze(wire(runtime)),
  });
  return {
    admission,
    runtime,
    wire: encoded,
    native: { ...encoded.admission, ...encoded.runtime },
  };
}
