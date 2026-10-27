// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import {
  createExecutionDeadline,
  remainingDuration,
  minimumDuration,
} from "../src/execution-deadline.js";

test("unlimited elapsed work has no timer and still follows caller cancellation", () => {
  let time = 0,
    scheduled = 0;
  const parent = new AbortController();
  const deadline = createExecutionDeadline(null, [parent.signal], {
    now: () => time,
    schedule: () => {
      scheduled++;
    },
  });
  time = 9000000000000;
  assert.equal(deadline.remaining(), null);
  assert.equal(deadline.signal.aborted, false);
  assert.equal(scheduled, 0);
  const reason = new Error("caller cancelled");
  parent.abort(reason);
  assert.throws(
    () => deadline.remaining(),
    (error) => error === reason,
  );
  deadline.dispose();
});

test("a long selected duration expires at its deadline without a Node timer overflow", () => {
  let time = 0,
    callback;
  const waits = [],
    cleared = [];
  const deadline = createExecutionDeadline(4000000000, [], {
    now: () => time,
    schedule: (fn, delay) => {
      callback = fn;
      waits.push(delay);
      return { unref() {} };
    },
    clear: (timer) => {
      cleared.push(timer);
    },
  });
  assert.deepEqual(waits, [2147483647]);
  time = 2147483647;
  callback();
  assert.equal(deadline.signal.aborted, false);
  assert.equal(deadline.remaining(), 1852516353);
  assert.deepEqual(waits, [2147483647, 1852516353]);
  time = 4000000000;
  callback();
  assert.equal(deadline.signal.aborted, true);
  assert.equal(deadline.signal.reason.name, "TimeoutError");
  deadline.dispose();
  assert.equal(cleared.length, 1);
});

test("phase accounting and numeric controls remain meaningful beside unlimited selections", () => {
  assert.equal(remainingDuration(null, 0, 1000000000000), null);
  assert.equal(remainingDuration(100, 10, 60), 50);
  assert.throws(() => remainingDuration(100, 10, 110), {
    name: "TimeoutError",
  });
  assert.equal(minimumDuration(null, 1024), 1024);
  assert.equal(minimumDuration(3000, null, 1000), 1000);
  assert.equal(minimumDuration(null, null), null);
  for (const invalid of [undefined, 0, -1, Infinity, NaN, "01", "", false])
    assert.throws(() => createExecutionDeadline(invalid));
});
