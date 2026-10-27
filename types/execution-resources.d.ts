/** Resolve independently selected quotas without adding hidden finite ceilings.
 * An invocation object overrides only its named controls; true selects the
 * configured/default profile and false removes every quota in that group.
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
