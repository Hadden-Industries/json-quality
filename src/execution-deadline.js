// SPDX-License-Identifier: AGPL-3.0-only
// One monotonic elapsed-time owner, including explicit unlimited selections.
const maximumTimerDelay = 2147483647;

function duration(/** @type {*} */ value) {
  if (value === null) return null;
  if (typeof value !== "number" && typeof value !== "string")
    throw new TypeError("Expected a positive safe duration or null.");
  const milliseconds = Number(value);
  if (
    !Number.isSafeInteger(milliseconds) ||
    milliseconds <= 0 ||
    (typeof value !== "number" && !/^[1-9][0-9]*$/u.test(value))
  )
    throw new TypeError("Expected a positive safe duration or null.");
  return milliseconds;
}

/** Compose independently selected time quotas without inventing a default cap. */
export function minimumDuration(
  /** @type {(number | string | null)[]} */ ...values
) {
  const finite = values.map(duration).filter((value) => value !== null);
  return finite.length ? Math.min(...finite) : null;
}

/** Keep aggregate accounting across phases without creating an overflowed timer. */
export function remainingDuration(
  /** @type {number | string | null} */ maximum,
  /** @type {number} */ began,
  now = performance.now(),
) {
  const selected = duration(maximum);
  if (selected === null) return null;
  const remaining = selected - (now - began);
  if (remaining <= 0)
    throw new DOMException("Execution time quota exceeded.", "TimeoutError");
  return Math.ceil(remaining);
}

/** A caller-owned lifetime: dispose after settlement, or abort through a parent.
 * Large finite selections use representable timer slices; null creates no timer.
 */
export function createExecutionDeadline(
  /** @type {number | string | null} */ maximum,
  /** @type {(AbortSignal | undefined)[]} */ signals = [],
  /** @type {{now?: () => number, schedule?: (callback: () => void, delay: number) => any, clear?: (timer: any) => void, began?: number}} */ {
    now = () => performance.now(),
    schedule = setTimeout,
    clear = clearTimeout,
    began = now(),
  } = {},
) {
  const selected = duration(maximum),
    controller = new AbortController();
  const signal = AbortSignal.any([
    ...signals.filter((value) => value !== undefined),
    controller.signal,
  ]);
  let /** @type {*} */ timer,
    disposed = false;
  const release = () => {
    if (timer !== undefined) clear(timer);
    timer = undefined;
  };
  const expire = () =>
    controller.abort(
      new DOMException("Execution time quota exceeded.", "TimeoutError"),
    );
  const tick = () => {
    if (selected === null) return;
    const remaining = selected - (now() - began);
    if (remaining <= 0) expire();
    else {
      timer = schedule(tick, Math.min(Math.ceil(remaining), maximumTimerDelay));
      timer.unref?.();
    }
  };
  signal.addEventListener("abort", release, { once: true });
  if (selected !== null && !signal.aborted) tick();
  return Object.freeze({
    signal,
    remaining() {
      signal.throwIfAborted();
      return remainingDuration(selected, began, now());
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      release();
      signal.removeEventListener("abort", release);
    },
  });
}
