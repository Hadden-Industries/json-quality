// SPDX-License-Identifier: AGPL-3.0-only
// One isolated synthetic workload; native diagnostic events observe real children.
import { subscribe, unsubscribe } from "node:diagnostics_channel";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const [sourceRoot, root, operation] = process.argv.slice(2),
  children = [],
  phases = {},
  peak = { rss: 0, heapUsed: 0, external: 0, arrayBuffers: 0 },
  began = performance.now();
function sample() {
  const memory = process.memoryUsage();
  for (const key of Object.keys(peak))
    peak[key] = Math.max(peak[key], memory[key]);
}
const observe = ({ process: child }) => {
  const started = performance.now();
  child.once("spawn", () => {
    const args = child.spawnargs,
      role = args.includes("check-ignore")
        ? "git-ignore"
        : args.includes("ls-files")
          ? "git-census"
          : args.includes("--debug-check")
            ? "prettier-debug"
            : "other";
    const entry = {
      role,
      startMs: started - began,
      durationMs: null,
      code: null,
    };
    children.push(entry);
    child.once("close", (code) => {
      entry.durationMs = performance.now() - started;
      entry.code = code;
    });
  });
};
subscribe("child_process", observe);
const sampler = setInterval(sample, 10);
let session,
  terminal,
  managedPeakBytes = 0n,
  scratchPeakBytes = 0n;
function recordEvent(event) {
  const phase = (phases[event.type] ??= {
    count: 0,
    firstMs: performance.now() - began,
  });
  phase.count++;
  phase.lastMs = performance.now() - began;
  if (event.managedPeakBytes)
    managedPeakBytes =
      BigInt(event.managedPeakBytes) > managedPeakBytes
        ? BigInt(event.managedPeakBytes)
        : managedPeakBytes;
  if (event.scratchPeakBytes)
    scratchPeakBytes =
      BigInt(event.scratchPeakBytes) > scratchPeakBytes
        ? BigInt(event.scratchPeakBytes)
        : scratchPeakBytes;
  terminal = event;
  sample();
}
try {
  const { openJsonRepositorySession } = await import(
    pathToFileURL(join(sourceRoot, "src/index.js"))
  );
  session = await openJsonRepositorySession({ root });
  for await (const event of session.events()) recordEvent(event);
  if (
    terminal?.type !== "execution-terminal" ||
    !terminal.sourceObservationsComplete
  )
    throw new Error("Incomplete benchmark census: " + JSON.stringify(terminal));
  if (operation !== "check") {
    const files = operation === "normalize" ? ["000000.json"] : undefined;
    for await (const event of session.rewrite(
      operation,
      files ? { files } : {},
    ))
      recordEvent(event);
    if (terminal?.type !== "write-terminal" || !terminal.complete)
      throw new Error(terminal?.message ?? "Incomplete benchmark rewrite.");
  } else if (!terminal.contractSatisfied)
    throw new Error("Benchmark check failed.");
  await session.close();
  session = undefined;
  sample();
  process.stdout.write(
    JSON.stringify({
      durationMs: performance.now() - began,
      children,
      phases,
      peak,
      managedPeakBytes: String(managedPeakBytes),
      scratchPeakBytes: String(scratchPeakBytes),
      terminal: {
        type: terminal.type,
        complete: terminal.complete,
        members: terminal.members,
        written: terminal.written,
      },
    }) + "\n",
  );
} finally {
  await session?.close();
  clearInterval(sampler);
  unsubscribe("child_process", observe);
}
