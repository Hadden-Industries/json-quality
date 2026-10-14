// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import { RuleTester } from "eslint";
import plugin from "../src/eslint/index.js";

test("native RuleTester exercises shared identity sinks and local contracts", () => {
  new RuleTester().run(
    "json-quality/no-json-stringify-identity",
    plugin.rules["no-json-stringify-identity"],
    {
      valid: [
        "writeFile(path, JSON.stringify(value));",
        "function compare(JSON) { return JSON.stringify(a) === b; }",
        "// json-identity-contract: bytes; owner: Wire protocol; reason: Compare the exact serialized payload.\nconst wire = JSON.stringify(value); wire === expected;",
      ],
      invalid: [
        { code: "JSON.stringify(a) === JSON.stringify(b);", errors: 2 },
        {
          code: "const wire = JSON.stringify(a); const alias = wire; alias === b;",
          errors: 1,
        },
        { code: "new Set([JSON.stringify(a)]);", errors: 1 },
        { code: "expect(JSON.stringify(a)).toEqual(b);", errors: 1 },
      ],
    },
  );
});
