// SPDX-License-Identifier: AGPL-3.0-only
// Supported factories acquire only the exact component shipped with this package.
import { installedNativeComponent } from "./installed-component.js";
import {
  createSourceSession,
  createRepositorySession,
} from "./session-surface.js";

/** Open a backpressured source checker and lossless value reader. Close after
 * consuming events and references; borrowed capabilities never outlive it.
 * @param {import("./api-types.js").SessionOptions} options
 * @returns {Promise<import("./api-types.js").JsonSourceSession>}
 */
export async function openJsonSourceSession(options) {
  return /** @type {import("./api-types.js").JsonSourceSession} */ (
    await createSourceSession(await installedNativeComponent(), options)
  );
}

/** Open complete physical/native/logical repository checking under its bounded,
 * strictly admitted policy. Only execution-terminal closes all obligations.
 * @param {import("./api-types.js").RepositoryOptions} options
 * @returns {Promise<import("./api-types.js").JsonRepositorySession>}
 */
export async function openJsonRepositorySession(options) {
  return /** @type {import("./api-types.js").JsonRepositorySession} */ (
    await createRepositorySession(await installedNativeComponent(), options)
  );
}
