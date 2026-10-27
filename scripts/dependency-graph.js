// SPDX-License-Identifier: AGPL-3.0-only
import { budgets } from "./qualification-budgets.js";
/** Native import views and declared process relations, without executing tests. */
import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  realpathSync,
  existsSync,
  openSync,
  readSync,
  closeSync,
} from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { execFileSync } from "node:child_process";
import { analyzeDependencyGraph } from "./check-architecture.js";
import { relations } from "./test-impact.js";
import { isPathContained, assertRepositoryPath } from "../src/paths.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Native binaries participate in source identity without becoming whole-file
 * JavaScript buffers. Development graph generation owns this fixed read buffer.
 */
function fileDigest(path) {
  const descriptor = openSync(path, "r"),
    buffer = Buffer.alloc(65536),
    hash = createHash("sha256");
  try {
    while (true) {
      const length = readSync(descriptor, buffer, 0, buffer.length, null);
      if (!length) return hash.digest("hex");
      hash.update(buffer.subarray(0, length));
    }
  } finally {
    closeSync(descriptor);
  }
}

/** Bind Git-owned inventory and bytes so a report cannot conceal source drift. */
export function graphSourceIdentity(repository = root) {
  const paths = execFileSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    {
      cwd: repository,
      windowsHide: true,
      maxBuffer: 8 * 1024 * 1024,
      timeout: budgets.read,
    },
  )
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .sort();
  return digest(
    Buffer.from(
      paths
        .map((path) => {
          assertRepositoryPath(path);
          return `${path}\0${existsSync(join(repository, path)) ? fileDigest(join(repository, path)) : "deleted"}`;
        })
        .join("\0"),
    ),
  );
}

/** Write a new external bundle using dependency-cruiser's own renderers. */
export async function writeDependencyGraph(output, { focus } = {}) {
  output = resolve(output);
  let ancestor = dirname(output);
  while (!existsSync(ancestor)) ancestor = dirname(ancestor);
  if (
    existsSync(output) ||
    isPathContained(realpathSync(root), realpathSync(ancestor))
  )
    throw new Error("Graph output must be a new external directory.");
  const before = graphSourceIdentity();
  const graph = analyzeDependencyGraph();
  const { format } = await import("dependency-cruiser");
  const views = {
    overview: {},
    runtime: { includeOnly: "^src/" },
    tests: { focus: "^tests/" },
  };
  if (focus !== undefined) {
    assertRepositoryPath(focus);
    if (!graph.modules.some(({ source }) => source === focus))
      throw new Error("Focus path is absent from the complete graph.");
    const pattern = `^${focus.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}$`;
    views.focus = { focus: pattern };
    views.dependents = { reaches: pattern };
  }
  const rendered = {};
  for (const [name, filters] of Object.entries(views))
    rendered[name] = (
      await format(graph, { outputType: "mermaid", ...filters })
    ).output;
  if (before !== graphSourceIdentity())
    throw new Error("Source changed during graph analysis.");
  mkdirSync(output, { recursive: false });
  writeFileSync(
    join(output, "graph.json"),
    JSON.stringify(graph, null, 2) + "\n",
  );
  for (const [name, view] of Object.entries(rendered))
    writeFileSync(join(output, `${name}.mmd`), view);
  writeFileSync(
    join(output, "declared-relations.json"),
    JSON.stringify(relations, null, 2) + "\n",
  );
  writeFileSync(
    join(output, "provenance.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        sourceDigest: before,
        node: process.version,
        platform: process.platform,
        lockSha256: digest(readFileSync(join(root, "package-lock.json"))),
        graphSha256: digest(Buffer.from(JSON.stringify(graph))),
        scope:
          "Complete native import graph; process relations are separate declarations; no test coverage or dead-code conclusion",
        owner: "invoking maintainer",
        retention:
          "retain accepted proof; reassess exploratory bundles after consumers finish",
      },
      null,
      2,
    ) + "\n",
  );
  return {
    output,
    modules: graph.modules.length,
    violations: graph.summary.violations.length,
  };
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  try {
    const { values } = parseArgs({
      options: { output: { type: "string" }, focus: { type: "string" } },
    });
    if (!values.output)
      throw new Error(
        "Use graph:dependencies -- --output ABSOLUTE_EXTERNAL_DIRECTORY [--focus PATH].",
      );
    const report = await writeDependencyGraph(values.output, {
      focus: values.focus,
    });
    console.log(JSON.stringify(report));
    if (report.violations) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
