// SPDX-License-Identifier: AGPL-3.0-only
// One bounded retained-byte reader shared by repository and stdin transforms.
import { transformWorkspaceReservation } from "./transform-capabilities.js";

export async function* sourceBytes(
  /** @type {*} */ core,
  /** @type {*} */ source,
  /** @type {*} */ signal,
) {
  let offset = 0n;
  while (true) {
    signal?.throwIfAborted();
    const range = await core.command("read-source", {
      source,
      byteOffset: String(offset),
      maximumBytes: "65536",
    });
    if (range.data?.length) yield range.data;
    offset += BigInt(range.data?.length ?? 0);
    if (offset === BigInt(range.result.totalByteLength)) return;
    if (!range.data?.length)
      throw new Error("Incomplete retained candidate source.");
  }
}

export async function sourceText(
  /** @type {*} */ execution,
  /** @type {*} */ member,
  /** @type {*} */ controls,
) {
  const length = BigInt(member.byteLength);
  if (
    length > BigInt(Number.MAX_SAFE_INTEGER) ||
    (controls.maximumSourceBytes !== null &&
      length > BigInt(controls.maximumSourceBytes))
  )
    throw new Error("transform-source-capacity");
  await execution.core.command("resize-control-state", {
    byteLength: String(
      BigInt(execution.controlStateBytes) +
        BigInt(transformWorkspaceReservation(Number(length), controls)),
    ),
  });
  const bytes = Buffer.alloc(Number(length));
  let offset = 0;
  for await (const part of sourceBytes(
    execution.core,
    member.source,
    execution.signal,
  )) {
    bytes.set(part, offset);
    offset += part.length;
  }
  if (offset !== bytes.length) throw new Error("Incomplete writer source.");
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}
