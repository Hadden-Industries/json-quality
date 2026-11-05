// SPDX-License-Identifier: AGPL-3.0-only
// Own one failure delivery; acknowledge only after its actual output callback.
const target = process.argv[2] === "stderr" ? process.stderr : process.stdout;
let failed = false;
const fail = () => {
  failed = true;
  process.exitCode = 2;
  process.stdin.destroy();
  if (process.connected) process.disconnect?.();
};
target.on("error", fail);
process.stdin.on("error", fail);
try {
  for await (const bytes of process.stdin) {
    await new Promise((done, reject) => {
      target.write(bytes, (error) => (error ? reject(error) : done(undefined)));
    });
  }
  if (!failed && process.connected)
    process.send?.({ delivered: true }, () => {
      if (process.connected) process.disconnect?.();
    });
} catch {
  fail();
}
