// SPDX-License-Identifier: AGPL-3.0-only
/** Trusted repository and package family for release workflows. */
import nativePackages from "../assets/native-packages.json" with { type: "json" };

export const repository = "Hadden-Industries/json-quality";
export const repositoryUrl = `https://github.com/${repository}`;
export const packageName = "@hadden-industries/json-quality";
export const releasePackageNames = Object.freeze([
  ...Object.values(nativePackages).map(({ package: name }) => name),
  packageName,
]);
