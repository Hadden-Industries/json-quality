// SPDX-License-Identifier: AGPL-3.0-only
// Verify a producer component before either fixed native transport is loaded.
import { createHash } from "node:crypto";
import { open } from "node:fs/promises";
import { observeRegularFile } from "./regular-file-observation.js";
import { createRequire } from "node:module";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import cohort from "../schemas/contract-cohort.json" with { type: "json" };

/** Read trusted component metadata through a fixed allocation and unchanged
 * descriptor/path identity, including a bounded check for growth after stat.
 */
async function readManifest(/** @type {*} */ path) {
  const before = observeRegularFile(path);
  if (
    !before.isFile() ||
    before.isSymbolicLink() ||
    before.size < 1n ||
    before.size > 65536n
  )
    throw new Error("native-component-manifest");
  const file = await open(path, "r"),
    bytes = Buffer.alloc(65537);
  try {
    const opened = await file.stat({ bigint: true });
    if (opened.dev !== before.dev || opened.ino !== before.ino)
      throw new Error("native-component-manifest-changed");
    let length = 0;
    while (length < bytes.length) {
      const { bytesRead } = await file.read(
        bytes,
        length,
        bytes.length - length,
        null,
      );
      if (!bytesRead) break;
      length += bytesRead;
    }
    if (BigInt(length) !== before.size)
      throw new Error("native-component-manifest-changed");
    const after = observeRegularFile(path),
      final = await file.stat({ bigint: true });
    for (const key of /** @type {const} */ ([
      "dev",
      "ino",
      "size",
      "mtimeNs",
      "ctimeNs",
    ]))
      if (before[key] !== after[key] || before[key] !== final[key])
        throw new Error("native-component-manifest-changed");
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        bytes.subarray(0, length),
      ),
    );
  } finally {
    await file.close();
  }
}

/** Hash a regular immutable component member with one bounded read buffer. */
async function verifyMember(/** @type {*} */ path, /** @type {*} */ expected) {
  if (
    !expected ||
    !/^[a-f0-9]{64}$/u.test(expected.sha256) ||
    !Number.isSafeInteger(expected.bytes) ||
    expected.bytes < 1 ||
    expected.bytes > 1073741824
  )
    throw new Error("native-component-member-identity");
  const before = observeRegularFile(path);
  if (
    !before.isFile() ||
    before.isSymbolicLink() ||
    before.size !== BigInt(expected.bytes)
  )
    throw new Error("native-component-member-shape");
  const file = await open(path, "r"),
    hash = createHash("sha256"),
    buffer = Buffer.alloc(65536);
  try {
    const opened = await file.stat({ bigint: true });
    if (opened.dev !== before.dev || opened.ino !== before.ino)
      throw new Error("native-component-member-changed");
    let observed = 0;
    while (true) {
      const { bytesRead } = await file.read(buffer);
      if (!bytesRead) break;
      observed += bytesRead;
      if (observed > expected.bytes)
        throw new Error("native-component-member-changed");
      hash.update(buffer.subarray(0, bytesRead));
    }
    const after = observeRegularFile(path),
      final = await file.stat({ bigint: true });
    for (const key of /** @type {const} */ ([
      "dev",
      "ino",
      "size",
      "mtimeNs",
      "ctimeNs",
    ]))
      if (before[key] !== after[key] || before[key] !== final[key])
        throw new Error("native-component-member-changed");
    if (hash.digest("hex") !== expected.sha256)
      throw new Error("native-component-member-digest");
  } finally {
    await file.close();
  }
}

/** Acquisition supplies an absolute, verified package component directory.
 * Filenames are fixed here; a manifest cannot select executable/module paths.
 * This internal boundary is not a public backend selector or download fallback.
 */
export async function loadNativeComponent(/** @type {*} */ directory) {
  if (!isAbsolute(directory)) throw new TypeError("native-component-directory");
  const manifest = await readManifest(join(directory, "component.json"));
  if (
    manifest.schemaVersion !== cohort.componentSchemaVersion ||
    !isDeepStrictEqual(manifest.cohort, cohort) ||
    manifest.platform !== process.platform + "-" + process.arch ||
    manifest.nodeApiVersion !== cohort.nodeApiVersion ||
    Number(process.versions.napi) < manifest.nodeApiVersion ||
    !/^[a-f0-9]{64}$/u.test(manifest.sourceInputsSha256)
  )
    throw new Error("native-component-cohort");
  for (const name of [
    "configuration.schema.json",
    "source-contract.schema.json",
    "contract-cohort.json",
  ])
    await verifyMember(
      fileURLToPath(new URL("../schemas/" + name, import.meta.url)),
      manifest.controlSchemas?.[name],
    );
  const executable =
    process.platform === "win32"
      ? "json-quality-native.exe"
      : "json-quality-native";
  await verifyMember(
    join(directory, "json-quality.node"),
    manifest.artifacts?.["json-quality.node"],
  );
  await verifyMember(
    join(directory, executable),
    manifest.artifacts?.[executable],
  );
  const binding = createRequire(import.meta.url)(
    join(directory, "json-quality.node"),
  );
  return Object.freeze({ manifest, binding, directory });
}
