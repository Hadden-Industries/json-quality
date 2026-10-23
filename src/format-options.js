// SPDX-License-Identifier: AGPL-3.0-only
import options from "./json-format-options.json" with { type: "json" };

/** Package-owned pure formatter options; callers receive an independent copy. */
export async function jsonFormatOptions() {
  return { ...options };
}
