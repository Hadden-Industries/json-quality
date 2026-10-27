// SPDX-License-Identifier: AGPL-3.0-only
// Internal verified-component composition. Supported factories resolve their
// installed component themselves; callers cannot select a checker backend.
import { randomUUID } from "node:crypto";
import { realpath, lstat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { NativeSession } from "./native-session.js";
import { createValueSession } from "./value-session.js";
import { resolveExecutionResources } from "./execution-resources.js";
import { createExecutionDeadline } from "./execution-deadline.js";
import { createRepositoryExecution } from "./repository-execution.js";
import { requireAsyncStream } from "./source-streams.js";
import { isPathContained } from "./paths.js";
import { sourceContract } from "./source-contract.js";
import { encodeNativeControl } from "./native-control.js";
import cohort from "../schemas/contract-cohort.json" with { type: "json" };
import { assertJsonQualityEvent } from "./events.js";

const sourceOptions = [
    "capacityLimits",
    "runtimeControls",
    "temporaryDirectory",
    "signal",
  ],
  repositoryOptions = [
    ...sourceOptions,
    "root",
    "nativeProviders",
    "logicalProviders",
    "requiredOutputs",
    "gitExecutable",
    "retainValues",
    "requestId",
  ],
  valueMethods = [
    "select",
    "selectStream",
    "describe",
    "children",
    "sameReference",
    "read",
    "fragments",
    "readSource",
    "sourceFragments",
    "materialize",
    "materializeControl",
  ];

function admitOptions(/** @type {*} */ options, /** @type {*} */ names) {
  if (
    !options ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    Object.keys(options).some((key) => !names.includes(key))
  )
    throw new TypeError("Invalid JSON session options.");
  if (options.signal !== undefined && !(options.signal instanceof AbortSignal))
    throw new TypeError("Expected AbortSignal.");
  if (
    options.retainValues !== undefined &&
    typeof options.retainValues !== "boolean"
  )
    throw new TypeError("Expected retainValues boolean.");
  if (options.requestId !== undefined)
    correlate(options.requestId, {
      admission: { maxRequestIdCharacters: null },
    });
  if (
    options.temporaryDirectory !== undefined &&
    (typeof options.temporaryDirectory !== "string" ||
      !options.temporaryDirectory.isWellFormed() ||
      !isAbsolute(options.temporaryDirectory))
  )
    throw new TypeError("Temporary directory must be absolute.");
}
async function temporaryRoot(/** @type {*} */ options) {
  const directory = await realpath(options.temporaryDirectory ?? tmpdir());
  if (!(await lstat(directory)).isDirectory())
    throw new TypeError("Expected temporary directory.");
  return directory;
}

function correlate(requestId = randomUUID(), /** @type {*} */ resources) {
  if (typeof requestId !== "string" || !requestId || !requestId.isWellFormed())
    throw new TypeError("Expected a nonempty well-formed requestId string.");
  encodeNativeControl({ requestId });
  const maximum = resources.admission.maxRequestIdCharacters;
  if (maximum !== null) {
    let characters = 0;
    for (const point of requestId) {
      void point;
      if (++characters > Number(maximum))
        throw new Error("request-id-capacity");
    }
  }
  return requestId;
}

/** Expose capabilities only; raw native handles and event projection are not a
 * public minting interface. Close aborts and settles the owned active iterator
 * before releasing the underlying session. Trusted input producers cooperate
 * with the supplied signal; no arbitrary consumer code is force-terminated.
 */
function surface(
  /** @type {*} */ values,
  /** @type {*} */ component,
  /** @type {*} */ context,
  /** @type {*} */ {
    resources,
    check,
    events,
    rewrite,
    close,
    signal,
    requestId,
  },
) {
  let /** @type {any} */ active,
    closed = false,
    /** @type {any} */ closing,
    eventsClaimed = false,
    rewriteClaimed = false,
    rewriteFactory = rewrite,
    eventFactory = events,
    closeOwner = close;
  const facade = Object.fromEntries(
      valueMethods.map((name) => [name, values[name].bind(values)]),
    ),
    cancel = (reason = new Error("JSON session cancelled.")) => {
      context.abort(reason);
      values.cancel();
    },
    track = (/** @type {*} */ factory, /** @type {*} */ correlation) => {
      if (closed) throw new Error("closed-session");
      if (active) throw new Error("session-not-ready");
      /** @type {AsyncGenerator<import("./api-types.js").JsonQualityEvent> | undefined} */
      let iterator = undefined;
      iterator = (async function* () {
        try {
          for await (const event of factory())
            yield Object.freeze(
              assertJsonQualityEvent({
                ...event,
                schemaVersion: cohort.eventSchemaVersion,
                requestId: correlation,
              }),
            );
        } finally {
          if (active === iterator) active = undefined;
        }
      })();
      active = iterator;
      return iterator;
    };
  if (check)
    facade.check = (
      /** @type {*} */ source,
      /** @type {*} */ contract = {},
      /** @type {*} */ options = {},
    ) => {
      if (
        !source ||
        typeof source !== "object" ||
        ![Object.prototype, null].includes(Object.getPrototypeOf(source)) ||
        Object.keys(source).some((key) => !["open", "identity"].includes(key))
      )
        throw new TypeError("Expected an identified trusted source opener.");
      const opener = Object.getOwnPropertyDescriptor(source, "open"),
        declared = Object.getOwnPropertyDescriptor(source, "identity");
      if (
        typeof opener?.value !== "function" ||
        (declared && !Object.hasOwn(declared, "value"))
      )
        throw new TypeError("Expected plain source opener data properties.");
      const identity =
        declared?.value === undefined
          ? undefined
          : JSON.parse(encodeNativeControl(declared.value).toString("utf8"));
      if (
        !options ||
        typeof options !== "object" ||
        Array.isArray(options) ||
        Object.keys(options).some(
          (key) =>
            !["signal", "includeValues", "retainValues", "requestId"].includes(
              key,
            ),
        )
      )
        throw new TypeError("Invalid source consumption options.");
      if (
        options.signal !== undefined &&
        !(options.signal instanceof AbortSignal)
      )
        throw new TypeError("Expected AbortSignal.");
      for (const name of ["includeValues", "retainValues"])
        if (options[name] !== undefined && typeof options[name] !== "boolean")
          throw new TypeError(`Expected ${name} boolean.`);
      const sourceSignal = options.signal
        ? AbortSignal.any([signal, options.signal])
        : signal;
      const selectedContract = sourceContract(contract);
      const correlation = correlate(options.requestId, resources);
      const consumption = {
        includeValues: options.includeValues,
        retainValues: options.retainValues,
      };
      return track(async function* () {
        sourceSignal.throwIfAborted();
        // Native begin-source admits the contract and declared identity before
        // pulling this lazy producer. Invalid metadata must not open input.
        const chunks = (async function* () {
          sourceSignal.throwIfAborted();
          yield* requireAsyncStream(
            await opener.value.call(source, { signal: sourceSignal }),
            "Source opener",
          );
        })();
        yield* values.check(chunks, selectedContract, {
          ...consumption,
          signal: sourceSignal,
          identity,
        });
      }, correlation);
    };
  if (events)
    facade.events = () => {
      if (closed) throw new Error("closed-session");
      if (eventsClaimed) throw new Error("execution-events-already-consumed");
      eventsClaimed = true;
      return track(
        () => values.projectRepositoryEvents(eventFactory()),
        requestId,
      );
    };
  if (rewrite)
    facade.rewrite = (/** @type {*} */ operation, /** @type {*} */ options) => {
      if (closed) throw new Error("closed-session");
      if (rewriteClaimed)
        throw new Error("repository-rewrite-already-consumed");
      const rawEvents = rewriteFactory(operation, options),
        iterator = track(
          () => values.projectRepositoryEvents(rawEvents),
          requestId,
        );
      rewriteClaimed = true;
      return iterator;
    };
  facade.cancel = cancel;
  facade.close = () => {
    if (closing) return closing;
    closed = true;
    const attempt = Promise.resolve().then(async () => {
      const /** @type {any[]} */ failures = [];
      cancel();
      try {
        if (active) await active.return();
      } catch (error) {
        failures.push(error);
      } finally {
        active = undefined;
        eventFactory = undefined;
        rewriteFactory = undefined;
      }
      try {
        await values.close();
      } catch (error) {
        failures.push(error);
      }
      try {
        await closeOwner?.();
        closeOwner = undefined;
      } catch (error) {
        failures.push(error);
      }
      if (failures.length === 1) throw failures[0];
      if (failures.length)
        throw new AggregateError(failures, failures[0].message);
    });
    closing = attempt;
    attempt.catch(() => {
      if (closing === attempt) closing = undefined;
    });
    return attempt;
  };
  facade.signal = signal;
  facade.resources = resources;
  facade.identity = Object.freeze({
    coreSourceInputsSha256: component.manifest.sourceInputsSha256,
    nodeApiVersion: component.manifest.nodeApiVersion,
    components: Object.freeze({
      icu: component.manifest.components.icuVersion,
      unicode: component.manifest.components.unicodeVersion,
      sqlite: component.manifest.components.sqliteVersion,
    }),
  });
  return Object.freeze(facade);
}

/** Private seam used by installed resolution and exact-artifact qualification. */
export async function createSourceSession(
  /** @type {*} */ component,
  /** @type {*} */ options = {},
) {
  admitOptions(options, sourceOptions);
  const selected = resolveExecutionResources(
      {},
      {
        capacityLimits: options.capacityLimits,
        runtimeControls: options.runtimeControls,
      },
    ),
    // The native store resolves and admits this parent in its worker before
    // requesting source bytes. In-memory checks need no JS filesystem hops.
    directory = options.temporaryDirectory ?? tmpdir(),
    context = new AbortController(),
    parentSignal = AbortSignal.any([
      context.signal,
      ...(options.signal ? [options.signal] : []),
    ]);
  parentSignal.throwIfAborted();
  if (!isAbsolute(directory))
    throw new TypeError("Temporary directory must be absolute.");
  const core = new NativeSession(
      component,
      join(directory, "json-quality-source-" + randomUUID()),
    ),
    values = createValueSession(core),
    deadline = createExecutionDeadline(selected.runtime.maxCheckTimeMs, [
      parentSignal,
    ]),
    signal = deadline.signal;
  const abort = () => values.cancel();
  signal.addEventListener("abort", abort, { once: true });
  try {
    signal.throwIfAborted();
    await core.configure(selected.native);
    signal.throwIfAborted();
    return surface(values, component, context, {
      resources: selected.wire,
      signal,
      check: true,
      close: () => {
        signal.removeEventListener("abort", abort);
        deadline.dispose();
      },
    });
  } catch (error) {
    deadline.dispose();
    signal.removeEventListener("abort", abort);
    await values.close();
    throw error;
  }
}

/** Private repository seam; native provider code is injected by the trusted
 * caller and never selected from a module/executable path in policy data.
 */
export async function createRepositorySession(
  /** @type {*} */ component,
  /** @type {*} */ options = {},
) {
  admitOptions(options, repositoryOptions);
  const root = await realpath(resolve(options.root ?? process.cwd())),
    directory = await temporaryRoot(options);
  if (isPathContained(root, directory))
    throw new TypeError(
      "Temporary storage must be outside the inspected repository.",
    );
  const context = new AbortController(),
    signal = options.signal
      ? AbortSignal.any([context.signal, options.signal])
      : context.signal;
  signal.throwIfAborted();
  const execution = await createRepositoryExecution({
      ...options,
      root,
      component,
      temporaryDirectory: directory,
      signal,
      retainValues: options.retainValues ?? true,
    }),
    values = createValueSession(execution.core);
  if (execution.signal.aborted) {
    await values.close();
    await execution.close();
    execution.signal.throwIfAborted();
  }
  try {
    let checked = false;
    return surface(values, component, context, {
      events: async function* () {
        for await (const event of execution.events()) {
          if (event.type === "execution-terminal") checked = true;
          yield event;
        }
      },
      rewrite: (
        /** @type {*} */ operation,
        /** @type {*} */ rewriteOptions,
      ) => {
        if (!checked)
          throw new Error("repository-check-required-before-rewrite");
        if (options.retainValues === false)
          throw new Error("repository-rewrite-needs-retained-values");
        return (async function* () {
          const { rewriteRepository } = await import("./repository-rewrite.js");
          yield* rewriteRepository(
            execution,
            { root, gitExecutable: options.gitExecutable },
            operation,
            rewriteOptions,
          );
        })();
      },
      resources: execution.resources,
      requestId: correlate(options.requestId, execution.resources),
      signal: execution.signal,
      close: () => execution.close(),
    });
  } catch (error) {
    await values.close();
    await execution.close();
    throw error;
  }
}
