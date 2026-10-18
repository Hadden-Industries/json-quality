// SPDX-License-Identifier: AGPL-3.0-only
import { LIMIT_NAMES, operationLimits } from "./limits.js";
import { capacityLimitsEnvironment } from "./acquire.js";
import { operationRequest } from "./result.js";

/** CLI verbs use the same operation vocabulary as library requests and results. */
export const COMMANDS = Object.freeze({
  inventory: {
    summary: "List complete scope and contracts without document analysis.",
  },
  lint: {
    summary: "Check JSON syntax, interoperability and Unicode rules.",
  },
  check: {
    summary:
      "Check all quality phases; --scope protected selects write-protected documents.",
  },
  format: {
    summary:
      "Format admitted writable sources; --check verifies presentation without writing.",
  },
  normalize: {
    summary:
      "Normalize NFC tokens in explicit writable source paths; not presentation formatting.",
  },
});
export const limitFlag = (name) =>
  name.replace(/[A-Z]/gu, (letter) => "-" + letter.toLowerCase());
export const RESOURCE_OPTIONS = Object.freeze({
  "capacity-limits": { type: "boolean" },
  ...Object.fromEntries(
    LIMIT_NAMES.map((name) => [limitFlag(name), { type: "string" }]),
  ),
});

/** Same resource admission for the product and consumer-qualification CLIs. */
export function resourceCliLimits(
  values,
  encoded = capacityLimitsEnvironment(),
) {
  const base = encoded === undefined ? undefined : JSON.parse(encoded);
  operationLimits({}, base);
  const capacityLimits = {};
  for (const name of LIMIT_NAMES) {
    const value = values[limitFlag(name)];
    if (value === undefined) continue;
    if (
      !/^\d+$/u.test(value) ||
      !Number.isSafeInteger(Number(value)) ||
      Number(value) < 1
    )
      throw new TypeError(`Invalid resource limit: ${limitFlag(name)}`);
    capacityLimits[name] = Number(value);
  }
  const enabled = values["capacity-limits"];
  const hasOverrides = Object.keys(capacityLimits).length > 0;
  if (
    hasOverrides &&
    (enabled === false || (enabled === undefined && base === false))
  )
    throw new TypeError(
      "Choose the shared capacity bypass or individual capacity overrides, not both.",
    );
  if (enabled === false) return false;
  const merged = {
    ...(typeof base === "object" ? base : {}),
    ...capacityLimits,
  };
  if (enabled === true) return Object.keys(merged).length ? merged : true;
  return hasOverrides ? merged : base;
}
export const CLI_OPTIONS = Object.freeze({
  ...RESOURCE_OPTIONS,
  root: { type: "string" },
  json: { type: "boolean", default: false },
  check: { type: "boolean" },
  scope: { type: "string" },
  help: { type: "boolean", short: "h", default: false },
  files: { type: "string" },
  concurrency: { type: "string" },
  request: { type: "string" },
  "diagnostic-level": { type: "string", default: "info" },
});
export function commandRequest(command, values, files) {
  const request = operationRequest(command, values);
  if (
    values.request !== undefined &&
    (command !== "format" ||
      values.request !== "-" ||
      files.length ||
      values.files !== undefined ||
      values.concurrency !== undefined)
  )
    throw new TypeError(
      "--request - requires format without file selection or concurrency.",
    );
  return request;
}
export function commandHelp(command) {
  const entries =
    command === undefined
      ? Object.entries(COMMANDS)
      : [[command, COMMANDS[command]]];
  return [
    "Usage: json-quality <command> [options]",
    ...entries.map(([name, descriptor]) => `  ${name}: ${descriptor.summary}`),
    "Options: --root PATH, --json, --help (-h)",
    "Capacity switch: --capacity-limits enables configured/default capacities; --no-capacity-limits disables them",
    "Formatting verification: format --check",
    "Checking scope: check --scope all|protected (default all)",
    "Normalization selection: normalize -- relative/source.json",
    "Literal selection: -- relative/source.json, or --files '[\"source.json\"]' (all repository verbs)",
    "Preparation concurrency: --concurrency N (default 1)",
    "Supplied document: format --request - --json (bounded JSON request on stdin; --check verifies without formatting)",
    "Human diagnostics: --diagnostic-level info|warning|error (JSON findings and exits unchanged)",
    "Capacity overrides: " +
      LIMIT_NAMES.map((name) => "--" + limitFlag(name) + " N").join(", "),
    "Read-only requests never acquire tools or replace checkout files.",
    "",
  ].join("\n");
}
