/** Raw Git reads use the selected checkout, without inherited Git directory,
 * replacement, configuration injection or network/lazy-fetch redirection.
 */
export declare function gitReadEnvironment(): {
  GIT_NO_REPLACE_OBJECTS: string;
  GIT_NO_LAZY_FETCH: string;
  GIT_OPTIONAL_LOCKS: string;
  GIT_TERMINAL_PROMPT: string;
};
/** Read NUL-delimited Git output with bounded fragments and backpressure.
 * Stdout and stderr share the declared Git-output ceiling. Every exit, error,
 * timeout or interrupted consumer settles the owned process before returning.
 */
export declare function gitRecords(
  /** @type {*} */ executable: any,
  /** @type {*} */ root: any,
  /** @type {*} */ args: any,
  /** @type {*} */ capacities: any,
  /** @type {*} */ signal: any,
): AsyncGenerator<string, void, unknown>;
/** Discover all required physical sources without retaining a JS inventory.
 * The trusted caller supplies policy matching and a configured native session.
 * Provider inventory closure does not assert that any source has been checked.
 */
export declare function discoverRepositorySources(
  /** @type {*} */ {
    root,
    session,
    contractFor,
    capacities,
    gitExecutable,
    requiredOutputs,
    signal,
  }: any,
): Promise<any>;
/** Verify Git index membership and every walked directory remain unchanged.
 * The repository execution owner must finish this and source byte rechecks
 * before publishing overall success; census membership alone is insufficient.
 */
export declare function recheckRepositoryDiscovery(
  /** @type {*} */ { root, session, capacities, gitExecutable, signal }: any,
): Promise<void>;
/** After explicit owned replacements, mtime changes are expected. Re-enumerate
 * every original directory with bounded reads, verify its object identity and
 * every relevant child against the independently closed census. New JSON or
 * unexcluded directories refuse completion; peer bytes are rehashed separately.
 */
export declare function recheckRepositoryWriteDiscovery(
  /** @type {*} */ {
    root,
    session,
    capacities,
    gitExecutable,
    signal,
    contractFor,
  }: any,
): Promise<void>;
