// SPDX-License-Identifier: AGPL-3.0-only
// Public CLI controls project the same schema-owned admission/runtime vocabulary.
import schema from "../schemas/configuration.schema.json" with { type: "json" };
import { resolveExecutionResources } from "./execution-resources.js";
import { capacityLimitsEnvironment } from "./acquire.js";
import { transformResources } from "./transform-capabilities.js";

const capacityNames = Object.keys(schema.$defs.capacityLimits.properties),
  runtimeNames = Object.keys(schema.$defs.runtimeControls.properties);
export const limitFlag = (/** @type {*} */ name) =>
  name.replace(
    /[A-Z]/gu,
    (/** @type {*} */ letter) => "-" + letter.toLowerCase(),
  );
export const RESOURCE_OPTIONS = Object.freeze({
  "capacity-limits": { type: "boolean" },
  ...Object.fromEntries(
    capacityNames.map((name) => [limitFlag(name), { type: "string" }]),
  ),
});
export const RUNTIME_OPTIONS = Object.freeze({
  "runtime-controls": { type: "boolean" },
  ...Object.fromEntries(
    runtimeNames.map((name) => [limitFlag(name), { type: "string" }]),
  ),
});
function overrides(/** @type {*} */ values, /** @type {*} */ names) {
  const /** @type {Record<string, any>} */ selected = {};
  for (const name of names) {
    const value = values[limitFlag(name)];
    if (value === undefined) continue;
    if (value === "null") {
      selected[name] = null;
      continue;
    }
    if (!/^[1-9][0-9]*$/u.test(value) || !Number.isSafeInteger(Number(value)))
      throw new TypeError("Invalid resource control: " + limitFlag(name));
    selected[name] = Number(value);
  }
  return selected;
}
export function resourceCliLimits(
  /** @type {*} */ values,
  encoded = capacityLimitsEnvironment(),
) {
  const base = encoded === undefined ? undefined : JSON.parse(encoded),
    selected = overrides(values, capacityNames),
    enabled = values["capacity-limits"],
    hasOverrides = Object.keys(selected).length > 0;
  resolveExecutionResources({}, { capacityLimits: base });
  if (
    hasOverrides &&
    (enabled === false || (enabled === undefined && base === false))
  )
    return {
      ...resolveExecutionResources({}, { capacityLimits: false }).admission,
      ...selected,
    };
  if (enabled === false) return false;
  const merged = { ...(typeof base === "object" ? base : {}), ...selected };
  if (enabled === true) return Object.keys(merged).length ? merged : true;
  return hasOverrides ? merged : base;
}
export function resourceCliControls(
  /** @type {*} */ values,
  encoded = process.env.JSON_QUALITY_RUNTIME_CONTROLS,
) {
  const capacityLimits = resourceCliLimits(values),
    base = encoded === undefined ? undefined : JSON.parse(encoded);
  resolveExecutionResources({}, { runtimeControls: base });
  const selected = overrides(values, runtimeNames),
    enabled = values["runtime-controls"],
    runtimeControls =
      enabled === false || (enabled === undefined && base === false)
        ? Object.keys(selected).length
          ? {
              ...resolveExecutionResources({}, { runtimeControls: false })
                .runtime,
              ...selected,
            }
          : false
        : Object.keys(selected).length
          ? { ...(typeof base === "object" ? base : {}), ...selected }
          : enabled === true
            ? typeof base === "object"
              ? base
              : true
            : base;
  resolveExecutionResources({}, { capacityLimits, runtimeControls });
  return { capacityLimits, runtimeControls };
}

export const COMMANDS = Object.freeze({
  check:
    "Check complete repository obligations and deliver final execution evidence.",
  source:
    "Check raw stdin bytes under an explicit source contract; no repository policy.",
  format:
    "Preflight the complete repository and explicitly format writable physical sources.",
  normalize:
    "Preflight complete candidate obligations and NFC-repair explicit physical paths.",
});
export const CLI_OPTIONS = Object.freeze({
  ...RESOURCE_OPTIONS,
  ...RUNTIME_OPTIONS,
  "transform-controls": { type: "string" },
  root: { type: "string" },
  json: { type: "boolean", default: false },
  contract: { type: "string" },
  "request-id": { type: "string" },
  help: { type: "boolean", short: "h", default: false },
});
export function transformCliControls(/** @type {*} */ values) {
  const encoded =
      values["transform-controls"] ??
      process.env.JSON_QUALITY_TRANSFORM_CONTROLS,
    selected = encoded === undefined ? undefined : JSON.parse(encoded);
  transformResources(undefined, selected);
  return selected;
}
export function commandHelp() {
  return [
    "Usage: json-quality <check|source|format|normalize> [options] [-- literal/path.json ...]",
    ...Object.entries(COMMANDS).map(
      ([name, description]) => "  " + name + ": " + description,
    ),
    "Options: --root PATH, --json (versioned NDJSON), --request-id ID, --help",
    "source reads raw stdin; --contract JSON selects its closed source contract.",
    "Only format/normalize accept literal paths. Normalize requires explicit paths.",
    "--no-capacity-limits and --no-runtime-controls disable their selected quotas; integrity and cancellation remain active.",
    "Capacity controls: " +
      capacityNames
        .map((name) => "--" + limitFlag(name) + " N|null")
        .join(", "),
    "Runtime controls: " +
      runtimeNames.map((name) => "--" + limitFlag(name) + " N|null").join(", "),
    "JSON_QUALITY_CAPACITY_LIMITS and JSON_QUALITY_RUNTIME_CONTROLS supply the same typed controls.",
    "--transform-controls JSON or JSON_QUALITY_TRANSFORM_CONTROLS selects writer quotas (false removes them).",
    "Absence of the final applicable terminal or a nonzero process exit means no successful completion.",
    "",
  ].join("\n");
}
