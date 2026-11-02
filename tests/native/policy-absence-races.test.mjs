// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtemp,
  readFile,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { createRepositorySession } from "../../src/session-surface.js";
import { nativeTemporaryRoot, verifiedComponent } from "./client.mjs";

const original = '{"value":1}';

async function fixture(
  t,
  { configuration, documents = { "authored.json": original } } = {},
) {
  const root = await mkdtemp(join(nativeTemporaryRoot, "policy-absence-race-"));
  let session;
  t.after(async () => {
    try {
      await session?.close();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  execFileSync("git", ["-C", root, "init", "--quiet"], { windowsHide: true });
  if (configuration !== undefined)
    await writeFile(
      join(root, ".json-quality.json"),
      JSON.stringify(configuration, null, 2) + "\n",
    );
  for (const [path, bytes] of Object.entries(documents))
    await writeFile(join(root, path), bytes);
  return {
    root,
    async open() {
      session = await createRepositorySession(verifiedComponent, {
        root,
        temporaryDirectory: nativeTemporaryRoot,
      });
      return session;
    },
    async unchanged() {
      for (const [path, bytes] of Object.entries(documents))
        assert.equal(await readFile(join(root, path), "utf8"), bytes, path);
    },
  };
}

async function check(session) {
  const events = [];
  for await (const event of session.check()) events.push(event);
  assert.equal(events.at(-1).type, "execution-terminal");
  assert.equal(events.at(-1).sourceObservationsComplete, true);
  return events;
}

async function refusedRewrite(session, mutate, phase) {
  if (phase === "after-check") await mutate();
  const events = [];
  let mutated = phase === "after-check";
  for await (const event of session.rewrite("format", {
    files: ["authored.json"],
  })) {
    events.push(event);
    if (phase === "after-preflight" && event.type === "write-preflight") {
      assert.equal(mutated, false);
      await mutate();
      mutated = true;
    }
  }
  assert.equal(
    mutated,
    true,
    "The deterministic mutation point must be reached",
  );
  const terminal = events.at(-1);
  assert.equal(terminal.type, "write-failure", terminal.message);
  assert.equal(terminal.writtenPathCount, "0");
  assert.equal(terminal.preflightComplete, phase === "after-preflight");
  assert.equal(
    events.some((event) => event.type === "written"),
    false,
  );
  return terminal;
}

for (const phase of ["after-check", "after-preflight"]) {
  test(`observed policy absence refuses creation ${phase} before any source write`, async (t) => {
    const f = await fixture(t),
      session = await f.open();
    const checked = await check(session);
    assert.equal(checked[0].configurationOrigin.kind, "repository-absence");
    const terminal = await refusedRewrite(
      session,
      () => writeFile(join(f.root, ".json-quality.json"), "{}\n"),
      phase,
    );
    assert.match(terminal.message, /Configuration appeared/u);
    await f.unchanged();
  });

  test(`present policy refuses removal ${phase} without falling back to defaults`, async (t) => {
    const f = await fixture(t, { configuration: {} }),
      session = await f.open();
    const checked = await check(session);
    assert.equal(checked[0].configurationOrigin.kind, "repository-file");
    await refusedRewrite(
      session,
      () => unlink(join(f.root, ".json-quality.json")),
      phase,
    );
    await f.unchanged();
  });
}

for (const present of [false, true]) {
  test(`${present ? "present policy" : "policy absence"} refuses symlink substitution after complete write preflight`, async (t) => {
    const f = await fixture(t, { configuration: present ? {} : undefined });
    const target = join(f.root, ".policy-target"),
      probe = join(f.root, ".policy-link-probe");
    await writeFile(target, "{}\n");
    try {
      await symlink(target, probe, "file");
      await unlink(probe);
    } catch (error) {
      if (!["EPERM", "EACCES", "ENOSYS", "ENOTSUP"].includes(error.code))
        throw error;
      t.skip(`Host cannot create a file symlink: ${error.code}`);
      return;
    }
    const session = await f.open();
    await check(session);
    await refusedRewrite(
      session,
      async () => {
        if (present) await unlink(join(f.root, ".json-quality.json"));
        await symlink(target, join(f.root, ".json-quality.json"), "file");
      },
      "after-preflight",
    );
    await f.unchanged();
    assert.equal(await readFile(target, "utf8"), "{}\n");
  });
}

test("policy creation during the lazy no-config check cannot deliver a completed census", async (t) => {
  const f = await fixture(t),
    session = await f.open();
  let mutated = false,
    completed = false;
  await assert.rejects(async () => {
    for await (const event of session.check()) {
      if (event.type === "execution") {
        assert.equal(event.configurationOrigin.kind, "repository-absence");
        await writeFile(join(f.root, ".json-quality.json"), "{}\n");
        mutated = true;
      }
      if (event.type === "execution-terminal") completed = true;
    }
  }, /Configuration appeared/u);
  assert.equal(mutated, true);
  assert.equal(completed, false);
  await f.unchanged();
});

for (const files of [
  ["nfc.json", "preserve.json"],
  ["preserve.json", "nfc.json"],
]) {
  for (const dryRun of [false, true]) {
    test(`mixed NFC/preserve ${dryRun ? "preview" : "normalization"} refuses before writes with ${files[0]} first`, async (t) => {
      const documents = {
        "nfc.json": '{\n  "value": "e\\u0301",\n  "number": 1.00\n}\n',
        "preserve.json": '{\n  "value": "e\\u0301",\n  "number": 2.00\n}\n',
      };
      const f = await fixture(t, {
        documents,
        configuration: {
          exceptions: [
            {
              paths: ["preserve.json"],
              normalization: "preserve",
              owner: "Protocol owner",
              reason: "Exact decoded Unicode belongs to the protocol.",
            },
          ],
        },
      });
      const session = await f.open();
      await check(session);
      const events = [];
      for await (const event of session.rewrite("normalize", { files, dryRun }))
        events.push(event);
      const terminal = events.at(-1);
      assert.equal(terminal.type, "write-failure", terminal.message);
      assert.match(terminal.message, /preserve/u);
      assert.equal(terminal.writtenPathCount, "0");
      assert.equal(terminal.preflightComplete, false);
      assert.equal(
        events.some((event) =>
          [
            "written",
            "write-terminal",
            "normalization-preview-terminal",
          ].includes(event.type),
        ),
        false,
      );
      await f.unchanged();
    });
  }
}
