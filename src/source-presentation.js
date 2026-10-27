// SPDX-License-Identifier: AGPL-3.0-only
import { posix } from "node:path";

/** Source presentation can be retained only after native or pointer-linked
 * census admission. Ordinary physical documents never cross this seam.
 * Their independent identity supplies the byte expectation; semantic findings
 * still fail unless separately declared by an exact protected exception.
 */
export function sourcePresentationContract(
  /** @type {*} */ contract,
  /** @type {*} */ context,
  /** @type {*} */ identity,
) {
  const selected = (context.policy.preserveSourcePresentation ?? []).flatMap(
    (/** @type {*} */ rule, /** @type {*} */ index) => {
      if (
        !rule.paths.some((/** @type {*} */ pattern) =>
          posix.matchesGlob(contract.path, pattern),
        )
      )
        return [];
      context.sourcePresentationMatches.add(index);
      return [{ owner: rule.owner, reason: rule.reason }];
    },
  );
  if (!selected.length) return contract;
  return {
    ...contract,
    allowFormatWrites: false,
    formatContract: "preserved-bytes",
    exceptions: [...contract.exceptions, ...selected],
    expected: contract.expected ?? {
      sha256: identity.sha256,
      byteLength: identity.byteLength,
      diagnostics: [],
    },
  };
}
