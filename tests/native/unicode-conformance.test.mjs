// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { NativeSession, verifiedComponent } from "./client.mjs";

const fixture = await readFile(
  new URL("../fixtures/unicode/NormalizationTest-18.0.0.txt", import.meta.url),
);
const fixtureSha256 =
  "e529ad96f386caf80aad8f67b7d246ce3b583866ebd8b719a095bcf0e573a0d0";
const rows = [];
const parts = new Set();
for (const [index, line] of fixture
  .toString("utf8")
  .split(/\r?\n/u)
  .entries()) {
  const content = line.split("#", 1)[0].trim();
  if (!content) continue;
  if (content.startsWith("@")) {
    parts.add(content);
    continue;
  }
  const fields = content.split(";");
  assert.equal(
    fields.length,
    6,
    `Malformed official vector on line ${index + 1}`,
  );
  assert.equal(fields[5], "");
  const columns = fields.slice(0, 5).map((field) =>
    String.fromCodePoint(
      ...field
        .trim()
        .split(/\s+/u)
        .map((point) => {
          assert.match(point, /^[0-9A-F]{4,6}$/u);
          const scalar = Number.parseInt(point, 16);
          assert.ok(
            scalar <= 0x10ffff && !(scalar >= 0xd800 && scalar <= 0xdfff),
          );
          return scalar;
        }),
    ),
  );
  rows.push({ line: index + 1, columns });
}

function* chunks(bytes, maximum = 65536) {
  for (let offset = 0; offset < bytes.length; offset += maximum)
    yield bytes.subarray(offset, offset + maximum);
}

async function captureStrings(core, text, maximum = 65536) {
  await core.capture(chunks(Buffer.from(text), maximum), {
    normalization: "NFC",
    checkPresentation: false,
  });
  const values = [];
  let terminal;
  for await (const event of core.events()) {
    if (
      event.type === "value" &&
      (event.kind === "key" || event.kind === "string")
    )
      values.push(event);
    if (event.type === "terminal") terminal = event;
  }
  // Some conformance inputs deliberately need normalization. Their quality
  // findings do not invalidate the completed scalar parser or NFC derivation.
  assert.equal(terminal?.parserComplete, true);
  assert.equal(terminal.rulesComplete, true);
  assert.equal(terminal.diagnosticsComplete, true);
  return values;
}

async function nfcBytes(core, value) {
  assert.equal(value.nfcAvailable, true);
  const length = BigInt(value.nfcByteLength),
    parts = [];
  for (let offset = 0n; offset < length; offset += 65536n) {
    const { data } = await core.read(value.id, "nfc-utf8", String(offset));
    assert.ok(data.length > 0);
    parts.push(data);
  }
  const bytes = Buffer.concat(parts);
  assert.equal(BigInt(bytes.length), length);
  return bytes;
}

function assertIdentity(core) {
  assert.equal(core.hello.icu, "79.1");
  assert.equal(core.hello.unicode, "18.0");
  assert.equal(
    core.hello.sourceInputsSha256,
    verifiedComponent.manifest.sourceInputsSha256,
  );
  assert.equal(
    verifiedComponent.manifest.components.icuVersion,
    core.hello.icu,
  );
  assert.equal(
    verifiedComponent.manifest.components.unicodeVersion,
    core.hello.unicode,
  );
}

test("official Unicode 18.0.0 NFC equations use the packaged ICU 79.1 normalizer for every listed row", async (t) => {
  const began = performance.now();
  assert.equal(fixture.length, 1089359);
  assert.equal(
    createHash("sha256").update(fixture).digest("hex"),
    fixtureSha256,
  );
  assert.equal(
    fixture.subarray(0, fixture.indexOf(10) + 1).toString("utf8"),
    "# NormalizationTest-18.0.0.txt\r\n",
  );
  assert.equal(rows.length, 20171);
  assert.equal(parts.size, 6);
  const batchSize = 512;
  let equations = 0,
    batches = 0;
  for (let begin = 0; begin < rows.length; begin += batchSize) {
    const batch = rows.slice(begin, begin + batchSize),
      inputs = batch.flatMap(({ columns }) => columns),
      core = new NativeSession();
    try {
      assertIdentity(core);
      await core.configure();
      const values = await captureStrings(core, JSON.stringify(inputs));
      assert.equal(values.length, inputs.length);
      for (let index = 0; index < values.length; index++) {
        const row = batch[Math.floor(index / 5)],
          column = index % 5,
          expected = row.columns[column < 3 ? 1 : 3];
        assert.deepEqual(
          await nfcBytes(core, values[index]),
          Buffer.from(expected),
          `NormalizationTest line ${row.line}, c${column + 1}: NFC must equal c${column < 3 ? 2 : 4}`,
        );
        equations++;
      }
      batches++;
    } finally {
      await core.close();
    }
  }
  assert.equal(equations, rows.length * 5);
  t.diagnostic(
    `${rows.length} official rows; ${equations} NFC equations including c2/c4 idempotence; ${batches} native sessions; ICU 79.1 / Unicode 18.0; ${Math.round(performance.now() - began)} ms`,
  );
});

test("official NFC samples retain root, key and value behavior across escaped scalars and 64 KiB boundaries", async (t) => {
  const composed = rows.find(({ columns }) => columns[0] === "D\u0307\u0323");
  const supplementary = rows.find(({ columns }) =>
    [...columns[0]].some((point) => point.codePointAt(0) > 0xffff),
  );
  assert.ok(composed && supplementary);
  const prefix = "a".repeat(65535),
    samples = [
      composed.columns.slice(0, 2),
      supplementary.columns.slice(0, 2),
      [prefix + composed.columns[0], prefix + composed.columns[1]],
    ],
    core = new NativeSession();
  let comparisons = 0;
  try {
    assertIdentity(core);
    await core.configure();
    for (const [input, expected] of samples) {
      for (const escaped of [false, true]) {
        // JSON escape spelling changes only the parser input, never the oracle.
        const quoted = JSON.stringify(input).replace(
          /[\u0080-\u{10ffff}]/gu,
          (unit) =>
            escaped
              ? Array.from(
                  { length: unit.length },
                  (_, index) =>
                    "\\u" +
                    unit.charCodeAt(index).toString(16).padStart(4, "0"),
                ).join("")
              : unit,
        );
        for (const [text, kind] of [
          [quoted, "string"],
          [`{${quoted}:0}`, "key"],
          [`{"payload":${quoted}}`, "string"],
        ]) {
          const values = await captureStrings(core, text, escaped ? 7 : 1);
          const selected = values.filter((value) => value.kind === kind);
          assert.equal(selected.length, 1);
          assert.deepEqual(
            await nfcBytes(core, selected[0]),
            Buffer.from(expected),
          );
          comparisons++;
        }
      }
    }
  } finally {
    await core.close();
  }
  t.diagnostic(
    `${comparisons} root/key/value comparisons; literal UTF-8 and JSON escapes; fragmented uploads and decoded streams crossing 65536 bytes`,
  );
});
