/** Observe one regular repository source for later bounded capture/revalidation. */
export declare function observeRepositorySource(
  /** @type {*} */ root: any,
  /** @type {*} */ path: any,
): {
  path: any;
  observation: string;
  byteLength: string;
};
/** Stream one observed source, checking the descriptor/path again at EOF. */
export declare function repositorySourceFragments(
  /** @type {*} */ { root, member, signal }: any,
): AsyncGenerator<Buffer<ArrayBuffer>, void, unknown>;
/** Establish an independent byte pin with bounded reads before identified
 * capture. Both passes must still match the same filesystem observation.
 */
export declare function identifyRepositorySource(
  /** @type {*} */ { root, member, signal }: any,
): Promise<any>;
/** Capture one discovered regular file without retaining a JS copy of its body. */
export declare function captureRepositorySource(
  /** @type {*} */ {
    root,
    member,
    session,
    contract,
    signal,
    retainValues,
    sourceKind,
    identity,
  }: any,
): Promise<any>;
/** Verify the discovered file still has the captured identity and exact bytes. */
export declare function recheckRepositorySource(
  /** @type {*} */ { root, member, signal }: any,
): Promise<void>;
