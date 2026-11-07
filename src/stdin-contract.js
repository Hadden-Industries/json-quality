// SPDX-License-Identifier: AGPL-3.0-only
// A virtual source identity needs typed admission, not writer orchestration.
import { sourceContract } from "./source-contract.js";
import { assertRepositoryPath } from "./paths.js";
import { jsonSourceFormat } from "./json-paths.js";

export function stdinContract(
  /** @type {*} */ contract = {},
  /** @type {*} */ path,
) {
  const selected = sourceContract(contract);
  if (path === undefined) return selected;
  assertRepositoryPath(path);
  const format = jsonSourceFormat(path);
  if (
    (selected.path !== undefined && selected.path !== path) ||
    (selected.format !== undefined && selected.format !== format)
  )
    throw new TypeError(
      "--stdin-filepath conflicts with the explicit source contract.",
    );
  return sourceContract({ ...selected, path, format });
}
