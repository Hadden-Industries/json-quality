/** Lexical containment includes equality; callers own filesystem admission. */
export declare function isPathContained(
  /** @type {*} */ root: any,
  /** @type {*} */ path: any,
): boolean;
/** File identities are canonical repository-relative paths, never tool globs. */
export declare function assertRepositoryPath(/** @type {*} */ path: any): void;
/** Admit regular files through regular ancestors and verify real containment. */
export declare function assertRegularSource(
  /** @type {*} */ root: any,
  /** @type {*} */ path: any,
  /** @type {*} */ mode?: any,
): any;
/** Admit one traversed directory through regular ancestors inside the root. */
export declare function assertRegularDirectory(
  /** @type {*} */ root: any,
  /** @type {*} */ path: any,
): any;
