// SPDX-License-Identifier: AGPL-3.0-only
// Native ESLint qualification uses the same package-owned policy composition.
import { fileURLToPath } from "node:url";
import {
  readJsonPolicy,
  jsonLintConfig,
  jsonPolicyLintFiles,
} from "../src/quality.js";
const root = fileURLToPath(new URL("../", import.meta.url));
export default jsonLintConfig(jsonPolicyLintFiles(await readJsonPolicy(root)));
