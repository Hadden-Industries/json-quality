// SPDX-License-Identifier: AGPL-3.0-only
// Strict, bounded policy bootstrap before effective repository resources exist.
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { admitJsonPolicy } from "./configuration.js";
import { NativeSession } from "./native-session.js";
import { createValueSession } from "./value-session.js";
import { createExecutionDeadline } from "./execution-deadline.js";
import {
  observeRepositorySource,
  identifyRepositorySource,
  repositorySourceFragments,
} from "./repository-source.js";

/** Freeze the admitted bounded control object. The iterative worklist is part
 * of its conservative node reservation and cannot overflow a JS recursion stack.
 */
function freezePolicy(/** @type {*} */ policy) {
  const pending = [policy];
  while (pending.length) {
    const object = pending.pop();
    Object.freeze(object);
    for (const key in object)
      if (
        Object.hasOwn(object, key) &&
        object[key] &&
        typeof object[key] === "object"
      )
        pending.push(object[key]);
  }
  return policy;
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
  let deadline;
  try {
    const configured = (await core.configure(resources)).result.resources;
    deadline = createExecutionDeadline(configured.runtime.maxCheckTimeMs, [
      signal,
    ]);
    const operationSignal = deadline.signal,
      { member, open } = await identify({
        signal: operationSignal,
        maximumBytes: configured.admission.maxPolicyBytes,
      }),
      ceiling = configured.admission.maxPolicyBytes;
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
        allowFormatWrites: false,
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
        (/** @type {*} */ policy) => {
          admitJsonPolicy(policy);
          freezePolicy(policy);
        },
      ),
      owned = await lease.transfer();
    operationSignal.throwIfAborted();
    return {
      policy: owned.value,
      controlStateReservationBytes: owned.managedReservationBytes,
      observation: member,
    };
  } finally {
    deadline?.dispose();
    await session.close();
  }
}
