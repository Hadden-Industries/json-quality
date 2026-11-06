// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { temporaryDirectory } from "./temporary-directory.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const name = "@hadden-industries/json-quality";
const resources = [
  "configuration-schema",
  "effective-policy-schema",
  "source-contract-schema",
  "event-schema",
  "contract-cohort",
];
const resourceProbe = `
  for (const resource of ${JSON.stringify(resources)}) {
    const imported = await import(${JSON.stringify(name)} + "/" + resource, {with: {type: "json"}});
    assert.equal(typeof imported.default, "object");
    assert.notEqual(imported.default, null);
  }
`;
const refusalProbe = `
  import assert from "node:assert/strict";
  for (const specifier of [${JSON.stringify(name)}, ${JSON.stringify(name + "/eslint")}])
    await assert.rejects(import(specifier), {code: "ERR_PACKAGE_PATH_NOT_EXPORTED"});
  ${resourceProbe}
`;

function run(program, options = []) {
  const result = spawnSync(
    process.execPath,
    [...options, "--input-type=module", "--eval", program],
    {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
      timeout: 30000,
      env: { ...process.env, NODE_OPTIONS: "", NODE_PATH: "" },
    },
  );
  assert.equal(result.error, undefined, result.stderr);
  assert.equal(result.signal, null, result.stderr);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
}

test("Node JavaScript exports load while browser conditions refuse both entry points", () => {
  run(`
    import assert from "node:assert/strict";
    import * as sdk from ${JSON.stringify(name)};
    import plugin from ${JSON.stringify(name + "/eslint")};
    assert.equal(typeof sdk.openJsonSourceSession, "function");
    assert.equal(typeof plugin.rules["no-json-stringify-identity"].create, "function");
    ${resourceProbe}
  `);
  // Node supplies its node condition too: browser refusal must take precedence.
  run(refusalProbe, ["--conditions=browser"]);
});

test("unmatched JavaScript conditions refuse SDK exports while JSON resources still load", () => {
  const hook = `
    export function resolve(specifier, context, nextResolve) {
      if (specifier === ${JSON.stringify(name)} || specifier.startsWith(${JSON.stringify(name + "/")})) {
        return nextResolve(specifier, {...context, conditions: context.conditions.filter(
          condition => condition !== "node" && condition !== "node-addons"
        )});
      }
      return nextResolve(specifier, context);
    }
  `;
  run(`
    import {register} from "node:module";
    register(${JSON.stringify("data:text/javascript," + encodeURIComponent(hook))}, import.meta.url);
    ${refusalProbe}
  `);
});

test("TypeScript resolves Node declarations without exposing browser or unmatched SDK types", (t) => {
  const directory = temporaryDirectory(t, "json-export-types-");
  const scope = join(directory, "node_modules", "@hadden-industries");
  mkdirSync(scope, { recursive: true });
  // Exercise normal package resolution with a real workspace-style link.
  symlinkSync(
    root,
    join(scope, "json-quality"),
    process.platform === "win32" ? "junction" : "dir",
  );
  writeFileSync(
    join(directory, "consumer.mts"),
    [
      `import {openJsonSourceSession} from ${JSON.stringify(name)};`,
      `import plugin from ${JSON.stringify(name + "/eslint")};`,
      ...resources.map(
        (resource, index) =>
          `import resource${index} from ${JSON.stringify(name + "/" + resource)} with {type: "json"};\nvoid resource${index};`,
      ),
      "void openJsonSourceSession;",
      'void plugin.rules["no-json-stringify-identity"].create;',
    ].join("\n") + "\n",
  );
  const compile = (options) => {
    writeFileSync(
      join(directory, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noEmit: true,
          target: "ES2024",
          types: ["node"],
          typeRoots: [join(root, "node_modules", "@types")],
          resolveJsonModule: true,
          ...options,
        },
        files: ["consumer.mts"],
      }),
    );
    const result = spawnSync(
      process.execPath,
      [
        join(root, "node_modules", "typescript", "bin", "tsc"),
        "--project",
        "tsconfig.json",
        "--pretty",
        "false",
      ],
      { cwd: directory, encoding: "utf8", windowsHide: true, timeout: 30000 },
    );
    assert.equal(result.error, undefined, result.stderr);
    assert.equal(result.signal, null, result.stderr);
    return result;
  };
  const node = { module: "NodeNext", moduleResolution: "NodeNext" };
  const ordinary = compile(node);
  assert.equal(ordinary.status, 0, ordinary.stdout + ordinary.stderr);
  for (const options of [
    { ...node, customConditions: ["browser"] },
    {
      module: "ESNext",
      moduleResolution: "Bundler",
      customConditions: ["json-quality-unmatched"],
    },
  ]) {
    const refused = compile(options);
    assert.equal(refused.status, 1, refused.stdout + refused.stderr);
    for (const specifier of [name, name + "/eslint"])
      assert.ok(
        refused.stdout.includes(
          `error TS2307: Cannot find module '${specifier}'`,
        ),
        refused.stdout,
      );
    // Both SDKs must refuse; all five independent JSON resources still resolve.
    assert.equal(
      (refused.stdout.match(/\berror TS\d+:/gu) ?? []).length,
      2,
      refused.stdout,
    );
  }
});
