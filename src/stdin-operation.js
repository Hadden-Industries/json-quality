// SPDX-License-Identifier: AGPL-3.0-only
// Scoped stdin operations share native capture, policy and finite transforms.
import { randomUUID } from "node:crypto";
import { lstatSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, sep } from "node:path";
import { installedNativeComponent } from "./installed-component.js";
import { NativeSession } from "./native-session.js";
import {
  createValueSession,
  createTransformValueSession,
} from "./value-session.js";
import { openSelectedExecution } from "./selected-check.js";
import { resolveExecutionResources } from "./execution-resources.js";
import { createExecutionDeadline } from "./execution-deadline.js";
import { stdinContract } from "./stdin-contract.js";
export { stdinContract } from "./stdin-contract.js";
import { resolveJsonSourceContract } from "./configuration.js";
import { assertRepositoryPath } from "./paths.js";
import { encodeNativeControl } from "./native-control.js";
import { sourceText } from "./retained-transform-source.js";
import { transformResources } from "./transform-capabilities.js";
import { assertJsonQualityEvent } from "./events.js";
import cohort from "../schemas/contract-cohort.json" with { type: "json" };

/** Check existing ancestors without opening virtual target contents. */
export function assertVirtualSourcePath(
  /** @type {*} */ root,
  /** @type {*} */ path,
) {
  assertRepositoryPath(path);
  let current = root;
  const parts = path.split("/");
  for (const [index, part] of parts.entries()) {
    current = join(current, part);
    let stat;
    try {
      stat = lstatSync(current);
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code === "ENOENT")
        return;
      throw error;
    }
    if (
      stat.isSymbolicLink() ||
      (index === parts.length - 1 ? !stat.isFile() : !stat.isDirectory())
    )
      throw new TypeError("Nonregular virtual source path.");
    const actual = relative(realpathSync(root), realpathSync(current))
      .split(sep)
      .join("/");
    if (actual !== parts.slice(0, index + 1).join("/"))
      throw new TypeError(
        "Virtual source path must use its actual filesystem spelling.",
      );
  }
}

/** @returns {Promise<any>} */
async function rawOwner(/** @type {*} */ options) {
  const component = await installedNativeComponent(),
    numericResources = resolveExecutionResources(
      {},
      {
        capacityLimits: options.capacityLimits,
        runtimeControls: options.runtimeControls,
      },
    ),
    directory = options.temporaryDirectory ?? tmpdir();
  if (!isAbsolute(directory))
    throw new TypeError("Temporary directory must be absolute.");
  const requestId = options.requestId ?? randomUUID();
  if (typeof requestId !== "string" || !requestId || !requestId.isWellFormed())
    throw new TypeError("Expected a well-formed request ID.");
  let requestPoints = 0;
  for (const point of requestId) {
    void point;
    if (
      numericResources.admission.maxRequestIdCodePoints !== null &&
      ++requestPoints > numericResources.admission.maxRequestIdCodePoints
    )
      throw new Error("request-id-capacity");
  }
  const controlStateBytes = String(
    encodeNativeControl(
      { requestId },
      numericResources.admission.maxRequestBytes,
    ).length *
      5 +
      512,
  );
  const core = new NativeSession(
      component,
      join(directory, "json-quality-stdin-" + randomUUID()),
    ),
    values = createValueSession(core),
    deadline = createExecutionDeadline(
      numericResources.runtime.maxCheckTimeMs,
      [options.signal],
    ),
    signal = deadline.signal;
  const abort = () => core.cancel();
  signal.addEventListener("abort", abort, { once: true });
  const close = async () => {
    try {
      await values.close();
    } finally {
      signal.removeEventListener("abort", abort);
      deadline.dispose();
    }
  };
  try {
    signal.throwIfAborted();
    await core.configure(numericResources.native);
    await core.command("adopt-control-state", {
      byteLength: controlStateBytes,
    });
    return {
      core,
      values,
      numericResources,
      resources: numericResources.wire,
      controlStateBytes,
      signal,
      requestId,
      close,
      recheck: async () => signal.throwIfAborted(),
    };
  } catch (error) {
    await close();
    throw error;
  }
}

function scoped(
  /** @type {*} */ event,
  /** @type {*} */ owner,
  /** @type {*} */ scope,
  /** @type {*} */ path,
) {
  return assertJsonQualityEvent({
    ...event,
    schemaVersion: cohort.eventSchemaVersion,
    requestId: owner.requestId,
    ...(path === undefined ? {} : { path }),
    ...(["source", "terminal"].includes(event.type)
      ? { operationScope: scope }
      : {}),
  });
}

/** Internal CLI source operation. It returns source bytes only after cleanup. */
export async function executeStdinOperation(
  /** @type {*} */ options,
  /** @type {*} */ { emit, ready } = {},
) {
  const {
    operation,
    source,
    path,
    root,
    contract: declared = {},
    transformControls,
    ...controls
  } = options;
  const policyAware = root !== undefined;
  if (source?.[Symbol.asyncIterator] === undefined)
    throw new TypeError("Expected a raw byte stream.");
  if (!["check-files", "format", "normalize"].includes(operation))
    throw new TypeError("Unsupported stdin operation.");
  if (policyAware && path === undefined)
    throw new TypeError("Policy-aware stdin requires --stdin-filepath.");
  if (policyAware && Object.keys(declared).length)
    throw new TypeError("Explicit contracts cannot replace repository policy.");
  let owner, view, transformed;
  let result;
  /** @type {unknown[]} */
  const failures = [];
  try {
    owner = policyAware
      ? await openSelectedExecution({ root, ...controls })
      : await rawOwner(controls);
    await ready?.(owner);
    const scope = {
      kind: "stdin",
      policy: policyAware ? "repository" : "explicit-contract",
      completeRepositoryCheck: false,
    };
    if (policyAware) assertVirtualSourcePath(owner.root, path);
    const contract = policyAware
      ? owner.contractFor(path, undefined, true)
      : stdinContract(declared, path);
    if (contract.expected?.linkedDocuments !== undefined)
      throw new TypeError(
        "Linked-document obligations require the full repository check.",
      );
    const encoded = encodeNativeControl(
      contract,
      owner.numericResources.admission.maxRequestBytes,
    );
    const baseBytes =
      BigInt(owner.controlStateBytes) + BigInt(encoded.length) * 5n + 4096n;
    await owner.core.command("resize-control-state", {
      byteLength: String(baseBytes),
    });
    const execution = { ...owner, controlStateBytes: String(baseBytes) };
    if (operation !== "check-files") {
      let excluded = policyAware && contract.excludeUntrackedSources;
      if (policyAware) {
        const parts = path.split("/");
        for (let count = 1; count < parts.length; count++)
          excluded ||= resolveJsonSourceContract(
            parts.slice(0, count).join("/") + "/",
            owner.policy,
          ).excludeUntrackedSources;
      }
      if (
        contract.format === "jsonl" ||
        excluded ||
        (policyAware &&
          (contract.allowSourceRewrites !== true ||
            contract.formatContract !== "prettier-json")) ||
        (operation === "normalize" &&
          (contract.normalization === "preserve" ||
            contract.nfcExemptStringValues?.length))
      )
        throw new TypeError(
          "The selected source policy does not permit this stdin transform.",
        );
    }
    if (operation === "check-files") {
      await emit?.(
        assertJsonQualityEvent({
          type: "selection",
          schemaVersion: cohort.eventSchemaVersion,
          requestId: owner.requestId,
          root: owner.root,
          operationScope: scope,
          inputKind: "stdin",
          selectedSourceCount: "1",
          resources: owner.resources,
          ...owner.provenance,
          coreSourceInputsSha256:
            owner.implementationIdentity.coreSourceInputsSha256,
        }),
      );
    }
    /** @type {*} */
    let captured;
    let terminal, originalSource;
    view = createTransformValueSession(owner.core, {
      onCapture(/** @type {*} */ value) {
        captured = value;
      },
    });
    // Original layout is repairable. Disabling only presentation checks retains
    // strict syntax, numeric/Unicode safety and selected byte/diagnostic pins.
    // With that preflight contract, formatEligible admits ordinary NFC findings
    // for either repair; operation-specific eligibility belongs to the candidate.
    const originalContract =
      operation === "check-files"
        ? contract
        : { ...contract, checkPresentation: false };
    for await (const event of view.check(source, originalContract, {
      retainValues: operation !== "check-files",
      signal: owner.signal,
    })) {
      if (event.type === "source") originalSource = event.source;
      if (event.type === "terminal") terminal = event;
      if (
        operation === "check-files" ||
        event.type === "finding" ||
        event.type === "nfc-key-collision-risk"
      )
        await emit?.(scoped(event, owner, scope, contract.path));
    }
    if (!terminal || !captured)
      throw new Error("Incomplete stdin source assessment.");
    if (!terminal.rulesComplete || !terminal.diagnosticsComplete)
      throw new Error("Incomplete stdin source diagnostics.");
    if (operation === "check-files") {
      if (policyAware) assertVirtualSourcePath(owner.root, path);
      await owner.recheck();
      result = {
        terminal: assertJsonQualityEvent({
          type: "selection-terminal",
          schemaVersion: cohort.eventSchemaVersion,
          requestId: owner.requestId,
          operationScope: scope,
          inputKind: "stdin",
          selectedSourceCount: "1",
          completedSourceCount: "1",
          complete: true,
          diagnosticsComplete: terminal.diagnosticsComplete,
          qualityPassed: terminal.qualityPassed,
          contractSatisfied: terminal.contractSatisfied,
          policyObservationComplete: true,
          inputComplete: true,
        }),
      };
    } else {
      const eligibility =
        operation === "format" ? "formatEligible" : "normalizeEligible";
      if (!terminal.formatEligible)
        result = {
          refused: true,
          message:
            "The complete input assessment refused the requested transform.",
        };
      else {
        const transformLimits = transformResources(
          policyAware ? owner.policy.transformControls : undefined,
          transformControls,
        );
        const text = await sourceText(execution, captured, transformLimits);
        transformed = await (
          operation === "format"
            ? (await import("./native-formatting.js")).formatSource
            : (await import("./native-normalization.js")).normalizeSource
        )(text, {
          core: owner.core,
          parentSource: captured.source,
          controlStateBytes: String(baseBytes),
          capacityLimits: owner.numericResources.admission,
          runtimeControls: owner.numericResources.runtime,
          transformControls: transformLimits,
          signal: owner.signal,
          allowEmptyKeys: contract.allowEmptyKeys,
          normalization: contract.normalization,
          nfcExemptStringValues: contract.nfcExemptStringValues,
          allowSourceRewrites: contract.allowSourceRewrites,
          owner: contract.owner,
          reason: contract.reason,
        });
        const output = Buffer.from(transformed.text);
        let checked;
        for await (const event of view.check([output], contract, {
          retainValues: false,
          signal: owner.signal,
          transformOf: originalSource,
        })) {
          if (event.type === "terminal") checked = event;
        }
        if (!checked) throw new Error("Incomplete stdin candidate assessment.");
        if (!checked.rulesComplete || !checked.diagnosticsComplete)
          throw new Error("Incomplete stdin candidate diagnostics.");
        if (
          !checked[eligibility] ||
          (contract.expected !== undefined && checked.expectedMatched !== true)
        )
          result = {
            refused: true,
            message:
              "The derived source does not satisfy its transform contract.",
          };
        else {
          if (policyAware) assertVirtualSourcePath(owner.root, path);
          await owner.recheck();
          result = {
            output,
            qualityPassed: checked.qualityPassed,
            findingCount: checked.findingCount,
          };
        }
      }
    }
  } catch (error) {
    failures.push(error);
  } finally {
    // No success or source payload escapes before every owned resource settles.
    try {
      await transformed?.release();
    } catch (error) {
      failures.push(error);
    }
    try {
      await view?.close();
    } catch (error) {
      failures.push(error);
    }
    try {
      await owner?.close();
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length === 1) throw failures[0];
  if (failures.length)
    throw new AggregateError(
      failures,
      failures
        .map((error) => String(error instanceof Error ? error.message : error))
        .join("; "),
    );
  controls.signal?.throwIfAborted();
  if (!result) throw new Error("Missing complete stdin operation result.");
  return result;
}
