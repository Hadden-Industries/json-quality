// SPDX-License-Identifier: AGPL-3.0-only
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, relative, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { Linter } from "eslint";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifestPath = "assets/json-quality-policy-inputs.json";

/** Follow local policy imports instead of allowing a new helper to escape the
 * identity. Package metadata binds exact declared third-party dependency versions;
 * installed payload integrity remains owned by package verification.
 */
export function policyInputManifest(directory = root) {
  const pending = [
      "src/configuration.js",
      "src/policy-provenance.js",
      "schemas/effective-policy.schema.json",
      "package.json",
    ],
    seen = new Set(),
    entries = [];
  while (pending.length) {
    const path = pending.pop();
    if (path === manifestPath || seen.has(path)) continue;
    if (path.startsWith("../") || path.includes(":"))
      throw new Error("Policy input leaves package.");
    seen.add(path);
    const bytes = readFileSync(resolve(directory, path));
    entries.push([path, createHash("sha256").update(bytes).digest("hex")]);
    if (path.endsWith(".js")) {
      const imports = [];
      const diagnostics = new Linter().verify(bytes.toString("utf8"), {
        languageOptions: { ecmaVersion: "latest", sourceType: "module" },
        plugins: {
          policy: {
            rules: {
              inputs: {
                meta: { schema: [] },
                create(context) {
                  const collect = (node) => {
                    const specifier = node.source?.value;
                    if (
                      node.type === "ImportExpression" &&
                      typeof specifier !== "string"
                    )
                      context.report({
                        node,
                        message:
                          "Computed policy imports cannot establish a closed input identity.",
                      });
                    if (typeof specifier === "string") imports.push(specifier);
                  };
                  return {
                    ImportDeclaration: collect,
                    ExportNamedDeclaration: collect,
                    ExportAllDeclaration: collect,
                    ImportExpression: collect,
                  };
                },
              },
            },
          },
        },
        rules: { "policy/inputs": "error" },
      });
      if (diagnostics.length)
        throw new Error(
          `Policy import inventory failed: ${diagnostics[0].message}`,
        );
      for (const specifier of imports)
        if (specifier.startsWith("."))
          pending.push(
            relative(directory, resolve(directory, dirname(path), specifier))
              .split(sep)
              .join("/"),
          );
    }
  }
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  // Versioned ordered tuple: sorted relative paths and exact-byte SHA-256 pairs.
  return (
    JSON.stringify(["json-quality-policy-resolver-inputs-v1", entries]) + "\n"
  );
}

export function projectPolicyInputs(directory = root, { write = false } = {}) {
  const expected = policyInputManifest(directory),
    path = resolve(directory, manifestPath);
  if (write) writeFileSync(path, expected);
  else if (readFileSync(path, "utf8") !== expected)
    throw new Error(
      "Policy resolver input manifest drifted; run npm run sync:policy-inputs.",
    );
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  projectPolicyInputs(root, { write: process.argv.includes("--write") });
