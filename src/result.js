// SPDX-License-Identifier: AGPL-3.0-only
import Ajv from "ajv";
import { isDeepStrictEqual } from "node:util";
import schema from "../schemas/result.schema.json" with { type: "json" };
import { assertNativeIdentity } from "./native-identities.js";

/** The serialized result schema owns version and write-accounting fields. */
export const RESULT_SCHEMA_VERSION = schema.properties.schemaVersion.const;
// Public schema data can be customized by consumers after API initialization.
const writeKeys = Object.freeze([...schema.properties.writes.required]);
/** Create independent write buckets; operations never share mutable arrays. */
export function emptyWrites() {
  return Object.fromEntries(writeKeys.map((name) => [name, []]));
}

export const OPERATIONS = Object.freeze(
  schema.properties.operation.enum.filter((value) => value !== "invalid"),
);
const validate = new Ajv({ strict: true, allErrors: true }).compile(schema);

/** One verb and its applicable modifiers across terminal, library and results. */
export function operationRequest(operation, { check, scope } = {}) {
  if (!OPERATIONS.includes(operation))
    throw new TypeError("Unknown JSON quality operation; use --help.");
  if (
    check !== undefined &&
    (operation !== "format" || typeof check !== "boolean")
  )
    throw new TypeError(
      "check must be a boolean and is valid only with format.",
    );
  if (
    scope !== undefined &&
    (operation !== "check" || !["all", "protected"].includes(scope))
  )
    throw new TypeError(
      "scope must be all or protected and is valid only with check.",
    );
  return {
    operation,
    ...(operation === "format" ? { check: check ?? false } : {}),
    ...(operation === "check" ? { scope: scope ?? "all" } : {}),
  };
}

/** Project findings without changing semantic admission or document coverage. */
export function operationFindings(document, request, writable) {
  return document.findings.filter((finding) =>
    request.operation === "lint"
      ? finding.phase !== "presentation"
      : request.operation === "format" && request.check
        ? finding.phase === "presentation" ||
          finding.phase === "expectation" ||
          finding.phase === "bytes" ||
          !document.syntaxValid
        : request.operation === "check" && request.scope === "protected"
          ? !writable
          : ["format", "normalize"].includes(request.operation)
            ? finding.phase !== "presentation" || !writable
            : true,
  );
}

/** Internal count authority: undecodable JSONL has unknown record coverage. */
export function analysisCounts(documents, operation) {
  const physical = documents.filter(
    (document) => document.representation === "physical",
  ).length;
  const inventory = operation === "inventory";
  const native = documents.filter(
    (document) => document.representation === "native",
  ).length;
  const unknownRecords = documents.some(
    (document) => document.recordCount === null,
  );
  return {
    physical,
    logical: documents.length - physical - native,
    native,
    records:
      inventory || unknownRecords
        ? null
        : documents.reduce(
            (sum, document) => sum + (document.recordCount ?? 0),
            0,
          ),
    checked: inventory
      ? 0
      : unknownRecords
        ? null
        : documents.reduce(
            (sum, document) => sum + (document.recordCount ?? 1),
            0,
          ),
  };
}

/** Scope reporting explicitly leaves JSON analysis phases unperformed. */
export function inventoryDocument(contract, representation) {
  const { path, formatContract, allowFormatWrites, normalization, exceptions } =
    contract;
  return {
    path,
    complete: true,
    syntaxValid: null,
    presentationChecked: false,
    findings: [],
    expectedFindings: [],
    representation,
    contract: { formatContract, allowFormatWrites, normalization, exceptions },
  };
}

/** Validate public shape and accounting. Unknown counts never mean zero coverage. */
export function validateJsonQualityResult(result) {
  if (!validate(result))
    throw new TypeError("Invalid JSON quality result structure.");
  const writePaths = Object.values(result.writes).flat();
  if (
    new Set(writePaths).size !== writePaths.length ||
    ((!["format", "normalize"].includes(result.operation) || result.check) &&
      writePaths.length)
  )
    throw new TypeError("Inconsistent JSON quality write accounting.");
  if (result.status === "error") {
    if (
      result.complete ||
      result.counts !== null ||
      result.documents.length ||
      result.nativeSources.length ||
      writePaths.length ||
      !result.findings.length
    )
      throw new TypeError(
        "Operational failure cannot claim complete coverage.",
      );
    return result;
  }
  if (
    result.counts === null ||
    new Set(result.documents.map((document) => document.path)).size !==
      result.documents.length
  )
    throw new TypeError("Missing or duplicate JSON document accounting.");
  if (
    new Set(result.documents.map(({ path }) => path.toLowerCase())).size !==
    result.documents.length
  )
    throw new TypeError("Case-colliding JSON document accounting.");
  const sourceIds = new Set(result.nativeSources.map(({ id }) => id));
  if (sourceIds.size !== result.nativeSources.length)
    throw new TypeError("Duplicate native source accounting.");
  for (const source of result.nativeSources) {
    const count = result.documents.filter(
      (document) => document.nativeSource?.id === source.id,
    ).length;
    if (
      source.included !== count ||
      source.inventoried !== count + source.excluded.length ||
      source.excluded.some(
        (path) =>
          result.documents.some((document) => document.path === path) ||
          !result.boundaries.some((boundary) => boundary.path === path),
      )
    )
      throw new TypeError("Inconsistent native source accounting.");
  }
  for (const document of result.documents) {
    if (document.representation === "native") {
      assertNativeIdentity(document.nativeSource?.identity);
      if (
        !document.nativeSource ||
        !sourceIds.has(document.nativeSource.id) ||
        document.nativeSource.identity.path !== document.path ||
        document.recordCount !== undefined ||
        document.contract?.allowFormatWrites !== false
      )
        throw new TypeError("Invalid native document provenance accounting.");
    } else if (document.nativeSource)
      throw new TypeError(
        "Native provenance cannot label a physical or logical document.",
      );
  }
  const inventory = result.operation === "inventory";
  if (result.selection) {
    const physical = result.documents.filter(
      ({ representation }) => representation === "physical",
    );
    const paths = new Set(physical.map(({ path }) => path));
    const writing =
      ["format", "normalize"].includes(result.operation) && !result.check;
    if (
      physical.length > result.selection.physicalInventory ||
      result.selection.files.some((path) => !paths.has(path)) ||
      result.selection.analysis !==
        (writing ? "repository" : "selected-physical-and-required-documents") ||
      (!writing && physical.length !== result.selection.files.length) ||
      (writing && physical.length !== result.selection.physicalInventory) ||
      writePaths.some((path) => !result.selection.files.includes(path))
    )
      throw new TypeError("Inconsistent explicit JSON selection accounting.");
  }
  if (
    !isDeepStrictEqual(
      result.counts,
      analysisCounts(result.documents, result.operation),
    ) ||
    !isDeepStrictEqual(
      result.findings,
      result.documents.flatMap((document) => document.findings),
    )
  )
    throw new TypeError(
      "Inconsistent JSON quality coverage or diagnostic accounting.",
    );
  if (
    writePaths.some(
      (path) =>
        !result.documents.some(
          (document) =>
            document.path === path && document.representation === "physical",
        ),
    )
  )
    throw new TypeError("JSON writes must name discovered physical documents.");
  for (const document of result.documents)
    if (
      inventory
        ? document.syntaxValid !== null ||
          document.presentationChecked ||
          document.findings.length ||
          document.expectedFindings.length ||
          !document.contract
        : document.syntaxValid === null
    )
      throw new TypeError(
        "Inventory and quality analysis phases are inconsistent.",
      );
  for (const document of result.documents)
    for (const finding of [...document.findings, ...document.expectedFindings])
      if (
        finding.path !== document.path ||
        (finding.endLine && finding.endLine < finding.line) ||
        (finding.record &&
          (document.recordCount === undefined ||
            finding.record > document.recordCount))
      )
        throw new TypeError(
          "Inconsistent JSON diagnostic identity or location.",
        );
  if (
    result.status === "passed" &&
    (!result.complete ||
      result.findings.length ||
      result.writes.failed.length ||
      result.writes.unprocessed.length ||
      result.documents.some((document) => !document.complete))
  )
    throw new TypeError(
      "JSON quality pass cannot conceal incomplete work or findings.",
    );
  return result;
}
