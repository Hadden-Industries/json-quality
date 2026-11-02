// SPDX-License-Identifier: AGPL-3.0-only
/** One inventory for provider jobs, SARIF categories and workflow projections. */
export const securityScans = Object.freeze(
  [
    {
      key: "actions",
      language: "actions",
      os: "ubuntu-24.04",
      "build-mode": "none",
      category: "/language:actions",
    },
    {
      key: "javascript-typescript",
      language: "javascript-typescript",
      os: "ubuntu-24.04",
      "build-mode": "none",
      category: "/language:javascript-typescript",
    },
    {
      key: "python",
      language: "python",
      os: "ubuntu-24.04",
      "build-mode": "none",
      category: "/language:python",
    },
    {
      key: "cpp-linux",
      language: "c-cpp",
      os: "ubuntu-24.04",
      "build-mode": "manual",
      category: "/language:c-cpp/platform:linux",
    },
    {
      key: "cpp-windows",
      language: "c-cpp",
      os: "windows-2025",
      "build-mode": "manual",
      category: "/language:c-cpp/platform:windows",
    },
  ].map(Object.freeze),
);
