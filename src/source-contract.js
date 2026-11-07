// SPDX-License-Identifier: AGPL-3.0-only
// Closed typed control admission; payload parsing remains with the native reader.
import validators from "./generated/source-contract.cjs";
import { encodeNativeControl } from "./native-control.js";
import { assertNfcPreservationSemantics } from "./nfc-preservation.js";

const validate = validators.validateSourceContract;

/** Snapshot bounded plain control data before a producer is opened. This also
 * rejects getters, custom serialization and cyclic objects before Ajv reads it.
 * @returns {import("./api-types.js").JsonSourceContract}
 */
export function sourceContract(/** @type {*} */ input) {
  const snapshot = JSON.parse(encodeNativeControl(input).toString("utf8"));
  if (!validate(snapshot)) throw new TypeError("Invalid JSON source contract.");
  assertNfcPreservationSemantics(snapshot);
  return snapshot;
}
