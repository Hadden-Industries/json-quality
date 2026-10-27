/** Stage only an already admitted bounded candidate. Rehash actual staged bytes
 * and recheck the original descriptor/path identity before rename. Permissions
 * are preserved; batches have no atomicity guarantee. Hostile concurrent path
 * replacement outside these observations is outside the supported guarantee.
 */
export declare function replaceObservedSource(
  /** @type {*} */ {
    root,
    member,
    candidate,
    chunks,
    signal,
    transformControls,
  }: any,
): Promise<{
  path: any;
  byteLength: any;
  sha256: any;
  observation: any;
}>;
