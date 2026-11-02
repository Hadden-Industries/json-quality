export declare const INSTALLATION_RESOURCE_DEFAULTS: Readonly<{
  maximumPackageFamilyFiles: 50000;
  maximumPackageFamilyBytes: 268435456;
  maxCacheLookupTimeMs: 60000;
  maxCacheOutputBytes: 1048576;
}>;
export declare const ACQUISITION_RESOURCE_DEFAULTS: Readonly<{
  maxAcquisitionTimeMs: 1200000;
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
export declare function acquisitionCleanupOptions(
  overrides?: any,
): Record<string, number>;
/** The cold bootstrap cannot import the not-yet-installed package/schema.
 * Its defaults are a checked projection; native validation matches the closed
 * positive-safe-integer resource object. Each operation owns its controls.
 */
export declare function acquisitionResourceLimits(overrides?: any): {
  [k: string]: number;
};
export declare function installationResourceLimits(overrides?: any): {
  [k: string]: number;
};
export declare function verificationResourceLimits(overrides?: any): {
  [k: string]: number;
};
/** Resolve native cache policy once for acquisition and payload checking. */
export declare function nativeQualityCachePath(
  /** @type {*} */ toolingRoot: any,
  /** @type {*} */ npmCliPath: any,
  /** @type {*} */ overrides: any,
): string;
