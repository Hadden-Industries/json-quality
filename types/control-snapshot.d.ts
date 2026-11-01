/** Copy plain JSON data without invoking input code. Bounds describe encoded
 * UTF-8 bytes, container depth and a conservative managed-workspace estimate;
 * they are not measurements of V8 heap or process RSS.
 */
export declare function snapshotControl(
  /** @type {*} */ input: any,
  /** @type {*} */ {
    maximumBytes,
    maximumDepth,
    maximumManagedBytes,
    deadline,
    retainedManagedBytes,
  }?: any,
): {
  value: any;
  encodedByteLength: bigint;
  valueNodeCount: bigint;
  managedReservationBytes: bigint;
};
export declare function freezeControl(/** @type {*} */ input: any): any;
/** Fixed-shape options admission happens before any option is evaluated. */
export declare function readControlOptions(
  /** @type {*} */ input: any,
  /** @type {string[]} */ names: string[],
): any;
