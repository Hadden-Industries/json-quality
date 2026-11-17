// SPDX-License-Identifier: AGPL-3.0-only
/** Project self-contained SVGs from the authored HTML without browser tooling. */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const directory = new URL("../docs/diagrams/", import.meta.url);
const write = process.argv.slice(2);
assert.ok(
  write.length === 0 || (write.length === 1 && write[0] === "--write"),
  "Usage: node scripts/documentation-diagrams.js [--write]",
);
const sources = readdirSync(directory).filter((name) => name.endsWith(".html"));
assert.equal(sources.length, 6, "Expected the six documentation diagrams");
for (const name of sources) {
  const source = readFileSync(new URL(name, directory), "utf8");
  const matches = [...source.matchAll(/<svg\b[\s\S]*?<\/svg>/gu)];
  assert.equal(matches.length, 1, `Expected one inline SVG in ${name}`);
  const svg = matches[0][0];
  assert.match(svg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/u);
  assert.match(svg, /role="img"/u);
  assert.match(svg, /<title\s+id="[^"]+">[^<]+<\/title>/u);
  assert.match(svg, /<desc\s+id="[^"]+">[^<]+<\/desc>/u);
  const target = new URL(name.replace(/\.html$/u, ".svg"), directory);
  const rendered = `<?xml version="1.0" encoding="UTF-8"?>\n${svg}\n`;
  if (write.length) writeFileSync(target, rendered);
  else
    assert.equal(
      readFileSync(target, "utf8"),
      rendered,
      `Stale diagram ${fileURLToPath(target)}; run npm run sync:documentation-diagrams`,
    );
}
console.log(
  `${sources.length} documentation diagrams ${write.length ? "written" : "verified"}`,
);
