/** Internal effect owner for one completed retained repository execution. It
 * never collects file bodies/candidates in JS. Policy is formatted last so its
 * frozen observation governs every earlier effect. Failure reports confirmed
 * writes and an uncertain current path; no batch-atomicity claim is made.
 */
export declare function rewriteRepository(
  /** @type {*} */ execution: any,
  /** @type {*} */ { root, gitExecutable }: any,
  /** @type {*} */ operation: any,
  /** @type {*} */ options?: any,
): AsyncGenerator<any, void, unknown>;
