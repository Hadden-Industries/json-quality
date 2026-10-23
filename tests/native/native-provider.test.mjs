// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  checkNativeProvider,
  recheckNativeAuthorities,
} from "../../src/native-provider.js";
import { NativeSession, nativeTemporaryRoot } from "./client.mjs";

const identity = (bytes) => ({
  byteLength: String(bytes.length),
  sha256: createHash("sha256").update(bytes).digest("hex"),
});

test("a trusted native owner streams independent census and actual members with bounded transport", async () => {
  const root = await mkdtemp(join(nativeTemporaryRoot, "native-provider-")),
    session = new NativeSession();
  try {
    const storage = Buffer.from([0xff, 0x00]),
      pin = { path: "storage.bin", ...identity(storage) };
    await writeFile(join(root, pin.path), storage);
    await session.configure();
    let closed = false;
    const provider = async () => ({
      authorities: (async function* () {
        yield pin;
      })(),
      inventory: (async function* () {
        yield {
          path: "storage.bin!/one.json",
          ...identity(Buffer.from("0")),
          source: { ...pin, kind: "archive-member", memberPath: "one.json" },
        };
      })(),
      documents: (async function* () {
        yield {
          path: "storage.bin!/one.json",
          chunks: (async function* () {
            yield Buffer.from("0");
          })(),
        };
      })(),
      close: async () => {
        closed = true;
      },
    });
    const events = [];
    for await (const event of checkNativeProvider({
      root,
      session,
      provider,
      definition: { id: "storage", minimumDocuments: 1 },
      contractFor: () => ({ formatContract: "producer-json-compact-body" }),
    }))
      events.push(event);
    assert.equal(closed, true);
    assert.equal(events.filter(({ type }) => type === "terminal").length, 1);
    assert.equal(events.at(-1).contractSatisfied, true);
    assert.equal(events.at(-1).path, "storage.bin!/one.json");
    assert.equal(
      (await session.command("census-status")).result.complete,
      true,
    );
    await recheckNativeAuthorities({ root, session });
    await writeFile(join(root, pin.path), Buffer.from([0xff, 0x01]));
    await assert.rejects(
      recheckNativeAuthorities({ root, session }),
      /Source changed/,
    );
  } finally {
    await session.close();
    await rm(root, { recursive: true, force: true });
  }
});

for (const [fault, expectedError] of [
  ["omitted", /census-member-missing/],
  ["extra", /Unexpected or duplicate native member/],
  ["changed", /source-identity-digest/],
  ["oversized fragment", /at most 65536 bytes/],
]) {
  test(`native provider rejects ${fault} delivery and closes its owner`, async () => {
    const root = await mkdtemp(
        join(nativeTemporaryRoot, "native-provider-fault-"),
      ),
      session = new NativeSession();
    try {
      const storage = Buffer.from([0xff, 0x00]),
        pin = { path: "storage.bin", ...identity(storage) };
      await writeFile(join(root, pin.path), storage);
      await session.configure();
      let closed = false;
      const provider = async () => ({
        authorities: (async function* () {
          yield pin;
        })(),
        inventory: (async function* () {
          yield {
            path: "storage.bin!/one.json",
            ...identity(Buffer.from("0")),
            source: { ...pin, kind: "archive-member", memberPath: "one.json" },
          };
        })(),
        documents: (async function* () {
          if (fault === "omitted") return;
          yield {
            path: fault === "extra" ? "extra.json" : "storage.bin!/one.json",
            chunks: (async function* () {
              yield fault === "oversized fragment"
                ? Buffer.alloc(65537)
                : Buffer.from(fault === "changed" ? "1" : "0");
            })(),
          };
        })(),
        close: async () => {
          closed = true;
        },
      });
      await assert.rejects(async () => {
        for await (const event of checkNativeProvider({
          root,
          session,
          provider,
          definition: { id: "storage", minimumDocuments: 1 },
          contractFor: () => ({ formatContract: "producer-json-compact-body" }),
        }))
          assert.notEqual(event.type, "terminal");
      }, expectedError);
      assert.equal(closed, true);
    } finally {
      await session.close();
      await rm(root, { recursive: true, force: true });
    }
  });
}

test("stopping at a member terminal cannot close the provider's census delivery", async () => {
  const root = await mkdtemp(
      join(nativeTemporaryRoot, "native-provider-stop-"),
    ),
    session = new NativeSession();
  try {
    const storage = Buffer.from([0xff]),
      pin = { path: "storage.bin", ...identity(storage) };
    await writeFile(join(root, pin.path), storage);
    await session.configure();
    let closed = false;
    const provider = async () => ({
      authorities: (async function* () {
        yield pin;
      })(),
      inventory: (async function* () {
        yield {
          path: "storage.bin!/one.json",
          ...identity(Buffer.from("0")),
          source: { ...pin, kind: "archive-member", memberPath: "one.json" },
        };
      })(),
      documents: (async function* () {
        yield {
          path: "storage.bin!/one.json",
          chunks: (async function* () {
            yield Buffer.from("0");
          })(),
        };
      })(),
      close: async () => {
        closed = true;
      },
    });
    let observed = false;
    for await (const event of checkNativeProvider({
      root,
      session,
      provider,
      definition: { id: "storage", minimumDocuments: 1 },
      contractFor: () => ({ formatContract: "producer-json-compact-body" }),
    })) {
      if (event.type === "source") continue;
      assert.equal(event.type, "terminal");
      observed = true;
      break;
    }
    assert.equal(observed, true);
    assert.equal(closed, true);
    const status = (await session.command("census-status")).result;
    assert.equal(status.complete, false);
    assert.equal(status.missing, "1");
  } finally {
    await session.close();
    await rm(root, { recursive: true, force: true });
  }
});
