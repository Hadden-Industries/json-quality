export declare function policyProvenance(
  /** @type {*} */ configurationOrigin: any,
  /** @type {*} */ member: any,
): Readonly<{
  configurationOrigin: any;
  defaultPolicySha256: string;
  policyResolverInputsSha256: string;
  configurationByteLength?: any;
  configurationBytesSha256?: any;
  policyInputsSha256: string;
}>;
