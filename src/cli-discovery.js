// SPDX-License-Identifier: AGPL-3.0-only
// Metadata discovery never loads an operational owner or inspects environment controls.
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import {
  CLI_OPTIONS,
  COMMANDS,
  commandHelp,
  admitCommand,
  resourceCliControls,
} from "./commands.js";

export function packageVersion() {
  return (
    JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ).version + "\n"
  );
}

/** Strict syntactic parsing with conflicting singleton options rejected. */
export function parseCliArguments(
  /** @type {string[]} */ args,
  /** @type {*} */ options,
  allowPositionals = true,
  strict = true,
) {
  const parsed = parseArgs({
    args,
    options,
    allowPositionals,
    allowNegative: true,
    tokens: true,
    strict,
  });
  const seen = new Map();
  for (const token of parsed.tokens) {
    if (token.kind !== "option") continue;
    const name = token.name.startsWith("no-")
      ? token.name.slice(3)
      : token.name;
    const value = token.name.startsWith("no-") ? false : (token.value ?? true);
    if (seen.has(name) && seen.get(name) !== value)
      throw new TypeError(
        "Conflicting repeated option --" + name + "; provide one value.",
      );
    seen.set(name, value);
    if (name === "stdin-filepath" && seen.get("virtual-filename-seen"))
      throw new TypeError(
        "--stdin-filepath accepts exactly one virtual filename.",
      );
    if (name === "stdin-filepath") seen.set("virtual-filename-seen", true);
  }
  return parsed;
}

/** Admit independent caller quotas even when command discovery fails. Unknown
 * options cannot supply authority, and tokens after -- remain literal paths. */
export function failureCliResources(
  /** @type {string[]} */ args,
  /** @type {*} */ options = CLI_OPTIONS,
) {
  const parsed = parseCliArguments(args, options, true, false);
  return resourceCliControls(parsed.values);
}

/** Positionals contains file arguments only; command is removed. */
export function discoverCli(/** @type {string[]} */ args) {
  let parsed;
  try {
    parsed = parseCliArguments(args, CLI_OPTIONS);
  } catch (error) {
    throw new TypeError(
      String(error instanceof Error ? error.message : error) +
        "\n" +
        commandHelp().split("\n")[0] +
        "\nUse json-quality COMMAND --help for accepted options.",
      { cause: error },
    );
  }
  const /** @type {Record<string, any>} */ values = parsed.values;
  const [command, ...positionals] = parsed.positionals;
  if (command && !Object.hasOwn(COMMANDS, command))
    throw new TypeError(
      "Unknown command " +
        JSON.stringify(command) +
        ".\n" +
        commandHelp().split("\n")[0] +
        "\nUse json-quality --help to choose a command.",
    );
  if (values.version) {
    if (
      command ||
      values.help ||
      parsed.tokens.some(
        (token) => token.kind === "option" && token.name !== "version",
      )
    )
      throw new TypeError(
        "--version accepts no command or other options. Use json-quality --version.",
      );
    return { command, values, positionals, discovery: packageVersion() };
  }
  if (values.help) {
    if (values.ndjson)
      throw new TypeError(
        "Help cannot be combined with --ndjson; use json-quality " +
          (command ? command + " " : "") +
          "--help.",
      );
    return { command, values, positionals, discovery: commandHelp(command) };
  }
  if (!command) {
    if (args.length) throw new TypeError("Choose a command.\n" + commandHelp());
    return { command, values, positionals, discovery: commandHelp() };
  }
  admitCommand(command, values, positionals);
  return { command, values, positionals };
}
