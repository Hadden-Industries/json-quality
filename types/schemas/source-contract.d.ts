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
  allowFormatWrites?: false;
  owner?: string;
  reason?: string;
  preserveNfcValues?: NfcValues;
  expected?: SourceExpectation;
};
/**
 * @minItems 1
 *
 * This interface was referenced by `undefined`'s JSON-Schema
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
 * Finite working controls for one execution. Admission bypass never disables these controls. The first native cohort admits one active checker under its aggregate target.
 *
 * This interface was referenced by `undefined`'s JSON-Schema
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
 * This interface was referenced by `undefined`'s JSON-Schema
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
