// SPDX-License-Identifier: AGPL-3.0-only
/** Freeze public continuation separately, retaining the original staging journal bytes. */
import assert from "node:assert/strict";
import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  lanes,
  regularBytes,
  save,
  sha256,
  effectJournal,
} from "./release-contract.js";
import {
  refreshAdmission,
  verifyLane,
  verifySecurity,
} from "./release-evidence.js";
import { download, sealBundle } from "./release-provider.js";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 4);
  const [directory, scratch] = process.argv.slice(2);
  mkdirSync(scratch, { recursive: true });
  const { release, context } = refreshAdmission(
    directory,
    "registry",
    process.env,
    { historyRoot: scratch },
  );
  const originalJournal = sha256(
    regularBytes(join(directory, effectJournal("stage", context.stage))),
  );
  for (const lane of lanes(release.matrix)) {
    const { directory: from, identity } = download(
      process.env.GITHUB_RUN_ID,
      process.env.GITHUB_RUN_ATTEMPT,
      `registry-${lane.os}-${lane.node}-${process.env.GITHUB_RUN_ATTEMPT}`,
      scratch,
    );
    verifyLane(from, release, lane, "public registry");
    const to = join(directory, `public-${lane.os}-${lane.node}`);
    mkdirSync(to);
    const names = [
      "root-result.json",
      "isolated-result.json",
      "registry-metadata.json",
      ...release.platformArchives.map(
        (entry) => `registry-metadata-${entry.platform}.json`,
      ),
      "publication.json",
      ...["root", "isolated"].flatMap((layout) => [
        `${layout}-recipient-package.json`,
        `${layout}-lock.json`,
        `${layout}-dependencies.json`,
        `${layout}-audit.json`,
        `${layout}-native.cdx.json`,
        `${layout}.cdx.json`,
        `${layout}-inventory.json`,
        `${layout}-locations.json`,
        `${layout}-signatures.json`,
      ]),
    ];
    for (const name of names) copyFileSync(join(from, name), join(to, name), 1);
    context.artifacts.push(identity);
  }
  const security = download(
    process.env.GITHUB_RUN_ID,
    process.env.GITHUB_RUN_ATTEMPT,
    `public-security-${process.env.GITHUB_RUN_ATTEMPT}`,
    scratch,
  );
  const bytes = regularBytes(join(security.directory, "security.json"));
  verifySecurity(
    JSON.parse(bytes),
    release,
    process.env.MANIFEST_SHA,
    process.env.GITHUB_RUN_ID,
    process.env.GITHUB_RUN_ATTEMPT,
  );
  save(join(directory, "public-security.json"), bytes);
  context.registry = {
    run: process.env.GITHUB_RUN_ID,
    attempt: process.env.GITHUB_RUN_ATTEMPT,
    controller: process.env.GITHUB_SHA,
  };
  // Mutate only the continuation index; never the frozen candidate or original request.
  const { writeFileSync } = await import("node:fs");
  const { jsonBytes } = await import("./release-contract.js");
  writeFileSync(join(directory, "context.json"), jsonBytes(context), {
    flush: true,
  });
  save(join(directory, "registry-reconciliation.json"), {
    schemaVersion: 1,
    manifestSha256: process.env.MANIFEST_SHA,
    originalStageJournalSha256: originalJournal,
    stage: context.stage,
    registry: context.registry,
    state: "publicly-qualified",
    qualification:
      "anonymous exact-version bytes and native signature/provenance plus all frozen recipients",
  });
  assert.equal(
    sha256(
      regularBytes(join(directory, effectJournal("stage", context.stage))),
    ),
    originalJournal,
  );
  sealBundle(directory, process.env.MANIFEST_SHA);
}
