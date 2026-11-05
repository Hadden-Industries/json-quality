/** Private verified-component seam shared with policy-aware virtual input.
 * No source bodies or complete repository inventories are opened here.
 * @returns {Promise<any>}
 */
export declare function openSelectedExecution(
  /** @type {*} */ input: any,
  /** @type {*} */ component?: any,
): Promise<any>;
/** Internal identified-component test/composition seam, never a package export. */
export declare function checkSelectedFiles(
  /** @type {*} */ input: any,
  /** @type {*} */ component?: any,
): AsyncGenerator<
  import("../types/schemas/event.js").JsonQualityEvent,
  void,
  unknown
>;
/** Check only the explicitly selected physical sources under root policy.
 * This operation never certifies complete repository acceptance.
 * @param {import("./api-types.js").FileCheckOptions} options
 * @returns {AsyncGenerator<import("./api-types.js").JsonQualityEvent>}
 */
export declare function checkJsonFiles(
  options: import("./api-types.js").FileCheckOptions,
): AsyncGenerator<import("./api-types.js").JsonQualityEvent>;
