// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Ajv from "ajv/dist/2020.js";

export const publicSchemaNames = ["configuration", "source-contract", "event"];
export const readSchema = (name) =>
  JSON.parse(
    readFileSync(
      new URL(`../schemas/${name}.schema.json`, import.meta.url),
      "utf8",
    ),
  );

/** Compile the actual exported bytes with the runtime's offline, strict dialect. */
export function checkSchemas() {
  const ajv = new Ajv({ strict: true, allErrors: true });
  const schemas = publicSchemaNames.map(readSchema);
  const identities = new Set();
  for (const schema of schemas) {
    assert.equal(
      schema.$schema,
      "https://json-schema.org/draft/2020-12/schema",
    );
    assert.match(
      schema.$id,
      /^https:\/\/github\.com\/Hadden-Industries\/json-quality\/schema\/[a-z-]+\/v2$/u,
    );
    assert.ok(!identities.has(schema.$id), "Duplicate public schema identity");
    identities.add(schema.$id);
    ajv.addSchema(schema);
  }
  for (const schema of schemas) assert.ok(ajv.getSchema(schema.$id));
  const policy = ajv.getSchema(schemas[0].$id);
  const valid = {
    schemaVersion: 2,
    defaults: {
      formatContract: "prettier-json",
      allowFormatWrites: true,
      normalization: "NFC",
    },
    exceptions: [],
  };
  assert.ok(policy(valid));
  assert.equal(policy({ ...valid, unknown: true }), false);
  return { dialect: "2020-12", schemas: schemas.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  console.log(JSON.stringify(checkSchemas()));
