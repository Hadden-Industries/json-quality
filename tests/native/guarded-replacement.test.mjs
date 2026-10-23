// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  writeFile,
  readFile,
  readdir,
  rename,
  rm,
  stat,
} from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { replaceObservedSource } from "../../src/guarded-replacement.js";
import {
  identifyRepositorySource,
  observeRepositorySource,
} from "../../src/repository-source.js";
import { nativeTemporaryRoot } from "./client.mjs";

const identity = (text) => ({
  byteLength: String(Buffer.byteLength(text)),
  sha256: createHash("sha256").update(text).digest("hex"),
});
async function fixture(run) {
  const root = await mkdtemp(join(nativeTemporaryRoot, "guarded-write-"));
  try {
    await writeFile(join(root, "value.json"), "0\n");
    const member = await identifyRepositorySource({
      root,
      member: observeRepositorySource(root, "value.json"),
    });
    await run({ root, member });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("guarded replacement verifies staged bytes, preserves permissions and reports the committed identity", async () => {
  await fixture(async (options) => {
    const before = (await stat(join(options.root, "value.json"))).mode & 0o777,
      written = await replaceObservedSource({
        ...options,
        candidate: identity("1\n"),
        chunks: [Buffer.from("1"), Buffer.from("\n")],
      });
    assert.deepEqual(written, {
      path: "value.json",
      ...identity("1\n"),
      observation: observeRepositorySource(options.root, "value.json")
        .observation,
    });
    assert.equal(
      await readFile(join(options.root, "value.json"), "utf8"),
      "1\n",
    );
    assert.equal(
      (await stat(join(options.root, "value.json"))).mode & 0o777,
      before,
    );
    assert.deepEqual(await readdir(options.root), ["value.json"]);
  });
});

test("changed original identity and false candidate bytes cannot acquire a rename", async () => {
  await fixture(async (options) => {
    await assert.rejects(
      replaceObservedSource({
        ...options,
        candidate: identity("1\n"),
        chunks: [Buffer.from("2\n")],
      }),
      /staged bytes differ/,
    );
    assert.equal(
      await readFile(join(options.root, "value.json"), "utf8"),
      "0\n",
    );
    await writeFile(join(options.root, "other"), "0\n");
    await rename(join(options.root, "other"), join(options.root, "value.json"));
    await assert.rejects(
      replaceObservedSource({
        ...options,
        candidate: identity("1\n"),
        chunks: [Buffer.from("1\n")],
      }),
      /Source changed/,
    );
    assert.deepEqual(await readdir(options.root), ["value.json"]);
  });
});

test("producer interruption cleans only its own stage and leaves the original bytes", async () => {
  await fixture(async (options) => {
    async function* interrupted() {
      yield Buffer.from("1");
      throw new Error("fixture interruption");
    }
    await assert.rejects(
      replaceObservedSource({
        ...options,
        candidate: identity("1\n"),
        chunks: interrupted(),
      }),
      /fixture interruption/,
    );
    assert.equal(
      await readFile(join(options.root, "value.json"), "utf8"),
      "0\n",
    );
    assert.deepEqual(await readdir(options.root), ["value.json"]);
  });
});
