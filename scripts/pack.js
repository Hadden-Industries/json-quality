// SPDX-License-Identifier: AGPL-3.0-only
import { execFileSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  copyFileSync,
  mkdirSync,
  constants,
} from "node:fs";
import { createHash } from "node:crypto";
import { resolve, relative, isAbsolute, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const git = (args) =>
  execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    windowsHide: true,
  }).trim();

/** npm 12 keys pack reports by package; supported older npm emits an array. */
export function readPackReport(text) {
  const report = JSON.parse(text);
  const entries = Array.isArray(report) ? report : Object.values(report);
  if (
    entries.length !== 1 ||
    !entries[0] ||
    typeof entries[0].name !== "string" ||
    !Array.isArray(entries[0].files)
  )
    throw new Error("Expected exactly one native npm pack result.");
  return entries[0];
}

/** Pack clean source into an explicit external destination with immutable identity.
 * Registry publication and source delivery are separate authorized operations.
 */
export function packCandidate(destination) {
  destination = resolve(destination);
  const contained = relative(root, destination);
  if (
    !isAbsolute(contained) &&
    contained !== ".." &&
    !contained.startsWith(`..${sep}`)
  )
    throw new Error("Pack destination must be outside the producer checkout.");
  if (git(["status", "--porcelain", "--untracked-files=normal"]))
    throw new Error("Adoption archives require clean committed source.");
  const npm = process.env.npm_execpath;
  if (!npm)
    throw new Error(
      "Use npm run qualify:package or invoke this script through npm exec.",
    );
  mkdirSync(destination, { recursive: true });
  const sourceCommit = git(["rev-parse", "HEAD"]);
  const sourceTree = git(["rev-parse", "HEAD^{tree}"]);
  const packed = readPackReport(
    execFileSync(
      process.execPath,
      [
        npm,
        "pack",
        "--ignore-scripts",
        "--json",
        "--pack-destination",
        destination,
      ],
      {
        cwd: root,
        encoding: "utf8",
        windowsHide: true,
        timeout: 120000,
        maxBuffer: 8 * 1024 * 1024,
      },
    ),
  );
  const original = resolve(destination, packed.filename);
  const archive = resolve(
    destination,
    `${packed.name.replaceAll("@", "").replaceAll("/", "-")}-${packed.version}-${sourceCommit}.tgz`,
  );
  copyFileSync(original, archive, constants.COPYFILE_EXCL);
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
