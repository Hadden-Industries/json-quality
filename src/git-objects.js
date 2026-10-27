// SPDX-License-Identifier: AGPL-3.0-only
// Raw immutable Git data transport. No checkout, filters, hooks or lazy fetch.
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, realpathSync } from "node:fs";
import { delimiter, isAbsolute, join } from "node:path";
import { isPathContained, assertRepositoryPath } from "./paths.js";
import { gitRecords, gitReadEnvironment } from "./repository-discovery.js";
import { sourceObservation } from "./source-observation.js";

/** Fixed-size metadata query rejects a tree/tag identity posing as a commit.
 * No source body is buffered through execFile.
 */
export async function assertGitCommit(
  /** @type {*} */ { executable, root, sha, capacities, signal },
) {
  const { stdout } = await promisify(execFile)(
    executable,
    ["-C", root, "cat-file", "-t", sha],
    {
      cwd: root,
      windowsHide: true,
      encoding: "utf8",
      maxBuffer: 64,
      timeout:
        capacities.maxGitTimeMs === null
          ? undefined
          : Math.min(Number(capacities.maxGitTimeMs), 2147483647),
      signal,
      env: gitReadEnvironment(),
    },
  );
  if (stdout !== "commit\n")
    throw new Error("Immutable Git source must name a commit.");
}

/** Select an external native executable, then bind its canonical path/identity
 * for this operation. JSON data never supplies an executable or Git arguments.
 */
export function gitObjectAuthority(/** @type {*} */ roots) {
  const path = (process.env.PATH ?? process.env.Path ?? "")
    .split(delimiter)
    .filter(isAbsolute)
    .map((directory) =>
      join(directory, process.platform === "win32" ? "git.exe" : "git"),
    )
    .find(
      (candidate) =>
        existsSync(candidate) &&
        lstatSync(candidate).isFile() &&
        roots.every(
          (/** @type {*} */ root) =>
            !isPathContained(root, realpathSync(candidate)),
        ),
    );
  if (!path) throw new Error("External native Git executable is required.");
  const executable = realpathSync(path),
    observation = sourceObservation(lstatSync(executable, { bigint: true }));
  return {
    executable,
    recheck() {
      if (
        realpathSync(path) !== executable ||
        sourceObservation(lstatSync(executable, { bigint: true })) !==
          observation
      )
        throw new Error("Git executable authority changed.");
    },
  };
}

/** Long tree records carry the exact byte length before any blob is opened.
 * Only one bounded record is retained; the growing census belongs to SQLite.
 */
export async function* gitTree(
  /** @type {*} */ { executable, root, sha, capacities, signal, path },
) {
  const args = ["ls-tree", "-r", "-l", "-z", sha];
  if (path !== undefined) args.push("--", path);
  for await (const entry of gitRecords(
    executable,
    root,
    args,
    capacities,
    signal,
  )) {
    const match =
      /^([0-7]{6}) (blob|tree|commit) ([a-f0-9]{40}) +([0-9]+|-)\t([\s\S]+)$/u.exec(
        entry,
      );
    if (!match) throw new Error("Invalid immutable Git tree record.");
    yield {
      mode: match[1],
      type: match[2],
      oid: match[3],
      byteLength: match[4],
      path: match[5],
    };
  }
}

export function assertGitJsonBlob(/** @type {*} */ member) {
  assertRepositoryPath(member.path);
  if (
    member.path
      .split("/")
      .some((/** @type {*} */ part) => part.toLowerCase() === ".git") ||
    member.type !== "blob" ||
    !["100644", "100755"].includes(member.mode) ||
    !/^(0|[1-9][0-9]*)$/u.test(member.byteLength)
  )
    throw new Error("Candidate JSON must be contained regular Git blobs.");
}

/** Stream and verify the actual Git object hash and declared length before EOF
 * reaches the native capture terminator. Hashing uses Git's blob framing, so a
 * successful subprocess exit alone is insufficient evidence of source identity.
 * Stderr is bounded separately; stdout is the admitted JSON payload, not a Git
 * metadata-output buffer. The owner must provide a finite operation signal.
 */
export async function* gitBlob(
  /** @type {*} */ { executable, root, member, capacities, signal },
) {
  signal.throwIfAborted();
  const child = spawn(
    executable,
    ["-C", root, "cat-file", "blob", member.oid],
    {
      cwd: root,
      windowsHide: true,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      env: gitReadEnvironment(),
    },
  );
  const completed = new Promise((settle) => {
      child.once("error", (error) => settle({ error }));
      child.once("close", (code) => settle({ code }));
    }),
    hash = createHash("sha1").update(`blob ${member.byteLength}\0`);
  let length = 0n,
    failure,
    stderrBytes = 0,
    timer;
  const fail = (/** @type {*} */ error) => {
      failure ??= error;
      child.kill();
    },
    abort = () => fail(signal.reason ?? new Error("Git blob cancelled."));
  child.stderr.on("data", (part) => {
    stderrBytes += part.length;
    if (stderrBytes > 4096) fail(new Error("git-blob-stderr-capacity"));
  });
  child.stderr.on("error", fail);
  if (capacities.maxGitTimeMs !== null) {
    const began = performance.now(),
      expire = () => {
        const remaining =
          Number(capacities.maxGitTimeMs) - (performance.now() - began);
        if (remaining <= 0) fail(new Error("git-time-capacity"));
        else timer = setTimeout(expire, Math.min(remaining, 2147483647));
      };
    expire();
  }
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  try {
    for await (const part of child.stdout) {
      signal.throwIfAborted();
      if (failure) throw failure;
      length += BigInt(part.length);
      if (length > BigInt(member.byteLength))
        throw new Error("Git blob length changed.");
      hash.update(part);
      yield part;
    }
    const result = await completed;
    if (failure) throw failure;
    if (result.error) throw result.error;
    if (
      result.code !== 0 ||
      length !== BigInt(member.byteLength) ||
      hash.digest("hex") !== member.oid
    )
      throw new Error("Git blob identity verification failed.");
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
    if (child.exitCode === null) child.kill();
    await completed;
  }
}
