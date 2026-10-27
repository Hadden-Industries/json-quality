import { NativeSession } from "./native-session.js";
/** Own bootstrap, immutable policy, aggregate elapsed time, retained policy
 * charge, repository checks and cleanup. Providers are trusted injected code.
 * The component comes only from the verified acquisition owner. No installation
 * or download happens here, and no check acquires source-write authority.
 */
export declare function createRepositoryExecution(
  /** @type {*} */ {
    root,
    component,
    temporaryDirectory,
    capacityLimits,
    runtimeControls,
    nativeProviders,
    logicalProviders,
    requiredOutputs,
    gitExecutable,
    signal,
    retainValues,
  }: any,
): Promise<{
  core: NativeSession;
  contractFor: (
    path: any,
    source?: any,
  ) => import("./api-types.js").JsonContract;
  policyObservation: any;
  policyTransformControls: any;
  controlStateBytes: any;
  numericResources: {
    admission: any;
    runtime: any;
  };
  resources: Readonly<{
    admission: Readonly<{
      [k: string]: string | null;
    }>;
    runtime: Readonly<{
      [k: string]: string | null;
    }>;
  }>;
  signal: AbortSignal;
  close: () => Promise<void>;
  events(): AsyncGenerator<any, void, unknown>;
}>;
/** Ordinary execution owns its lifetime through final event consumption.
 * Advanced sessions compose the same controller and close explicitly.
 */
export declare function executeRepositoryCheck(
  /** @type {*} */ options: any,
): AsyncGenerator<any, void, unknown>;
