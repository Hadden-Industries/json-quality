// SPDX-License-Identifier: AGPL-3.0-only
// Explicit materializing effects have a finite capability independent of scalable
// checking. Transformation-owned workspace has its own reservation in the same
// ledger. Runtime/OS overhead is measured separately; no read/storage selector.
export const JSON_TRANSFORM_CAPABILITIES = Object.freeze({
  maximumSourceBytes: 2097152,
  maximumOutputBytes: 2097152,
  maximumNormalizationChanges: 4096,
});

/** Refuse before a UTF-8 body copy or formatter/parser is created. */
export function admitTransformSource(/** @type {*} */ text) {
  if (typeof text !== "string" || !text.isWellFormed())
    throw new TypeError(
      "Transformation requires well-formed UTF-16 source text.",
    );
  const maximum = JSON_TRANSFORM_CAPABILITIES.maximumSourceBytes;
  if (text.length > maximum) throw new Error("transform-source-capacity");
  const bytes = Buffer.byteLength(text);
  if (bytes > maximum) throw new Error("transform-source-capacity");
  return bytes;
}

/** Reserve writer-owned UTF-16 text, UTF-8 copies and bounded patch metadata before
 * either grows. At most one change can occupy four original source bytes; the
 * independent change ceiling also remains in force. Native read leases retain
 * their separate allocation owner. V8/OS overhead is measured
 * separately from this deliberately conservative managed bookkeeping.
 */
export function transformWorkspaceReservation(/** @type {*} */ sourceBytes) {
  if (
    !Number.isSafeInteger(sourceBytes) ||
    sourceBytes < 0 ||
    sourceBytes > JSON_TRANSFORM_CAPABILITIES.maximumSourceBytes
  )
    throw new Error("transform-source-capacity");
  return (
    sourceBytes * 16 +
    Math.min(
      JSON_TRANSFORM_CAPABILITIES.maximumNormalizationChanges,
      Math.floor(sourceBytes / 4),
    ) *
      512 +
    65536
  );
}

/** Formatter text/AST/output work and the separately owned debug-check worker
 * share this one reservation. Process runtime/RSS is measured independently.
 */
export function formatWorkspaceReservation(
  /** @type {*} */ sourceBytes,
  indexedValues = 0,
) {
  if (
    !Number.isSafeInteger(sourceBytes) ||
    sourceBytes < 0 ||
    sourceBytes > JSON_TRANSFORM_CAPABILITIES.maximumSourceBytes ||
    !Number.isSafeInteger(indexedValues) ||
    indexedValues < 0
  )
    throw new Error("transform-workspace-capacity");
  const bytes = sourceBytes * 24 + indexedValues * 4096 + 8388608;
  if (!Number.isSafeInteger(bytes))
    throw new Error("transform-workspace-capacity");
  return bytes;
}

/** Internal materialized transform lease within an existing execution. The
 * caller retains the working reservation until it has stored/consumed the
 * output and stopped using the borrowed text. Capture metadata remains stable.
 */
export function retainedTransformResult(
  /** @type {*} */ text,
  /** @type {*} */ capture,
  /** @type {*} */ releaseOwner,
) {
  let released = false,
    releasing;
  return Object.freeze({
    capture: Object.freeze({ ...capture }),
    get text() {
      if (released) throw new Error("released-transform");
      return text;
    },
    async release() {
      if (released) return;
      releasing ??= releaseOwner();
      try {
        await releasing;
        text = undefined;
        released = true;
      } catch (error) {
        releasing = undefined;
        throw error;
      }
    },
  });
}
