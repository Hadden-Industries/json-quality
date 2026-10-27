// SPDX-License-Identifier: AGPL-3.0-only
// Stream trusted native-owner inventories and members into the shared checker.
import {
  observeRepositorySource,
  captureRepositorySource,
  recheckRepositorySource,
} from "./repository-source.js";
import { requireAsyncStream } from "./source-streams.js";
import { nativeJsonSourceFormat } from "./json-paths.js";

/** Refuse a whole-body provider buffer instead of silently moving its resource
 * cost outside the advertised bounded transport contract.
 */
async function* memberFragments(
  /** @type {*} */ chunks,
  /** @type {*} */ signal,
) {
  for await (const part of requireAsyncStream(chunks, "member chunks")) {
    signal?.throwIfAborted();
    if (!ArrayBuffer.isView(part) || part.byteLength > 65536)
      throw new TypeError(
        "Native member fragments must be byte views of at most 65536 bytes.",
      );
    yield part;
  }
}

/** Reconcile independent provenance, inventory and member streams. The caller
 * injects trusted provider code; policy data never selects executable modules.
 */
export async function* checkNativeProvider(
  /** @type {*} */ {
    root,
    session,
    definition,
    provider,
    contractFor,
    signal,
    retainValues = false,
    retainValuesFor = () => false,
  },
) {
  if (typeof provider !== "function" || typeof contractFor !== "function")
    throw new TypeError("Trusted native provider and policy matcher required.");
  const id = definition.id;
  let supplied;
  const cancel = () => session.cancel();
  signal?.throwIfAborted();
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    await session.command("census-provider", {
      id,
      kind: "native",
      minimum: String(definition.minimumDocuments ?? 1),
    });
    supplied = await provider({
      root,
      parameters: structuredClone(definition.parameters ?? {}),
      signal,
    });
    if (
      !supplied ||
      typeof supplied !== "object" ||
      Object.keys(supplied).some(
        (key) =>
          !["authorities", "inventory", "documents", "close"].includes(key),
      ) ||
      (supplied.close !== undefined && typeof supplied.close !== "function")
    )
      throw new TypeError("Invalid native provider stream contract.");
    for await (const pin of requireAsyncStream(
      supplied.authorities,
      "authorities",
    )) {
      signal?.throwIfAborted();
      const existing = (
        await session.command("census-get-authority", { path: pin.path })
      ).result.authority;
      let observed = existing;
      if (existing)
        await recheckRepositorySource({ root, member: existing, signal });
      else {
        observed = observeRepositorySource(root, pin.path);
        const captured = await captureRepositorySource({
          root,
          member: observed,
          session,
          contract: {},
          signal,
          sourceKind: "authority",
          identity: { sha256: pin.sha256, byteLength: pin.byteLength },
        });
        observed = { ...observed, source: captured.source };
      }
      await session.command("census-authority", {
        provider: id,
        path: pin.path,
        source: observed.source,
        observation: observed.observation,
        identity: { sha256: pin.sha256, byteLength: pin.byteLength },
      });
    }
    for await (const entry of requireAsyncStream(
      supplied.inventory,
      "inventory",
    )) {
      signal?.throwIfAborted();
      const authority = (
        await session.command("census-get-authority", {
          path: entry.source.path,
        })
      ).result.authority;
      if (!authority)
        throw new Error(
          `Missing independent native authority: ${entry.source.path}`,
        );
      await session.command("census-add", {
        provider: id,
        path: entry.path,
        identity: { sha256: entry.sha256, byteLength: entry.byteLength },
        origin: { ...entry.source, source: authority.source },
      });
    }
    await session.command("census-close-inventory", { provider: id });
    for await (const document of requireAsyncStream(
      supplied.documents,
      "documents",
    )) {
      signal?.throwIfAborted();
      const member = (
        await session.command("census-get", { path: document.path })
      ).result.member;
      if (
        !member ||
        member.kind !== "native" ||
        member.provider !== id ||
        member.source !== "0"
      )
        throw new Error(
          `Unexpected or duplicate native member: ${document.path}`,
        );
      const contract = {
        ...contractFor(document.path, { definition, identity: member }),
        path: document.path,
        format: nativeJsonSourceFormat(document.path, member),
        allowFormatWrites: false,
      };
      if (contract.exclude)
        throw new Error(
          `Native provider obligation is excluded: ${document.path}`,
        );
      const captured = await session.capture(
        memberFragments(document.chunks, signal),
        contract,
        {
          includeValueEvents: false,
          retainValues: retainValues || retainValuesFor(document.path),
          sourceKind: "native",
          identity: { sha256: member.sha256, byteLength: member.byteLength },
        },
      );
      yield {
        type: "source",
        source: captured.source,
        byteLength: captured.byteLength,
        sha256: captured.sha256,
        path: document.path,
      };
      for await (const event of session.events()) {
        signal?.throwIfAborted();
        yield { ...event, path: document.path };
      }
      await session.command("census-bind", {
        path: document.path,
        source: captured.source,
      });
    }
    await session.command("census-close-provider", { provider: id });
  } finally {
    signal?.removeEventListener("abort", cancel);
    if (typeof supplied?.close === "function") await supplied.close();
  }
}

/** Revalidate native authority files without retaining a JS snapshot inventory. */
export async function recheckNativeAuthorities(
  /** @type {*} */ { root, session, signal },
) {
  let after = "";
  while (true) {
    signal?.throwIfAborted();
    const authority = (
      await session.command("census-next-authority", { after })
    ).result.authority;
    if (!authority) return;
    await recheckRepositorySource({ root, member: authority, signal });
    after = authority.path;
  }
}
