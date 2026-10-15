// SPDX-License-Identifier: AGPL-3.0-only
/** Decode strict UTF-8 without accepting a leading BOM or changing source bytes. */
export function decodeJsonBytes(bytes) {
  const text = new TextDecoder("utf-8", {
    fatal: true,
    ignoreBOM: true,
  }).decode(bytes);
  if (text.startsWith("\uFEFF"))
    throw new Error(
      "Unexpected leading UTF-8 BOM; fix the owning source or producer.",
    );
  return text;
}
