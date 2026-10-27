// SPDX-License-Identifier: AGPL-3.0-only
// Public serialized event admission does not mint reference capabilities.
import { Ajv2020 as Ajv } from "ajv/dist/2020.js";
import configuration from "../schemas/configuration.schema.json" with { type: "json" };
import schema from "../schemas/event.schema.json" with { type: "json" };

/** @type {import("ajv").ValidateFunction<import("./api-types.js").JsonQualityEvent>} */
const validate = new Ajv({ strict: true })
  .addSchema(configuration, "configuration.schema.json")
  .compile(schema);

/** @param {unknown} event
 * @returns {event is import("./api-types.js").JsonQualityEvent}
 */
export function validateJsonQualityEvent(event) {
  return validate(event);
}

/** @returns {import("./api-types.js").JsonQualityEvent} */
export function assertJsonQualityEvent(/** @type {*} */ event) {
  if (!validate(event))
    throw new TypeError("Invalid JSON Quality event.", {
      cause: structuredClone(validate.errors),
    });
  return event;
}
