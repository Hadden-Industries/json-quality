// SPDX-License-Identifier: AGPL-3.0-only
// Resolve public numeric controls once; native wire integers are canonical text.
import { Ajv2020 as Ajv } from "ajv/dist/2020.js";
import schema from "../schemas/configuration.schema.json" with { type: "json" };

// Capture private schema-derived views before any external schema customization.
const definitions = structuredClone(schema.$defs),
  ajv = new Ajv({ strict: true }),
  validateAdmission = ajv.compile(definitions.capacityLimits),
  validateRuntime = ajv.compile(definitions.runtimeControls),
  defaults = (/** @type {*} */ definition) =>
    Object.fromEntries(
      Object.entries(definition.properties).map(([name, spec]) => [
        name,
        spec.default,
      ]),
    ),
  admissionDefaults = Object.freeze(defaults(definitions.capacityLimits)),
  runtimeDefaults = Object.freeze(defaults(definitions.runtimeControls));

function validate(/** @type {*} */ settings) {
  if (
    settings.capacityLimits !== undefined &&
    typeof settings.capacityLimits !== "boolean" &&
    !validateAdmission(settings.capacityLimits)
  )
    throw new TypeError("Invalid admission capacity controls.");
  if (
    settings.runtimeControls !== undefined &&
    !validateRuntime(settings.runtimeControls)
  )
    throw new TypeError("Invalid finite runtime controls.");
}

/** Preserve policy/invocation admission precedence, with finite runtime controls
 * resolved independently. Admission bypass removes only input/count ceilings.
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
  validate(policy);
  validate(invocation);
  const disabled =
      invocation.capacityLimits === false ||
      (policy.capacityLimits === false &&
        invocation.capacityLimits === undefined),
    admission = disabled
      ? Object.fromEntries(
          Object.keys(admissionDefaults).map((name) => [name, null]),
        )
      : {
          ...admissionDefaults,
          ...(typeof policy.capacityLimits === "object"
            ? policy.capacityLimits
            : {}),
          ...(typeof invocation.capacityLimits === "object"
            ? invocation.capacityLimits
            : {}),
        },
    runtime = {
      ...runtimeDefaults,
      ...policy.runtimeControls,
      ...invocation.runtimeControls,
    },
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
