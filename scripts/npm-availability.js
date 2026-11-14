// SPDX-License-Identifier: AGPL-3.0-only
/** Registry label mutations are one-shot even inside npm's native fetch layer. */
import assert from "node:assert/strict";
const familyLabels = Object.freeze({
  promote: "latest",
  align: "latest",
  restore: "latest",
  "scoped-restore": "latest",
  "emergency-core-restore": "latest",
  "retire-pilot": "pilot",
});

/** Select the fixed registry label of a known family operation; unknown scopes refuse. */
export function npmFamilyLabel(family) {
  assert.equal(family.schemaVersion, 2);
  assert.equal(
    typeof family.operation,
    "string",
    "Family operation must be a string",
  );
  assert.ok(
    Object.hasOwn(familyLabels, family.operation),
    "Unknown family operation",
  );
  return familyLabels[family.operation];
}

/** The journal operation names its actual label, preserving existing latest records. */
export function npmLabelOperation(family, packageName) {
  assert.match(
    packageName,
    /^@hadden-industries\/json-quality(?:-(?:win32|linux)-x64)?$/u,
  );
  return `npm-${npmFamilyLabel(family)}:${packageName}`;
}

/** Issue one native label request; the pilot capability permits retirement only. */
export function npmLabelArguments(packageName, version, tag = "latest") {
  assert.match(
    packageName,
    /^@hadden-industries\/json-quality(?:-(?:win32|linux)-x64)?$/u,
  );
  assert.ok(
    version === null ||
      (typeof version === "string" && !version.startsWith("-")),
  );
  assert.ok(
    ["latest", "pilot"].includes(tag),
    "Unknown npm availability label",
  );
  if (tag === "pilot")
    assert.equal(
      version,
      null,
      "Pilot label management permits retirement only",
    );
  return [
    "dist-tag",
    ...(version === null
      ? ["rm", packageName, tag]
      : ["add", `${packageName}@${version}`, tag]),
    "--fetch-retries=0",
    "--registry=https://registry.npmjs.org/",
  ];
}
