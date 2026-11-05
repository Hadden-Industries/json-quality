// SPDX-License-Identifier: AGPL-3.0-only
// Public CLI controls project the same schema-owned admission/runtime vocabulary.
import schema from "../schemas/configuration.schema.json" with { type: "json" };
import { resolveExecutionResources } from "./execution-resources.js";
import { transformResources } from "./transform-capabilities.js";

/** Only the explicitly scoped capacity environment contract is admitted. */
function capacityLimitsEnvironment() {
  if (process.env.JSON_QUALITY_LIMITS !== undefined)
    throw new TypeError(
      "Use JSON_QUALITY_CAPACITY_LIMITS; JSON_QUALITY_LIMITS is not supported.",
    );
  return process.env.JSON_QUALITY_CAPACITY_LIMITS;
}

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
  "check-files":
    "Check literal selected files or virtual stdin; no complete repository verdict.",
  "check-source":
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
  "dry-run": { type: "boolean" },
  write: { type: "boolean" },
  stdin: { type: "boolean" },
  "stdin-filepath": { type: "string" },
  version: { type: "boolean", short: "v" },
  quiet: { type: "boolean" },
  "diagnostic-display-level": { type: "string" },
  root: { type: "string" },
  ndjson: { type: "boolean", default: false },
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
export function commandHelp(
  /** @type {string | undefined} */ command = undefined,
) {
  if (command && Object.hasOwn(COMMANDS, command))
    return contextualHelp(command);
  return [
    "Usage: json-quality <check|check-files|check-source|format|normalize> [options] [-- literal/path.json ...]",
    ...Object.entries(COMMANDS).map(
      ([name, description]) => "  " + name + ": " + description,
    ),
    "Discovery: --help (-h), COMMAND --help, --version (-v).",
    "Options: --root PATH, --ndjson (versioned NDJSON), --request-id ID, --help",
    "check-source reads raw stdin; --contract JSON selects its closed source contract.",
    "check-files, format and normalize accept literal paths; normalize requires explicit files.",
    "Filesystem transforms require --write or --dry-run; --stdin outputs source only.",
    "Example: json-quality check-files -- data.json",
    "Example: json-quality format --dry-run -- data.json",
    "normalize --dry-run previews a complete selected batch without writing.",
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

const /** @type {Record<string, string[]>} */ commandDetails = {
    check: [
      "Usage: json-quality check [--root PATH] [--ndjson]",
      "Read-only complete repository check, including providers, required outputs and freshness.",
      "Use check-files -- A.json for selected inputs. Root defaults to cwd; no ancestor policy search.",
      "Example: json-quality check --root .",
    ],
    "check-files": [
      "Usage: json-quality check-files [--root PATH] [--stdin --stdin-filepath A.json | -- A.json ...]",
      "Read-only selected sources; repository-wide obligations are not assessed. No Git required.",
      "--stdin requires --stdin-filepath; virtual identity never reads or replaces that file.",
      "Root defaults to cwd and selects repository policy. Directories and internal glob expansion are unsupported.",
      'Example: json-quality check-files --root . -- "data/my file.json"',
    ],
    "check-source": [
      "Usage: json-quality check-source [--contract JSON] [--stdin-filepath A.json]",
      "Read raw UTF-8 stdin under --contract JSON (default {}), without repository policy.",
      "--stdin-filepath supplies identity/framing only; --root and --stdin are unsupported.",
      "Example: json-quality check-source --stdin-filepath data.json < data.json",
    ],
    format: [
      "Usage: json-quality format (--write | --dry-run | --stdin) [options] [-- A.json ...]",
      "Filesystem modes preflight the complete repository: --write replaces sources; --dry-run previews actual candidates.",
      "No files explicitly selects all eligible writable sources for filesystem modes.",
      "Stdin emits transformed source only. Without --root it uses --contract JSON (default {}), even with a filename.",
      "Explicit --root selects policy-aware stdin and requires --stdin-filepath; --contract is then forbidden.",
      "Example: json-quality format --dry-run -- data.json",
      "Example: json-quality format --stdin --stdin-filepath data.json < data.json",
    ],
    normalize: [
      "Usage: json-quality normalize (--write | --dry-run | --stdin) [options] [-- A.json ...]",
      "Separate NFC operation; formatting preserves decoded string values. NFC key collisions are refused.",
      "Filesystem --write and --dry-run require explicit files and complete repository preflight.",
      "Stdin emits source only. Without --root it uses --contract JSON (default {}), even with a filename.",
      "Explicit --root selects policy-aware stdin and requires --stdin-filepath; --contract is then forbidden.",
      "Example: json-quality normalize --dry-run -- data.json",
    ],
  };

function contextualHelp(/** @type {string} */ command) {
  return [
    ...commandDetails[command],
    "Human reports use stderr; --ndjson emits complete versioned events on stdout (not available for stdin transforms).",
    "Display: --quiet, --diagnostic-display-level info|warning|error (human output only).",
    "Common options: --request-id ID, --help (-h).",
    "Resources: --capacity-limits, --runtime-controls and their --no- forms; individual controls accept N|null.",
    "Capacity controls: " +
      capacityNames
        .map((name) => "--" + limitFlag(name) + " N|null")
        .join(", "),
    "Runtime controls: " +
      runtimeNames.map((name) => "--" + limitFlag(name) + " N|null").join(", "),
    ...(command === "format" || command === "normalize"
      ? [
          "--transform-controls JSON or JSON_QUALITY_TRANSFORM_CONTROLS selects writer quotas.",
        ]
      : []),
    "JSON_QUALITY_CAPACITY_LIMITS and JSON_QUALITY_RUNTIME_CONTROLS supply typed controls.",
    "Use literal root-relative POSIX paths; quote spaces and use -- before leading-hyphen paths.",
    "",
  ].join("\n");
}

/** Reject conflicts before context, policy, resource environment or input work. */
export function admitCommand(
  /** @type {string} */ command,
  /** @type {*} */ values,
  /** @type {string[]} */ files,
) {
  const has = (/** @type {string} */ name) => values[name] !== undefined;
  const fail = (/** @type {string} */ message) => {
    throw new TypeError(message + "\n" + commandDetails[command][0]);
  };
  const writer = command === "format" || command === "normalize";
  if (
    has("diagnostic-display-level") &&
    !["info", "warning", "error"].includes(values["diagnostic-display-level"])
  )
    fail("--diagnostic-display-level must be info, warning or error.");
  if (values.ndjson && (has("quiet") || has("diagnostic-display-level")))
    fail(
      "Display controls cannot be combined with --ndjson; remove the display flag to retain complete events.",
    );
  if (
    (has("write") && values.write === false) ||
    (has("dry-run") && values["dry-run"] === false)
  )
    fail("Negative mode flags are unsupported; choose --write or --dry-run.");
  if (has("write") && has("dry-run"))
    fail("Choose exactly one of --write and --dry-run.");
  if (!writer && (has("write") || has("dry-run") || has("transform-controls")))
    fail(
      "Write, preview and transform controls apply only to format or normalize.",
    );
  if (values.stdin && files.length)
    fail("--stdin accepts one virtual input and no physical file arguments.");
  if (
    command === "check" &&
    (files.length || has("stdin") || has("stdin-filepath") || has("contract"))
  )
    fail(
      "check evaluates the complete repository. Use json-quality check-files -- A.json for selected files.",
    );
  if (
    command === "check-source" &&
    (files.length || has("root") || has("stdin"))
  )
    fail(
      "check-source reads raw stdin without repository policy; remove --root, --stdin and file arguments.",
    );
  if (command === "check-files") {
    if (has("contract"))
      fail(
        "check-files uses repository policy; --contract is only for raw input.",
      );
    if (
      values.stdin
        ? !has("stdin-filepath")
        : !files.length || has("stdin-filepath")
    )
      fail("Provide literal files, or --stdin --stdin-filepath A.json.");
  }
  if (writer) {
    if (values.stdin) {
      if (has("write") || has("dry-run") || values.ndjson)
        fail(
          "Stdin transforms output source only; remove --write, --dry-run and --ndjson.",
        );
      if (has("root") && (!has("stdin-filepath") || has("contract")))
        fail(
          "Policy-aware stdin requires --stdin-filepath and forbids --contract.",
        );
    } else {
      if (!values.write && !values["dry-run"])
        fail(
          "Filesystem transforms require an explicit mode. Use json-quality " +
            command +
            " --write -- A.json or json-quality " +
            command +
            " --dry-run -- A.json.",
        );
      if (has("stdin-filepath") || has("contract"))
        fail(
          "--stdin-filepath and --contract require raw input; add --stdin or remove them.",
        );
      if (command === "normalize" && !files.length)
        fail("Normalization requires explicit literal files after --.");
    }
  }
}
