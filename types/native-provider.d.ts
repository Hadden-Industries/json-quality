/** Reconcile independent provenance, inventory and member streams. The caller
 * injects trusted provider code; policy data never selects executable modules.
 */
export declare function checkNativeProvider(
  /** @type {*} */ {
    root,
    session,
    definition,
    provider,
    contractFor,
    signal,
    retainValues,
    retainValuesFor,
  }: any,
): AsyncGenerator<any, void, unknown>;
/** Revalidate native authority files without retaining a JS snapshot inventory. */
export declare function recheckNativeAuthorities(
  /** @type {*} */ { root, session, signal }: any,
): Promise<void>;
