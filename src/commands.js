// SPDX-License-Identifier: AGPL-3.0-only
import { LIMIT_NAMES } from "./limits.js";

/** Human commands and semantic result operations are separate interfaces. */
export const COMMANDS = Object.freeze({
  inventory: {
    operation: "inventory",
    summary: "List complete scope and contracts without document analysis.",
  },
  lint: {
    operation: "lint",
    summary: "Check JSON syntax, interoperability and Unicode rules.",
  },
  check: {
    operation: "check",
    scopes: { all: "check", protected: "check-protected" },
    summary:
      "Check all quality phases; --scope protected selects write-protected documents.",
  },
  format: {
    operation: "format",
    checkOperation: "check-format",
    summary:
      "Format admitted writable sources; --check verifies presentation without writing.",
  },
  normalize: {
    operation: "normalize",
    sourcePaths: true,
    summary:
      "Normalize NFC tokens in explicit writable source paths; not presentation formatting.",
  },
});
export const limitFlag = (name) =>
  name.replace(/[A-Z]/gu, (letter) => "-" + letter.toLowerCase());
export const CLI_OPTIONS = Object.freeze({
  root: { type: "string" },
  json: { type: "boolean", default: false },
  check: { type: "boolean", default: false },
  scope: { type: "string" },
  help: { type: "boolean", short: "h", default: false },
  "no-limits": { type: "boolean", default: false },
  ...Object.fromEntries(
    LIMIT_NAMES.map((name) => [limitFlag(name), { type: "string" }]),
  ),
});
export function commandOperation(command, values, sourcePaths) {
  const descriptor = Object.hasOwn(COMMANDS, command)
    ? COMMANDS[command]
    : null;
  if (!descriptor)
    throw new TypeError("Unknown JSON quality command; use --help.");
  if (sourcePaths.length && !descriptor.sourcePaths)
    throw new TypeError("Only normalize accepts explicit source paths.");
  if (values.check && !descriptor.checkOperation)
    throw new TypeError("--check is valid only with format.");
  if (values.scope !== undefined && !descriptor.scopes)
    throw new TypeError("--scope is valid only with check.");
  if (descriptor.scopes) {
    const scope = values.scope ?? "all";
    if (!Object.hasOwn(descriptor.scopes, scope))
      throw new TypeError("Check scope must be all or protected.");
    return descriptor.scopes[scope];
  }
  return values.check ? descriptor.checkOperation : descriptor.operation;
}
export function commandHelp(command) {
  const entries =
    command === undefined
      ? Object.entries(COMMANDS)
      : [[command, COMMANDS[command]]];
  return [
    "Usage: json-quality <command> [options]",
    ...entries.map(([name, descriptor]) => `  ${name}: ${descriptor.summary}`),
    "Options: --root PATH, --json, --help (-h), --no-limits",
    "Formatting verification: format --check",
    "Checking scope: check --scope all|protected (default all)",
    "Normalization selection: normalize -- relative/source.json",
    "Capacity overrides: " +
      LIMIT_NAMES.map((name) => "--" + limitFlag(name) + " N").join(", "),
    "Read-only requests never acquire tools or replace checkout files.",
    "",
  ].join("\n");
}
