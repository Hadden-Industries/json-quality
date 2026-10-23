// SPDX-License-Identifier: AGPL-3.0-only
// Child lifetime lets Windows unload both test DLLs before parent cleanup.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
import { nativeFrame, decodeNativeFrames } from "../../src/native-session.js";
import { encodeNativeControl } from "../../src/native-control.js";
import cohort from "../../schemas/contract-cohort.json" with { type: "json" };

const [original, copy, directory] = process.argv.slice(2),
  require = createRequire(import.meta.url),
  owner = require(original),
  foreign = require(copy),
  own = owner.create(join(directory, "own")),
  other = foreign.create(join(directory, "other"));
try {
  assert.throws(() => foreign.hello(own), /native-session-type/);
  assert.throws(() => owner.hello(other), /native-session-type/);
  assert.ok(owner.hello(own).length > 0);
  assert.ok(foreign.hello(other).length > 0);
} finally {
  // Never pass a foreign handle to release, including on the red candidate.
  for (const [binding, handle] of [
    [owner, own],
    [foreign, other],
  ]) {
    const hello = decodeNativeFrames(binding.hello(handle))[0].value;
    await binding.exchange(
      handle,
      nativeFrame(
        "c",
        encodeNativeControl({
          protocolVersion: cohort.nativeProtocolVersion,
          owner: hello.owner,
          requestId: "1",
          command: "close",
        }),
      ),
    );
    binding.release(handle);
  }
}
