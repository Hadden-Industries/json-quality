export declare function runBoundedTool(
  /** @type {*} */ executable: any,
  /** @type {*} */ args: any,
  /** @type {*} */ {
    input,
    signal,
    timeout,
    maximumOutputBytes,
    acceptedExitCodes,
    cwd,
    captureOutput,
    env,
  }: any,
): Promise<any>;
