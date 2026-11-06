// SPDX-License-Identifier: AGPL-3.0-only
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { join, isAbsolute, relative, sep } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";
import {
  installationResources,
  nativeQualityCachePath,
} from "./installation-controls.js";
import {
  readPackageMetadata as metadata,
  verificationResources,
  verifyPackagePayload,
} from "./package-payload.js";
import { assertRegularSource } from "./paths.js";
import { nativePackages, resolveNativePackage } from "./native-packages.js";
import { createExecutionDeadline } from "./execution-deadline.js";

const packageName = "@hadden-industries/json-quality";

/** A consumer bridge may expose public exports only from its isolated install. */
export function assertJsonQualityInstallationRoot(
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
export function parseJsonQualityRegistrySpecifier(
  /** @type {string} */ specifier,
  npmCliPath = process.env.npm_execpath,
) {
  if (!npmCliPath)
    throw new Error("Run installation verification through npm.");
  const parsed = createRequire(npmCliPath)("npm-package-arg").resolve(
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
 * @param {import("./api-types.js").InstallationVerificationOptions} options
 * @returns {Promise<import("./api-types.js").InstallationVerification>}
 */
export async function verifyJsonQualityInstallation({
  toolingRoot,
  npmCliPath = process.env.npm_execpath,
  cachePath,
  installationControls,
  verificationControls,
  signal,
  ...otherOptions
}) {
  if (Object.hasOwn(otherOptions, "limits"))
    throw new TypeError("Use installationControls; limits is not supported.");
  if (Object.hasOwn(otherOptions, "capacityLimits"))
    throw new TypeError(
      "Use installationControls; capacityLimits is not supported.",
    );
  if (Object.hasOwn(otherOptions, "npmExecutable"))
    throw new TypeError("Use npmCliPath; npmExecutable is not supported.");
  if (Object.keys(otherOptions).length)
    throw new TypeError("Invalid installation verification options.");
  if (!npmCliPath)
    throw new Error("Run installation verification through npm.");
  if (signal !== undefined && !(signal instanceof AbortSignal))
    throw new TypeError("Expected AbortSignal.");
  signal?.throwIfAborted();
  const installation = installationResources(installationControls),
    selected = verificationResources(verificationControls),
    deadline = createExecutionDeadline(selected.maximumVerificationTimeMs, [
      signal,
    ]),
    readPackageMetadata = (/** @type {*} */ path) =>
      metadata(path, selected, deadline.signal);
  signal = deadline.signal;
  try {
    const root = realpathSync(toolingRoot);
    const manifest = await readPackageMetadata(
      assertRegularSource(root, "package.json"),
    );
    const lock = await readPackageMetadata(
      assertRegularSource(root, "package-lock.json"),
    );
    const specifier = manifest.devDependencies?.[packageName];
    const coordinate = parseJsonQualityRegistrySpecifier(specifier, npmCliPath);
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
    const npmRequire = createRequire(npmCliPath),
      familyBudget = {
        maximumPackageFamilyFiles: installation.maximumPackageFamilyFiles,
        maximumPackageFamilyBytes: installation.maximumPackageFamilyBytes,
      },
      cache =
        cachePath ?? nativeQualityCachePath(root, npmCliPath, installation),
      installedRoot = join(root, "node_modules", packageName);
    if (!isAbsolute(cache))
      throw new TypeError("Expected an absolute native npm cache path.");
    const installed = await readPackageMetadata(
      assertRegularSource(
        root,
        "node_modules/" + packageName + "/package.json",
      ),
    );
    if (installed.name !== packageName || installed.version !== entry.version)
      throw new Error("Installed JSON quality package metadata differs.");
    const verified = await verifyPackagePayload(npmRequire, {
      cache,
      integrity: entry.integrity,
      installedRoot,
      packageFamilyBudget: familyBudget,
      signal,
      verificationControls: selected,
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
    const platform = await resolveNativePackage(
        installedRoot,
        selected,
        signal,
      ),
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
      packageFamilyBudget: {
        maximumPackageFamilyFiles:
          familyBudget.maximumPackageFamilyFiles === null
            ? null
            : familyBudget.maximumPackageFamilyFiles - verified.files,
        maximumPackageFamilyBytes:
          familyBudget.maximumPackageFamilyBytes === null
            ? null
            : Number(
                BigInt(familyBudget.maximumPackageFamilyBytes) -
                  BigInt(verified.bytes),
              ),
      },
      signal,
      verificationControls: selected,
    });
    const files = verified.files + nativeVerified.files,
      bytes = BigInt(verified.bytes) + BigInt(nativeVerified.bytes);
    if (
      !Number.isSafeInteger(files) ||
      (familyBudget.maximumPackageFamilyFiles !== null &&
        files > familyBudget.maximumPackageFamilyFiles) ||
      (familyBudget.maximumPackageFamilyBytes !== null &&
        bytes > BigInt(familyBudget.maximumPackageFamilyBytes))
    )
      throw new Error("Installed package family resource limit exceeded.");
    return {
      specifier,
      coordinate,
      integrity: entry.integrity,
      fileCount: files,
      native: {
        name: platform.metadata.name,
        version: platform.metadata.version,
        integrity: nativeLock.integrity,
        fileCount: nativeVerified.files,
      },
    };
  } finally {
    deadline.dispose();
  }
}
