// SPDX-License-Identifier: AGPL-3.0-only
import { execFileSync } from "node:child_process";
import { temporaryDirectory } from "./temporary-directory.js";

/** Neutral Git setup; callers retain every policy, payload and expected decision. */
export function temporaryRepository(t, prefix) {
  const root = temporaryDirectory(t, prefix);
  execFileSync("git", ["init", "-q", root], { windowsHide: true });
  return root;
}
