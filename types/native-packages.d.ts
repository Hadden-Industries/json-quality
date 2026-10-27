/** @type {Record<string, {package: string, os: string[], cpu: string[], libc?: string[], executable: string}>} */
export declare const nativePackages: Record<
  string,
  {
    package: string;
    os: string[];
    cpu: string[];
    libc?: string[];
    executable: string;
  }
>;
export declare function nativePlatformSpec(): {
  platform: string;
  spec: {
    package: string;
    os: string[];
    cpu: string[];
    libc?: string[];
    executable: string;
  };
};
export declare function resolveNativePackage(
  /** @type {*} */ coreRoot: any,
  /** @type {*} */ verificationControls?: any,
  /** @type {*} */ signal?: any,
): Promise<{
  platform: string;
  spec: {
    package: string;
    os: string[];
    cpu: string[];
    libc?: string[];
    executable: string;
  };
  metadata: any;
  metadataPath: string;
  directory: string;
}>;
