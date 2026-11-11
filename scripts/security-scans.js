// SPDX-License-Identifier: AGPL-3.0-only
import { ubuntuRunner } from "./runner-policy.js";

const linux = ubuntuRunner();

/** One inventory for provider jobs, SARIF categories and workflow projections. */
export const securityScans = Object.freeze(
  [
    {
      key: "actions",
      language: "actions",
      os: linux,
      "build-mode": "none",
      category: "/language:actions",
    },
    {
      key: "javascript-typescript",
      language: "javascript-typescript",
      os: linux,
      "build-mode": "none",
      category: "/language:javascript-typescript",
    },
    {
      key: "python",
      language: "python",
      os: linux,
      "build-mode": "none",
      category: "/language:python",
    },
    {
      key: "cpp-linux",
      language: "c-cpp",
      os: linux,
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
