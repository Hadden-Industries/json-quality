/** Stream an independent logical inventory; exact pointer selection and payload
 * decoding belong to the native checker, without a JS container/body copy.
 */
export declare function checkLogicalProvider(
  /** @type {*} */ {
    session,
    inventory,
    definition,
    contractFor,
    signal,
    retainValues,
    retainValuesFor,
  }: any,
): AsyncGenerator<any, void, unknown>;
