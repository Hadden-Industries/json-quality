// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { bootstrapJsonPolicy } from "../../src/policy-bootstrap.js";
import {
  NativeSession,
  nativeTemporaryRoot,
  verifiedComponent,
} from "./client.mjs";

const valid =
  '{"schemaVersion":2,"defaults":{"formatContract":"prettier-json","allowFormatWrites":true,"normalization":"NFC"},"exceptions":[]}';
async function fixture(text, run) {
  const root = await mkdtemp(join(nativeTemporaryRoot, "policy-bootstrap-"));
  try {
    await writeFile(join(root, ".json-quality.json"), text);
    await run({
      root,
      component: verifiedComponent,
      temporaryDirectory: nativeTemporaryRoot,
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("policy bootstrap preserves exact source identity, admits Ajv and transfers a frozen accounted object", async () => {
  const text = " \n" + valid + "\r\n";
  await fixture(text, async (options) => {
    const result = await bootstrapJsonPolicy(options),
      core = new NativeSession();
    try {
      assert.equal(
        result.observation.sha256,
        createHash("sha256").update(text).digest("hex"),
      );
      assert.equal(
        result.observation.byteLength,
        String(Buffer.byteLength(text)),
      );
      assert.equal(result.policy.schemaVersion, 2);
      assert.throws(() => {
        result.policy.defaults.normalization = "preserve";
      }, TypeError);
      await core.configure();
      await core.command("adopt-control-state", {
        byteLength: result.controlStateReservationBytes,
      });
      await core.capture([Buffer.from("0")], {
        formatContract: "producer-json-compact-body",
      });
      for await (const event of core.events())
        if (event.type === "terminal")
          assert.equal(event.contractSatisfied, true);
      assert.equal(
        (await core.command("metrics")).result.controlStateReservationBytes,
        result.controlStateReservationBytes,
      );
    } finally {
      await core.close();
    }
  });
});

test("policy duplicate names fail shared quality before object materialization", async () => {
  await fixture(
    valid.replace('"schemaVersion":2', '"schemaVersion":2,"schemaVersion":2'),
    async (options) => {
      await assert.rejects(
        bootstrapJsonPolicy(options),
        /shared strict quality admission failed/,
      );
    },
  );
});

test("policy input ceilings and complete domain admission remain separate", async () => {
  await fixture(valid, async (options) => {
    await assert.rejects(
      bootstrapJsonPolicy({ ...options, resources: { maxPolicyBytes: "10" } }),
      /policy-byte-capacity/,
    );
  });
  await fixture('{"schemaVersion":999}', async (options) => {
    await assert.rejects(
      bootstrapJsonPolicy(options),
      /Invalid JSON policy structure/,
    );
  });
});
