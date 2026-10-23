// SPDX-License-Identifier: AGPL-3.0-only
// Public serialized event admission does not mint reference capabilities.
import Ajv from "ajv";
import configuration from "../schemas/configuration.schema.json" with { type: "json" };
import schema from "../schemas/event.schema.json" with { type: "json" };

const validate = new Ajv({ strict: true })
  .addSchema(configuration, "configuration.schema.json")
  .compile(schema);

export function validateJsonQualityEvent(event) {
  return validate(event);
}

export function assertJsonQualityEvent(event) {
  if (!validate(event))
    throw new TypeError("Invalid JSON Quality event.", {
      cause: structuredClone(validate.errors),
    });
  return event;
}
