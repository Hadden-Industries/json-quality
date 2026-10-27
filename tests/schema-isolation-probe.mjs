// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import {
  openJsonRepositorySession,
  openJsonSourceSession,
  validateJsonQualityEvent,
  admitJsonPolicy,
} from "../src/index.js";
import eventSchema from "../schemas/event.schema.json" with { type: "json" };
import configurationSchema from "../schemas/configuration.schema.json" with { type: "json" };

// Run in a fresh process. Public schema customization cannot rewrite compiled
// admission, weaken an initialized native contract or mint event capabilities.
if (process.argv[2] === "events") {
  eventSchema.oneOf.find(
    (variant) => variant.properties.type.const === "execution",
  ).required.length = 0;
  assert.equal(
    validateJsonQualityEvent({
      schemaVersion: 2,
      requestId: "fixture",
      type: "execution",
    }),
    false,
  );
  const session = await openJsonRepositorySession({ root: process.argv[3] });
  try {
    let terminal;
    for await (const event of session.events()) terminal = event;
    assert.equal(terminal.type, "execution-terminal");
    assert.equal(terminal.contractSatisfied, true);
  } finally {
    await session.close();
  }
} else {
  configurationSchema.properties.exceptions.items.properties.allowEmptyKeys.uniqueItems = false;
  const session = await openJsonSourceSession();
  try {
    assert.throws(
      () =>
        session.check(
          {
            // eslint-disable-next-line require-yield -- Admission must reject before opening.
            async *open() {
              throw new Error("must not open");
            },
          },
          {
            allowEmptyKeys: ["/packages/", "/packages/"],
          },
        ),
      /source contract/u,
    );
    assert.throws(
      () =>
        admitJsonPolicy({
          schemaVersion: 2,
          defaults: {
            formatContract: "prettier-json",
            allowFormatWrites: true,
            normalization: "NFC",
          },
          exceptions: [
            {
              paths: ["source.json"],
              allowEmptyKeys: ["/packages/", "/packages/"],
              owner: "Fixture",
              reason: "Exercise compiled admission.",
            },
          ],
        }),
      /policy structure/u,
    );
  } finally {
    await session.close();
  }
}
