// SPDX-License-Identifier: AGPL-3.0-only
// Package-owned knowledge about non-import inputs; not a consumer configuration API.
export const fullFiles = new Set([
  "src/acquire.js", // Copied bootstrap and dynamic installed-package loading.
  "src/installation.js", // Reads the installed source/lock/metadata graph as data.
]);
export const relations = [
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
