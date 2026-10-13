// SPDX-License-Identifier: AGPL-3.0-only
import noJsonStringifyIdentity from "./noJsonStringifyIdentity.js";

/** The bounded serialization identity guard; consumers select their JS scope. */
export default {
  rules: { "no-json-stringify-identity": noJsonStringifyIdentity },
};
