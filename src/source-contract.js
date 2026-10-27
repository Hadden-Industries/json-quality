// SPDX-License-Identifier: AGPL-3.0-only
// Closed typed control admission; payload parsing remains with the native reader.
import { Ajv2020 as Ajv } from "ajv/dist/2020.js";
import configuration from "../schemas/configuration.schema.json" with { type: "json" };
import schema from "../schemas/source-contract.schema.json" with { type: "json" };
import { encodeNativeControl } from "./native-control.js";
import { assertNfcPreservationContract } from "./configuration.js";

/** @type {import("ajv").ValidateFunction<import("./api-types.js").JsonSourceContract>} */
const validate = new Ajv({ strict: true })
  .addSchema(configuration, "configuration.schema.json")
  .compile(schema);

/** Snapshot bounded plain control data before a producer is opened. This also
 * rejects getters, custom serialization and cyclic objects before Ajv reads it.
 * @returns {import("./api-types.js").JsonSourceContract}
 */
export function sourceContract(/** @type {*} */ input) {
  const snapshot = JSON.parse(encodeNativeControl(input).toString("utf8"));
  if (!validate(snapshot)) throw new TypeError("Invalid JSON source contract.");
  assertNfcPreservationContract(snapshot);
  return snapshot;
}
