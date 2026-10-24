// SPDX-License-Identifier: AGPL-3.0-only
/** Bounded orchestration only: native gh owns release attestation verification. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { lstatSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { native } from "./qualification-process.js";
import {
  jsonBytes,
  repository,
  sha256,
  validVersion,
} from "./release-contract.js";

const batchMs = 540000,
  outputLimit = 1048576;

function verifyOne(args, signal, cacheDirectory) {
  return new Promise((resolveResult, reject) => {
    const child = spawn("gh", args, {
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      signal,
      timeout: 120000,
      killSignal: "SIGKILL",
      env: { ...process.env, XDG_CACHE_HOME: cacheDirectory },
    });
    const chunks = [];
    let size = 0,
      overflow = false;
    child.stdout.on("data", (bytes) => {
      size += bytes.length;
      if (size <= outputLimit) chunks.push(bytes);
      else {
        overflow = true;
        child.kill("SIGKILL");
      }
    });
    let diagnostics = "";
    child.stderr.on("data", (bytes) => {
      diagnostics = (diagnostics + bytes.toString("utf8")).slice(-4096);
    });
    let failure;
    child.on("error", (error) => {
      failure = error;
    });
    child.on("close", (code, termination) => {
      if (failure || code !== 0 || termination || overflow)
        return reject(
          failure ??
            new Error(
              JSON.stringify({
                message: "Native asset attestation failed",
                asset: args[3],
                code,
                termination,
                overflow,
                size,
                diagnostics,
              }),
            ),
        );
      try {
        const bytes = Buffer.concat(chunks),
          result = JSON.parse(bytes);
        assert.ok(
          result && typeof result === "object" && !Array.isArray(result),
        );
        resolveResult(sha256(bytes));
      } catch (error) {
        reject(error);
      }
    });
  });
}

export async function checkAssets(input, invoke = verifyOne) {
  assert.ok(validVersion(input.version));
  assert.equal(typeof input.directory, "string");
  assert.ok(
    Array.isArray(input.assets) &&
      input.assets.length > 0 &&
      input.assets.length <= 4096,
  );
  const directory = resolve(input.directory),
    names = new Set();
  for (const asset of input.assets) {
    assert.match(asset.name, /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,240}$/u);
    assert.ok(!names.has(asset.name), "Duplicate release asset");
    names.add(asset.name);
    const stat = lstatSync(join(directory, asset.name));
    assert.ok(stat.isFile() && !stat.isSymbolicLink());
  }
  const controller = new AbortController(),
    result = new Array(input.assets.length);
  // Native gh's TUF updater writes its cache; concurrent updaters must not share it.
  const cacheRoot = mkdtempSync(join(directory, ".gh-verification-"));
  const caches = Array.from(
    { length: Math.min(6, input.assets.length) },
    (_, worker) => {
      const cacheDirectory = join(cacheRoot, String(worker));
      mkdirSync(cacheDirectory);
      return cacheDirectory;
    },
  );
  const interrupt = () =>
    controller.abort(new Error("Asset verification interrupted"));
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  const timer = setTimeout(
    () => controller.abort(new Error("Asset verification deadline exceeded")),
    batchMs,
  );
  let cursor = 0,
    failure;
  try {
    await Promise.all(
      caches.map(async (cacheDirectory) => {
        while (!controller.signal.aborted && cursor < input.assets.length) {
          const index = cursor++,
            asset = input.assets[index];
          try {
            const digest = await invoke(
              [
                "release",
                "verify-asset",
                `v${input.version}`,
                join(directory, asset.name),
                "--repo",
                repository,
                "--format",
                "json",
              ],
              controller.signal,
              cacheDirectory,
            );
            assert.match(digest, /^[a-f0-9]{64}$/u);
            result[index] = { name: asset.name, nativeOutputSha256: digest };
          } catch (error) {
            failure ??= error;
            controller.abort(error);
          }
        }
      }),
    );
    if (failure) throw failure;
    assert.equal(
      controller.signal.aborted,
      false,
      "Incomplete native asset verification",
    );
    assert.equal(result.filter(Boolean).length, input.assets.length);
    return result;
  } finally {
    clearTimeout(timer);
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
  }
}

export function verifyNativeAssets(version, directory, assets) {
  const input = jsonBytes({
    version,
    directory: resolve(directory),
    assets: assets.map(({ name }) => ({ name })),
  });
  assert.ok(input.length <= outputLimit);
  return JSON.parse(
    native(process.execPath, [fileURLToPath(import.meta.url)], {
      input,
      timeout: batchMs + 30000,
      killSignal: "SIGKILL",
      phase: "release-asset-attestations",
    }),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = readFileSync(0);
  assert.ok(input.length <= outputLimit);
  process.stdout.write(
    JSON.stringify(await checkAssets(JSON.parse(input))) + "\n",
  );
}
