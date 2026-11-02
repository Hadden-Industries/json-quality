/** Freeze the admitted bounded control object. The iterative worklist is part
 * of its conservative node reservation and cannot overflow a JS recursion stack.
 */
export declare function policyIsAbsent(
  /** @type {string} */ root: string,
): boolean;
export declare function recheckPolicyObservation(
  /** @type {*} */ { root, member, signal }: any,
): Promise<void>;
/** Internal composition seam, using the already verified package component.
 * Invocation controls govern bootstrap. The returned independent policy object
 * carries its reservation into the repository controller: adopt that charge in
 * the configured main core before creating its census or pulling source bytes.
 * Closing the bootstrap releases native storage; it does not erase this owned
 * object's accounting obligation. No overlapping native workers are retained.
 */
export declare function bootstrapJsonPolicy(
  /** @type {*} */ { root, ...options }: any,
): Promise<{
  policy: any;
  controlStateReservationBytes: string;
  observation: any;
  provenance: Readonly<{
    configurationOrigin: any;
    defaultPolicySha256: string;
    policyResolverInputsSha256: string;
    configurationByteLength?: any;
    configurationBytesSha256?: any;
    policyInputsSha256: string;
  }>;
}>;
/** Trusted identified policy transport seam. Filesystem and immutable Git data
 * share the same strict parsing, bounded materialization and Ajv admission.
 * The producer must establish its independent SHA-256 and verify it at EOF.
 */
export declare function bootstrapJsonPolicySource(
  /** @type {*} */ {
    source: identify,
    component,
    resources,
    temporaryDirectory,
    signal,
  }: any,
): Promise<{
  policy: any;
  controlStateReservationBytes: string;
  observation: any;
  provenance: Readonly<{
    configurationOrigin: any;
    defaultPolicySha256: string;
    policyResolverInputsSha256: string;
    configurationByteLength?: any;
    configurationBytesSha256?: any;
    policyInputsSha256: string;
  }>;
}>;
