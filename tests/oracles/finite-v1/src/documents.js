// SPDX-License-Identifier: AGPL-3.0-only
import { ESLint } from "eslint";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { jsonLintConfig, assertNfcPreservationContract } from "./quality.js";
import { decodeJsonBytes } from "./json-bytes.js";
import { checkJsonPresentation, jsonFormatOptions } from "./presentation.js";

/** Undecodable bytes share one diagnostic; an optional framing count is caller-owned. */
export function invalidByteDocument(path, recordCount) {
  return {
    path,
    complete: true,
    syntaxValid: false,
    presentationChecked: false,
    ...(recordCount === undefined ? {} : { recordCount }),
    findings: [
      {
        path,
        phase: "bytes",
        ruleId: null,
        messageId: "invalid-utf8-or-bom",
        line: 1,
        column: 1,
      },
    ],
  };
}
/** Analyze owned bytes without reading configuration, acquiring tools or writing.
 * The supplied contract must already be resolved by the repository policy.
 * Native diagnostics retain decoded-key semantics and exact source locations.
 */
export async function checkJsonDocument(bytes, contract = {}) {
  assertNfcPreservationContract(contract);
  if (contract.preserveNfcValues?.some((pin) => pin.record))
    throw new TypeError(
      "Record-selective NFC preservation requires JSONL analysis.",
    );
  const path = contract.path ?? "input.json";
  const findings = [];
  let text;
  try {
    text = decodeJsonBytes(bytes);
  } catch {
    return admitExpected(invalidByteDocument(path), bytes, contract);
  }
  const linter = new ESLint({
    overrideConfigFile: true,
    overrideConfig: jsonLintConfig([{ ...contract, path: "input.json" }]),
  });
  const [result] = await linter.lintText(text, { filePath: "input.json" });
  for (const message of result.messages) {
    findings.push({
      path,
      phase: "lint",
      ruleId: message.ruleId,
      messageId: message.messageId ?? "syntax",
      line: message.line ?? 1,
      column: message.column ?? 1,
      ...(message.endLine
        ? { endLine: message.endLine, endColumn: message.endColumn }
        : {}),
    });
  }
  const syntaxValid = !result.fatalErrorCount;
  const preserved = contract.formatContract === "preserved-bytes";
  if (
    syntaxValid &&
    !preserved &&
    !(await checkJsonPresentation(
      bytes,
      contract.formatContract ?? "prettier-json",
      await jsonFormatOptions(),
    ))
  )
    findings.push({
      path,
      phase: "presentation",
      ruleId: null,
      messageId: "format-contract",
      line: 1,
      column: 1,
    });
  return admitExpected(
    {
      path,
      complete: true,
      syntaxValid,
      presentationChecked: syntaxValid && !preserved,
      findings,
    },
    bytes,
    contract,
  );
}

/** Exact expectations retain failures visibly; unexpected or missing findings fail.
 * The independently owned byte identity prevents learning acceptance from a
 * changed candidate. Expected failures never enable writes or later parse phases.
 */
export function admitExpected(result, bytes, contract) {
  const expected = contract.expected;
  if (expected?.linkedDocuments)
    throw new Error(
      "Expected container diagnostics require verified logical linkage.",
    );
  if (!expected) {
    if (contract.formatContract === "preserved-bytes")
      throw new Error(
        "Preserved presentation requires independent byte identity.",
      );
    return { ...result, expectedFindings: [] };
  }
  if (
    contract.allowFormatWrites !== false ||
    !contract.exceptions?.some(
      (entry) => entry.owner?.trim() && entry.reason?.trim(),
    )
  )
    throw new Error(
      "Expected diagnostics require a protected owner/reason contract.",
    );
  const actual = result.findings
    .filter((f) => f.phase !== "presentation")
    .map(({ path: _path, ...finding }) => finding);
  const matched =
    bytes.byteLength === expected.byteLength &&
    createHash("sha256").update(bytes).digest("hex") === expected.sha256 &&
    isDeepStrictEqual(actual, expected.diagnostics);
  if (!matched) {
    result.findings.push({
      path: result.path,
      phase: "expectation",
      ruleId: null,
      messageId: "expected-bytes-or-diagnostics-mismatch",
      line: 1,
      column: 1,
    });
    return { ...result, expectedFindings: [] };
  }
  const expectedFindings = result.findings.filter(
    (f) => f.phase !== "presentation",
  );
  result.findings = result.findings.filter((f) => f.phase === "presentation");
  return {
    ...result,
    expectedFindings,
    presentationContractVerified: contract.formatContract === "preserved-bytes",
  };
}
