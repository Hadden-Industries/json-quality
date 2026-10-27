import { retainedTransformResult } from "./transform-capabilities.js";
export declare function formatSource(
  text: string,
  options: {
    core: unknown;
    [key: string]: unknown;
  },
): Promise<ReturnType<typeof retainedTransformResult>>;
export declare function formatSource(
  text: string,
  options: {
    core?: undefined;
    [key: string]: unknown;
  },
): Promise<string>;
