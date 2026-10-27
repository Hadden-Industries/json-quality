// SPDX-License-Identifier: AGPL-3.0-only
import { budgets } from "../scripts/qualification-process.js";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { temporaryRepository } from "./temporary-repository.js";

test("maintained consumer corpus exercises the current public cohort before transported qualification", (t) => {
  const root = temporaryRepository(t, "json-quality-consumer-corpus-");
  writeFileSync(
    join(root, ".json-quality.json"),
    JSON.stringify(
      {
        schemaVersion: 3,
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
            reason: "External Git state.",
          },
        ],
      },
      null,
      2,
    ) + "\n",
  );
  writeFileSync(join(root, "source.json"), "{}\n");
  execFileSync(
    process.execPath,
    [
      fileURLToPath(new URL("../scripts/consumer-probe.mjs", import.meta.url)),
      root,
    ],
    {
      windowsHide: true,
      timeout: budgets.read,
      encoding: "utf8",
      maxBuffer: 2097152,
    },
  );
});
