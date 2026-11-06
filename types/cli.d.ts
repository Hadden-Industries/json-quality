#!/usr/bin/env node
/** Backpressured CLI delivery; a terminal is never a substitute for cleanup. */
export declare function runJsonQualityCli(
  /** @type {string[]} */ args: string[],
  /** @type {import("./api-types.js").CliContext | (() => import("./api-types.js").CliContext | Promise<import("./api-types.js").CliContext>)} */ context?:
    | import("./api-types.js").CliContext
    | (() =>
        | import("./api-types.js").CliContext
        | Promise<import("./api-types.js").CliContext>),
): Promise<number>;
