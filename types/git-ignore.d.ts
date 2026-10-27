export declare function gitIgnoreBatchLimits(/** @type {*} */ resources: any): {
  maximumPaths: number;
  maximumInputBytes: number;
  maximumOutputBytes: number;
  reservationBytes: number;
};
/** --non-matching provides a result for EVERY path. Missing complete records
 * cannot be mistaken for permission, even when truncation lands on a NUL.
 */
export declare function decodeGitIgnoreDecisions(
  /** @type {*} */ stdout: any,
  /** @type {*} */ paths: any,
  /** @type {*} */ code: any,
): Set<any>;
export declare function ignoredGitPaths(
  /** @type {*} */ root: any,
  /** @type {*} */ paths: any,
  /** @type {*} */ execution: any,
  /** @type {*} */ gitExecutable: any,
  /** @type {*} */ reservationBytes?: any,
): Promise<any>;
