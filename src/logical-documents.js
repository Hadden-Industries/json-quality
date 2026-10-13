// SPDX-License-Identifier: AGPL-3.0-only
import { createHash } from "node:crypto";
import { decodeJsonBytes, jsonContract, isStrictJsonPath } from "./quality.js";
import { checkJsonDocument } from "./documents.js";
import { inventoryDocument } from "./result.js";
import { assertRepositoryPath } from "./paths.js";

/** Reconcile a trusted independent inventory with supplied owned member bytes.
 * Pointer linkage verifies the actual physical string; repository adapters own
 * storage formats and their independent storage/provenance validators.
 */
export async function checkLogicalDocuments(
  context,
  originals,
  options,
  operation,
) {
  const inventory = options.logicalInventory ?? [];
  const supplied = options.logicalDocuments ?? [];
  if (
    !Array.isArray(inventory) ||
    !Array.isArray(supplied) ||
    inventory.length !== supplied.length
  )
    throw new Error("Incomplete logical inventory.");
  const expected = new Map();
  for (const entry of inventory) {
    if (
      !entry ||
      Object.keys(entry).sort().join(",") !==
        "byteLength,containerPath,encoding,path,pointer,sha256"
    )
      throw new Error("Invalid logical inventory structure.");
    assertRepositoryPath(entry.path);
    assertRepositoryPath(entry.containerPath);
    if (
      !isStrictJsonPath(entry.path) ||
      expected.has(entry.path) ||
      context.files.some((file) => file.path === entry.path) ||
      !/^[a-f0-9]{64}$/u.test(entry.sha256) ||
      !Number.isSafeInteger(entry.byteLength) ||
      entry.byteLength < 0 ||
      !["utf8", "base64"].includes(entry.encoding) ||
      typeof entry.pointer !== "string" ||
      !/^(?:\/(?:[^~/]|~[01])*)*$/u.test(entry.pointer)
    )
      throw new Error("Invalid or duplicate logical inventory identity.");
    expected.set(entry.path, entry);
  }
  const documents = [];
  const containers = new Map();
  const seen = new Set();
  for (const entry of supplied) {
    if (
      !entry ||
      Object.keys(entry).sort().join(",") !== "bytes,path" ||
      !Buffer.isBuffer(entry.bytes)
    )
      throw new Error("Invalid logical document structure.");
    const pin = expected.get(entry.path);
    if (!pin || seen.has(entry.path))
      throw new Error("Unexpected or duplicate logical inventory member.");
    seen.add(entry.path);
    if (
      entry.bytes.length !== pin.byteLength ||
      createHash("sha256").update(entry.bytes).digest("hex") !== pin.sha256
    )
      throw new Error(`Changed logical bytes: ${entry.path}`);
    const container = originals.get(pin.containerPath);
    if (!container)
      throw new Error(`Missing logical provenance container: ${entry.path}`);
    if (!containers.has(pin.containerPath))
      containers.set(
        pin.containerPath,
        JSON.parse(decodeJsonBytes(container.bytes)),
      );
    let field = containers.get(pin.containerPath);
    for (const part of pin.pointer.split("/").slice(1)) {
      const key = part.replaceAll("~1", "/").replaceAll("~0", "~");
      if (!field || typeof field !== "object" || !Object.hasOwn(field, key))
        throw new Error(`Missing logical provenance pointer: ${entry.path}`);
      field = field[key];
    }
    if (typeof field !== "string")
      throw new Error(`Logical provenance is not a string: ${entry.path}`);
    const decoded = Buffer.from(field, pin.encoding);
    if (
      decoded.toString(pin.encoding) !== field ||
      !decoded.equals(entry.bytes)
    )
      throw new Error(`Changed logical provenance bytes: ${entry.path}`);
    const contract = {
      ...jsonContract(entry.path, context.policy),
      allowFormatWrites: false,
    };
    documents.push({
      ...(operation === "inventory"
        ? inventoryDocument(contract, "logical")
        : await checkJsonDocument(entry.bytes, contract)),
      representation: "logical",
    });
  }
  return documents;
}
