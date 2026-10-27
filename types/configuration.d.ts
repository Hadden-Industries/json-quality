/** Input is already strictly parsed or caller-owned typed control data.
 * @param {unknown} policy
 * @returns {import("./api-types.js").JsonQualityPolicy}
 */
export declare function admitJsonPolicy(
  policy: unknown,
): import("./api-types.js").JsonQualityPolicy;
/** Sparse exceptions amend mandatory defaults; contradictory overlaps fail closed.
 * @param {string} path
 * @param {import("./api-types.js").JsonQualityPolicy} policy
 * @param {{tracked?: boolean}} [options]
 * @returns {import("./api-types.js").JsonContract}
 */
export declare function jsonContract(
  path: string,
  policy: import("./api-types.js").JsonQualityPolicy,
  {
    tracked,
  }?: {
    tracked?: boolean;
  },
): import("./api-types.js").JsonContract;
/** Narrow value preservation is independently pinned, owner-attributed and
 * write-protected. It cannot coexist with whole-file or expected-negative waivers.
 */
export declare function assertNfcPreservationContract(
  /** @type {*} */ contract: any,
): void;
