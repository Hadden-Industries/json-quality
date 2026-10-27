// SPDX-License-Identifier: AGPL-3.0-only
/** Compact, raw, digest-bound evidence through the maintained Actions SDK. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  lstatSync,
  readFileSync,
  mkdtempSync,
  appendFileSync,
  constants,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { native, budgets } from "./qualification-process.js";
import { transientReadError } from "./github-evidence.js";
import { artifactLimits } from "./artifact-policy.js";

const digest = (bytes) =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
export async function recoverableUpload({
  name,
  sha256,
  size,
  upload,
  lookup,
  now = Date.now,
  sleep = delay,
  deadline = now() + budgets.upload,
}) {
  const end = Math.min(deadline, now() + budgets.upload);
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (now() >= end)
      throw new Error("Artifact upload/reconciliation budget exhausted");
    const selected =
      attempt === 1
        ? name
        : /\.[a-z]+$/u.test(name)
          ? name.replace(/(\.[a-z]+)$/u, `-recovery-${attempt}$1`)
          : `${name}-recovery-${attempt}`;
    let failure, result;
    try {
      result = await upload(selected, end - now());
    } catch (error) {
      failure = error;
    }
    if (!failure) {
      assert.ok(Number.isSafeInteger(result.id) && result.id > 0);
      assert.equal(
        result.digest.startsWith("sha256:")
          ? result.digest
          : `sha256:${result.digest}`,
        sha256,
      );
      assert.equal(result.size, size);
      return { ...result, name: selected };
    }
    // An interrupted write has an unknown provider outcome. Only complete,
    // read-only lookups may establish adoption or absence before a fresh name.
    for (let observation = 0; observation < 3; observation++) {
      if (now() >= end)
        throw new Error("Artifact reconciliation budget exhausted", {
          cause: failure,
        });
      const matches = await lookup(selected, end - now());
      assert.ok(
        Array.isArray(matches) && matches.length <= 1,
        "Conflicting artifact candidates",
      );
      if (matches.length) {
        const found = matches[0];
        assert.ok(Number.isSafeInteger(found.id) && found.id > 0);
        assert.equal(
          found.digest?.startsWith("sha256:")
            ? found.digest
            : `sha256:${found.digest}`,
          sha256,
          "Artifact digest differs",
        );
        assert.equal(found.size, size, "Artifact size differs");
        return { ...found, name: selected, reconciled: true };
      }
      if (observation < 2) {
        const wait = 1000 * 2 ** observation;
        if (wait >= end - now()) throw failure;
        await sleep(wait);
      }
    }
    if (
      !transientReadError(failure) &&
      ![408, 429, 500, 502, 503, 504].includes(failure.httpStatus)
    )
      throw failure;
  }
  throw new Error("Artifact upload attempt bound exhausted");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const began = Date.now();
  const [mode, selectedPath, retention = "30"] = process.argv.slice(2);
  let pathOrName = selectedPath;
  if (mode === "sdk-upload" || mode === "sdk-lookup") {
    try {
      const { DefaultArtifactClient } = await import("@actions/artifact");
      const client = new DefaultArtifactClient();
      if (mode === "sdk-upload") {
        const result = await client.uploadArtifact(
          basename(pathOrName),
          [pathOrName],
          dirname(pathOrName),
          { skipArchive: true, retentionDays: Number(retention) },
        );
        console.log(JSON.stringify(result));
      } else {
        const result = await client.listArtifacts({ latest: false });
        assert.ok(result.artifacts.length < 1000, "Incomplete artifact lookup");
        console.log(
          JSON.stringify(
            result.artifacts.filter((value) => value.name === pathOrName),
          ),
        );
      }
    } catch (error) {
      console.log(
        JSON.stringify({
          sdkError: {
            name: error.name,
            code: error.code,
            httpStatus: error.statusCode ?? error.status,
          },
        }),
      );
      process.exitCode = 1;
    }
  } else {
    assert.ok(["upload", "bundle"].includes(mode));
    const maximum =
      mode === "bundle"
        ? artifactLimits.payloadBytes
        : artifactLimits.proofBytes;
    if (mode === "bundle") {
      const name = process.argv[5];
      assert.match(name, /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,200}$/u);
      const scratch = mkdtempSync(
        join(process.env.RUNNER_TEMP, "artifact-transport-"),
      );
      pathOrName = join(scratch, name);
      native(
        process.platform === "win32" ? "python" : "python3",
        [
          fileURLToPath(new URL("./pack-artifact.py", import.meta.url)),
          selectedPath,
          pathOrName,
          String(maximum),
        ],
        { timeout: budgets.upload, phase: "artifact-pack" },
      );
    }
    const stat = lstatSync(pathOrName);
    assert.ok(
      stat.isFile() &&
        !stat.isSymbolicLink() &&
        stat.size <=
          (mode === "bundle"
            ? maximum + artifactLimits.envelopeBytes
            : maximum),
      "Evidence must be a bounded regular file",
    );
    const bytes = readFileSync(pathOrName),
      sha256 = digest(bytes),
      name = basename(pathOrName);
    const invoke = (args, timeout) => {
      try {
        return JSON.parse(
          native(
            process.env.JSON_QUALITY_PRODUCER_NODE ?? process.execPath,
            [fileURLToPath(import.meta.url), ...args],
            { timeout, phase: "artifact-sdk" },
          )
            .trim()
            .split("\n")
            .at(-1),
        );
      } catch (error) {
        try {
          Object.assign(
            error,
            JSON.parse(error.stdout.trim().split("\n").at(-1)).sdkError,
          );
        } catch {
          /* Preserve native failure. */
        }
        throw error;
      }
    };
    const result = await recoverableUpload({
      name,
      sha256,
      size: bytes.length,
      deadline: began + budgets.upload,
      upload: (selected, timeout) => {
        assert.equal(
          digest(readFileSync(pathOrName)),
          sha256,
          "Evidence changed during upload",
        );
        const path =
          selected === name ? pathOrName : join(dirname(pathOrName), selected);
        if (path !== pathOrName)
          copyFileSync(pathOrName, path, constants.COPYFILE_EXCL);
        return invoke(["sdk-upload", path, retention], timeout);
      },
      lookup: (selected, timeout) => invoke(["sdk-lookup", selected], timeout),
    });
    console.log(JSON.stringify(result));
    if (process.env.GITHUB_OUTPUT)
      appendFileSync(
        process.env.GITHUB_OUTPUT,
        `artifact-id=${result.id}\nartifact-name=${result.name}\nartifact-digest=${result.digest}\n`,
      );
  }
}
