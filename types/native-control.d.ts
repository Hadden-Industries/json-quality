/** Encode plain control data within the fixed protocol envelope. The caller
 * owns the input objects; this boundary bounds its additional transport copies.
 * Accessors, custom serialization and cyclic data are not a control contract.
 */
export declare function encodeNativeControl(
  /** @type {*} */ input: any,
  /** @type {number | null} */ maximum?: number | null,
): Buffer<ArrayBuffer>;
