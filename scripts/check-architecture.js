// SPDX-License-Identifier: AGPL-3.0-only
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readPackReport } from "./pack.js";
import { assertJavaScriptSyntax } from "./check-javascript-syntax.js";

const self = fileURLToPath(import.meta.url);
const repository = fileURLToPath(new URL("../", import.meta.url));
const policy = JSON.parse(
  readFileSync(new URL("../.dependency-cruiser.json", import.meta.url), "utf8"),
);

/** Producer-only admission; native analysis and native npm own their formats. */
export async function checkArchitecture(root = repository) {
  root = resolve(root);
  const graph = JSON.parse(
    execFileSync(process.execPath, [self, "--graph-worker"], {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
      timeout: 30000,
      maxBuffer: 8 * 1024 * 1024,
    }),
  );
  const violations = graph.summary.violations.filter(
    ({ rule }) => rule.severity === "error",
  );
  if (violations.length)
    throw new Error(
      `Architecture rule violations: ${JSON.stringify(violations)}`,
    );
  const npm = process.env.npm_execpath;
  if (!npm) throw new Error("Run architecture checks through npm.");
  const packed = readPackReport(
    execFileSync(
      process.execPath,
      [npm, "pack", "--dry-run", "--json", "--ignore-scripts"],
      {
        cwd: root,
        encoding: "utf8",
        windowsHide: true,
        timeout: 120000,
        maxBuffer: 8 * 1024 * 1024,
      },
    ),
  );
  const metadata = JSON.parse(
    readFileSync(resolve(root, "package.json"), "utf8"),
  );
  if (packed.name !== metadata.name || packed.version !== metadata.version)
    throw new Error("Native npm membership belongs to a different package.");
  const files = new Set(packed.files.map(({ path }) => path));
  const modules = new Map(
    graph.modules.map((module) => [module.source, module]),
  );
  const runtime = [...files].filter((path) => /\.(?:js|mjs|cjs)$/u.test(path));
  if (!runtime.length) throw new Error("Empty JavaScript runtime shipment.");
  for (const source of runtime) {
    const module = modules.get(source);
    if (!module) throw new Error(`Missing runtime graph root: ${source}`);
    for (const dependency of module.dependencies) {
      if (
        !dependency.coreModule &&
        !dependency.resolved.startsWith("node_modules/") &&
        !files.has(dependency.resolved)
      )
        throw new Error(
          `Unshipped dependency: ${source} -> ${dependency.resolved}`,
        );
    }
  }
  for (const target of [
    ...declaredTargets(metadata.exports),
    ...declaredTargets(metadata.bin),
    ...declaredTargets(metadata.main),
  ]) {
    if (!files.has(target.replace(/^\.\//u, "")))
      throw new Error(`Unshipped entrypoint: ${target}`);
  }
  return {
    modules: graph.modules.length,
    runtimeModules: runtime.length,
    files: files.size,
  };
}

/** Public/bin declarations retain native conditional/array targets; null denies exports. */
function declaredTargets(value) {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(declaredTargets);
}

async function graphWorker() {
  if (!existsSync("src")) throw new Error("Expected the runtime source root.");
  const roots = [
    ...["src", "scripts", "tests"].filter(existsSync),
    ...readdirSync(".", { withFileTypes: true })
      .filter(
        (entry) => entry.isFile() && /\.(?:js|mjs|cjs)$/u.test(entry.name),
      )
      .map((entry) => entry.name),
  ];
  // The analyzer can return a graph after discarding an invalid module's
  // imports. Admit syntax independently before trusting that graph.
  assertJavaScriptSyntax(
    roots.flatMap((root) =>
      /\.(?:js|mjs|cjs)$/u.test(root)
        ? [root]
        : readdirSync(root, { recursive: true })
            .filter((path) => /\.(?:js|mjs|cjs)$/u.test(path))
            .map((path) => join(root, path)),
    ),
  );
  const { cruise } = await import("dependency-cruiser");
  const result = await cruise(
    roots,
    {
      ...policy.options,
      validate: true,
      ruleSet: { forbidden: policy.forbidden },
      outputType: "json",
    },
    {
      // The native resolver must admit package exports and this package's own
      // public imports, including the probe copied into installed consumers.
      exportsFields: ["exports"],
      conditionNames: ["node", "import", "default"],
      extensions: [".js", ".mjs", ".cjs", ".json"],
    },
  );
  process.stdout.write(result.output);
}

if (process.argv[1] && resolve(process.argv[1]) === self) {
  try {
    if (process.argv.length === 3 && process.argv[2] === "--graph-worker")
      await graphWorker();
    else {
      if (process.argv.length !== 2)
        throw new Error("Use npm run check:architecture.");
      console.log(JSON.stringify(await checkArchitecture()));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
