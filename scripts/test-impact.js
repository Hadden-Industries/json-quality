// SPDX-License-Identifier: AGPL-3.0-only
// Package-owned knowledge about non-import inputs; not a consumer configuration API.
export const fullFiles = new Set([
  "src/acquire.js", // Copied bootstrap and dynamic installed-package loading.
  "src/installation.js", // Reads the installed source/lock/metadata graph as data.
]);
export const relations = [
  {
    dependency: "schemas/release-manifest.schema.json",
    consumer: "tests/release-contract.test.js",
    kind: "release-schema",
  },
  {
    dependency: ".github/",
    consumer: "tests/release-contract.test.js",
    kind: "release-workflow-input",
  },
  {
    dependency: "assets/release-tools.json",
    consumer: "tests/release-contract.test.js",
    kind: "native-tool-identity",
  },
  {
    dependency: "tests/cli-context-probe.mjs",
    consumer: "tests/execution.test.js",
    kind: "node-process",
  },
  {
    dependency: "src/",
    consumer: "tests/installation.test.js",
    kind: "installed-source-census",
  },
  {
    dependency: "src/",
    consumer: "tests/pack.test.js",
    kind: "package-payload",
  },
  {
    dependency: "src/cli.js",
    consumer: "tests/execution.test.js",
    kind: "node-process",
  },
  {
    dependency: "src/cli.js",
    consumer: "tests/native-documents.test.js",
    kind: "node-process",
  },
  {
    dependency: "src/eslint/index.js",
    consumer: "tests/retained-quality.test.js",
    kind: "eslint-process",
  },
  {
    dependency: "tests/schema-isolation-probe.mjs",
    consumer: "tests/schema-isolation.test.js",
    kind: "node-process",
  },
];
