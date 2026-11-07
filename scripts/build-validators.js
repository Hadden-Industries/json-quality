// SPDX-License-Identifier: AGPL-3.0-only
// Producer-only compilation. Exported schemas remain the acceptance authority;
// generated CommonJS is Ajv's supported standalone format, consumed by ESM.
import { Ajv2020 as Ajv } from "ajv/dist/2020.js";
import standalone from "ajv/dist/standalone/index.js";
import { _ } from "ajv/dist/compile/codegen/index.js";
import { _Code } from "ajv/dist/compile/codegen/code.js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Only the closed, typed NFC pin schema uses this specialised uniqueness
// implementation. Length-delimited scalar fields preserve object-key-order
// independence and distinguish an absent record from a present selector.
export function duplicateNfcPin(items) {
  const seen = new Map();
  let duplicate = null;
  for (let i = 0; i < items.length; i++) {
    const pin = items[i];
    if (
      !pin ||
      typeof pin !== "object" ||
      ![pin.pointer, pin.sha256, pin.byteLength].every(
        (value) => typeof value === "string",
      ) ||
      (pin.record !== undefined &&
        (!pin.record ||
          typeof pin.record.pointer !== "string" ||
          typeof pin.record.value !== "string"))
    )
      continue;
    const fields = [pin.pointer, pin.sha256, pin.byteLength];
    if (pin.record !== undefined)
      fields.push(pin.record.pointer, pin.record.value);
    const key = fields.map((value) => value.length + ":" + value).join("");
    if (seen.has(key)) duplicate = [i, seen.get(key)];
    seen.set(key, i);
  }
  return duplicate;
}

export function validatorCompiler(
  configuration,
  { allErrors = false, pins = [] } = {},
) {
  const ajv = new Ajv({
    strict: true,
    allErrors,
    discriminator: true,
    inlineRefs: false,
    code: { source: true, optimize: 2, lines: true },
  });
  const original = ajv.getKeyword("uniqueItems");
  const selected = new Set([
    configuration.$defs.nfcExemptStringValuePins,
    ...pins,
  ]);
  ajv.removeKeyword("uniqueItems");
  ajv.addKeyword({
    ...original,
    code(context) {
      if (!selected.has(context.parentSchema)) return original.code(context);
      if (!context.schema) return;
      const { gen, data } = context;
      const helper = gen.scopeValue("func", {
        ref: duplicateNfcPin,
        code: new _Code("(" + duplicateNfcPin.toString() + ")"),
      });
      const indices = gen.const("duplicates", _`${helper}(${data})`);
      context.setParams({ i: _`${indices}[0]`, j: _`${indices}[1]` });
      context.fail(_`${indices} !== null`);
    },
  });
  ajv.addSchema(configuration, "configuration.schema.json");
  return ajv;
}

export async function buildValidators({ check = false } = {}) {
  const schema = (name) =>
    JSON.parse(
      readFileSync(
        new URL(`../schemas/${name}.schema.json`, import.meta.url),
        "utf8",
      ),
    );
  const configuration = schema("configuration");
  const nfc = {
    ...configuration.$defs.nfcExemptStringValuePins,
    $defs: configuration.$defs,
  };
  // Every exported event branch has a unique required type tag. Ajv verifies
  // that disjointness at build time; dispatch selects the identical oneOf
  // branch without evaluating every other variant. Public schema bytes stay
  // unchanged and differential tests use the unannotated exported schema.
  const events = schema("event");
  events.discriminator = { propertyName: "type" };
  const recipes = [
    [
      "configuration",
      true,
      {
        validateConfiguration: configuration,
        validatePolicy: schema("effective-policy"),
      },
    ],
    [
      "source-contract",
      false,
      { validateSourceContract: schema("source-contract") },
    ],
    ["events", false, { validateEvent: events }],
  ];
  const directory = new URL("../src/generated/", import.meta.url);
  if (!check) mkdirSync(directory, { recursive: true });
  for (const [name, allErrors, exports] of recipes) {
    const compiler = validatorCompiler(configuration, {
      allErrors,
      pins: [nfc],
    });
    const validators = {};
    for (const [name, value] of Object.entries(exports)) {
      const validate = compiler.compile(value);
      validators[name] = validate.schema.$id ?? `urn:json-quality:${name}`;
      if (!validate.schema.$id) compiler.addSchema(value, validators[name]);
    }
    const text =
      "// SPDX-License-Identifier: AGPL-3.0-only\n// @ts-nocheck\n// Generated from exported schemas; run npm run build:validators.\n" +
      standalone(compiler, validators) +
      "\n";
    const path = new URL(name + ".cjs", directory);
    if (check) {
      if (readFileSync(path, "utf8") !== text)
        throw new Error("Generated validator drift: " + name);
    } else writeFileSync(path, text);
  }
  return { validators: recipes.length, check };
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  console.log(
    JSON.stringify(
      await buildValidators({ check: process.argv.includes("--check") }),
    ),
  );
