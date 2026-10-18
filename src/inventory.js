// Extracted from Universal Ontology 015a356e1fac8bcea3fcfb213954a191ab6f6851.
// SPDX-License-Identifier: AGPL-3.0-only
/** Reconcile Git and the owned filesystem; package controls cannot be weakened by consumer tool configuration.
 * This gate never writes JSON. ESLint owns syntax/rules; consumers own semantics.
 */
import { execFileSync } from "node:child_process";
import { lstatSync, readdirSync, realpathSync } from "node:fs";
import { join, resolve, posix, isAbsolute } from "node:path";
import {
  JSON_SUFFIX,
  isStrictJsonPath,
  isJsonLinesPath,
  readJsonPolicy,
  jsonContract,
} from "./quality.js";
import { jsonFormatOptions } from "./presentation.js";
import { operationLimits } from "./limits.js";
import {
  assertRepositoryPath,
  assertRegularSource,
  isPathContained,
} from "./paths.js";

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
  capacityLimits: overrides,
  gitExecutable,
  ...otherOptions
} = {}) {
  if (Object.hasOwn(otherOptions, "limits"))
    throw new TypeError("Use capacityLimits; limits is not supported.");
  root = resolve(root);
  if (
    gitExecutable !== undefined &&
    (typeof gitExecutable !== "string" ||
      !isAbsolute(gitExecutable) ||
      !lstatSync(gitExecutable).isFile() ||
      isPathContained(realpathSync(root), realpathSync(gitExecutable)))
  )
    throw new TypeError(
      "Explicit Git must be an absolute external regular executable.",
    );
  const bootstrap = operationLimits({}, overrides);
  const policy = await readJsonPolicy(root, {
    maxPolicyBytes: bootstrap.maxPolicyBytes,
  });
  const capacityLimits = operationLimits(policy, overrides);
  const formatOptions = await jsonFormatOptions(root);
  const git = (args) =>
    execFileSync(gitExecutable ?? "git", ["-C", root, ...args], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: capacityLimits.maxGitOutputBytes,
      timeout: Number.isFinite(capacityLimits.maxGitTimeMs)
        ? capacityLimits.maxGitTimeMs
        : 0,
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
    if (paths.size > capacityLimits.maxFiles)
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
  const boundaryIdentity = (path) =>
    process.platform === "win32" ? path.toLowerCase() : path;
  const boundaryIndex = new Map(
    boundaries.map((entry) => [boundaryIdentity(entry.path), entry]),
  );
  const files = [...paths].sort().map((path) => {
    if (!isStrictJsonPath(path) && !isJsonLinesPath(path))
      throw new Error(`Unqualified JSON dialect: ${path}`);
    assertRegularSource(root, path, tracked.get(path));
    const file = jsonContract(path, policy, { tracked: tracked.has(path) });
    // A hidden basename may not match a glob that pruned its ancestor. Git
    // rescue still checks it, but must retain that boundary's write protection.
    // Match only this identity's ancestors, independent of boundary count.
    let ancestor = boundaryIdentity(path);
    let boundary;
    while (ancestor) {
      boundary = boundaryIndex.get(ancestor);
      if (boundary) break;
      const slash = ancestor.lastIndexOf("/");
      if (slash < 0) break;
      ancestor = ancestor.slice(0, slash);
    }
    if (boundary) {
      file.exclude = false;
      file.allowFormatWrites = false;
      for (const exception of boundary.exceptions)
        if (
          !file.exceptions.some(
            (entry) =>
              entry.owner === exception.owner &&
              entry.reason === exception.reason,
          )
        )
          file.exceptions.push(exception);
    }
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
    if (
      size > capacityLimits.maxFileBytes ||
      totalBytes > capacityLimits.maxTotalBytes
    )
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
    capacityLimits,
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
