// SPDX-License-Identifier: AGPL-3.0-only
// File dialect identities shared by discovery, policy and explicit writers.
const STRICT_JSON_EXTENSIONS = Object.freeze(["json", "jsonld", "sarif"]);
export const JSON_SUFFIX = new RegExp(
  `\\.(?:${[...STRICT_JSON_EXTENSIONS, "jsonc", "json5", "jsonl", "ndjson"].join("|")})$`,
  "iu",
);
export const STRICT_JSON_GLOBS = STRICT_JSON_EXTENSIONS.map(
  (extension) => `**/*.${extension}`,
);

/** Discovery detects unsupported dialects; qualification remains strict. */
export function isStrictJsonPath(path) {
  return STRICT_JSON_EXTENSIONS.some((extension) =>
    path.endsWith(`.${extension}`),
  );
}

/** JSONL uses strict JSON grammar at each physical record boundary. */
export function isJsonLinesPath(path) {
  return path.endsWith(".jsonl") || path.endsWith(".ndjson");
}

/** A checked source's literal identity selects its grammar/framing contract. */
export function jsonSourceFormat(path) {
  if (isStrictJsonPath(path)) return "json";
  if (isJsonLinesPath(path)) return "jsonl";
  throw new TypeError(`Unsupported JSON source dialect: ${path}`);
}

/** An independently admitted content-addressed authority may store strict JSON
 * under an opaque filename. This exception belongs to its verified native
 * identity; ordinary files and archive members still require qualified dialects.
 * A native archive owner may also admit a .map source map as strict JSON, as
 * existing package inventories do. This does not discover ordinary map files.
 * A recognizable unsupported JSON suffix cannot disguise itself as opaque data.
 */
export function nativeJsonSourceFormat(path, identity) {
  if (
    identity?.kind === "native" &&
    identity.origin?.kind === "archive-member" &&
    /\.map$/iu.test(path)
  )
    return "json";
  if (
    identity?.kind === "native" &&
    identity.origin?.kind === "content-addressed" &&
    !JSON_SUFFIX.test(path)
  )
    return "json";
  return jsonSourceFormat(path);
}

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
