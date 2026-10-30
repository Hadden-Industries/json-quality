// SPDX-License-Identifier: AGPL-3.0-only
/** Startup-safe release records: no installed npm packages or service clients. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { PACKAGE_VERIFICATION_CAPABILITIES as packageCapabilities } from "../src/package-payload.js";

export function effectJournal(phase, origin) {
  assert.ok(["stage", "archive", "promote"].includes(phase));
  if (origin.service) {
    assert.equal(phase, "promote");
    assert.ok(["npm", "github"].includes(origin.service));
  }
  for (const value of [origin.run, origin.attempt])
    assert.match(String(value), /^[1-9]\d{0,15}$/u);
  return `${phase}${origin.service ? `-${origin.service}` : ""}-${origin.run}-${origin.attempt}.jsonl`;
}
export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export const sha512 = (bytes) =>
  "sha512-" + createHash("sha512").update(bytes).digest("base64");
export const jsonBytes = (value) =>
  Buffer.from(JSON.stringify(value, null, 2) + "\n");
export function save(path, value) {
  writeFileSync(path, Buffer.isBuffer(value) ? value : jsonBytes(value), {
    flag: "wx",
    flush: true,
  });
}
export function regularBytes(path, limit = 20000000) {
  const stat = lstatSync(path);
  assert.ok(
    stat.isFile() && !stat.isSymbolicLink() && stat.size <= limit,
    "Unsafe or oversized evidence file",
  );
  return readFileSync(path);
}
/** Binary subjects share package transport bounds; metadata keeps its own bound. */
export function releaseArtifactBytes(path) {
  return regularBytes(
    path,
    /\.(?:tgz|tar\.gz)$/u.test(String(path))
      ? packageCapabilities.maximumArchiveBytes
      : 20000000,
  );
}
export const readJson = (path) => JSON.parse(regularBytes(path));

/** Index only bounded ordinary files; artifact consumers name each retained member. */
export function evidenceIndex(directory) {
  const entries = readdirSync(directory, {
    recursive: true,
    withFileTypes: true,
  });
  assert.ok(
    entries.every((entry) => entry.isFile() || entry.isDirectory()),
    "Linked or unsupported evidence entry",
  );
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const full = join(entry.parentPath, entry.name),
        name = full.slice(directory.length + 1).replaceAll("\\", "/");
      const bytes = releaseArtifactBytes(full);
      return { name, sha256: sha256(bytes), size: bytes.length };
    });
  assert.ok(files.length <= 4096);
  return files;
}
export function sealBundle(directory, manifestSha) {
  const files = evidenceIndex(directory).filter(
    ({ name }) => name !== "evidence-index.json",
  );
  writeFileSync(
    join(directory, "evidence-index.json"),
    jsonBytes({ schemaVersion: 1, manifestSha256: manifestSha, files }),
    { flush: true },
  );
}
export function recordNoRequest(directory, phase, env) {
  const origin = {
    run: env.GITHUB_RUN_ID,
    attempt: env.GITHUB_RUN_ATTEMPT,
    ...(env.PROMOTION_SERVICE ? { service: env.PROMOTION_SERVICE } : {}),
  };
  const journal = join(directory, effectJournal(phase, origin));
  assert.ok(
    !existsSync(journal) || regularBytes(journal).length === 0,
    "No-request marker conflicts with a request journal",
  );
  const path = join(
      directory,
      `no-effect-${phase}${origin.service ? `-${origin.service}` : ""}-${origin.run}-${origin.attempt}.json`,
    ),
    marker = {
      schemaVersion: 1,
      state: "no-request",
      phase,
      ...origin,
      controller: env.GITHUB_SHA,
      manifestSha256: env.MANIFEST_SHA,
    };
  if (existsSync(path)) assert.deepEqual(readJson(path), marker);
  else save(path, marker);
}
