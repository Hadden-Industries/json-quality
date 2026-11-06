// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { Ajv2020 as Ajv } from "ajv/dist/2020.js";
import configuration from "../schemas/configuration.schema.json" with { type: "json" };
import source from "../schemas/source-contract.schema.json" with { type: "json" };
import effective from "../schemas/effective-policy.schema.json" with { type: "json" };
import event from "../schemas/event.schema.json" with { type: "json" };
import configValidators from "../src/generated/configuration.cjs";
import sourceValidators from "../src/generated/source-contract.cjs";
import eventValidators from "../src/generated/events.cjs";
import { defaultJsonQualityPolicy } from "../src/configuration.js";
import { duplicateNfcPin } from "../scripts/build-validators.js";

const pin = { pointer: "/a~1b", sha256: "a".repeat(64), byteLength: "2" };
const contract = (pins) => ({
  allowSourceRewrites: false,
  owner: "Oracle",
  reason: "Exact preserved bytes",
  nfcExemptStringValues: pins,
});

test("standalone validators preserve acceptance of the exported schemas", () => {
  const oracle = new Ajv({ strict: true, allErrors: true }).addSchema(
    configuration,
    "configuration.schema.json",
  );
  const vectors = [
    [
      configuration,
      configValidators.validateConfiguration,
      [
        {},
        { schemaVersion: 4 },
        { ...defaultJsonQualityPolicy },
        { unknown: true },
        { defaults: { normalization: "preserve" } },
      ],
    ],
    [
      effective,
      configValidators.validatePolicy,
      [
        defaultJsonQualityPolicy,
        {},
        { ...defaultJsonQualityPolicy, schemaVersion: 3 },
      ],
    ],
    [
      source,
      sourceValidators.validateSourceContract,
      [
        {},
        { format: "jsonl" },
        { unknown: true },
        { normalization: "bad" },
        { allowEmptyKeys: ["/", "/"] },
        ...[
          [pin],
          [pin, { ...pin }],
          [
            pin,
            {
              byteLength: pin.byteLength,
              sha256: pin.sha256,
              pointer: pin.pointer,
            },
          ],
          [pin, { ...pin, pointer: "/other" }],
          [pin, { ...pin, sha256: "b".repeat(64) }],
          [
            { ...pin, record: { pointer: "/id", value: "x:0:" } },
            { ...pin, record: { value: "x:0:", pointer: "/id" } },
          ],
          [{ ...pin, record: null }],
          [{ ...pin, unknown: true }],
          [{ ...pin, byteLength: 2 }],
          [
            { ...pin, pointer: "/\u0000:3:a" },
            { ...pin, pointer: "/\u0000:3:b" },
          ],
        ].map(contract),
      ],
    ],
    [
      event,
      eventValidators.validateEvent,
      [
        null,
        {},
        { type: "unknown" },
        {
          type: "selection-terminal",
          selectedSourceCount: "1",
          completedSourceCount: "0",
        },
      ],
    ],
  ];
  for (const [schema, compiled, inputs] of vectors) {
    const expected = oracle.compile(schema);
    for (const input of inputs)
      assert.equal(compiled(input), expected(input), JSON.stringify(input));
  }
});

test("indexed pin uniqueness retains Ajv duplicate positions and tuple boundaries", () => {
  const oracle = new Ajv({ strict: true }).compile({
    ...configuration.$defs.nfcExemptStringValuePins,
    $defs: configuration.$defs,
  });
  for (const pins of [
    [pin, pin, pin],
    [pin, { ...pin, pointer: "/b" }, pin],
    [pin, { ...pin, pointer: "/b" }, { ...pin, pointer: "/b" }, pin],
  ]) {
    assert.equal(oracle(pins), false);
    assert.deepEqual(duplicateNfcPin(pins), [
      oracle.errors[0].params.i,
      oracle.errors[0].params.j,
    ]);
    assert.equal(
      sourceValidators.validateSourceContract(contract(pins)),
      false,
    );
    assert.deepEqual(
      sourceValidators.validateSourceContract.errors.find(
        (e) => e.keyword === "uniqueItems",
      ).params,
      oracle.errors[0].params,
    );
  }
  const many = Array.from({ length: 2000 }, (_, i) => ({
    ...pin,
    pointer: `/${i}`,
  }));
  assert.equal(sourceValidators.validateSourceContract(contract(many)), true);
  assert.equal(
    sourceValidators.validateSourceContract(
      contract([...many, { ...many.at(-1) }]),
    ),
    false,
  );
});
