// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { appendFileSync } from "node:fs";
import { nodeSupport, resolveQualificationMatrix } from "./node-matrix.js";

// GitHub consumes one frozen matrix for both fan-out and final admission.
assert.ok(process.env.GITHUB_OUTPUT, "Expected the GitHub Actions output file");
const matrix = await resolveQualificationMatrix();
appendFileSync(
  process.env.GITHUB_OUTPUT,
  `matrix=${JSON.stringify(matrix)}\nconsumer-npm=${nodeSupport.consumerNpm}\n`,
);
console.log(
  JSON.stringify({
    matrix,
    reference: nodeSupport.reference,
    producerNpm: nodeSupport.producerNpm.version,
    consumerNpm: nodeSupport.consumerNpm,
  }),
);
