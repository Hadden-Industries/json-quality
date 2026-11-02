// SPDX-License-Identifier: AGPL-3.0-only
// Strict, bounded policy bootstrap before effective repository resources exist.
import { randomUUID } from "node:crypto";
import { lstatSync } from "node:fs";
import { join } from "node:path";
import {
  resolvePolicySnapshot,
  defaultPolicyReservationBytes,
} from "./configuration.js";
import { assertRegularDirectory } from "./paths.js";
import { policyProvenance } from "./policy-provenance.js";
import { NativeSession } from "./native-session.js";
import { createValueSession } from "./value-session.js";
import { createExecutionDeadline } from "./execution-deadline.js";
import {
  observeRepositorySource,
  identifyRepositorySource,
  repositorySourceFragments,
  recheckRepositorySource,
} from "./repository-source.js";

/** Freeze the admitted bounded control object. The iterative worklist is part
 * of its conservative node reservation and cannot overflow a JS recursion stack.
 */
export function policyIsAbsent(/** @type {string} */ root) {
  assertRegularDirectory(root, "");
  try {
    lstatSync(join(root, ".json-quality.json"));
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === "ENOENT")
      return true;
    throw error;
  }
  return false;
}

export async function recheckPolicyObservation(
  /** @type {*} */ { root, member, signal },
) {
  signal?.throwIfAborted();
  if (member === null) {
    if (!policyIsAbsent(root))
      throw new Error("Configuration appeared after bootstrap.");
  } else await recheckRepositorySource({ root, member, signal });
}

/** Internal composition seam, using the already verified package component.
 * Invocation controls govern bootstrap. The returned independent policy object
 * carries its reservation into the repository controller: adopt that charge in
 * the configured main core before creating its census or pulling source bytes.
 * Closing the bootstrap releases native storage; it does not erase this owned
 * object's accounting obligation. No overlapping native workers are retained.
 */
export async function bootstrapJsonPolicy(
  /** @type {*} */ { root, ...options },
) {
  return bootstrapJsonPolicySource({
    ...options,
    async source(/** @type {*} */ { signal, maximumBytes }) {
      if (policyIsAbsent(root))
        return {
          member: null,
          configurationOrigin: {
            kind: "repository-absence",
            path: ".json-quality.json",
          },
        };
      const observed = observeRepositorySource(root, ".json-quality.json");
      if (
        maximumBytes !== null &&
        BigInt(observed.byteLength) > BigInt(maximumBytes)
      )
        throw new Error("policy-byte-capacity");
      const member = await identifyRepositorySource({
        root,
        member: observed,
        signal,
      });
      return {
        member,
        configurationOrigin: {
          kind: "repository-file",
          path: ".json-quality.json",
        },
        open: () => repositorySourceFragments({ root, member, signal }),
      };
    },
  });
}

/** Trusted identified policy transport seam. Filesystem and immutable Git data
 * share the same strict parsing, bounded materialization and Ajv admission.
 * The producer must establish its independent SHA-256 and verify it at EOF.
 */
export async function bootstrapJsonPolicySource(
  /** @type {*} */ {
    source: identify,
    component,
    resources = {},
    temporaryDirectory,
    signal,
  },
) {
  const core = new NativeSession(
      component,
      join(temporaryDirectory, "json-quality-policy-" + randomUUID()),
    ),
    session = createValueSession(core);
  let /** @type {ReturnType<typeof createExecutionDeadline> | undefined} */ deadline;
  try {
    const configured = (await core.configure(resources)).result.resources;
    deadline = createExecutionDeadline(configured.runtime.maxCheckTimeMs, [
      signal,
    ]);
    const operationDeadline = deadline,
      operationSignal = deadline.signal,
      { member, open, configurationOrigin } = await identify({
        signal: operationSignal,
        maximumBytes: configured.admission.maxPolicyBytes,
      }),
      ceiling = configured.admission.maxPolicyBytes;
    const fromWire = (/** @type {*} */ group) =>
      Object.fromEntries(
        Object.entries(group).map(([key, value]) => [
          key,
          value === null ? null : Number(value),
        ]),
      );
    const resolverOptions = {
      capacityLimits: fromWire(configured.admission),
      runtimeControls: fromWire(configured.runtime),
    };
    const resolveOwned = async (
      /** @type {*} */ input,
      /** @type {bigint} */ inputReservation,
    ) => {
      // The input lease is already charged. Reserve additional copy/merge/output
      // workspace before constructing those objects; then retain only output.
      const additional =
        2n * (inputReservation + defaultPolicyReservationBytes) + 1024n;
      await core.command("resize-control-state", {
        byteLength: String(additional),
      });
      operationSignal.throwIfAborted();
      resolverOptions.runtimeControls.maxCheckTimeMs =
        operationDeadline.remaining();
      const resolved = resolvePolicySnapshot(input, resolverOptions);
      operationDeadline.remaining();
      operationSignal.throwIfAborted();
      return resolved;
    };
    if (member === null) {
      const resolved = await resolveOwned(undefined, 0n);
      await core.command("resize-control-state", {
        byteLength: String(resolved.managedReservationBytes),
      });
      return {
        policy: resolved.policy,
        controlStateReservationBytes: String(resolved.managedReservationBytes),
        observation: null,
        provenance: policyProvenance(configurationOrigin, null),
      };
    }
    if (ceiling !== null && BigInt(member.byteLength) > BigInt(ceiling))
      throw new Error("policy-byte-capacity");
    if (BigInt(member.byteLength) > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error("policy-control-object-capacity");
    let source, terminal;
    for await (const event of session.check(
      open(),
      {
        path: member.path,
        format: "json",
        formatContract: "preserved-bytes",
        allowSourceRewrites: false,
        expected: {
          sha256: member.sha256,
          byteLength: member.byteLength,
          diagnostics: [],
        },
      },
      {
        signal: operationSignal,
        identity: { sha256: member.sha256, byteLength: member.byteLength },
      },
    )) {
      if (event.type === "source") source = event.source;
      if (event.type === "terminal") terminal = event;
    }
    if (!terminal?.qualityPassed || !terminal.contractSatisfied)
      throw new Error(
        "Invalid .json-quality.json: shared strict quality admission failed.",
      );
    const rootValue = await session.select(source),
      lease = await session.materializeControl(
        rootValue,
        member.byteLength,
        () => true,
      );
    let resolved;
    try {
      resolved = await resolveOwned(
        lease.value,
        BigInt(lease.managedReservationBytes),
      );
    } finally {
      await lease.release();
    }
    if (!resolved) throw new Error("policy-resolution-incomplete");
    await core.command("resize-control-state", {
      byteLength: String(resolved.managedReservationBytes),
    });
    operationSignal.throwIfAborted();
    return {
      policy: resolved.policy,
      controlStateReservationBytes: String(resolved.managedReservationBytes),
      observation: member,
      provenance: policyProvenance(configurationOrigin, member),
    };
  } finally {
    deadline?.dispose();
    await session.close();
  }
}
