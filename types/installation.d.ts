/** Producer-owned source for the minimal cold-install bootstrap in consumers. */
export declare function jsonQualityAcquisitionBootstrap(): string;
/** A consumer bridge may expose public exports only from its isolated install. */
export declare function assertIsolatedJsonQuality(
  /** @type {string | URL} */ toolingRoot: string | URL,
): string;
/** Admit an exact registry version of this package, including an npm alias.
 * @returns {{kind: "registry", version: string}}
 */
export declare function jsonQualitySourceCoordinate(
  /** @type {string} */ specifier: string,
  npmExecutable?: string | undefined,
): {
  kind: "registry";
  version: string;
};
/** Verify installed bytes against npm's independently cached locked payload.
 * This reads native npm's cache; it performs no acquisition, extraction or writes.
 * @param {import("./api-types.js").InstallationOptions} options
 * @returns {Promise<import("./api-types.js").InstallationVerification>}
 */
export declare function verifyJsonQualityInstallation({
  toolingRoot,
  npmExecutable,
  cachePath,
  capacityLimits,
  bootstrapPath,
  signal,
  ...otherOptions
}: import("./api-types.js").InstallationOptions): Promise<
  import("./api-types.js").InstallationVerification
>;
