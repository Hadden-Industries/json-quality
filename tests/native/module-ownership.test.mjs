// SPDX-License-Identifier: AGPL-3.0-only
import { budgets } from "../../scripts/qualification-process.js";
import assert from "node:assert/strict";
import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import test from "node:test";
import { NativeSession as CoreSession } from "../../src/native-session.js";
import { nativeTemporaryRoot, verifiedComponent } from "./client.mjs";

test("separately loaded binary copies reject each other's session handles", async () => {
  const directory = await mkdtemp(join(nativeTemporaryRoot, "module-owner-")),
    path = join(directory, "foreign.node");
  try {
    await copyFile(
      join(verifiedComponent.directory, "json-quality.node"),
      path,
    );
    execFileSync(
      process.execPath,
      [
        fileURLToPath(new URL("module-ownership-child.mjs", import.meta.url)),
        join(verifiedComponent.directory, "json-quality.node"),
        path,
        directory,
      ],
      { timeout: budgets.read, windowsHide: true, stdio: "pipe" },
    );
  } finally {
    await rm(directory, { recursive: true });
  }
});

test("a rejected component handshake can release its unconfigured native session", () => {
  assert.throws(
    () =>
      new CoreSession(
        {
          ...verifiedComponent,
          manifest: {
            ...verifiedComponent.manifest,
            sourceInputsSha256: "0".repeat(64),
          },
        },
        join(nativeTemporaryRoot, "rejected-handshake"),
      ),
    /native-session-cohort/,
  );
});
