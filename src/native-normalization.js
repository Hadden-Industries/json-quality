// SPDX-License-Identifier: AGPL-3.0-only
// Retained bounded explicit NFC transformation, using the shared ICU/rule facts.
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { NativeSession } from "./native-session.js";
import {
  createValueSession,
  createTransformValueSession,
} from "./value-session.js";
import { resolveExecutionResources } from "./execution-resources.js";
import { remainingDuration } from "./execution-deadline.js";
import { encodeNativeControl } from "./native-control.js";
import {
  admitTransformSource,
  transformResources,
  transformWorkspaceReservation,
  retainedTransformResult,
} from "./transform-capabilities.js";

/** Internal composition seam for a verified installed component. No source file
 * is written. Only string/key literal spans change; native collisions, unsafe
 * values and grammar failures prevent output. There is no giant write fallback.
 */
/** @overload
 * @param {string} text
 * @param {{core: unknown, [key: string]: unknown}} options
 * @returns {Promise<ReturnType<typeof retainedTransformResult>>}
 */
/** @overload
 * @param {string} text
 * @param {{core?: undefined, [key: string]: unknown}} options
 * @returns {Promise<string>}
 */
export async function normalizeSource(
  /** @type {*} */ text,
  /** @type {*} */ {
    component,
    temporaryDirectory,
    allowEmptyKeys,
    normalization = "NFC",
    preserveNfcValues,
    capacityLimits,
    runtimeControls,
    transformControls,
    signal,
    core: executionCore,
    parentSource,
    controlStateBytes = "0",
  } = {},
) {
  const controls = transformResources(undefined, transformControls),
    sourceBytes = admitTransformSource(text, controls);
  if (normalization !== "NFC" || preserveNfcValues?.length)
    throw new Error("Preserved JSON string identity cannot be normalized.");
  const began = performance.now(),
    selected = resolveExecutionResources(
      {},
      { capacityLimits, runtimeControls },
    ),
    core =
      executionCore ??
      new NativeSession(
        component,
        join(temporaryDirectory, "json-quality-normalize-" + randomUUID()),
      ),
    values = executionCore
      ? createTransformValueSession(core, {
          parentSource,
          onCapture: (/** @type {*} */ capture) => {
            latestCapture = capture;
          },
        })
      : createValueSession(core),
    /** @type {any[]} */ patches = [];
  let bytes,
    original,
    patchBytes = 0,
    terminal,
    latestCapture;
  const contract = {
    checkPresentation: false,
    normalization: "NFC",
    allowEmptyKeys,
  };
  try {
    if (!executionCore) await core.configure(selected.native);
    await core.command(
      executionCore ? "resize-control-state" : "adopt-control-state",
      {
        byteLength: String(
          BigInt(controlStateBytes) +
            BigInt(transformWorkspaceReservation(sourceBytes, controls)),
        ),
      },
    );
    bytes = Buffer.from(text);
    for await (const event of values.check([bytes], contract, {
      retainValues: true,
      signal,
    })) {
      if (event.type === "source") original = event.source;
      if (event.type === "terminal") terminal = event;
      if (event.type !== "finding") continue;
      if (
        event.ruleId !== "json-quality/normalized-strings" ||
        event.messageId !== "unnormalized"
      )
        throw new Error(
          event.messageId === "collision"
            ? "NFC would create duplicate keys; resolve the owning source first."
            : "Cannot normalize invalid or unsafe JSON source.",
        );
      if (
        controls.maximumNormalizationChanges !== null &&
        patches.length >= controls.maximumNormalizationChanges
      )
        throw new Error("transform-change-capacity");
      const description = await values.describe(event.value),
        lease = await values.materialize(
          event.value,
          "nfc-utf8",
          controls.maximumOutputBytes === null
            ? String(description.nfcByteLength)
            : String(controls.maximumOutputBytes),
        );
      try {
        const replacement = encodeNativeControl(
          new TextDecoder("utf-8", { fatal: true }).decode(lease.bytes),
          controls.maximumOutputBytes,
        );
        patchBytes += replacement.length;
        if (
          controls.maximumOutputBytes !== null &&
          patchBytes > controls.maximumOutputBytes
        )
          throw new Error("transform-output-capacity");
        patches.push({
          offset: Number(description.sourceByteOffset),
          length: Number(description.rawByteLength),
          bytes: replacement,
        });
      } finally {
        await lease.release();
      }
    }
    if (
      !terminal?.parserComplete ||
      !terminal.rulesComplete ||
      !terminal.diagnosticsComplete
    )
      throw new Error("incomplete-normalization-preflight");
    let output = bytes;
    if (patches.length) {
      patches.sort((left, right) => left.offset - right.offset);
      const size =
        bytes.length +
        patches.reduce(
          (sum, patch) => sum + patch.bytes.length - patch.length,
          0,
        );
      if (
        controls.maximumOutputBytes !== null &&
        size > controls.maximumOutputBytes
      )
        throw new Error("transform-output-capacity");
      output = Buffer.alloc(size);
      let sourceOffset = 0,
        targetOffset = 0;
      for (const patch of patches) {
        if (
          !Number.isSafeInteger(patch.offset) ||
          !Number.isSafeInteger(patch.length) ||
          patch.offset < sourceOffset ||
          patch.offset + patch.length > bytes.length
        )
          throw new Error("normalization-span-contract");
        const unchanged = bytes.subarray(sourceOffset, patch.offset);
        output.set(unchanged, targetOffset);
        targetOffset += unchanged.length;
        output.set(patch.bytes, targetOffset);
        targetOffset += patch.bytes.length;
        sourceOffset = patch.offset + patch.length;
      }
      output.set(bytes.subarray(sourceOffset), targetOffset);
      // Verify the complete derived bytes with the same selected reader rules.
      let checked;
      for await (const event of values.check([output], contract, {
        retainValues: Boolean(executionCore),
        transformOf: original,
        signal,
      }))
        if (event.type === "terminal") checked = event;
      if (!checked?.qualityPassed || !checked.contractSatisfied)
        throw new Error("normalization-postcondition");
    }
    signal?.throwIfAborted();
    remainingDuration(selected.runtime.maxCheckTimeMs, began);
    const outputText = output.toString("utf8");
    if (executionCore) {
      return retainedTransformResult(outputText, latestCapture, () =>
        core.command("resize-control-state", { byteLength: controlStateBytes }),
      );
    }
    return outputText;
  } finally {
    await values.close();
  }
}
