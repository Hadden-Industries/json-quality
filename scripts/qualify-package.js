// SPDX-License-Identifier: AGPL-3.0-only
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  realpathSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, sep, dirname } from "node:path";
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import { packCandidate } from "./pack.js";
import { assertNativeNpmRuntime } from "./consumer-toolchain.js";
import { native, budgets } from "./qualification-process.js";
import { qualifyPublicApi } from "./qualify-api.js";
import { nodeSupport } from "./node-matrix.js";
import { verifyArchive, archiveInventory, sha256 } from "./release-contract.js";
import {
  recipientEvidence,
  isolatedNpmEnvironment,
  installedInventory,
} from "./release-inventory.js";
import {
  nativePlatformSpec,
  resolveNativePackage,
  nativePackages,
} from "../src/native-packages.js";

const { values } = parseArgs({
  options: {
    archive: { type: "string" },
    provenance: { type: "string" },
    npm: { type: "string" },
    "expected-node": { type: "string" },
    "expected-npm": { type: "string" },
    output: { type: "string" },
    registry: { type: "boolean", default: false },
    layout: { type: "string", default: "root" },
    evidence: { type: "string" },
    signatures: { type: "boolean", default: false },
    publication: { type: "string" },
  },
});
if (
  values["expected-node"] &&
  values["expected-node"] !== process.versions.node
)
  throw new Error(
    "Consumer Node differs from the resolved qualification lane.",
  );
if (Boolean(values.archive) !== Boolean(values.provenance))
  throw new Error("Archive and provenance must be supplied together.");
const npm = values.npm ?? process.env.npm_execpath;
if (!npm) throw new Error("Run qualification through npm.");
const toolchain = assertNativeNpmRuntime(npm);
const directory = mkdtempSync(join(tmpdir(), "json-quality-transport-"));
try {
  const { archive, provenance } = values.archive
    ? {
        archive: values.archive,
        provenance: JSON.parse(readFileSync(values.provenance, "utf8")),
      }
    : packCandidate(join(directory, "archives"));
  if (
    createHash("sha256").update(readFileSync(archive)).digest("hex") !==
    provenance.sha256
  )
    throw new Error(
      "Transported archive hash differs from producer provenance.",
    );
  const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
    windowsHide: true,
  }).trim();
  if (provenance.sourceCommit !== sourceCommit && !values.registry)
    throw new Error("Transported archive belongs to another source commit.");
  const npmVersion = execFileSync(process.execPath, [npm, "--version"], {
    cwd: directory,
    encoding: "utf8",
    windowsHide: true,
  }).trim();
  if (values["expected-npm"] && values["expected-npm"] !== npmVersion)
    throw new Error(
      "Consumer npm differs from the frozen qualification policy.",
    );
  if (!["root", "isolated"].includes(values.layout))
    throw new Error("Unknown recipient layout");
  const consumer =
    values.layout === "isolated"
      ? join(directory, "consumer", "tooling", "json")
      : join(directory, "consumer");
  const fixture = join(directory, "fixture");
  const selectedPlatform = nativePlatformSpec(),
    platformArchive = provenance.platformPackages.find(
      (entry) => entry.platform === selectedPlatform.platform,
    );
  if (
    !platformArchive ||
    platformArchive.name !== selectedPlatform.spec.package ||
    platformArchive.version !== provenance.version
  )
    throw new Error("Missing or mismatched frozen platform package");
  const nativeArchive = join(dirname(archive), platformArchive.archive);
  verifyArchive(readFileSync(nativeArchive), {
    size: readFileSync(nativeArchive).length,
    sha256: platformArchive.sha256,
    integrity: platformArchive.integrity,
  });
  const transportedPlatforms = {};
  if (!values.registry) {
    for (const entry of provenance.platformPackages) {
      const spec = nativePackages[entry.platform];
      if (
        !spec ||
        spec.package !== entry.name ||
        entry.version !== provenance.version
      )
        throw new Error("Invalid transported platform identity");
      const path = join(dirname(archive), entry.archive),
        bytes = readFileSync(path);
      verifyArchive(bytes, {
        size: bytes.length,
        sha256: entry.sha256,
        integrity: entry.integrity,
      });
      transportedPlatforms[entry.name] = `file:${path}`;
    }
    if (
      Object.keys(transportedPlatforms).length !==
      Object.keys(nativePackages).length
    )
      throw new Error("Incomplete transported platform family");
  }
  mkdirSync(consumer, { recursive: true });
  mkdirSync(fixture);
  writeFileSync(
    join(consumer, "package.json"),
    JSON.stringify(
      {
        name: "json-quality-release-consumer",
        version: "0.0.0",
        private: true,
        type: "module",
        devDependencies: { eslint: "10.13.0" },
        dependencies: {
          [provenance.name]: values.registry
            ? provenance.version
            : `file:${archive}`,
        },
        ...(!values.registry
          ? {
              overrides: {
                [provenance.name]: transportedPlatforms,
              },
            }
          : {}),
      },
      null,
      2,
    ) + "\n",
  );
  native(
    process.execPath,
    [
      npm,
      "install",
      "--timing",
      "--engine-strict",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--registry=https://registry.npmjs.org/",
    ],
    {
      cwd: consumer,
      windowsHide: true,
      timeout: budgets.install,
      env: isolatedNpmEnvironment(directory),
      phase: `${values.layout}-recipient-install`,
    },
  );
  const coreRoot = join(
    consumer,
    "node_modules",
    ...provenance.name.split("/"),
  );
  const selectedNative = await resolveNativePackage(coreRoot);
  if (selectedNative.metadata.name !== platformArchive.name)
    throw new Error("Installed optional package differs from its platform");
  const installedPlatforms = (await installedInventory(consumer, npm)).filter(
    (entry) =>
      Object.values(nativePackages).some((spec) => spec.package === entry.name),
  );
  if (
    installedPlatforms.length !== 1 ||
    installedPlatforms[0].name !== platformArchive.name
  )
    throw new Error(
      "Recipient installed an unexpected optional platform payload",
    );
  let coreFiles;
  for (const [path, installedRoot] of [
    [archive, coreRoot],
    [nativeArchive, selectedNative.directory],
  ]) {
    const inventory = await archiveInventory(path, npm);
    if (path === archive) coreFiles = inventory.files;
    for (const member of inventory.files) {
      const installed = readFileSync(join(installedRoot, member.path));
      if (sha256(installed) !== member.sha256)
        throw new Error(`Installed payload differs: ${member.path}`);
    }
  }
  if (process.versions.node === nodeSupport.reference)
    await qualifyPublicApi({
      directory,
      archive,
      platforms: transportedPlatforms,
      npm,
      installedRoot: coreRoot,
      files: coreFiles,
    });
  execFileSync("git", ["init", "-q", fixture], { windowsHide: true });
  writeFileSync(
    join(fixture, ".json-quality.json"),
    JSON.stringify(
      {
        schemaVersion: 3,
        defaults: {
          formatContract: "prettier-json",
          allowFormatWrites: true,
          normalization: "NFC",
        },
        exceptions: [
          {
            paths: [".git/**"],
            exclude: true,
            owner: "Git",
            reason: "External Git metadata; tracked JSON remains checked.",
          },
        ],
      },
      null,
      2,
    ) + "\n",
  );
  writeFileSync(join(fixture, "source.json"), "{}\n");
  // One maintained public corpus is copied into the isolated installation.
  const corpus = readFileSync(new URL("./consumer-probe.mjs", import.meta.url));
  writeFileSync(join(consumer, "consumer-probe.mjs"), corpus);
  execFileSync(
    process.execPath,
    [join(consumer, "consumer-probe.mjs"), fixture],
    {
      cwd: consumer,
      windowsHide: true,
      timeout: budgets.suite,
    },
  );
  const lock = JSON.parse(readFileSync(join(consumer, "package-lock.json")));
  if (
    lock.packages["node_modules/@hadden-industries/json-quality"].integrity !==
    provenance.integrity
  )
    throw new Error("Installed archive integrity differs.");
  // Replay the native lock offline before a second real public-export probe.
  native(
    process.execPath,
    [
      npm,
      "ci",
      "--timing",
      "--offline",
      "--engine-strict",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
    ],
    {
      cwd: consumer,
      windowsHide: true,
      timeout: budgets.install,
      env: isolatedNpmEnvironment(directory),
      phase: `${values.layout}-offline-reinstall`,
    },
  );
  execFileSync(
    process.execPath,
    [join(consumer, "consumer-probe.mjs"), fixture],
    {
      cwd: consumer,
      windowsHide: true,
      timeout: budgets.suite,
    },
  );
  if (values.evidence) {
    await recipientEvidence({
      directory: consumer,
      npm,
      output: values.evidence,
      layout: values.layout,
      signatures: values.signatures,
      isolationRoot: directory,
      publication: values.publication
        ? JSON.parse(readFileSync(values.publication))
        : undefined,
      expectedArchive: [
        {
          path: archive,
          name: provenance.name,
          version: provenance.version,
          integrity: provenance.integrity,
        },
        {
          path: nativeArchive,
          name: platformArchive.name,
          version: platformArchive.version,
          integrity: platformArchive.integrity,
        },
      ],
    });
  }
  const report = {
    status: "passed",
    sourceCommit: provenance.sourceCommit,
    controllerCommit: sourceCommit,
    archiveSha256: provenance.sha256,
    node: process.versions.node,
    executable: process.execPath,
    platform: process.platform,
    architecture: process.arch,
    npm: npmVersion,
    nativeToolchain: toolchain,
    packageVersion: provenance.version,
    installSource: values.registry ? "registry" : "producer-archive",
    nativePackage: {
      name: platformArchive.name,
      version: platformArchive.version,
      integrity: platformArchive.integrity,
    },
    qualification: values.registry ? "public registry" : "transported archive",
    layout: values.layout,
    publicExports: 6,
    cliPhysicalFiles: 2,
  };
  if (values.output)
    writeFileSync(values.output, JSON.stringify(report, null, 2) + "\n", {
      flag: "wx",
    });
  process.stdout.write(JSON.stringify(report) + "\n");
  const resolved = realpathSync(directory);
  if (
    !resolved.startsWith(
      realpathSync(tmpdir()) + sep + "json-quality-transport-",
    )
  )
    throw new Error("Unsafe qualification cleanup path.");
  rmSync(resolved, { recursive: true });
} catch (error) {
  process.stderr.write(
    `Qualification failed; retained disposable inputs at ${directory}\n`,
  );
  throw error;
}
