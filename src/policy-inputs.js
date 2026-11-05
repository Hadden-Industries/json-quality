// SPDX-License-Identifier: AGPL-3.0-only
// Dependency discovery belongs to producer tooling; runtime hashes admitted inputs.
import { createHash } from "node:crypto";
import { closeSync, openSync, readFileSync, readSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  assertRegularDirectory,
  assertRegularSource,
  assertRepositoryPath,
} from "./paths.js";
import { encodeNativeControl } from "./native-control.js";

const root = fileURLToPath(new URL("../", import.meta.url));
export const policyInputInventoryPath =
  "assets/json-quality-policy-inputs.json";
export const policyResolverEntryPoints = Object.freeze([
  "src/configuration.js",
  "src/policy-provenance.js",
]);
// These are also read as data, so their inclusion does not depend on import syntax.
export const policyResolverResources = Object.freeze([
  "assets/default-json-quality-policy.json",
  "schemas/effective-policy.schema.json",
]);

/** @typedef {{schemaVersion: 1, files: string[], dependencies: string[]}} PolicyInputInventory */

/** Validate the shipped inventory without executing a module or a build tool.
 * @returns {PolicyInputInventory}
 */
export function readPolicyInputInventory(directory = root) {
  assertRegularDirectory(directory, "");
  const inventory = JSON.parse(
    readFileSync(
      assertRegularSource(directory, policyInputInventoryPath),
      "utf8",
    ),
  );
  if (
    !inventory ||
    typeof inventory !== "object" ||
    Array.isArray(inventory) ||
    Object.keys(inventory).length !== 3 ||
    inventory.schemaVersion !== 1 ||
    !Array.isArray(inventory.files) ||
    !inventory.files.length ||
    !Array.isArray(inventory.dependencies)
  )
    throw new TypeError("Invalid policy input inventory.");
  for (const [index, path] of inventory.files.entries()) {
    assertRepositoryPath(path);
    if (
      !path.isWellFormed() ||
      path === policyInputInventoryPath ||
      path === "package.json" ||
      path.startsWith("node_modules/") ||
      (index > 0 && inventory.files[index - 1] >= path)
    )
      throw new TypeError("Invalid or unordered policy input path.");
  }
  for (const path of [...policyResolverEntryPoints, ...policyResolverResources])
    if (!inventory.files.includes(path))
      throw new TypeError("Incomplete policy input inventory.");
  for (const [index, name] of inventory.dependencies.entries())
    if (
      typeof name !== "string" ||
      !/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/u.test(name) ||
      (index > 0 && inventory.dependencies[index - 1] >= name)
    )
      throw new TypeError("Invalid or unordered policy dependency.");
  return inventory;
}

function inputDigest(
  /** @type {string} */ directory,
  /** @type {string} */ path,
) {
  const descriptor = openSync(assertRegularSource(directory, path), "r");
  const hash = createHash("sha256"),
    buffer = Buffer.alloc(65536);
  try {
    while (true) {
      const length = readSync(descriptor, buffer, 0, buffer.length, null);
      if (!length) return hash.digest("hex");
      hash.update(buffer.subarray(0, length));
    }
  } finally {
    closeSync(descriptor);
  }
}

/** Fingerprint current bytes and relevant declared runtime dependencies.
 * Package release identity and installed-payload verification remain separate.
 */
export function policyResolverFingerprint(directory = root) {
  const inventory = readPolicyInputInventory(directory);
  const metadata = JSON.parse(
    readFileSync(assertRegularSource(directory, "package.json"), "utf8"),
  );
  if (metadata.name !== "@hadden-industries/json-quality")
    throw new TypeError("Unexpected policy package identity.");
  const dependencies = inventory.dependencies.map((name) => {
    const version = metadata.dependencies?.[name];
    if (typeof version !== "string" || !version.length)
      throw new TypeError(
        "Missing declared policy runtime dependency: " + name,
      );
    return [name, version];
  });
  return createHash("sha256")
    .update(
      encodeNativeControl([
        "json-quality-policy-resolver-inputs-v2",
        inventory.files.map((path) => [path, inputDigest(directory, path)]),
        dependencies,
      ]),
    )
    .digest("hex");
}
