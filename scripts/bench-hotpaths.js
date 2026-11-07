// SPDX-License-Identifier: AGPL-3.0-only
// Alternating local cohorts. Diagnostics/verdicts are asserted; times are data,
// never a wall-clock test gate. One runner owns each measurement at a time.
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { cpus, release } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { Linter } from "eslint";
import { gitReadEnvironment } from "../src/repository-discovery.js";

const project = dirname(dirname(fileURLToPath(import.meta.url)));
const { values } = parseArgs({
  options: {
    baseline: { type: "string" },
    output: { type: "string" },
    repetitions: { type: "string", default: "5" },
  },
});
const repetitions = Number(values.repetitions);
if (
  !values.baseline ||
  !values.output ||
  !Number.isSafeInteger(repetitions) ||
  repetitions < 1 ||
  repetitions > 20
)
  throw new Error(
    "Supply --baseline DIRECTORY --output FILE and 1..20 repetitions.",
  );
const variants = [
  { name: "baseline", root: resolve(values.baseline) },
  { name: "candidate", root: project },
];
const sourcePaths = (root) =>
  execFileSync(
    "git",
    [
      "-C",
      root,
      "ls-files",
      "-z",
      "--cached",
      "--others",
      "--exclude-standard",
      "--",
      "src",
      "schemas",
      "assets",
      "package.json",
      "package-lock.json",
    ],
    { encoding: "utf8", windowsHide: true, env: gitReadEnvironment() },
  )
    .split("\0")
    .filter(Boolean)
    .sort();
const identity = (root) => {
  const hash = createHash("sha256");
  for (const path of sourcePaths(root)) {
    const bytes = readFileSync(join(root, path));
    hash
      .update(path)
      .update("\0")
      .update(String(bytes.length))
      .update("\0")
      .update(bytes);
  }
  const manifest = JSON.parse(
    readFileSync(
      join(
        root,
        "native/prebuilt",
        process.platform + "-" + process.arch,
        "component.json",
      ),
      "utf8",
    ),
  );
  return {
    sourceSha256: hash.digest("hex"),
    nativeSourceInputsSha256: manifest.sourceInputsSha256,
    artifacts: manifest.artifacts,
  };
};
const identities = new Map(
  variants.map((variant) => [variant.name, identity(variant.root)]),
);
const report = {
  schemaVersion: 1,
  environment: {
    node: process.version,
    v8: process.versions.v8,
    platform: process.platform,
    os: release(),
    cpu: cpus()[0]?.model,
    conditions:
      "sequential alternating cohorts, one warmup each; uncontrolled background load and warm filesystem caches; diagnostic medians only",
  },
  repetitions,
  driverSha256: createHash("sha256")
    .update(readFileSync(fileURLToPath(import.meta.url)))
    .digest("hex"),
  variants: variants.map((v) => ({ name: v.name, ...identities.get(v.name) })),
  samples: [],
};
const save = () =>
  writeFileSync(resolve(values.output), JSON.stringify(report, null, 2) + "\n");
for (const variant of variants) {
  const load = (path) => import(pathToFileURL(join(variant.root, path)));
  variant.rule = (await load("src/eslint/noJsonStringifyIdentity.js")).default;
  variant.sourceContract = (
    await load("src/source-contract.js")
  ).sourceContract;
  variant.open = (await load("src/sessions.js")).openJsonSourceSession;
}
async function cohort(name, measure) {
  let expected;
  for (let repetition = -1; repetition < repetitions; repetition++) {
    for (const variant of repetition % 2 ? [...variants].reverse() : variants) {
      const result = await measure(variant);
      expected ??= result.verdict;
      assert.deepEqual(
        result.verdict,
        expected,
        name + " changed meaning between variants",
      );
      if (repetition >= 0)
        report.samples.push({
          name,
          variant: variant.name,
          repetition,
          ...result,
        });
    }
  }
  save();
  const median = (rows) =>
    rows.sort((a, b) => a - b)[Math.floor(rows.length / 2)];
  console.log(
    JSON.stringify({
      name,
      ...Object.fromEntries(
        variants.map((v) => [
          v.name,
          median(
            report.samples
              .filter((s) => s.name === name && s.variant === v.name)
              .map((s) => s.durationMs),
          ),
        ]),
      ),
    }),
  );
}
try {
  for (const size of [1000, 4000])
    for (const kind of ["no-serializer", "contracts", "destructuring"]) {
      const code =
        kind === "no-serializer"
          ? Array.from(
              { length: size },
              (_, i) => `function f${i}(x){return x.a===x.b;}`,
            ).join("\n")
          : kind === "contracts"
            ? Array.from(
                { length: size },
                (_, i) =>
                  `// json-identity-contract: bytes; owner: benchmark; reason: Exact emitted bytes.\nconst wire${i}=JSON.stringify({value:${i}}); wire${i}==='literal';`,
              ).join("\n")
            : `const bag={${Array.from({ length: size }, (_, i) => `p${i}:${i === size - 1 ? "JSON.stringify({})" : "0"}`).join(",")}};const {${Array.from({ length: size }, (_, i) => `p${i}:a${i}`).join(",")}}=bag;` +
              Array.from({ length: size }, (_, i) => `a${i}==='literal';`).join(
                "\n",
              );
      await cohort(`identity-${kind}-${size}`, (variant) => {
        const linter = new Linter();
        const began = performance.now();
        const { messages } = linter.verifyAndFix(
          code,
          [
            {
              plugins: { jq: { rules: { identity: variant.rule } } },
              rules: { "jq/identity": "error" },
            },
          ],
          { filename: "fixture.js", fix: false, stats: true },
        );
        assert.ok(!messages.some((m) => m.fatal));
        const times = linter.getTimes().passes[0];
        return {
          durationMs: times.rules["jq/identity"].total,
          wallMs: performance.now() - began,
          parseMs: times.parse.total,
          verdict: messages.map((m) => ({
            messageId: m.messageId,
            line: m.line,
            column: m.column,
          })),
        };
      });
    }
  for (const size of [128, 512]) {
    const text = "e\u0301";
    const contract = {
      formatContract: "producer-json-compact-body",
      allowSourceRewrites: false,
      owner: "Benchmark",
      reason: "Exact NFC preservation",
      nfcExemptStringValues: Array.from({ length: size }, (_, i) => ({
        pointer: `/${i}`,
        sha256: createHash("sha256").update(text).digest("hex"),
        byteLength: "3",
      })),
    };
    await cohort(`admission-pins-${size}`, (variant) => {
      const began = performance.now();
      const admitted = variant.sourceContract(contract);
      const durationMs = performance.now() - began;
      assert.deepEqual(admitted, contract);
      return { durationMs, verdict: { pinCount: size } };
    });
    const bytes = Buffer.from(
      JSON.stringify(Array.from({ length: size }, () => text)),
    );
    await cohort(`source-pins-${size}`, async (variant) => {
      const session = await variant.open();
      const began = performance.now();
      let terminal;
      let findings = 0;
      try {
        for await (const event of session.check(
          {
            async *open() {
              yield bytes;
            },
          },
          contract,
          { retainValues: false, includeValueEvents: false },
        )) {
          if (event.type === "terminal") terminal = event;
          if (event.type === "finding") findings++;
        }
        assert.equal(terminal?.contractSatisfied, true);
      } finally {
        await session.close();
      }
      return {
        durationMs: performance.now() - began,
        verdict: {
          contractSatisfied: terminal.contractSatisfied,
          qualityPassed: terminal.qualityPassed,
          findings,
        },
      };
    });
  }
  for (const args of [
    ["--version"],
    ["check-source"],
    ["check-source", "--ndjson"],
  ]) {
    await cohort("cli-" + args.join("-"), (variant) => {
      const began = performance.now();
      const child = spawnSync(
        process.execPath,
        [join(variant.root, "src/cli.js"), ...args],
        {
          encoding: "utf8",
          input: '{\n  "value": 1\n}\n',
          cwd: variant.root,
          windowsHide: true,
          timeout: 30000,
        },
      );
      assert.equal(child.status, 0, child.stderr || child.error?.message);
      if (args.includes("--ndjson")) {
        const terminal = JSON.parse(child.stdout.trim().split("\n").at(-1));
        assert.equal(terminal.type, "terminal");
        assert.equal(terminal.contractSatisfied, true);
      }
      return {
        durationMs: performance.now() - began,
        verdict: { exit: child.status },
      };
    });
  }
  for (const variant of variants)
    assert.deepEqual(
      identity(variant.root),
      identities.get(variant.name),
      "Measured inputs changed",
    );
  report.status = "passed";
} catch (error) {
  report.status = "failed";
  report.error = String(error.stack ?? error);
  throw error;
} finally {
  save();
}
