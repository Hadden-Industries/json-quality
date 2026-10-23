// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { temporaryRepository } from "./temporary-repository.js";
import * as api from "../src/index.js";
import { repositoryEvents } from "./repository-fixture.js";
import { validateJsonQualityEvent } from "../src/events.js";

const cli = fileURLToPath(new URL("../src/cli.js", import.meta.url)),
  contextProbe = fileURLToPath(
    new URL("./cli-context-probe.mjs", import.meta.url),
  );
function fixture(t) {
  const root = temporaryRepository(t, "json-flexibility-");
  writeFileSync(
    join(root, ".json-quality.json"),
    JSON.stringify(
      {
        schemaVersion: 2,
        defaults: {
          formatContract: "prettier-json",
          allowFormatWrites: true,
          normalization: "NFC",
        },
        exceptions: [
          {
            paths: [".git/**", "**/node_modules/**"],
            exclude: true,
            owner: "Git and npm",
            reason: "External state; tracked JSON remains included.",
          },
        ],
      },
      null,
      2,
    ) + "\n",
  );
  return root;
}
function run(args, { root, input = "", context } = {}) {
  return spawnSync(
    process.execPath,
    context === undefined
      ? [cli, ...args]
      : [contextProbe, JSON.stringify(args), JSON.stringify(context)],
    {
      cwd: root,
      input,
      encoding: "utf8",
      windowsHide: true,
      timeout: 15000,
      maxBuffer: 2097152,
    },
  );
}
function delivered(result) {
  assert.ifError(result.error);
  return result.stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const event = JSON.parse(line);
      assert.equal(validateJsonQualityEvent(event), true, line);
      return event;
    });
}
test("public cohort rejects retired aggregate interfaces and document envelopes", async () => {
  for (const name of [
    "runJsonQuality",
    "checkJsonDocument",
    "checkJsonLines",
    "inspectJsonInventory",
    "formatJsonDocument",
    "validateJsonQualityResult",
    "readJsonPolicy",
    "decodeJsonBytes",
  ])
    assert.equal(Object.hasOwn(api, name), false, name);
  for (const suffix of [
    "result-schema",
    "document-request-schema",
    "document-response-schema",
  ])
    await assert.rejects(import("@hadden-industries/json-quality/" + suffix), {
      code: "ERR_PACKAGE_PATH_NOT_EXPORTED",
    });
});
test("event admission is closed and requires complete terminal evidence", () => {
  const terminal = {
    schemaVersion: 2,
    requestId: "fixture",
    type: "execution-terminal",
    inventoryComplete: true,
    linkedExpectationsComplete: true,
    sourceObservationsComplete: true,
    diagnosticsComplete: true,
    domainComplete: false,
    members: "2",
    qualityPassed: true,
    contractSatisfied: true,
  };
  assert.equal(validateJsonQualityEvent(terminal), true);
  assert.equal(validateJsonQualityEvent({ ...terminal, documents: [] }), false);
  assert.equal(
    validateJsonQualityEvent({ ...terminal, schemaVersion: 1 }),
    false,
  );
  for (const name of [
    "inventoryComplete",
    "diagnosticsComplete",
    "contractSatisfied",
  ]) {
    const missing = { ...terminal };
    delete missing[name];
    assert.equal(validateJsonQualityEvent(missing), false);
  }
});
test("read-only repository checks retain complete scope and cannot select literal subsets", (t) => {
  const root = fixture(t),
    result = run(["check", "--root", root, "--json", "source.json"]);
  assert.equal(result.status, 2);
  assert.match(
    delivered(result).at(-1).message,
    /Read-only scope is complete/u,
  );
});
test("selected formatting retains invalid-peer preflight and changes only selected sources", async (t) => {
  const root = fixture(t);
  writeFileSync(join(root, "selected.json"), '{"n":1.00}');
  writeFileSync(join(root, "peer.json"), '{"bad":');
  let events = await repositoryEvents({ root }, "format", ["selected.json"]);
  assert.equal(events.at(-1).type, "write-failure");
  assert.equal(events.at(-1).written, "0");
  assert.equal(readFileSync(join(root, "selected.json"), "utf8"), '{"n":1.00}');
  writeFileSync(join(root, "peer.json"), "{}\n");
  events = await repositoryEvents({ root }, "format", ["selected.json"]);
  assert.equal(events.at(-1).type, "write-terminal");
  assert.equal(events.at(-1).written, "1");
  assert.match(readFileSync(join(root, "selected.json"), "utf8"), /1\.00/u);
  assert.equal(readFileSync(join(root, "peer.json"), "utf8"), "{}\n");
});
test("literal write selection rejects duplicate/escaping paths and undiscovered sources", async (t) => {
  const root = fixture(t);
  writeFileSync(join(root, "source.json"), "{}\n");
  for (const files of [["source.json", "source.json"], ["../outside.json"]])
    await assert.rejects(
      repositoryEvents({ root }, "format", files),
      /Duplicate|relative/u,
    );
  const events = await repositoryEvents({ root }, "format", ["absent.json"]);
  assert.equal(events.at(-1).type, "write-failure");
  assert.equal(events.at(-1).written, "0");
});
test("pure source formatting preserves exact number tokens and never acquires checkout writes", async (t) => {
  const root = fixture(t),
    before = readFileSync(join(root, ".json-quality.json"));
  const text = await api.formatJsonSource('{"n":1.00e+2}');
  assert.equal(text, '{\n  "n": 1.00e+2\n}\n');
  assert.deepEqual(readFileSync(join(root, ".json-quality.json")), before);
  for (const invalid of [
    '{"x":9007199254740992}',
    '{"a":1,"a":2}',
    '{"x":"e\\u0301"}',
  ])
    await assert.rejects(api.formatJsonSource(invalid), /invalid or unsafe/u);
});
test("JSONL producer framing never grants generic format write permission", async (t) => {
  const root = fixture(t);
  writeFileSync(join(root, "records.jsonl"), "{}\n");
  const events = await repositoryEvents({ root }, "format", ["records.jsonl"]);
  assert.equal(events.at(-1).type, "write-failure");
  assert.match(events.at(-1).message, /Protected/u);
});
test("request correlation counts Unicode scalars and supports explicit capacity overrides", async () => {
  const requestId = "😀".repeat(1025);
  for (const [capacityLimits, accepted] of [
    [undefined, false],
    [{ maxRequestIdCharacters: 1025 }, true],
    [false, true],
  ]) {
    const session = await api.openJsonSourceSession({ capacityLimits });
    try {
      const consume = async () => {
        let terminal;
        for await (const event of session.check(
          {
            async *open() {
              yield Buffer.from("{}\n");
            },
          },
          {},
          { requestId },
        ))
          terminal = event;
        assert.equal(terminal.contractSatisfied, true);
        assert.equal(terminal.requestId, requestId);
      };
      if (accepted) await consume();
      else await assert.rejects(consume(), /request-id-capacity/u);
    } finally {
      await session.close();
    }
  }
});
test("CLI refuses retired verbs, flags and whole-document request envelopes", () => {
  for (const args of [
    ["inventory"],
    ["lint"],
    ["check", "--scope", "protected"],
    ["format", "--check"],
    ["source", "--request", "-"],
    ["source", "--contract", '{"contentBase64":"e30="}'],
    ["normalize"],
  ]) {
    const result = run([...args, "--json"]);
    assert.equal(result.status, 2);
    assert.equal(delivered(result).at(-1).type, "failure");
  }
});
test("CLI argument admission and help run before trusted context loading", () => {
  for (const args of [["--help"], ["check", "--help"]]) {
    const result = run(args, { context: {} });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /check\|source\|format\|normalize/u);
    assert.doesNotMatch(result.stderr, /CONTEXT_LOADED/u);
  }
  const invalid = run(["inventory", "--json"], { context: {} });
  assert.equal(invalid.status, 2);
  assert.doesNotMatch(invalid.stderr, /CONTEXT_LOADED/u);
});
test("trusted CLI adapters retain fixed roots and required-output obligations", (t) => {
  const root = fixture(t),
    other = fixture(t);
  const changedRoot = run(["check", "--root", other, "--json"], {
    context: { root },
  });
  assert.equal(changedRoot.status, 2);
  assert.match(delivered(changedRoot).at(-1).message, /fixes the root/u);
  const missing = run(["check", "--json"], {
    context: { root, requiredOutputs: ["generated/*.json"] },
  });
  assert.equal(missing.status, 2);
  assert.match(
    delivered(missing).at(-1).message,
    /Missing required generated JSON/u,
  );
});
test("raw source checks cannot replace a trusted repository adapter's obligations", (t) => {
  const root = fixture(t);
  const result = run(["source", "--json"], {
    input: "{}\n",
    context: { root },
  });
  assert.equal(result.status, 2);
  assert.match(
    delivered(result).at(-1).message,
    /cannot replace trusted repository obligations/u,
  );
});
test("unknown trusted context fields and insufficient output budgets remain incomplete", (t) => {
  const root = fixture(t),
    unknown = run(["check", "--json"], {
      context: { root, logicalInventory: [] },
    });
  assert.equal(unknown.status, 2);
  assert.match(
    delivered(unknown).at(-1).message,
    /Invalid trusted repository CLI context/u,
  );
  const bounded = run([
    "check",
    "--root",
    root,
    "--json",
    "--max-tool-output-bytes",
    "1",
  ]);
  assert.equal(bounded.status, 2);
  assert.equal(
    delivered(bounded).some((event) => event.type === "execution-terminal"),
    false,
  );
});
