// SPDX-License-Identifier: AGPL-3.0-only
import { isDeepStrictEqual } from "node:util";
import { formatAdmittedJsonSource } from "./formatting.js";
import { inspectJsonInventory } from "./inventory.js";
import { checkJsonDocument } from "./documents.js";
import {
  normalizeJsonSource,
  isJsonLinesPath,
  decodeJsonBytes,
} from "./quality.js";
import { checkJsonLines } from "./json-lines.js";
import { checkNativeDocuments } from "./native-documents.js";
import {
  checkLogicalDocuments,
  verifiedContainerContract,
} from "./logical-documents.js";
import {
  OPERATIONS,
  validateJsonQualityResult,
  inventoryDocument,
  analysisCounts,
} from "./result.js";
import {
  captureSource,
  assertSourceUnchanged,
  replaceSource,
} from "./replacement.js";

/** Run one repository operation. Read-only operations never acquire tools or write.
 * Required outputs add obligations; they never replace physical discovery.
 */
export async function runJsonQuality(operation, options = {}) {
  if (
    !options ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    Object.keys(options).some(
      (key) =>
        ![
          "root",
          "requiredOutputs",
          "sourcePaths",
          "logicalInventory",
          "logicalDocuments",
          "nativeProviders",
          "limits",
        ].includes(key),
    )
  )
    throw new TypeError("Invalid JSON quality operation options.");
  if (!OPERATIONS.includes(operation))
    throw new TypeError("Unknown JSON quality operation.");
  const context = await inspectJsonInventory(options);
  context.sourcePresentationMatches = new Set();
  if (
    (options.logicalInventory?.length ?? 0) >
      context.limits.maxLogicalDocuments ||
    (options.logicalDocuments?.length ?? 0) > context.limits.maxLogicalDocuments
  )
    throw new Error("JSON logical document limit exceeded.");
  let totalBytes = context.totalBytes;
  for (const entry of options.logicalDocuments ?? []) {
    const size = entry?.bytes?.byteLength;
    if (!Number.isSafeInteger(size) || size > context.limits.maxFileBytes)
      throw new Error("JSON logical byte limit exceeded.");
    totalBytes += size;
    if (totalBytes > context.limits.maxTotalBytes)
      throw new Error("JSON total byte limit exceeded.");
  }
  const writing = operation === "format" || operation === "normalize";
  const policyOriginal = captureSource(context.root, ".json-quality.json");
  const native = await checkNativeDocuments(
    context,
    options.nativeProviders,
    operation,
    totalBytes,
    options.logicalInventory,
  );
  const protectNativeInputs = (files) =>
    files.map((contract) =>
      native.protectedPaths.has(contract.path.toLowerCase())
        ? {
            ...contract,
            allowFormatWrites: false,
            exceptions: [
              ...contract.exceptions,
              {
                owner: "Native document providers",
                reason:
                  "Admitted source or authority snapshot; modify through its native owner.",
              },
            ],
          }
        : contract,
    );
  context.files = protectNativeInputs(context.files);
  const requiredContainers = new Set(
    (options.logicalInventory ?? []).map((entry) => entry?.containerPath),
  );
  const originals = new Map(
    context.files
      .filter(
        (file) =>
          operation !== "inventory" || requiredContainers.has(file.path),
      )
      .map((file) => [file.path, captureSource(context.root, file.path)]),
  );
  const replacements = new Map();
  if (operation === "normalize") {
    if (
      !Array.isArray(options.sourcePaths) ||
      !options.sourcePaths.length ||
      new Set(options.sourcePaths).size !== options.sourcePaths.length
    )
      throw new TypeError(
        "Normalization requires unique explicit repository-relative source paths.",
      );
    for (const path of options.sourcePaths) {
      const contract = context.files.find((file) => file.path === path);
      if (!contract?.allowFormatWrites || contract.normalization !== "NFC")
        throw new Error(
          `Protected or undiscovered JSON source: ${path}; repair its owning source or producer.`,
        );
      replacements.set(
        path,
        Buffer.from(
          await normalizeJsonSource(
            decodeJsonBytes(originals.get(path).bytes),
            contract,
          ),
        ),
      );
    }
  }
  const logical = await checkLogicalDocuments(
    context,
    originals,
    options,
    operation,
  );
  if (
    context.sourcePresentationMatches.size !==
    (context.policy.preserveSourcePresentation?.length ?? 0)
  )
    throw new Error(
      "Missing independently admitted source presentation scope.",
    );
  const documents = [];
  for (const contract of context.files) {
    const verifiedContract = verifiedContainerContract(
      contract,
      options.logicalInventory ?? [],
    );
    if (operation === "inventory") {
      documents.push(inventoryDocument(contract, "physical"));
      continue;
    }
    const analyze = isJsonLinesPath(contract.path)
      ? checkJsonLines
      : checkJsonDocument;
    const document = await analyze(
      replacements.get(contract.path) ?? originals.get(contract.path).bytes,
      { ...verifiedContract, maxRecords: context.limits.maxRecords },
    );
    documents.push({ ...document, representation: "physical" });
  }
  documents.push(...logical);
  documents.push(...native.documents);
  const physicalContracts = new Map(
    context.files.map((contract) => [contract.path, contract]),
  );
  for (const document of documents) {
    const writable =
      physicalContracts.get(document.path)?.allowFormatWrites ?? false;
    document.findings = document.findings.filter((finding) =>
      operation === "lint"
        ? finding.phase !== "presentation"
        : operation === "check-format"
          ? finding.phase === "presentation" ||
            finding.phase === "expectation" ||
            finding.phase === "bytes" ||
            !document.syntaxValid
          : operation === "producers"
            ? !writable
            : writing
              ? finding.phase !== "presentation" || !writable
              : true,
    );
  }
  const findings = documents.flatMap((document) => document.findings);
  if (
    documents.reduce(
      (sum, document) =>
        sum + document.findings.length + document.expectedFindings.length,
      0,
    ) > context.limits.maxDiagnostics
  )
    throw new Error("JSON diagnostic limit exceeded; coverage is incomplete.");
  const result = {
    schemaVersion: 2,
    operation,
    status: findings.length ? "failed" : "passed",
    complete: true,
    counts: analysisCounts(documents, operation),
    documents,
    findings,
    boundaries: context.boundaries,
    nativeSources: native.sources,
    writes: { changed: [], unchanged: [], failed: [], unprocessed: [] },
  };
  native.recheck();
  assertSourceUnchanged(context.root, ".json-quality.json", policyOriginal);
  if (!writing || findings.length) return validateJsonQualityResult(result);
  if (operation === "format") {
    for (const contract of context.files.filter(
      (file) => file.allowFormatWrites,
    )) {
      const text = originals.get(contract.path).bytes.toString("utf8");
      replacements.set(
        contract.path,
        Buffer.from(await formatAdmittedJsonSource(text, context.limits)),
      );
    }
  }
  const fresh = await inspectJsonInventory(options);
  if (
    !isDeepStrictEqual(fresh.policy, context.policy) ||
    !isDeepStrictEqual(protectNativeInputs(fresh.files), context.files)
  )
    throw new Error("JSON policy or inventory changed during preflight.");
  for (const [path, original] of originals)
    assertSourceUnchanged(context.root, path, original);
  native.recheck();
  const pending = [...replacements.keys()];
  for (const [path, bytes] of replacements) {
    try {
      if (bytes.equals(originals.get(path).bytes))
        result.writes.unchanged.push(path);
      else {
        replaceSource(context.root, path, originals.get(path), bytes);
        result.writes.changed.push(path);
      }
      pending.shift();
    } catch {
      result.status = "failed";
      result.complete = false;
      result.writes.failed.push(path);
      result.writes.unprocessed = pending.slice(1);
      return validateJsonQualityResult(result);
    }
  }
  return validateJsonQualityResult(result);
}
