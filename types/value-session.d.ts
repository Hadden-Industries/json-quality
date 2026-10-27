declare class ValueSession {
  #private;
  constructor(
    /** @type {*} */ core: any,
    /** @type {*} */ { captureOwner, ownsCore }?: any,
  );
  /** Logical identity remains stable across repeated projections and backing
   * transitions. Object identity is not a persistent reference contract.
   */
  sameReference(
    /** @type {*} */ left: any,
    /** @type {*} */ right: any,
  ): boolean;
  /** Internal projection seam for the trusted repository controller. It holds
   * one current source capability; callers own any retained earlier handles.
   * Repository census/terminal order remains with that controller.
   */
  projectRepositoryEvents(
    /** @type {*} */ events: any,
  ): AsyncGenerator<any, void, unknown>;
  /** Freeze identified source bytes, then deliver bounded events with consumer
   * backpressure. References belong to this open session, including across spill.
   * Ending iteration before its terminal cancels the incomplete check. Retained
   * references are caller-owned capabilities; collecting them is caller state.
   */
  check(
    /** @type {*} */ chunks: any,
    /** @type {*} */ contract?: any,
    /** @type {*} */ {
      identity,
      includeValues,
      retainValues,
      signal,
      transformOf,
    }?: any,
  ): AsyncGenerator<any, void, unknown>;
  /** Select an unambiguous decoded JSON Pointer in a completed retained source.
   * JSONL requires the exact physical record number in canonical decimal form.
   */
  select(
    /** @type {*} */ source: any,
    pointer?: string,
    /** @type {*} */ record?: any,
  ): Promise<any>;
  /** Internal provider view: mint from actual captured census membership, never
   * from a caller's raw native ID or claimed payload identity.
   */
  capturedSource(/** @type {*} */ path: any): Promise<any>;
  /** Describe the same scoped value, including exact raw byte span for explicit
   * bounded transformations. This never materializes its JSON or decoded body.
   */
  describe(/** @type {*} */ value: any): Promise<any>;
  /** Iterate immediate object members or array elements in source order,
   * retaining one indexed descriptor at a time. Member names are scoped value
   * references, so oversized names need no complete JS string. A completed
   * retained source is required; duplicate object members remain distinct.
   */
  children(/** @type {*} */ value: any): AsyncGenerator<
    Readonly<{
      value: any;
      name: any;
      ordinal: any;
    }>,
    void,
    unknown
  >;
  /** Resolve an identified UTF-8 pointer stream, including giant member names,
   * without a complete JS string or a giant control frame. The raw pointer and
   * decoded lookup segment use the same accounted adaptive native store.
   */
  selectStream(
    /** @type {*} */ source: any,
    /** @type {*} */ chunks: any,
    /** @type {*} */ { identity, record, signal }?: any,
  ): Promise<any>;
  /** Read a bounded range of raw JSON, decoded UTF-8, NFC UTF-8 or JSON Pointer
   * bytes. Offsets and lengths use canonical unsigned decimal strings.
   */
  read(
    /** @type {*} */ value: any,
    /** @type {*} */ representation: any,
    offset?: string,
    maximum?: string,
  ): Promise<{
    bytes: any;
    offset: any;
    totalByteLength: any;
  }>;
  /** Read identified original source bytes, including whitespace and rejected
   * input. Source access makes no claim that parsing or domain checks passed.
   */
  readSource(
    /** @type {*} */ source: any,
    offset?: string,
    maximum?: string,
  ): Promise<{
    bytes: any;
    offset: any;
    totalByteLength: any;
  }>;
  sourceFragments(
    /** @type {*} */ source: any,
  ): AsyncGenerator<any, void, unknown>;
  /** Stream a representation with one bounded native response at a time. */
  fragments(
    /** @type {*} */ value: any,
    /** @type {*} */ representation: any,
  ): AsyncGenerator<any, void, unknown>;
  /** Reserve one explicit materialization against the shared managed ledger.
   * The caller owns the lease until release, must stop using its borrowed bytes
   * then, and must explicitly copy any data that needs a longer lifetime.
   */
  materialize(
    /** @type {*} */ value: any,
    /** @type {*} */ representation: any,
    /** @type {*} */ maximum: any,
  ): Promise<
    Readonly<{
      managedReservationBytes: any;
      readonly bytes: any;
      release: () => Promise<void>;
    }>
  >;
  /** Explicit bounded JSON control/domain bridge, after complete positive shared
   * quality admission. Ajv or another complete domain validator remains caller
   * owned. Conservative byte/node reservation precedes JSON object allocation.
   * transfer moves the independent object and its accounting obligation to the
   * caller; it does not extend a borrowed native value's lifetime.
   */
  materializeControl(
    /** @type {*} */ value: any,
    /** @type {*} */ maximum: any,
    /** @type {*} */ validate: any,
  ): Promise<
    Readonly<{
      readonly value: any;
      managedReservationBytes: any;
      release(): Promise<void>;
      transfer(): Promise<{
        value: any;
        managedReservationBytes: any;
      }>;
    }>
  >;
  cancel(): void;
  close(): any;
}
/** Internal composition seam: the supplied core is already verified/configured.
 * Kept outside supported package exports; public factories own acquisition.
 */
export declare function createValueSession(
  /** @type {*} */ core: any,
): ValueSession;
/** Internal writer view over the execution owner's existing configured core.
 * It cannot close that owner. Raw capture provenance stays within this seam;
 * the supported facade exposes neither constructor nor native identifiers.
 */
export declare function createTransformValueSession(
  /** @type {*} */ core: any,
  /** @type {*} */ captureOwner: any,
): ValueSession;
/** A trusted metadata reader shares its execution's core and allocation ledger,
 * while settlement invalidates only this borrowed view and its own leases.
 */
export declare function createBorrowedValueSession(
  /** @type {*} */ core: any,
): ValueSession;
export {};
