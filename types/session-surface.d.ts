/** Private seam used by installed resolution and exact-artifact qualification. */
export declare function createSourceSession(
  /** @type {*} */ component: any,
  /** @type {*} */ options?: any,
): Promise<
  Readonly<{
    [k: string]: any;
  }>
>;
/** Private repository seam; native provider code is injected by the trusted
 * caller and never selected from a module/executable path in policy data.
 */
export declare function createRepositorySession(
  /** @type {*} */ component: any,
  /** @type {*} */ options?: any,
): Promise<
  Readonly<{
    [k: string]: any;
  }>
>;
