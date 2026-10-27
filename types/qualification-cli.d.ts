#!/usr/bin/env node
/** Stream cohort-2 NDJSON with backpressure and a final cleaned-up verdict.
 * Output failure, cancellation or missing execution-terminal returns 2. The
 * source-only scope is declared in execution events; no candidate code runs.
 */
export declare function runJsonQualificationCli(
  /** @type {*} */ args: any,
): Promise<number>;
