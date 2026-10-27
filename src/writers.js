// SPDX-License-Identifier: AGPL-3.0-only
// Public finite pure writers. File replacement has a separate explicit owner.
import { tmpdir } from "node:os";
import { isAbsolute } from "node:path";
import { installedNativeComponent } from "./installed-component.js";
import { serializeProducerJson } from "./producer-json.js";
import {
  admitTransformSource,
  transformResources,
} from "./transform-capabilities.js";
import {
  resourceDefaults,
  resolveResourceProfile,
} from "./resource-profile.js";
import { resolveExecutionResources } from "./execution-resources.js";
import { sourceContract } from "./source-contract.js";

function writerOptions(/** @type {*} */ options = {}) {
  if (
    !options ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    Object.keys(options).some(
      (name) =>
        ![
          "contract",
          "temporaryDirectory",
          "capacityLimits",
          "runtimeControls",
          "transformControls",
          "producerControls",
          "signal",
        ].includes(name),
    )
  )
    throw new TypeError("Invalid JSON writer options.");
  const contract = sourceContract(options.contract ?? {});
  if (
    Object.keys(contract).some(
      (name) =>
        ![
          "normalization",
          "allowEmptyKeys",
          "preserveNfcValues",
          "allowFormatWrites",
          "owner",
          "reason",
        ].includes(name),
    )
  )
    throw new TypeError("Unsupported pure writer source contract.");
  const temporaryDirectory = options.temporaryDirectory ?? tmpdir();
  if (
    typeof temporaryDirectory !== "string" ||
    !temporaryDirectory.isWellFormed() ||
    !isAbsolute(temporaryDirectory)
  )
    throw new TypeError(
      "Temporary directory must be an absolute well-formed path.",
    );
  if (options.signal !== undefined && !(options.signal instanceof AbortSignal))
    throw new TypeError("Expected AbortSignal.");
  options.signal?.throwIfAborted();
  const transformControls = transformResources(
    undefined,
    options.transformControls,
  );
  resolveResourceProfile(
    resourceDefaults("producerControls"),
    undefined,
    options.producerControls,
  );
  resolveExecutionResources(
    {},
    {
      capacityLimits: options.capacityLimits,
      runtimeControls: options.runtimeControls,
    },
  );
  return {
    ...contract,
    temporaryDirectory,
    signal: options.signal,
    capacityLimits: options.capacityLimits,
    runtimeControls: options.runtimeControls,
    transformControls,
    producerControls: options.producerControls,
  };
}

/** Preserve decoded meaning, member order and exact numeric lexemes while
 * selecting the package's fixed Prettier presentation. This is a finite text
 * transformation; refusal never invokes a different reader or writes a file.
 * @param {string} text
 * @param {import("./api-types.js").WriterOptions} [options]
 * @returns {Promise<string>}
 */
export async function formatJsonSource(text, options) {
  const selected = writerOptions(options);
  admitTransformSource(text, selected.transformControls);
  const { formatSource } = await import("./native-formatting.js");
  return formatSource(text, {
    ...selected,
    component: await installedNativeComponent(),
  });
}

/** Serialize an already materialized plain producer value with native platform
 * JSON serialization, then apply the same bounded presentation/quality checks.
 * Producers retain ownership of their object graph and domain admission.
 * @param {import("./api-types.js").JsonValue} value
 * @param {import("./api-types.js").WriterOptions} [options]
 * @returns {Promise<string>}
 */
export async function formatJsonValue(value, options) {
  const selected = writerOptions(options),
    text = serializeProducerJson(
      value,
      selected.producerControls,
      selected.transformControls,
    );
  const { formatSource } = await import("./native-formatting.js");
  return formatSource(text, {
    ...selected,
    component: await installedNativeComponent(),
  });
}

/** Explicit NFC repair changes string/key literal spans only, after collision
 * preflight. Numeric lexemes, whitespace and original member order are retained.
 * @param {string} text
 * @param {import("./api-types.js").WriterOptions} [options]
 * @returns {Promise<string>}
 */
export async function normalizeJsonSource(text, options) {
  const selected = writerOptions(options);
  admitTransformSource(text, selected.transformControls);
  const { normalizeSource } = await import("./native-normalization.js");
  return normalizeSource(text, {
    ...selected,
    component: await installedNativeComponent(),
  });
}
