// SPDX-License-Identifier: AGPL-3.0-only
import { createHash } from "node:crypto";
import { lstatSync } from "node:fs";
import { assertRepositoryPath, assertRegularSource } from "./paths.js";
import { captureSource, assertSourceUnchanged } from "./replacement.js";
import { jsonContract } from "./quality.js";
import { assertNativeIdentity } from "./native-identities.js";
import { sourcePresentationContract } from "./source-presentation.js";
import { checkJsonDocument } from "./documents.js";
import { inventoryDocument } from "./result.js";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const closed = (value, names) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).sort().join(",") === [...names].sort().join(",");

/** Native owners verify domain storage/provenance and supply its independent
 * census. The shared module binds the supplied bytes and source/authority
 * snapshots, then owns every quality phase, budget and result count.
 * Provider functions are injected by trusted callers; JSON never loads code.
 */
export async function checkNativeDocuments(
  context,
  providers,
  operation,
  initialBytes,
  logicalInventory = [],
) {
  const definitions = context.policy.nativeSources ?? [];
  if (providers === undefined) providers = {};
  if (!providers || typeof providers !== "object" || Array.isArray(providers))
    throw new TypeError("Native providers must be a named function map.");
  const requested = new Set(definitions.map(({ provider }) => provider));
  if (
    Object.keys(providers).some(
      (name) => !requested.has(name) || typeof providers[name] !== "function",
    )
  )
    throw new Error("Unconfigured or invalid native provider.");
  const ids = new Set();
  const paths = new Set(
    [...context.files, ...logicalInventory].map(({ path }) =>
      path.toLowerCase(),
    ),
  );
  const snapshots = new Map();
  const documents = [];
  const sources = [];
  let totalBytes = initialBytes;
  let diagnostics = 0;
  let totalNative = 0;
  const admitBytes = (size, document = false) => {
    if (
      !Number.isSafeInteger(size) ||
      size < 0 ||
      (document && size > context.limits.maxFileBytes)
    )
      throw new Error("Invalid or excessive native JSON byte length.");
    totalBytes += size;
    if (totalBytes > context.limits.maxTotalBytes)
      throw new Error(
        "JSON total byte limit exceeded; native coverage is incomplete.",
      );
  };
  const capture = (identity) => {
    const { path, sha256: digest, byteLength } = identity;
    assertRepositoryPath(path);
    if (
      !/^[a-f0-9]{64}$/u.test(digest) ||
      !Number.isSafeInteger(byteLength) ||
      byteLength < 0
    )
      throw new Error("Invalid native source identity.");
    const folded = path.toLowerCase();
    const prior = snapshots.get(folded);
    if (prior) {
      if (
        prior.path !== path ||
        prior.sha256 !== digest ||
        prior.byteLength !== byteLength
      )
        throw new Error(`Conflicting native source identity: ${path}`);
      return prior.original;
    }
    const absolute = assertRegularSource(context.root, path);
    if (lstatSync(absolute).size !== byteLength)
      throw new Error(`Changed native source length: ${path}`);
    admitBytes(byteLength);
    const original = captureSource(context.root, path);
    if (
      original.bytes.length !== byteLength ||
      sha256(original.bytes) !== digest
    )
      throw new Error(`Changed native source bytes: ${path}`);
    snapshots.set(folded, { path, sha256: digest, byteLength, original });
    return original;
  };
  for (const definition of definitions) {
    if (ids.has(definition.id))
      throw new Error("Duplicate native source definition.");
    ids.add(definition.id);
    if (!Object.hasOwn(providers, definition.provider))
      throw new Error(
        `Missing required native provider: ${definition.provider}`,
      );
    const supplied = await providers[definition.provider]({
      root: context.root,
      parameters: structuredClone(definition.parameters ?? {}),
    });
    if (
      !closed(supplied, ["inventory", "documents", "authorities"]) ||
      !Array.isArray(supplied.inventory) ||
      !Array.isArray(supplied.documents) ||
      !Array.isArray(supplied.authorities) ||
      !supplied.authorities.length ||
      supplied.inventory.length !== supplied.documents.length ||
      supplied.inventory.length < (definition.minimumDocuments ?? 1)
    )
      throw new Error(`Incomplete native census: ${definition.id}`);
    totalNative += supplied.inventory.length;
    if (context.files.length + totalNative > context.limits.maxFiles)
      throw new Error(
        "JSON file limit exceeded; native coverage is incomplete.",
      );
    if (
      totalNative + logicalInventory.length >
      context.limits.maxLogicalDocuments
    )
      throw new Error("JSON native/logical document limit exceeded.");
    const authorities = structuredClone(supplied.authorities);
    const authorityPaths = new Set();
    for (const authority of authorities) {
      if (!closed(authority, ["path", "sha256", "byteLength"]))
        throw new Error("Invalid native authority snapshot.");
      if (authorityPaths.has(authority.path))
        throw new Error("Duplicate native authority.");
      authorityPaths.add(authority.path);
      capture(authority);
    }
    const expected = new Map();
    for (const entry of structuredClone(supplied.inventory)) {
      assertNativeIdentity(entry);
      if (paths.has(entry.path.toLowerCase()))
        throw new Error(
          `Duplicate or colliding native JSON path: ${entry.path}`,
        );
      paths.add(entry.path.toLowerCase());
      const source = entry.source;
      capture(source);
      expected.set(entry.path, entry);
    }
    const seen = new Set();
    const excluded = [];
    for (const suppliedDocument of supplied.documents) {
      if (
        !closed(suppliedDocument, ["path", "bytes"]) ||
        !Buffer.isBuffer(suppliedDocument.bytes)
      )
        throw new Error("Invalid native JSON byte view.");
      const entry = expected.get(suppliedDocument.path);
      if (!entry || seen.has(entry.path))
        throw new Error("Missing, duplicate or unexpected native JSON member.");
      seen.add(entry.path);
      admitBytes(suppliedDocument.bytes.length, true);
      // Own the admitted view; later provider-side buffer mutation cannot change
      // what is analyzed or silently detach it from its independent identity.
      const bytes = Buffer.from(suppliedDocument.bytes);
      if (bytes.length !== entry.byteLength || sha256(bytes) !== entry.sha256)
        throw new Error(`Changed native JSON member: ${entry.path}`);
      const policy = definition.formatContract
        ? {
            ...context.policy,
            defaults: {
              ...context.policy.defaults,
              formatContract: definition.formatContract,
            },
          }
        : context.policy;
      const contract = sourcePresentationContract(
        {
          ...jsonContract(entry.path, policy),
          allowFormatWrites: false,
        },
        context,
        entry,
      );
      if (contract.exclude) {
        context.boundaries.push({
          path: entry.path,
          exceptions: contract.exceptions,
        });
        excluded.push(entry.path);
        continue;
      }
      const analysis =
        operation === "inventory"
          ? inventoryDocument(contract, "native")
          : {
              ...(await checkJsonDocument(bytes, contract)),
              representation: "native",
            };
      diagnostics +=
        analysis.findings.length + analysis.expectedFindings.length;
      if (diagnostics > context.limits.maxDiagnostics)
        throw new Error(
          "JSON native diagnostic limit exceeded; coverage is incomplete.",
        );
      documents.push({
        ...analysis,
        contract: inventoryDocument(contract, "native").contract,
        nativeSource: { id: definition.id, identity: entry },
      });
    }
    if (seen.size !== expected.size)
      throw new Error("Undischarged native JSON inventory.");
    sources.push({
      id: definition.id,
      provider: definition.provider,
      owner: definition.owner,
      reason: definition.reason,
      authorities,
      inventoried: expected.size,
      included: documents.filter((d) => d.nativeSource.id === definition.id)
        .length,
      excluded,
    });
  }
  const recheck = () => {
    for (const snapshot of snapshots.values())
      assertSourceUnchanged(context.root, snapshot.path, snapshot.original);
  };
  recheck();
  return {
    documents,
    sources,
    recheck,
    protectedPaths: new Set(
      [...snapshots.values()].map((snapshot) => snapshot.path.toLowerCase()),
    ),
  };
}
