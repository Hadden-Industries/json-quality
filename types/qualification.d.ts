/** Deliver cohort-3 events for all tracked candidate JSON under the immutable
 * trusted commit's policy. Candidate policy is ordinary checked data. Checkout
 * bytes and HEAD are outside this scope, so dirty work is never overwritten or
 * misrepresented as qualified. Native/logical adapters and domain validation
 * require their complete trusted repository adapter, not this source-only path.
 * Consume the iterator to its final execution-terminal; early return cancels.
 * The terminal is delivered only after native storage and subprocess cleanup.
 * @param {import("./api-types.js").QualificationOptions} options
 * @returns {AsyncGenerator<import("./api-types.js").JsonQualityEvent>}
 */
export declare function qualifyJsonConsumer(
  options: import("./api-types.js").QualificationOptions,
): AsyncGenerator<import("./api-types.js").JsonQualityEvent>;
