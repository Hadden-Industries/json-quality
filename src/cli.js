#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { runJsonQuality } from "./execution.js";
import { validateJsonQualityResult, OPERATIONS } from "./result.js";
import { LIMIT_NAMES } from "./limits.js";

const limitFlag = (name) =>
  name.replace(/[A-Z]/gu, (letter) => "-" + letter.toLowerCase());

// Preserve the requested error envelope even when strict argument parsing fails.
let machine = process.argv.slice(2).includes("--json");
let operation = "invalid";
try {
  const { values, positionals } = parseArgs({
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
    throw new TypeError("Choose --no-limits or individual capacity overrides.");
  const result = validateJsonQualityResult(
    await runJsonQuality(operation, {
      root: resolve(values.root ?? process.cwd()),
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
        ? `Inventoried ${result.counts.physical} physical files and ${result.counts.logical} logical documents; JSON analysis and record framing not performed.\n`
        : `${result.status}; ${result.counts.physical} physical files; ${result.counts.logical} logical documents; ${result.counts.records} records; ${expected} verified expected diagnostics; ${result.writes.changed.length} written.\n`,
    );
  }
  process.exitCode = result.status === "passed" ? 0 : 1;
} catch (error) {
  const result = validateJsonQualityResult({
    schemaVersion: 1,
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
    writes: { changed: [], unchanged: [], failed: [], unprocessed: [] },
  });
  if (machine) process.stdout.write(JSON.stringify(result) + "\n");
  else process.stderr.write(`${error.message.split("\n")[0]}\n`);
  process.exitCode = 2;
}
