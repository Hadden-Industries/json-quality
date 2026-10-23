// SPDX-License-Identifier: AGPL-3.0-only
// Public CLI controls project the same schema-owned admission/runtime vocabulary.
import schema from "../schemas/configuration.schema.json" with { type: "json" };
import { resolveExecutionResources } from "./execution-resources.js";
import { capacityLimitsEnvironment } from "./acquire.js";

const capacityNames = Object.keys(schema.definitions.capacityLimits.properties),
  runtimeNames = Object.keys(schema.definitions.runtimeControls.properties);
export const limitFlag = (name) =>
  name.replace(/[A-Z]/gu, (letter) => "-" + letter.toLowerCase());
export const RESOURCE_OPTIONS = Object.freeze({
  "capacity-limits": { type: "boolean" },
  ...Object.fromEntries(
    capacityNames.map((name) => [limitFlag(name), { type: "string" }]),
  ),
});
export const RUNTIME_OPTIONS = Object.freeze(
  Object.fromEntries(
    runtimeNames.map((name) => [limitFlag(name), { type: "string" }]),
  ),
);
function overrides(values, names) {
  const selected = {};
  for (const name of names) {
    const value = values[limitFlag(name)];
    if (value === undefined) continue;
    if (!/^[1-9][0-9]*$/u.test(value) || !Number.isSafeInteger(Number(value)))
      throw new TypeError("Invalid resource control: " + limitFlag(name));
    selected[name] = Number(value);
  }
  return selected;
}
export function resourceCliLimits(
  values,
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
    throw new TypeError(
      "Choose admission bypass or capacity overrides, not both.",
    );
  if (enabled === false) return false;
  const merged = { ...(typeof base === "object" ? base : {}), ...selected };
  if (enabled === true) return Object.keys(merged).length ? merged : true;
  return hasOverrides ? merged : base;
}
export function resourceCliControls(values) {
  const capacityLimits = resourceCliLimits(values),
    encoded = process.env.JSON_QUALITY_RUNTIME_CONTROLS,
    base = encoded === undefined ? undefined : JSON.parse(encoded);
  resolveExecutionResources({}, { runtimeControls: base });
  const selected = overrides(values, runtimeNames),
    runtimeControls =
      base === undefined && !Object.keys(selected).length
        ? undefined
        : { ...base, ...selected };
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
  root: { type: "string" },
  json: { type: "boolean", default: false },
  contract: { type: "string" },
  "request-id": { type: "string" },
  help: { type: "boolean", short: "h", default: false },
});
export function commandHelp() {
  return [
    "Usage: json-quality <check|source|format|normalize> [options] [-- literal/path.json ...]",
    ...Object.entries(COMMANDS).map(
      ([name, description]) => "  " + name + ": " + description,
    ),
    "Options: --root PATH, --json (versioned NDJSON), --request-id ID, --help",
    "source reads raw stdin; --contract JSON selects its closed source contract.",
    "Only format/normalize accept literal paths. Normalize requires explicit paths.",
    "--no-capacity-limits removes admission ceilings; finite runtime controls stay active.",
    "Capacity controls: " +
      capacityNames.map((name) => "--" + limitFlag(name) + " N").join(", "),
    "Runtime controls: " +
      runtimeNames.map((name) => "--" + limitFlag(name) + " N").join(", "),
    "JSON_QUALITY_CAPACITY_LIMITS and JSON_QUALITY_RUNTIME_CONTROLS supply the same typed controls.",
    "Absence of the final applicable terminal or a nonzero process exit means no successful completion.",
    "",
  ].join("\n");
}
