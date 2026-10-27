export declare function resourceDefaults(
  /** @type {string} */ name: string,
): Readonly<{
  [k: string]: any;
}>;
/** Null is the only unlimited sentinel; representation failures remain errors. */
export declare function exceedsQuota(
  /** @type {*} */ value: any,
  /** @type {*} */ maximum: any,
): boolean;
export declare function minimumQuota(
  /** @type {(number | null)[]} */ ...values: (number | null)[]
): number | null;
export declare function resolveResourceProfile(
  /** @type {Record<string, number>} */ defaults: Record<string, number>,
  /** @type {*} */ policy: any,
  /** @type {*} */ invocation: any,
): any;
