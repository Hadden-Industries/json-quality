/** Bound before escaping; never serialize arbitrary event values or arguments. */
export declare function escapeHumanText(
  /** @type {*} */ value: any,
  maximum?: number,
): string;
/** Render one bounded human event without I/O or changes to machine evidence.
 * @param {*} event
 * @param {{quiet?: boolean, level?: 'info'|'warning'|'error'}} [options]
 */
export declare function renderHumanEvent(
  event: any,
  {
    quiet,
    level,
  }?: {
    quiet?: boolean;
    level?: "info" | "warning" | "error";
  },
): string;
