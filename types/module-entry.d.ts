/** npm's POSIX bin entry is a symlink; argv retains that spelling while ESM
 * normally resolves it. Imports from another entry must remain side-effect free.
 */
export declare function isMainModule(
  /** @type {string} */ moduleUrl: string,
): boolean;
