// SPDX-License-Identifier: AGPL-3.0-only
import { openJsonSourceSession } from "@hadden-industries/json-quality";

const session = await openJsonSourceSession();
let terminal;
try {
  for await (const event of session.check({
    async *open() {
      yield Buffer.from('{\n  "value": 1.00\n}\n');
    },
  })) {
    if (event.type === "terminal") terminal = event;
  }
  if (terminal?.contractSatisfied !== true)
    throw new Error("Source contract was not satisfied");
  console.log("Source contract satisfied");
} finally {
  await session.close();
}
