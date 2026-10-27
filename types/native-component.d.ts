/** Acquisition supplies an absolute, verified package component directory.
 * Filenames are fixed here; a manifest cannot select executable/module paths.
 * This internal boundary is not a public backend selector or download fallback.
 */
export declare function loadNativeComponent(
  /** @type {*} */ directory: any,
): Promise<
  Readonly<{
    manifest: any;
    binding: any;
    directory: any;
  }>
>;
