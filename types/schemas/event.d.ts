/* SPDX-License-Identifier: AGPL-3.0-only
 * Generated from the exported JSON Schema; run npm run build:types. */

/**
 * One delivered event. Absence of the applicable terminal means incomplete delivery. Serialized reference identities are labels, never access capabilities.
 */
export type JsonQualityEvent = {
  qualification?: {
    trustedCommitId: string;
    candidateCommitId: string;
    trustedPolicyBlobId?: string;
    scope: "immutable-git-json";
  };
  schemaVersion: 5;
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
    | "write-failure"
    | "nfc-key-collision-risk"
    | "normalization-preview-change"
    | "normalization-preview-terminal"
    | "selection"
    | "selection-terminal"
    | "format-preview-change"
    | "format-preview-terminal";
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
  valueKind?: "key" | "string";
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
  findingCount?: UnsignedIntegerText;
  managedPeakBytes?: UnsignedIntegerText;
  spillTransitionCount?: UnsignedIntegerText;
  scratchPeakBytes?: UnsignedIntegerText;
  inventoryMemberCount?: UnsignedIntegerText;
  recordCount?: UnsignedIntegerText | null;
  sourceSha256?: string;
  diagnosticSha256?: string;
  coreSourceInputsSha256?: string;
  linkage?: {
    containerSource: SourceReference;
    value: ValueReference;
    encoding: "utf8" | "base64";
  };
  resources?: {
    admission: {
      maxPhysicalAndNativeSources: PositiveIntegerText | null;
      maxSourceBytes: PositiveIntegerText | null;
      maxTotalSourceBytes: PositiveIntegerText | null;
      maxNativeLogicalAndTransformedSources: PositiveIntegerText | null;
      maxRecords: PositiveIntegerText | null;
      maxDiagnostics: PositiveIntegerText | null;
      maxPolicyBytes: PositiveIntegerText | null;
      maxGitOutputBytes: PositiveIntegerText | null;
      maxToolOutputBytes: PositiveIntegerText | null;
      maxToolTimeMs: PositiveIntegerText | null;
      maxGitTimeMs: PositiveIntegerText | null;
      maxRequestIdCodePoints: PositiveIntegerText | null;
      maxRequestBytes: PositiveIntegerText | null;
      maxRequestPathCodePoints: PositiveIntegerText | null;
      maxHumanPathCodePoints: PositiveIntegerText | null;
      maxHumanPointerCodePoints: PositiveIntegerText | null;
    };
    runtime: {
      maxManagedMemoryBytes: PositiveIntegerText | null;
      maxTemporaryBytes: PositiveIntegerText | null;
      maxNestingDepth: PositiveIntegerText | null;
      maxCheckTimeMs: PositiveIntegerText | null;
      terminationGraceMs: PositiveIntegerText | null;
    };
  };
  code?: string;
  message?: string;
  truncated?: boolean;
  complete?: boolean;
  operation?: "format" | "normalize";
  selectedPathCount?: UnsignedIntegerText;
  changedPathCount?: UnsignedIntegerText;
  preflightComplete?: boolean;
  writesComplete?: boolean;
  uncertainPath?: string | null;
  writtenPathCount?: UnsignedIntegerText;
  configurationOrigin?:
    | {
        kind: "repository-file";
        path: ".json-quality.json";
      }
    | {
        kind: "repository-absence";
        path: ".json-quality.json";
      }
    | {
        kind: "git-blob";
        path: ".json-quality.json";
        commitId: string;
        blobId: string;
      }
    | {
        kind: "git-absence";
        path: ".json-quality.json";
        commitId: string;
      };
  defaultPolicySha256?: string;
  policyResolverInputsSha256?: string;
  configurationBytesSha256?: string;
  policyInputsSha256?: string;
  configurationByteLength?: UnsignedIntegerText;
  formatEligible?: boolean;
  normalizeEligible?: boolean;
  containerValue?: ValueReference;
  priorValue?: ValueReference;
  priorLine?: PositiveIntegerText;
  priorColumn?: PositiveIntegerText;
  priorEndLine?: PositiveIntegerText;
  priorEndColumn?: PositiveIntegerText;
  normalizedSha256?: string;
  normalizedByteLength?: UnsignedIntegerText;
  sourceByteLength?: UnsignedIntegerText;
  pointer?: string;
  icuVersion?: string;
  unicodeVersion?: string;
  decodedByteLength?: UnsignedIntegerText;
  decodedSha256?: string;
  operationScope?: (
    | {
        kind?: "repository";
        policy?: "repository";
        [k: string]: unknown | undefined;
      }
    | {
        kind?: "selected-files";
        policy?: "repository";
        completeRepositoryCheck?: false;
        [k: string]: unknown | undefined;
      }
    | {
        kind?: "stdin";
        policy?: "repository" | "explicit-contract";
        completeRepositoryCheck?: false;
        [k: string]: unknown | undefined;
      }
    | {
        kind?: "immutable-git-json";
        policy?: "trusted-git";
        completeRepositoryCheck?: false;
        [k: string]: unknown | undefined;
      }
  ) & {
    kind: "repository" | "selected-files" | "stdin" | "immutable-git-json";
    policy: "repository" | "explicit-contract" | "trusted-git";
    completeRepositoryCheck: boolean;
  };
  root?: string;
  inputKind?: "physical" | "stdin";
  selectedSourceCount?: PositiveIntegerText;
  completedSourceCount?: UnsignedIntegerText;
  policyObservationComplete?: boolean;
  inputComplete?: boolean;
  changed?: boolean;
  candidateSha256?: string;
  candidateByteLength?: UnsignedIntegerText;
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
      operationScope?: unknown;
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
      operationScope?: unknown;
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
      operationScope?: unknown;
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
      findingCount: unknown;
      diagnosticSha256: unknown;
      sourceSha256: unknown;
      managedPeakBytes: unknown;
      spillTransitionCount: unknown;
      scratchPeakBytes: unknown;
      path?: unknown;
      scope?: unknown;
      linkedExpectationsComplete?: unknown;
      recordCount?: unknown;
      linkage?: unknown;
      type?: "terminal";
      formatEligible: unknown;
      normalizeEligible: unknown;
      operationScope?: unknown;
    }
  | {
      schemaVersion?: unknown;
      requestId?: unknown;
      resources: unknown;
      coreSourceInputsSha256: unknown;
      qualification?: unknown;
      type?: "execution";
      configurationOrigin: unknown;
      defaultPolicySha256: unknown;
      policyResolverInputsSha256: unknown;
      policyInputsSha256: unknown;
      configurationBytesSha256?: unknown;
      configurationByteLength?: unknown;
      operationScope?: unknown;
      root?: unknown;
    }
  | {
      schemaVersion?: unknown;
      requestId?: unknown;
      inventoryComplete: true;
      qualification?: unknown;
      linkedExpectationsComplete: true;
      sourceObservationsComplete: true;
      diagnosticsComplete: true;
      domainComplete: unknown;
      inventoryMemberCount: unknown;
      qualityPassed: unknown;
      contractSatisfied: unknown;
      type?: "execution-terminal";
      operationScope?: unknown;
      root?: unknown;
    }
  | {
      schemaVersion?: unknown;
      requestId?: unknown;
      code: unknown;
      message: unknown;
      truncated: unknown;
      type?: "failure";
      operationScope?: unknown;
    }
  | {
      schemaVersion: unknown;
      requestId: unknown;
      type: "write-preflight";
      operation: unknown;
      selectedPathCount: unknown;
      changedPathCount: unknown;
      preflightComplete: true;
      operationScope?: unknown;
    }
  | {
      schemaVersion: unknown;
      requestId: unknown;
      type: "written";
      operation: unknown;
      path: unknown;
      byteLength: unknown;
      sha256: unknown;
      operationScope?: unknown;
    }
  | {
      schemaVersion: unknown;
      requestId: unknown;
      type: "write-terminal";
      operation: unknown;
      selectedPathCount: unknown;
      changedPathCount: unknown;
      complete: true;
      writesComplete: true;
      preflightComplete: true;
      sourceObservationsComplete: true;
      writtenPathCount: unknown;
      qualityPassed: unknown;
      findingCount: unknown;
      operationScope?: unknown;
    }
  | {
      schemaVersion: unknown;
      requestId: unknown;
      type: "write-failure";
      operation: unknown;
      complete: false;
      preflightComplete: unknown;
      uncertainPath: unknown;
      message: unknown;
      writtenPathCount: unknown;
      operationScope?: unknown;
    }
  | {
      schemaVersion: unknown;
      requestId: unknown;
      source: unknown;
      path?: unknown;
      scope?: unknown;
      linkedExpectationsComplete?: unknown;
      record?: unknown;
      containerValue: unknown;
      value: unknown;
      priorValue: unknown;
      line: unknown;
      column: unknown;
      endLine: unknown;
      endColumn: unknown;
      priorLine: unknown;
      priorColumn: unknown;
      priorEndLine: unknown;
      priorEndColumn: unknown;
      normalizedSha256: unknown;
      normalizedByteLength: unknown;
      type?: "nfc-key-collision-risk";
      operationScope?: unknown;
    }
  | {
      schemaVersion: unknown;
      requestId: unknown;
      operation: unknown;
      path: unknown;
      sourceSha256: unknown;
      sourceByteLength: unknown;
      sourceByteOffset: unknown;
      rawByteLength: unknown;
      pointer: unknown;
      valueKind: unknown;
      normalizedSha256: unknown;
      normalizedByteLength: unknown;
      coreSourceInputsSha256: unknown;
      icuVersion: unknown;
      unicodeVersion: unknown;
      type?: "normalization-preview-change";
      decodedByteLength: unknown;
      decodedSha256: unknown;
      operationScope?: unknown;
    }
  | {
      schemaVersion: unknown;
      requestId: unknown;
      operation: unknown;
      complete: unknown;
      preflightComplete: unknown;
      sourceObservationsComplete: unknown;
      selectedPathCount?: unknown;
      changedPathCount?: unknown;
      qualityPassed?: unknown;
      findingCount?: unknown;
      message?: unknown;
      type?: "normalization-preview-terminal";
      coreSourceInputsSha256: unknown;
      icuVersion: unknown;
      unicodeVersion: unknown;
      operationScope?: unknown;
    }
  | {
      schemaVersion: unknown;
      requestId: unknown;
      operationScope: (
        | {
            kind?: "repository";
            policy?: "repository";
            [k: string]: unknown | undefined;
          }
        | {
            kind?: "selected-files";
            policy?: "repository";
            completeRepositoryCheck?: false;
            [k: string]: unknown | undefined;
          }
        | {
            kind?: "stdin";
            policy?: "repository" | "explicit-contract";
            completeRepositoryCheck?: false;
            [k: string]: unknown | undefined;
          }
        | {
            kind?: "immutable-git-json";
            policy?: "trusted-git";
            completeRepositoryCheck?: false;
            [k: string]: unknown | undefined;
          }
      ) & {
        kind: "selected-files" | "stdin";
        policy: "repository";
        completeRepositoryCheck: false;
      };
      root: unknown;
      inputKind: unknown;
      selectedSourceCount: unknown;
      resources: unknown;
      configurationOrigin: unknown;
      defaultPolicySha256: unknown;
      policyResolverInputsSha256: unknown;
      configurationBytesSha256?: unknown;
      configurationByteLength?: unknown;
      policyInputsSha256: unknown;
      coreSourceInputsSha256: unknown;
      type: "selection";
    }
  | {
      schemaVersion: unknown;
      requestId: unknown;
      operationScope: (
        | {
            kind?: "repository";
            policy?: "repository";
            [k: string]: unknown | undefined;
          }
        | {
            kind?: "selected-files";
            policy?: "repository";
            completeRepositoryCheck?: false;
            [k: string]: unknown | undefined;
          }
        | {
            kind?: "stdin";
            policy?: "repository" | "explicit-contract";
            completeRepositoryCheck?: false;
            [k: string]: unknown | undefined;
          }
        | {
            kind?: "immutable-git-json";
            policy?: "trusted-git";
            completeRepositoryCheck?: false;
            [k: string]: unknown | undefined;
          }
      ) & {
        kind: "selected-files" | "stdin";
        policy: "repository";
        completeRepositoryCheck: false;
      };
      root?: unknown;
      inputKind: unknown;
      selectedSourceCount: unknown;
      completedSourceCount: unknown;
      complete: true;
      diagnosticsComplete: unknown;
      qualityPassed: unknown;
      contractSatisfied: unknown;
      policyObservationComplete: true;
      sourceObservationsComplete?: unknown;
      inputComplete?: unknown;
      findingCount?: unknown;
      coreSourceInputsSha256?: unknown;
      type: "selection-terminal";
    }
  | {
      schemaVersion: unknown;
      requestId: unknown;
      operationScope?: unknown;
      operation: "format";
      path: unknown;
      changed: unknown;
      sourceSha256: unknown;
      sourceByteLength: unknown;
      candidateSha256: unknown;
      candidateByteLength: unknown;
      coreSourceInputsSha256: unknown;
      icuVersion: unknown;
      unicodeVersion: unknown;
      type: "format-preview-change";
    }
  | {
      schemaVersion: unknown;
      requestId: unknown;
      operation: "format";
      complete: true;
      preflightComplete: unknown;
      sourceObservationsComplete: unknown;
      selectedPathCount?: unknown;
      changedPathCount?: unknown;
      qualityPassed?: unknown;
      findingCount?: unknown;
      message?: unknown;
      type?: "format-preview-terminal";
      coreSourceInputsSha256: unknown;
      icuVersion: unknown;
      unicodeVersion: unknown;
      operationScope?: unknown;
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
 * Native refusal identities carried by the existing v5 write-failure message before any replacement.
 *
 * This interface was referenced by `undefined`'s JSON-Schema
 * via the `definition` "rewriteQualityRefusal".
 */
export type RewriteQualityRefusal =
  | "rewrite-unsafe-source"
  | "rewrite-candidate-not-accepted"
  | "rewrite-peer-preflight-failed";

/**
 * This interface was referenced by `undefined`'s JSON-Schema
 * via the `definition` "sourceReference".
 */
export interface SourceReference {
  kind: "source";
  referenceId: string;
  byteLength?: UnsignedIntegerText;
  sha256?: string;
}
/**
 * This interface was referenced by `undefined`'s JSON-Schema
 * via the `definition` "valueReference".
 */
export interface ValueReference {
  kind: "value";
  referenceId: string;
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
