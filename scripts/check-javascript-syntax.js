// SPDX-License-Identifier: AGPL-3.0-only
import { spawnSync } from "node:child_process";

/** Native syntax admission shared by graph consumers; callers own their file census. */
export function assertJavaScriptSyntax(paths) {
  for (const path of paths) {
    const checked = spawnSync(process.execPath, ["--check", path], {
      windowsHide: true,
      encoding: "utf8",
      timeout: 10000,
    });
    if (checked.error || checked.status !== 0)
      throw new Error(
        `Module syntax check failed: ${path}\n${checked.stderr || checked.error?.message || "Native check did not complete."}`,
      );
  }
}
