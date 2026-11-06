export declare function runBoundedTool(
  /** @type {*} */ executable: any,
  /** @type {*} */ args: any,
  /** @type {*} */ {
    input,
    signal,
    timeout,
    maximumOutputBytes,
    terminationGraceMs,
    acceptedExitCodes,
    cwd,
    captureOutput,
    env,
  }: any,
): Promise<any>;
