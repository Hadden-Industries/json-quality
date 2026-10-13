// SPDX-License-Identifier: AGPL-3.0-only
import { defineConfig } from "eslint/config";
import jsonQuality from "./src/eslint/index.js";

export default defineConfig([
  { ignores: ["node_modules/**", "coverage/**"] },
  {
    files: ["**/*.{js,mjs,cjs}"],
    linterOptions: { reportUnusedDisableDirectives: "error" },
    plugins: { "json-quality": jsonQuality },
    rules: {
      "json-quality/no-json-stringify-identity": "error",
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "no-dupe-keys": "error",
      "no-unreachable": "error",
      "no-constant-condition": "error",
      "no-debugger": "error",
    },
  },
]);
