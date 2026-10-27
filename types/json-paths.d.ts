export declare const JSON_SUFFIX: RegExp;
export declare const STRICT_JSON_GLOBS: string[];
/** Discovery detects unsupported dialects; qualification remains strict. */
export declare function isStrictJsonPath(/** @type {*} */ path: any): boolean;
/** JSONL uses strict JSON grammar at each physical record boundary. */
export declare function isJsonLinesPath(/** @type {*} */ path: any): any;
/** A checked source's literal identity selects its grammar/framing contract. */
export declare function jsonSourceFormat(
  /** @type {*} */ path: any,
): "json" | "jsonl";
/** An independently admitted content-addressed authority may store strict JSON
 * under an opaque filename. This exception belongs to its verified native
 * identity; ordinary files and archive members still require qualified dialects.
 * A native archive owner may also admit a .map source map as strict JSON, as
 * existing package inventories do. This does not discover ordinary map files.
 * A recognizable unsupported JSON suffix cannot disguise itself as opaque data.
 */
export declare function nativeJsonSourceFormat(
  /** @type {*} */ path: any,
  /** @type {*} */ identity: any,
): "json" | "jsonl";
/** Policy resolution and direct JSONL analysis enforce the same framing presentation. */
export declare function jsonLinesPresentationContract(
  /** @type {*} */ path: any,
  formatContract?: string,
): string;
