// SPDX-License-Identifier: AGPL-3.0-only
// One package family; npm owns platform selection and registry acquisition.
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import definitions from "../assets/native-packages.json" with { type: "json" };
import { readPackageMetadata } from "./package-payload.js";

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
    directory: dirname(metadataPath),
  };
}
