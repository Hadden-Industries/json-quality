export declare const JSON_TRANSFORM_CAPABILITIES: Readonly<{
  maximumSourceBytes: 2097152;
  maximumOutputBytes: 2097152;
  maximumNormalizationChanges: 4096;
}>;
/** Refuse before a UTF-8 body copy or formatter/parser is created. */
export declare function admitTransformSource(
  /** @type {*} */ text: any,
): number;
/** Reserve writer-owned UTF-16 text, UTF-8 copies and bounded patch metadata before
 * either grows. At most one change can occupy four original source bytes; the
 * independent change ceiling also remains in force. Native read leases retain
 * their separate allocation owner. V8/OS overhead is measured
 * separately from this deliberately conservative managed bookkeeping.
 */
export declare function transformWorkspaceReservation(
  /** @type {*} */ sourceBytes: any,
): number;
/** Formatter text/AST/output work and the separately owned debug-check worker
 * share this one reservation. Process runtime/RSS is measured independently.
 */
export declare function formatWorkspaceReservation(
  /** @type {*} */ sourceBytes: any,
  indexedValues?: number,
): number;
/** Internal materialized transform lease within an existing execution. The
 * caller retains the working reservation until it has stored/consumed the
 * output and stopped using the borrowed text. Capture metadata remains stable.
 */
export declare function retainedTransformResult(
  /** @type {*} */ text: any,
  /** @type {*} */ capture: any,
  /** @type {*} */ releaseOwner: any,
): Readonly<{
  capture: any;
  readonly text: any;
  release(): Promise<void>;
}>;
