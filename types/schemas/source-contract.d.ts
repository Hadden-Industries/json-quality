/* SPDX-License-Identifier: AGPL-3.0-only
 * Generated from the exported JSON Schema; run npm run build:types. */

/**
 * Selected complete source quality contract. Payload bytes travel separately as a backpressured stream. No compatibility with whole-document requests.
 */
export type JsonSourceContract = {
  path?: string;
  format?: "json" | "jsonl";
  formatContract?:
    | "prettier-json"
    | "producer-json-body"
    | "producer-json-indent"
    | "producer-json-indent-body"
    | "producer-json-compact"
    | "producer-json-compact-body"
    | "preserved-bytes";
  normalization?: "NFC" | "preserve";
  /**
   * @minItems 1
   */
  allowEmptyKeys?: [string, ...string[]];
  allowSourceRewrites?: false;
  owner?: string;
  reason?: string;
  nfcExemptStringValues?: NfcExemptStringValuePins;
  expected?: SourceExpectation;
};
/**
 * @minItems 1
 *
 * This interface was referenced by `undefined`'s JSON-Schema
 * via the `definition` "nfcExemptStringValuePins".
 */
export type NfcExemptStringValuePins = [
  {
    pointer: string;
    sha256: string;
    byteLength: PositiveIntegerText;
    record?: {
      pointer: string;
      value: string;
    };
  },
  ...{
    pointer: string;
    sha256: string;
    byteLength: PositiveIntegerText;
    record?: {
      pointer: string;
      value: string;
    };
  }[],
];
/**
 * Canonical positive decimal integer, at most UINT64_MAX. Native storage and operation-specific ranges are checked independently.
 *
 * This interface was referenced by `undefined`'s JSON-Schema
 * via the `definition` "positiveIntegerText".
 */
export type PositiveIntegerText = string;
/**
 * Canonical unsigned decimal integer, at most UINT64_MAX. Native storage and operation-specific ranges are checked independently.
 *
 * This interface was referenced by `undefined`'s JSON-Schema
 * via the `definition` "unsignedIntegerText".
 */
export type UnsignedIntegerText = string;

/**
 * This interface was referenced by `undefined`'s JSON-Schema
 * via the `definition` "sourceExpectation".
 */
export interface SourceExpectation {
  sha256: string;
  byteLength: UnsignedIntegerText;
  diagnostics: DiagnosticIdentity[];
}
/**
 * This interface was referenced by `undefined`'s JSON-Schema
 * via the `definition` "diagnosticIdentity".
 */
export interface DiagnosticIdentity {
  phase: "bytes" | "syntax" | "lint" | "framing";
  ruleId: string | null;
  messageId: string;
  line: PositiveIntegerText;
  column: PositiveIntegerText;
  endLine: PositiveIntegerText;
  endColumn: PositiveIntegerText;
  record?: PositiveIntegerText;
  severity: "error";
  codePoint?: string;
}
/**
 * Caller-selected resource controls. Null disables an individual quota; false selects no package quotas. Numeric controls remain enforceable. Finite streaming buffers are independent of aggregate quotas.
 *
 * This interface was referenced by `undefined`'s JSON-Schema
 * via the `definition` "runtimeControls".
 */
export interface RuntimeControls {
  maxManagedMemoryBytes?: number | null;
  maxTemporaryBytes?: number | null;
  maxNestingDepth?: number | null;
  maxCheckTimeMs?: number | null;
  terminationGraceMs?: number | null;
}
/**
 * This interface was referenced by `undefined`'s JSON-Schema
 * via the `definition` "capacityLimits".
 */
export interface CapacityLimits {
  maxPhysicalAndNativeSources?: number | null;
  maxSourceBytes?: number | null;
  maxTotalSourceBytes?: number | null;
  maxNativeLogicalAndTransformedSources?: number | null;
  maxRecords?: number | null;
  maxDiagnostics?: number | null;
  maxPolicyBytes?: number | null;
  maxGitOutputBytes?: number | null;
  maxToolOutputBytes?: number | null;
  maxToolTimeMs?: number | null;
  maxGitTimeMs?: number | null;
  maxRequestIdCodePoints?: number | null;
  maxRequestBytes?: number | null;
  maxRequestPathCodePoints?: number | null;
  maxHumanPathCodePoints?: number | null;
  maxHumanPointerCodePoints?: number | null;
}
/**
 * This interface was referenced by `undefined`'s JSON-Schema
 * via the `definition` "transformControls".
 */
export interface TransformControls {
  maximumSourceBytes?: number | null;
  maximumOutputBytes?: number | null;
  maximumNormalizationChanges?: number | null;
  maximumWritePaths?: number | null;
}
/**
 * This interface was referenced by `undefined`'s JSON-Schema
 * via the `definition` "producerControls".
 */
export interface ProducerControls {
  maximumDepth?: number | null;
  maximumTotalValues?: number | null;
}
/**
 * This interface was referenced by `undefined`'s JSON-Schema
 * via the `definition` "verificationControls".
 */
export interface VerificationControls {
  maximumArchiveBytes?: number | null;
  maximumMemberBytes?: number | null;
  maximumExpandedBytes?: number | null;
  maximumMembers?: number | null;
  maximumIndexBytes?: number | null;
  maximumMetadataBytes?: number | null;
  maximumArchiveMetadataBytes?: number | null;
  maximumPathBytes?: number | null;
  maximumDepth?: number | null;
  maximumVerificationTimeMs?: number | null;
  maximumDecompressionRatio?: number | null;
}
/**
 * This interface was referenced by `undefined`'s JSON-Schema
 * via the `definition` "installationControls".
 */
export interface InstallationControls {
  maximumPackageFamilyFiles?: number | null;
  maximumPackageFamilyBytes?: number | null;
  maxCacheLookupTimeMs?: number | null;
  maxCacheOutputBytes?: number | null;
}
/**
 * This interface was referenced by `undefined`'s JSON-Schema
 * via the `definition` "acquisitionControls".
 */
export interface AcquisitionControls {
  maxAcquisitionTimeMs?: number | null;
}
