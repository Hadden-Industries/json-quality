// SPDX-License-Identifier: AGPL-3.0-only
import noJsonStringifyIdentity from "./noJsonStringifyIdentity.js";
import metadata from "../../package.json" with { type: "json" };

/** @type {import("eslint").Linter.Config} */
const recommended = {
  name: "@hadden-industries/json-quality/recommended",
  files: ["**/*.{js,mjs,cjs}"],
  rules: { "json-quality/no-json-stringify-identity": "error" },
};
/** The bounded serialization identity guard; consumers select their JS scope. */
const plugin = {
  meta: { name: metadata.name, version: metadata.version },
  rules: { "no-json-stringify-identity": noJsonStringifyIdentity },
  configs: { recommended },
};
recommended.plugins = { "json-quality": plugin };
export default plugin;
