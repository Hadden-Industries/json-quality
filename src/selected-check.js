// SPDX-License-Identifier: AGPL-3.0-only
// Explicit limited-source checking; no Git, provider or repository closure.
import { randomUUID } from "node:crypto";
import { realpath } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { types } from "node:util";
import { tmpdir } from "node:os";
import { isAbsolute, join, posix, resolve, relative, sep } from "node:path";
import { readControlOptions } from "./control-snapshot.js";
import { encodeNativeControl } from "./native-control.js";
import { installedNativeComponent } from "./installed-component.js";
import { NativeSession } from "./native-session.js";
import { createValueSession } from "./value-session.js";
import {
  bootstrapJsonPolicy,
  recheckPolicyObservation,
} from "./policy-bootstrap.js";
import { resolveExecutionResources } from "./execution-resources.js";
import {
  createExecutionDeadline,
  remainingDuration,
} from "./execution-deadline.js";
import { resolveJsonSourceContract } from "./configuration.js";
import { sourcePresentationContract } from "./source-presentation.js";
import { jsonSourceFormat } from "./json-paths.js";
import {
  assertRegularDirectory,
  assertRepositoryPath,
  assertRegularSource,
  isPathContained,
} from "./paths.js";
import {
  observeRepositorySource,
  identifyRepositorySource,
  repositorySourceFragments,
  recheckRepositorySource,
} from "./repository-source.js";
import { exceedsQuota } from "./resource-profile.js";
import { assertJsonQualityEvent } from "./events.js";
import cohort from "../schemas/contract-cohort.json" with { type: "json" };

const ownerOptions = [
  "root",
  "capacityLimits",
  "runtimeControls",
  "temporaryDirectory",
  "signal",
  "requestId",
];
const operationScope = Object.freeze({
  kind: "selected-files",
  policy: "repository",
  completeRepositoryCheck: false,
});

function optionsFor(/** @type {*} */ input, files = false) {
  const options = readControlOptions(
    input,
    files ? [...ownerOptions, "files"] : ownerOptions,
  );
  if (
    typeof options.root !== "string" ||
    !options.root ||
    !options.root.isWellFormed()
  )
    throw new TypeError("Selected checks require an explicit root.");
  if (options.signal !== undefined && !(options.signal instanceof AbortSignal))
    throw new TypeError("Expected AbortSignal.");
  if (
    options.temporaryDirectory !== undefined &&
    (typeof options.temporaryDirectory !== "string" ||
      !options.temporaryDirectory.isWellFormed() ||
      !isAbsolute(options.temporaryDirectory))
  )
    throw new TypeError("Temporary directory must be absolute.");
  if (
    options.requestId !== undefined &&
    (typeof options.requestId !== "string" ||
      !options.requestId ||
      !options.requestId.isWellFormed())
  )
    throw new TypeError("Expected a nonempty well-formed requestId string.");
  if (files)
    selectionSize(
      options.files,
      resolveExecutionResources(
        {},
        {
          capacityLimits: false,
          runtimeControls: options.runtimeControls,
        },
      ).admission,
    );
  return options;
}

function selectionSize(/** @type {*} */ files, /** @type {*} */ admission) {
  if (
    !Array.isArray(files) ||
    types.isProxy(files) ||
    Object.getPrototypeOf(files) !== Array.prototype ||
    !files.length
  )
    throw new TypeError("Selected checks require nonempty literal files.");
  if (exceedsQuota(files.length, admission.maxPhysicalAndNativeSources))
    throw new Error("selected-source-capacity");
  let reservation = 1024n;
  for (let index = 0; index < files.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(files, String(index)),
      path = descriptor?.value;
    if (
      !descriptor ||
      !Object.hasOwn(descriptor, "value") ||
      typeof path !== "string" ||
      !path.isWellFormed()
    )
      throw new TypeError("Expected plain literal source paths.");
    assertRepositoryPath(path);
    jsonSourceFormat(path);
    let points = 0;
    for (const point of path) {
      void point;
      if (exceedsQuota(++points, admission.maxRequestPathCodePoints))
        throw new Error("request-path-capacity");
    }
    // Charge snapshots, duplicate/alias indexes and observed member metadata
    // before any of these owned collections or encoded controls are allocated.
    reservation += BigInt(path.length) * 24n + 4096n;
  }
  return reservation;
}

/** Private verified-component seam shared with policy-aware virtual input.
 * No source bodies or complete repository inventories are opened here.
 * @returns {Promise<any>}
 */
export async function openSelectedExecution(
  /** @type {*} */ input,
  /** @type {*} */ component = undefined,
) {
  const options = optionsFor(input),
    began = performance.now(),
    invocation = {
      capacityLimits: options.capacityLimits,
      runtimeControls: options.runtimeControls,
    },
    bootstrap = resolveExecutionResources({}, invocation),
    root = resolve(options.root);
  options.signal?.throwIfAborted();
  assertRegularDirectory(root, "");
  const temporaryDirectory = await realpath(
    options.temporaryDirectory ?? tmpdir(),
  );
  assertRegularDirectory(temporaryDirectory, "");
  if (isPathContained(realpathSync(root), temporaryDirectory))
    throw new TypeError(
      "Selected execution temporary storage must be outside the inspected root.",
    );
  component ??= await installedNativeComponent();
  const admitted = await bootstrapJsonPolicy({
      root,
      component,
      temporaryDirectory,
      resources: bootstrap.native,
      signal: options.signal,
    }),
    selected = resolveExecutionResources(admitted.policy, invocation),
    remaining = remainingDuration(selected.runtime.maxCheckTimeMs, began),
    core = new NativeSession(
      component,
      join(temporaryDirectory, "json-quality-selected-" + randomUUID()),
    ),
    values = createValueSession(core),
    deadline = createExecutionDeadline(remaining, [options.signal]),
    signal = deadline.signal,
    requestId = options.requestId ?? randomUUID(),
    context = { policy: admitted.policy, sourcePresentationMatches: new Set() };
  let closed = false;
  /** @type {Promise<void> | undefined} */
  let closing;
  const abort = () => core.cancel();
  signal.addEventListener("abort", abort, { once: true });
  const close = () => {
    if (closing) return closing;
    closed = true;
    const attempt = (async () => {
      try {
        await values.close();
      } finally {
        deadline.dispose();
        signal.removeEventListener("abort", abort);
        context.sourcePresentationMatches.clear();
      }
    })();
    closing = attempt;
    attempt.catch(() => {
      if (closing === attempt) closing = undefined;
    });
    return attempt;
  };
  try {
    signal.throwIfAborted();
    await core.configure({
      ...selected.native,
      maxCheckTimeMs: remaining === null ? null : String(remaining),
    });
    await core.command("adopt-control-state", {
      byteLength: admitted.controlStateReservationBytes,
    });
    let points = 0;
    for (const point of requestId) {
      void point;
      if (exceedsQuota(++points, selected.admission.maxRequestIdCodePoints))
        throw new Error("request-id-capacity");
    }
    encodeNativeControl({ requestId }, selected.admission.maxRequestBytes);
    const contractFor = (
      /** @type {*} */ path,
      /** @type {*} */ identity = undefined,
      virtual = false,
    ) => {
      if (closed) throw new Error("closed-execution");
      assertRepositoryPath(path);
      let /** @type {*} */ contract = {
          ...resolveJsonSourceContract(path, admitted.policy),
          format: jsonSourceFormat(path),
        };
      if (identity && !virtual)
        contract = sourcePresentationContract(contract, context, identity);
      else if (virtual) {
        for (const rule of admitted.policy.preserveSourcePresentation ?? [])
          if (
            rule.paths.some((/** @type {*} */ pattern) =>
              posix.matchesGlob(path, pattern),
            )
          )
            contract = {
              ...contract,
              allowSourceRewrites: false,
              formatContract: "preserved-bytes",
              exceptions: [
                ...contract.exceptions,
                { owner: rule.owner, reason: rule.reason },
              ],
            };
      }
      if (contract.expected?.linkedDocuments !== undefined)
        throw new TypeError(
          `Selected checks cannot assess linked-document obligations: ${path}. Run check for the full repository.`,
        );
      return contract;
    };
    return {
      root,
      policy: admitted.policy,
      core,
      values,
      numericResources: selected,
      resources: selected.wire,
      controlStateBytes: admitted.controlStateReservationBytes,
      signal,
      requestId,
      provenance: admitted.provenance,
      implementationIdentity: {
        coreSourceInputsSha256: component.manifest.sourceInputsSha256,
        icuVersion: component.manifest.components.icuVersion,
        unicodeVersion: component.manifest.components.unicodeVersion,
      },
      contractFor,
      async recheck() {
        if (closed) throw new Error("closed-execution");
        signal.throwIfAborted();
        await recheckPolicyObservation({
          root,
          member: admitted.observation,
          signal,
        });
      },
      close,
    };
  } catch (error) {
    await close();
    throw error;
  }
}

/** Internal identified-component test/composition seam, never a package export. */
export async function* checkSelectedFiles(
  /** @type {*} */ input,
  /** @type {*} */ component = undefined,
) {
  const options = optionsFor(input, true),
    { files: suppliedFiles, ...executionOptions } = options,
    owner = await openSelectedExecution(executionOptions, component);
  let terminal;
  try {
    const reservation =
      selectionSize(suppliedFiles, owner.numericResources.admission) +
      BigInt(owner.root.length) * BigInt(suppliedFiles.length) * 8n;
    await owner.core.command("resize-control-state", {
      byteLength: String(BigInt(owner.controlStateBytes) + reservation),
    });
    const files = JSON.parse(
        encodeNativeControl(
          { files: suppliedFiles, requestId: owner.requestId },
          owner.numericResources.admission.maxRequestBytes,
        ).toString("utf8"),
      ).files,
      names = new Set(),
      aliases = new Set(),
      members = [];
    // Admit the entire literal selection and its physical aliases before any
    // selected body is read. Discovery exclusions do not remove explicit reads.
    for (const path of files) {
      owner.signal.throwIfAborted();
      if (names.has(path))
        throw new TypeError("Duplicate selected source path.");
      names.add(path);
      let member;
      try {
        member = observeRepositorySource(owner.root, path);
      } catch (error) {
        if (
          /** @type {NodeJS.ErrnoException} */ (error).code === "ENOENT" &&
          /[*?[\]{}]/u.test(path)
        )
          throw new TypeError(
            `Missing literal source: ${path}. Wildcards are not expanded; pass existing literal file paths.`,
            { cause: error },
          );
        throw error;
      }
      const alias = member.observation.split(":").slice(0, 2).join(":"),
        actual = realpathSync(assertRegularSource(owner.root, path));
      if (
        relative(realpathSync(owner.root), actual).split(sep).join("/") !== path
      )
        throw new TypeError(
          `Selected source path must match filesystem spelling: ${path}`,
        );
      if (aliases.has(alias) || aliases.has(actual))
        throw new TypeError("Duplicate selected physical source.");
      aliases.add(alias);
      aliases.add(actual);
      owner.contractFor(path);
      members.push(member);
    }
    const event = (/** @type {*} */ value) =>
      assertJsonQualityEvent({
        ...value,
        schemaVersion: cohort.eventSchemaVersion,
        requestId: owner.requestId,
      });
    yield event({
      type: "selection",
      operationScope,
      inputKind: "physical",
      root: owner.root,
      selectedSourceCount: String(files.length),
      resources: owner.resources,
      ...owner.provenance,
      coreSourceInputsSha256:
        owner.implementationIdentity.coreSourceInputsSha256,
    });
    let completed = 0n,
      qualityPassed = true,
      contractSatisfied = true;
    for (let index = 0; index < members.length; index++) {
      const member = await identifyRepositorySource({
          root: owner.root,
          member: members[index],
          signal: owner.signal,
        }),
        contract = owner.contractFor(member.path, member);
      members[index] = member;
      let sourceTerminal;
      for await (const item of owner.values.check(
        repositorySourceFragments({
          root: owner.root,
          member,
          signal: owner.signal,
        }),
        contract,
        {
          identity: { sha256: member.sha256, byteLength: member.byteLength },
          signal: owner.signal,
          retainValues: false,
        },
      )) {
        if (item.type === "terminal") sourceTerminal = item;
        yield event({ ...item, path: member.path, scope: "source" });
      }
      if (!sourceTerminal?.diagnosticsComplete)
        throw new Error("Incomplete selected-source assessment.");
      completed++;
      qualityPassed &&= sourceTerminal.qualityPassed;
      contractSatisfied &&= sourceTerminal.contractSatisfied;
    }
    for (const member of members)
      await recheckRepositorySource({
        root: owner.root,
        member,
        signal: owner.signal,
      });
    await owner.recheck();
    terminal = event({
      type: "selection-terminal",
      operationScope,
      inputKind: "physical",
      selectedSourceCount: String(files.length),
      completedSourceCount: String(completed),
      complete: true,
      diagnosticsComplete: true,
      qualityPassed,
      contractSatisfied,
      sourceObservationsComplete: true,
      policyObservationComplete: true,
    });
  } finally {
    if (!terminal) owner.core.cancel();
    await owner.close();
  }
  // No borrowed capability is used after cleanup. Failed cleanup withholds this
  // authoritative terminal, including when every source assessment completed.
  owner.signal.throwIfAborted();
  yield terminal;
}

/** Check only the explicitly selected physical sources under root policy.
 * This operation never certifies complete repository acceptance.
 * @param {import("./api-types.js").FileCheckOptions} options
 * @returns {AsyncGenerator<import("./api-types.js").JsonQualityEvent>}
 */
export async function* checkJsonFiles(options) {
  yield* checkSelectedFiles(options);
}
