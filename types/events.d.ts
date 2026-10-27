/** @param {unknown} event
 * @returns {event is import("./api-types.js").JsonQualityEvent}
 */
export declare function validateJsonQualityEvent(
  event: unknown,
): event is import("./api-types.js").JsonQualityEvent;
/** @returns {import("./api-types.js").JsonQualityEvent} */
export declare function assertJsonQualityEvent(
  /** @type {*} */ event: any,
): import("./api-types.js").JsonQualityEvent;
