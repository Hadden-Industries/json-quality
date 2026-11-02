// SPDX-License-Identifier: AGPL-3.0-only
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** npm's POSIX bin entry is a symlink; argv retains that spelling while ESM
 * normally resolves it. Imports from another entry must remain side-effect free.
 */
export function isMainModule(/** @type {string} */ moduleUrl) {
  if (!process.argv[1]) return false;
  try {
    return (
      realpathSync(process.argv[1]) === realpathSync(fileURLToPath(moduleUrl))
    );
  } catch {
    // An embedding host may use an argv label that is not a readable file.
    return false;
  }
}
