// SPDX-License-Identifier: AGPL-3.0-only
// Finite test fixture collector. Production consumers stream the same API;
// these deliberately small independent vectors may retain their event metadata.
import { openJsonSourceSession } from "../src/index.js";

export async function checkFixture(bytes, contract = {}, controls = {}) {
  const session = await openJsonSourceSession(controls),
    events = [];
  try {
    for await (const event of session.check(
      {
        async *open() {
          yield bytes;
        },
      },
      { path: "fixture.json", format: "json", ...contract },
    ))
      events.push(event);
    return {
      events,
      findings: events.filter((event) => event.type === "finding"),
      terminal: events.at(-1),
    };
  } finally {
    await session.close();
  }
}
