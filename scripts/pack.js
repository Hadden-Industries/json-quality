// SPDX-License-Identifier: AGPL-3.0-only
import { budgets } from "./qualification-budgets.js";
import { execFileSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  copyFileSync,
  unlinkSync,
  constants,
  mkdirSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isPathContained } from "../src/paths.js";
import { assertNativeExecutableModes } from "./release-contract.js";
import { stageCore } from "./package-stage.js";
import { nativePackages } from "../src/native-packages.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const git = (args) =>
  execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    windowsHide: true,
  }).trim();

/** Admit the keyed report of the producer's qualified npm 12 toolchain. */
export function readPackReport(text) {
  const report = JSON.parse(text);
  if (!report || typeof report !== "object" || Array.isArray(report))
    throw new Error("Expected exactly one native npm pack result.");
  const entries = Object.values(report);
  if (
    entries.length !== 1 ||
    !entries[0] ||
    typeof entries[0].name !== "string" ||
    Object.keys(report)[0] !== entries[0].name ||
    !Array.isArray(entries[0].files)
  )
    throw new Error("Expected exactly one native npm pack result.");
  return entries[0];
}

/** Native producer packing: omitted destination inspects membership without writing. */
export function runNpmPack(root, { npm, destination }) {
  return readPackReport(
    execFileSync(
      process.execPath,
      [
        npm,
        "pack",
        "--ignore-scripts",
        "--json",
        ...(destination === undefined
          ? ["--dry-run"]
          : ["--pack-destination", destination]),
      ],
      {
        cwd: root,
        encoding: "utf8",
        windowsHide: true,
        timeout: budgets.pack,
        maxBuffer: 8 * 1024 * 1024,
      },
    ),
  );
}

/** Pack clean source into an explicit external destination with immutable identity.
 * Registry publication and source delivery are separate authorized operations.
 */
export function packCandidate(destination) {
  destination = resolve(destination);
  if (isPathContained(root, destination))
    throw new Error("Pack destination must be outside the producer checkout.");
  if (git(["status", "--porcelain", "--untracked-files=normal"]))
    throw new Error("Adoption archives require clean committed source.");
  const npm = process.env.npm_execpath;
  if (!npm)
    throw new Error(
      "Use npm run qualify:package or npm run pack:archive -- DESTINATION.",
    );
  mkdirSync(destination, { recursive: true });
  const sourceCommit = git(["rev-parse", "HEAD"]);
  const sourceTree = git(["rev-parse", "HEAD^{tree}"]);
  const stage = mkdtempSync(join(tmpdir(), "json-quality-core-"));
  let packed;
  const platformPackages = [];
  try {
    for (const [platform, spec] of Object.entries(nativePackages)) {
      const directory = join(root, "native", "prebuilt", platform),
        metadata = JSON.parse(readFileSync(join(directory, "package.json")));
      if (
        metadata.name !== spec.package ||
        metadata.version !==
          JSON.parse(readFileSync(join(root, "package.json"))).version
      )
        throw new Error("Platform package metadata differs from its core");
      const nativePacked = runNpmPack(directory, { npm, destination });
      if (platform === "linux-x64")
        assertNativeExecutableModes(nativePacked.files);
      const original = join(destination, nativePacked.filename),
        archive = nativePacked.filename.replace(
          /\.tgz$/u,
          `-${sourceCommit}.tgz`,
        );
      copyFileSync(
        original,
        join(destination, archive),
        constants.COPYFILE_EXCL,
      );
      unlinkSync(original);
      const bytes = readFileSync(join(destination, archive));
      platformPackages.push({
        platform,
        name: nativePacked.name,
        version: nativePacked.version,
        archive,
        sha256: hash(bytes),
        integrity: nativePacked.integrity,
        files: nativePacked.files.map(({ path, size, mode }) => ({
          path,
          size,
          mode,
        })),
      });
    }
    const core = join(stage, "core");
    stageCore(root, core);
    packed = runNpmPack(core, { npm, destination });
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
  const original = resolve(destination, packed.filename);
  const archive = resolve(
    destination,
    `${packed.name.replaceAll("@", "").replaceAll("/", "-")}-${packed.version}-${sourceCommit}.tgz`,
  );
  if (original === archive)
    throw new Error("Archive identity must include the source commit");
  // One designated tarball; do not upload a second spelling of the same bytes.
  copyFileSync(original, archive, constants.COPYFILE_EXCL);
  unlinkSync(original);
  const bytes = readFileSync(archive);
  const manifest = JSON.parse(readFileSync(resolve(root, "package.json")));
  const provenance = {
    schemaVersion: 1,
    name: packed.name,
    version: packed.version,
    sourceCommit,
    sourceTree,
    sourceClean: true,
    archive: archive.split(/[\\/]/u).at(-1),
    sha256: hash(bytes),
    integrity: packed.integrity,
    lockSha256: hash(readFileSync(resolve(root, "package-lock.json"))),
    dependencies: manifest.dependencies,
    optionalDependencies: Object.fromEntries(
      Object.values(nativePackages).map((spec) => [
        spec.package,
        manifest.version,
      ]),
    ),
    platformPackages,
    files: packed.files.map(({ path, size, mode }) => ({ path, size, mode })),
  };
  if (
    provenance.files.some((file) =>
      /^(?:tests|node_modules|\.git)\//u.test(file.path),
    ) ||
    !provenance.files.some((file) => file.path === "LICENSE")
  )
    throw new Error(
      "Unexpected archive membership or missing package licence.",
    );
  writeFileSync(
    archive + ".provenance.json",
    JSON.stringify(provenance, null, 2) + "\n",
    { flag: "wx" },
  );
  return { archive, provenance };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const destination = process.argv[2];
  if (!destination || process.argv.length !== 3)
    throw new Error("Expected one explicit external archive destination.");
  process.stdout.write(JSON.stringify(packCandidate(destination)) + "\n");
}
