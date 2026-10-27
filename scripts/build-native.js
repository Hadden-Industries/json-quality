// SPDX-License-Identifier: AGPL-3.0-only
/** Local entry point for the maintained, source-bound native producer. */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { budgets } from "./qualification-process.js";

export function resolveNativeCmake({
  platform = process.platform,
  environment = process.env,
} = {}) {
  if (environment.JSON_QUALITY_CMAKE) return environment.JSON_QUALITY_CMAKE;
  const available = spawnSync("cmake", ["--version"], {
    windowsHide: true,
    timeout: budgets.read,
    stdio: "ignore",
  });
  if (!available.error && available.status === 0) return "cmake";
  if (platform === "win32") {
    for (const base of [
      environment["ProgramFiles(x86)"],
      environment.ProgramFiles,
    ].filter(Boolean)) {
      const visualStudio = join(base, "Microsoft Visual Studio");
      if (!existsSync(visualStudio)) continue;
      for (const version of readdirSync(visualStudio).sort((a, b) =>
        b.localeCompare(a, "en", { numeric: true }),
      )) {
        for (const edition of [
          "BuildTools",
          "Enterprise",
          "Professional",
          "Community",
        ]) {
          const candidate = join(
            visualStudio,
            version,
            edition,
            "Common7",
            "IDE",
            "CommonExtensions",
            "Microsoft",
            "CMake",
            "CMake",
            "bin",
            "cmake.exe",
          );
          if (existsSync(candidate)) return candidate;
        }
      }
    }
  }
  throw new Error(
    "CMake is unavailable. Supply --cmake PATH or JSON_QUALITY_CMAKE; no toolchain is installed automatically.",
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (!args.includes("--cmake")) args.push("--cmake", resolveNativeCmake());
  const result = spawnSync(
    process.env.JSON_QUALITY_PYTHON ??
      (process.platform === "win32" ? "python" : "python3"),
    [fileURLToPath(new URL("../native/build.py", import.meta.url)), ...args],
    { stdio: "inherit", windowsHide: true, timeout: budgets.job },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
