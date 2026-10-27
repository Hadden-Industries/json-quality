// SPDX-License-Identifier: AGPL-3.0-only
// Typed policy admission and sparse contract resolution. Parsing belongs to the
// shared reader; Ajv owns the complete closed control schema.
import configurationSchema from "../schemas/configuration.schema.json" with { type: "json" };
import { Ajv2020 as Ajv } from "ajv/dist/2020.js";
import { isDeepStrictEqual } from "node:util";
import { posix } from "node:path";
import {
  isJsonLinesPath,
  jsonLinesPresentationContract,
} from "./json-paths.js";

// Closed local schema: no remote references, defaults or coercion.
/** @type {import("ajv").ValidateFunction<import("./api-types.js").JsonQualityPolicy>} */
const validatePolicy = new Ajv({ strict: true, allErrors: true }).compile(
  configurationSchema,
);

/** Input is already strictly parsed or caller-owned typed control data.
 * @param {unknown} policy
 * @returns {import("./api-types.js").JsonQualityPolicy}
 */
export function admitJsonPolicy(policy) {
  if (!validatePolicy(policy))
    throw new Error(
      `Invalid JSON policy structure: ${JSON.stringify(validatePolicy.errors)}`,
    );
  for (const rule of policy.preserveSourcePresentation ?? [])
    assertPolicyPatterns(rule.paths);
  for (const rule of policy.exceptions) {
    if (
      (rule.expected || rule.formatContract === "preserved-bytes") &&
      (!rule.expected ||
        rule.allowFormatWrites !== false ||
        rule.paths.length !== 1 ||
        /[*?[\]{}()]/u.test(rule.paths[0]))
    )
      throw new Error(
        "Preserved bytes and expected diagnostics require one exact protected path and independent byte identity.",
      );
    if (rule.normalization === "preserve" && rule.allowFormatWrites !== false)
      throw new Error(
        "A normalization preservation exception must prohibit generic writes.",
      );
    if (rule.preserveNfcValues) {
      assertNfcPreservationContract(rule);
      if (rule.paths.length !== 1 || /[*?[\]{}()]/u.test(rule.paths[0]))
        throw new Error(
          "NFC value preservation requires one exact protected file.",
        );
      const records = isJsonLinesPath(rule.paths[0]);
      const identities = new Set();
      for (const pin of rule.preserveNfcValues) {
        if (Boolean(pin.record) !== records)
          throw new Error(
            "JSONL NFC preservation requires a record selector; document preservation forbids it.",
          );
        // json-identity-contract: ordered-tuple; owner: NFC preservation policy; reason: Decoded pointer and optional record selector are an ordered tuple of validated strings.
        const identity = JSON.stringify([
          pin.record?.pointer,
          pin.record?.value,
          pin.pointer,
        ]);
        if (identities.has(identity))
          throw new Error("Duplicate NFC preservation location.");
        identities.add(identity);
      }
    }
    assertPolicyPatterns(rule.paths);
    if (
      rule.exclude &&
      Object.keys(rule).some(
        (key) => !["paths", "owner", "reason", "exclude"].includes(key),
      )
    )
      throw new Error("An external boundary cannot also redefine JSON checks.");
  }
  return policy;
}

function assertPolicyPatterns(/** @type {*} */ patterns) {
  for (const pattern of patterns)
    if (
      pattern.startsWith("/") ||
      pattern.includes("\\") ||
      pattern.includes(":") ||
      pattern
        .split("/")
        .some((/** @type {*} */ part) => part === ".." || part === "." || !part)
    )
      throw new Error(`Unsafe JSON exception pattern: ${pattern}`);
}

/** Sparse exceptions amend mandatory defaults; contradictory overlaps fail closed.
 * @param {string} path
 * @param {import("./api-types.js").JsonQualityPolicy} policy
 * @param {{tracked?: boolean}} [options]
 * @returns {import("./api-types.js").JsonContract}
 */
export function jsonContract(path, policy, { tracked = false } = {}) {
  const /** @type {any} */ contract = {
      path,
      ...policy.defaults,
      exclude: false,
      exceptions: [],
    };
  const explicit = new Map();
  for (const rule of policy.exceptions) {
    if (
      !rule.paths.some((/** @type {*} */ pattern) =>
        posix.matchesGlob(path, pattern),
      )
    )
      continue;
    contract.exceptions.push({ owner: rule.owner, reason: rule.reason });
    for (const key of /** @type {const} */ ([
      "formatContract",
      "allowFormatWrites",
      "exclude",
      "normalization",
      "preserveNfcValues",
      "allowEmptyKeys",
      "expected",
    ])) {
      if (rule[key] === undefined) continue;
      const value =
        key === "allowEmptyKeys" ? [...rule[key]].sort() : rule[key];
      if (explicit.has(key) && !isDeepStrictEqual(explicit.get(key), value))
        throw new Error(`Conflicting JSON exceptions: ${path}: ${key}`);
      explicit.set(key, value);
      contract[key] = value;
    }
  }
  // Installed-tree boundaries never conceal a repository-owned tracked file.
  if (tracked && contract.exclude) {
    contract.exclude = false;
    contract.allowFormatWrites = false;
  }
  // JSON Lines has a framing-owned single-line presentation and is never
  // rewritten by a document formatter. Only deviations need classification.
  if (isJsonLinesPath(path)) {
    contract.formatContract = jsonLinesPresentationContract(
      path,
      explicit.has("formatContract") ? contract.formatContract : undefined,
    );
    contract.allowFormatWrites = false;
  }
  // A producer's presentation contract assigns writes to that producer even
  // when its sparse exception does not repeat the default write setting.
  if (contract.formatContract !== "prettier-json")
    contract.allowFormatWrites = false;
  return contract;
}

const validateNfcValues = new Ajv({ strict: true }).compile({
  ...configurationSchema.$defs.nfcValues,
  $defs: configurationSchema.$defs,
});

/** Narrow value preservation is independently pinned, owner-attributed and
 * write-protected. It cannot coexist with whole-file or expected-negative waivers.
 */
export function assertNfcPreservationContract(/** @type {*} */ contract) {
  if (!contract.preserveNfcValues) return;
  if (
    !validateNfcValues(contract.preserveNfcValues) ||
    contract.allowFormatWrites !== false ||
    contract.normalization === "preserve" ||
    contract.expected?.diagnostics?.length ||
    !(
      (contract.owner?.trim() && contract.reason?.trim()) ||
      contract.exceptions?.some(
        (/** @type {*} */ entry) => entry.owner?.trim() && entry.reason?.trim(),
      )
    )
  )
    throw new TypeError(
      "Invalid protected owner/reason NFC value-preservation contract.",
    );
}
