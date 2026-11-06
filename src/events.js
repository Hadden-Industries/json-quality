// SPDX-License-Identifier: AGPL-3.0-only
// Public serialized event admission does not mint reference capabilities.
import { Ajv2020 as Ajv } from "ajv/dist/2020.js";
import configuration from "../schemas/configuration.schema.json" with { type: "json" };
import schema from "../schemas/event.schema.json" with { type: "json" };

/** @type {import("ajv").ValidateFunction<import("./api-types.js").JsonQualityEvent>} */
const validate = new Ajv({ strict: true })
  .addSchema(configuration, "configuration.schema.json")
  .compile(schema);

const rewriteQualityRefusals = new Set(schema.$defs.rewriteQualityRefusal.enum);

/** A native refusal identifier carried in the closed v5 message field. */
export function isRewriteQualityRefusal(/** @type {string} */ code) {
  return rewriteQualityRefusals.has(code);
}

/** @param {unknown} event
 * @returns {event is import("./api-types.js").JsonQualityEvent}
 */
export function validateJsonQualityEvent(event) {
  if (!validate(event)) return false;
  if (
    event.operationScope?.completeRepositoryCheck &&
    !["execution", "execution-terminal"].includes(event.type)
  )
    return false;
  if (event.type === "selection" || event.type === "selection-terminal") {
    if (
      event.operationScope?.kind !==
      (event.inputKind === "physical" ? "selected-files" : "stdin")
    )
      return false;
    if (
      event.type === "selection-terminal" &&
      event.selectedSourceCount !== event.completedSourceCount
    )
      return false;
    if (
      event.type === "selection-terminal" &&
      (event.contractSatisfied || event.qualityPassed) &&
      !event.diagnosticsComplete
    )
      return false;
  }
  if (event.type !== "execution") return true;
  const origin = event.configurationOrigin;
  if (!origin) return false;
  if (origin.kind === "git-blob" || origin.kind === "git-absence") {
    const qualification = event.qualification;
    return Boolean(
      qualification &&
      qualification.trustedCommitId === origin.commitId &&
      (origin.kind === "git-blob"
        ? qualification.trustedPolicyBlobId === origin.blobId
        : !Object.hasOwn(qualification, "trustedPolicyBlobId")),
    );
  }
  return !Object.hasOwn(event, "qualification");
}

/** @returns {import("./api-types.js").JsonQualityEvent} */
export function assertJsonQualityEvent(/** @type {*} */ event) {
  if (!validateJsonQualityEvent(event))
    throw new TypeError("Invalid JSON Quality event.", {
      cause: structuredClone(validate.errors),
    });
  return event;
}
