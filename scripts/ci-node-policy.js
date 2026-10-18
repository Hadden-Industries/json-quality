// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { appendFileSync } from "node:fs";
import { nodeSupport, resolveQualificationMatrix } from "./node-matrix.js";
import { validateFrozenMatrix } from "./release-contract.js";

// GitHub consumes one frozen matrix for both fan-out and final admission.
assert.ok(process.env.GITHUB_OUTPUT, "Expected the GitHub Actions output file");
let matrix = process.env.FROZEN_MATRIX
  ? validateFrozenMatrix(JSON.parse(process.env.FROZEN_MATRIX), nodeSupport)
  : await resolveQualificationMatrix();
if (process.env.DIAGNOSTIC_OS || process.env.DIAGNOSTIC_NODE) {
  assert.ok(
    !process.env.RELEASE_MODE || process.env.RELEASE_MODE === "false",
    "Diagnostic lanes cannot mint release qualification",
  );
  assert.ok(
    matrix.os.includes(process.env.DIAGNOSTIC_OS) &&
      matrix.node.includes(process.env.DIAGNOSTIC_NODE),
    "Diagnostic lane is outside the frozen supported matrix",
  );
  matrix = {
    os: [process.env.DIAGNOSTIC_OS],
    node: [process.env.DIAGNOSTIC_NODE],
  };
}
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
