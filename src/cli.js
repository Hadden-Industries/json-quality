#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { runJsonQuality } from "./execution.js";
import { formatJsonDocument } from "./document-operation.js";
import { operationLimits } from "./limits.js";
import { admitFiles } from "./selection.js";
import { readJsonPolicy, parseJsonEnvelope } from "./quality.js";
import {
  RESULT_SCHEMA_VERSION,
  emptyWrites,
  validateJsonQualityResult,
} from "./result.js";
import {
  CLI_OPTIONS,
  commandHelp,
  commandRequest,
  resourceCliLimits,
} from "./commands.js";

/** Reuse native argument parsing and result reporting in thin repository adapters.
 * Context adds trusted output/logical obligations and may fix the repository root.
 * A trusted async context factory runs inside the same operational error envelope.
 * Returns the process exit code; importing the API never runs a command.
 */
export async function runJsonQualityCli(args, context = {}) {
  // Preserve the requested error envelope even when strict argument parsing fails.
  let machine = args.includes("--json");
  let operation = "invalid";
  let request = { operation };
  try {
    const { values, positionals } = parseArgs({
      args,
      allowPositionals: true,
      allowNegative: true,
      strict: true,
      options: CLI_OPTIONS,
    });
    machine = values.json;
    const [mode, ...files] = positionals;
    if (!args.length || (values.help && mode === undefined)) {
      if (values.json)
        throw new TypeError("Help is human-readable; omit --json.");
      process.stdout.write(commandHelp());
      return 0;
    }
    request = commandRequest(mode, values, files);
    operation = request.operation;
    if (!["info", "warning", "error"].includes(values["diagnostic-level"]))
      throw new TypeError("Diagnostic level must be info, warning or error.");
    const concurrency =
      values.concurrency === undefined ? 1 : Number(values.concurrency);
    if (
      !/^[1-9]\d*$/u.test(values.concurrency ?? "1") ||
      !Number.isSafeInteger(concurrency)
    )
      throw new TypeError("Concurrency must be a positive safe integer.");
    if (values.files !== undefined && files.length)
      throw new TypeError(
        "Choose literal file arguments or --files, not both.",
      );
    const selectedFiles =
      values.files !== undefined
        ? JSON.parse(values.files)
        : files.length
          ? files
          : undefined;
    if (
      selectedFiles !== undefined &&
      (!Array.isArray(selectedFiles) ||
        selectedFiles.some((path) => typeof path !== "string"))
    )
      throw new TypeError("--files must contain an array of literal paths.");
    if (values.help) {
      if (values.json)
        throw new TypeError("Help is human-readable; omit --json.");
      process.stdout.write(commandHelp(mode));
      return 0;
    }
    admitFiles(operation, selectedFiles);
    const selectedLimits = resourceCliLimits(values);
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
    if (values.request !== undefined) {
      if (!machine) throw new TypeError("--request requires --json.");
      if (
        context.requiredOutputs?.length ||
        context.logicalInventory?.length ||
        context.logicalDocuments?.length ||
        context.nativeProviders
      )
        throw new TypeError(
          "Supplied formatting cannot replace repository adapter obligations.",
        );
      const bootstrap = operationLimits({}, selectedLimits);
      const policy = await readJsonPolicy(root, {
        maxPolicyBytes: bootstrap.maxPolicyBytes,
      });
      const budget = operationLimits(policy, selectedLimits);
      const chunks = [];
      let size = 0;
      const requestLimit = budget.maxRequestBytes;
      for await (const chunk of process.stdin) {
        size += chunk.length;
        if (size > requestLimit)
          throw new Error("Supplied request exceeds its byte budget.");
        chunks.push(chunk);
      }
      const supplied = await formatJsonDocument(
        await parseJsonEnvelope(Buffer.concat(chunks)),
        { root, check: request.check, capacityLimits: selectedLimits },
      );
      process.stdout.write(JSON.stringify(supplied) + "\n");
      return supplied.result.status === "passed" ? 0 : 1;
    }
    const result = validateJsonQualityResult(
      await runJsonQuality(operation, {
        ...context,
        root,
        ...(request.check !== undefined ? { check: request.check } : {}),
        ...(request.scope !== undefined ? { scope: request.scope } : {}),
        files: selectedFiles,
        concurrency,
        capacityLimits: selectedLimits,
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
      schemaVersion: RESULT_SCHEMA_VERSION,
      ...request,
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
      writes: emptyWrites(),
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
