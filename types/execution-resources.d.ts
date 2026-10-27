/** Preserve policy/invocation admission precedence, with finite runtime controls
 * resolved independently. Admission bypass removes only input/count ceilings.
 * Internal wire metadata uses decimal strings/null and never JavaScript Infinity.
 */
export declare function resolveExecutionResources(
  /** @type {*} */ policy?: any,
  /** @type {*} */ invocation?: any,
): {
  admission: any;
  runtime: any;
  wire: Readonly<{
    admission: Readonly<{
      [k: string]: string | null;
    }>;
    runtime: Readonly<{
      [k: string]: string | null;
    }>;
  }>;
  native: {
    [x: string]: string | null;
  };
};
