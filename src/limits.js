// SPDX-License-Identifier: AGPL-3.0-only
import schema from "../schemas/configuration.schema.json" with { type: "json" };
import Ajv from "ajv";

// Schema defaults are annotations; Ajv never inserts or coerces policy data.
export const DEFAULT_LIMITS = Object.freeze(
  Object.fromEntries(
    Object.entries(schema.definitions.capacityLimits.properties).map(
      ([key, value]) => [key, value.default],
    ),
  ),
);

export const LIMIT_NAMES = Object.freeze(Object.keys(DEFAULT_LIMITS));
const validate = new Ajv({ strict: true }).compile(
  schema.definitions.capacityLimits,
);
const unlimited = Object.freeze(
  Object.fromEntries(LIMIT_NAMES.map((name) => [name, Infinity])),
);

/** Explicit capacity overrides and bypass affect resources, never quality rules. */
export function operationLimits(policy, overrides) {
  if (
    overrides !== undefined &&
    typeof overrides !== "boolean" &&
    !validate(overrides)
  )
    throw new TypeError("Invalid JSON resource-limit overrides.");
  if (overrides === false) return { ...unlimited };
  return {
    ...(policy.capacityLimits === false && overrides === undefined
      ? unlimited
      : DEFAULT_LIMITS),
    ...(typeof policy.capacityLimits === "object" ? policy.capacityLimits : {}),
    ...(typeof overrides === "object" ? overrides : {}),
  };
}
