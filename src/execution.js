// SPDX-License-Identifier: AGPL-3.0-only
import { isDeepStrictEqual } from "node:util";
import { admitFiles, selectPhysicalFiles, mapConcurrent } from "./selection.js";
import { formatAdmittedJsonSource } from "./formatting.js";
import { inspectJsonInventory } from "./inventory.js";
import { checkJsonDocument } from "./documents.js";
import { normalizeJsonSource, isJsonLinesPath } from "./quality.js";
import { decodeJsonBytes } from "./json-bytes.js";
import { checkJsonLines } from "./json-lines.js";
import { checkNativeDocuments } from "./native-documents.js";
import {
  checkLogicalDocuments,
  verifiedContainerContract,
} from "./logical-documents.js";
import {
  operationRequest,
  operationFindings,
  RESULT_SCHEMA_VERSION,
  emptyWrites,
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
          "check",
          "scope",
          "logicalInventory",
          "logicalDocuments",
          "nativeProviders",
          "capacityLimits",
          "files",
          "concurrency",
          "gitExecutable",
        ].includes(key),
    )
  )
    throw new TypeError("Invalid JSON quality operation options.");
  const request = operationRequest(operation, options);
  admitFiles(operation, options.files);
  if (
    options.files !== undefined &&
    operation !== "normalize" &&
    options.requiredOutputs?.length
  )
    throw new TypeError(
      "Explicit files cannot replace required output obligations.",
    );
  const concurrency = options.concurrency ?? 1;
  if (!Number.isSafeInteger(concurrency) || concurrency < 1)
    throw new TypeError("Concurrency must be a positive safe integer.");
  const context = await inspectJsonInventory(options);
  const selected = selectPhysicalFiles(options.files, context.files);
  context.sourcePresentationMatches = new Set();
  if (
    (options.logicalInventory?.length ?? 0) >
      context.capacityLimits.maxLogicalDocuments ||
    (options.logicalDocuments?.length ?? 0) >
      context.capacityLimits.maxLogicalDocuments
  )
    throw new Error("JSON logical document limit exceeded.");
  let totalBytes = context.totalBytes;
  for (const entry of options.logicalDocuments ?? []) {
    const size = entry?.bytes?.byteLength;
    if (
      !Number.isSafeInteger(size) ||
      size > context.capacityLimits.maxFileBytes
    )
      throw new Error("JSON logical byte limit exceeded.");
    totalBytes += size;
    if (totalBytes > context.capacityLimits.maxTotalBytes)
      throw new Error("JSON total byte limit exceeded.");
  }
  const writing =
    (operation === "format" && !request.check) || operation === "normalize";
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
  if (
    operation === "format" &&
    writing &&
    selected &&
    context.files.some(
      (file) => selected.has(file.path) && !file.allowFormatWrites,
    )
  )
    throw new Error("Explicit formatting selected a protected JSON source.");
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
    for (const path of selected) {
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
  const analyzedFiles =
    selected && !writing
      ? context.files.filter(({ path }) => selected.has(path))
      : context.files;
  const documents = await mapConcurrent(
    analyzedFiles,
    concurrency,
    async (contract) => {
      const verifiedContract = verifiedContainerContract(
        contract,
        options.logicalInventory ?? [],
      );
      if (operation === "inventory") {
        return inventoryDocument(contract, "physical");
      }
      const analyze = isJsonLinesPath(contract.path)
        ? checkJsonLines
        : checkJsonDocument;
      const document = await analyze(
        replacements.get(contract.path) ?? originals.get(contract.path).bytes,
        { ...verifiedContract, maxRecords: context.capacityLimits.maxRecords },
      );
      return { ...document, representation: "physical" };
    },
  );
  documents.push(...logical);
  documents.push(...native.documents);
  const physicalContracts = new Map(
    context.files.map((contract) => [contract.path, contract]),
  );
  for (const document of documents) {
    const writable =
      physicalContracts.get(document.path)?.allowFormatWrites ?? false;
    document.findings = operationFindings(document, request, writable);
  }
  const findings = documents.flatMap((document) => document.findings);
  if (
    documents.reduce(
      (sum, document) =>
        sum + document.findings.length + document.expectedFindings.length,
      0,
    ) > context.capacityLimits.maxDiagnostics
  )
    throw new Error("JSON diagnostic limit exceeded; coverage is incomplete.");
  const result = {
    schemaVersion: RESULT_SCHEMA_VERSION,
    ...request,
    status: findings.length ? "failed" : "passed",
    complete: true,
    counts: analysisCounts(documents, operation),
    documents,
    findings,
    boundaries: context.boundaries,
    nativeSources: native.sources,
    writes: emptyWrites(),
    ...(selected
      ? {
          selection: {
            mode: "explicit",
            files: [...selected],
            physicalInventory: context.files.length,
            analysis: writing
              ? "repository"
              : "selected-physical-and-required-documents",
          },
        }
      : {}),
  };
  native.recheck();
  assertSourceUnchanged(context.root, ".json-quality.json", policyOriginal);
  if (!writing || findings.length) return validateJsonQualityResult(result);
  if (operation === "format") {
    for (const contract of context.files.filter(
      (file) =>
        file.allowFormatWrites && (!selected || selected.has(file.path)),
    )) {
      const text = originals.get(contract.path).bytes.toString("utf8");
      replacements.set(
        contract.path,
        Buffer.from(
          await formatAdmittedJsonSource(text, context.capacityLimits),
        ),
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
