// SPDX-License-Identifier: AGPL-3.0-only
// Additional invariants for source/policy objects whose complete closed schema
// has just been admitted by their owner. This is not a shape validator.
export function assertNfcPreservationSemantics(/** @type {*} */ contract) {
  if (!contract.nfcExemptStringValues) return;
  if (
    contract.allowSourceRewrites !== false ||
    contract.normalization === "preserve" ||
    contract.expected?.diagnostics?.length ||
    !(
      (contract.owner?.trim() && contract.reason?.trim()) ||
      contract.exceptions?.some(
        (/** @type {*} */ entry) => entry.owner?.trim() && entry.reason?.trim(),
      )
    )
  )
    throw new TypeError(
      "Invalid protected owner/reason NFC value-preservation contract.",
    );
}
