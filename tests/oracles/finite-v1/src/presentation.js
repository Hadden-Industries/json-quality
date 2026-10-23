// SPDX-License-Identifier: AGPL-3.0-only
import * as prettier from "prettier";
import { fileURLToPath } from "node:url";
import formatOptions from "./json-format-options.json" with { type: "json" };
import { decodeJsonBytes } from "./json-bytes.js";

/** Explicit native CLI configuration shares the API options without consumer discovery. */
export const JSON_FORMAT_OPTIONS_PATH = fileURLToPath(
  new URL("./json-format-options.json", import.meta.url),
);

/** Policy resolution and direct JSONL analysis enforce the same framing presentation. */
export function jsonLinesPresentationContract(
  path,
  formatContract = "producer-json-compact-body",
) {
  if (
    !["producer-json-compact-body", "preserved-bytes"].includes(formatContract)
  )
    throw new Error(`Unsupported JSONL presentation contract: ${path}`);
  return formatContract;
}

/** The package owns the standard JSON presentation options. */
export async function jsonFormatOptions() {
  return { ...formatOptions };
}

/** Read-only native presentation, shared with producer/packed-target checks. */
export async function checkJsonPresentation(bytes, formatContract, options) {
  let text = decodeJsonBytes(bytes);
  if (formatContract === "producer-json-body") {
    text = text.replaceAll("\r\n", "\n");
    if (!text.endsWith("\n")) text += "\n";
  } else if (
    [
      "producer-json-indent",
      "producer-json-indent-body",
      "producer-json-compact",
      "producer-json-compact-body",
    ].includes(formatContract)
  ) {
    // Existing producers use the platform serializer; validate its exact bytes.
    const pretty = !formatContract.startsWith("producer-json-compact");
    if (formatContract.endsWith("-body")) {
      text = text.replaceAll("\r\n", "\n");
      if (!text.endsWith("\n")) text += "\n";
    }
    // json-identity-contract: bytes; owner: JSON producer presentation gate; reason: Validate the exact native serializer presentation including indentation and final LF.
    const expected =
      JSON.stringify(JSON.parse(text), null, pretty ? 2 : undefined) + "\n";
    return text === expected;
  } else if (formatContract !== "prettier-json")
    throw new Error(`Unknown JSON formatting contract: ${formatContract}`);
  return prettier.check(text, options);
}
