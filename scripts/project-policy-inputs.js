// SPDX-License-Identifier: AGPL-3.0-only
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Linter } from "eslint";
import { budgets } from "./qualification-budgets.js";
import { assertRegularDirectory, assertRegularSource } from "../src/paths.js";
import {
  policyInputInventoryPath,
  policyResolverEntryPoints,
  policyResolverResources,
} from "../src/policy-inputs.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const self = fileURLToPath(import.meta.url);

/** Discovery is producer-only; a native child also fixes the resolver's cwd. */
export function policyInputManifest(directory = root) {
  directory = resolve(directory);
  assertRegularDirectory(directory, "");
  return execFileSync(process.execPath, [self, "--graph-worker"], {
    cwd: directory,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    timeout: budgets.read,
    maxBuffer: 8 * 1024 * 1024,
  });
}

function assertStaticImports(path) {
  const literal = (node) =>
    typeof node?.value === "string" ||
    (node?.type === "TemplateLiteral" && node.expressions.length === 0);
  const diagnostics = new Linter().verify(
    readFileSync(path, "utf8"),
    {
      languageOptions: {
        ecmaVersion: "latest",
        sourceType: path.endsWith(".cjs") ? "commonjs" : "module",
      },
      plugins: {
        policy: {
          rules: {
            closed: {
              meta: { schema: [] },
              create(context) {
                const refuse = (node) =>
                  context.report({
                    node,
                    message:
                      "Computed policy imports cannot establish a closed input identity.",
                  });
                return {
                  ImportExpression(node) {
                    if (!literal(node.source)) refuse(node);
                  },
                  CallExpression(node) {
                    if (
                      node.callee.type === "Identifier" &&
                      node.callee.name === "require" &&
                      (node.arguments.length !== 1 ||
                        !literal(node.arguments[0]))
                    )
                      refuse(node);
                  },
                };
              },
            },
          },
        },
      },
      rules: { "policy/closed": "error" },
    },
    { allowInlineConfig: false, reportUnusedDisableDirectives: "off" },
  );
  if (diagnostics.length)
    throw new Error(
      "Policy import admission failed: " + path + ": " + diagnostics[0].message,
    );
}

async function policyGraphWorker() {
  const directory = process.cwd();
  for (const path of policyResolverEntryPoints)
    assertStaticImports(assertRegularSource(directory, path));
  const { cruise } = await import("dependency-cruiser");
  const result = await cruise(
    [...policyResolverEntryPoints],
    {
      // Stop package traversal even when an installed dependency is hoisted
      // outside this root. The owning import edge distinguishes it from escape.
      doNotFollow: "(?:^|/)node_modules/|^\\.\\.(?:/|$)",
      moduleSystems: ["es6", "cjs"],
      preserveSymlinks: true,
      outputType: "json",
    },
    {
      exportsFields: ["exports"],
      conditionNames: ["node", "import", "default"],
      extensions: [".js", ".mjs", ".cjs", ".json"],
      // Disposable source/package fixtures reuse the producer's installed graph.
      modules: ["node_modules", join(root, "node_modules")],
    },
  );
  if (result.exitCode !== 0)
    throw new Error("Policy dependency discovery failed.");
  const graph =
    typeof result.output === "string"
      ? JSON.parse(result.output)
      : result.output;
  const metadata = JSON.parse(
    readFileSync(assertRegularSource(directory, "package.json"), "utf8"),
  );
  const files = new Set(policyResolverResources),
    dependencies = new Set(),
    modules = new Map(graph.modules.map((module) => [module.source, module])),
    pending = [...policyResolverEntryPoints],
    visited = new Set();
  while (pending.length) {
    const source = pending.pop();
    if (visited.has(source)) continue;
    visited.add(source);
    if (source === "package.json" || source === policyInputInventoryPath)
      throw new Error(
        "Policy module imports must not include package metadata or the generated inventory.",
      );
    const path = assertRegularSource(directory, source);
    if (source.split("/").includes("node_modules"))
      throw new Error(
        "Policy local imports must not enter dependency packages.",
      );
    files.add(source);
    if (/\.(?:js|mjs|cjs)$/u.test(source)) assertStaticImports(path);
    const module = modules.get(source);
    if (!module) throw new Error("Missing policy module: " + source);
    for (const dependency of module.dependencies) {
      if (dependency.couldNotResolve)
        throw new Error(
          "Unresolved policy import: " + source + " -> " + dependency.module,
        );
      if (dependency.coreModule) continue;
      const specifier = dependency.module;
      if (specifier.startsWith(".") || isAbsolute(specifier)) {
        pending.push(dependency.resolved);
        continue;
      }
      const name = specifier.startsWith("@")
        ? specifier.split("/").slice(0, 2).join("/")
        : specifier.split("/")[0];
      if (typeof metadata.dependencies?.[name] !== "string")
        throw new Error(
          "Policy import requires a declared runtime dependency: " + specifier,
        );
      dependencies.add(name);
    }
  }
  for (const path of files) assertRegularSource(directory, path);
  process.stdout.write(
    JSON.stringify(
      {
        schemaVersion: 1,
        files: [...files].sort(),
        dependencies: [...dependencies].sort(),
      },
      null,
      2,
    ) + "\n",
  );
}

export function projectPolicyInputs(directory = root, { write = false } = {}) {
  const expected = policyInputManifest(directory),
    path = join(directory, policyInputInventoryPath);
  if (write) writeFileSync(path, expected);
  else if (readFileSync(path, "utf8") !== expected)
    throw new Error(
      "Policy resolver input inventory drifted; run npm run sync:policy-inputs.",
    );
}

if (process.argv[1] === self) {
  if (process.argv.length === 3 && process.argv[2] === "--graph-worker")
    await policyGraphWorker();
  else {
    if (
      process.argv.length > 3 ||
      (process.argv.length === 3 && process.argv[2] !== "--write")
    )
      throw new Error("Use sync:policy-inputs or check:policy-inputs.");
    projectPolicyInputs(root, { write: process.argv[2] === "--write" });
  }
}
