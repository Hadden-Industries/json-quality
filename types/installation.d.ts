/** Producer-owned source for the minimal cold-install bootstrap in consumers. */
export declare function readJsonQualityAcquisitionBootstrapSource(): string;
/** A consumer bridge may expose public exports only from its isolated install. */
export declare function assertJsonQualityInstallationRoot(
  /** @type {string | URL} */ toolingRoot: string | URL,
): string;
/** Admit an exact registry version of this package, including an npm alias.
 * @returns {{kind: "registry", version: string}}
 */
export declare function parseJsonQualityRegistrySpecifier(
  /** @type {string} */ specifier: string,
  npmCliPath?: string | undefined,
): {
  kind: "registry";
  version: string;
};
/** Verify installed bytes against npm's independently cached locked payload.
 * This reads native npm's cache; it performs no acquisition, extraction or writes.
 * @param {import("./api-types.js").InstallationVerificationOptions} options
 * @returns {Promise<import("./api-types.js").InstallationVerification>}
 */
export declare function verifyJsonQualityInstallation({
  toolingRoot,
  npmCliPath,
  cachePath,
  installationControls,
  verificationControls,
  bootstrapPath,
  signal,
  ...otherOptions
}: import("./api-types.js").InstallationVerificationOptions): Promise<
  import("./api-types.js").InstallationVerification
>;
