// SPDX-License-Identifier: AGPL-3.0-only
// Trusted providers inspect captured metadata in the same execution and budget.
import { createBorrowedValueSession } from "./value-session.js";
import { requireAsyncStream } from "./source-streams.js";
import { posix } from "node:path";

export function isLogicalContainer(definition, path) {
  return (
    typeof path === "string" &&
    (definition.containerPaths ?? []).some((pattern) =>
      posix.matchesGlob(path, pattern),
    )
  );
}

export async function* logicalInventory(
  core,
  factory,
  { definition, resources, signal },
) {
  const values = createBorrowedValueSession(core);
  const methods = [
    "capturedSource",
    "select",
    "describe",
    "children",
    "read",
    "readSource",
    "fragments",
    "sourceFragments",
    "materialize",
    "materializeControl",
  ];
  const access = Object.freeze({
    ...Object.fromEntries(
      methods.map((name) => [name, values[name].bind(values)]),
    ),
    capturedSource(path) {
      if (!isLogicalContainer(definition, path))
        return Promise.reject(new Error("logical-container-scope"));
      return values.capturedSource(path);
    },
    resources: Object.freeze({
      admission: Object.freeze({ ...resources.admission }),
      runtime: Object.freeze({ ...resources.runtime }),
    }),
    signal,
  });
  try {
    signal?.throwIfAborted();
    const inventory = await factory(access);
    for await (const member of requireAsyncStream(
      inventory,
      "Logical inventory factory result",
    )) {
      if (!isLogicalContainer(definition, member?.containerPath))
        throw new Error("logical-container-scope");
      yield member;
    }
  } finally {
    await values.close();
  }
}
