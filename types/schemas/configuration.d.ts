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
   * Shared operation capacity ceilings. True enables configured/default capacities, false disables them, and an override object enables finite capacities with explicit values. Policy settings apply after admission; invocation capacityLimits controls bootstrap. Separate ESLint, cleanup, workflow and platform controls are outside this setting.
   */
  capacityLimits?: boolean | CapacityLimits;
  schemaVersion: 2;
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
  runtimeControls?: RuntimeControls;
}
/**
 * This interface was referenced by `JsonQualityPolicy`'s JSON-Schema
 * via the `definition` "capacityLimits".
 */
export interface CapacityLimits {
  maxFiles?: number;
  maxFileBytes?: number;
  maxTotalBytes?: number;
  maxLogicalDocuments?: number;
  maxRecords?: number;
  maxDiagnostics?: number;
  maxPolicyBytes?: number;
  maxGitOutputBytes?: number;
  maxToolOutputBytes?: number;
  maxToolTimeMs?: number;
  maxGitTimeMs?: number;
  maxAcquisitionTimeMs?: number;
  maxCacheLookupTimeMs?: number;
  maxCacheOutputBytes?: number;
  maxRequestIdCharacters?: number;
  maxRequestBytes?: number;
  maxRequestPathCharacters?: number;
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
 * Finite working controls for one execution. Admission bypass never disables these controls. The first native cohort admits one active checker under its aggregate target.
 *
 * This interface was referenced by `JsonQualityPolicy`'s JSON-Schema
 * via the `definition` "runtimeControls".
 */
export interface RuntimeControls {
  managedMemoryTargetBytes?: number;
  maxTemporaryBytes?: number;
  maxNestingDepth?: number;
  maxCheckTimeMs?: number;
  maxConcurrency?: number;
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
