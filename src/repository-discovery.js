// SPDX-License-Identifier: AGPL-3.0-only
// Stream Git and owned-tree discovery into the execution's adaptive census.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, realpathSync } from "node:fs";
import { opendir } from "node:fs/promises";
import { isAbsolute, resolve, posix } from "node:path";
import { sourceObservation } from "./source-observation.js";
import { observeRegularFile } from "./regular-file-observation.js";
import {
  JSON_SUFFIX,
  isStrictJsonPath,
  isJsonLinesPath,
} from "./json-paths.js";
import {
  assertRepositoryPath,
  assertRegularDirectory,
  assertRegularSource,
  isPathContained,
} from "./paths.js";

const pathDecoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

/** Raw Git reads use the selected checkout, without inherited Git directory,
 * replacement, configuration injection or network/lazy-fetch redirection.
 */
export function gitReadEnvironment() {
  return {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        ([key]) => !key.toUpperCase().startsWith("GIT_"),
      ),
    ),
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_NO_LAZY_FETCH: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
  };
}

/** Read NUL-delimited Git output with bounded fragments and backpressure.
 * Stdout and stderr share the declared Git-output ceiling. Every exit, error,
 * timeout or interrupted consumer settles the owned process before returning.
 */
export async function* gitRecords(executable, root, args, capacities, signal) {
  signal?.throwIfAborted();
  const child = spawn(executable, ["-C", root, ...args], {
    cwd: root,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
    env: gitReadEnvironment(),
  });
  const completed = new Promise((settle) => {
    child.once("error", (error) => settle({ error }));
    child.once("close", (code) => settle({ code }));
  });
  let bytes = 0n,
    failure,
    stderr = "",
    pending = Buffer.alloc(0),
    timer;
  const fail = (error) => {
    failure ??= error;
    child.kill();
  };
  const admit = (size) => {
    bytes += BigInt(size);
    if (
      capacities.maxGitOutputBytes !== null &&
      bytes > BigInt(capacities.maxGitOutputBytes)
    )
      fail(new Error("git-output-byte-capacity"));
  };
  const abort = () =>
    fail(signal.reason ?? new Error("Repository discovery cancelled."));
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  const deadline = capacities.maxGitTimeMs;
  if (deadline !== null) {
    // Node clamps oversized timers to 1 ms. Rearm long finite admissions rather
    // than turning an accepted long timeout into an immediate failure.
    const began = performance.now();
    const expire = () => {
      const remaining = Number(deadline) - (performance.now() - began);
      if (remaining <= 0) fail(new Error("git-time-capacity"));
      else timer = setTimeout(expire, Math.min(remaining, 2147483647));
    };
    expire();
  }
  child.stderr.on("data", (part) => {
    admit(part.length);
    if (stderr.length < 4096)
      stderr += part.subarray(0, 4096 - stderr.length).toString("utf8");
  });
  try {
    for await (const chunk of child.stdout) {
      admit(chunk.length);
      if (failure) throw failure;
      let offset = 0;
      while (offset < chunk.length) {
        const end = chunk.indexOf(0, offset),
          stop = end < 0 ? chunk.length : end,
          part = chunk.subarray(offset, stop);
        if (pending.length + part.length > 65536)
          throw new Error("git-path-fragment-capacity");
        const entry = pending.length ? Buffer.concat([pending, part]) : part;
        if (end < 0) {
          pending = Buffer.from(entry);
          break;
        }
        pending = Buffer.alloc(0);
        if (!entry.length) throw new Error("Empty Git path record.");
        signal?.throwIfAborted();
        if (failure) throw failure;
        yield pathDecoder.decode(entry);
        offset = stop + 1;
      }
    }
    const result = await completed;
    if (failure) throw failure;
    if (result.error) throw result.error;
    if (result.code !== 0) throw new Error(`Git discovery failed: ${stderr}`);
    if (pending.length) throw new Error("Truncated Git path record.");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
    if (child.exitCode === null) child.kill();
    await completed;
  }
}

/** Unsupported JSON dialects are obligations that fail admission, not filters. */
function assertQualified(path) {
  assertRepositoryPath(path);
  if (!isStrictJsonPath(path) && !isJsonLinesPath(path))
    throw new Error(`Unqualified JSON dialect: ${path}`);
}

/** Directory membership observations exclude access times changed by reading. */
function directoryObservation(stat) {
  return [stat.dev, stat.ino, stat.mtimeNs, stat.ctimeNs, stat.mode].join(":");
}

/** Bind tool authority and the canonical root before either enumeration. */
function repositoryRoot(root, gitExecutable) {
  root = realpathSync(resolve(root));
  assertRegularDirectory(root, "");
  if (
    gitExecutable !== undefined &&
    (!isAbsolute(gitExecutable) ||
      !lstatSync(gitExecutable).isFile() ||
      isPathContained(root, realpathSync(gitExecutable)))
  )
    throw new TypeError(
      "Explicit Git must be an absolute external regular executable.",
    );
  return root;
}

/** Discover all required physical sources without retaining a JS inventory.
 * The trusted caller supplies policy matching and a configured native session.
 * Provider inventory closure does not assert that any source has been checked.
 */
export async function discoverRepositorySources({
  root,
  session,
  contractFor,
  capacities,
  gitExecutable,
  requiredOutputs = [],
  signal,
}) {
  if (typeof contractFor !== "function")
    throw new TypeError("Trusted policy matcher required.");
  root = repositoryRoot(root, gitExecutable);
  const command = (name, fields = {}) => {
    signal?.throwIfAborted();
    return session.command(name, fields);
  };
  for (const id of ["git", "tree"])
    await command("census-provider", { id, kind: "physical", minimum: "0" });
  const gitHash = createHash("sha256");
  for await (const entry of gitRecords(
    gitExecutable ?? "git",
    root,
    ["ls-files", "--stage", "-z"],
    capacities,
    signal,
  )) {
    gitHash.update(entry).update("\0");
    const tab = entry.indexOf("\t");
    if (tab < 0) throw new Error("Invalid Git stage record.");
    const path = entry.slice(tab + 1);
    if (!JSON_SUFFIX.test(path)) continue;
    assertQualified(path);
    const header = entry
      .slice(0, tab)
      .match(/^([0-7]{6}) ([a-f0-9]{40,64}) ([0-3])$/u);
    if (!header || header[3] !== "0")
      throw new Error(`Unmerged JSON entry: ${path}`);
    const absolute = assertRegularSource(root, path, header[1]);
    await command("census-add", {
      provider: "git",
      path,
      observation: sourceObservation(observeRegularFile(absolute)),
    });
  }
  await command("census-close-inventory", {
    provider: "git",
    observation: gitHash.digest("hex"),
  });
  await command("census-enqueue-directory", { provider: "tree", path: "" });
  while (true) {
    const { directory } = (
      await command("census-take-directory", { provider: "tree" })
    ).result;
    if (directory === null) break;
    const absolute = assertRegularDirectory(root, directory),
      before = lstatSync(absolute, { bigint: true }),
      handle = await opendir(absolute, { bufferSize: 16, encoding: "buffer" });
    try {
      while (true) {
        const entry = await handle.read();
        if (!entry) break;
        const name = pathDecoder.decode(entry.name),
          path = directory ? directory + "/" + name : name,
          contract = contractFor(path + (entry.isDirectory() ? "/" : "")),
          directoryContract = entry.isSymbolicLink()
            ? contractFor(path + "/")
            : contract;
        if (contract.exclude || directoryContract.exclude) continue;
        if (entry.isSymbolicLink())
          throw new Error(`Nonregular JSON discovery path: ${path}`);
        if (entry.isDirectory())
          await command("census-enqueue-directory", { provider: "tree", path });
        else if (JSON_SUFFIX.test(path)) {
          assertQualified(path);
          const absolute = assertRegularSource(root, path);
          await command("census-add", {
            provider: "tree",
            path,
            observation: sourceObservation(observeRegularFile(absolute)),
          });
        }
      }
    } finally {
      await handle.close();
    }
    const after = lstatSync(assertRegularDirectory(root, directory), {
      bigint: true,
    });
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.mtimeNs !== after.mtimeNs
    )
      throw new Error(`Directory changed during discovery: ${directory}`);
    await command("census-close-directory", {
      provider: "tree",
      path: directory,
      observation: directoryObservation(after),
    });
  }
  await command("census-close-inventory", { provider: "tree" });
  // Required patterns are bounded caller control data. Iterate the indexed
  // census for each obligation rather than materializing the file inventory.
  for (const pattern of requiredOutputs) {
    if (typeof pattern !== "string")
      throw new TypeError("Required output pattern must be a string.");
    let after = "",
      found = false;
    while (true) {
      const { member } = (await command("census-next", { after })).result;
      if (!member) break;
      if (posix.matchesGlob(member.path, pattern)) {
        found = true;
        break;
      }
      after = member.path;
    }
    if (!found) throw new Error(`Missing required generated JSON: ${pattern}`);
  }
  // Native owners can supply the repository's only checked JSON. Empty physical
  // discovery is not an empty execution; the execution owner closes that claim.
  return (await command("census-status")).result;
}

/** Verify Git index membership and every walked directory remain unchanged.
 * The repository execution owner must finish this and source byte rechecks
 * before publishing overall success; census membership alone is insufficient.
 */
export async function recheckRepositoryDiscovery({
  root,
  session,
  capacities,
  gitExecutable,
  signal,
}) {
  root = repositoryRoot(root, gitExecutable);
  await recheckGitInventory(root, session, capacities, gitExecutable, signal);
  let after = null;
  while (true) {
    signal?.throwIfAborted();
    const { directory } = (
      await session.command("census-next-closed-directory", {
        provider: "tree",
        after,
      })
    ).result;
    if (!directory) break;
    const absolute = assertRegularDirectory(root, directory.path);
    if (
      directoryObservation(lstatSync(absolute, { bigint: true })) !==
      directory.observation
    )
      throw new Error(`Directory changed after discovery: ${directory.path}`);
    after = directory.path;
  }
}

async function recheckGitInventory(
  root,
  session,
  capacities,
  gitExecutable,
  signal,
) {
  const hash = createHash("sha256");
  for await (const entry of gitRecords(
    gitExecutable ?? "git",
    root,
    ["ls-files", "--stage", "-z"],
    capacities,
    signal,
  ))
    hash.update(entry).update("\0");
  const before = (
    await session.command("census-provider-observation", { provider: "git" })
  ).result.observation;
  if (hash.digest("hex") !== before)
    throw new Error("Git inventory changed after discovery.");
}

/** After explicit owned replacements, mtime changes are expected. Re-enumerate
 * every original directory with bounded reads, verify its object identity and
 * every relevant child against the independently closed census. New JSON or
 * unexcluded directories refuse completion; peer bytes are rehashed separately.
 */
export async function recheckRepositoryWriteDiscovery({
  root,
  session,
  capacities,
  gitExecutable,
  signal,
  contractFor,
}) {
  root = repositoryRoot(root, gitExecutable);
  await recheckGitInventory(root, session, capacities, gitExecutable, signal);
  let after = null;
  while (true) {
    signal?.throwIfAborted();
    const { directory } = (
      await session.command("census-next-closed-directory", {
        provider: "tree",
        after,
      })
    ).result;
    if (!directory) break;
    const absolute = assertRegularDirectory(root, directory.path);
    const before = lstatSync(absolute, { bigint: true });
    if (
      directory.observation.split(":").slice(0, 2).join(":") !==
      [before.dev, before.ino].join(":")
    )
      throw new Error(
        `Directory object changed after discovery: ${directory.path}`,
      );
    const handle = await opendir(absolute, {
      bufferSize: 16,
      encoding: "buffer",
    });
    try {
      while (true) {
        const entry = await handle.read();
        if (!entry) break;
        signal?.throwIfAborted();
        const name = pathDecoder.decode(entry.name),
          path = directory.path ? directory.path + "/" + name : name,
          contract = contractFor(path + (entry.isDirectory() ? "/" : ""));
        if (
          contract.exclude ||
          (entry.isSymbolicLink() && contractFor(path + "/").exclude)
        )
          continue;
        if (entry.isSymbolicLink())
          throw new Error(
            `Nonregular discovery path during replacement: ${path}`,
          );
        if (entry.isDirectory()) {
          assertRegularDirectory(root, path);
          if (
            (await session.command("rewrite-directory", { path })).result
              .observation === null
          )
            throw new Error(`New directory during replacement: ${path}`);
        } else if (JSON_SUFFIX.test(path)) {
          assertQualified(path);
          assertRegularSource(root, path);
          if (!(await session.command("census-get", { path })).result.member)
            throw new Error(`New JSON source during replacement: ${path}`);
        }
      }
    } finally {
      await handle.close();
    }
    if (
      directoryObservation(before) !==
      directoryObservation(lstatSync(absolute, { bigint: true }))
    )
      throw new Error(
        `Directory changed during replacement recheck: ${directory.path}`,
      );
    after = directory.path;
  }
}
