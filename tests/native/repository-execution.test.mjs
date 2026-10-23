// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  executeRepositoryCheck,
  createRepositoryExecution,
} from "../../src/repository-execution.js";
import { createValueSession } from "../../src/value-session.js";
import { nativeTemporaryRoot, verifiedComponent } from "./client.mjs";

async function fixture(extra, run) {
  const root = await mkdtemp(join(nativeTemporaryRoot, "complete-repository-"));
  try {
    // Independent finite producer fixture, accepted by the standard presentation.
    await writeFile(
      join(root, ".json-quality.json"),
      JSON.stringify(
        {
          schemaVersion: 2,
          defaults: {
            formatContract: "prettier-json",
            allowFormatWrites: true,
            normalization: "NFC",
          },
          exceptions: [],
          ...extra,
        },
        null,
        2,
      ) + "\n",
    );
    await writeFile(join(root, "ordinary.json"), "0\n");
    execFileSync("git", ["-C", root, "init", "--quiet"], { windowsHide: true });
    await run({
      root,
      component: verifiedComponent,
      temporaryDirectory: nativeTemporaryRoot,
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("complete execution bootstraps immutable policy and reports exact resources before a verified verdict", async () => {
  await fixture({}, async (options) => {
    const events = [];
    for await (const event of executeRepositoryCheck({
      ...options,
      capacityLimits: false,
    }))
      events.push(event);
    assert.equal(events[0].type, "execution");
    assert.equal(events[0].resources.admission.maxFiles, null);
    assert.equal(
      events[0].resources.runtime.managedMemoryTargetBytes,
      "33554432",
    );
    assert.throws(() => {
      events[0].resources.admission.maxFiles = "1";
    }, TypeError);
    assert.equal(events.at(-1).type, "execution-terminal");
    assert.equal(events.at(-1).members, "2");
    assert.equal(events.at(-1).contractSatisfied, true);
    assert.equal(events.at(-1).domainComplete, false);
  });
});

test("unmatched original-presentation obligations prevent an execution verdict", async () => {
  await fixture(
    {
      preserveSourcePresentation: [
        {
          paths: ["absent.json"],
          owner: "test",
          reason: "Required independently sourced bytes.",
        },
      ],
    },
    async (options) => {
      await assert.rejects(async () => {
        for await (const event of executeRepositoryCheck(options))
          assert.notEqual(event.type, "execution-terminal");
      }, /Unmatched source-presentation obligation/);
    },
  );
});

test("injected native obligations retain original presentation only after independent provenance admission", async () => {
  await fixture(
    {
      nativeSources: [
        {
          id: "archive",
          provider: "archiveOwner",
          owner: "test",
          reason: "Independent native inventory.",
        },
      ],
      preserveSourcePresentation: [
        {
          paths: ["bundle.zip!/*.json"],
          owner: "test",
          reason: "Native bytes are independently pinned.",
        },
      ],
    },
    async (options) => {
      const archive = Buffer.from([255, 0]),
        text = " 0 ",
        pin = (bytes) => ({
          byteLength: String(Buffer.byteLength(bytes)),
          sha256: createHash("sha256").update(bytes).digest("hex"),
        }),
        authority = { path: "bundle.zip", ...pin(archive) };
      await writeFile(join(options.root, authority.path), archive);
      let final,
        closed = false;
      for await (const event of executeRepositoryCheck({
        ...options,
        nativeProviders: {
          archiveOwner: async () => ({
            authorities: (async function* () {
              yield authority;
            })(),
            inventory: (async function* () {
              yield {
                path: "bundle.zip!/member.json",
                ...pin(text),
                source: {
                  ...authority,
                  kind: "archive-member",
                  memberPath: "member.json",
                },
              };
            })(),
            documents: (async function* () {
              yield {
                path: "bundle.zip!/member.json",
                chunks: (async function* () {
                  yield Buffer.from(text);
                })(),
              };
            })(),
            close() {
              closed = true;
            },
          }),
        },
      }))
        final = event;
      assert.equal(closed, true);
      assert.equal(final.type, "execution-terminal");
      assert.equal(final.members, "3");
      assert.equal(final.contractSatisfied, true);
    },
  );
});

test("advanced repository delivery exposes live scoped diagnostic arguments until explicit close", async () => {
  await fixture({}, async (options) => {
    await writeFile(
      join(options.root, "ordinary.json"),
      '{\n  "unsafe": 9007199254740992,\n  "safe": "kept"\n}\n',
    );
    const execution = await createRepositoryExecution({
        ...options,
        retainValues: true,
      }),
      values = createValueSession(execution.core);
    try {
      let argument, source, final;
      for await (const event of values.projectRepositoryEvents(
        execution.events(),
      )) {
        if (event.type === "source" && event.path === "ordinary.json")
          source = event.source;
        if (event.type === "finding" && event.arguments?.value) {
          argument = event.arguments.value;
          assert.equal(
            values.sameReference(event.value, argument.reference),
            true,
          );
        }
        final = event;
      }
      assert.equal(final.inventoryComplete, true);
      assert.equal(final.qualityPassed, false);
      assert.equal(
        (
          await values.read(argument.reference, argument.representation)
        ).bytes.toString(),
        "9007199254740992",
      );
      assert.equal(
        values.sameReference(
          await values.select(source, "/unsafe"),
          argument.reference,
        ),
        true,
      );
      assert.equal(
        (
          await values.read(
            await values.select(source, "/safe"),
            "decoded-utf8",
          )
        ).bytes.toString(),
        "kept",
      );
      await assert.rejects(async () => {
        for await (const event of execution.events()) assert.fail(event.type);
      }, /already-consumed/);
      await values.close();
      await assert.rejects(
        values.read(argument.reference, argument.representation),
        /closed-session/,
      );
    } finally {
      await values.close();
      await execution.close();
    }
  });
});

for (const member of ["member.json", "member.d.ts.map"])
  test(`native presentation defaults retain exact path overrides for ${member}`, async () => {
    const path = `bundle.zip!/${member}`;
    await fixture(
      {
        nativeSources: [
          {
            id: "archive",
            provider: "archiveOwner",
            owner: "test",
            reason: "Independent archive inventory.",
            formatContract: "producer-json-indent",
          },
        ],
        exceptions: [
          {
            paths: [path],
            owner: "Original source-map producer",
            reason: "Exact compact native source with no final newline.",
            formatContract: "producer-json-compact-body",
            allowFormatWrites: false,
          },
        ],
      },
      async (options) => {
        const bytes = Buffer.from(
            '{"version":3,"sources":[],"names":[],"mappings":""}',
          ),
          archive = Buffer.from([255, 0]),
          pin = (value) => ({
            byteLength: String(value.length),
            sha256: createHash("sha256").update(value).digest("hex"),
          }),
          authority = { path: "bundle.zip", ...pin(archive) };
        await writeFile(join(options.root, authority.path), archive);
        const events = [];
        for await (const event of executeRepositoryCheck({
          ...options,
          nativeProviders: {
            archiveOwner: async () => ({
              authorities: (async function* () {
                yield authority;
              })(),
              inventory: (async function* () {
                yield {
                  path,
                  ...pin(bytes),
                  source: {
                    ...authority,
                    kind: "archive-member",
                    memberPath: member,
                  },
                };
              })(),
              documents: (async function* () {
                yield {
                  path,
                  chunks: (async function* () {
                    yield bytes;
                  })(),
                };
              })(),
            }),
          },
        }))
          events.push(event);
        assert.equal(events.at(-1).inventoryComplete, true);
        assert.equal(events.at(-1).contractSatisfied, true);
        assert.equal(
          events.filter(
            (event) => event.path === path && event.type === "terminal",
          ).length,
          1,
        );
        assert.equal(
          events.some((event) => event.type === "finding"),
          false,
        );
      },
    );
  });
