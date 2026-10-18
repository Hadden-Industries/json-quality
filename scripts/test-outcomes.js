// SPDX-License-Identifier: AGPL-3.0-only
/** Native Node event reporter; durations are excluded from stable per-test outcomes. */
export default async function* testOutcomes(events) {
  for await (const { type, data } of events) {
    if (["test:pass", "test:fail"].includes(type)) {
      yield JSON.stringify({
        type,
        file: data.file ?? null,
        name: data.name,
        line: data.line ?? null,
        column: data.column ?? null,
        skip: data.skip ?? false,
        todo: data.todo ?? false,
      }) + "\n";
      if (data.details?.error)
        yield JSON.stringify({
          type: "test:diagnostic",
          file: data.file ?? null,
          message: data.details.error.stack ?? data.details.error.message,
        }) + "\n";
    } else if (
      ["test:stdout", "test:stderr", "test:diagnostic"].includes(type)
    ) {
      yield JSON.stringify({
        type,
        file: data.file ?? null,
        message: data.message,
      }) + "\n";
    }
  }
}
