// SPDX-License-Identifier: AGPL-3.0-only
// Bounded capture and later exact revalidation of a discovered physical source.
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { open } from "node:fs/promises";
import { observeRegularFile } from "./regular-file-observation.js";
import { assertRegularSource } from "./paths.js";
import { sourceObservation } from "./source-observation.js";

/** Observe one regular repository source for later bounded capture/revalidation. */
export function observeRepositorySource(
  /** @type {*} */ root,
  /** @type {*} */ path,
) {
  const absolute = assertRegularSource(root, path),
    stat = observeRegularFile(absolute);
  return {
    path,
    observation: sourceObservation(stat),
    byteLength: String(stat.size),
  };
}

/** Own a descriptor that matches the census observation and current pathname.
 * The returned check repeats both identities after EOF. Every failure closes it.
 */
async function openDiscovered(/** @type {*} */ root, /** @type {*} */ member) {
  const absolute = assertRegularSource(root, member.path);
  const descriptor = await open(
    absolute,
    constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
  );
  try {
    const assertUnchanged = async () => {
      const path = assertRegularSource(root, member.path);
      if (
        !member.observation ||
        sourceObservation(await descriptor.stat({ bigint: true })) !==
          member.observation ||
        sourceObservation(observeRegularFile(path)) !== member.observation
      )
        throw new Error(`Source changed after discovery: ${member.path}`);
    };
    await assertUnchanged();
    return { descriptor, assertUnchanged };
  } catch (error) {
    await descriptor.close();
    throw error;
  }
}

/** Read one 64 KiB fragment ahead; the consumer settles each yielded view before
 * advancing because its backing buffer is deliberately reused.
 */
async function* sourceFragments(
  /** @type {*} */ descriptor,
  /** @type {*} */ signal,
) {
  const buffer = Buffer.alloc(65536);
  while (true) {
    signal?.throwIfAborted();
    const { bytesRead } = await descriptor.read(buffer, 0, buffer.length, null);
    if (!bytesRead) break;
    yield buffer.subarray(0, bytesRead);
  }
}

/** Stream one observed source, checking the descriptor/path again at EOF. */
export async function* repositorySourceFragments(
  /** @type {*} */ { root, member, signal },
) {
  const { descriptor, assertUnchanged } = await openDiscovered(root, member);
  try {
    yield* sourceFragments(descriptor, signal);
    await assertUnchanged();
  } finally {
    await descriptor.close();
  }
}

/** Establish an independent byte pin with bounded reads before identified
 * capture. Both passes must still match the same filesystem observation.
 */
export async function identifyRepositorySource(
  /** @type {*} */ { root, member, signal },
) {
  const hash = createHash("sha256");
  let length = 0n;
  for await (const fragment of repositorySourceFragments({
    root,
    member,
    signal,
  })) {
    hash.update(fragment);
    length += BigInt(fragment.length);
  }
  return { ...member, byteLength: String(length), sha256: hash.digest("hex") };
}

/** Capture one discovered regular file without retaining a JS copy of its body. */
export async function captureRepositorySource(
  /** @type {*} */ {
    root,
    member,
    session,
    contract,
    signal,
    retainValues = false,
    sourceKind = "physical",
    identity,
  },
) {
  const { descriptor, assertUnchanged } = await openDiscovered(root, member);
  try {
    const captured = await session.capture(
      sourceFragments(descriptor, signal),
      contract,
      {
        includeValueEvents: false,
        retainValues,
        sourceKind,
        identity,
      },
    );
    await assertUnchanged();
    return captured;
  } finally {
    await descriptor.close();
  }
}

/** Verify the discovered file still has the captured identity and exact bytes. */
export async function recheckRepositorySource(
  /** @type {*} */ { root, member, signal },
) {
  const { descriptor, assertUnchanged } = await openDiscovered(root, member);
  try {
    const hash = createHash("sha256");
    let length = 0n;
    for await (const fragment of sourceFragments(descriptor, signal)) {
      hash.update(fragment);
      length += BigInt(fragment.length);
    }
    await assertUnchanged();
    if (
      hash.digest("hex") !== member.sha256 ||
      length !== BigInt(member.byteLength)
    )
      throw new Error(`Source changed after capture: ${member.path}`);
  } finally {
    await descriptor.close();
  }
}
