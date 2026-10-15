// Extracted from Universal Ontology 015a356e1fac8bcea3fcfb213954a191ab6f6851.
// SPDX-License-Identifier: AGPL-3.0-only
import { decodeJsonBytes } from "./json-bytes.js";
import { jsonLinesPresentationContract } from "./presentation.js";
import configurationSchema from "../schemas/configuration.schema.json" with { type: "json" };
import { isDeepStrictEqual } from "node:util";
/** Shared native JSON contracts. Selection belongs to .json-quality.json;
 * presentation options belong to this package. Consumers retain semantics.
 */
import { readFileSync, lstatSync } from "node:fs";
import { join } from "node:path";
import { posix } from "node:path";
import { ESLint } from "eslint";
import json from "@eslint/json";
import Ajv from "ajv";
import { operationLimits } from "./limits.js";
import { createHash } from "node:crypto";
import { jsonPointerToken } from "./json-pointers.js";

const STRICT_JSON_EXTENSIONS = Object.freeze(["json", "jsonld", "sarif"]);
export const JSON_SUFFIX = new RegExp(
  `\\.(?:${[...STRICT_JSON_EXTENSIONS, "jsonc", "json5", "jsonl", "ndjson"].join("|")})$`,
  "iu",
);
export const STRICT_JSON_GLOBS = STRICT_JSON_EXTENSIONS.map(
  (extension) => `**/*.${extension}`,
);

/** Discovery also detects unsupported dialects; qualification stays strict. */
export function isStrictJsonPath(path) {
  return STRICT_JSON_EXTENSIONS.some((extension) =>
    path.endsWith(`.${extension}`),
  );
}

/** JSONL is strict JSON per record; JSONC/JSON5 remain unsupported. */
export function isJsonLinesPath(path) {
  return path.endsWith(".jsonl") || path.endsWith(".ndjson");
}
const BASE_RULES = Object.freeze({
  "json/no-duplicate-keys": "error",
  "json/no-unsafe-values": "error",
  "json-quality/interoperability": "error",
  // Native key autofixes have no whole-object collision preflight.
  "json/no-unnormalized-keys": "off",
});

// Isolate runtime admission from later customization of the public schema data.
const EMPTY_KEY_POINTERS = structuredClone(
  configurationSchema.properties.exceptions.items.properties.allowEmptyKeys,
);

/** Compare the exact decimal integer, without binary64 rounding or exponent expansion. */
function isUnsafeInteger(raw) {
  const [, integer, fraction = "", exponent = "0"] = raw.match(
    /^-?(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/u,
  );
  let digits = (integer + fraction).replace(/^0+/u, "");
  if (!digits) return false;
  const significant = digits.replace(/0+$/u, "");
  const scale =
    BigInt(exponent) -
    BigInt(fraction.length) +
    BigInt(digits.length - significant.length);
  digits = significant;
  if (scale < 0n) return false;
  const length = BigInt(digits.length) + scale;
  if (length !== 16n) return length > 16n;
  return digits.padEnd(16, "0") > "9007199254740991";
}

/** Resolve only exceptional empty keys; ordinary keys need no ancestor walk. */
function memberPointer(sourceCode, member) {
  const parts = [];
  for (let node = member; node; node = sourceCode.getParent(node)) {
    if (node.type === "Member") parts.push(jsonPointerToken(node.name.value));
    else if (node.type === "Element")
      parts.push(String(sourceCode.getParent(node).elements.indexOf(node)));
  }
  return `/${parts.reverse().join("/")}`;
}

/** Analyze the native JSON AST once; lint and source/producer fixes share it. */
function inspectNormalization(document, collectValues = false) {
  const changes = [];
  const collisions = [];
  const valueStrings = new Map();
  const pending = [{ node: document.body, kind: "value", pointer: "" }];
  while (pending.length) {
    const { node, kind, pointer } = pending.pop();
    if (node.type === "String") {
      if (collectValues && kind === "value") valueStrings.set(pointer, node);
      const normalized = node.value.normalize("NFC");
      if (normalized !== node.value) changes.push({ node, kind, normalized });
    } else if (node.type === "Object") {
      const names = new Map();
      for (const member of node.members) {
        const normalized = member.name.value.normalize("NFC");
        const prior = names.get(normalized);
        if (prior && prior.value !== member.name.value)
          collisions.push({ node: member.name });
        names.set(normalized, member.name);
        pending.push({ node: member.name, kind: "key" });
        pending.push({
          node: member.value,
          kind: "value",
          pointer: collectValues
            ? `${pointer}/${jsonPointerToken(member.name.value)}`
            : "",
        });
      }
    } else if (node.type === "Array") {
      for (const [index, element] of node.elements.entries())
        pending.push({
          node: element.value,
          kind: "value",
          pointer: collectValues ? `${pointer}/${index}` : "",
        });
    }
  }
  return { changes, collisions, valueStrings };
}

const qualityPlugin = {
  rules: {
    "meaningful-keys": {
      meta: {
        type: "problem",
        languages: ["json/json"],
        schema: [EMPTY_KEY_POINTERS],
        messages: {
          empty:
            "Empty or whitespace-only JSON key; fix its owning source or producer.",
          whitespace:
            "JSON key has leading or trailing whitespace; fix its owning source or producer without automatic trimming.",
        },
      },
      create(context) {
        const allowed = new Set(context.options[0] ?? []);
        return {
          Member(node) {
            const key = node.name.value;
            if (!key.trim()) {
              // Native no-empty-keys owns the default. With an exception, retain
              // equivalent checking everywhere except its exact decoded pointer.
              if (
                allowed.size &&
                (key !== "" ||
                  !allowed.has(memberPointer(context.sourceCode, node)))
              )
                context.report({ node: node.name, messageId: "empty" });
            } else if (key.trim() !== key)
              context.report({ node: node.name, messageId: "whitespace" });
          },
        };
      },
    },
    interoperability: {
      meta: {
        type: "problem",
        languages: ["json/json"],
        schema: [],
        messages: {
          noncharacter:
            "Unicode noncharacter {{codePoint}} is not interoperable JSON; fix its owning source or producer.",
          integer:
            "The exact integer '{{value}}' is outside the safe integer range, regardless of decimal or exponent spelling.",
        },
      },
      create(context) {
        return {
          String(node) {
            const noncharacters = new Set();
            for (const character of node.value) {
              const point = character.codePointAt(0);
              if (
                (point >= 0xfdd0 && point <= 0xfdef) ||
                point % 0x10000 >= 0xfffe
              )
                noncharacters.add(
                  `U+${point.toString(16).toUpperCase().padStart(4, "0")}`,
                );
            }
            for (const codePoint of noncharacters)
              context.report({
                node,
                messageId: "noncharacter",
                data: { codePoint },
              });
          },
          Number(node) {
            const raw = context.sourceCode.getText(node);
            // The native rule already diagnoses unsafe plain integer literals.
            if (/[.e]/iu.test(raw) && isUnsafeInteger(raw))
              context.report({
                node,
                messageId: "integer",
                data: { value: raw },
              });
          },
        };
      },
    },
    "normalized-strings": {
      meta: {
        type: "problem",
        languages: ["json/json"],
        schema: [
          { enum: ["NFC", "preserve"] },
          configurationSchema.definitions.nfcValues,
        ],
        messages: {
          unnormalized:
            "JSON {{kind}} is not NFC; fix its owning source or producer with collision preflight.",
          collision:
            "NFC would create duplicate keys in this object; resolve the owning source before normalization.",
          preservationMismatch:
            "The NFC preservation value at {{pointer}} is missing or changed; review its owning source and exact preservation identity.",
        },
      },
      create(context) {
        if (context.options[0] === "preserve") return {};
        return {
          Document(document) {
            const { changes, collisions, valueStrings } = inspectNormalization(
              document,
              Boolean(context.options[1]?.length),
            );
            const preserved = new Set();
            for (const pin of context.options[1] ?? []) {
              const node = valueStrings.get(pin.pointer);
              const bytes = node && Buffer.from(node.value, "utf8");
              if (
                node &&
                bytes.length === pin.byteLength &&
                createHash("sha256").update(bytes).digest("hex") === pin.sha256
              )
                preserved.add(node);
              else
                context.report({
                  node: node ?? document.body,
                  messageId: "preservationMismatch",
                  data: { pointer: pin.pointer },
                });
            }
            for (const { node, kind } of changes)
              if (!preserved.has(node))
                context.report({
                  node,
                  messageId: "unnormalized",
                  data: { kind },
                });
            for (const { node } of collisions)
              context.report({ node, messageId: "collision" });
          },
        };
      },
    },
  },
};

function meaningfulKeyRules(allowEmptyKeys) {
  return {
    "json/no-empty-keys": allowEmptyKeys?.length ? "off" : "error",
    "json-quality/meaningful-keys": allowEmptyKeys?.length
      ? ["error", [...allowEmptyKeys].sort()]
      : "error",
  };
}

export function jsonRules(options = {}) {
  if (
    !options ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    Object.keys(options).some(
      (key) => !["normalization", "allowEmptyKeys"].includes(key),
    )
  )
    throw new TypeError(
      "Expected JSON rule options: normalization and allowEmptyKeys.",
    );
  const { normalization = "NFC", allowEmptyKeys } = options;
  if (!["NFC", "preserve"].includes(normalization))
    throw new Error(`Unknown JSON normalization contract: ${normalization}`);
  return {
    ...BASE_RULES,
    ...meaningfulKeyRules(allowEmptyKeys),
    "json-quality/normalized-strings": ["error", normalization],
  };
}

/** Used by repository ESLint, policy bootstrap and rebuilt-package qualification. */
export function jsonLintConfig(files) {
  return [
    {
      files: files.map((file) => file.path),
      plugins: { json, "json-quality": qualityPlugin },
      language: "json/json",
      linterOptions: {
        noInlineConfig: true,
        reportUnusedDisableDirectives: "error",
      },
      rules: jsonRules(),
    },
    ...(files.some((file) => file.normalization === "preserve")
      ? [
          {
            files: files
              .filter((file) => file.normalization === "preserve")
              .map((file) => file.path),
            rules: { "json-quality/normalized-strings": ["error", "preserve"] },
          },
        ]
      : []),
    ...files
      .filter((file) => file.preserveNfcValues?.length)
      .map((file) => ({
        files: [file.path],
        rules: {
          "json-quality/normalized-strings": [
            "error",
            "NFC",
            file.preserveNfcValues,
          ],
        },
      })),
    ...files
      .filter((file) => file.allowEmptyKeys?.length)
      .map((file) => ({
        files: [file.path],
        rules: meaningfulKeyRules(file.allowEmptyKeys),
      })),
  ];
}

// Closed local schema: no remote references, defaults or coercion.
const validatePolicy = new Ajv({ strict: true, allErrors: true }).compile(
  configurationSchema,
);

/** Bootstrap independently of repository configuration before parsing policy. */
export async function readJsonPolicy(root, options = {}) {
  if (
    !options ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    Object.keys(options).some((key) => key !== "maxPolicyBytes")
  )
    throw new TypeError("Invalid policy bootstrap options.");
  // Infinity is produced only by an explicit capacity bypass; ordinary overrides
  // retain the schema's positive safe-integer contract.
  const maxPolicyBytes =
    options.maxPolicyBytes === Infinity
      ? Infinity
      : operationLimits({}, options).maxPolicyBytes;
  let text;
  try {
    const stat = lstatSync(join(root, ".json-quality.json"));
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maxPolicyBytes)
      throw new Error(
        "Policy must be a regular file within the selected policy-byte limit.",
      );
    text = decodeJsonBytes(readFileSync(join(root, ".json-quality.json")));
  } catch (error) {
    throw new Error(`.json-quality.json: ${error.message}`, { cause: error });
  }
  const linter = new ESLint({
    cwd: root,
    overrideConfigFile: true,
    overrideConfig: jsonLintConfig([{ path: ".json-quality.json" }]),
  });
  const [result] = await linter.lintText(text, {
    filePath: ".json-quality.json",
  });
  if (result.errorCount || result.warningCount)
    throw new Error(
      "Invalid .json-quality.json: strict JSON admission failed.",
    );
  const policy = JSON.parse(text);
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

function assertPolicyPatterns(patterns) {
  for (const pattern of patterns)
    if (
      pattern.startsWith("/") ||
      pattern.includes("\\") ||
      pattern.includes(":") ||
      pattern.split("/").some((part) => part === ".." || part === "." || !part)
    )
      throw new Error(`Unsafe JSON exception pattern: ${pattern}`);
}

/** Sparse exceptions amend mandatory defaults; contradictory overlaps fail closed. */
export function jsonContract(path, policy, { tracked = false } = {}) {
  const contract = { path, ...policy.defaults, exclude: false, exceptions: [] };
  const explicit = new Map();
  for (const rule of policy.exceptions) {
    if (!rule.paths.some((pattern) => posix.matchesGlob(path, pattern)))
      continue;
    contract.exceptions.push({ owner: rule.owner, reason: rule.reason });
    for (const key of [
      "formatContract",
      "allowFormatWrites",
      "exclude",
      "normalization",
      "preserveNfcValues",
      "allowEmptyKeys",
      "expected",
    ]) {
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

/** Native ESLint discovers ordinary JSON without an admission allowlist. */
export function jsonPolicyLintFiles(policy) {
  return [
    ...STRICT_JSON_GLOBS.map((path) => ({ path, ...policy.defaults })),
    ...policy.exceptions
      .filter(
        (rule) =>
          rule.normalization || rule.allowEmptyKeys || rule.preserveNfcValues,
      )
      .flatMap((rule) =>
        rule.paths.map((path) => ({ path, ...policy.defaults, ...rule })),
      ),
  ];
}

/** Pure source/producer operation: never writes or reserializes non-string tokens.
 * Callers own source selection, regeneration, semantic validation and publication.
 */
export async function normalizeJsonSource(
  text,
  { normalization = "NFC", allowEmptyKeys, preserveNfcValues } = {},
) {
  if (normalization !== "NFC" || preserveNfcValues?.length)
    throw new Error("Preserved JSON string identity cannot be normalized.");
  const linter = new ESLint({
    overrideConfigFile: true,
    overrideConfig: jsonLintConfig([
      {
        path: "source.json",
        normalization: "preserve",
        allowEmptyKeys,
      },
    ]),
  });
  const [result] = await linter.lintText(text, { filePath: "source.json" });
  if (result.errorCount || result.warningCount)
    throw new Error("Cannot normalize invalid or unsafe JSON source.");
  const parsed = json.languages.json.parse({ body: text });
  if (!parsed.ok) throw new Error("Cannot normalize invalid JSON source.");
  const { changes, collisions } = inspectNormalization(parsed.ast);
  if (collisions.length)
    throw new Error(
      "NFC would create duplicate keys; resolve the owning source first.",
    );
  const chunks = [];
  let cursor = 0;
  for (const { node, normalized } of changes.sort(
    (left, right) => left.node.range[0] - right.node.range[0],
  )) {
    chunks.push(text.slice(cursor, node.range[0]), JSON.stringify(normalized));
    cursor = node.range[1];
  }
  chunks.push(text.slice(cursor));
  return chunks.join("");
}

const validateNfcValues = new Ajv({ strict: true }).compile(
  configurationSchema.definitions.nfcValues,
);

/** Narrow value preservation is independently pinned, owner-attributed and
 * write-protected. It cannot coexist with whole-file or expected-negative waivers.
 */
export function assertNfcPreservationContract(contract) {
  if (!contract.preserveNfcValues) return;
  if (
    !validateNfcValues(contract.preserveNfcValues) ||
    contract.allowFormatWrites !== false ||
    contract.normalization === "preserve" ||
    contract.expected?.diagnostics?.length ||
    !(
      (contract.owner?.trim() && contract.reason?.trim()) ||
      contract.exceptions?.some(
        (entry) => entry.owner?.trim() && entry.reason?.trim(),
      )
    )
  )
    throw new TypeError(
      "Invalid protected owner/reason NFC value-preservation contract.",
    );
}
