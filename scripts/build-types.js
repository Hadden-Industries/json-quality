// SPDX-License-Identifier: AGPL-3.0-only
import { spawnSync } from "node:child_process";
import {
  existsSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "json-schema-to-typescript";
import { format } from "prettier";
import {
  publicSchemaNames,
  readSchema,
  checkSchemas,
} from "./check-schemas.js";
import { budgets } from "./qualification-process.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const exportsForSchema = {
  configuration: "JsonQualityPolicy",
  "source-contract": "JsonSourceContract",
  event: "JsonQualityEvent",
};
const inventory = (directory) =>
  readdirSync(directory, { recursive: true })
    .filter((p) => p.endsWith(".d.ts"))
    .sort();

/** The maintained schema compiler owns declaration syntax; references remain offline. */
export async function generateSchemaTypes(destination) {
  checkSchemas();
  const configuration = readSchema("configuration");
  mkdirSync(destination, { recursive: true });
  for (const name of publicSchemaNames) {
    const schema = structuredClone(readSchema(name));
    schema.title = exportsForSchema[name];
    schema.$defs = { ...configuration.$defs, ...schema.$defs };
    const localize = (value) => {
      if (!value || typeof value !== "object") return;
      for (const [key, child] of Object.entries(value)) {
        if (
          key === "$ref" &&
          typeof child === "string" &&
          child.startsWith(configuration.$id + "#")
        )
          value[key] = child.slice(configuration.$id.length);
        else localize(child);
      }
    };
    localize(schema);
    const text = await compile(schema, exportsForSchema[name], {
      bannerComment:
        "/* SPDX-License-Identifier: AGPL-3.0-only\n * Generated from the exported JSON Schema; run npm run build:types. */",
      unknownAny: true,
      strictIndexSignatures: true,
      unreachableDefinitions: true,
      $refOptions: { resolve: { http: false, file: false } },
      style: { tabWidth: 2, singleQuote: false },
    });
    writeFileSync(
      join(destination, name + ".d.ts"),
      await format(text, { parser: "typescript" }),
    );
  }
}

export async function buildTypes({ check = false } = {}) {
  const committed = join(root, "types");
  // The native compiler can memory-map imported committed declarations. Emit
  // elsewhere, then promote after it exits; never truncate its mapped inputs.
  const target = mkdtempSync(join(tmpdir(), "json-quality-types-"));
  try {
    await generateSchemaTypes(join(target, "schemas"));
    if (!check)
      for (const name of publicSchemaNames)
        copyFileSync(
          join(target, "schemas", name + ".d.ts"),
          join(committed, "schemas", name + ".d.ts"),
        );
    // Source JSDoc imports the committed schema views; always check them first.
    if (check)
      for (const name of publicSchemaNames) {
        const path = join("schemas", name + ".d.ts");
        if (
          !existsSync(join(committed, path)) ||
          readFileSync(join(committed, path), "utf8") !==
            readFileSync(join(target, path), "utf8")
        )
          throw new Error(`Generated schema declarations drifted: ${path}`);
      }
    const compiler = fileURLToPath(
      new URL("../node_modules/typescript/bin/tsc", import.meta.url),
    );
    const result = spawnSync(
      process.execPath,
      [compiler, "-p", "tsconfig.types.json", "--outDir", target],
      {
        cwd: root,
        stdio: "inherit",
        windowsHide: true,
        timeout: budgets.read,
      },
    );
    if (result.error) throw result.error;
    if (result.status !== 0)
      throw new Error("Strict JavaScript declaration generation failed");
    for (const path of inventory(target))
      writeFileSync(
        join(target, path),
        await format(readFileSync(join(target, path), "utf8"), {
          parser: "typescript",
        }),
      );
    if (check) {
      const expected = inventory(committed),
        observed = inventory(target);
      if (
        expected.length !== observed.length ||
        expected.some((p, i) => p !== observed[i])
      )
        throw new Error("Declaration inventory drift");
      for (const path of expected)
        if (
          !readFileSync(join(committed, path)).equals(
            readFileSync(join(target, path)),
          )
        )
          throw new Error(`Generated declarations drifted: ${path}`);
    } else {
      for (const path of inventory(target)) {
        mkdirSync(dirname(join(committed, path)), { recursive: true });
        copyFileSync(join(target, path), join(committed, path));
      }
    }
    return { declarations: inventory(target).length };
  } finally {
    if (resolve(target).startsWith(resolve(tmpdir()) + sep))
      rmSync(target, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  console.log(
    JSON.stringify(
      await buildTypes({ check: process.argv.includes("--check") }),
    ),
  );
