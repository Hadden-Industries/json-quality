import { Writable } from "node:stream";
export declare const PACKAGE_VERIFICATION_CAPABILITIES: Readonly<{
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
}>;
/** Fixed-buffer metadata admission, also used for the copied cold bootstrap.
 * Descriptor and pathname must retain the same regular file observation.
 */
export declare function readPackageMetadataBytes(
  /** @type {*} */ path: any,
): Promise<Buffer<ArrayBuffer>>;
export declare function readPackageMetadata(
  /** @type {*} */ path: any,
): Promise<any>;
/** Native tar's public write/drain/end contract is adapted to a Node Writable.
 * Feed at most 4 KiB compressed input per call, bounding decompressor bursts
 * even when npm's maintained cacache reader supplies chunks up to 64 MiB.
 * No archive/member collection or cache memoization is permitted here.
 */
export declare function packageTarSink(/** @type {*} */ parser: any): Writable;
export declare function verifyPackagePayload(
  /** @type {*} */ npmRequire: any,
  /** @type {*} */ { cache, integrity, installedRoot, admission, signal }: any,
): Promise<{
  files: number;
  bytes: string;
}>;
