// SPDX-License-Identifier: AGPL-3.0-only
import { budgets } from "../../scripts/qualification-process.js";
import assert from "node:assert/strict";
import test from "node:test";
import { spawn, execFileSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  open,
  chmod,
  writeFile,
  readdir,
  readFile,
  realpath,
  rm,
} from "node:fs/promises";
import { join, relative, isAbsolute, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { NativeSession as CoreSession } from "../../src/native-session.js";
import {
  createSourceSession,
  createRepositorySession,
} from "../../src/session-surface.js";
import { verifiedComponent, nativeTemporaryRoot } from "./client.mjs";

test("native close preserves its first error, retains ownership and permits retry", async () => {
  const original = new Error("cleanup-remove"),
    binding = verifiedComponent.binding;
  let fail = true,
    releases = 0;
  const session = new CoreSession(
    {
      ...verifiedComponent,
      binding: {
        create: (...args) => binding.create(...args),
        hello: (...args) => binding.hello(...args),
        cancel: (...args) => binding.cancel(...args),
        exchange(handle, bytes) {
          if (
            fail &&
            bytes[0] === "c".charCodeAt(0) &&
            JSON.parse(bytes.subarray(5).toString("utf8")).command === "close"
          ) {
            fail = false;
            return Promise.reject(original);
          }
          return binding.exchange(handle, bytes);
        },
        release(handle) {
          releases++;
          return binding.release(handle);
        },
      },
    },
    join(nativeTemporaryRoot, "json-quality-close-no-spill-" + randomUUID()),
  );
  await session.configure();
  const first = session.close();
  assert.equal(session.close(), first);
  await assert.rejects(first, (error) => error === original);
  assert.equal(releases, 0);
  await assert.rejects(session.command("metrics"), /closed-session/);
  await session.close();
  assert.equal(releases, 1);
  await session.close();
  assert.equal(releases, 1);
});

for (const owner of ["source", "repository"])
  for (const kind of ["member", "directory"])
    test(
      `public ${owner} close retries a real scratch ${kind} removal failure and removes its owned spill`,
      { timeout: budgets.read },
      async (t) => {
        const directory = await mkdtemp(
          join(nativeTemporaryRoot, "json-quality-close-retry-"),
        );
        let session,
          scratch,
          reference,
          child,
          completed,
          unlocked = false;
        async function unlock() {
          if (!child || unlocked) return;
          unlocked = true;
          child.stdin.end();
          const [code, signal] = await completed;
          assert.equal(signal, null);
          assert.equal(code, 0);
        }
        t.after(async () => {
          const errors = [];
          const cleanup = [
            unlock,
            // Restore each known permission even if the helper was interrupted.
            ...[
              directory,
              scratch,
              scratch && join(scratch, "cleanup-blocked-child"),
            ]
              .filter(Boolean)
              .map(
                (path) => () =>
                  chmod(path, 0o700).catch((error) => {
                    if (error.code !== "ENOENT") throw error;
                  }),
              ),
            () => session?.close(),
            async () => {
              const target = await realpath(directory),
                parent = await realpath(nativeTemporaryRoot),
                inside = relative(parent, target);
              assert.ok(inside.startsWith("json-quality-close-retry-"));
              assert.ok(
                !isAbsolute(inside) &&
                  inside !== ".." &&
                  !inside.startsWith(".." + sep),
              );
              await rm(target, { recursive: true, force: true });
            },
          ];
          for (const operation of cleanup) {
            try {
              await operation();
            } catch (error) {
              errors.push(error);
            }
          }
          if (errors.length === 1) throw errors[0];
          if (errors.length > 1)
            throw new AggregateError(errors, "Scratch fixture cleanup failed");
        });
        function* source() {
          yield Buffer.from('"');
          const chunk = Buffer.alloc(65536, "a");
          for (let index = 0; index < 130; index++) yield chunk;
          yield Buffer.from('"\n');
        }
        const options = {
          temporaryDirectory: directory,
          runtimeControls: { managedMemoryTargetBytes: 16777216 },
        };
        let events;
        if (owner === "source") {
          session = await createSourceSession(verifiedComponent, options);
          events = session.check(
            {
              async *open() {
                yield* source();
              },
            },
            { formatContract: "producer-json-compact-body" },
          );
        } else {
          const root = join(directory, "repository");
          await mkdir(root);
          execFileSync("git", ["init", "--quiet", root], { windowsHide: true });
          await writeFile(
            join(root, ".json-quality.json"),
            JSON.stringify(
              {
                schemaVersion: 3,
                defaults: {
                  formatContract: "prettier-json",
                  allowFormatWrites: true,
                  normalization: "NFC",
                },
                exceptions: [],
              },
              null,
              2,
            ) + "\n",
          );
          const file = await open(join(root, "value.json"), "w");
          try {
            for (const chunk of source()) await file.writeFile(chunk);
          } finally {
            await file.close();
          }
          session = await createRepositorySession(verifiedComponent, {
            ...options,
            root,
          });
          events = session.events();
        }
        let terminal;
        for await (const event of events) {
          if (event.type === "source") reference = event.source;
          if (event.type === "terminal" || event.type === "execution-terminal")
            terminal = event;
        }
        assert.equal(terminal.contractSatisfied, true);
        assert.ok(reference);
        const spills = (await readdir(directory)).filter((name) =>
          name.startsWith("json-quality-"),
        );
        assert.equal(spills.length, 1);
        scratch = join(directory, spills[0]);
        const marker = await readFile(join(scratch, "owner"), "utf8");
        child = spawn(
          process.platform === "win32" ? "python" : "python3",
          [
            fileURLToPath(new URL("./cleanup_lock.py", import.meta.url)),
            join(scratch, "owner"),
            kind,
          ],
          { stdio: ["pipe", "pipe", "pipe"], windowsHide: true },
        );
        // The helper has a single owned handle; bound it even if an assertion fails.
        const deadline = setTimeout(() => child.kill(), 10000);
        completed = once(child, "close").finally(() => clearTimeout(deadline));
        let error = "";
        child.stderr.on("data", (bytes) => {
          error += bytes.toString("utf8");
          if (error.length > 4096) child.kill();
        });
        const ready = await Promise.race([
          once(child.stdout, "data").then(([bytes]) =>
            bytes.toString("utf8").trim(),
          ),
          completed.then(() => {
            throw new Error("Scratch lock helper exited: " + error);
          }),
        ]);
        assert.equal(ready, "locked");
        try {
          await assert.rejects(session.close(), /cleanup-remove/);
          assert.equal(await readFile(join(scratch, "owner"), "utf8"), marker);
          await assert.rejects(session.select(reference), /closed-session/);
        } finally {
          await unlock();
        }
        await session.close();
        assert.deepEqual(
          await readdir(directory),
          owner === "repository" ? ["repository"] : [],
        );
      },
    );
