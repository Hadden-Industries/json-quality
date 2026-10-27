// SPDX-License-Identifier: AGPL-3.0-only
// Closed, caller-owned quota selections over schema-projected default profiles.
import schema from "../schemas/configuration.schema.json" with { type: "json" };

const /** @type {Record<string, any>} */ definitions = structuredClone(
    schema.$defs,
  );
export function resourceDefaults(/** @type {string} */ name) {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(definitions[name].properties).map(([key, rule]) => [
        key,
        rule.default,
      ]),
    ),
  );
}

/** Null is the only unlimited sentinel; representation failures remain errors. */
export function exceedsQuota(/** @type {*} */ value, /** @type {*} */ maximum) {
  return maximum !== null && value > maximum;
}
export function minimumQuota(/** @type {(number | null)[]} */ ...values) {
  const finite = values.filter((value) => value !== null);
  return finite.length ? Math.min(...finite) : null;
}

export function resolveResourceProfile(
  /** @type {Record<string, number>} */ defaults,
  /** @type {*} */ policy,
  /** @type {*} */ invocation,
) {
  for (const value of [policy, invocation]) {
    if (value === undefined || typeof value === "boolean") continue;
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.entries(value).some(
        ([name, selected]) =>
          !Object.hasOwn(defaults, name) ||
          (selected !== null &&
            (!Number.isSafeInteger(selected) || selected < 1)),
      )
    )
      throw new TypeError("Invalid resource quota profile.");
  }
  const unlimited = () =>
    Object.fromEntries(Object.keys(defaults).map((name) => [name, null]));
  const selected =
    policy === false
      ? unlimited()
      : {
          ...defaults,
          ...(typeof policy === "object" ? policy : {}),
        };
  if (invocation === false) return unlimited();
  if (invocation === true)
    return {
      ...defaults,
      ...(typeof policy === "object" ? policy : {}),
    };
  return { ...selected, ...(typeof invocation === "object" ? invocation : {}) };
}
