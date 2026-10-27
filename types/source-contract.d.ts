/** Snapshot bounded plain control data before a producer is opened. This also
 * rejects getters, custom serialization and cyclic objects before Ajv reads it.
 * @returns {import("./api-types.js").JsonSourceContract}
 */
export declare function sourceContract(
  /** @type {*} */ input: any,
): import("./api-types.js").JsonSourceContract;
