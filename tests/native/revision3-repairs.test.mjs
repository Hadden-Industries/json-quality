// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import {
  NativeSession,
  nativeTemporaryRoot,
  verifiedComponent,
} from "./client.mjs";
import { formatSource } from "../../src/native-formatting.js";
import { normalizeSource } from "../../src/native-normalization.js";

const compact = { formatContract: "producer-json-compact-body" };
const writerOptions = {
  component: verifiedComponent,
  temporaryDirectory: nativeTemporaryRoot,
};

async function inspect(text, contract = compact) {
  const core = new NativeSession();
  try {
    await core.configure();
    await core.capture([Buffer.from(text)], contract);
    const events = [];
    for await (const event of core.events()) events.push(event);
    return {
      events,
      findings: events.filter((event) => event.type === "finding"),
      risks: events.filter((event) => event.type === "nfc-key-collision-risk"),
      terminal: events.at(-1),
    };
  } finally {
    await core.close();
  }
}

test("the current key diagnostic partition preserves exact empty-key exemptions", async () => {
  for (const [text, selected, expected] of [
    ['{"":0}', {}, ["json-quality/no-empty-keys", "emptyKey"]],
    ['{" \\t":0}', {}, ["json-quality/no-empty-keys", "emptyKey"]],
    [
      '{" a":0}',
      {},
      ["json-quality/no-surrounding-key-whitespace", "whitespace"],
    ],
    [
      '{"a ":0}',
      {},
      ["json-quality/no-surrounding-key-whitespace", "whitespace"],
    ],
    ['{"a b":0}', {}, null],
    ['{"":0}', { allowEmptyKeys: ["/"] }, null],
    [
      '{"":0}',
      { allowEmptyKeys: ["/other"] },
      ["json-quality/no-empty-keys", "emptyKey"],
    ],
    [
      '{" ":0}',
      { allowEmptyKeys: ["/ "] },
      ["json-quality/no-empty-keys", "emptyKey"],
    ],
  ]) {
    const result = await inspect(text, { ...compact, ...selected });
    const findings = result.findings.filter((event) => event.phase === "lint");
    assert.deepEqual(
      findings.map(({ ruleId, messageId }) => [ruleId, messageId]),
      expected ? [expected] : [],
      text,
    );
    if (expected) assert.equal(findings[0].severity, "error");
  }
  const noncharacter = await inspect('"\ufdd0"');
  const finding = noncharacter.findings.find(
    (event) => event.ruleId === "json-quality/no-unicode-noncharacters",
  );
  assert.equal(finding.messageId, "noncharacter");
  assert.equal(finding.arguments.codePoint, "U+FDD0");
});

test("all prior keys contribute to NFC collision detection in either spelling order", async () => {
  for (const text of ['{"é":0,"é":1,"é":2}', '{"é":0,"é":1,"é":2}']) {
    const result = await inspect(text);
    const collisions = result.findings.filter(
      (event) => event.messageId === "collision",
    );
    assert.equal(collisions.length, 2);
    assert.equal(
      result.findings.filter((event) => event.messageId === "duplicateKey")
        .length,
      1,
    );
    for (const collision of collisions) {
      assert.equal(collision.ruleId, "json-quality/nfc-strings");
      assert.equal(collision.arguments.priorLine, "1");
      assert.equal(collision.arguments.normalizedByteLength, "2");
      assert.match(collision.arguments.normalizedSha256, /^[a-f0-9]{64}$/u);
    }
    assert.equal(result.terminal.formatEligible, false);
    assert.equal(result.terminal.normalizeEligible, false);
  }
});

test("preserved NFC-equivalent keys deliver bounded non-blocking collision advisories", async () => {
  const result = await inspect('{"é":0,"é":1}', {
    ...compact,
    normalization: "preserve",
  });
  assert.equal(result.findings.length, 0);
  assert.equal(result.risks.length, 1);
  assert.equal(result.terminal.qualityPassed, true);
  assert.equal(result.terminal.contractSatisfied, true);
  assert.equal(result.terminal.findingCount, "0");
  assert.equal(result.terminal.formatEligible, true);
  assert.equal(result.terminal.normalizeEligible, false);
  const risk = result.risks[0];
  assert.equal(risk.priorColumn, "2");
  assert.equal(risk.column, "8");
  assert.equal(risk.normalizedByteLength, "2");
  assert.equal(Object.hasOwn(risk, "severity"), false);
  assert.equal(Object.hasOwn(risk, "key"), false);

  const separate = await inspect('{"a":{"é":0},"b":{"é":1}}', {
    ...compact,
    normalization: "preserve",
  });
  assert.equal(separate.risks.length, 0);
  const duplicate = await inspect('{"é":0,"é":1}', {
    ...compact,
    normalization: "preserve",
  });
  assert.equal(duplicate.risks.length, 0);
  assert.equal(duplicate.terminal.qualityPassed, false);
  const records = await inspect('{"é":0}\n{"é":1}\n', {
    ...compact,
    format: "jsonl",
    normalization: "preserve",
  });
  assert.equal(records.risks.length, 0);
});

test("native final operation eligibility admits only the precise remaining repair condition", async () => {
  const nfcOnly = await inspect('"é"');
  assert.equal(nfcOnly.terminal.qualityPassed, false);
  assert.equal(nfcOnly.terminal.formatEligible, true);
  assert.equal(nfcOnly.terminal.normalizeEligible, false);
  const presentationOnly = await inspect(' { "x": 1 } ', {
    formatContract: "prettier-json",
  });
  assert.equal(presentationOnly.terminal.formatEligible, false);
  assert.equal(presentationOnly.terminal.normalizeEligible, true);
  for (const text of ['{"":0}', '{"x":9007199254740992}', '{"x":1,"x":2}']) {
    const unsafe = await inspect(text);
    assert.equal(unsafe.terminal.formatEligible, false);
    assert.equal(unsafe.terminal.normalizeEligible, false);
  }
});

test("both repair orders preserve numeric lexemes and converge to complete quality", async () => {
  const source = ' { "e\\u0301": "e\\u0301", "n": 1.00e+2 } ';
  const formatted = await formatSource(source, writerOptions);
  assert.match(formatted, /1\.00e\+2/u);
  assert.ok(
    (
      await inspect(formatted, { formatContract: "prettier-json" })
    ).findings.some((event) => event.messageId === "unnormalized"),
  );
  const formatThenNormalize = await normalizeSource(formatted, writerOptions);
  const normalized = await normalizeSource(source, writerOptions);
  assert.equal(normalized, ' { "é": "é", "n": 1.00e+2 } ');
  const normalizeThenFormat = await formatSource(normalized, writerOptions);
  assert.equal(formatThenNormalize, normalizeThenFormat);
  assert.equal(
    (await inspect(formatThenNormalize, { formatContract: "prettier-json" }))
      .terminal.qualityPassed,
    true,
  );
});

test("rewrite census uses operation eligibility only for selected physical candidates", async () => {
  for (const [operation, candidate] of [
    ["format", '{\n  "text": "é"\n}\n'],
    ["normalize", '{"text":"é"}'],
  ]) {
    for (const unsafePeer of [false, true]) {
      const core = new NativeSession();
      const contract = { formatContract: "prettier-json" };
      const capture = async (text, options = {}) => {
        const source = await core.capture(
          [Buffer.from(text)],
          contract,
          options,
        );
        for await (const event of core.events()) void event;
        return source;
      };
      try {
        await core.configure();
        await core.command("census-provider", {
          id: "tree",
          kind: "physical",
          minimum: "1",
        });
        await core.command("census-add", {
          provider: "tree",
          path: "selected.json",
        });
        const original = await capture('{"text":"é"}');
        await core.command("census-bind", {
          path: "selected.json",
          source: original.source,
        });
        if (unsafePeer) {
          await core.command("census-add", {
            provider: "tree",
            path: "peer.json",
          });
          const peer = await capture('"é"\n');
          await core.command("census-bind", {
            path: "peer.json",
            source: peer.source,
          });
        }
        await core.command("census-close-inventory", { provider: "tree" });
        await core.command("census-close-provider", { provider: "tree" });
        await core.command("rewrite-start", { operation });
        await core.command("rewrite-select", { path: "selected.json" });
        const transformed = await capture(candidate, {
          transformOf: original.source,
        });
        await core.command("rewrite-bind", {
          path: "selected.json",
          source: transformed.source,
        });
        if (unsafePeer)
          await assert.rejects(
            core.command("rewrite-admit"),
            /peer-preflight/u,
          );
        else {
          await core.command("rewrite-admit");
          const { result } = await core.command("rewrite-status");
          assert.equal(result.preflightComplete, true);
          assert.equal(result.qualityPassed, false);
          assert.equal(result.findingCount, "1");
          assert.equal(result.writtenPathCount, "0");
        }
      } finally {
        await core.close();
      }
    }
  }
});
