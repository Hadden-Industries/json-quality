// SPDX-License-Identifier: AGPL-3.0-only
/** Compare immutable release subjects while excluding mutable provider counters. */
import assert from "node:assert/strict";

export function verifyStableAssets(original, observed) {
  const project = (assets) => {
    assert.equal(
      new Set(assets.map(({ name }) => name)).size,
      assets.length,
      "Duplicate release asset",
    );
    return assets
      .map(({ name, size, digest }) => ({ name, size, digest }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };
  assert.deepEqual(
    project(original),
    project(observed),
    "Immutable release assets changed",
  );
  for (const asset of original) {
    // Historical signed targets predate native asset IDs. Preserve that honest
    // limitation; newly captured IDs must match on every subsequent observation.
    if (asset.id !== undefined)
      assert.equal(
        observed.find(({ name }) => name === asset.name)?.id,
        asset.id,
        "Immutable release asset ID changed",
      );
  }
}
