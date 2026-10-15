// SPDX-License-Identifier: AGPL-3.0-only
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import json from "@eslint/json";
import * as prettier from "prettier";
import { jsonFormatOptions, JSON_FORMAT_OPTIONS_PATH } from "./presentation.js";
import { operationLimits } from "./limits.js";

/** Pure presentation, without normalization, selection, writes or a quality-pass
 * claim. Syntax and the native formatter's preservation check remain mandatory.
 */
export async function formatJsonSource(text, options = {}) {
  if (
    !options ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    Object.keys(options).some((key) => key !== "limits")
  )
    throw new TypeError("Invalid JSON formatting options.");
  const limits = operationLimits({}, options.limits);
  return formatAdmittedJsonSource(text, limits);
}

/** Internal entry after operation resource limits have already been admitted. */
export async function formatAdmittedJsonSource(text, limits) {
  if (typeof text !== "string" || Buffer.byteLength(text) > limits.maxFileBytes)
    throw new TypeError(
      "JSON formatting requires source within the file-byte limit.",
    );
  if (!json.languages.json.parse({ body: text }).ok)
    throw new TypeError("Cannot format invalid strict JSON source.");
  const printed = await prettier.format(text, await jsonFormatOptions());
  if (Buffer.byteLength(printed) > limits.maxFileBytes)
    throw new Error("Formatted JSON exceeds the file-byte limit.");
  if (printed !== text)
    execFileSync(
      process.execPath,
      [
        fileURLToPath(import.meta.resolve("prettier/bin/prettier.cjs")),
        "--debug-check",
        "--config",
        JSON_FORMAT_OPTIONS_PATH,
        "--no-editorconfig",
      ],
      {
        input: text,
        encoding: "utf8",
        windowsHide: true,
        timeout: Number.isFinite(limits.maxToolTimeMs)
          ? limits.maxToolTimeMs
          : 0,
        maxBuffer: Math.min(limits.maxToolOutputBytes, Number.MAX_SAFE_INTEGER),
      },
    );
  return printed;
}

/** Producer convenience for JSON data only. Reject values the platform encoder
 * would erase, transform or evaluate; historical digest encoders stay owned by
 * their protocols and must not use this presentation function.
 */
export async function formatJsonValue(value, options) {
  const active = new Set();
  const inspect = (item) => {
    if (item === null || typeof item === "string" || typeof item === "boolean")
      return;
    if (
      typeof item === "number" &&
      Number.isFinite(item) &&
      !Object.is(item, -0)
    )
      return;
    if (typeof item !== "object" || active.has(item))
      throw new TypeError(
        "Expected acyclic JSON data without unsupported values.",
      );
    const array = Array.isArray(item);
    if (array && ![null, Array.prototype].includes(Object.getPrototypeOf(item)))
      throw new TypeError(
        "Expected plain JSON arrays without custom serialization.",
      );
    if (
      !array &&
      ![null, Object.prototype].includes(Object.getPrototypeOf(item))
    )
      throw new TypeError(
        "Expected plain JSON data without custom serialization.",
      );
    const keys = Reflect.ownKeys(item);
    if (array && keys.length !== item.length + 1)
      throw new TypeError("Sparse or extended arrays are not JSON data.");
    active.add(item);
    for (const key of keys) {
      if (array && key === "length") continue;
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (
        typeof key !== "string" ||
        !descriptor.enumerable ||
        !Object.hasOwn(descriptor, "value") ||
        (array &&
          (!/^(?:0|[1-9][0-9]*)$/u.test(key) || Number(key) >= item.length))
      )
        throw new TypeError(
          "Expected JSON data without accessors or hidden properties.",
        );
      inspect(descriptor.value);
    }
    active.delete(item);
  };
  inspect(value);
  return formatJsonSource(JSON.stringify(value), options);
}
