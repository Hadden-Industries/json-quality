// SPDX-License-Identifier: AGPL-3.0-only
import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, isAbsolute, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { operationLimits } from "./limits.js";
import { assertRegularSource, assertRepositoryPath } from "./paths.js";
import { nativeQualityCachePath } from "./acquire.js";

const packageName = "@hadden-industries/json-quality";
const gitRepository =
  "git+https://github.com/Hadden-Industries/json-quality.git#";
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Producer-owned source for the minimal cold-install bootstrap in consumers. */
export function jsonQualityAcquisitionBootstrap() {
  return readFileSync(new URL("./acquire.js", import.meta.url), "utf8");
}

/** A consumer bridge may expose public exports only from its isolated install. */
export function assertIsolatedJsonQuality(toolingRoot) {
  const root = realpathSync(
    toolingRoot instanceof URL ? fileURLToPath(toolingRoot) : toolingRoot,
  );
  const expected = assertRegularSource(
    root,
    `node_modules/${packageName}/package.json`,
  );
  const actual = realpathSync(
    fileURLToPath(new URL("../package.json", import.meta.url)),
  );
  if (realpathSync(expected) !== actual)
    throw new Error(
      "JSON tooling must resolve from its isolated installation.",
    );
  return root;
}

/** Admit one native npm exact version or the producer's full Git commit. */
export function jsonQualitySourceCoordinate(
  specifier,
  npmExecutable = process.env.npm_execpath,
) {
  if (!npmExecutable)
    throw new Error("Run installation verification through npm.");
  const parsed = createRequire(npmExecutable)("npm-package-arg").resolve(
    packageName,
    specifier,
  );
  if (parsed.type === "version")
    return { kind: "registry", version: parsed.fetchSpec };
  if (
    parsed.type === "alias" &&
    parsed.subSpec.type === "version" &&
    parsed.subSpec.name === packageName
  )
    return { kind: "registry", version: parsed.subSpec.fetchSpec };
  if (
    parsed.type === "git" &&
    specifier.startsWith(gitRepository) &&
    /^[a-f0-9]{40}$/u.test(parsed.gitCommittish)
  )
    return { kind: "git", commit: parsed.gitCommittish };
  throw new Error(
    "JSON quality requires one exact npm version or full producer Git commit.",
  );
}

/** Verify installed bytes against npm's independently cached locked payload.
 * This reads native npm's cache; it performs no acquisition, extraction or writes.
 */
export async function verifyJsonQualityInstallation({
  toolingRoot,
  npmExecutable = process.env.npm_execpath,
  cachePath,
  limits,
  bootstrapPath,
} = {}) {
  const root = realpathSync(toolingRoot);
  const manifest = readJson(assertRegularSource(root, "package.json"));
  const lock = readJson(assertRegularSource(root, "package-lock.json"));
  const specifier = manifest.devDependencies?.[packageName];
  const coordinate = jsonQualitySourceCoordinate(specifier, npmExecutable);
  const entry = lock.packages?.[`node_modules/${packageName}`];
  if (
    lock.lockfileVersion !== 3 ||
    lock.packages?.[""].devDependencies?.[packageName] !== specifier ||
    !entry ||
    entry.link ||
    !/^sha512-[A-Za-z0-9+/]+={0,2}$/u.test(entry.integrity)
  )
    throw new Error("JSON tooling manifest and lock identity disagree.");
  if (
    coordinate.kind === "git"
      ? entry.resolved !== specifier
      : entry.version !== coordinate.version ||
        !entry.resolved?.startsWith("https://registry.npmjs.org/")
  )
    throw new Error(
      "JSON tooling resolved source disagrees with its selector.",
    );
  const npmRequire = createRequire(npmExecutable);
  const cache = cachePath ?? nativeQualityCachePath(root, npmExecutable);
  const bounds = operationLimits({}, limits);
  const chunks = [];
  let archiveBytes = 0;
  for await (const chunk of npmRequire("cacache").get.stream.byDigest(
    join(cache, "_cacache"),
    entry.integrity,
  )) {
    archiveBytes += chunk.length;
    if (archiveBytes > bounds.maxFileBytes)
      throw new Error("Package archive byte limit exceeded.");
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks, archiveBytes);
  if (
    `sha512-${createHash("sha512").update(bytes).digest("base64")}` !==
    entry.integrity
  )
    throw new Error("Cached JSON quality archive integrity differs.");
  const expected = new Map();
  const seen = new Set();
  let expandedBytes = 0;
  await new Promise((resolve, reject) => {
    const parser = new (npmRequire("tar").Parser)({
      strict: true,
      maxMetaEntrySize: bounds.maxFileBytes,
      maxDecompressionRatio: Infinity,
    });
    parser.on("error", reject);
    parser.on("end", resolve);
    parser.on("ignoredEntry", () => {
      const error = new Error(
        "Unsupported or oversized package archive member.",
      );
      parser.abort(error);
      reject(error);
    });
    parser.on("entry", (member) => {
      try {
        if (!member.path.startsWith("package/"))
          throw new Error("Unexpected package archive root.");
        const path = member.path.slice(8).replace(/\/$/u, "");
        if (!path && member.type === "Directory") return member.resume();
        assertRepositoryPath(path);
        if (member.type === "Directory") return member.resume();
        if (
          !["File", "OldFile"].includes(member.type) ||
          path.split("/").includes("node_modules") ||
          seen.has(path.toLowerCase())
        )
          throw new Error(
            "Duplicate, linked or non-file package archive member.",
          );
        seen.add(path.toLowerCase());
        expandedBytes += member.size;
        if (
          member.size > bounds.maxFileBytes ||
          expandedBytes > bounds.maxTotalBytes ||
          seen.size > bounds.maxFiles
        )
          throw new Error("Package payload resource limit exceeded.");
        const hash = createHash("sha256");
        member.on("data", (chunk) => hash.update(chunk));
        member.on("end", () => expected.set(path, hash.digest("hex")));
        member.resume();
      } catch (error) {
        parser.abort(error);
        reject(error);
      }
    });
    parser.end(bytes);
  });
  const installedRoot = join(root, "node_modules", packageName);
  assertRegularSource(root, `node_modules/${packageName}/package.json`);
  const installed = readJson(join(installedRoot, "package.json"));
  if (installed.name !== packageName || installed.version !== entry.version)
    throw new Error("Installed JSON quality package metadata differs.");
  const actual = new Map();
  let installedBytes = 0;
  const walk = (directory) => {
    for (const member of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, member.name);
      if (member.name === "node_modules" && member.isDirectory()) continue;
      if (member.isDirectory()) walk(path);
      else {
        const key = relative(installedRoot, path).split(sep).join("/");
        const regular = assertRegularSource(installedRoot, key);
        installedBytes += lstatSync(regular).size;
        if (
          isAbsolute(key) ||
          actual.size >= bounds.maxFiles ||
          lstatSync(regular).size > bounds.maxFileBytes ||
          installedBytes > bounds.maxTotalBytes
        )
          throw new Error("Installed package resource limit exceeded.");
        actual.set(key, digest(readFileSync(regular)));
      }
    }
  };
  walk(installedRoot);
  if (
    actual.size !== expected.size ||
    [...expected].some(([path, hash]) => actual.get(path) !== hash)
  )
    throw new Error(
      "Installed JSON quality payload differs from its locked cached archive.",
    );
  if (bootstrapPath) {
    if (
      !lstatSync(bootstrapPath).isFile() ||
      lstatSync(bootstrapPath).isSymbolicLink()
    )
      throw new Error("Nonregular quality acquisition bootstrap.");
    const normalize = (bytes) =>
      bytes.toString("utf8").replaceAll("\r\n", "\n");
    if (
      normalize(readFileSync(bootstrapPath)) !==
      normalize(readFileSync(join(installedRoot, "src/acquire.js")))
    )
      throw new Error(
        "Quality acquisition bootstrap differs from its shared producer source.",
      );
  }
  return {
    specifier,
    coordinate,
    integrity: entry.integrity,
    files: actual.size,
  };
}
