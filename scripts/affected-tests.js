// SPDX-License-Identifier: AGPL-3.0-only
import { execFileSync, spawnSync } from "node:child_process";
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { fullFiles, relations } from "./test-impact.js";

const self = fileURLToPath(import.meta.url);
const isModule = (path) => /^(?:src|tests)\/.*\.(?:js|mjs|cjs)$/u.test(path);
const isTest = (path) => /^tests\/.*\.test\.js$/u.test(path);
const git = (root, args) =>
  execFileSync("git", ["-C", root, ...args], {
    windowsHide: true,
    timeout: 30000,
    maxBuffer: 16 * 1024 * 1024,
  });
const paths = (bytes) => bytes.toString("utf8").split("\0").filter(Boolean);
const safePath = (path) => {
  if (
    !path ||
    path.includes("\\") ||
    path.startsWith("/") ||
    path.split("/").some((part) => !part || part === "." || part === "..") ||
    path.includes(":")
  )
    throw new Error("Unsupported repository path");
  return path;
};

/** Only source blobs are materialized. No baseline scripts, install or checkout runs. */
function snapshot(root, base) {
  const files = new Map();
  const entries = base
    ? paths(git(root, ["ls-tree", "-r", "-z", base]))
    : [
        ...new Set(
          paths(
            git(root, [
              "ls-files",
              "-z",
              "--cached",
              "--others",
              "--exclude-standard",
            ]),
          ),
        ),
      ];
  if (entries.length > 4096) throw new Error("Snapshot file limit");
  let total = 0;
  for (const entry of entries) {
    let path = entry,
      bytes;
    if (base) {
      const [header, name] = entry.split("\t");
      const [mode, type, oid] = header.split(" ");
      path = safePath(name);
      if (type !== "blob" || !["100644", "100755"].includes(mode))
        throw new Error("Unsupported baseline entry");
      bytes = git(root, ["cat-file", "blob", oid]);
    } else {
      safePath(path);
      let stat;
      try {
        stat = lstatSync(join(root, path));
      } catch (error) {
        if (error.code === "ENOENT") continue;
        throw error;
      }
      if (!stat.isFile()) throw new Error("Unsupported working entry");
      if (stat.size > 4 * 1024 * 1024)
        throw new Error("Snapshot file byte limit");
      bytes = readFileSync(join(root, path));
    }
    total += bytes.length;
    if (bytes.length > 4 * 1024 * 1024 || total > 32 * 1024 * 1024)
      throw new Error("Snapshot byte limit");
    files.set(path, bytes);
  }
  return files;
}

function graphFromSnapshot(files, directory) {
  for (const [path, bytes] of files)
    if (isModule(path) || path === "package.json") {
      mkdirSync(dirname(join(directory, path)), { recursive: true });
      writeFileSync(join(directory, path), bytes);
    }
  const result = spawnSync(process.execPath, [self, "--graph-worker"], {
    cwd: directory,
    encoding: "utf8",
    windowsHide: true,
    timeout: 30000,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error || result.status !== 0)
    throw new Error("Dependency graph unavailable");
  return JSON.parse(result.stdout);
}

/** Native reverse reachability over both graphs, composed with declared process relations. */
export async function selectTests(
  graphs,
  changed,
  tests,
  extraRelations = relations,
) {
  const { format } = await import("dependency-cruiser");
  const seeds = new Set(changed),
    reached = new Set(changed),
    applied = new Set();
  for (let round = 0; round <= extraRelations.length; round++) {
    const pattern = `^(?:${[...seeds].map((path) => path.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join("|")})$`;
    for (const graph of graphs) {
      const result = await format(graph, {
        outputType: "json",
        reaches: pattern,
      });
      for (const module of JSON.parse(result.output).modules)
        reached.add(module.source);
    }
    let grew = false;
    for (const [index, relation] of extraRelations.entries())
      if (
        !applied.has(index) &&
        (relation.dependency.endsWith("/")
          ? [...reached].some((path) => path.startsWith(relation.dependency))
          : reached.has(relation.dependency))
      ) {
        seeds.add(relation.consumer);
        applied.add(index);
        grew = true;
      }
    if (!grew) return tests.filter((path) => reached.has(path)).sort();
  }
  throw new Error("Relation composition did not converge");
}

/** Any uncertainty selects the full suite. A selected test failure is never retried away. */
export async function planAffected(root, base) {
  let scratch;
  try {
    if (!/^[a-f0-9]{40}$/u.test(base ?? ""))
      throw new Error("An immutable --base commit is required");
    git(root, ["rev-parse", "--verify", `${base}^{commit}`]);
    const before = snapshot(root, base),
      after = snapshot(root);
    const tests = [...after.keys()].filter(isTest).sort();
    const changed = [
      ...new Set([
        ...paths(
          git(root, ["diff", "--name-only", "--no-renames", "-z", base, "--"]),
        ),
        ...paths(
          git(root, ["ls-files", "--others", "--exclude-standard", "-z"]),
        ),
      ]),
    ];
    if (!changed.length)
      return {
        mode: "full",
        reason: "No changed scope; run the complete suite",
        tests,
      };
    if (changed.some((path) => !isModule(path) || fullFiles.has(path)))
      return {
        mode: "full",
        reason: "Configuration, resource, tooling or whole-suite input changed",
        tests,
      };
    // Computed loads and source read as data are not established by static imports.
    for (const path of changed)
      for (const files of [before, after]) {
        const text = files.get(path)?.toString("utf8") ?? "";
        if (
          /\b(?:eval|Function|require)\s*\(|\bimport\s*\((?!\s*["'])|node:(?:fs|child_process|worker_threads)/u.test(
            text,
          )
        )
          return {
            mode: "full",
            reason: "Changed module has non-import inputs or process effects",
            tests,
          };
      }
    scratch = mkdtempSync(join(tmpdir(), "json-quality-impact-"));
    const graphs = [
      graphFromSnapshot(before, join(scratch, "before")),
      graphFromSnapshot(after, join(scratch, "after")),
    ];
    const known = new Set(
      graphs.flatMap((graph) => graph.modules.map((module) => module.source)),
    );
    if (changed.some((path) => !known.has(path)))
      throw new Error("Changed module absent from graphs");
    for (const graph of graphs)
      for (const module of graph.modules)
        for (const dependency of module.dependencies)
          if (dependency.couldNotResolve && dependency.module.startsWith("."))
            throw new Error("Unresolved relative dependency");
    const selected = await selectTests(graphs, changed, tests);
    const current = snapshot(root);
    if (
      current.size !== after.size ||
      [...after].some(
        ([path, bytes]) => !bytes.equals(current.get(path) ?? Buffer.alloc(0)),
      )
    )
      throw new Error("Working source changed during selection");
    return selected.length
      ? {
          mode: "affected",
          reason: "Before/after native reach and declared relations",
          tests: selected,
        }
      : { mode: "full", reason: "No established affected test scope", tests };
  } catch (error) {
    return { mode: "full", reason: error.message, tests: null };
  } finally {
    if (scratch) rmSync(scratch, { recursive: true, force: true });
  }
}

export function runTests(root, plan) {
  const result = spawnSync(
    process.execPath,
    [
      "--test",
      ...(plan.mode === "affected" ? plan.tests : ["tests/*.test.js"]),
    ],
    {
      cwd: root,
      windowsHide: true,
      stdio: "inherit",
      env: Object.fromEntries(
        Object.entries(process.env).filter(
          ([name]) => name !== "NODE_TEST_CONTEXT",
        ),
      ),
    },
  );
  return result.error || result.status === null ? 2 : result.status;
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  if (process.argv[2] === "--graph-worker") {
    for (const path of ["src", "tests"]
      .flatMap((directory) =>
        readdirSync(directory, { recursive: true }).map(
          (path) => directory + "/" + path.split(sep).join("/"),
        ),
      )
      .filter(isModule)) {
      const checked = spawnSync(process.execPath, ["--check", path], {
        windowsHide: true,
        encoding: "utf8",
        timeout: 10000,
      });
      if (checked.error || checked.status !== 0)
        throw new Error("Module syntax check failed");
    }
    const { cruise } = await import("dependency-cruiser");
    const result = await cruise(["src", "tests"], {
      baseDir: process.cwd(),
      outputType: "json",
      doNotFollow: "node_modules",
    });
    process.stdout.write(result.output);
  } else {
    const { values } = parseArgs({
      options: { base: { type: "string" }, "dry-run": { type: "boolean" } },
    });
    const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
    const plan = await planAffected(root, values.base);
    process.stdout.write(JSON.stringify(plan) + "\n");
    if (!values["dry-run"]) process.exitCode = runTests(root, plan);
  }
}
