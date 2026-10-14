// SPDX-License-Identifier: AGPL-3.0-only
import Ajv from "ajv";
import schema from "../schemas/result.schema.json" with { type: "json" };
import { assertRepositoryPath } from "./paths.js";
import { isStrictJsonPath } from "./quality.js";

const validate = new Ajv({ strict: true }).compile({
  definitions: schema.definitions,
  $ref: "#/definitions/nativeIdentity",
});

/** One binding authority for execution and serialized-result admission. */
export function assertNativeIdentity(entry) {
  if (!validate(entry))
    throw new TypeError("Invalid native document identity.");
  assertRepositoryPath(entry.path);
  const source = entry.source;
  assertRepositoryPath(source.path);
  if (source.kind === "content-addressed") {
    if (
      entry.path !== source.path ||
      entry.sha256 !== source.sha256 ||
      entry.byteLength !== source.byteLength
    )
      throw new TypeError(
        "Content-addressed JSON identity is not bound to its source.",
      );
  } else {
    assertRepositoryPath(source.memberPath);
    if (
      !isStrictJsonPath(source.memberPath) ||
      entry.path !== `${source.path}!/${source.memberPath}`
    )
      throw new TypeError(
        "Archive JSON identity is not bound to its native member.",
      );
  }
}
