// SPDX-License-Identifier: AGPL-3.0-only
/** Keep serialized event resource fields tied to the canonical schema. */
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
            schema.$defs[definitionName].properties[name].type.includes("null")
              ? { anyOf: [integer, { type: "null" }] }
              : integer,
          ]),
        ),
      };
    if (!isDeepStrictEqual(resources[wireName], rule)) {
      if (!write)
        throw new Error(
          "Event resource contract drifted; run npm run sync:event-resources.",
        );
      resources[wireName] = rule;
    }
  }
  if (write) writeFileSync(eventsPath, JSON.stringify(events, null, 2) + "\n");
  return {
    defaults: Object.keys(schema.$defs.capacityLimits.properties).length,
    synchronized: true,
  };
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
