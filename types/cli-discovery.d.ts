export declare function packageVersion(): string;
/** Strict syntactic parsing with conflicting singleton options rejected. */
export declare function parseCliArguments(
  /** @type {string[]} */ args: string[],
  /** @type {*} */ options: any,
  allowPositionals?: boolean,
): {
  values:
    | {
        [x: string]: (string | boolean | (string | boolean)[] | undefined) &
          (string | boolean | (string | boolean)[]);
      }
    | {};
  positionals: string[] | [];
  tokens: (
    | {
        kind: "option";
        index: number;
        name: string;
        rawName: string;
        value: string;
        inlineValue: boolean;
      }
    | {
        kind: "option";
        index: number;
        name: never;
        rawName: string;
        value: string;
        inlineValue: boolean;
      }
    | {
        kind: "option";
        index: number;
        name: string;
        rawName: string;
        value: undefined;
        inlineValue: undefined;
      }
    | {
        kind: "option";
        index: number;
        name: never;
        rawName: string;
        value: undefined;
        inlineValue: undefined;
      }
    | {
        kind: "positional";
        index: number;
        value: string;
      }
    | {
        kind: "option-terminator";
        index: number;
      }
    | (
        | {
            kind: "option";
            index: number;
            name: string;
            rawName: string;
            value: string;
            inlineValue: boolean;
          }
        | {
            kind: "option";
            index: number;
            name: string;
            rawName: string;
            value: undefined;
            inlineValue: undefined;
          }
      )
    | ((
        | {
            kind: "option";
            index: number;
            name: string;
            rawName: string;
            value: string;
            inlineValue: boolean;
          }
        | {
            kind: "option";
            index: number;
            name: string;
            rawName: string;
            value: undefined;
            inlineValue: undefined;
          }
      ) & {
        name: string;
      })
    | ((
        | {
            kind: "option";
            index: number;
            name: string;
            rawName: string;
            value: string;
            inlineValue: boolean;
          }
        | {
            kind: "option";
            index: number;
            name: string;
            rawName: string;
            value: undefined;
            inlineValue: undefined;
          }
      ) & {
        name: never;
      })
  )[];
};
/** Positionals contains file arguments only; command is removed. */
export declare function discoverCli(/** @type {string[]} */ args: string[]):
  | {
      command: string;
      values: Record<string, any>;
      positionals: string[];
      discovery: string;
    }
  | {
      discovery?: undefined;
      command: string;
      values: Record<string, any>;
      positionals: string[];
    };
