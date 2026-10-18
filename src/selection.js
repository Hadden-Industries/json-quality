// SPDX-License-Identifier: AGPL-3.0-only
import { assertRepositoryPath } from "./paths.js";

/** Reject malformed selection before reading repositories or loading adapters. */
export function admitFiles(operation, files) {
  if (operation === "normalize" && (!Array.isArray(files) || !files.length))
    throw new TypeError(
      "Normalization requires unique explicit repository-relative files.",
    );
  if (files === undefined) return;
  if (
    !Array.isArray(files) ||
    files.some((path) => typeof path !== "string") ||
    new Set(files).size !== files.length
  )
    throw new TypeError(
      "Explicit files must be a unique array of literal paths.",
    );
  for (const path of files) assertRepositoryPath(path);
}

/** Admit literal physical paths against the complete independently discovered inventory. */
export function selectPhysicalFiles(files, inventory) {
  if (files === undefined) return null;
  admitFiles(undefined, files);
  const known = new Set(inventory.map(({ path }) => path));
  for (const path of files) {
    assertRepositoryPath(path);
    if (!known.has(path))
      throw new Error(`Undiscovered or excluded JSON source: ${path}`);
  }
  return new Set(files);
}

/** Preserve input order and settle every started task before reporting a failure. */
export async function mapConcurrent(items, concurrency, operation) {
  if (!Number.isSafeInteger(concurrency) || concurrency < 1)
    throw new TypeError("Concurrency must be a positive safe integer.");
  const output = new Array(items.length);
  let next = 0;
  let failure;
  let failed = false;
  const workers = Array.from(
    { length: Math.min(items.length, concurrency) },
    async () => {
      while (!failed && next < items.length) {
        const index = next++;
        try {
          output[index] = await operation(items[index], index);
        } catch (error) {
          failed = true;
          failure ??= error;
        }
      }
    },
  );
  await Promise.all(workers);
  if (failed) throw failure;
  return output;
}
