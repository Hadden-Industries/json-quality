// SPDX-License-Identifier: AGPL-3.0-only
import { budgets } from "../scripts/qualification-process.js";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
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
        schemaVersion: 4,
        defaults: {
          formatContract: "prettier-json",
          allowSourceRewrites: true,
          normalization: "NFC",
        },
        exceptions: [
          {
            paths: [".git/**", "**/node_modules/**"],
            excludeUntrackedSources: true,
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
      timeout: budgets.read,
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
    schemaVersion: 5,
    requestId: "fixture",
    type: "execution-terminal",
    inventoryComplete: true,
    linkedExpectationsComplete: true,
    sourceObservationsComplete: true,
    diagnosticsComplete: true,
    domainComplete: false,
    inventoryMemberCount: "2",
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
    "linkedExpectationsComplete",
    "sourceObservationsComplete",
    "diagnosticsComplete",
  ]) {
    const missing = { ...terminal };
    delete missing[name];
    assert.equal(validateJsonQualityEvent(missing), false);
    assert.equal(
      validateJsonQualityEvent({ ...terminal, [name]: false }),
      false,
    );
  }
  const missingVerdict = { ...terminal };
  delete missingVerdict.contractSatisfied;
  assert.equal(validateJsonQualityEvent(missingVerdict), false);
  assert.equal(
    validateJsonQualityEvent({
      ...terminal,
      contractSatisfied: false,
      qualityPassed: false,
    }),
    true,
  );
  assert.equal(
    validateJsonQualityEvent({ ...terminal, qualityPassed: false }),
    true,
  );
});
test("an explicit empty format selection never expands to the whole repository", (t) => {
  const root = fixture(t),
    path = join(root, "selected.json"),
    original = '{"a":1}';
  writeFileSync(path, original);
  for (const mode of ["--write", "--dry-run"]) {
    const result = run(["format", mode, "--ndjson", "--"], { root });
    assert.equal(result.status, 2);
    const events = delivered(result);
    assert.deepEqual(
      events.map((event) => event.type),
      ["failure"],
    );
    assert.match(events[0].message, /empty format selection/i);
    assert.equal(readFileSync(path, "utf8"), original);
  }
  assert.equal(run(["format", "--write"], { root }).status, 0);
  assert.notEqual(readFileSync(path, "utf8"), original);
});

test("malformed selected JSON refuses checks, previews and writes with exit 1", (t) => {
  const root = fixture(t),
    path = join(root, "broken.json"),
    original = '{"invalid":';
  writeFileSync(path, original);
  for (const args of [
    ["check-files"],
    ["format", "--dry-run"],
    ["normalize", "--dry-run"],
    ["format", "--write"],
    ["normalize", "--write"],
  ]) {
    const result = run([...args, "--ndjson", "--", "broken.json"], { root });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    const events = delivered(result),
      terminal = events.at(-1);
    if (args.includes("--write")) {
      assert.equal(terminal.type, "write-failure");
      assert.equal(terminal.message, "rewrite-unsafe-source");
      assert.equal(Object.hasOwn(terminal, "code"), false);
      for (const change of [
        { writtenPathCount: "1" },
        { uncertainPath: "broken.json" },
        { preflightComplete: true },
      ])
        assert.equal(
          validateJsonQualityEvent({ ...terminal, ...change }),
          false,
        );
    } else if (args.includes("--dry-run")) {
      assert.equal(
        terminal.type,
        args[0] === "format"
          ? "format-preview-terminal"
          : "normalization-preview-terminal",
      );
      assert.equal(terminal.preflightComplete, false);
    } else assert.equal(terminal.contractSatisfied, false);
    assert.equal(readFileSync(path, "utf8"), original);
  }
});
test("read-only repository checks retain complete scope and cannot select literal subsets", (t) => {
  const root = fixture(t),
    result = run(["check", "--root", root, "--ndjson", "source.json"]);
  assert.equal(result.status, 2);
  assert.match(
    delivered(result).at(-1).message,
    /check evaluates the complete repository.*check-files/u,
  );
});

test("the public repository CLI checks authored JSON with verified configuration absence", (t) => {
  const root = temporaryRepository(t, "json-zero-config-cli-");
  writeFileSync(join(root, "authored.json"), "{}\n");
  const result = run(["check", "--root", root, "--ndjson"]);
  assert.equal(result.status, 0, result.stderr);
  const events = delivered(result);
  assert.deepEqual(events[0].configurationOrigin, {
    kind: "repository-absence",
    path: ".json-quality.json",
  });
  assert.equal(events.at(-1).contractSatisfied, true);
  assert.equal(events.at(-1).inventoryMemberCount, "1");
});

test("normalization preview binds decoded changes and no-change results to Unicode identity", (t) => {
  const root = temporaryRepository(t, "json-preview-identity-"),
    path = join(root, "source.json"),
    original = '{"e\\u0301":"e\\u0301"}\n',
    sha256 = (value) => createHash("sha256").update(value).digest("hex");
  for (const [text, count] of [
    [original, 2],
    ['{"é":"é"}\n', 0],
  ]) {
    writeFileSync(path, text);
    const result = run([
      "normalize",
      "--dry-run",
      "--root",
      root,
      "--ndjson",
      "source.json",
    ]);
    assert.equal(result.status, 0, result.stderr + result.stdout);
    const events = delivered(result),
      changes = events.filter(
        (event) => event.type === "normalization-preview-change",
      ),
      terminal = events.at(-1);
    assert.equal(changes.length, count);
    assert.equal(terminal.type, "normalization-preview-terminal");
    assert.match(terminal.coreSourceInputsSha256, /^[a-f0-9]{64}$/u);
    assert.equal(terminal.icuVersion, "79.1");
    assert.equal(terminal.unicodeVersion, "18.0");
    assert.equal(terminal.selectedPathCount, "1");
    assert.equal(terminal.changedPathCount, count ? "1" : "0");
    for (const change of changes) {
      assert.equal(change.decodedByteLength, "3");
      assert.equal(change.decodedSha256, sha256("é"));
      assert.equal(change.normalizedByteLength, "2");
      assert.equal(change.normalizedSha256, sha256("é"));
      assert.equal(change.sourceSha256, sha256(text));
      assert.equal(
        change.coreSourceInputsSha256,
        terminal.coreSourceInputsSha256,
      );
    }
    assert.equal(readFileSync(path, "utf8"), text);
    assert.equal(
      events.some((event) =>
        ["written", "write-terminal"].includes(event.type),
      ),
      false,
    );
  }
});

test("normalization preview reports complete collision refusal without a write terminal", (t) => {
  const root = fixture(t),
    path = join(root, "collision.json"),
    original = '{"é":1,"é":2}\n';
  writeFileSync(path, original);
  const result = run([
    "normalize",
    "--dry-run",
    "--root",
    root,
    "--ndjson",
    "collision.json",
  ]);
  assert.equal(result.status, 1, result.stderr + result.stdout);
  const events = delivered(result),
    terminal = events.at(-1);
  assert.equal(terminal.type, "normalization-preview-terminal");
  assert.equal(terminal.complete, true);
  assert.equal(terminal.preflightComplete, false);
  assert.equal(
    events.some(
      (event) => event.type === "written" || event.type === "write-terminal",
    ),
    false,
  );
  assert.equal(readFileSync(path, "utf8"), original);
});

test("normalization preview keeps preserved policy and invalid selections as errors", (t) => {
  const root = fixture(t),
    path = join(root, "preserved.json"),
    original = '"é"\n';
  writeFileSync(path, original);
  writeFileSync(
    join(root, ".json-quality.json"),
    '{\n  "defaults": {\n    "normalization": "preserve"\n  }\n}\n',
  );
  for (const selected of ["preserved.json", "absent.json"]) {
    const result = run([
      "normalize",
      "--dry-run",
      "--root",
      root,
      "--ndjson",
      selected,
    ]);
    assert.equal(result.status, 2, result.stderr);
    const events = delivered(result);
    assert.equal(events.at(-1).type, "write-failure");
    assert.equal(
      events.some(
        (event) => event.type === "written" || event.type === "write-terminal",
      ),
      false,
    );
    assert.equal(readFileSync(path, "utf8"), original);
  }
});
test("selected formatting retains invalid-peer preflight and changes only selected sources", async (t) => {
  const root = fixture(t);
  writeFileSync(join(root, "selected.json"), '{"n":1.00}');
  writeFileSync(join(root, "peer.json"), '{"bad":');
  let events = await repositoryEvents({ root }, "format", ["selected.json"]);
  assert.equal(events.at(-1).type, "write-failure");
  assert.equal(events.at(-1).writtenPathCount, "0");
  assert.equal(readFileSync(join(root, "selected.json"), "utf8"), '{"n":1.00}');
  writeFileSync(join(root, "peer.json"), "{}\n");
  events = await repositoryEvents({ root }, "format", ["selected.json"]);
  assert.equal(events.at(-1).type, "write-terminal");
  assert.equal(events.at(-1).writtenPathCount, "1");
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
  assert.equal(events.at(-1).writtenPathCount, "0");
});
test("pure source formatting preserves exact number tokens and never acquires checkout writes", async (t) => {
  const root = fixture(t),
    before = readFileSync(join(root, ".json-quality.json"));
  const text = await api.formatJsonSource('{"n":1.00e+2}');
  assert.equal(text, '{\n  "n": 1.00e+2\n}\n');
  assert.deepEqual(readFileSync(join(root, ".json-quality.json")), before);
  for (const invalid of ['{"x":9007199254740992}', '{"a":1,"a":2}'])
    await assert.rejects(api.formatJsonSource(invalid), /invalid or unsafe/u);
  assert.equal(
    JSON.parse(await api.formatJsonSource('{"x":"e\\u0301"}')).x,
    "é",
  );
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
    [{ maxRequestIdCodePoints: 1025 }, true],
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
    ["source"],
    ["check", "--scope", "protected"],
    ["format", "--check"],
    ["check-source", "--request", "-"],
    ["check-source", "--contract", '{"contentBase64":"e30="}'],
    ["normalize"],
  ]) {
    const result = run([...args, "--ndjson"]);
    assert.equal(result.status, 2);
    assert.equal(delivered(result).at(-1).type, "failure");
  }
});

test("the retired --json flag fails before command effects", () => {
  const result = run(["check", "--json"]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unknown option|--json/u);
});
test("CLI argument admission and help run before trusted context loading", () => {
  for (const args of [["--help"], ["check", "--help"]]) {
    const result = run(args, { context: {} });
    assert.equal(result.status, 0);
    if (args[0] === "--help")
      assert.match(
        result.stdout,
        /check\|check-files\|check-source\|format\|normalize/u,
      );
    else {
      assert.match(
        result.stdout,
        /^Usage: json-quality check \[--root PATH\]/u,
      );
      assert.match(
        result.stdout,
        /Use check-files -- A.json for selected inputs/u,
      );
    }
    assert.doesNotMatch(result.stderr, /CONTEXT_LOADED/u);
  }
  const invalid = run(["inventory", "--ndjson"], { context: {} });
  assert.equal(invalid.status, 2);
  assert.doesNotMatch(invalid.stderr, /CONTEXT_LOADED/u);
});
test("trusted CLI adapters retain fixed roots and required-output obligations", (t) => {
  const root = fixture(t),
    other = fixture(t);
  const changedRoot = run(["check", "--root", other, "--ndjson"], {
    context: { root },
  });
  assert.equal(changedRoot.status, 2);
  assert.match(delivered(changedRoot).at(-1).message, /fixes the root/u);
  const missing = run(["check", "--ndjson"], {
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
  const result = run(["check-source", "--ndjson"], {
    input: "{}\n",
    context: { root },
  });
  assert.equal(result.status, 2);
  assert.match(
    delivered(result).at(-1).message,
    /cannot replace a trusted repository adapter's obligations/u,
  );
});
test("unknown trusted context fields and insufficient output budgets remain incomplete", (t) => {
  const root = fixture(t),
    unknown = run(["check", "--ndjson"], {
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
    "--ndjson",
    "--max-tool-output-bytes",
    "1",
  ]);
  assert.equal(bounded.status, 2);
  assert.equal(
    delivered(bounded).some((event) => event.type === "execution-terminal"),
    false,
  );
});
