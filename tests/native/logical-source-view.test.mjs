// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openJsonRepositorySession } from "../../src/index.js";

test("a trusted logical factory reads captured metadata through one ledger and loses its borrowed authority on settlement", async () => {
  const root = await mkdtemp(join(tmpdir(), "logical-source-view-"));
  let session;
  try {
    execFileSync("git", ["-C", root, "init", "--quiet"], { windowsHide: true });
    await writeFile(
      join(root, ".json-quality.json"),
      JSON.stringify(
        {
          schemaVersion: 3,
          defaults: {
            formatContract: "prettier-json",
            normalization: "NFC",
            allowFormatWrites: true,
          },
          exceptions: [
            {
              paths: ["logical/**"],
              formatContract: "producer-json-compact-body",
              owner: "independent logical fixture",
              reason: "Original captured base64 bytes.",
            },
          ],
        },
        null,
        2,
      ) + "\n",
    );
    await writeFile(
      join(root, "container.json"),
      '{\n  "body": "MA==",\n  "metadata": {\n    "path": "logical/member.json"\n  }\n}\n',
    );
    await writeFile(join(root, "unneeded.json"), '{\n  "unused": 0\n}\n');
    let view, borrowed, leakedLease, leakedControl, physical, unneeded;
    session = await openJsonRepositorySession({
      root,
      retainValues: false,
      runtimeControls: { managedMemoryTargetBytes: 16777216 },
      logicalProviders: [
        {
          definition: {
            id: "captured",
            minimumDocuments: 1,
            containerPaths: ["container.json", "absent.json"],
          },
          async *inventory(access) {
            view = access;
            await assert.rejects(
              access.capturedSource("unneeded.json"),
              /logical-container-scope/u,
            );
            assert.equal(
              access.resources.runtime.managedMemoryTargetBytes,
              "16777216",
            );
            for (const name of [
              "check",
              "close",
              "cancel",
              "command",
              "capture",
              "binding",
            ])
              assert.equal(Object.hasOwn(access, name), false, name);
            await assert.rejects(
              access.capturedSource("absent.json"),
              /captured-source-unavailable/u,
            );
            borrowed = await access.select(
              await access.capturedSource("container.json"),
              "/body",
            );
            leakedLease = await access.materialize(
              borrowed,
              "decoded-utf8",
              "4",
            );
            assert.equal(leakedLease.bytes.toString(), "MA==");
            await leakedLease.release();
            leakedControl = await access.materializeControl(
              await access.select(
                await access.capturedSource("container.json"),
                "/metadata",
              ),
              "128",
              (metadata) => {
                assert.deepEqual(metadata, { path: "logical/member.json" });
                return true;
              },
            );
            assert.equal(leakedControl.value.path, "logical/member.json");
            const names = [];
            for await (const child of access.children(
              await access.select(
                await access.capturedSource("container.json"),
                "/metadata",
              ),
            )) {
              names.push(
                (
                  await access.read(child.name, "decoded-utf8")
                ).bytes.toString(),
              );
              assert.equal(
                (
                  await access.read(child.value, "decoded-utf8")
                ).bytes.toString(),
                "logical/member.json",
              );
            }
            assert.deepEqual(names, ["path"]);
            yield {
              path: "logical/member.json",
              containerPath: "container.json",
              pointer: "/body",
              encoding: "base64",
              sha256: createHash("sha256").update("0").digest("hex"),
              byteLength: "1",
            };
            // Deliberately leave the control lease for borrowed-view settlement.
          },
        },
      ],
    });
    let terminal;
    for await (const event of session.events()) {
      if (event.type === "source" && event.path === "unneeded.json")
        unneeded = event.source;
      if (event.type === "source" && event.path === "container.json")
        physical = event.source;
      if (event.type === "execution-terminal") terminal = event;
    }
    assert.equal(terminal.contractSatisfied, true);
    await assert.rejects(
      session.select(unneeded, "/unused"),
      /source-values-not-retained/u,
    );
    assert.equal(
      (await session.readSource(unneeded)).bytes.toString(),
      '{\n  "unused": 0\n}\n',
    );
    await assert.rejects(
      view.read(borrowed, "decoded-utf8"),
      /closed-session/u,
    );
    assert.throws(() => leakedLease.bytes, /closed-session/u);
    assert.throws(() => leakedControl.value, /closed-session/u);
    await assert.rejects(
      session.read(borrowed, "decoded-utf8"),
      /foreign-or-invalid-reference/u,
    );
    // A leaked provider reservation was released without closing the owner.
    const lease = await session.materialize(
      await session.select(physical, "/body"),
      "decoded-utf8",
      "4",
    );
    assert.equal(lease.bytes.toString(), "MA==");
    await lease.release();
  } finally {
    await session?.close();
    await rm(root, { recursive: true, force: true });
  }
});
