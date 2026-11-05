// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { validateJsonQualityEvent } from "../src/events.js";

const selectedTerminal = () => ({
  schemaVersion: 5,
  requestId: "selected-contract",
  type: "selection-terminal",
  operationScope: {
    kind: "selected-files",
    policy: "repository",
    completeRepositoryCheck: false,
  },
  inputKind: "physical",
  selectedSourceCount: "1",
  completedSourceCount: "1",
  complete: true,
  diagnosticsComplete: true,
  qualityPassed: true,
  contractSatisfied: true,
  policyObservationComplete: true,
  sourceObservationsComplete: true,
});

test("scoped event admission refuses repository claims, stale versions and incomplete selected work", () => {
  assert.equal(validateJsonQualityEvent(selectedTerminal()), true);
  for (const change of [
    { schemaVersion: 4 },
    { completedSourceCount: "0" },
    { complete: false },
    { diagnosticsComplete: false },
    { policyObservationComplete: false },
    { sourceObservationsComplete: false },
    { inventoryComplete: true },
    {
      operationScope: {
        kind: "selected-files",
        policy: "repository",
        completeRepositoryCheck: true,
      },
    },
    {
      operationScope: {
        kind: "stdin",
        policy: "repository",
        completeRepositoryCheck: false,
      },
    },
  ])
    assert.equal(
      validateJsonQualityEvent({ ...selectedTerminal(), ...change }),
      false,
    );
  const refusal = {
    ...selectedTerminal(),
    qualityPassed: false,
    contractSatisfied: false,
  };
  assert.equal(validateJsonQualityEvent(refusal), true);
});

test("virtual selection completion requires input closure and cannot claim disk observations", () => {
  const { sourceObservationsComplete: ignored, ...physical } =
    selectedTerminal();
  void ignored;
  const virtual = {
    ...physical,
    inputKind: "stdin",
    inputComplete: true,
    operationScope: {
      kind: "stdin",
      policy: "repository",
      completeRepositoryCheck: false,
    },
  };
  assert.equal(validateJsonQualityEvent(virtual), true);
  const { inputComplete: removed, ...incomplete } = virtual;
  void removed;
  assert.equal(validateJsonQualityEvent(incomplete), false);
  assert.equal(
    validateJsonQualityEvent({ ...virtual, sourceObservationsComplete: true }),
    false,
  );
  assert.equal(
    validateJsonQualityEvent({ ...virtual, inputComplete: false }),
    false,
  );
});

test("format preview completion requires exact candidate counts or an explicit complete refusal", () => {
  const preview = {
    schemaVersion: 5,
    requestId: "preview-contract",
    type: "format-preview-terminal",
    operation: "format",
    complete: true,
    preflightComplete: true,
    sourceObservationsComplete: true,
    selectedPathCount: "1",
    changedPathCount: "1",
    qualityPassed: true,
    findingCount: "0",
    coreSourceInputsSha256: "a".repeat(64),
    icuVersion: "78.2",
    unicodeVersion: "17.0",
  };
  assert.equal(validateJsonQualityEvent(preview), true);
  const { changedPathCount: removed, ...missing } = preview;
  void removed;
  assert.equal(validateJsonQualityEvent(missing), false);
  assert.equal(
    validateJsonQualityEvent({ ...preview, operation: "normalize" }),
    false,
  );
  const refusal = {
    ...preview,
    preflightComplete: false,
    message: "native-refusal",
  };
  assert.equal(validateJsonQualityEvent(refusal), true);
  const { message: removedMessage, ...ambiguous } = refusal;
  void removedMessage;
  assert.equal(validateJsonQualityEvent(ambiguous), false);
});
