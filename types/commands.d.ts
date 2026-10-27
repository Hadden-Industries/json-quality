export declare const limitFlag: (/** @type {*} */ name: any) => any;
export declare const RESOURCE_OPTIONS: any;
export declare const RUNTIME_OPTIONS: any;
export declare function resourceCliLimits(
  /** @type {*} */ values: any,
  encoded?: string | undefined,
): any;
export declare function resourceCliControls(
  /** @type {*} */ values: any,
  encoded?: string | undefined,
): {
  capacityLimits: any;
  runtimeControls: any;
};
export declare const COMMANDS: Readonly<{
  check: "Check complete repository obligations and deliver final execution evidence.";
  source: "Check raw stdin bytes under an explicit source contract; no repository policy.";
  format: "Preflight the complete repository and explicitly format writable physical sources.";
  normalize: "Preflight complete candidate obligations and NFC-repair explicit physical paths.";
}>;
export declare const CLI_OPTIONS: any;
export declare function transformCliControls(/** @type {*} */ values: any): any;
export declare function commandHelp(): string;
