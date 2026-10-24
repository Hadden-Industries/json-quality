// SPDX-License-Identifier: AGPL-3.0-only
// Trusted source-only qualification over immutable Git objects and one core.
import { createHash, randomUUID } from "node:crypto";
import { realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { installedNativeComponent } from "./installed-component.js";
import { NativeSession } from "./native-session.js";
import { createValueSession } from "./value-session.js";
import { bootstrapJsonPolicySource } from "./policy-bootstrap.js";
import { resolveExecutionResources } from "./execution-resources.js";
import { jsonContract } from "./configuration.js";
import { JSON_SUFFIX, jsonSourceFormat } from "./json-paths.js";
import { repositoryMembers } from "./repository-check.js";
import { assertJsonQualityEvent } from "./events.js";
import { encodeNativeControl } from "./native-control.js";
import {
  gitObjectAuthority,
  gitTree,
  gitBlob,
  assertGitJsonBlob,
  assertGitCommit,
} from "./git-objects.js";
import cohort from "../schemas/contract-cohort.json" with { type: "json" };

const names = [
  "trustedRoot",
  "candidateRoot",
  "trustedSha",
  "candidateSha",
  "capacityLimits",
  "runtimeControls",
  "temporaryDirectory",
  "signal",
  "requestId",
];

/** Deliver cohort-2 events for all tracked candidate JSON under the immutable
 * trusted commit's policy. Candidate policy is ordinary checked data. Checkout
 * bytes and HEAD are outside this scope, so dirty work is never overwritten or
 * misrepresented as qualified. Native/logical adapters and domain validation
 * require their complete trusted repository adapter, not this source-only path.
 * Consume the iterator to its final execution-terminal; early return cancels.
 * The terminal is delivered only after native storage and subprocess cleanup.
 */
export async function* qualifyJsonConsumer(options) {
  if (
    !options ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    Object.keys(options).some((key) => !names.includes(key))
  )
    throw new TypeError("Invalid consumer qualification options.");
  for (const key of ["trustedSha", "candidateSha"])
    if (!/^[a-f0-9]{40}$/u.test(options[key] ?? ""))
      throw new TypeError("Full immutable source commits are required.");
  if (options.signal !== undefined && !(options.signal instanceof AbortSignal))
    throw new TypeError("Expected AbortSignal.");
  for (const key of ["trustedRoot", "candidateRoot", "temporaryDirectory"])
    if (
      options[key] !== undefined &&
      (typeof options[key] !== "string" ||
        !isAbsolute(options[key]) ||
        !options[key].isWellFormed())
    )
      throw new TypeError("Expected absolute qualification paths.");
  if (!options.trustedRoot || !options.candidateRoot)
    throw new TypeError("Trusted and candidate roots are required.");
  const began = performance.now(),
    invocation = {
      capacityLimits: options.capacityLimits,
      runtimeControls: options.runtimeControls,
    },
    bootstrap = resolveExecutionResources({}, invocation),
    operationSignal = options.signal
      ? AbortSignal.any([
          options.signal,
          AbortSignal.timeout(bootstrap.runtime.maxCheckTimeMs),
        ])
      : AbortSignal.timeout(bootstrap.runtime.maxCheckTimeMs);
  operationSignal.throwIfAborted();
  const roots = await Promise.all([
      realpath(options.trustedRoot),
      realpath(options.candidateRoot),
    ]),
    temporaryDirectory = await realpath(options.temporaryDirectory ?? tmpdir()),
    authority = gitObjectAuthority(roots),
    component = await installedNativeComponent(),
    requestId = options.requestId ?? randomUUID();
  if (typeof requestId !== "string" || !requestId || !requestId.isWellFormed())
    throw new TypeError("Expected a nonempty well-formed requestId.");
  encodeNativeControl({ requestId });
  const context = (root, sha, capacities, signal = operationSignal) => ({
      executable: authority.executable,
      root,
      sha,
      capacities,
      signal,
    }),
    policySource = context(
      roots[0],
      options.trustedSha,
      bootstrap.wire.admission,
    ),
    admitted = await bootstrapJsonPolicySource({
      component,
      temporaryDirectory,
      resources: bootstrap.native,
      signal: operationSignal,
      async source({ signal, maximumBytes }) {
        await assertGitCommit({ ...policySource, signal });
        let member;
        for await (const entry of gitTree({
          ...policySource,
          signal,
          path: ".json-quality.json",
        })) {
          if (member || entry.path !== ".json-quality.json")
            throw new Error("Invalid trusted policy tree.");
          assertGitJsonBlob(entry);
          member = entry;
        }
        if (!member)
          throw new Error(
            "Trusted policy must be a regular immutable Git blob.",
          );
        if (
          maximumBytes !== null &&
          BigInt(member.byteLength) > BigInt(maximumBytes)
        )
          throw new Error("policy-byte-capacity");
        const hash = createHash("sha256");
        for await (const part of gitBlob({ ...policySource, member, signal }))
          hash.update(part);
        member = { ...member, sha256: hash.digest("hex") };
        return {
          member,
          open: () => gitBlob({ ...policySource, member, signal }),
        };
      },
    });
  if (
    admitted.policy.nativeSources?.length ||
    admitted.policy.preserveSourcePresentation?.length ||
    admitted.policy.exceptions.some((rule) => rule.expected?.linkedDocuments)
  )
    throw new Error(
      "Trusted policy requires native/logical admission; use its trusted repository adapter.",
    );
  const selected = resolveExecutionResources(admitted.policy, invocation),
    remaining = Math.floor(
      selected.runtime.maxCheckTimeMs - (performance.now() - began),
    );
  if (remaining < 1) throw new Error("execution-time-capacity");
  const signal = options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(remaining)])
      : AbortSignal.timeout(remaining),
    core = new NativeSession(
      component,
      join(temporaryDirectory, "json-quality-qualification-" + randomUUID()),
    ),
    values = createValueSession(core),
    cancel = () => core.cancel(),
    qualification = Object.freeze({
      trustedSha: options.trustedSha,
      candidateSha: options.candidateSha,
      trustedPolicyBlob: admitted.observation.oid,
      scope: "immutable-git-json",
    });
  const maximumId = selected.admission.maxRequestIdCharacters;
  let idCharacters = 0;
  for (const point of requestId) {
    void point;
    idCharacters++;
  }
  if (maximumId !== null && idCharacters > maximumId) {
    await values.close();
    throw new Error("request-id-capacity");
  }
  signal.addEventListener("abort", cancel, { once: true });
  let terminal;
  try {
    signal.throwIfAborted();
    await core.configure({
      ...selected.native,
      maxCheckTimeMs: String(remaining),
    });
    await core.command("adopt-control-state", {
      byteLength: admitted.controlStateReservationBytes,
    });
    const candidate = context(
      roots[1],
      options.candidateSha,
      selected.wire.admission,
      signal,
    );
    const rawEvents = async function* () {
      yield {
        type: "execution",
        resources: selected.wire,
        policySha256: admitted.observation.sha256,
        coreSourceInputsSha256: component.manifest.sourceInputsSha256,
        qualification,
      };
      await core.command("census-provider", {
        id: "git-object",
        kind: "physical",
        minimum: "0",
      });
      await assertGitCommit(candidate);
      for await (const member of gitTree(candidate)) {
        if (!JSON_SUFFIX.test(member.path)) continue;
        assertGitJsonBlob(member);
        jsonSourceFormat(member.path);
        const maximum = selected.wire.admission.maxFileBytes;
        if (maximum !== null && BigInt(member.byteLength) > BigInt(maximum))
          throw new Error("source-byte-capacity");
        await core.command("census-add", {
          provider: "git-object",
          path: member.path,
          observation: JSON.stringify(member),
        });
      }
      await core.command("census-close-inventory", {
        provider: "git-object",
        observation: options.candidateSha,
      });
      for await (const indexed of repositoryMembers(core, signal)) {
        const member = JSON.parse(indexed.observation),
          contract = jsonContract(member.path, admitted.policy, {
            tracked: true,
          }),
          captured = await core.capture(
            gitBlob({ ...candidate, member }),
            { ...contract, format: jsonSourceFormat(member.path) },
            { sourceKind: "physical", retainValues: false },
          );
        yield {
          type: "source",
          source: captured.source,
          byteLength: captured.byteLength,
          sha256: captured.sha256,
          path: member.path,
        };
        for await (const event of core.events()) {
          signal.throwIfAborted();
          yield {
            ...event,
            path: member.path,
            scope: "source",
            linkedExpectationsComplete: false,
          };
        }
        await core.command("census-bind", {
          path: member.path,
          source: captured.source,
        });
      }
      await core.command("census-close-provider", { provider: "git-object" });
      authority.recheck();
      signal.throwIfAborted();
      const status = (await core.command("census-status")).result;
      if (!status.complete) throw new Error("Incomplete immutable Git census.");
      yield {
        type: "execution-terminal",
        inventoryComplete: true,
        linkedExpectationsComplete: true,
        sourceObservationsComplete: true,
        diagnosticsComplete: true,
        domainComplete: false,
        members: status.members,
        qualityPassed: status.qualityPassed,
        contractSatisfied: status.contractSatisfied,
        qualification,
      };
    };
    for await (const event of values.projectRepositoryEvents(rawEvents())) {
      const projected = Object.freeze(
        assertJsonQualityEvent({
          ...event,
          schemaVersion: cohort.eventSchemaVersion,
          requestId,
        }),
      );
      if (event.type === "execution-terminal") terminal = projected;
      else yield projected;
    }
  } finally {
    signal.removeEventListener("abort", cancel);
    await values.close();
    admitted.policy = undefined;
  }
  signal.throwIfAborted();
  if (terminal) yield terminal;
}
