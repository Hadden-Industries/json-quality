/** Compose independently selected time quotas without inventing a default cap. */
export declare function minimumDuration(
  /** @type {(number | string | null)[]} */ ...values: (
    number | string | null
  )[]
): number | null;
/** Keep aggregate accounting across phases without creating an overflowed timer. */
export declare function remainingDuration(
  /** @type {number | string | null} */ maximum: number | string | null,
  /** @type {number} */ began: number,
  now?: number,
): number | null;
/** A caller-owned lifetime: dispose after settlement, or abort through a parent.
 * Large finite selections use representable timer slices; null creates no timer.
 */
export declare function createExecutionDeadline(
  /** @type {number | string | null} */ maximum: number | string | null,
  /** @type {(AbortSignal | undefined)[]} */ signals?: (
    AbortSignal | undefined
  )[],
  /** @type {{now?: () => number, schedule?: (callback: () => void, delay: number) => any, clear?: (timer: any) => void, began?: number}} */ {
    now,
    schedule,
    clear,
    began,
  }?: {
    now?: () => number;
    schedule?: (callback: () => void, delay: number) => any;
    clear?: (timer: any) => void;
    began?: number;
  },
): Readonly<{
  signal: AbortSignal;
  remaining(): number | null;
  dispose(): void;
}>;
