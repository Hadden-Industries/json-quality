// SPDX-License-Identifier: AGPL-3.0-only
// One package family; npm owns platform selection and registry acquisition.
import { createRequire } from "node:module";
import { dirname, join, sep } from "node:path";
import { realpathSync } from "node:fs";
import definitions from "../assets/native-packages.json" with { type: "json" };
import { readPackageMetadata } from "./package-payload.js";
import { isPathContained } from "./paths.js";

export const nativePackages = definitions;

export function nativePlatformSpec() {
  const platform = process.platform + "-" + process.arch;
  const spec = nativePackages[platform];
  if (
    !spec ||
    (spec.libc && !process.report.getReport().header.glibcVersionRuntime)
  )
    throw new Error(`Unsupported JSON Quality native platform: ${platform}`);
  return { platform, spec };
}

export async function resolveNativePackage(coreRoot) {
  const { platform, spec } = nativePlatformSpec();
  coreRoot = realpathSync(coreRoot);
  const core = await readPackageMetadata(join(coreRoot, "package.json"));
  let metadataPath;
  try {
    metadataPath = createRequire(join(coreRoot, "package.json")).resolve(
      spec.package + "/package.json",
    );
  } catch (cause) {
    throw new Error(
      `Install the matching optional JSON Quality platform package ${spec.package}; installation scripts are not required.`,
      { cause },
    );
  }
  const directory = realpathSync(dirname(metadataPath)),
    parts = coreRoot.split(sep),
    index = parts.findIndex((part) =>
      process.platform === "win32"
        ? part.toLowerCase() === "node_modules"
        : part === "node_modules",
    );
  if (index >= 0) {
    // Accept native npm's ordinary nested/hoisted graph, excluding higher
    // ancestor and global module paths outside this installation.
    const boundary = realpathSync(parts.slice(0, index + 1).join(sep));
    if (!isPathContained(boundary, directory))
      throw new Error(
        "JSON Quality native package resolved outside its installation.",
      );
  } else {
    // The producer's explicit checked-in development links have one target.
    if (
      core.optionalDependencies?.[spec.package] !==
        `file:native/prebuilt/${platform}` ||
      realpathSync.native(directory) !==
        realpathSync.native(join(coreRoot, "native", "prebuilt", platform))
    )
      throw new Error(
        "JSON Quality native package resolved outside its installation.",
      );
  }
  const metadata = await readPackageMetadata(metadataPath);
  if (metadata.name !== spec.package || metadata.version !== core.version)
    throw new Error(
      "JSON Quality core and platform package identities differ.",
    );
  return {
    platform,
    spec,
    metadata,
    metadataPath,
    directory,
  };
}
