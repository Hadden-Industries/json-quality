import { Writable } from "node:stream";
export declare const PACKAGE_VERIFICATION_CAPABILITIES: {
  readonly [
    K in keyof Required<
      import("../types/schemas/configuration.js").VerificationControls
    >
  ]: number;
};
export declare function verificationResources(
  /** @type {*} */ selected: any,
): any;
/** Incremental metadata admission, also used for the copied cold bootstrap.
 * Descriptor and pathname must retain the same regular file observation.
 */
export declare function readPackageMetadataBytes(
  /** @type {*} */ path: any,
  /** @type {*} */ verificationControls?: any,
  /** @type {*} */ signal?: any,
): Promise<Buffer<ArrayBuffer>>;
export declare function readPackageMetadata(
  /** @type {*} */ path: any,
  /** @type {*} */ verificationControls?: any,
  /** @type {*} */ signal?: any,
): Promise<any>;
/** Native tar's public write/drain/end contract is adapted to a Node Writable.
 * Feed at most 4 KiB compressed input per call, bounding decompressor bursts
 * even when npm's maintained cacache reader supplies chunks up to 64 MiB.
 * No archive/member collection or cache memoization is permitted here.
 */
export declare function packageTarSink(/** @type {*} */ parser: any): Writable;
export declare function verifyPackagePayload(
  /** @type {*} */ npmRequire: any,
  /** @type {*} */ {
    cache,
    integrity,
    installedRoot,
    admission,
    signal,
    verificationControls,
  }: any,
): Promise<{
  files: number;
  bytes: string;
}>;
