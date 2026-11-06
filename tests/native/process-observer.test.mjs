// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const observer = fileURLToPath(
  new URL("../../scripts/observe-process-tree.py", import.meta.url),
);
const workload = fileURLToPath(
  new URL("./process-observer-workload.mjs", import.meta.url),
);
function observe(args, timeout = "5") {
  const child = spawnSync(
    process.env.PYTHON ?? "python",
    [observer, "--timeout", timeout, "--", process.execPath, workload, ...args],
    {
      encoding: "utf8",
      windowsHide: true,
      timeout: 15000,
      maxBuffer: 5 * 1024 * 1024,
    },
  );
  const diagnostic = JSON.stringify({
    mode: args[0],
    timeout,
    status: child.status,
    signal: child.signal,
    stdoutBytes: Buffer.byteLength(child.stdout ?? ""),
    stdout: child.stdout?.slice(0, 4096),
    stderr: child.stderr?.slice(0, 4096),
  });
  assert.ok(!child.error, child.error?.message + " " + diagnostic);
  try {
    return { exit: child.status, report: JSON.parse(child.stdout) };
  } catch (error) {
    throw new Error("Missing or malformed process observation: " + diagnostic, {
      cause: error,
    });
  }
}
test("tree accounting observes a real memory-heavy child independently of parent memory", () => {
  const { exit, report } = observe(["memory"]);
  assert.equal(exit, 0);
  assert.equal(report.status, "passed");
  assert.equal(JSON.parse(report.stdout).bytes, 64 * 1024 * 1024);
  assert.ok(report.peakBytes >= 64 * 1024 * 1024);
  assert.ok(report.processCount >= 3);
  assert.equal(report.cleanup, "passed");
  assert.equal(report.quiescence, "passed");
  assert.equal(
    report.method,
    process.platform === "win32" ? "windows-job" : "linux-process-group",
  );
});
test("surviving grandchildren and timeout fail observation and leave no live owned process", (t) => {
  const root = mkdtempSync(join(tmpdir(), "json-observer-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const timeout of [false, true]) {
    const path = join(
      root,
      `literal '${timeout}' ; process.exit(91); \` Ω\u2028\u2029.pid`,
    );
    const { exit, report } = observe(
      [timeout ? "timeout" : "survivor", path],
      timeout ? "0.5" : "5",
    );
    const pid = Number(readFileSync(path, "utf8"));
    assert.equal(exit, 1);
    assert.equal(report.status, "failed");
    assert.equal(
      report.cleanup,
      "passed",
      JSON.stringify({
        error: report.error,
        cleanupError: report.cleanupError,
        failures: report.failures,
      }),
    );
    assert.equal(report.timedOut, timeout);
    // Native readback, independent of the observer's claimed cleanup.
    if (process.platform === "linux") {
      try {
        assert.equal(
          readFileSync(`/proc/${pid}/stat`, "utf8")
            .split(") ")[1]
            .split(" ")[0],
          "Z",
        );
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    } else assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
  }
});
test("workload errors retain failed observation and successful cleanup", () => {
  const { exit, report } = observe(["failure"]);
  assert.equal(exit, 1);
  assert.equal(report.exitCode, 7);
  assert.equal(report.status, "failed");
  assert.equal(report.cleanup, "passed");
});

test("permanently unavailable observation cannot prevent admitted-domain termination", () => {
  const helper = fileURLToPath(
    new URL("./process-observer-failure.py", import.meta.url),
  );
  const child = spawnSync(process.env.PYTHON ?? "python", [helper], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 15000,
  });
  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(JSON.parse(child.stdout), {
    status: "failed",
    cleanup: "failed",
    terminationAttempted: true,
  });
});

test("cleanup faults retain reports and continue independent cleanup phases", () => {
  const helper = fileURLToPath(
    new URL("./process-observer-cleanup.py", import.meta.url),
  );
  const child = spawnSync(
    process.env.PYTHON ?? "python",
    [helper, process.execPath, workload],
    { encoding: "utf8", windowsHide: true, timeout: 15000 },
  );
  assert.equal(child.status, 0, child.error?.message ?? child.stderr);
});
