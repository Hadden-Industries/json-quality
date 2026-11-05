// SPDX-License-Identifier: AGPL-3.0-only
// Workload source stays fixed; filenames and behavior arrive only as arguments.
import { spawn, spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const self = fileURLToPath(import.meta.url);
const [mode, pidPath] = process.argv.slice(2);
switch (mode) {
  case "memory": {
    const result = spawnSync(process.execPath, [self, "memory-child"], {
      encoding: "utf8",
    });
    if (result.status !== 0) process.exit(2);
    console.log(JSON.stringify({ bytes: Number(result.stdout) }));
    break;
  }
  case "memory-child": {
    const memory = Buffer.alloc(64 * 1024 * 1024, 1);
    setTimeout(() => console.log(memory.length), 300);
    break;
  }
  case "survivor":
  case "timeout": {
    const child = spawn(process.execPath, [self, "linger"], {
      stdio: "ignore",
      detached: process.platform === "win32",
    });
    writeFileSync(pidPath, String(child.pid));
    child.unref();
    if (mode === "timeout") setInterval(() => {}, 1000);
    break;
  }
  case "linger":
    setInterval(() => {}, 1000);
    break;
  case "failure":
    process.exit(7);
    break;
  default:
    throw new Error("Unknown process-observer workload: " + mode);
}
