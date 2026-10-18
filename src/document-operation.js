// SPDX-License-Identifier: AGPL-3.0-only
import Ajv from "ajv";
import requestSchema from "../schemas/document-request.schema.json" with { type: "json" };
import { assertRepositoryPath } from "./paths.js";
import { readJsonPolicy, jsonContract, isStrictJsonPath } from "./quality.js";
import { checkJsonDocument } from "./documents.js";
import { formatAdmittedJsonSource } from "./formatting.js";
import { decodeJsonBytes } from "./json-bytes.js";
import { operationLimits } from "./limits.js";
import {
  RESULT_SCHEMA_VERSION,
  emptyWrites,
  analysisCounts,
  validateJsonQualityResult,
  operationRequest,
  operationFindings,
} from "./result.js";

const validateRequest = new Ajv({ strict: true }).compile(requestSchema);

/** Match JSON Schema character counting without allocating a second large string array. */
function exceedsCharacters(text, maximum) {
  for (let index = 0, count = 0; index < text.length; count++) {
    if (count >= maximum) return true;
    index += text.codePointAt(index) > 0xffff ? 2 : 1;
  }
  return false;
}

/** Format supplied strict JSON under the selected root's policy, without filesystem writes.
 * Request schema 1 carries canonical base64 bytes; the nested native result retains
 * complete findings and exits. Excluded or producer-owned paths cannot acquire write semantics.
 */
export async function formatJsonDocument(
  request,
  { root, capacityLimits: overrides, check, ...otherOptions } = {},
) {
  if (Object.keys(otherOptions).length)
    throw new TypeError(
      "Invalid supplied formatting options; use root, check and capacityLimits.",
    );
  const operation = operationRequest("format", { check });
  if (!validateRequest(request))
    throw new TypeError("Invalid supplied JSON document request.");
  const bootstrap = operationLimits({}, overrides);
  const policy = await readJsonPolicy(root, {
    maxPolicyBytes: bootstrap.maxPolicyBytes,
  });
  if (policy.nativeSources?.length || policy.preserveSourcePresentation?.length)
    throw new Error(
      "Supplied formatting cannot replace native or logical admission obligations.",
    );
  const capacityLimits = operationLimits(policy, overrides);
  if (
    exceedsCharacters(
      request.requestId,
      capacityLimits.maxRequestIdCharacters,
    ) ||
    exceedsCharacters(request.path, capacityLimits.maxRequestPathCharacters)
  )
    throw new Error(
      "Supplied request metadata exceeds the selected character limit.",
    );
  assertRepositoryPath(request.path);
  if (!isStrictJsonPath(request.path))
    throw new TypeError("Supplied formatting requires a strict JSON path.");
  if (
    request.contentBase64.length >
    Math.ceil(
      Math.min(capacityLimits.maxFileBytes, capacityLimits.maxTotalBytes) / 3,
    ) *
      4
  )
    throw new Error("Supplied document exceeds the selected byte budget.");
  const original = Buffer.from(request.contentBase64, "base64");
  if (original.toString("base64") !== request.contentBase64)
    throw new TypeError("Supplied content must be canonical base64.");
  if (
    original.length > capacityLimits.maxFileBytes ||
    original.length > capacityLimits.maxTotalBytes
  )
    throw new Error("Supplied document exceeds the selected byte budget.");
  const contract = jsonContract(request.path, policy);
  const parts = request.path.split("/");
  const excludedAncestor = parts
    .slice(0, -1)
    .some(
      (_, index) =>
        jsonContract(parts.slice(0, index + 1).join("/") + "/", policy).exclude,
    );
  if (excludedAncestor || contract.exclude || !contract.allowFormatWrites)
    throw new Error(
      "Supplied path is excluded or protected by its owning policy.",
    );
  let document = await checkJsonDocument(original, contract);
  let output = original;
  // Presentation is the only repair authorized by this operation.
  if (
    !operation.check &&
    document.syntaxValid &&
    document.findings.every(({ phase }) => phase === "presentation")
  ) {
    output = Buffer.from(
      await formatAdmittedJsonSource(decodeJsonBytes(original), capacityLimits),
    );
    if (output.length > capacityLimits.maxTotalBytes)
      throw new Error(
        "Supplied output exceeds the selected total-byte budget.",
      );
    document = await checkJsonDocument(output, contract);
  }
  if (
    document.findings.length + document.expectedFindings.length >
    capacityLimits.maxDiagnostics
  )
    throw new Error("Supplied document diagnostic limit exceeded.");
  if (operation.check)
    document = {
      ...document,
      findings: operationFindings(document, operation, false),
    };
  const documents = [{ ...document, representation: "logical" }];
  const result = validateJsonQualityResult({
    schemaVersion: RESULT_SCHEMA_VERSION,
    ...operation,
    status: document.findings.length ? "failed" : "passed",
    complete: true,
    counts: analysisCounts(documents, "format"),
    documents,
    findings: document.findings,
    boundaries: [],
    nativeSources: [],
    writes: emptyWrites(),
  });
  return {
    schemaVersion: 1,
    requestId: request.requestId,
    path: request.path,
    contentBase64: output.toString("base64"),
    result,
  };
}
