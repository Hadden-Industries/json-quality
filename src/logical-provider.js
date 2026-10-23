// SPDX-License-Identifier: AGPL-3.0-only
// Select logical JSON from frozen completed containers through the shared core.
import { requireAsyncStream } from "./source-streams.js";
import { jsonSourceFormat } from "./json-paths.js";

/** Stream an independent logical inventory; exact pointer selection and payload
 * decoding belong to the native checker, without a JS container/body copy.
 */
export async function* checkLogicalProvider({
  session,
  inventory,
  definition,
  contractFor,
  signal,
  retainValues = false,
  retainValuesFor = () => false,
}) {
  requireAsyncStream(inventory, "Logical inventory");
  if (typeof contractFor !== "function")
    throw new TypeError("Trusted policy matcher required.");
  const id = definition.id,
    cancel = () => session.cancel();
  signal?.throwIfAborted();
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    await session.command("census-provider", {
      id,
      kind: "logical",
      minimum: String(definition.minimumDocuments ?? 0),
    });
    for await (const entry of inventory) {
      signal?.throwIfAborted();
      const container = (
        await session.command("census-get", { path: entry.containerPath })
      ).result.member;
      if (!container || container.source === "0")
        throw new Error(
          `Missing checked logical container: ${entry.containerPath}`,
        );
      const selected = (
        await session.command("select-value", {
          source: container.source,
          pointer: entry.pointer,
          record: entry.record,
        })
      ).result.value;
      await session.command("census-add", {
        provider: id,
        path: entry.path,
        identity: { sha256: entry.sha256, byteLength: entry.byteLength },
        containerSource: container.source,
        value: selected.id,
        encoding: entry.encoding,
      });
      const contract = {
        ...contractFor(entry.path, { definition, identity: entry }),
        path: entry.path,
        format: jsonSourceFormat(entry.path),
        allowFormatWrites: false,
      };
      if (contract.exclude)
        throw new Error(
          `Logical provider obligation is excluded: ${entry.path}`,
        );
      const captured = (
        await session.command("begin-linked-source", {
          value: selected.id,
          encoding: entry.encoding,
          contract,
          includeValueEvents: false,
          retainValues: retainValues || retainValuesFor(entry.path),
          identity: { sha256: entry.sha256, byteLength: entry.byteLength },
        })
      ).result;
      yield {
        type: "source",
        source: captured.source,
        byteLength: captured.byteLength,
        sha256: captured.sha256,
        path: entry.path,
      };
      for await (const event of session.events()) {
        signal?.throwIfAborted();
        yield { ...event, path: entry.path };
      }
      await session.command("census-bind", {
        path: entry.path,
        source: captured.source,
      });
    }
    await session.command("census-close-inventory", { provider: id });
    await session.command("census-close-provider", { provider: id });
  } finally {
    signal?.removeEventListener("abort", cancel);
  }
}
