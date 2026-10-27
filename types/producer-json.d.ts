export declare const JSON_PRODUCER_CAPABILITIES: Readonly<{
  maximumDepth: 32;
  maximumMembers: 65536;
  maximumEncodedBytes: 2097152;
}>;
/** Admit plain JSON data without evaluating accessors/custom serialization or
 * accepting native JSON.stringify's lossy unsupported-value conversions. Input
 * objects and reflection metadata belong to the producer; this helper does not
 * promise scalable traversal of a pre-existing JavaScript object graph.
 */
export declare function serializeProducerJson(
  /** @type {*} */ value: any,
): string;
