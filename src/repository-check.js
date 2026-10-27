// SPDX-License-Identifier: AGPL-3.0-only
// Internal execution owner: stream sources, reconcile obligations and revalidate
// observations before yielding an execution verdict. No source writes occur here.
import { resolve } from "node:path";
import { nativeJsonSourceFormat } from "./json-paths.js";
import {
  discoverRepositorySources,
  recheckRepositoryDiscovery,
} from "./repository-discovery.js";
import {
  captureRepositorySource,
  recheckRepositorySource,
} from "./repository-source.js";
import {
  checkNativeProvider,
  recheckNativeAuthorities,
} from "./native-provider.js";
import { checkLogicalProvider } from "./logical-provider.js";
import { isLogicalContainer } from "./logical-inventory.js";

/** Linkage is an execution obligation. The core checks the source byte and
 * diagnostic expectations; this owner discharges the separate indexed linkage.
 */
function sourceContract(
  /** @type {*} */ path,
  /** @type {*} */ contract,
  /** @type {*} */ context = undefined,
) {
  const selected = {
    ...contract,
    path,
    format: nativeJsonSourceFormat(path, context?.identity),
  };
  if (!contract.expected?.linkedDocuments) return selected;
  const expected = { ...contract.expected };
  delete expected.linkedDocuments;
  return { ...selected, expected };
}

/** Iterate the adaptive index without retaining the inventory in JavaScript. */
export async function* repositoryMembers(
  /** @type {*} */ session,
  /** @type {*} */ signal,
) {
  let after = "";
  while (true) {
    signal?.throwIfAborted();
    const { member } = (await session.command("census-next", { after })).result;
    if (!member) return;
    yield member;
    after = member.path;
  }
}

/** Re-select exact decoded pointers from frozen containers and compare the
 * actual retained parent/value/encoding and captured member identity. Pins are
 * bounded policy control data; the growing source inventory stays in the core.
 */
async function reconcileLinkage(
  /** @type {*} */ session,
  /** @type {*} */ member,
  /** @type {*} */ contract,
) {
  const pins = contract.expected?.linkedDocuments;
  if (!pins) return;
  for (const [index, pin] of pins.entries()) {
    if (
      pins.findIndex((/** @type {*} */ other) => other.path === pin.path) !==
      index
    )
      throw new Error(`Duplicate expected logical linkage: ${pin.path}`);
    const actual = (await session.command("census-get", { path: pin.path }))
      .result.member;
    if (!actual || actual.kind !== "logical" || actual.source === "0")
      throw new Error(`Missing required logical document: ${pin.path}`);
    const selected = (
      await session.command("select-value", {
        source: member.source,
        pointer: pin.pointer,
        record: pin.record,
      })
    ).result.value;
    if (
      actual.sha256 !== pin.sha256 ||
      actual.byteLength !== pin.byteLength ||
      actual.linkage?.containerSource !== member.source ||
      actual.linkage?.value !== selected.id ||
      actual.linkage?.encoding !== pin.encoding
    )
      throw new Error(`Changed expected logical linkage: ${pin.path}`);
  }
}

/** Consume a complete repository through one configured session. Trusted policy
 * and provider code is injected by the execution owner, never loaded from data.
 * Source terminals are provisional execution evidence. Only the final execution
 * event establishes census, linkage, freshness and delivery completion. Domain
 * admission remains with the caller. Consumer interruption yields no verdict.
 * The caller owns session lifetime, and must close it after success or failure.
 */
export async function* checkRepository(
  /** @type {*} */ {
    root,
    session,
    capacities,
    contractFor,
    requiredOutputs,
    gitExecutable,
    nativeProviders = [],
    logicalProviders = [],
    policyObservation,
    retainValues = false,
    signal,
  },
) {
  root = resolve(root);
  const cancel = () => session.cancel();
  signal?.throwIfAborted();
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    if (policyObservation)
      await recheckRepositorySource({
        root,
        member: policyObservation,
        signal,
      });
    await discoverRepositorySources({
      root,
      session,
      capacities,
      contractFor,
      requiredOutputs,
      gitExecutable,
      signal,
    });
    const keepValues = (
      /** @type {*} */ path,
      /** @type {*} */ contract = undefined,
    ) =>
      retainValues ||
      logicalProviders.some((/** @type {*} */ { definition }) =>
        isLogicalContainer(definition, path),
      ) ||
      Boolean((contract ?? contractFor(path)).expected?.linkedDocuments);
    // Retain values only when declared pointer consumers or policy obligations need them.
    // Retention participates in the same native allocation/spill ledger.
    for await (const member of repositoryMembers(session, signal)) {
      const contract = contractFor(member.path, {
        tracked: member.provider === "git",
      });
      const captured = await captureRepositorySource({
        root,
        member,
        session,
        signal,
        contract: sourceContract(member.path, contract),
        retainValues: keepValues(member.path, contract),
      });
      yield {
        type: "source",
        source: captured.source,
        byteLength: captured.byteLength,
        sha256: captured.sha256,
        path: member.path,
      };
      for await (const event of session.events()) {
        signal?.throwIfAborted();
        yield {
          ...event,
          path: member.path,
          scope: "source",
          linkedExpectationsComplete: false,
        };
      }
      await session.command("census-bind", {
        path: member.path,
        source: captured.source,
      });
    }
    for (const provider of ["git", "tree"])
      await session.command("census-close-provider", { provider });
    const adaptedContract = (/** @type {*} */ path, /** @type {*} */ context) =>
      sourceContract(path, contractFor(path, context), context);
    for (const supplied of nativeProviders)
      for await (const event of checkNativeProvider({
        ...supplied,
        root,
        session,
        signal,
        contractFor: adaptedContract,
        retainValues,
        retainValuesFor: (/** @type {*} */ path) => keepValues(path),
      }))
        yield { ...event, scope: "source", linkedExpectationsComplete: false };
    for (const supplied of logicalProviders)
      for await (const event of checkLogicalProvider({
        ...supplied,
        session,
        signal,
        contractFor: adaptedContract,
        retainValues,
        retainValuesFor: (/** @type {*} */ path) => keepValues(path),
      }))
        yield { ...event, scope: "source", linkedExpectationsComplete: false };
    for await (const member of repositoryMembers(session, signal)) {
      await reconcileLinkage(
        session,
        member,
        contractFor(member.path, {
          tracked: member.provider === "git",
          identity: member,
        }),
      );
      if (member.kind === "physical")
        await recheckRepositorySource({ root, member, signal });
    }
    await recheckNativeAuthorities({ root, session, signal });
    if (policyObservation)
      await recheckRepositorySource({
        root,
        member: policyObservation,
        signal,
      });
    await recheckRepositoryDiscovery({
      root,
      session,
      capacities,
      gitExecutable,
      signal,
    });
    signal?.throwIfAborted();
    const status = (await session.command("census-status")).result;
    if (!status.complete) throw new Error("Incomplete repository census.");
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
    };
  } finally {
    signal?.removeEventListener("abort", cancel);
  }
}
