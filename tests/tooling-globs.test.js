// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { lstatSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { Readable, Writable } from "node:stream";
import { buffer } from "node:stream/consumers";
import { pipeline } from "node:stream/promises";
import test from "node:test";
import { temporaryDirectory } from "./temporary-directory.js";

// Resolve each transitive dependency from its real caller, including nested installs.
const artifactEntry = import.meta.resolve("@actions/artifact");
const artifactRequire = createRequire(artifactEntry);
const archiver = artifactRequire("archiver");
const archiverRequire = createRequire(artifactRequire.resolve("archiver"));
const readdirGlob = archiverRequire("readdir-glob");
const { file } = archiverRequire("archiver-utils");
const unzip = artifactRequire("unzip-stream");
const { createZipUploadStream } = await import(
  new URL("internal/upload/zip.js", artifactEntry).href
);

function fixture(t) {
  const root = temporaryDirectory(t, "json-tooling-globs-");
  for (const directory of ["nested", "skip"]) mkdirSync(join(root, directory));
  for (const [path, content] of Object.entries({
    "one.txt": "one\n",
    ".hidden.txt": "hidden\n",
    "nested/two.json": '{"two":2}\n',
    "nested/omit.txt": "excluded\n",
    "skip/three.txt": "skipped\n",
  }))
    writeFileSync(join(root, path), content);
  return root;
}

async function zipEntries(bytes) {
  const entries = new Map();
  await pipeline(
    Readable.from([bytes]),
    unzip.Parse(),
    new Writable({
      objectMode: true,
      write(entry, _encoding, done) {
        buffer(entry)
          .then((content) => {
            assert.equal(entries.has(entry.path), false, "duplicate ZIP entry");
            entries.set(entry.path, content);
          })
          .then(() => done(), done);
      },
    }),
  );
  return entries;
}

test(
  "artifact readdir filtering retains braces, dotfiles, ignore, skip and nodir",
  { timeout: 15000 },
  async (t) => {
    const root = fixture(t);
    const matches = await new Promise((resolve, reject) => {
      readdirGlob(
        root,
        {
          pattern: [
            "{one,{.hidden,absent}}.txt",
            "{nested,skip}/**/*.{txt,json}",
            "nested/",
          ],
          dot: true,
          ignore: "**/omit.txt",
          skip: "skip",
          nodir: true,
        },
        (error, paths) => (error ? reject(error) : resolve(paths)),
      );
    });
    assert.deepEqual(
      new Set(matches),
      new Set(["one.txt", ".hidden.txt", "nested/two.json"]),
    );
  },
);

test(
  "archiver expansion retains cwd, exclusions, dotfiles and file filtering",
  { timeout: 15000 },
  (t) => {
    const root = fixture(t);
    assert.deepEqual(
      new Set(
        file
          .expand({ cwd: root, dot: true, filter: "isFile" }, [
            "**/*.{txt,json}",
            "!nested/omit.txt",
            "!skip/**",
          ])
          .map((path) => path.replaceAll("\\", "/")),
      ),
      new Set(["one.txt", ".hidden.txt", "nested/two.json"]),
    );
    assert.deepEqual(
      new Set(
        file.expand(
          { cwd: root, dot: false, filter: (path) => lstatSync(path).isFile() },
          "*",
        ),
      ),
      new Set(["one.txt"]),
    );
  },
);

test(
  "the Artifact SDK constructs local ZIP entries with their original bytes",
  { timeout: 15000 },
  async (t) => {
    const root = fixture(t);
    const payload = Buffer.from([0, 255, 13, 10, 128]);
    const sourcePath = join(root, "payload.bin");
    writeFileSync(sourcePath, payload);
    const stream = await createZipUploadStream([
      {
        sourcePath,
        destinationPath: "proof/payload.bin",
        stats: lstatSync(sourcePath),
      },
      { sourcePath: null, destinationPath: "empty/" },
    ]);
    assert.deepEqual(
      await zipEntries(await buffer(stream)),
      new Map([
        ["proof/payload.bin", payload],
        ["empty/", Buffer.alloc(0)],
      ]),
    );
  },
);

test(
  "archiver directory and glob paths produce the selected ZIP content",
  { timeout: 15000 },
  async (t) => {
    const root = fixture(t);
    const zip = archiver.create("zip");
    const bytes = buffer(zip);
    zip.directory(join(root, "nested"), "directory");
    zip.glob(
      "{one,.hidden}.txt",
      { cwd: root, dot: true, nodir: true },
      { prefix: "glob" },
    );
    await zip.finalize();
    assert.deepEqual(
      await zipEntries(await bytes),
      new Map([
        ["directory/two.json", Buffer.from('{"two":2}\n')],
        ["directory/omit.txt", Buffer.from("excluded\n")],
        ["glob/one.txt", Buffer.from("one\n")],
        ["glob/.hidden.txt", Buffer.from("hidden\n")],
      ]),
    );
  },
);
