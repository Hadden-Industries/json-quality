// SPDX-License-Identifier: AGPL-3.0-only
/** Load publisher dependencies inside the no-request boundary, before any effect. */
import assert from "node:assert/strict";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  recordNoRequest,
  regularBytes,
  sealBundle,
  sha256,
} from "./release-records.js";

export async function runReleaseCommand(
  args,
  env = process.env,
  load = (path) => import(path),
) {
  assert.equal(
    args.length,
    3,
    "Use release-command.js PHASE DIRECTORY SCRATCH",
  );
  const [command, directory, scratch] = args;
  assert.ok(
    ["stage", "archive", "promote-npm", "promote-github"].includes(command),
  );
  const service = command.startsWith("promote-")
    ? command.slice("promote-".length)
    : null;
  let implementation;
  try {
    implementation = await load(
      service ? `./promote-${service}.js` : "./release-effects.js",
    );
  } catch (error) {
    try {
      // Preserve the admitted subject; a failed import never permits a new request.
      assert.match(env.MANIFEST_SHA, /^[a-f0-9]{64}$/u);
      assert.match(env.GITHUB_SHA, /^[a-f0-9]{40}$/u);
      assert.equal(
        sha256(regularBytes(join(directory, "release-manifest.json"))),
        env.MANIFEST_SHA,
      );
      recordNoRequest(directory, service ? "promote" : command, {
        ...env,
        ...(service ? { PROMOTION_SERVICE: service } : {}),
      });
      sealBundle(directory, env.MANIFEST_SHA);
    } catch (retentionError) {
      throw new AggregateError(
        [error, retentionError],
        "Publisher startup failed; no-request retention was not admitted",
        { cause: retentionError },
      );
    }
    throw error;
  }
  if (service === "npm")
    return implementation.runNpmPromotion(directory, scratch, env);
  if (service === "github")
    return implementation.runGithubPromotion(directory, scratch, env);
  return implementation.runReleaseEffect(command, directory, scratch, env);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runReleaseCommand(process.argv.slice(2));
}
