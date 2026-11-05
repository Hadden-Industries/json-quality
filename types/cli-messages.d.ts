/** Project numeric or wire resource snapshots into presentation-only controls. */
export declare function humanDisplayControls(/** @type {*} */ resources: any): {
  maxPathCodePoints: number | null | undefined;
  maxPointerCodePoints: number | null | undefined;
};
/** Bound before escaping; never serialize arbitrary event values or arguments. */
export declare function escapeHumanText(
  /** @type {*} */ value: any,
  /** @type {number | null} */ maximum?: number | null,
): string;
/** Render one bounded human event without I/O or changes to machine evidence.
 * @param {*} event
 * @param {{quiet?: boolean, level?: 'info'|'warning'|'error', maxPathCodePoints?: number | null, maxPointerCodePoints?: number | null}} [options]
 */
export declare function renderHumanEvent(
  event: any,
  {
    quiet,
    level,
    maxPathCodePoints,
    maxPointerCodePoints,
  }?: {
    quiet?: boolean;
    level?: "info" | "warning" | "error";
    maxPathCodePoints?: number | null;
    maxPointerCodePoints?: number | null;
  },
): string;
