export declare const ACQUISITION_RESOURCE_DEFAULTS: Readonly<{
  maxFiles: 50000;
  maxFileBytes: 33554432;
  maxTotalBytes: 268435456;
  maxLogicalDocuments: 100000;
  maxRecords: 100000;
  maxDiagnostics: 10000;
  maxPolicyBytes: 1048576;
  maxGitOutputBytes: 67108864;
  maxToolOutputBytes: 67108864;
  maxToolTimeMs: 120000;
  maxGitTimeMs: 120000;
  maxAcquisitionTimeMs: 1200000;
  maxCacheLookupTimeMs: 60000;
  maxCacheOutputBytes: 1048576;
  maxRequestIdCharacters: 1024;
  maxRequestBytes: 50331648;
  maxRequestPathCharacters: 32768;
}>;
export declare const VERIFICATION_RESOURCE_DEFAULTS: Readonly<{
  maximumArchiveBytes: 134217728;
  maximumMemberBytes: 134217728;
  maximumExpandedBytes: 536870912;
  maximumMembers: 8192;
  maximumIndexBytes: 4194304;
  maximumMetadataBytes: 1048576;
  maximumArchiveMetadataBytes: 4096;
  maximumPathBytes: 32768;
  maximumDepth: 64;
  maximumVerificationTimeMs: 120000;
  maximumDecompressionRatio: 128;
}>;
/** Only the explicitly scoped capacity environment contract is admitted. */
export declare function capacityLimitsEnvironment(): string | undefined;
/** Native cleanup retry strategy is independently configurable, including zero retries. */
export declare function acquisitionCleanupOptions(overrides?: any): any;
/** The cold bootstrap cannot import the not-yet-installed package/schema.
 * Its defaults are a checked projection; native validation matches the closed
 * positive-safe-integer resource object. Only capacity controls are accepted.
 */
export declare function acquisitionResourceLimits(overrides?: any): {
  [x: string]: any;
};
/** Resolve native cache policy once for acquisition and payload checking. */
export declare function nativeQualityCachePath(
  /** @type {*} */ toolingRoot: any,
  /** @type {*} */ npmExecutable: any,
  /** @type {*} */ overrides: any,
): string;
