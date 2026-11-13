// SPDX-License-Identifier: AGPL-3.0-only
/** Native Git verifies the exact annotated object against explicit public owner keys.
 * Keep historical keys on rotation; optional OpenSSH validity windows apply at signing time.
 */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { native, budgets } from "./qualification-process.js";

export const releaseSigners = JSON.parse(
  readFileSync(new URL("../.github/release-signers.json", import.meta.url)),
);

export function verifyOwnerTagSignature(
  tag,
  oid,
  source,
  {
    trust = releaseSigners,
    cwd = process.cwd(),
    invoke = native,
    deadline,
  } = {},
) {
  assert.match(tag, /^(?:v[^\s/]+|release-history-[a-zA-Z0-9._-]{1,100})$/u);
  for (const value of [oid, source]) assert.match(value, /^[a-f0-9]{40}$/u);
  assert.equal(trust.schemaVersion, 1);
  assert.equal(trust.owner, "maksymshostak");
  assert.ok(Array.isArray(trust.keys) && trust.keys.length > 0);
  const signers =
    trust.keys
      .map(({ principal, publicKey, validAfter, validBefore }) => {
        assert.match(principal, /^[a-zA-Z0-9@._+-]+$/u);
        assert.match(publicKey, /^ssh-ed25519 [A-Za-z0-9+/]+={0,2}$/u);
        const options = [];
        for (const [name, value] of [
          ["valid-after", validAfter],
          ["valid-before", validBefore],
        ])
          if (value !== undefined) {
            assert.match(value, /^\d{14}Z$/u);
            options.push(`${name}="${value}"`);
          }
        return `${principal} ${options.length ? options.join(",") + " " : ""}${publicKey}`;
      })
      .join("\n") + "\n";
  const git = (...args) => {
    const timeout =
      deadline === undefined
        ? budgets.read
        : Math.min(budgets.read, Math.floor(deadline - performance.now()));
    if (timeout <= 0)
      throw Object.assign(
        new Error("Tag verification observation deadline exhausted"),
        { code: "ETIMEDOUT" },
      );
    return invoke("git", args, { cwd, timeout }).trim();
  };
  // Checkout normally carries tags. Fetch only the exact missing object, without changing refs.
  try {
    assert.equal(git("cat-file", "-t", oid), "tag");
  } catch {
    git(
      "fetch",
      "--no-tags",
      "--no-write-fetch-head",
      "https://github.com/Hadden-Industries/json-quality.git",
      oid,
    );
  }
  const object = git("cat-file", "tag", oid);
  assert.ok(
    object.startsWith(`object ${source}\ntype commit\ntag ${tag}\n`),
    "Signed tag object differs from admitted source/ref",
  );
  const armor = [...object.matchAll(/^-----BEGIN [^-\r\n]+-----$/gmu)];
  assert.equal(armor.length, 1, "Exactly one SSH tag signature is required");
  assert.equal(
    armor[0][0],
    "-----BEGIN SSH SIGNATURE-----",
    "Release tags require the approved SSH signature format",
  );
  assert.match(
    object.slice(armor[0].index),
    /^-----BEGIN SSH SIGNATURE-----\n[A-Za-z0-9+/=\n]+\n-----END SSH SIGNATURE-----\n?$/u,
    "Malformed SSH tag signature armor",
  );
  const scratch = mkdtempSync(join(tmpdir(), "json-quality-signers-"));
  try {
    const path = join(scratch, "allowed-signers");
    writeFileSync(path, signers, { flag: "wx" });
    git(
      "-c",
      "gpg.format=ssh",
      "-c",
      `gpg.ssh.allowedSignersFile=${path}`,
      "-c",
      "gpg.ssh.revocationFile=",
      "-c",
      "gpg.ssh.program=ssh-keygen",
      "verify-tag",
      "--raw",
      oid,
    );
    return { tag, oid, source, owner: trust.owner };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}
