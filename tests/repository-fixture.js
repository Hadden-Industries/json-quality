// SPDX-License-Identifier: AGPL-3.0-only
// Small independent repository fixtures can retain delivered event metadata.
import { openJsonRepositorySession } from "../src/index.js";

export async function* fixtureStream(...items) {
  yield* items;
}
export async function repositoryEvents(options, operation, files) {
  const session = await openJsonRepositorySession(options),
    events = [];
  try {
    for await (const event of session.events()) events.push(event);
    if (operation)
      for await (const event of session.rewrite(
        operation,
        files === undefined ? {} : { files },
      ))
        events.push(event);
    return events;
  } finally {
    await session.close();
  }
}
