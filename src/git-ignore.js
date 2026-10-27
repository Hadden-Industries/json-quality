// SPDX-License-Identifier: AGPL-3.0-only
// Complete, correlated Git ignore decisions for one bounded path batch.
import { assertRepositoryPath } from "./paths.js";
import { gitReadEnvironment } from "./repository-discovery.js";
import { runBoundedTool } from "./bounded-process.js";

export function gitIgnoreBatchLimits(/** @type {*} */ resources) {
  const maximumOutputBytes = Math.min(
    resources.admission.maxGitOutputBytes ?? 262144,
    262144,
  );
  return {
    maximumPaths: 256,
    // Leave room for three metadata fields per correlated path in stdout.
    maximumInputBytes: Math.min(
      65536,
      Math.max(1, Math.floor(maximumOutputBytes / 4)),
    ),
    maximumOutputBytes,
    // Input UTF-8/UTF-16, capture/concat, decoded fields and bounded metadata.
    // Runtime/OS allocation overhead remains separately measured.
    reservationBytes: maximumOutputBytes * 16 + 256 * 1024 + 65536,
  };
}

/** --non-matching provides a result for EVERY path. Missing complete records
 * cannot be mistaken for permission, even when truncation lands on a NUL.
 */
export function decodeGitIgnoreDecisions(
  /** @type {*} */ stdout,
  /** @type {*} */ paths,
  /** @type {*} */ code,
) {
  if (!Buffer.isBuffer(stdout) || !stdout.length || stdout.at(-1) !== 0)
    throw new Error("Incomplete Git ignore response.");
  const fields = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })
    .decode(stdout)
    .split("\0");
  fields.pop();
  if (fields.length !== paths.length * 4)
    throw new Error("Incomplete Git ignore decisions.");
  const expected = new Set(paths),
    ignored = new Set();
  let matched = false;
  for (let index = 0; index < fields.length; index += 4) {
    const [source, line, pattern, path] = fields.slice(index, index + 4);
    if (!expected.delete(path))
      throw new Error("Unexpected or duplicate Git ignore path.");
    if (!source && !line && !pattern) continue;
    if (!source || !/^[1-9][0-9]*$/u.test(line) || !pattern)
      throw new Error("Invalid Git ignore pattern record.");
    matched = true;
    if (!pattern.startsWith("!")) ignored.add(path);
  }
  // In verbose mode Git returns zero for a matching NEGATION too.
  if (expected.size || code !== (matched ? 0 : 1))
    throw new Error("Inconsistent Git ignore completion.");
  return ignored;
}

export /** @returns {*} */ async function ignoredGitPaths(
  /** @type {*} */ root,
  /** @type {*} */ paths,
  /** @type {*} */ execution,
  /** @type {*} */ gitExecutable,
) {
  if (!paths.length) return new Set();
  const limits = gitIgnoreBatchLimits(execution.numericResources);
  let bytes = 0;
  if (paths.length > limits.maximumPaths)
    throw new Error("git-ignore-path-capacity");
  for (const path of paths) {
    assertRepositoryPath(path);
    if (!path.isWellFormed())
      throw new Error("Invalid Git ignore path encoding.");
    bytes += Buffer.byteLength(path) + 1;
    if (bytes > limits.maximumInputBytes)
      throw new Error("git-ignore-input-capacity");
  }
  const { admission, runtime } = execution.numericResources;
  try {
    const { code, stdout } = await runBoundedTool(
      gitExecutable ?? "git",
      [
        "-C",
        root,
        "check-ignore",
        "--stdin",
        "-z",
        "--no-index",
        "--verbose",
        "--non-matching",
      ],
      {
        cwd: root,
        env: gitReadEnvironment(),
        input: Buffer.from(paths.join("\0") + "\0"),
        timeout: Math.min(
          admission.maxGitTimeMs ?? runtime.maxCheckTimeMs,
          runtime.maxCheckTimeMs,
        ),
        maximumOutputBytes: limits.maximumOutputBytes,
        signal: execution.signal,
        acceptedExitCodes: [0, 1],
        captureOutput: true,
      },
    );
    return decodeGitIgnoreDecisions(stdout, paths, code);
  } catch (error) {
    // Long repeated rule metadata can exceed a capture even when input fits.
    // Retry smaller batches only after the failed child has fully settled.
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "native-tool-output-capacity" ||
      paths.length === 1
    )
      throw error;
    const middle = Math.ceil(paths.length / 2),
      /** @type {any} */ ignored = await ignoredGitPaths(
        root,
        paths.slice(0, middle),
        execution,
        gitExecutable,
      );
    for (const path of await ignoredGitPaths(
      root,
      paths.slice(middle),
      execution,
      gitExecutable,
    ))
      ignored.add(path);
    return ignored;
  }
}
