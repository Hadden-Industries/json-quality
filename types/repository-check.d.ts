/** Iterate the adaptive index without retaining the inventory in JavaScript. */
export declare function repositoryMembers(
  /** @type {*} */ session: any,
  /** @type {*} */ signal: any,
): AsyncGenerator<any, void, unknown>;
/** Consume a complete repository through one configured session. Trusted policy
 * and provider code is injected by the execution owner, never loaded from data.
 * Source terminals are provisional execution evidence. Only the final execution
 * event establishes census, linkage, freshness and delivery completion. Domain
 * admission remains with the caller. Consumer interruption yields no verdict.
 * The caller owns session lifetime, and must close it after success or failure.
 */
export declare function checkRepository(
  /** @type {*} */ {
    root,
    session,
    capacities,
    contractFor,
    requiredOutputs,
    gitExecutable,
    nativeProviders,
    logicalProviders,
    policyObservation,
    retainValues,
    signal,
  }: any,
): AsyncGenerator<any, void, unknown>;
