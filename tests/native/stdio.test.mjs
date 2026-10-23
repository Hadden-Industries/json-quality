// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { isAbsolute, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";
import { installedNativeComponent } from "../../src/installed-component.js";

test(
  "a standard-library Python host qualifies the packaged non-Node executable, real spill and malformed transport",
  { timeout: 300000 },
  async () => {
    const verifiedComponent = await installedNativeComponent();
    // Resolve launcher aliases before sampling: the measured parent must be
    // this Node driver, rather than an unobserved Python launcher process.
    const { stdout: selectedPython } = await promisify(execFile)(
      process.platform === "win32" ? "python" : "python3",
      ["-c", "import sys; print(sys.executable)"],
      { timeout: 10000, windowsHide: true, maxBuffer: 4096 },
    );
    const python = selectedPython.trim();
    assert.ok(isAbsolute(python));
    const { stdout, stderr } = await promisify(execFile)(
      python,
      [
        fileURLToPath(new URL("./stdio_probe.py", import.meta.url)),
        join(
          verifiedComponent.directory,
          `json-quality-native${process.platform === "win32" ? ".exe" : ""}`,
        ),
        join(verifiedComponent.directory, "component.json"),
        tmpdir(),
        String(process.pid),
      ],
      { timeout: 290000, windowsHide: true, maxBuffer: 65536 },
    );
    assert.equal(stderr, "");
    const report = JSON.parse(stdout);
    assert.equal(
      report.sourceInputsSha256,
      verifiedComponent.manifest.sourceInputsSha256,
    );
    assert.deepEqual(
      report.scalars.map(({ mebibytes }) => mebibytes),
      [0, 8, 32, 128],
    );
    assert.equal(report.faults.length, 5);
    assert.equal(report.lateUtf8.contractSatisfied, false);
    assert.ok(report.cancellation.seconds < 5);
    // Keep independently sampled working sets and internal ledgers in the run log.
    console.log(JSON.stringify(report));
  },
);
