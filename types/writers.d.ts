/** Preserve decoded meaning, member order and exact numeric lexemes while
 * selecting the package's fixed Prettier presentation. This is a finite text
 * transformation; refusal never invokes a different reader or writes a file.
 * @param {string} text
 * @param {import("./api-types.js").WriterOptions} [options]
 * @returns {Promise<string>}
 */
export declare function formatJsonSource(
  text: string,
  options?: import("./api-types.js").WriterOptions,
): Promise<string>;
/** Serialize an already materialized plain producer value with native platform
 * JSON serialization, then apply the same bounded presentation/quality checks.
 * Producers retain ownership of their object graph and domain admission.
 * @param {import("./api-types.js").JsonValue} value
 * @param {import("./api-types.js").WriterOptions} [options]
 * @returns {Promise<string>}
 */
export declare function formatJsonValue(
  value: import("./api-types.js").JsonValue,
  options?: import("./api-types.js").WriterOptions,
): Promise<string>;
/** Explicit NFC repair changes string/key literal spans only, after collision
 * preflight. Numeric lexemes, whitespace and original member order are retained.
 * @param {string} text
 * @param {import("./api-types.js").WriterOptions} [options]
 * @returns {Promise<string>}
 */
export declare function normalizeJsonSource(
  text: string,
  options?: import("./api-types.js").WriterOptions,
): Promise<string>;
