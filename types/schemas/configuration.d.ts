/* SPDX-License-Identifier: AGPL-3.0-only
 * Generated from the exported JSON Schema; run npm run build:types. */

/**
 * @minItems 1
 *
 * This interface was referenced by `JsonQualityPolicy`'s JSON-Schema
 * via the `definition` "nfcValues".
 */
export type NfcValues = [
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
 * This interface was referenced by `JsonQualityPolicy`'s JSON-Schema
 * via the `definition` "positiveIntegerText".
 */
export type PositiveIntegerText = string;
/**
 * Canonical unsigned decimal integer, at most UINT64_MAX. Native storage and operation-specific ranges are checked independently.
 *
 * This interface was referenced by `JsonQualityPolicy`'s JSON-Schema
 * via the `definition` "unsignedIntegerText".
 */
export type UnsignedIntegerText = string;

export interface JsonQualityPolicy {
  /**
   * @minItems 1
   */
  preserveSourcePresentation?: [
    {
      /**
       * @minItems 1
       */
      paths: [string, ...string[]];
      owner: string;
      reason: string;
    },
    ...{
      /**
       * @minItems 1
       */
      paths: [string, ...string[]];
      owner: string;
      reason: string;
    }[],
  ];
  /**
   * Caller-owned admission quotas. False removes all quotas, true selects configured/default quotas, and an object overrides only named fields. Null removes an individual quota. Invocation controls govern bootstrap.
   */
  capacityLimits?: boolean | CapacityLimits;
  schemaVersion: 3;
  defaults: {
    formatContract: "prettier-json";
    allowFormatWrites: true;
    normalization: "NFC";
  };
  exceptions: {
    /**
     * @minItems 1
     */
    paths: [string, ...string[]];
    owner: string;
    reason: string;
    exclude?: true;
    allowFormatWrites?: false;
    normalization?: "preserve";
    preserveNfcValues?: NfcValues;
    /**
     * @minItems 1
     */
    allowEmptyKeys?: [string, ...string[]];
    formatContract?:
      | "producer-json-body"
      | "producer-json-indent"
      | "producer-json-indent-body"
      | "producer-json-compact"
      | "producer-json-compact-body"
      | "preserved-bytes";
    expected?: {
      /**
       * @minItems 1
       */
      linkedDocuments?: [
        {
          path: string;
          pointer: string;
          encoding: "utf8" | "base64";
          sha256: string;
          byteLength: UnsignedIntegerText;
        },
        ...{
          path: string;
          pointer: string;
          encoding: "utf8" | "base64";
          sha256: string;
          byteLength: UnsignedIntegerText;
        }[],
      ];
      sha256: string;
      byteLength: UnsignedIntegerText;
      diagnostics: DiagnosticIdentity[];
    };
  }[];
  nativeSources?: {
    id: string;
    provider: string;
    owner: string;
    reason: string;
    parameters?: {
      [k: string]: unknown | undefined;
    };
    minimumDocuments?: number;
    formatContract?:
      | "prettier-json"
      | "producer-json-body"
      | "producer-json-indent"
      | "producer-json-indent-body"
      | "producer-json-compact"
      | "producer-json-compact-body";
  }[];
  runtimeControls?: boolean | RuntimeControls;
  /**
   * Caller-owned quotas for this operation. False removes every quota; null removes an individual quota; an object overrides only its named fields.
   */
  transformControls?: boolean | TransformControls;
}
/**
 * This interface was referenced by `JsonQualityPolicy`'s JSON-Schema
 * via the `definition` "capacityLimits".
 */
export interface CapacityLimits {
  maxFiles?: number | null;
  maxFileBytes?: number | null;
  maxTotalBytes?: number | null;
  maxLogicalDocuments?: number | null;
  maxRecords?: number | null;
  maxDiagnostics?: number | null;
  maxPolicyBytes?: number | null;
  maxGitOutputBytes?: number | null;
  maxToolOutputBytes?: number | null;
  maxToolTimeMs?: number | null;
  maxGitTimeMs?: number | null;
  maxAcquisitionTimeMs?: number | null;
  maxCacheLookupTimeMs?: number | null;
  maxCacheOutputBytes?: number | null;
  maxRequestIdCharacters?: number | null;
  maxRequestBytes?: number | null;
  maxRequestPathCharacters?: number | null;
}
/**
 * This interface was referenced by `JsonQualityPolicy`'s JSON-Schema
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
 * This interface was referenced by `JsonQualityPolicy`'s JSON-Schema
 * via the `definition` "runtimeControls".
 */
export interface RuntimeControls {
  managedMemoryTargetBytes?: number | null;
  maxTemporaryBytes?: number | null;
  maxNestingDepth?: number | null;
  maxCheckTimeMs?: number | null;
}
/**
 * This interface was referenced by `JsonQualityPolicy`'s JSON-Schema
 * via the `definition` "transformControls".
 */
export interface TransformControls {
  maximumSourceBytes?: number | null;
  maximumOutputBytes?: number | null;
  maximumNormalizationChanges?: number | null;
  maximumWritePaths?: number | null;
}
/**
 * This interface was referenced by `JsonQualityPolicy`'s JSON-Schema
 * via the `definition` "sourceExpectation".
 */
export interface SourceExpectation {
  sha256: string;
  byteLength: UnsignedIntegerText;
  diagnostics: DiagnosticIdentity[];
}
/**
 * This interface was referenced by `JsonQualityPolicy`'s JSON-Schema
 * via the `definition` "producerControls".
 */
export interface ProducerControls {
  maximumDepth?: number | null;
  maximumMembers?: number | null;
}
/**
 * This interface was referenced by `JsonQualityPolicy`'s JSON-Schema
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
