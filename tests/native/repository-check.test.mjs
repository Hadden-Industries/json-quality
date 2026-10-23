// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { checkRepository } from "../../src/repository-check.js";
import {
  observeRepositorySource,
  identifyRepositorySource,
} from "../../src/repository-source.js";
import { NativeSession, nativeTemporaryRoot } from "./client.mjs";

const identity = (text) => ({
  byteLength: String(Buffer.byteLength(text)),
  sha256: createHash("sha256").update(text).digest("hex"),
});
const compact = { formatContract: "producer-json-compact-body" };
async function fixture(
  run,
  { text = '{"payload":"0"}', expected = false } = {},
) {
  const root = await mkdtemp(
      join(nativeTemporaryRoot, "repository-execution-"),
    ),
    session = new NativeSession();
  try {
    await writeFile(join(root, "container.json"), text);
    execFileSync("git", ["-C", root, "init", "--quiet"], { windowsHide: true });
    const configured = await session.configure(),
      contractFor = (path) => ({
        ...compact,
        path,
        exclude: path.startsWith(".git/"),
        ...(expected && path === "container.json"
          ? {
              expected: {
                ...identity(text),
                byteLength: String(Buffer.byteLength(text)),
                diagnostics: [],
                linkedDocuments: [
                  {
                    path: "derived.json",
                    pointer: "/payload",
                    encoding: "utf8",
                    ...identity("0"),
                  },
                ],
              },
            }
          : {}),
      });
    await run({
      root,
      session,
      contractFor,
      capacities: configured.result.resources.admission,
    });
  } finally {
    await session.close();
    await rm(root, { recursive: true, force: true });
  }
}
function logical(
  entries = [
    {
      path: "derived.json",
      containerPath: "container.json",
      pointer: "/payload",
      encoding: "utf8",
      ...identity("0"),
    },
  ],
) {
  return [
    {
      definition: { id: "embedded", containerPaths: ["container.json"] },
      inventory: (async function* () {
        yield* entries;
      })(),
    },
  ];
}

test("repository verdict follows physical and logical checks, exact linkage and freshness", async () => {
  await fixture(
    async (options) => {
      const events = [];
      for await (const event of checkRepository({
        ...options,
        logicalProviders: logical(),
      }))
        events.push(event);
      assert.deepEqual(
        events
          .filter(({ type }) => type === "terminal")
          .map(({ path }) => path),
        ["container.json", "derived.json"],
      );
      assert.equal(events.at(-1).type, "execution-terminal");
      assert.equal(events.at(-1).members, "2");
      assert.equal(events.at(-1).contractSatisfied, true);
      assert.equal(events.at(-1).domainComplete, false);
      assert.equal(events.at(-1).linkedExpectationsComplete, true);
    },
    { expected: true },
  );
});

test("an empty logical provider cannot discharge a required container pin", async () => {
  await fixture(
    async (options) => {
      let verdict = false;
      await assert.rejects(async () => {
        for await (const event of checkRepository({
          ...options,
          logicalProviders: logical([]),
        }))
          verdict ||= event.type === "execution-terminal";
      }, /Missing required logical document/);
      assert.equal(verdict, false);
    },
    { expected: true },
  );
});

test("a changed physical source after its terminal prevents the execution verdict", async () => {
  await fixture(async (options) => {
    let verdict = false;
    await assert.rejects(async () => {
      for await (const event of checkRepository(options)) {
        if (event.type === "terminal")
          await writeFile(join(options.root, "container.json"), "1");
        verdict ||= event.type === "execution-terminal";
      }
    }, /Source changed/);
    assert.equal(verdict, false);
  });
});

test("invalid JSON is a completed census with a failed quality contract", async () => {
  await fixture(
    async (options) => {
      let final;
      for await (const event of checkRepository(options)) final = event;
      assert.equal(final.type, "execution-terminal");
      assert.equal(final.inventoryComplete, true);
      assert.equal(final.qualityPassed, false);
      assert.equal(final.contractSatisfied, false);
    },
    { text: "{" },
  );
});

test("stopping at a source terminal leaves census delivery incomplete", async () => {
  await fixture(async (options) => {
    for await (const event of checkRepository(options))
      if (event.type === "terminal") break;
    assert.equal(
      (await options.session.command("census-status")).result.complete,
      false,
    );
  });
});

test("native-owned JSON alone can complete a repository with an independent authority", async () => {
  await fixture(async (options) => {
    await rm(join(options.root, "container.json"));
    const raw = Buffer.from([0xff, 0x00]),
      pin = { path: "bundle.zip", ...identity(raw) };
    await writeFile(join(options.root, pin.path), raw);
    let closed = false,
      final;
    const provider = async () => ({
      authorities: (async function* () {
        yield pin;
      })(),
      inventory: (async function* () {
        yield {
          path: "bundle.zip!/member.json",
          ...identity("0"),
          source: { ...pin, kind: "archive-member", memberPath: "member.json" },
        };
      })(),
      documents: (async function* () {
        yield {
          path: "bundle.zip!/member.json",
          chunks: (async function* () {
            yield Buffer.from("0");
          })(),
        };
      })(),
      close() {
        closed = true;
      },
    });
    for await (const event of checkRepository({
      ...options,
      nativeProviders: [{ definition: { id: "archive" }, provider }],
    }))
      final = event;
    assert.equal(closed, true);
    assert.equal(final.type, "execution-terminal");
    assert.equal(final.members, "1");
    assert.equal(final.contractSatisfied, true);
  });
});

test("an entirely empty repository cannot assert an execution verdict", async () => {
  await fixture(async (options) => {
    await rm(join(options.root, "container.json"));
    await assert.rejects(async () => {
      for await (const event of checkRepository(options))
        assert.notEqual(event.type, "execution-terminal");
    }, /Incomplete repository census/);
  });
});

test("equal decoded bytes in another field do not satisfy a pinned linkage", async () => {
  await fixture(
    async (options) => {
      await assert.rejects(async () => {
        for await (const event of checkRepository({
          ...options,
          logicalProviders: logical([
            {
              path: "derived.json",
              containerPath: "container.json",
              pointer: "/other",
              encoding: "utf8",
              ...identity("0"),
            },
          ]),
        }))
          assert.notEqual(event.type, "execution-terminal");
      }, /Changed expected logical linkage/);
    },
    { text: '{"payload":"0","other":"0"}', expected: true },
  );
});

test("repository JSONL sources use physical-record framing without a caller parser choice", async () => {
  await fixture(async (options) => {
    await rm(join(options.root, "container.json"));
    await writeFile(join(options.root, "records.ndjson"), "0\r\n1\n");
    let final;
    for await (const event of checkRepository(options)) final = event;
    assert.equal(final.type, "execution-terminal");
    assert.equal(final.members, "1");
    assert.equal(final.qualityPassed, true);
    assert.equal(final.contractSatisfied, true);
  });
});

test("repository JSONL retains a blank physical record finding and failed contract", async () => {
  await fixture(async (options) => {
    await rm(join(options.root, "container.json"));
    await writeFile(join(options.root, "records.jsonl"), "0\r\n \r\n1\n");
    let blank = false,
      final;
    for await (const event of checkRepository(options)) {
      if (event.type === "finding" && event.messageId === "blank-json-line") {
        assert.equal(event.record, "2");
        assert.equal(event.phase, "framing");
        blank = true;
      }
      final = event;
    }
    assert.equal(blank, true);
    assert.equal(final.inventoryComplete, true);
    assert.equal(final.contractSatisfied, false);
  });
});

test("a changed bootstrap policy observation prevents repository execution admission", async () => {
  await fixture(async (options) => {
    const policyObservation = await identifyRepositorySource({
      root: options.root,
      member: observeRepositorySource(options.root, "container.json"),
    });
    await writeFile(join(options.root, "container.json"), "1");
    await assert.rejects(async () => {
      for await (const event of checkRepository({
        ...options,
        policyObservation,
      }))
        assert.fail(`Unexpected event: ${event.type}`);
    }, /Source changed/);
  });
});
