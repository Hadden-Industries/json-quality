// SPDX-License-Identifier: AGPL-3.0-only
// Deterministic synthetic repositories, raw samples and structural startup gates.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { cpus, freemem, totalmem, tmpdir, release } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual, parseArgs } from "node:util";
import { gitReadEnvironment } from "../src/repository-discovery.js";
import { resolveExecutionResources } from "../src/execution-resources.js";

const project = dirname(dirname(fileURLToPath(import.meta.url))),
  { values } = parseArgs({
    options: {
      workload: { type: "string", default: "format" },
      files: { type: "string", default: "50" },
      changed: { type: "string", default: "0" },
      records: { type: "string", default: "0" },
      repetitions: { type: "string", default: "5" },
      baseline: { type: "string" },
      output: { type: "string" },
      "assert-batching": { type: "boolean", default: false },
    },
  }),
  files = Number(values.files),
  changed = Number(values.changed),
  records = Number(values.records),
  repetitions = Number(values.repetitions),
  maximumDocuments = resolveExecutionResources().admission.maxFiles - 1;
if (
  !["check", "format", "normalize"].includes(values.workload) ||
  ![files, changed, records, repetitions].every(Number.isSafeInteger) ||
  files < 0 ||
  files > maximumDocuments ||
  changed < 0 ||
  changed > files ||
  records < 0 ||
  records > 100000 ||
  repetitions < 1 ||
  repetitions > 100
)
  throw new TypeError(
    `Invalid bounded benchmark workload (0..${maximumDocuments} JSON documents plus one policy).`,
  );
if (values.workload === "normalize" && files === 0)
  throw new TypeError("Normalization benchmark requires a physical file.");
const scratch = await mkdtemp(join(tmpdir(), "json-quality-benchmark-")),
  root = join(scratch, "fixture"),
  document = (index, dirty) =>
    dirty ? `{"value":${index}}` : `{\n  "value": ${index}\n}\n`,
  samples = [],
  identities = [],
  workload = {
    operation: values.workload,
    files,
    changed,
    nonJsonRecords: records,
    repetitions,
    warmups: 1,
  };
let environment;
const reportContext = () => ({
  schemaVersion: 1,
  workload,
  environment,
  identities,
  samples,
});
const git = (...args) =>
  execFileSync("git", ["-C", root, ...args], {
    windowsHide: true,
    timeout: 30000,
    stdio: "pipe",
    env: gitReadEnvironment(),
  });
async function sourceIdentity(source) {
  const paths = execFileSync(
    "git",
    [
      "-C",
      source,
      "ls-files",
      "-z",
      "--cached",
      "--others",
      "--exclude-standard",
      "--",
      "src",
      "schemas",
      "package.json",
      "package-lock.json",
      "assets/native-packages.json",
      "scripts/bench-orchestration.js",
      "scripts/performance-probe.js",
    ],
    { encoding: "utf8", windowsHide: true, env: gitReadEnvironment() },
  )
    .split("\0")
    .filter(Boolean)
    .sort();
  if (!paths.length) throw new Error("Empty benchmark source inventory.");
  const hash = createHash("sha256");
  for (const path of paths) {
    const bytes = await readFile(join(source, path));
    hash
      .update(path)
      .update("\0")
      .update(String(bytes.length))
      .update("\0")
      .update(bytes);
  }
  return {
    sourceSha256: hash.digest("hex"),
    head: execFileSync("git", ["-C", source, "rev-parse", "HEAD"], {
      encoding: "utf8",
      windowsHide: true,
      env: gitReadEnvironment(),
    }).trim(),
  };
}
try {
  environment = {
    node: process.version,
    v8: process.versions.v8,
    platform: process.platform,
    arch: process.arch,
    os: release(),
    cpu: cpus()[0]?.model,
    cores: cpus().length,
    totalMemoryBytes: totalmem(),
    freeMemoryBytes: freemem(),
    git: execFileSync("git", ["--version"], {
      encoding: "utf8",
      windowsHide: true,
      env: gitReadEnvironment(),
    }).trim(),
    loadConditions:
      "uncontrolled local background load; warm native acquisition",
    memoryScope:
      "sampled parent RSS/heap/external plus event native peaks; child RSS is not included",
  };
  await mkdir(root);
  git("init", "--quiet", "--template=");
  git("config", "core.autocrlf", "false");
  // json-identity-contract: bytes; owner: Benchmark fixture; reason: Hash the exact synthetic policy bytes written to disk, not semantic object equality.
  const policy =
    JSON.stringify(
      {
        schemaVersion: 3,
        defaults: {
          formatContract: "prettier-json",
          normalization: "NFC",
          allowFormatWrites: true,
        },
        exceptions: [
          {
            paths: [".git/**"],
            exclude: true,
            owner: "Git",
            reason: "Metadata",
          },
        ],
      },
      null,
      2,
    ) + "\n";
  await writeFile(join(root, ".json-quality.json"), policy);
  const fixtureHash = createHash("sha256").update(policy);
  for (let index = 0; index < files; index++) {
    const path = String(index).padStart(6, "0") + ".json",
      text = document(index, false);
    await writeFile(join(root, path), text);
    fixtureHash.update(path).update("\0").update(text);
  }
  if (records) {
    await mkdir(join(root, "non-json"));
    for (let index = 0; index < records; index++)
      await writeFile(
        join(root, "non-json", String(index) + ".txt"),
        "synthetic\n",
      );
  }
  git("add", ".");
  git(
    "-c",
    "core.hooksPath=",
    "-c",
    "user.name=Benchmark",
    "-c",
    "user.email=benchmark@example.invalid",
    "commit",
    "--no-gpg-sign",
    "--quiet",
    "-m",
    "Synthetic fixture",
  );
  const variants = values.baseline
    ? [
        ["baseline", resolve(values.baseline)],
        ["candidate", project],
      ]
    : [["candidate", project]];
  workload.fixtureSha256 = fixtureHash.digest("hex");
  for (const [variant, source] of variants)
    identities.push({
      variant,
      ...(await sourceIdentity(source)),
    });
  for (let repetition = -1; repetition < repetitions; repetition++) {
    for (const [variant, source] of repetition % 2
      ? [...variants].reverse()
      : variants) {
      for (let index = 0; index < changed; index++)
        await writeFile(
          join(root, String(index).padStart(6, "0") + ".json"),
          document(index, true),
        );
      const before = performance.now(),
        child = spawnSync(
          process.execPath,
          [
            join(project, "scripts/performance-probe.js"),
            source,
            root,
            values.workload,
          ],
          {
            cwd: project,
            windowsHide: true,
            timeout: 180000,
            maxBuffer: 4194304,
            encoding: "utf8",
          },
        );
      if (child.error || child.status !== 0)
        throw new Error(child.error?.message ?? child.stderr);
      const result = JSON.parse(child.stdout),
        identity = identities.find((entry) => entry.variant === variant),
        counts = Object.fromEntries(
          ["git-ignore", "git-census", "prettier-debug", "other"].map(
            (role) => [
              role,
              result.children.filter((entry) => entry.role === role).length,
            ],
          ),
        );
      if (!result.identity?.coreSourceInputsSha256)
        throw new Error("Missing benchmark native identity.");
      if (
        identity.nativeIdentity &&
        !isDeepStrictEqual(identity.nativeIdentity, result.identity)
      )
        throw new Error("Benchmark native identity changed during sampling.");
      identity.nativeIdentity ??= result.identity;
      if (repetition >= 0)
        samples.push({
          variant,
          repetition,
          wallMs: performance.now() - before,
          ...result,
          counts,
        });
      if (
        values["assert-batching"] &&
        variant === "candidate" &&
        values.workload === "format" &&
        changed === 0 &&
        counts["git-ignore"] !== Math.ceil((files + 1) / 256)
      )
        throw new Error(
          `Ignore startup regression: ${counts["git-ignore"]} children for ${files + 1} eligible paths.`,
        );
    }
  }
  const summaries = Object.fromEntries(
    variants.map(([variant]) => {
      const timings = samples
        .filter((sample) => sample.variant === variant)
        .map((sample) => sample.wallMs)
        .sort((a, b) => a - b);
      return [
        variant,
        {
          medianMs: timings[Math.floor(timings.length / 2)],
          p95Ms: timings[Math.ceil(timings.length * 0.95) - 1],
          minMs: timings[0],
          maxMs: timings.at(-1),
        },
      ];
    }),
  );
  const report = {
    ...reportContext(),
    summaries,
    timingGate: "diagnostic-only; no calibrated platform budget accepted",
  };
  for (const [variant, source] of variants)
    if (
      (await sourceIdentity(source)).sourceSha256 !==
      identities.find((entry) => entry.variant === variant).sourceSha256
    )
      throw new Error("Benchmark source changed during sampling.");
  if (values.output)
    await writeFile(
      resolve(values.output),
      JSON.stringify(report, null, 2) + "\n",
    );
  process.stdout.write(
    JSON.stringify({
      workload: report.workload,
      summaries,
      counts: variants.map(([variant]) => ({
        variant,
        firstSample: samples.find((sample) => sample.variant === variant)
          .counts,
      })),
    }) + "\n",
  );
} catch (error) {
  if (values.output)
    await writeFile(
      resolve(values.output),
      JSON.stringify(
        {
          ...reportContext(),
          status: "failed",
          error: String(error.stack ?? error),
        },
        null,
        2,
      ) + "\n",
    );
  throw error;
} finally {
  await rm(scratch, { recursive: true, force: true });
}
