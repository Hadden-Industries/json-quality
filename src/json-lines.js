// SPDX-License-Identifier: AGPL-3.0-only
import { decodeJsonBytes, assertNfcPreservationContract } from "./quality.js";
import { checkJsonDocument, admitExpected } from "./documents.js";
import { DEFAULT_LIMITS } from "./limits.js";
import { jsonPointerValue } from "./json-pointers.js";

/** Frame JSON Lines without changing envelopes; each record needs strict analysis. */
export async function checkJsonLines(bytes, contract = {}) {
  assertNfcPreservationContract(contract);
  if (contract.preserveNfcValues?.some((pin) => !pin.record))
    throw new TypeError(
      "JSONL NFC preservation requires a unique record selector.",
    );
  const path = contract.path ?? "input.jsonl";
  const formatContract =
    contract.formatContract ?? "producer-json-compact-body";
  if (
    !["producer-json-compact-body", "preserved-bytes"].includes(formatContract)
  )
    throw new Error(`Unsupported JSONL presentation contract: ${path}`);
  let text;
  try {
    text = decodeJsonBytes(bytes);
  } catch {
    return admitExpected(
      {
        path,
        complete: true,
        syntaxValid: false,
        presentationChecked: false,
        recordCount: null,
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
      },
      bytes,
      contract,
    );
  }
  const lines = text.split("\n");
  if (lines.at(-1) === "") lines.pop();
  if (lines.length > (contract.maxRecords ?? DEFAULT_LIMITS.maxRecords))
    throw new Error(`JSONL record limit exceeded: ${path}`);
  const findings = [];
  const selections = (contract.preserveNfcValues ?? []).map((pin) => ({
    pin,
    matches: 0,
  }));
  let syntaxValid = true;
  const preserved = contract.formatContract === "preserved-bytes";
  if (!lines.length) {
    syntaxValid = false;
    findings.push({
      path,
      phase: "framing",
      ruleId: null,
      messageId: "empty-json-lines",
      line: 1,
      column: 1,
    });
  }
  for (const [index, line] of lines.entries()) {
    const record = index + 1;
    if (!line.trim()) {
      findings.push({
        path,
        phase: "framing",
        ruleId: null,
        messageId: "blank-json-line",
        line: record,
        column: 1,
        record,
      });
      syntaxValid = false;
      continue;
    }
    const selectedPins = [];
    if (selections.length) {
      let value;
      try {
        value = JSON.parse(line);
      } catch {
        /* Native analysis below retains syntax diagnostics. */
      }
      for (const selection of selections) {
        if (
          jsonPointerValue(value, selection.pin.record.pointer) !==
          selection.pin.record.value
        )
          continue;
        selection.matches++;
        const { pointer, sha256, byteLength } = selection.pin;
        selectedPins.push({ pointer, sha256, byteLength });
      }
    }
    const analyzed = await checkJsonDocument(
      Buffer.from(line.endsWith("\r") ? line.slice(0, -1) : line),
      {
        ...contract,
        expected: undefined,
        preserveNfcValues: selectedPins.length ? selectedPins : undefined,
        path,
        formatContract: "producer-json-compact-body",
      },
    );
    syntaxValid &&= analyzed.syntaxValid;
    for (const finding of analyzed.findings) {
      if (preserved && finding.phase === "presentation") continue;
      findings.push({
        ...finding,
        line: finding.line + index,
        ...(finding.endLine ? { endLine: finding.endLine + index } : {}),
        record,
      });
    }
  }
  if (selections.some((selection) => selection.matches !== 1))
    findings.push({
      path,
      phase: "expectation",
      ruleId: null,
      messageId: "nfc-record-identity-mismatch",
      line: 1,
      column: 1,
    });
  return admitExpected(
    {
      path,
      complete: true,
      syntaxValid,
      presentationChecked: syntaxValid && !preserved,
      recordCount: lines.length,
      findings,
    },
    bytes,
    contract,
  );
}
