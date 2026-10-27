// SPDX-License-Identifier: AGPL-3.0-only
/** Keep the standalone cold bootstrap's literal defaults tied to native schema annotations. */
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";

export function projectResourceLimits({ write = false } = {}) {
  const schema = JSON.parse(
    readFileSync(
      new URL("../schemas/configuration.schema.json", import.meta.url),
      "utf8",
    ),
  );
  const path = new URL("../src/acquire.js", import.meta.url);
  const source = readFileSync(path, "utf8").replaceAll("\r\n", "\n");
  const definition = schema.$defs.capacityLimits;
  if (
    definition.type !== "object" ||
    definition.additionalProperties !== false ||
    Object.keys(definition).some(
      (key) => !["type", "additionalProperties", "properties"].includes(key),
    )
  )
    throw new Error(
      "Cold resource validation requires a closed object schema.",
    );
  const values = Object.entries(definition.properties)
    .map(([name, rule]) => {
      if (
        !/^[a-z][A-Za-z0-9]*$/u.test(name) ||
        rule.type !== "integer" ||
        rule.minimum !== 1 ||
        rule.maximum !== Number.MAX_SAFE_INTEGER ||
        Object.keys(rule).some(
          (key) => !["type", "minimum", "maximum", "default"].includes(key),
        ) ||
        !Number.isSafeInteger(rule.default) ||
        rule.default < 1
      )
        throw new Error(
          "Cold resource validation requires positive safe integers, matching defaults and literal property names.",
        );
      return `  ${name}: ${rule.default},`;
    })
    .join("\n");
  const block = `// BEGIN GENERATED RESOURCE DEFAULTS\nexport const ACQUISITION_RESOURCE_DEFAULTS = Object.freeze({\n${values}\n});\n// END GENERATED RESOURCE DEFAULTS`;
  const marker =
    /\/\/ BEGIN GENERATED RESOURCE DEFAULTS[\s\S]*?\/\/ END GENERATED RESOURCE DEFAULTS/gu;
  if ([...source.matchAll(marker)].length !== 1)
    throw new Error("Missing or duplicated resource projection marker.");
  const projected = source.replace(marker, block);
  if (projected !== source) {
    if (!write)
      throw new Error(
        "Cold bootstrap resource defaults drifted; run npm run sync:resources.",
      );
    writeFileSync(path, projected);
  }
  const eventsPath = new URL("../schemas/event.schema.json", import.meta.url),
    events = JSON.parse(readFileSync(eventsPath, "utf8")),
    resources = events.properties.resources.properties;
  for (const [wireName, definitionName] of [
    ["admission", "capacityLimits"],
    ["runtime", "runtimeControls"],
  ]) {
    const names = Object.keys(schema.$defs[definitionName].properties),
      integer = {
        $ref: `${schema.$id}#/$defs/positiveIntegerText`,
      },
      rule = {
        type: "object",
        additionalProperties: false,
        required: names,
        properties: Object.fromEntries(
          names.map((name) => [
            name,
            wireName === "admission"
              ? { anyOf: [integer, { type: "null" }] }
              : integer,
          ]),
        ),
      };
    if (!isDeepStrictEqual(resources[wireName], rule)) {
      if (!write)
        throw new Error(
          "Event resource contract drifted; run npm run sync:resources.",
        );
      resources[wireName] = rule;
    }
  }
  if (write) writeFileSync(eventsPath, JSON.stringify(events, null, 2) + "\n");
  return { defaults: values.split("\n").length, synchronized: true };
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  if (process.argv.slice(2).some((arg) => arg !== "--write"))
    throw new Error("Use --write or no arguments.");
  console.log(
    JSON.stringify(
      projectResourceLimits({ write: process.argv.includes("--write") }),
    ),
  );
}
