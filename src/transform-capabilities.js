// SPDX-License-Identifier: AGPL-3.0-only
// Materializing effects have caller-owned quotas independent of scalable
// checking. Transformation-owned workspace has its own reservation in the same
// ledger. Runtime/OS overhead is measured separately; no read/storage selector.
import {
  resourceDefaults,
  resolveResourceProfile,
  exceedsQuota,
} from "./resource-profile.js";
export const JSON_TRANSFORM_CAPABILITIES =
  /** @type {{ readonly [K in keyof Required<import("../types/schemas/configuration.js").TransformControls>]: number }} */ (
    resourceDefaults("transformControls")
  );
export function transformResources(
  /** @type {*} */ policy,
  /** @type {*} */ invocation,
) {
  return resolveResourceProfile(
    JSON_TRANSFORM_CAPABILITIES,
    policy,
    invocation,
  );
}

/** Refuse before a UTF-8 body copy or formatter/parser is created. */
export function admitTransformSource(
  /** @type {*} */ text,
  /** @type {*} */ controls = JSON_TRANSFORM_CAPABILITIES,
) {
  if (typeof text !== "string" || !text.isWellFormed())
    throw new TypeError(
      "Transformation requires well-formed UTF-16 source text.",
    );
  const maximum = controls.maximumSourceBytes;
  if (exceedsQuota(text.length, maximum))
    throw new Error("transform-source-capacity");
  const bytes = Buffer.byteLength(text);
  if (exceedsQuota(bytes, maximum))
    throw new Error("transform-source-capacity");
  return bytes;
}

/** Reserve writer-owned UTF-16 text, UTF-8 copies and bounded patch metadata before
 * either grows. At most one change can occupy four original source bytes; the
 * independent change ceiling also remains in force. Native read leases retain
 * their separate allocation owner. V8/OS overhead is measured
 * separately from this deliberately conservative managed bookkeeping.
 */
export function transformWorkspaceReservation(
  /** @type {*} */ sourceBytes,
  /** @type {*} */ controls = JSON_TRANSFORM_CAPABILITIES,
) {
  if (
    !Number.isSafeInteger(sourceBytes) ||
    sourceBytes < 0 ||
    exceedsQuota(sourceBytes, controls.maximumSourceBytes)
  )
    throw new Error("transform-source-capacity");
  const reservation =
    sourceBytes * 16 +
    Math.min(
      controls.maximumNormalizationChanges ?? Infinity,
      Math.floor(sourceBytes / 4),
    ) *
      512 +
    65536;
  if (!Number.isSafeInteger(reservation))
    throw new Error("transform-workspace-representation");
  return reservation;
}

/** Formatter text/AST/output work and the separately owned debug-check worker
 * share this one reservation. Process runtime/RSS is measured independently.
 */
export function formatWorkspaceReservation(
  /** @type {*} */ sourceBytes,
  indexedValues = 0,
  /** @type {*} */ controls = JSON_TRANSFORM_CAPABILITIES,
) {
  if (
    !Number.isSafeInteger(sourceBytes) ||
    sourceBytes < 0 ||
    exceedsQuota(sourceBytes, controls.maximumSourceBytes) ||
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
