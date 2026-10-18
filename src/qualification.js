// SPDX-License-Identifier: AGPL-3.0-only
/** Trusted consumer checking: candidate JSON is materialized as data, never executed. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  realpathSync,
  lstatSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve, isAbsolute, delimiter } from "node:path";
import { JSON_SUFFIX, readJsonPolicy } from "./quality.js";
import { operationLimits } from "./limits.js";
import { assertRepositoryPath, isPathContained } from "./paths.js";
import { captureSource } from "./replacement.js";
import { runJsonQuality } from "./execution.js";

/** Check one immutable candidate tree under another immutable tree's JSON policy.
 * Native/logical adapters are deliberately rejected: source-only qualification
 * cannot certify their absent census, storage admission or domain checks.
 */
export async function qualifyJsonConsumer({
  trustedRoot,
  candidateRoot,
  trustedSha,
  candidateSha,
  capacityLimits: overrides,
  ...otherOptions
}) {
  if (Object.hasOwn(otherOptions, "limits"))
    throw new TypeError("Use capacityLimits; limits is not supported.");
  let capacityLimits = operationLimits({}, overrides);
  trustedRoot = realpathSync(resolve(trustedRoot));
  candidateRoot = realpathSync(resolve(candidateRoot));
  for (const sha of [trustedSha, candidateSha])
    if (!/^[a-f0-9]{40}$/u.test(sha ?? ""))
      throw new TypeError("Full immutable source commits are required.");
  const gitPath = (process.env.PATH ?? process.env.Path ?? "")
    .split(delimiter)
    .filter(isAbsolute)
    .map((path) => join(path, process.platform === "win32" ? "git.exe" : "git"))
    .find(
      (path) =>
        existsSync(path) &&
        lstatSync(path).isFile() &&
        !isPathContained(candidateRoot, realpathSync(path)) &&
        !isPathContained(trustedRoot, realpathSync(path)),
    );
  if (!gitPath) throw new Error("External native Git executable is required.");
  const git = (root, args, maxBuffer = capacityLimits.maxGitOutputBytes) =>
    execFileSync(realpathSync(gitPath), ["-C", root, ...args], {
      windowsHide: true,
      cwd: root,
      timeout: Number.isFinite(capacityLimits.maxGitTimeMs)
        ? capacityLimits.maxGitTimeMs
        : 0,
      maxBuffer,
    });
  for (const [root, sha] of [
    [trustedRoot, trustedSha],
    [candidateRoot, candidateSha],
  ]) {
    if (
      git(root, ["rev-parse", "HEAD"]).toString().trim() !== sha ||
      git(root, ["status", "--porcelain", "--untracked-files=normal"]).length
    )
      throw new Error(
        "Consumer checkout identity is dirty or differs from the requested commit.",
      );
  }
  const policyEntry = git(trustedRoot, [
    "ls-tree",
    "-z",
    trustedSha,
    "--",
    ".json-quality.json",
  ]).toString("utf8");
  const match =
    /^(100644|100755) blob ([a-f0-9]{40})\t\.json-quality\.json\0$/u.exec(
      policyEntry,
    );
  if (!match)
    throw new Error(
      "Trusted policy must be a regular blob in the declared source commit.",
    );
  const policyLength = Number(
    git(trustedRoot, ["cat-file", "-s", match[2]]).toString().trim(),
  );
  if (
    !Number.isSafeInteger(policyLength) ||
    policyLength < 0 ||
    policyLength > capacityLimits.maxPolicyBytes ||
    lstatSync(join(trustedRoot, ".json-quality.json")).size >
      capacityLimits.maxPolicyBytes
  )
    throw new Error(
      "Trusted policy exceeds the selected bootstrap byte limit.",
    );
  const policyBytes = captureSource(trustedRoot, ".json-quality.json").bytes;
  if (
    !git(
      trustedRoot,
      ["cat-file", "blob", match[2]],
      Math.max(policyLength, 1),
    ).equals(policyBytes)
  )
    throw new Error("Trusted policy differs from its immutable Git blob.");
  const policy = await readJsonPolicy(trustedRoot, {
    maxPolicyBytes: capacityLimits.maxPolicyBytes,
  });
  if (
    !captureSource(trustedRoot, ".json-quality.json").bytes.equals(policyBytes)
  )
    throw new Error("Trusted policy changed during admission.");
  if (policy.nativeSources?.length || policy.preserveSourcePresentation?.length)
    throw new Error(
      "Trusted policy requires native/logical admission; use its trusted repository adapter instead of source-only qualification.",
    );
  capacityLimits = operationLimits(policy, overrides);
  const entries = new TextDecoder("utf-8", { fatal: true })
    .decode(git(candidateRoot, ["ls-tree", "-r", "-z", candidateSha]))
    .split("\0")
    .filter(Boolean);
  const scratch = mkdtempSync(join(tmpdir(), "json-quality-consumer-"));
  let count = 0;
  let bytes = policyBytes.length;
  const paths = new Set();
  try {
    for (const entry of entries) {
      const separator = entry.indexOf("\t");
      const [mode, type, oid] = entry.slice(0, separator).split(" ");
      const path = entry.slice(separator + 1);
      if (!JSON_SUFFIX.test(path) || path === ".json-quality.json") continue;
      assertRepositoryPath(path);
      if (
        path.split("/").some((part) => part.toLowerCase() === ".git") ||
        type !== "blob" ||
        !["100644", "100755"].includes(mode)
      )
        throw new Error("Candidate JSON must be contained regular Git blobs.");
      if (paths.has(path.toLowerCase()))
        throw new Error("Case-colliding candidate JSON paths.");
      paths.add(path.toLowerCase());
      if (++count + 1 > capacityLimits.maxFiles)
        throw new Error("Consumer JSON inventory exceeds its file limit.");
      const length = Number(
        git(candidateRoot, ["cat-file", "-s", oid]).toString().trim(),
      );
      if (
        !Number.isSafeInteger(length) ||
        length > capacityLimits.maxFileBytes ||
        bytes + length > capacityLimits.maxTotalBytes
      )
        throw new Error("Consumer JSON exceeds the selected byte budget.");
      const content = git(
        candidateRoot,
        ["cat-file", "blob", oid],
        Math.max(length, 1),
      );
      if (
        content.length !== length ||
        !captureSource(candidateRoot, path).bytes.equals(content)
      )
        throw new Error("Candidate JSON differs from its immutable Git blob.");
      bytes += content.length;
      mkdirSync(dirname(join(scratch, path)), { recursive: true });
      writeFileSync(join(scratch, path), content, { flag: "wx" });
    }
    // Only JSON data is copied, so candidate executable/configuration files cannot
    // shadow host Git, trigger attribute filters, or enter module resolution.
    writeFileSync(join(scratch, ".json-quality.json"), policyBytes, {
      flag: "wx",
    });
    git(scratch, ["init", "--quiet", "--template="]);
    git(scratch, ["-c", "core.autocrlf=false", "add", "--force", "--", "."]);
    const result = await runJsonQuality("check", {
      root: scratch,
      gitExecutable: realpathSync(gitPath),
      capacityLimits: overrides,
    });
    if (
      git(candidateRoot, ["rev-parse", "HEAD"]).toString().trim() !==
        candidateSha ||
      git(trustedRoot, ["rev-parse", "HEAD"]).toString().trim() !==
        trustedSha ||
      !captureSource(trustedRoot, ".json-quality.json").bytes.equals(
        policyBytes,
      )
    )
      throw new Error(
        "Consumer source or trusted policy changed during qualification.",
      );
    return {
      schemaVersion: 1,
      trustedSha,
      candidateSha,
      policySha256: createHash("sha256").update(policyBytes).digest("hex"),
      candidateDocuments: count,
      result,
      scope:
        "Tracked candidate JSON and trusted root policy; no candidate scripts, installs or native/logical adapter execution",
    };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}
