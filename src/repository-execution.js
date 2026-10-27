// SPDX-License-Identifier: AGPL-3.0-only
// Internal repository lifecycle owner composed by the supported session factory.
import { randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import { bootstrapJsonPolicy } from "./policy-bootstrap.js";
import { resolveExecutionResources } from "./execution-resources.js";
import {
  createExecutionDeadline,
  remainingDuration,
} from "./execution-deadline.js";
import { jsonContract } from "./configuration.js";
import { sourcePresentationContract } from "./source-presentation.js";
import { NativeSession } from "./native-session.js";
import { checkRepository } from "./repository-check.js";
import { logicalInventory } from "./logical-inventory.js";
import { encodeNativeControl } from "./native-control.js";

/** Own bootstrap, immutable policy, aggregate elapsed time, retained policy
 * charge, repository checks and cleanup. Providers are trusted injected code.
 * The component comes only from the verified acquisition owner. No installation
 * or download happens here, and no check acquires source-write authority.
 */
export async function createRepositoryExecution(
  /** @type {*} */ {
    root,
    component,
    temporaryDirectory,
    capacityLimits,
    runtimeControls,
    nativeProviders = {},
    logicalProviders = [],
    requiredOutputs = [],
    gitExecutable,
    signal,
    retainValues = false,
  },
) {
  const began = performance.now(),
    invocation = { capacityLimits, runtimeControls };
  root = resolve(root);
  const bootstrap = resolveExecutionResources({}, invocation),
    admitted = await bootstrapJsonPolicy({
      root,
      component,
      temporaryDirectory,
      resources: bootstrap.native,
      signal,
    }),
    selected = resolveExecutionResources(admitted.policy, invocation),
    remaining = remainingDuration(selected.runtime.maxCheckTimeMs, began);
  const core = new NativeSession(
      component,
      join(temporaryDirectory, "json-quality-execution-" + randomUUID()),
    ),
    deadline = createExecutionDeadline(remaining, [signal]),
    operationSignal = deadline.signal,
    context = { policy: admitted.policy, sourcePresentationMatches: new Set() };
  const abort = () => core.cancel();
  operationSignal.addEventListener("abort", abort, { once: true });
  try {
    operationSignal.throwIfAborted();
    await core.configure({
      ...selected.native,
      maxCheckTimeMs: remaining === null ? null : String(remaining),
    });
    await core.command("adopt-control-state", {
      byteLength: admitted.controlStateReservationBytes,
    });
    operationSignal.throwIfAborted();
    if (
      Object.keys(nativeProviders).some(
        (name) =>
          !(admitted.policy.nativeSources ?? []).some(
            (/** @type {*} */ definition) => definition.provider === name,
          ),
      )
    )
      throw new TypeError("Undeclared trusted native provider.");
    const supplied = (admitted.policy.nativeSources ?? []).map(
      (/** @type {*} */ definition) => {
        if (
          !Object.hasOwn(nativeProviders, definition.provider) ||
          typeof nativeProviders[definition.provider] !== "function"
        )
          throw new TypeError(
            `Missing trusted native provider: ${definition.provider}`,
          );
        return { definition, provider: nativeProviders[definition.provider] };
      },
    );
    if (!Array.isArray(logicalProviders))
      throw new TypeError("Expected trusted logical inventory factories.");
    logicalProviders = logicalProviders.map((entry) => {
      if (
        !entry ||
        typeof entry !== "object" ||
        Object.keys(entry).some(
          (name) => !["definition", "inventory"].includes(name),
        ) ||
        typeof entry.inventory !== "function"
      )
        throw new TypeError("Expected a trusted logical inventory factory.");
      const definition = JSON.parse(
        encodeNativeControl(entry.definition).toString("utf8"),
      );
      if (
        !Array.isArray(definition?.containerPaths) ||
        !definition.containerPaths.length ||
        definition.containerPaths.some(
          (/** @type {*} */ path) =>
            typeof path !== "string" || !path || !path.isWellFormed(),
        )
      )
        throw new TypeError(
          "Logical provider containerPaths must declare source selectors.",
        );
      return {
        definition,
        inventory: logicalInventory(core, entry.inventory, {
          definition,
          resources: selected.wire,
          signal: operationSignal,
        }),
      };
    });
    const contractFor = (
      /** @type {*} */ path,
      /** @type {*} */ source = {},
    ) => {
      // Native presentation is a producer default. Sparse path contracts keep
      // their established precedence, including exact source-map exceptions.
      const policy = source.definition?.formatContract
        ? {
            ...admitted.policy,
            defaults: {
              ...admitted.policy.defaults,
              formatContract: source.definition.formatContract,
            },
          }
        : admitted.policy;
      let contract = jsonContract(path, policy, {
        tracked: source.tracked,
      });
      if (
        source.identity &&
        (source.definition ||
          ["native", "logical"].includes(source.identity.kind))
      ) {
        contract = sourcePresentationContract(
          contract,
          context,
          source.identity,
        );
      }
      return contract;
    };
    let started = false,
      closed = false;
    return {
      core,
      contractFor,
      policyObservation: admitted.observation,
      policyTransformControls: admitted.policy.transformControls,
      controlStateBytes: admitted.controlStateReservationBytes,
      numericResources: {
        admission: selected.admission,
        runtime: selected.runtime,
      },
      resources: selected.wire,
      signal: operationSignal,
      close: async () => {
        closed = true;
        operationSignal.removeEventListener("abort", abort);
        try {
          await core.close();
        } finally {
          deadline.dispose();
          supplied.length = 0;
          nativeProviders = {};
          logicalProviders = [];
          requiredOutputs = [];
          context.sourcePresentationMatches.clear();
          context.policy = undefined;
          admitted.policy = undefined;
        }
      },
      async *events() {
        if (closed) throw new Error("closed-execution");
        if (started) throw new Error("execution-events-already-consumed");
        started = true;
        yield {
          type: "execution",
          resources: selected.wire,
          policySha256: admitted.observation.sha256,
          coreSourceInputsSha256: component.manifest.sourceInputsSha256,
        };
        for await (const event of checkRepository({
          root,
          session: core,
          contractFor,
          capacities: selected.wire.admission,
          nativeProviders: supplied,
          logicalProviders,
          requiredOutputs,
          gitExecutable,
          policyObservation: admitted.observation,
          retainValues,
          signal: operationSignal,
        })) {
          if (
            event.type === "execution-terminal" &&
            context.sourcePresentationMatches.size !==
              (admitted.policy.preserveSourcePresentation?.length ?? 0)
          )
            throw new Error("Unmatched source-presentation obligation.");
          yield event;
        }
      },
    };
  } catch (error) {
    deadline.dispose();
    operationSignal.removeEventListener("abort", abort);
    await core.close();
    throw error;
  }
}

/** Ordinary execution owns its lifetime through final event consumption.
 * Advanced sessions compose the same controller and close explicitly.
 */
export async function* executeRepositoryCheck(/** @type {*} */ options) {
  const execution = await createRepositoryExecution(options);
  try {
    yield* execution.events();
  } finally {
    await execution.close();
  }
}
