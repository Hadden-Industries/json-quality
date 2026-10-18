// SPDX-License-Identifier: AGPL-3.0-only
/** Cheap shipment admission on the native dry-pack inventory, without a release artifact. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runNpmPack } from "./pack.js";
import { npmCli } from "./qualification-process.js";
import { verifyShippedLinks } from "./release-contract.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const pack = runNpmPack(root, { npm: npmCli() });
const contents = new Map(
  pack.files
    .filter(({ path }) => path.endsWith(".md"))
    .map(({ path }) => [path.toLowerCase(), readFileSync(join(root, path))]),
);
verifyShippedLinks(pack.files, contents);
const schema = JSON.parse(
  readFileSync(join(root, "schemas/release-manifest.schema.json")),
);
assert.equal(schema.properties.schemaVersion.const, 1);
console.log(
  JSON.stringify({ shipmentLinks: "passed", members: pack.files.length }),
);
