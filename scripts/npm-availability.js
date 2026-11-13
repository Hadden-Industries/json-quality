// SPDX-License-Identifier: AGPL-3.0-only
/** Registry label mutations are one-shot even inside npm's native fetch layer. */
import assert from "node:assert/strict";
export function npmLabelArguments(packageName, version) {
  assert.match(
    packageName,
    /^@hadden-industries\/json-quality(?:-(?:win32|linux)-x64)?$/u,
  );
  assert.ok(
    version === null ||
      (typeof version === "string" && !version.startsWith("-")),
  );
  return [
    "dist-tag",
    ...(version === null
      ? ["rm", packageName, "latest"]
      : ["add", `${packageName}@${version}`, "latest"]),
    "--fetch-retries=0",
    "--registry=https://registry.npmjs.org/",
  ];
}
