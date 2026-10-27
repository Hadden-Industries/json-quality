/* SPDX-License-Identifier: AGPL-3.0-only
 * Generated from the exported JSON Schema; run npm run build:types. */

/**
 * One delivered event. Absence of the applicable terminal means incomplete delivery. Serialized reference identities are labels, never access capabilities.
 */
export type JsonQualityEvent = {
  qualification?: {
    trustedSha: string;
    candidateSha: string;
    trustedPolicyBlob: string;
    scope: "immutable-git-json";
  };
  schemaVersion: 2;
  requestId: string;
  type:
    | "source"
    | "value"
    | "finding"
    | "terminal"
    | "execution"
    | "execution-terminal"
    | "failure"
    | "write-preflight"
    | "written"
    | "write-terminal"
    | "write-failure";
  path?: string;
  source?: SourceReference;
  reference?: ValueReference;
  value?: ValueReference | null;
  parent?: ValueReference | null;
  name?: ValueReference | null;
  scope?: "source" | "candidate";
  linkedExpectationsComplete?: boolean;
  byteLength?: UnsignedIntegerText;
  sha256?: string | null;
  ordinal?: UnsignedIntegerText;
  record?: PositiveIntegerText;
  rawByteLength?: UnsignedIntegerText;
  sourceByteOffset?: UnsignedIntegerText;
  nfcByteLength?: UnsignedIntegerText;
  closed?: boolean;
  nfcAvailable?: boolean;
  valueKind?:
    | "string"
    | "key"
    | "number"
    | "true"
    | "false"
    | "null"
    | "array"
    | "object";
  kind?:
    | "string"
    | "key"
    | "number"
    | "true"
    | "false"
    | "null"
    | "array"
    | "object";
  severity?: "error";
  phase?:
    "bytes" | "syntax" | "lint" | "framing" | "expectation" | "presentation";
  ruleId?: string | null;
  messageId?: string;
  arguments?: {
    [k: string]: unknown | undefined;
  };
  line?: PositiveIntegerText;
  column?: PositiveIntegerText;
  endLine?: PositiveIntegerText;
  endColumn?: PositiveIntegerText;
  parserComplete?: boolean;
  rulesComplete?: boolean;
  semanticRulesApplicable?: boolean;
  presentationSelected?: boolean;
  presentationChecked?: boolean;
  diagnosticsComplete?: boolean;
  qualityPassed?: boolean;
  contractSatisfied?: boolean;
  inventoryComplete?: boolean;
  sourceObservationsComplete?: boolean;
  expectedMatched?: boolean | null;
  domainAdmission?: "unassessed";
  domainComplete?: false;
  findings?: UnsignedIntegerText;
  managedPeakBytes?: UnsignedIntegerText;
  transitions?: UnsignedIntegerText;
  scratchPeakBytes?: UnsignedIntegerText;
  members?: UnsignedIntegerText;
  recordCount?: UnsignedIntegerText | null;
  sourceSha256?: string;
  diagnosticSha256?: string;
  policySha256?: string;
  coreSourceInputsSha256?: string;
  linkage?: {
    containerSource: SourceReference;
    value: ValueReference;
    encoding: "utf8" | "base64";
  };
  resources?: {
    admission: {
      maxFiles: PositiveIntegerText | null;
      maxFileBytes: PositiveIntegerText | null;
      maxTotalBytes: PositiveIntegerText | null;
      maxLogicalDocuments: PositiveIntegerText | null;
      maxRecords: PositiveIntegerText | null;
      maxDiagnostics: PositiveIntegerText | null;
      maxPolicyBytes: PositiveIntegerText | null;
      maxGitOutputBytes: PositiveIntegerText | null;
      maxToolOutputBytes: PositiveIntegerText | null;
      maxToolTimeMs: PositiveIntegerText | null;
      maxGitTimeMs: PositiveIntegerText | null;
      maxAcquisitionTimeMs: PositiveIntegerText | null;
      maxCacheLookupTimeMs: PositiveIntegerText | null;
      maxCacheOutputBytes: PositiveIntegerText | null;
      maxRequestIdCharacters: PositiveIntegerText | null;
      maxRequestBytes: PositiveIntegerText | null;
      maxRequestPathCharacters: PositiveIntegerText | null;
    };
    runtime: {
      managedMemoryTargetBytes: PositiveIntegerText;
      maxTemporaryBytes: PositiveIntegerText;
      maxNestingDepth: PositiveIntegerText;
      maxCheckTimeMs: PositiveIntegerText;
      maxConcurrency: PositiveIntegerText;
    };
  };
  code?: string;
  message?: string;
  truncated?: boolean;
  complete?: boolean;
  operation?: "format" | "normalize";
  selected?: UnsignedIntegerText;
  changed?: UnsignedIntegerText;
  written?: UnsignedIntegerText;
  preflightComplete?: boolean;
  writesComplete?: boolean;
  uncertainPath?: string | null;
} & (
  | {
      schemaVersion?: unknown;
      requestId?: unknown;
      source: unknown;
      path?: unknown;
      scope?: unknown;
      linkedExpectationsComplete?: unknown;
      byteLength?: unknown;
      sha256?: string;
      type?: "source";
    }
  | {
      schemaVersion?: unknown;
      requestId?: unknown;
      source: unknown;
      reference: unknown;
      parent: unknown;
      name: unknown;
      ordinal: unknown;
      kind: unknown;
      byteLength: unknown;
      sha256: unknown;
      closed: unknown;
      rawByteLength: unknown;
      sourceByteOffset: unknown;
      nfcAvailable: unknown;
      path?: unknown;
      scope?: unknown;
      linkedExpectationsComplete?: unknown;
      record?: unknown;
      nfcByteLength?: unknown;
      type?: "value";
    }
  | {
      schemaVersion?: unknown;
      requestId?: unknown;
      source: unknown;
      value: unknown;
      severity: unknown;
      phase: unknown;
      ruleId: unknown;
      messageId: unknown;
      arguments: unknown;
      line: unknown;
      column: unknown;
      endLine: unknown;
      endColumn: unknown;
      path?: unknown;
      scope?: unknown;
      linkedExpectationsComplete?: unknown;
      record?: unknown;
      type?: "finding";
    }
  | {
      schemaVersion?: unknown;
      requestId?: unknown;
      source: unknown;
      parserComplete: unknown;
      rulesComplete: unknown;
      semanticRulesApplicable: unknown;
      presentationSelected: unknown;
      presentationChecked: unknown;
      diagnosticsComplete: unknown;
      domainAdmission: unknown;
      qualityPassed: unknown;
      expectedMatched: unknown;
      contractSatisfied: unknown;
      findings: unknown;
      diagnosticSha256: unknown;
      sourceSha256: unknown;
      managedPeakBytes: unknown;
      transitions: unknown;
      scratchPeakBytes: unknown;
      path?: unknown;
      scope?: unknown;
      linkedExpectationsComplete?: unknown;
      recordCount?: unknown;
      linkage?: unknown;
      type?: "terminal";
    }
  | {
      schemaVersion?: unknown;
      requestId?: unknown;
      resources: unknown;
      policySha256: unknown;
      coreSourceInputsSha256: unknown;
      qualification?: unknown;
      type?: "execution";
    }
  | {
      schemaVersion?: unknown;
      requestId?: unknown;
      inventoryComplete: unknown;
      qualification?: unknown;
      linkedExpectationsComplete: unknown;
      sourceObservationsComplete: unknown;
      diagnosticsComplete: unknown;
      domainComplete: unknown;
      members: unknown;
      qualityPassed: unknown;
      contractSatisfied: unknown;
      type?: "execution-terminal";
    }
  | {
      schemaVersion?: unknown;
      requestId?: unknown;
      code: unknown;
      message: unknown;
      truncated: unknown;
      type?: "failure";
    }
  | {
      schemaVersion: unknown;
      requestId: unknown;
      type: "write-preflight";
      operation: unknown;
      selected: unknown;
      changed: unknown;
      preflightComplete: true;
    }
  | {
      schemaVersion: unknown;
      requestId: unknown;
      type: "written";
      operation: unknown;
      path: unknown;
      byteLength: unknown;
      sha256: unknown;
    }
  | {
      schemaVersion: unknown;
      requestId: unknown;
      type: "write-terminal";
      operation: unknown;
      selected: unknown;
      changed: unknown;
      written: unknown;
      complete: true;
      writesComplete: true;
      preflightComplete: true;
      sourceObservationsComplete: true;
    }
  | {
      schemaVersion: unknown;
      requestId: unknown;
      type: "write-failure";
      operation: unknown;
      complete: false;
      preflightComplete: unknown;
      written: unknown;
      uncertainPath: unknown;
      message: unknown;
    }
);
/**
 * Canonical unsigned decimal integer, at most UINT64_MAX. Native storage and operation-specific ranges are checked independently.
 *
 * This interface was referenced by `undefined`'s JSON-Schema
 * via the `definition` "unsignedIntegerText".
 */
export type UnsignedIntegerText = string;
/**
 * Canonical positive decimal integer, at most UINT64_MAX. Native storage and operation-specific ranges are checked independently.
 *
 * This interface was referenced by `undefined`'s JSON-Schema
 * via the `definition` "positiveIntegerText".
 */
export type PositiveIntegerText = string;
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
 * This interface was referenced by `undefined`'s JSON-Schema
 * via the `definition` "sourceReference".
 */
export interface SourceReference {
  kind: "source";
  identity: string;
  byteLength?: UnsignedIntegerText;
  sha256?: string;
}
/**
 * This interface was referenced by `undefined`'s JSON-Schema
 * via the `definition` "valueReference".
 */
export interface ValueReference {
  kind: "value";
  identity: string;
  byteLength?: UnsignedIntegerText;
  sha256?: string | null;
  ordinal?: UnsignedIntegerText;
  record?: PositiveIntegerText;
  rawByteLength?: UnsignedIntegerText;
  sourceByteOffset?: UnsignedIntegerText;
  nfcByteLength?: UnsignedIntegerText;
  closed?: boolean;
  nfcAvailable?: boolean;
  valueKind?:
    | "string"
    | "key"
    | "number"
    | "true"
    | "false"
    | "null"
    | "array"
    | "object";
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
 * This interface was referenced by `undefined`'s JSON-Schema
 * via the `definition` "sourceExpectation".
 */
export interface SourceExpectation {
  sha256: string;
  byteLength: UnsignedIntegerText;
  diagnostics: DiagnosticIdentity[];
}
