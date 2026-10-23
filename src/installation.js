// SPDX-License-Identifier: AGPL-3.0-only
import { readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { join, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveExecutionResources } from "./execution-resources.js";
import {
  readPackageMetadata,
  readPackageMetadataBytes,
  verifyPackagePayload,
} from "./package-payload.js";
import { assertRegularSource } from "./paths.js";
import { nativeQualityCachePath } from "./acquire.js";

const packageName = "@hadden-industries/json-quality";
const gitRepository =
  "git+https://github.com/Hadden-Industries/json-quality.git#";

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
    !parsed.gitRange &&
    !parsed.gitSubdir &&
    /^[a-f0-9]{40}$/u.test(parsed.gitCommittish)
  )
    return { kind: "git", commit: parsed.gitCommittish };
  throw new Error(
    "JSON quality requires one exact npm version or full producer Git commit.",
  );
}

/** npm may serialize the same hosted Git origin using a different transport. */
function sameProducerGitSource(resolved, commit) {
  const source = gitRepository + commit;
  return new Set([
    source,
    source.replace("git+https://github.com/", "git+ssh://git@github.com/"),
  ]).has(resolved);
}

/** Verify installed bytes against npm's independently cached locked payload.
 * This reads native npm's cache; it performs no acquisition, extraction or writes.
 */
export async function verifyJsonQualityInstallation({
  toolingRoot,
  npmExecutable = process.env.npm_execpath,
  cachePath,
  capacityLimits,
  bootstrapPath,
  signal,
  ...otherOptions
} = {}) {
  if (Object.hasOwn(otherOptions, "limits"))
    throw new TypeError("Use capacityLimits; limits is not supported.");
  if (Object.keys(otherOptions).length)
    throw new TypeError("Invalid installation verification options.");
  if (signal !== undefined && !(signal instanceof AbortSignal))
    throw new TypeError("Expected AbortSignal.");
  signal?.throwIfAborted();
  const root = realpathSync(toolingRoot);
  const manifest = await readPackageMetadata(
    assertRegularSource(root, "package.json"),
  );
  const lock = await readPackageMetadata(
    assertRegularSource(root, "package-lock.json"),
  );
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
      ? !sameProducerGitSource(entry.resolved, coordinate.commit)
      : entry.version !== coordinate.version ||
        !entry.resolved?.startsWith("https://registry.npmjs.org/")
  )
    throw new Error(
      "JSON tooling resolved source disagrees with its selector.",
    );
  const npmRequire = createRequire(npmExecutable),
    admission = resolveExecutionResources({}, { capacityLimits }).admission,
    cache =
      cachePath ??
      nativeQualityCachePath(root, npmExecutable, capacityLimits ?? {}),
    installedRoot = join(root, "node_modules", packageName);
  if (!isAbsolute(cache))
    throw new TypeError("Expected an absolute native npm cache path.");
  const installed = await readPackageMetadata(
    assertRegularSource(root, "node_modules/" + packageName + "/package.json"),
  );
  if (installed.name !== packageName || installed.version !== entry.version)
    throw new Error("Installed JSON quality package metadata differs.");
  const verified = await verifyPackagePayload(npmRequire, {
    cache,
    integrity: entry.integrity,
    installedRoot,
    admission,
    signal,
  });
  if (bootstrapPath) {
    const normalize = (bytes) =>
      new TextDecoder("utf-8", { fatal: true })
        .decode(bytes)
        .replaceAll("\r\n", "\n");
    if (
      normalize(await readPackageMetadataBytes(bootstrapPath)) !==
      normalize(
        await readPackageMetadataBytes(
          assertRegularSource(installedRoot, "src/acquire.js"),
        ),
      )
    )
      throw new Error(
        "Quality acquisition bootstrap differs from its shared producer source.",
      );
  }
  return {
    specifier,
    coordinate,
    integrity: entry.integrity,
    files: verified.files,
  };
}
