// SPDX-License-Identifier: AGPL-3.0-only
// Copied byte-for-byte into the transported consumer; imports resolve there.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  writeFileSync,
  readFileSync,
  mkdirSync,
  rmSync,
  rmdirSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import * as api from "@hadden-industries/json-quality";
import plugin from "@hadden-industries/json-quality/eslint";
import configuration from "@hadden-industries/json-quality/configuration-schema" with { type: "json" };
import sourceContract from "@hadden-industries/json-quality/source-contract-schema" with { type: "json" };
import eventContract from "@hadden-industries/json-quality/event-schema" with { type: "json" };
import cohort from "@hadden-industries/json-quality/contract-cohort" with { type: "json" };

const root = process.argv[2],
  policyPath = join(root, ".json-quality.json"),
  original = readFileSync(policyPath),
  policy = JSON.parse(original),
  packageRoot = dirname(
    dirname(
      fileURLToPath(import.meta.resolve("@hadden-industries/json-quality")),
    ),
  ),
  cli = join(packageRoot, "src", "cli.js"),
  pin = (bytes) => ({
    byteLength: String(bytes.length),
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
async function* stream(...items) {
  yield* items;
}
async function repository(options = {}, operation, files) {
  const session = await api.openJsonRepositorySession({ root, ...options }),
    events = [];
  try {
    for await (const event of session.events()) {
      assert.equal(api.validateJsonQualityEvent(event), true);
      events.push(event);
    }
    if (operation)
      for await (const event of session.rewrite(
        operation,
        files === undefined ? {} : { files },
      )) {
        assert.equal(api.validateJsonQualityEvent(event), true);
        events.push(event);
      }
    return events;
  } finally {
    await session.close();
  }
}
try {
  assert.equal(configuration.properties.schemaVersion.const, 2);
  assert.equal(eventContract.properties.schemaVersion.const, 2);
  assert.equal(sourceContract.additionalProperties, false);
  assert.equal(cohort.eventSchemaVersion, 2);
  for (const name of [
    "runJsonQuality",
    "checkJsonDocument",
    "checkJsonLines",
    "inspectJsonInventory",
    "formatJsonDocument",
    "readJsonPolicy",
  ])
    assert.equal(Object.hasOwn(api, name), false, name);
  for (const suffix of [
    "result-schema",
    "document-request-schema",
    "document-response-schema",
    "src/quality.js",
  ])
    await assert.rejects(import("@hadden-industries/json-quality/" + suffix), {
      code: "ERR_PACKAGE_PATH_NOT_EXPORTED",
    });
  assert.equal(
    typeof plugin.rules["no-json-stringify-identity"].create,
    "function",
  );
  assert.equal((await repository()).at(-1).contractSatisfied, true);

  for (const text of [
    '{"a":1,"\\u0061":2}',
    '{"x":9007199254740992}',
    '{"x":"\\ud800"}',
  ]) {
    const session = await api.openJsonSourceSession();
    let terminal;
    try {
      for await (const event of session.check({
        open: () => stream(Buffer.from(text)),
      }))
        terminal = event;
    } finally {
      await session.close();
    }
    assert.equal(terminal.contractSatisfied, false);
  }
  const session = await api.openJsonSourceSession();
  let value;
  try {
    let source;
    for await (const event of session.check({
      open: () => stream(Buffer.from('{\n  "v": 1.00\n}\n')),
    }))
      if (event.type === "source") source = event.source;
    value = await session.select(source, "/v");
    assert.equal(
      (await session.read(value, "number-lexeme")).bytes.toString(),
      "1.00",
    );
    const materialized = await session.materializeControl(
      await session.select(source),
      "1024",
      (object) => object.v === 1,
    );
    assert.deepEqual(materialized.value, { v: 1 });
    await materialized.release();
  } finally {
    await session.close();
  }
  await assert.rejects(session.read(value, "number-lexeme"), /closed-session/u);

  const numeric = '{"x":1.00e+2,"label":"café"}';
  writeFileSync(join(root, "source.json"), numeric);
  assert.equal((await repository()).at(-1).contractSatisfied, false);
  assert.equal(readFileSync(join(root, "source.json"), "utf8"), numeric);
  assert.equal((await repository({}, "format")).at(-1).type, "write-terminal");
  assert.match(readFileSync(join(root, "source.json"), "utf8"), /1\.00e\+2/u);
  writeFileSync(
    join(root, "source.json"),
    '{\n  "x": 1.00e+2,\n  "label": "e\\u0301"\n}\n',
  );
  assert.equal(
    (await repository({}, "normalize", ["source.json"])).at(-1).type,
    "write-terminal",
  );
  assert.match(readFileSync(join(root, "source.json"), "utf8"), /é/u);
  assert.equal((await repository()).at(-1).contractSatisfied, true);
  assert.equal((await repository({}, "format")).at(-1).written, "0");
  const normalized = readFileSync(join(root, "source.json"));
  assert.equal((await repository()).at(-1).contractSatisfied, true);
  assert.deepEqual(readFileSync(join(root, "source.json")), normalized);

  policy.exceptions.push({
    paths: ["protected/**"],
    allowFormatWrites: false,
    owner: "Fixture owner",
    reason: "Protected source preservation.",
  });
  writeFileSync(policyPath, await api.formatJsonValue(policy));
  mkdirSync(join(root, "protected"));
  const protectedBytes = Buffer.from('{"x":1}');
  writeFileSync(join(root, "protected", "data.json"), protectedBytes);
  const protectedEvents = await repository({}, "format");
  assert.equal(protectedEvents.at(-1).type, "write-failure");
  assert.equal(protectedEvents.at(-1).written, "0");
  assert.deepEqual(
    readFileSync(join(root, "protected", "data.json")),
    protectedBytes,
  );
  rmSync(join(root, "protected", "data.json"));
  rmdirSync(join(root, "protected"));
  writeFileSync(policyPath, original);
  const collision = Buffer.from('{"é":1,"e\\u0301":2}');
  writeFileSync(join(root, "source.json"), collision);
  const refused = await repository({}, "normalize", ["source.json"]);
  assert.equal(refused.at(-1).type, "write-failure");
  assert.equal(refused.at(-1).written, "0");
  assert.deepEqual(readFileSync(join(root, "source.json")), collision);
  writeFileSync(join(root, "source.json"), "{}\n");

  const nativePolicy = JSON.parse(original);
  nativePolicy.nativeSources = [
    {
      id: "evidence",
      provider: "owner",
      owner: "Native evidence owner",
      reason: "Transported census proof.",
    },
  ];
  nativePolicy.preserveSourcePresentation = [
    {
      paths: ["native.blob"],
      owner: "Original source owner",
      reason: "Transported original presentation admission.",
    },
  ];
  writeFileSync(policyPath, await api.formatJsonValue(nativePolicy));
  const bytes = Buffer.from(' { "x": 1 }\r\n'),
    identity = { path: "native.blob", ...pin(bytes) };
  writeFileSync(join(root, identity.path), bytes);
  const nativeEvents = await repository({
    nativeProviders: {
      owner: async () => ({
        authorities: stream(identity),
        inventory: stream({
          ...identity,
          source: { ...identity, kind: "content-addressed" },
        }),
        documents: stream({ path: identity.path, chunks: stream(bytes) }),
        close() {},
      }),
    },
  });
  assert.equal(nativeEvents.at(-1).contractSatisfied, true);
  assert.equal(
    nativeEvents.find(
      (event) => event.type === "terminal" && event.path === identity.path,
    ).presentationChecked,
    false,
  );
  await assert.rejects(repository(), /Missing trusted native provider/u);
  writeFileSync(policyPath, original);
  rmSync(join(root, identity.path));

  const { ESLint } = createRequire(import.meta.url)("eslint"),
    eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [
        {
          plugins: { "json-quality": plugin },
          rules: { "json-quality/no-json-stringify-identity": "error" },
        },
      ],
    });
  const [lint] = await eslint.lintText(
    "JSON.stringify(a) === JSON.stringify(b);",
    { filePath: "fixture.js" },
  );
  assert.ok(
    lint.messages.some(
      (message) => message.ruleId === "json-quality/no-json-stringify-identity",
    ),
  );

  const events = execFileSync(
    process.execPath,
    [cli, "check", "--root", root, "--json"],
    { windowsHide: true, encoding: "utf8", timeout: 15000, maxBuffer: 2097152 },
  )
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.equal(events.at(-1).type, "execution-terminal");
  assert.equal(events.at(-1).contractSatisfied, true);
  assert.equal(events.at(-1).members, "2");
  for (const event of events)
    assert.equal(api.validateJsonQualityEvent(event), true);
} finally {
  writeFileSync(policyPath, original);
}
