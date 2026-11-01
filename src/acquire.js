// SPDX-License-Identifier: AGPL-3.0-only
import { mkdtempSync, writeFileSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, isAbsolute, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import { types } from "node:util";

// BEGIN GENERATED INSTALLATION DEFAULTS
export const INSTALLATION_RESOURCE_DEFAULTS = Object.freeze({
  maximumPackageFamilyFiles: 50000,
  maximumPackageFamilyBytes: 268435456,
  maxCacheLookupTimeMs: 60000,
  maxCacheOutputBytes: 1048576,
});
// END GENERATED INSTALLATION DEFAULTS

// BEGIN GENERATED ACQUISITION DEFAULTS
export const ACQUISITION_RESOURCE_DEFAULTS = Object.freeze({
  maxAcquisitionTimeMs: 1200000,
});
// END GENERATED ACQUISITION DEFAULTS

// BEGIN GENERATED VERIFICATION DEFAULTS
export const VERIFICATION_RESOURCE_DEFAULTS = Object.freeze({
  maximumArchiveBytes: 134217728,
  maximumMemberBytes: 134217728,
  maximumExpandedBytes: 536870912,
  maximumMembers: 8192,
  maximumIndexBytes: 4194304,
  maximumMetadataBytes: 1048576,
  maximumArchiveMetadataBytes: 4096,
  maximumPathBytes: 32768,
  maximumDepth: 64,
  maximumVerificationTimeMs: 120000,
  maximumDecompressionRatio: 128,
});
// END GENERATED VERIFICATION DEFAULTS

/** Only the explicitly scoped capacity environment contract is admitted. */
export function capacityLimitsEnvironment() {
  if (process.env.JSON_QUALITY_LIMITS !== undefined)
    throw new TypeError(
      "Use JSON_QUALITY_CAPACITY_LIMITS; JSON_QUALITY_LIMITS is not supported.",
    );
  return process.env.JSON_QUALITY_CAPACITY_LIMITS;
}

/** Native cleanup retry strategy is independently configurable, including zero retries. */
export function acquisitionCleanupOptions(
  overrides = JSON.parse(process.env.JSON_QUALITY_ACQUISITION_CLEANUP ?? "{}"),
) {
  if (process.env.JSON_QUALITY_CLEANUP !== undefined)
    throw new TypeError(
      "Use JSON_QUALITY_ACQUISITION_CLEANUP; JSON_QUALITY_CLEANUP is not supported.",
    );
  if (
    !overrides ||
    typeof overrides !== "object" ||
    Array.isArray(overrides) ||
    types.isProxy(overrides)
  )
    throw new TypeError("Invalid acquisition cleanup retry options.");
  const descriptors = Object.getOwnPropertyDescriptors(overrides);
  const /** @type {Record<string, number>} */ result = {
      maxRetries: 3,
      retryDelay: 100,
    };
  for (const name of Reflect.ownKeys(descriptors)) {
    if (typeof name !== "string")
      throw new TypeError("Invalid acquisition cleanup retry options.");
    const descriptor = descriptors[name];
    if (
      typeof name !== "string" ||
      !Object.hasOwn(result, name) ||
      !Object.hasOwn(descriptor, "value") ||
      !descriptor.enumerable ||
      !Number.isSafeInteger(descriptor.value) ||
      descriptor.value < 0
    )
      throw new TypeError("Invalid acquisition cleanup retry options.");
    result[name] = descriptor.value;
  }
  return result;
}

/** The cold bootstrap cannot import the not-yet-installed package/schema.
 * Its defaults are a checked projection; native validation matches the closed
 * positive-safe-integer resource object. Each operation owns its controls.
 */
export function acquisitionResourceLimits(
  overrides = JSON.parse(process.env.JSON_QUALITY_ACQUISITION_CONTROLS ?? "{}"),
) {
  return coldResourceLimits(ACQUISITION_RESOURCE_DEFAULTS, overrides);
}
export function installationResourceLimits(
  overrides = JSON.parse(
    process.env.JSON_QUALITY_INSTALLATION_CONTROLS ?? "{}",
  ),
) {
  return coldResourceLimits(INSTALLATION_RESOURCE_DEFAULTS, overrides);
}
export function verificationResourceLimits(
  overrides = JSON.parse(
    process.env.JSON_QUALITY_VERIFICATION_CONTROLS ?? "{}",
  ),
) {
  return coldResourceLimits(VERIFICATION_RESOURCE_DEFAULTS, overrides);
}
function coldResourceLimits(
  /** @type {Record<string, number>} */ defaults,
  /** @type {*} */ overrides,
) {
  if (overrides === true) return { ...defaults };
  if (overrides === false)
    return Object.fromEntries(
      Object.keys(defaults).map((name) => [name, Infinity]),
    );
  if (
    !overrides ||
    typeof overrides !== "object" ||
    Array.isArray(overrides) ||
    types.isProxy(overrides)
  )
    throw new TypeError("Invalid JSON resource-limit overrides.");
  const result = { ...defaults },
    descriptors = Object.getOwnPropertyDescriptors(overrides);
  for (const name of Reflect.ownKeys(descriptors)) {
    if (typeof name !== "string")
      throw new TypeError("Invalid JSON resource-limit overrides.");
    const descriptor = descriptors[name];
    if (
      typeof name !== "string" ||
      !Object.hasOwn(defaults, name) ||
      !Object.hasOwn(descriptor, "value") ||
      !descriptor.enumerable ||
      (descriptor.value !== null &&
        (!Number.isSafeInteger(descriptor.value) || descriptor.value < 1))
    )
      throw new TypeError("Invalid JSON resource-limit overrides.");
    result[name] = descriptor.value === null ? Infinity : descriptor.value;
  }
  return result;
}

/** Resolve native cache policy once for acquisition and payload checking. */
export function nativeQualityCachePath(
  /** @type {*} */ toolingRoot,
  /** @type {*} */ npmCliPath,
  /** @type {*} */ overrides,
) {
  const installationControls = installationResourceLimits(overrides);
  return execFileSync(
    process.execPath,
    [npmCliPath, "config", "get", "cache"],
    {
      cwd: toolingRoot,
      encoding: "utf8",
      windowsHide: true,
      timeout: Number.isFinite(installationControls.maxCacheLookupTimeMs)
        ? installationControls.maxCacheLookupTimeMs
        : 0,
      maxBuffer: installationControls.maxCacheOutputBytes,
    },
  ).trim();
}

async function acquire() {
  const kind = process.argv[2];
  if (!["markdown", "json"].includes(kind) || process.argv.length !== 3)
    throw new Error("Expected markdown or json tool project.");
  const npm = process.env.npm_execpath;
  if (!npm)
    throw new Error("Run npm run install:markdown or npm run install:json.");
  const installationControls = JSON.parse(
    process.env.JSON_QUALITY_INSTALLATION_CONTROLS ?? "{}",
  );
  installationResourceLimits(installationControls);
  const acquisitionControls = acquisitionResourceLimits();
  const cleanup = acquisitionCleanupOptions();
  const verificationControls = JSON.parse(
    process.env.JSON_QUALITY_VERIFICATION_CONTROLS ?? "{}",
  );
  verificationResourceLimits(verificationControls);
  const toolingRoot = fileURLToPath(
    new URL(`../tooling/${kind}/`, import.meta.url),
  );
  const jsonCache =
    kind === "json"
      ? nativeQualityCachePath(toolingRoot, npm, installationControls)
      : null;
  const scratch = mkdtempSync(join(tmpdir(), "repository-quality-install-"));
  const cachePath = jsonCache ?? join(scratch, "cache");
  /** Remove only the task-owned real temporary acquisition workspace. */
  function removeAcquisitionWorkspace(/** @type {*} */ path) {
    const target = realpathSync(path);
    const contained = relative(realpathSync(tmpdir()), target);
    if (
      isAbsolute(contained) ||
      contained === ".." ||
      contained.startsWith(`..${sep}`) ||
      !contained.startsWith("repository-quality-install-")
    )
      throw new Error(
        "Refusing cleanup outside the temporary acquisition workspace.",
      );
    rmSync(target, {
      recursive: true,
      force: true,
      ...cleanup,
    });
  }
  try {
    const user = join(scratch, "user.npmrc"),
      global = join(scratch, "global.npmrc");
    writeFileSync(user, "");
    writeFileSync(global, "");
    const /** @type {Record<string, any>} */ env = {};
    for (const name of [
      "PATH",
      "Path",
      "SystemRoot",
      "SYSTEMROOT",
      "WINDIR",
      "TEMP",
      "TMP",
      "HOME",
      "USERPROFILE",
      "LOCALAPPDATA",
    ])
      if (process.env[name]) env[name] = process.env[name];
    const result = spawnSync(
      process.execPath,
      [
        npm,
        "ci",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--registry=https://registry.npmjs.org/",
        `--userconfig=${user}`,
        `--globalconfig=${global}`,
        ...(kind === "json" ? ["--allow-git=none"] : []),
        `--cache=${cachePath}`,
      ],
      {
        cwd: toolingRoot,
        env,
        stdio: "inherit",
        windowsHide: true,
        timeout: Number.isFinite(acquisitionControls.maxAcquisitionTimeMs)
          ? acquisitionControls.maxAcquisitionTimeMs
          : 0,
      },
    );
    if (result.error || result.signal || result.status === null)
      throw new Error("Isolated quality-tool acquisition did not complete.");
    process.exitCode = result.status;
    if (kind === "json" && result.status === 0) {
      const { verifyJsonQualityInstallation } = await import(
        new URL("../tooling/json/public-api.mjs", import.meta.url).href
      );
      await verifyJsonQualityInstallation({
        toolingRoot: fileURLToPath(
          new URL("../tooling/json/", import.meta.url),
        ),
        cachePath,
        bootstrapPath: fileURLToPath(import.meta.url),
        installationControls,
        verificationControls,
      });
    }
  } finally {
    removeAcquisitionWorkspace(scratch);
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url)
  await acquire();
