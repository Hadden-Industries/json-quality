#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { runJsonQuality } from "./execution.js";
import { validateJsonQualityResult, OPERATIONS } from "./result.js";
import { LIMIT_NAMES } from "./limits.js";

const limitFlag = (name) =>
  name.replace(/[A-Z]/gu, (letter) => "-" + letter.toLowerCase());

/** Reuse native argument parsing and result reporting in thin repository adapters.
 * Context adds trusted output/logical obligations and may fix the repository root.
 * A trusted async context factory runs inside the same operational error envelope.
 * Returns the process exit code; importing the API never runs a command.
 */
export async function runJsonQualityCli(args, context = {}) {
  // Preserve the requested error envelope even when strict argument parsing fails.
  let machine = args.includes("--json");
  let operation = "invalid";
  try {
    const { values, positionals } = parseArgs({
      args,
      allowPositionals: true,
      strict: true,
      options: {
        root: { type: "string" },
        json: { type: "boolean", default: false },
        "no-limits": { type: "boolean", default: false },
        ...Object.fromEntries(
          LIMIT_NAMES.map((name) => [limitFlag(name), { type: "string" }]),
        ),
      },
    });
    machine = values.json;
    const [mode, ...sourcePaths] = positionals;
    if (
      !OPERATIONS.includes(mode) ||
      (mode !== "normalize" && sourcePaths.length)
    )
      throw new TypeError(
        "Expected a JSON quality operation; only normalize accepts explicit source paths.",
      );
    operation = mode;
    const limits = {};
    for (const name of LIMIT_NAMES) {
      const value = values[limitFlag(name)];
      if (value === undefined) continue;
      if (
        !/^\d+$/u.test(value) ||
        !Number.isSafeInteger(Number(value)) ||
        Number(value) < 1
      )
        throw new TypeError(`Invalid resource limit: ${limitFlag(name)}`);
      limits[name] = Number(value);
    }
    if (values["no-limits"] && Object.keys(limits).length)
      throw new TypeError(
        "Choose --no-limits or individual capacity overrides.",
      );
    if (typeof context === "function") context = await context();
    if (
      !context ||
      typeof context !== "object" ||
      Array.isArray(context) ||
      Object.keys(context).some(
        (key) =>
          ![
            "root",
            "requiredOutputs",
            "logicalInventory",
            "logicalDocuments",
            "nativeProviders",
          ].includes(key),
      )
    )
      throw new TypeError("Invalid JSON quality CLI context.");
    const root = resolve(context.root ?? values.root ?? process.cwd());
    if (
      context.root !== undefined &&
      values.root !== undefined &&
      resolve(values.root) !== root
    )
      throw new TypeError(
        "The repository adapter fixes the JSON quality root.",
      );
    const result = validateJsonQualityResult(
      await runJsonQuality(operation, {
        ...context,
        root,
        sourcePaths,
        limits: values["no-limits"] ? false : limits,
      }),
    );
    if (machine) process.stdout.write(JSON.stringify(result) + "\n");
    else {
      if (operation === "inventory") {
        for (const document of result.documents)
          process.stdout.write(
            `${document.path}: ${document.contract.allowFormatWrites ? "writable source" : "protected"}; ${document.contract.formatContract}; ${document.contract.normalization}; ${document.contract.exceptions.map((entry) => entry.owner + ": " + entry.reason).join("; ") || "mandatory defaults"}\n`,
          );
      }
      for (const finding of result.findings)
        process.stdout.write(
          `${finding.path}:${finding.line}:${finding.column}: ${finding.phase}/${finding.ruleId ?? finding.messageId}\n`,
        );
      const expected = result.documents.reduce(
        (sum, document) => sum + document.expectedFindings.length,
        0,
      );
      process.stdout.write(
        operation === "inventory"
          ? `Inventoried ${result.counts.physical} physical files, ${result.counts.logical} logical documents and ${result.counts.native} native documents; JSON analysis and record framing not performed.\n`
          : `${result.status}; ${result.counts.physical} physical files; ${result.counts.logical} logical documents; ${result.counts.native} native documents; ${result.counts.records ?? "unknown"} records; ${expected} verified expected diagnostics; ${result.writes.changed.length} written.\n`,
      );
    }
    return result.status === "passed" ? 0 : 1;
  } catch (error) {
    const result = validateJsonQualityResult({
      schemaVersion: 2,
      operation,
      status: "error",
      complete: false,
      counts: null,
      documents: [],
      findings: [
        {
          path: ".",
          phase: "operation",
          ruleId: null,
          messageId: "operation-failed",
          line: 1,
          column: 1,
        },
      ],
      boundaries: [],
      nativeSources: [],
      writes: { changed: [], unchanged: [], failed: [], unprocessed: [] },
    });
    if (machine) process.stdout.write(JSON.stringify(result) + "\n");
    else process.stderr.write(`${error.message.split("\n")[0]}\n`);
    return 2;
  }
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
)
  process.exitCode = await runJsonQualityCli(process.argv.slice(2));
