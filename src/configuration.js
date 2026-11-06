// SPDX-License-Identifier: AGPL-3.0-only
// Typed policy admission and sparse contract resolution. Parsing belongs to the
// shared reader; Ajv owns the complete closed control schema.
import configurationSchema from "../schemas/configuration.schema.json" with { type: "json" };
import effectiveSchema from "../schemas/effective-policy.schema.json" with { type: "json" };
import packagedDefaults from "../assets/default-json-quality-policy.json" with { type: "json" };
import {
  freezeControl,
  readControlOptions,
  snapshotControl,
} from "./control-snapshot.js";
import { resolveExecutionResources } from "./execution-resources.js";
import { Ajv2020 as Ajv } from "ajv/dist/2020.js";
import { isDeepStrictEqual } from "node:util";
import { posix } from "node:path";
import {
  isJsonLinesPath,
  jsonLinesPresentationContract,
} from "./json-paths.js";

// Closed local schema: no remote references, defaults or coercion.
const ajv = new Ajv({ strict: true, allErrors: true }).addSchema(
  configurationSchema,
);
const validateConfiguration =
  /** @type {import('ajv').ValidateFunction<import('./api-types.js').JsonQualityConfiguration>} */ (
    ajv.getSchema(configurationSchema.$id)
  );
const validatePolicy =
  /** @type {import('ajv').ValidateFunction<import('./api-types.js').JsonQualityPolicy>} */ (
    ajv.compile(effectiveSchema)
  );

/** Package-owned immutable value, distinct from every resolved caller snapshot. */
const defaultsSnapshot = snapshotControl(packagedDefaults);
/** @type {import('./api-types.js').ReadonlyJsonQualityPolicy} */
export const defaultJsonQualityPolicy = freezeControl(defaultsSnapshot.value);
export const defaultPolicyReservationBytes =
  defaultsSnapshot.managedReservationBytes;

/** Resolve sparse plain configuration without I/O or caller-code execution.
 * Invocation-owned limits apply before untrusted configuration can select its
 * later execution limits. Workspace estimates bound this call, not JS heap.
 * @param {unknown} [configuration]
 * @param {{capacityLimits?: import('./api-types.js').CapacityLimits, runtimeControls?: import('./api-types.js').RuntimeControls}} [options]
 * @returns {import('./api-types.js').ReadonlyJsonQualityPolicy}
 */
export function resolveJsonQualityPolicy(configuration, options = {}) {
  return resolvePolicySnapshot(configuration, options).policy;
}

/** Internal accounting result used by the native bootstrap owner. */
export function resolvePolicySnapshot(
  /** @type {*} */ configuration,
  /** @type {*} */ options = {},
) {
  const began = performance.now(),
    safeOptions = readControlOptions(options, [
      "capacityLimits",
      "runtimeControls",
    ]),
    resources = resolveExecutionResources({}, safeOptions),
    limits = {
      maximumBytes: resources.admission.maxPolicyBytes,
      maximumDepth: resources.runtime.maxNestingDepth,
      maximumManagedBytes: resources.runtime.maxManagedMemoryBytes,
      deadline:
        resources.runtime.maxCheckTimeMs === null
          ? Infinity
          : began + resources.runtime.maxCheckTimeMs,
    },
    input = snapshotControl(
      configuration === undefined ? {} : configuration,
      limits,
    );
  if (!validateConfiguration(input.value))
    throw new TypeError(
      `Invalid JSON configuration; use configuration schema v4 and current option names: ${JSON.stringify(validateConfiguration.errors)}`,
    );
  const merged = {
    ...defaultJsonQualityPolicy,
    ...input.value,
    defaults: { ...defaultJsonQualityPolicy.defaults, ...input.value.defaults },
  };
  // The intermediate merge references only the owned input and frozen defaults.
  // Charge its distinct root/default nodes as well as the input while copying.
  const effective = snapshotControl(merged, {
    ...limits,
    retainedManagedBytes: input.managedReservationBytes + 512n,
  });
  assertValidJsonQualityPolicy(effective.value);
  if (performance.now() > limits.deadline)
    throw new Error("policy-check-time-capacity");
  freezeControl(effective.value);
  return {
    policy: effective.value,
    managedReservationBytes: effective.managedReservationBytes,
    workspaceReservationBytes:
      input.managedReservationBytes + effective.managedReservationBytes + 512n,
  };
}

/** Input is already strictly parsed or caller-owned typed control data.
 * @param {unknown} policy
 * @returns {import("./api-types.js").JsonQualityPolicy}
 */
function assertValidJsonQualityPolicy(policy) {
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
        rule.allowSourceRewrites !== false ||
        rule.paths.length !== 1 ||
        /[*?[\]{}()]/u.test(rule.paths[0]))
    )
      throw new Error(
        "Preserved bytes and expected diagnostics require one exact protected path and independent byte identity.",
      );
    if (rule.nfcExemptStringValues) {
      assertNfcPreservationContract(rule);
      if (rule.paths.length !== 1 || /[*?[\]{}()]/u.test(rule.paths[0]))
        throw new Error(
          "NFC value preservation requires one exact protected file.",
        );
      const records = isJsonLinesPath(rule.paths[0]);
      const identities = new Set();
      for (const pin of rule.nfcExemptStringValues) {
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
      rule.excludeUntrackedSources &&
      Object.keys(rule).some(
        (key) =>
          !["paths", "owner", "reason", "excludeUntrackedSources"].includes(
            key,
          ),
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
 * @param {import("./api-types.js").ReadonlyJsonQualityPolicy} policy
 * @param {{tracked?: boolean}} [options]
 * @returns {import("./api-types.js").JsonContract}
 */
export function resolveJsonSourceContract(
  path,
  policy,
  { tracked = false } = {},
) {
  const /** @type {any} */ contract = {
      path,
      ...policy.defaults,
      excludeUntrackedSources: false,
      exceptions: [],
    };
  const parts = path.split("/");
  const external = parts.some((part) =>
    ["node_modules", ".git"].includes(
      process.platform === "win32" ? part.toLowerCase() : part,
    ),
  );
  if (external) {
    contract.excludeUntrackedSources = true;
    contract.exceptions.push({
      owner: "Dependency/VCS installation",
      reason: "Package-owned external source boundary.",
    });
  }
  const basename =
    process.platform === "win32"
      ? (parts.at(-1) ?? "").toLowerCase()
      : (parts.at(-1) ?? "");
  const npmLock = ["package-lock.json", "npm-shrinkwrap.json"].includes(
    basename,
  );
  if (npmLock) {
    contract.formatContract = "producer-json-indent";
    contract.allowSourceRewrites = false;
    contract.allowEmptyKeys = ["/packages/"];
    contract.exceptions.push({
      owner: "npm",
      reason: "npm owns lockfile serialization and source rewrites.",
    });
  }
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
      "allowSourceRewrites",
      "excludeUntrackedSources",
      "normalization",
      "nfcExemptStringValues",
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
  if (npmLock) contract.allowSourceRewrites = false;
  // Installed-tree boundaries never conceal a repository-owned tracked file.
  if (tracked && contract.excludeUntrackedSources) {
    contract.excludeUntrackedSources = false;
    contract.allowSourceRewrites = false;
  }
  // JSON Lines has a framing-owned single-line presentation and is never
  // rewritten by a document formatter. Only deviations need classification.
  if (isJsonLinesPath(path)) {
    contract.formatContract = jsonLinesPresentationContract(
      path,
      explicit.has("formatContract") ? contract.formatContract : undefined,
    );
    contract.allowSourceRewrites = false;
  }
  // A producer's presentation contract assigns writes to that producer even
  // when its sparse exception does not repeat the default write setting.
  if (contract.formatContract !== "prettier-json")
    contract.allowSourceRewrites = false;
  return contract;
}

const validateNfcValues = new Ajv({ strict: true }).compile({
  ...configurationSchema.$defs.nfcExemptStringValuePins,
  $defs: configurationSchema.$defs,
});

/** Narrow value preservation is independently pinned, owner-attributed and
 * write-protected. It cannot coexist with whole-file or expected-negative waivers.
 */
export function assertNfcPreservationContract(/** @type {*} */ contract) {
  if (!contract.nfcExemptStringValues) return;
  if (
    !validateNfcValues(contract.nfcExemptStringValues) ||
    contract.allowSourceRewrites !== false ||
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
