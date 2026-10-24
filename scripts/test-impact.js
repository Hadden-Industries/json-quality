// SPDX-License-Identifier: AGPL-3.0-only
// Package-owned knowledge about non-import inputs; not a consumer configuration API.
export const fullFiles = new Set([
  "src/acquire.js", // Copied bootstrap and dynamic installed-package loading.
  "src/installation.js", // Reads the installed source/lock/metadata graph as data.
  "src/installed-component.js", // Fixed installed native assets are non-import inputs.
  "src/native-packages.js", // Native npm platform packages are resolved dynamically.
  "src/native-component.js", // Admission binds binary and generated-control bytes.
]);
export const relations = [
  {
    dependency: "tests/native/stdio_probe.py",
    consumer: "tests/native/stdio.test.mjs",
    kind: "python-process",
  },
  {
    dependency: "native/",
    consumer: "tests/native/stdio.test.mjs",
    kind: "packaged-native-process",
  },
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
    consumer: "tests/cli-flexibility.test.js",
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
    consumer: "tests/cli-flexibility.test.js",
    kind: "node-process",
  },
  {
    dependency: "src/cli.js",
    consumer: "tests/native-documents.test.js",
    kind: "node-process",
  },
  {
    dependency: "src/eslint/index.js",
    consumer: "tests/retained-identity.test.js",
    kind: "eslint-process",
  },
  {
    dependency: "src/qualification-cli.js",
    consumer: "tests/native/git-qualification.test.mjs",
    kind: "node-process",
  },
  {
    dependency: "native/",
    consumer: "tests/native/public-api.test.mjs",
    kind: "shared-native-artifacts",
  },
  {
    dependency: "tests/schema-isolation-probe.mjs",
    consumer: "tests/schema-isolation.test.js",
    kind: "node-process",
  },
];
