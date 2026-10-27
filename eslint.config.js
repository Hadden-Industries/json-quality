// SPDX-License-Identifier: AGPL-3.0-only
import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import jsonQuality from "./src/eslint/index.js";

export default defineConfig([
  { ignores: ["node_modules/**", "coverage/**"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs}"],
    linterOptions: { reportUnusedDisableDirectives: "error" },
    languageOptions: {
      globals: Object.fromEntries(
        Object.getOwnPropertyNames(globalThis).map((name) => [
          name,
          "readonly",
        ]),
      ),
    },
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
