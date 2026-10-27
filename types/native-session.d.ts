/** Encode one bounded wire frame, without accepting payload data as control. */
export declare function nativeFrame(
  /** @type {*} */ kind: any,
  /** @type {Buffer<ArrayBufferLike>} */ body?: Buffer<ArrayBufferLike>,
): Buffer<ArrayBuffer>;
/** Decode at most two complete bounded response frames from a native exchange. */
export declare function decodeNativeFrames(/** @type {*} */ bytes: any): any[];
/** One configured execution, with serialized bounded exchanges and explicit
 * cleanup. The component has already passed the acquisition/identity boundary.
 * Inputs must cooperate with cancellation; close settles started work first.
 */
export declare class NativeSession {
  #private;
  hello: any;
  constructor(/** @type {*} */ component: any, /** @type {*} */ scratch: any);
  command(
    /** @type {*} */ command: any,
    /** @type {*} */ fields?: any,
  ): Promise<{
    result: any;
    data: any;
  }>;
  configure(/** @type {*} */ resources?: any): Promise<{
    result: any;
    data: any;
  }>;
  capture(
    /** @type {*} */ input: any,
    /** @type {*} */ contract?: any,
    /** @type {*} */ {
      includeValueEvents,
      retainValues,
      identity,
      sourceKind,
      transformOf,
    }?: any,
  ): Promise<any>;
  events(): AsyncGenerator<any, void, unknown>;
  read(
    /** @type {*} */ value: any,
    /** @type {*} */ representation: any,
    offset?: string,
    maximum?: string,
  ): Promise<{
    result: any;
    data: any;
  }>;
  cancel(): void;
  close(): any;
}
