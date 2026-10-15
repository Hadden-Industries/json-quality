// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { nodeSupport, validatePolicy } from "./node-matrix.js";

/** Project current declarations; npm alone writes the native lockfile. */
export function projectNodeSupport(files, policy = nodeSupport) {
  validatePolicy(policy);
  return Object.fromEntries(
    Object.entries(files).map(([path, source]) => {
      if (path === "package.json") {
        const manifest = JSON.parse(source);
        manifest.engines.node = policy.minimums
          .map((minimum) => `^${minimum}`)
          .join(" || ");
        manifest.packageManager = `npm@${policy.producerNpm.version}`;
        manifest.devEngines.packageManager.version = policy.producerNpm.range;
        return [path, JSON.stringify(manifest, null, 2) + "\n"];
      }
      if (path === ".node-version") return [path, policy.reference + "\n"];
      assert.equal(path, "docs/node-runtime-compatibility.md");
      const start = "<!-- node-support:start -->",
        end = "<!-- node-support:end -->";
      assert.equal(source.split(start).length, 2);
      assert.equal(source.split(end).length, 2);
      const first = source.indexOf(start),
        last = source.indexOf(end);
      assert.ok(last > first);
      const block = [
        start,
        "",
        ...policy.minimums.map(
          (minimum) => `- Node ${minimum.split(".")[0]}: ${minimum}`,
        ),
        "",
        `Development/producer reference: ${policy.reference}.`,
        `Producer npm: ${policy.producerNpm.version}; consumer qualification npm: ${policy.consumerNpm}.`,
        "",
        end,
      ].join("\n");
      return [
        path,
        source.slice(0, first) + block + source.slice(last + end.length),
      ];
    }),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 3, "Use --check or --write");
  const mode = process.argv[2];
  assert.ok(["--check", "--write"].includes(mode));
  const root = new URL("../", import.meta.url);
  const paths = [
    "package.json",
    ".node-version",
    "docs/node-runtime-compatibility.md",
  ];
  const files = Object.fromEntries(
    paths.map((path) => [path, readFileSync(new URL(path, root), "utf8")]),
  );
  const projected = projectNodeSupport(files);
  const drift = paths.filter((path) => projected[path] !== files[path]);
  if (mode === "--write")
    for (const path of drift)
      writeFileSync(new URL(path, root), projected[path]);
  // A native npm lock refresh is explicit; never rewrite its dependency graph here.
  const lock = JSON.parse(
    readFileSync(new URL("package-lock.json", root), "utf8"),
  );
  if (
    lock.packages[""].engines.node !==
    JSON.parse(projected["package.json"]).engines.node
  )
    drift.push(
      "package-lock.json (run npm install --package-lock-only --ignore-scripts)",
    );
  console.log(JSON.stringify({ mode, drift }));
  if (mode === "--check" && drift.length) process.exitCode = 1;
}
