/** A virtual filename supplies identity, never a file to read or replace. */
export declare function stdinContract(
  /** @type {*} */ contract: any | undefined,
  /** @type {*} */ path: any,
): import("../types/schemas/source-contract.js").JsonSourceContract;
/** Check existing ancestors without opening virtual target contents. */
export declare function assertVirtualSourcePath(
  /** @type {*} */ root: any,
  /** @type {*} */ path: any,
): void;
/** Internal CLI source operation. It returns source bytes only after cleanup. */
export declare function executeStdinOperation(
  /** @type {*} */ options: any,
  /** @type {*} */ { emit, ready }?: any,
): Promise<
  | {
      terminal: import("../types/schemas/event.js").JsonQualityEvent;
      refused?: undefined;
      message?: undefined;
      output?: undefined;
      qualityPassed?: undefined;
      findingCount?: undefined;
    }
  | {
      terminal?: undefined;
      refused: boolean;
      message: string;
      output?: undefined;
      qualityPassed?: undefined;
      findingCount?: undefined;
    }
  | {
      terminal?: undefined;
      refused?: undefined;
      message?: undefined;
      output: Buffer<any>;
      qualityPassed: any;
      findingCount: any;
    }
>;
