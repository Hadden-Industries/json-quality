/** Open a backpressured source checker and lossless value reader. Close after
 * consuming events and references; borrowed capabilities never outlive it.
 * @param {import("./api-types.js").SessionOptions} options
 * @returns {Promise<import("./api-types.js").JsonSourceSession>}
 */
export declare function openJsonSourceSession(
  options: import("./api-types.js").SessionOptions,
): Promise<import("./api-types.js").JsonSourceSession>;
/** Open complete physical/native/logical repository checking under its bounded,
 * strictly admitted policy. Only execution-terminal closes all obligations.
 * @param {import("./api-types.js").RepositoryOptions} options
 * @returns {Promise<import("./api-types.js").JsonRepositorySession>}
 */
export declare function openJsonRepositorySession(
  options: import("./api-types.js").RepositoryOptions,
): Promise<import("./api-types.js").JsonRepositorySession>;
