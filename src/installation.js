// SPDX-License-Identifier: AGPL-3.0-only
import { readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { join, isAbsolute, relative, sep } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";
import { resolveExecutionResources } from "./execution-resources.js";
import {
  readPackageMetadata,
  readPackageMetadataBytes,
  verifyPackagePayload,
} from "./package-payload.js";
import { assertRegularSource } from "./paths.js";
import { nativeQualityCachePath } from "./acquire.js";
import { nativePackages, resolveNativePackage } from "./native-packages.js";

const packageName = "@hadden-industries/json-quality";

/** Producer-owned source for the minimal cold-install bootstrap in consumers. */
export function jsonQualityAcquisitionBootstrap() {
  return readFileSync(new URL("./acquire.js", import.meta.url), "utf8");
}

/** A consumer bridge may expose public exports only from its isolated install. */
export function assertIsolatedJsonQuality(
  /** @type {string | URL} */ toolingRoot,
) {
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

/** Admit an exact registry version of this package, including an npm alias.
 * @returns {{kind: "registry", version: string}}
 */
export function jsonQualitySourceCoordinate(
  /** @type {string} */ specifier,
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
  throw new Error(
    "JSON quality requires one exact registry version of its published package.",
  );
}

/** Verify installed bytes against npm's independently cached locked payload.
 * This reads native npm's cache; it performs no acquisition, extraction or writes.
 * @param {import("./api-types.js").InstallationOptions} options
 * @returns {Promise<import("./api-types.js").InstallationVerification>}
 */
export async function verifyJsonQualityInstallation({
  toolingRoot,
  npmExecutable = process.env.npm_execpath,
  cachePath,
  capacityLimits,
  bootstrapPath,
  signal,
  ...otherOptions
}) {
  if (Object.hasOwn(otherOptions, "limits"))
    throw new TypeError("Use capacityLimits; limits is not supported.");
  if (Object.keys(otherOptions).length)
    throw new TypeError("Invalid installation verification options.");
  if (!npmExecutable)
    throw new Error("Run installation verification through npm.");
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
    entry.version !== coordinate.version ||
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
  const expectedPlatforms = Object.fromEntries(
    Object.values(nativePackages).map((spec) => [
      spec.package,
      coordinate.version,
    ]),
  );
  if (
    !isDeepStrictEqual(installed.optionalDependencies, expectedPlatforms) ||
    !isDeepStrictEqual(entry.optionalDependencies, expectedPlatforms)
  )
    throw new Error("Installed JSON quality platform declarations differ.");
  const platform = await resolveNativePackage(installedRoot),
    location = relative(root, platform.directory).split(sep).join("/");
  if (
    !location.startsWith("node_modules/") ||
    location.split("/").includes("..")
  )
    throw new Error(
      "JSON quality native package escaped its isolated installation.",
    );
  assertRegularSource(root, location + "/package.json");
  const nativeLock = lock.packages[location];
  if (
    !nativeLock ||
    nativeLock.link ||
    nativeLock.version !== coordinate.version ||
    !/^sha512-[A-Za-z0-9+/]+={0,2}$/u.test(nativeLock.integrity) ||
    !nativeLock.resolved?.startsWith("https://registry.npmjs.org/") ||
    !isDeepStrictEqual(platform.metadata.os, platform.spec.os) ||
    !isDeepStrictEqual(platform.metadata.cpu, platform.spec.cpu) ||
    !isDeepStrictEqual(platform.metadata.libc, platform.spec.libc)
  )
    throw new Error(
      "JSON quality native package lock or platform identity differs.",
    );
  const nativeVerified = await verifyPackagePayload(npmRequire, {
    cache,
    integrity: nativeLock.integrity,
    installedRoot: platform.directory,
    admission,
    signal,
  });
  const files = verified.files + nativeVerified.files,
    bytes = BigInt(verified.bytes) + BigInt(nativeVerified.bytes);
  if (
    (admission.maxFiles != null && files > admission.maxFiles) ||
    (admission.maxTotalBytes != null && bytes > BigInt(admission.maxTotalBytes))
  )
    throw new Error("Installed package family resource limit exceeded.");
  if (bootstrapPath) {
    const normalize = (/** @type {*} */ bytes) =>
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
    files,
    native: {
      name: platform.metadata.name,
      version: platform.metadata.version,
      integrity: nativeLock.integrity,
      files: nativeVerified.files,
    },
  };
}
