/** @type {import('./api-types.js').ReadonlyJsonQualityPolicy} */
export declare const defaultJsonQualityPolicy: import("./api-types.js").ReadonlyJsonQualityPolicy;
export declare const defaultPolicyReservationBytes: bigint;
/** Resolve sparse plain configuration without I/O or caller-code execution.
 * Invocation-owned limits apply before untrusted configuration can select its
 * later execution limits. Workspace estimates bound this call, not JS heap.
 * @param {unknown} [configuration]
 * @param {{capacityLimits?: import('./api-types.js').CapacityLimits, runtimeControls?: import('./api-types.js').RuntimeControls}} [options]
 * @returns {import('./api-types.js').ReadonlyJsonQualityPolicy}
 */
export declare function resolveJsonQualityPolicy(
  configuration?: unknown,
  options?: {
    capacityLimits?: import("./api-types.js").CapacityLimits;
    runtimeControls?: import("./api-types.js").RuntimeControls;
  },
): import("./api-types.js").ReadonlyJsonQualityPolicy;
/** Internal accounting result used by the native bootstrap owner. */
export declare function resolvePolicySnapshot(
  /** @type {*} */ configuration: any,
  /** @type {*} */ options?: any,
): {
  policy: any;
  managedReservationBytes: bigint;
  workspaceReservationBytes: bigint;
};
/** Sparse exceptions amend mandatory defaults; contradictory overlaps fail closed.
 * @param {string} path
 * @param {import("./api-types.js").ReadonlyJsonQualityPolicy} policy
 * @param {{tracked?: boolean}} [options]
 * @returns {import("./api-types.js").JsonContract}
 */
export declare function resolveJsonSourceContract(
  path: string,
  policy: import("./api-types.js").ReadonlyJsonQualityPolicy,
  {
    tracked,
  }?: {
    tracked?: boolean;
  },
): import("./api-types.js").JsonContract;
