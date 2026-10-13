// SPDX-License-Identifier: AGPL-3.0-only
import { decodeJsonBytes } from "./quality.js";
import { checkJsonDocument, admitExpected } from "./documents.js";

/** Frame JSON Lines without changing envelopes; each record needs strict analysis. */
export async function checkJsonLines(bytes, contract = {}) {
  const path = contract.path ?? "input.jsonl";
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
        recordCount: 0,
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
  if (lines.length > (contract.maxRecords ?? 100000))
    throw new Error(`JSONL record limit exceeded: ${path}`);
  const findings = [];
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
    const analyzed = await checkJsonDocument(
      Buffer.from(line.endsWith("\r") ? line.slice(0, -1) : line),
      {
        ...contract,
        expected: undefined,
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
