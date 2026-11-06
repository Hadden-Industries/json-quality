export declare const policyInputInventoryPath =
  "assets/json-quality-policy-inputs.json";
export declare const policyResolverEntryPoints: readonly string[];
export declare const policyResolverResources: readonly string[];
export type PolicyInputInventory = {
  schemaVersion: 1;
  files: string[];
  dependencies: string[];
};
/** @typedef {{schemaVersion: 1, files: string[], dependencies: string[]}} PolicyInputInventory */
/** Validate the shipped inventory without executing a module or a build tool.
 * @returns {PolicyInputInventory}
 */
export declare function readPolicyInputInventory(
  directory?: string,
): PolicyInputInventory;
/** Fingerprint current bytes and relevant declared runtime dependencies.
 * Package release identity and installed-payload verification remain separate.
 */
export declare function policyResolverFingerprint(directory?: string): string;
