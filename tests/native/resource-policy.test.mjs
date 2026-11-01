// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { NativeSession } from "./client.mjs";

const schema = JSON.parse(
  await readFile(
    new URL("../../schemas/configuration.schema.json", import.meta.url),
    "utf8",
  ),
);
const contract = { formatContract: "producer-json-compact-body" };
const unlimitedAdmission = Object.fromEntries(
  Object.keys(schema.$defs.capacityLimits.properties).map((name) => [
    name,
    null,
  ]),
);
async function check(session, text, selected = contract) {
  await session.capture([Buffer.from(text)], selected);
  let terminal;
  for await (const event of session.events())
    if (event.type === "terminal") terminal = event;
  return terminal;
}

test("native effective resources are projected from the maintained schema", async () => {
  const session = new NativeSession();
  try {
    const { result } = await session.configure();
    assert.deepEqual(
      result.resources.admission,
      Object.fromEntries(
        Object.entries(schema.$defs.capacityLimits.properties).map(
          ([name, rule]) => [name, String(rule.default)],
        ),
      ),
    );
    assert.deepEqual(
      result.resources.runtime,
      Object.fromEntries(
        Object.entries(schema.$defs.runtimeControls.properties).map(
          ([name, rule]) => [name, String(rule.default)],
        ),
      ),
    );
  } finally {
    await session.close();
  }
});

test("total captured bytes cover successive sources", async () => {
  const session = new NativeSession();
  try {
    await session.configure({ maxTotalSourceBytes: "2" });
    assert.equal((await check(session, "0")).qualityPassed, true);
    await assert.rejects(check(session, "11"), /total-source-byte-capacity/);
  } finally {
    await session.close();
  }
});

test("file count is an execution admission ceiling", async () => {
  const session = new NativeSession();
  try {
    await session.configure({ maxPhysicalAndNativeSources: "1" });
    assert.equal((await check(session, "0")).contractSatisfied, true);
    await assert.rejects(check(session, "1"), /source-count-capacity/);
  } finally {
    await session.close();
  }
});

test("source count quotas retain their overlapping kind populations", async () => {
  for (const [kind, firstCount, secondCount] of [
    ["physical", true, false],
    ["native", true, true],
    ["logical", false, true],
    ["transformed", false, true],
    ["authority", false, false],
  ]) {
    for (const [limit, charged] of [
      ["maxPhysicalAndNativeSources", firstCount],
      ["maxNativeLogicalAndTransformedSources", secondCount],
    ]) {
      const session = new NativeSession();
      try {
        // A transformed stream has an independently captured physical parent.
        const parentCharge =
          kind === "transformed" && limit === "maxPhysicalAndNativeSources";
        await session.configure({ [limit]: parentCharge ? "2" : "1" });
        let parent;
        if (kind === "transformed") {
          parent = await session.capture([Buffer.from("0")], contract);
          for await (const event of session.events()) void event;
        }
        const options = parent
          ? { transformOf: parent.source }
          : {
              sourceKind: kind,
              ...(kind === "authority"
                ? {
                    identity: {
                      sha256: createHash("sha256").update("0").digest("hex"),
                      byteLength: "1",
                    },
                  }
                : {}),
            };
        await session.capture([Buffer.from("0")], contract, options);
        if (kind !== "authority")
          for await (const event of session.events()) void event;
        const next = () =>
          session.capture([Buffer.from("0")], contract, options);
        if (charged)
          await assert.rejects(
            next(),
            /source-count-capacity|logical-count-capacity/,
          );
        else {
          await next();
          if (kind !== "authority")
            for await (const event of session.events()) void event;
        }
      } finally {
        await session.close();
      }
    }
  }
});

test("every captured source kind retains declared and streamed byte ceilings", async () => {
  for (const kind of [
    "physical",
    "native",
    "logical",
    "transformed",
    "authority",
  ]) {
    for (const declared of [false, true]) {
      for (const aggregate of [false, true]) {
        const core = new NativeSession();
        const finish = async () => {
          if (kind !== "authority")
            for await (const event of core.events()) void event;
        };
        try {
          const streamedAuthority = kind === "authority" && !declared;
          await core.configure(
            aggregate
              ? {
                  maxTotalSourceBytes:
                    kind === "transformed" || streamedAuthority ? "2" : "1",
                }
              : { maxSourceBytes: "1" },
          );
          let options = {
            sourceKind: kind,
            ...(kind === "authority"
              ? {
                  identity: {
                    sha256: createHash("sha256").update("0").digest("hex"),
                    byteLength: "1",
                  },
                }
              : {}),
          };
          if (kind === "transformed") {
            const parent = await core.capture([Buffer.from("0")], contract);
            for await (const event of core.events()) void event;
            options = { transformOf: parent.source };
          }
          await core.capture([Buffer.from("0")], contract, options);
          await finish();
          const bytes = Buffer.from(
            aggregate && !streamedAuthority ? "1" : "11",
          );
          if (declared)
            options.identity = {
              sha256: createHash("sha256").update(bytes).digest("hex"),
              byteLength: String(bytes.length),
            };
          let opened = false;
          async function* chunks() {
            opened = true;
            yield bytes;
          }
          await assert.rejects(
            core.capture(chunks(), contract, options),
            aggregate ? /total-source-byte-capacity/u : /source-byte-capacity/u,
          );
          assert.equal(opened, !declared);
        } finally {
          await core.close();
        }
      }
    }
  }
});

test("linked members consume the logical census admission capacity", async () => {
  const session = new NativeSession();
  try {
    await session.configure({ maxNativeLogicalAndTransformedSources: "1" });
    await session.capture([Buffer.from('["0","1"]')], contract);
    const values = [];
    for await (const event of session.events())
      if (event.type === "value" && event.kind === "string")
        values.push(event.id);
    await session.command("begin-linked-source", {
      value: values[0],
      encoding: "utf8",
      contract,
    });
    for await (const event of session.events())
      if (event.type === "terminal") assert.equal(event.qualityPassed, true);
    await assert.rejects(
      session.command("begin-linked-source", {
        value: values[1],
        encoding: "utf8",
        contract,
      }),
      /logical-count-capacity/,
    );
  } finally {
    await session.close();
  }
});

test("JSONL record capacity spans all admitted sources", async () => {
  const session = new NativeSession();
  try {
    await session.configure({ maxRecords: "2" });
    const selected = { ...contract, format: "jsonl" };
    assert.equal((await check(session, "0\n", selected)).recordCount, "1");
    await assert.rejects(check(session, "1\n2\n", selected), /record-capacity/);
  } finally {
    await session.close();
  }
});

test("diagnostic capacity cannot reset when another source begins", async () => {
  const session = new NativeSession();
  try {
    await session.configure({ maxDiagnostics: "1" });
    const first = await check(session, '{"":0}');
    assert.equal(first.rulesComplete, true);
    assert.equal(first.qualityPassed, false);
    assert.equal(first.findingCount, "1");
    await assert.rejects(check(session, '{"":1}'), /diagnostic-capacity/);
  } finally {
    await session.close();
  }
});

test("admission bypass retains finite structural depth and quality checks", async () => {
  const session = new NativeSession();
  try {
    const { result } = await session.configure({
      ...unlimitedAdmission,
      maxNestingDepth: "1",
    });
    assert.ok(
      Object.values(result.resources.admission).every(
        (value) => value === null,
      ),
    );
    const first = await check(session, '{"":0}');
    assert.equal(first.qualityPassed, false);
    await assert.rejects(check(session, "[[0]]"), /nesting-depth-capacity/);
  } finally {
    await session.close();
  }
});

test("invalid working controls fail before scratch creation", async () => {
  for (const resources of [
    { maxCheckTimeMs: "0" },
    { maxConcurrency: "2" },
    { maxManagedMemoryBytes: "0" },
    { segmentSize: "65536" },
  ]) {
    const session = new NativeSession();
    try {
      await assert.rejects(
        session.configure(resources),
        /integer-wire-form|resource-configuration|unknown-resource-control/,
      );
    } finally {
      await session.close();
    }
    await assert.rejects(access(session.scratch), { code: "ENOENT" });
  }
});

test("a restrictive request capacity leaves the cleanup command available", async () => {
  const session = new NativeSession();
  try {
    await session.configure({ maxRequestBytes: "1" });
    await assert.rejects(check(session, "0"), /request-byte-capacity/);
  } finally {
    await session.close();
  }
});

test("a restrictive native output capacity fails explicitly and permits cleanup", async () => {
  const session = new NativeSession();
  try {
    await assert.rejects(
      session.configure({ maxToolOutputBytes: "1" }),
      /native-output-byte-capacity/,
    );
  } finally {
    await session.close();
  }
});

test("request paths count Unicode characters independently of encoded byte length", async () => {
  const session = new NativeSession();
  try {
    await session.configure({ maxRequestPathCodePoints: "2" });
    assert.equal(
      (await check(session, "0", { ...contract, path: "😀x" })).qualityPassed,
      true,
    );
    await assert.rejects(
      check(session, "0", { ...contract, path: "😀xy" }),
      /request-path-capacity/,
    );
  } finally {
    await session.close();
  }
});

test("an explicit unsupported source format cannot silently use document JSON", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    await assert.rejects(
      check(session, "0", { ...contract, format: "json5" }),
      /unsupported-source-format/,
    );
  } finally {
    await session.close();
  }
});
