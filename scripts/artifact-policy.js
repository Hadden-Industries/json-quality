// SPDX-License-Identifier: AGPL-3.0-only
// Purpose-specific transport bounds follow OwlAPI's payload/collection policy.
export const artifactLimits = Object.freeze({
  proofBytes: 2 * 1024 * 1024,
  payloadBytes: 512 * 1024 * 1024,
  envelopeBytes: 1024 * 1024,
  collectionBytes: 1024 * 1024 * 1024,
  metadataBytes: 16 * 1024 * 1024,
});
