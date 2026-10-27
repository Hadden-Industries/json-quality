// SPDX-License-Identifier: AGPL-3.0-only
// Explicit finite Prettier transformation; shared native facts own validation.
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";
import formatOptions from "./json-format-options.json" with { type: "json" };
import { NativeSession } from "./native-session.js";
import { resolveExecutionResources } from "./execution-resources.js";
import { runBoundedTool } from "./bounded-process.js";
import {
  admitTransformSource,
  formatWorkspaceReservation,
  retainedTransformResult,
  JSON_TRANSFORM_CAPABILITIES,
} from "./transform-capabilities.js";

async function checked(
  /** @type {*} */ core,
  /** @type {*} */ bytes,
  /** @type {*} */ contract,
  /** @type {*} */ transformOf,
) {
  const source = await core.capture([bytes], contract, {
    retainValues: true,
    transformOf,
  });
  let terminal;
  for await (const event of core.events())
    if (event.type === "terminal") terminal = event;
  if (!terminal?.qualityPassed || !terminal.contractSatisfied)
    throw new Error("Cannot format invalid or unsafe JSON source.");
  return source;
}

/** Internal verified-component seam. The materializing writer capability is
 * admitted before body copies; a large or complex source may exceed its working
 * allowance even when a scalable read/check succeeds. It never writes a file.
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
export async function formatSource(
  /** @type {*} */ text,
  /** @type {*} */ {
    component,
    temporaryDirectory,
    allowEmptyKeys,
    normalization = "NFC",
    preserveNfcValues,
    allowFormatWrites,
    owner,
    reason,
    capacityLimits,
    runtimeControls,
    signal,
    core: executionCore,
    parentSource,
    controlStateBytes = "0",
  } = {},
) {
  const size = admitTransformSource(text),
    began = performance.now(),
    selected = resolveExecutionResources(
      {},
      { capacityLimits, runtimeControls },
    ),
    operationSignal = AbortSignal.any([
      AbortSignal.timeout(selected.runtime.maxCheckTimeMs),
      ...(signal ? [signal] : []),
    ]);
  operationSignal.throwIfAborted();
  const core =
      executionCore ??
      new NativeSession(
        component,
        join(temporaryDirectory, "json-quality-format-" + randomUUID()),
      ),
    abort = () => core.cancel(),
    contract = {
      checkPresentation: false,
      normalization,
      allowEmptyKeys,
      preserveNfcValues,
      allowFormatWrites,
      owner,
      reason,
    };
  operationSignal.addEventListener("abort", abort, { once: true });
  try {
    if (!executionCore) await core.configure(selected.native);
    await core.command(
      executionCore ? "resize-control-state" : "adopt-control-state",
      {
        byteLength: String(
          BigInt(controlStateBytes) + BigInt(formatWorkspaceReservation(size)),
        ),
      },
    );
    const bytes = Buffer.from(text),
      original = await checked(core, bytes, contract, parentSource),
      facts = (
        await core.command("source-statistics", { source: original.source })
      ).result,
      workspace = formatWorkspaceReservation(size, Number(facts.indexedValues));
    await core.command("resize-control-state", {
      byteLength: String(BigInt(controlStateBytes) + BigInt(workspace)),
    });
    operationSignal.throwIfAborted();
    const output = await prettier.format(
      text,
      /** @type {import("prettier").Options} */ ({ ...formatOptions }),
    );
    operationSignal.throwIfAborted();
    if (
      Buffer.byteLength(output) > JSON_TRANSFORM_CAPABILITIES.maximumOutputBytes
    )
      throw new Error("transform-output-capacity");
    if (output !== text) {
      const remaining = Math.floor(
        selected.runtime.maxCheckTimeMs - (performance.now() - began),
      );
      await runBoundedTool(
        process.execPath,
        [
          fileURLToPath(import.meta.resolve("prettier/bin/prettier.cjs")),
          "--debug-check",
          "--config",
          fileURLToPath(new URL("./json-format-options.json", import.meta.url)),
          "--no-editorconfig",
        ],
        {
          input: bytes,
          signal: operationSignal,
          timeout: Math.min(
            remaining,
            selected.admission.maxToolTimeMs ?? remaining,
          ),
          maximumOutputBytes: Math.min(
            65536,
            selected.admission.maxToolOutputBytes ?? 65536,
          ),
        },
      );
    }
    const derived = await checked(
        core,
        Buffer.from(output),
        {
          ...contract,
          checkPresentation: true,
          formatContract: "prettier-json",
        },
        original.source,
      ),
      comparison = (
        await core.command("compare-sources", {
          first: original.source,
          second: derived.source,
        })
      ).result;
    if (!comparison.sameMeaning)
      throw new Error("Formatter changed JSON meaning or number lexemes.");
    operationSignal.throwIfAborted();
    if (executionCore) {
      return retainedTransformResult(output, derived, () =>
        core.command("resize-control-state", { byteLength: controlStateBytes }),
      );
    }
    return output;
  } finally {
    operationSignal.removeEventListener("abort", abort);
    if (!executionCore) await core.close();
  }
}
