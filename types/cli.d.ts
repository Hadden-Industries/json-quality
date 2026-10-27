#!/usr/bin/env node
/** Stream the selected operation, returning quality 1 or incomplete/error 2.
 * Human filtering is presentation only. The final operation terminal is held
 * until owned session cleanup succeeds; output failure never returns zero.
 */
export declare function runJsonQualityCli(
  /** @type {string[]} */ args: string[],
  /** @type {import("./api-types.js").CliContext | (() => import("./api-types.js").CliContext | Promise<import("./api-types.js").CliContext>)} */ context?:
    | import("./api-types.js").CliContext
    | (() =>
        | import("./api-types.js").CliContext
        | Promise<import("./api-types.js").CliContext>),
): Promise<number>;
