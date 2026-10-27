/** Fixed-size metadata query rejects a tree/tag identity posing as a commit.
 * No source body is buffered through execFile.
 */
export declare function assertGitCommit(
  /** @type {*} */ { executable, root, sha, capacities, signal }: any,
): Promise<void>;
/** Select an external native executable, then bind its canonical path/identity
 * for this operation. JSON data never supplies an executable or Git arguments.
 */
export declare function gitObjectAuthority(/** @type {*} */ roots: any): {
  executable: string;
  recheck(): void;
};
/** Long tree records carry the exact byte length before any blob is opened.
 * Only one bounded record is retained; the growing census belongs to SQLite.
 */
export declare function gitTree(
  /** @type {*} */ { executable, root, sha, capacities, signal, path }: any,
): AsyncGenerator<
  {
    mode: string;
    type: string;
    oid: string;
    byteLength: string;
    path: string;
  },
  void,
  unknown
>;
export declare function assertGitJsonBlob(/** @type {*} */ member: any): void;
/** Stream and verify the actual Git object hash and declared length before EOF
 * reaches the native capture terminator. Hashing uses Git's blob framing, so a
 * successful subprocess exit alone is insufficient evidence of source identity.
 * Stderr is bounded separately; stdout is the admitted JSON payload, not a Git
 * metadata-output buffer. The owner must provide a finite operation signal.
 */
export declare function gitBlob(
  /** @type {*} */ { executable, root, member, capacities, signal }: any,
): AsyncGenerator<any, void, unknown>;
