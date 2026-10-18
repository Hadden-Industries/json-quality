#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { qualifyJsonConsumer } from "./qualification.js";
import { RESOURCE_OPTIONS, resourceCliLimits } from "./commands.js";

/** Source-only trusted consumer qualification; returns quality 1 or operational 2. */
export async function runJsonQualificationCli(args) {
  try {
    const { values } = parseArgs({
      args,
      allowNegative: true,
      options: {
        ...RESOURCE_OPTIONS,
        help: { type: "boolean", short: "h" },
        "trusted-root": { type: "string" },
        "candidate-root": { type: "string" },
        "trusted-sha": { type: "string" },
        "candidate-sha": { type: "string" },
      },
    });
    if (values.help) {
      process.stdout.write(
        "Usage: json-quality-qualify --trusted-root PATH --candidate-root PATH --trusted-sha SHA --candidate-sha SHA\nResource options: " +
          Object.keys(RESOURCE_OPTIONS)
            .map((name) => "--" + name)
            .join(", ") +
          "\n--no-capacity-limits is the native negative form of --capacity-limits.\nJSON_QUALITY_CAPACITY_LIMITS accepts true, false or a capacity override object.\n",
      );
      return 0;
    }
    const report = await qualifyJsonConsumer({
      capacityLimits: resourceCliLimits(values),
      trustedRoot:
        values["trusted-root"] ?? process.env.JSON_QUALITY_TRUSTED_ROOT,
      candidateRoot:
        values["candidate-root"] ?? process.env.JSON_QUALITY_CANDIDATE_ROOT,
      trustedSha: values["trusted-sha"] ?? process.env.JSON_QUALITY_TRUSTED_SHA,
      candidateSha:
        values["candidate-sha"] ?? process.env.JSON_QUALITY_CANDIDATE_SHA,
    });
    process.stdout.write(JSON.stringify(report) + "\n");
    return report.result.status === "passed" ? 0 : 1;
  } catch (error) {
    process.stdout.write(
      JSON.stringify({
        schemaVersion: 1,
        status: "error",
        complete: false,
        message: error.message,
      }) + "\n",
    );
    return 2;
  }
}
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
)
  process.exitCode = await runJsonQualificationCli(process.argv.slice(2));
