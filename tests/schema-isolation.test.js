// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { temporaryRepository } from "./temporary-repository.js";

for (const mode of ["writes", "empty-key-options"])
  test(`public schema customization preserves initialized ${mode} admission`, (t) => {
    const root = temporaryRepository(t, "json-quality-schema-isolation-");
    writeFileSync(
      join(root, ".json-quality.json"),
      JSON.stringify(
        {
          schemaVersion: 1,
          defaults: {
            formatContract: "prettier-json",
            allowFormatWrites: true,
            normalization: "NFC",
          },
          exceptions: [
            {
              paths: [".git/**"],
              exclude: true,
              owner: "Git",
              reason: "External state.",
            },
          ],
        },
        null,
        2,
      ) + "\n",
    );
    execFileSync(
      process.execPath,
      [
        fileURLToPath(new URL("./schema-isolation-probe.mjs", import.meta.url)),
        mode,
        root,
      ],
      { encoding: "utf8", windowsHide: true },
    );
  });
