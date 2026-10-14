// Extracted from Universal Ontology 015a356e1fac8bcea3fcfb213954a191ab6f6851.
// SPDX-License-Identifier: AGPL-3.0-only
/** Reconcile Git and the owned filesystem; package controls cannot be weakened by consumer tool configuration.
 * This gate never writes JSON. ESLint owns syntax/rules; consumers own semantics.
 */
import { execFileSync } from "node:child_process";
import { lstatSync, readdirSync } from "node:fs";
import { join, resolve, posix } from "node:path";
import {
  JSON_SUFFIX,
  isStrictJsonPath,
  isJsonLinesPath,
  readJsonPolicy,
  jsonFormatOptions,
  jsonContract,
} from "./quality.js";
import { operationLimits } from "./limits.js";
import { assertRepositoryPath, assertRegularSource } from "./paths.js";

/** Reject unsafe path identities before asking native tools to resolve them. */
function assertLiteralPath(path) {
  assertRepositoryPath(path);
  if (!JSON_SUFFIX.test(path))
    throw new Error(`Nonliteral JSON policy path: ${path}`);
}

/** Return one validated context for all operations in this invocation. */
export async function inspectJsonInventory({
  root,
  requiredOutputs = [],
  limits: overrides,
} = {}) {
  root = resolve(root);
  const bootstrap = operationLimits({}, overrides);
  const policy = await readJsonPolicy(root, {
    maxPolicyBytes: bootstrap.maxPolicyBytes,
  });
  const limits = operationLimits(policy, overrides);
  const formatOptions = await jsonFormatOptions(root);
  const git = (args) =>
    execFileSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      maxBuffer: Math.min(limits.maxGitOutputBytes, Number.MAX_SAFE_INTEGER),
      windowsHide: true,
    });
  const tracked = new Map();
  const folded = new Map();
  const paths = new Set();
  function add(path) {
    assertLiteralPath(path);
    const prior = folded.get(path.toLowerCase());
    if (prior && prior !== path)
      throw new Error(`Case-colliding JSON path: ${path}`);
    folded.set(path.toLowerCase(), path);
    paths.add(path);
    if (paths.size > limits.maxFiles)
      throw new Error("JSON file limit exceeded.");
  }
  for (const entry of git(["ls-files", "--stage", "-z"])
    .split("\0")
    .filter(Boolean)) {
    const tab = entry.indexOf("\t");
    const path = entry.slice(tab + 1);
    if (!JSON_SUFFIX.test(path)) continue;
    const [mode, , stage] = entry.slice(0, tab).split(" ");
    if (stage !== "0" || tracked.has(path))
      throw new Error(`Unmerged JSON entry: ${path}`);
    tracked.set(path, mode);
    add(path);
  }
  const visible = new Set(
    git(["ls-files", "--others", "--exclude-standard", "-z"])
      .split("\0")
      .filter(Boolean),
  );
  const boundaries = [];
  function walk(directory, prefix = "") {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = prefix + entry.name;
      const contract = jsonContract(
        path + (entry.isDirectory() ? "/" : ""),
        policy,
      );
      const directoryContract = entry.isSymbolicLink()
        ? jsonContract(path + "/", policy)
        : contract;
      if (contract.exclude || directoryContract.exclude) {
        boundaries.push({
          path,
          exceptions: (contract.exclude ? contract : directoryContract)
            .exceptions,
        });
        continue;
      }
      if (entry.isSymbolicLink())
        throw new Error(`Nonregular JSON discovery path: ${path}`);
      if (entry.isDirectory()) walk(join(directory, entry.name), path + "/");
      else if (JSON_SUFFIX.test(path)) add(path);
    }
  }
  walk(root);
  const files = [...paths].sort().map((path) => {
    if (!isStrictJsonPath(path) && !isJsonLinesPath(path))
      throw new Error(`Unqualified JSON dialect: ${path}`);
    assertRegularSource(root, path, tracked.get(path));
    const file = jsonContract(path, policy, { tracked: tracked.has(path) });
    if (isJsonLinesPath(path)) file.allowFormatWrites = false;
    // Git ignore affects generic writes only, never read-only discovery/checking.
    file.allowFormatWrites &&= tracked.has(path) || visible.has(path);
    return file;
  });
  if (!files.length) throw new Error("Expected JSON inventory is empty.");
  let totalBytes = 0;
  for (const file of files) {
    const size = lstatSync(join(root, file.path)).size;
    totalBytes += size;
    if (size > limits.maxFileBytes || totalBytes > limits.maxTotalBytes)
      throw new Error(`JSON byte limit exceeded: ${file.path}`);
  }
  for (const pattern of requiredOutputs) {
    if (
      typeof pattern !== "string" ||
      !files.some((file) => posix.matchesGlob(file.path, pattern))
    )
      throw new Error("Missing required generated JSON: " + pattern);
  }
  const writable = files.filter((file) => file.allowFormatWrites).length;
  return {
    root,
    policy,
    files,
    boundaries,
    limits,
    totalBytes,
    formatOptions,
    counts: {
      discovered: files.length,
      tracked: tracked.size,
      writable,
      protected: files.length - writable,
    },
  };
}

/** Count view for callers that only need inventory evidence. */
export async function checkJsonInventory(options) {
  return (await inspectJsonInventory(options)).counts;
}
