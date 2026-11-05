/** Default refusal remains finite; explicit null removes the package ceiling.
 * This allowance starts after the failed operation, not inside its spent budget.
 * @returns {Promise<bigint>} Number of completely delivered bytes; zero on refusal.
 */
export declare function writeCliFailure(
  /** @type {*} */ error: any,
  /** @type {{requestId: string, machine?: boolean, resources?: any, usedOutputBytes?: bigint, code?: string, signal?: AbortSignal}} */ {
    requestId,
    machine,
    resources,
    usedOutputBytes,
    code,
    signal,
  }: {
    requestId: string;
    machine?: boolean;
    resources?: any;
    usedOutputBytes?: bigint;
    code?: string;
    signal?: AbortSignal;
  },
): Promise<bigint>;
