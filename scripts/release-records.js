// SPDX-License-Identifier: AGPL-3.0-only
/** Startup-safe release records: no installed npm packages or service clients. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { DEFAULT_PACKAGE_VERIFICATION_LIMITS as packageCapabilities } from "../src/package-payload.js";

export function effectJournal(phase, origin) {
  assert.ok(["stage", "archive", "promote"].includes(phase));
  if (origin.service) {
    assert.equal(phase, "promote");
    assert.ok(["npm", "github"].includes(origin.service));
  }
  for (const value of [origin.run, origin.attempt])
    assert.match(String(value), /^[1-9]\d{0,15}$/u);
  return `${phase}${origin.service ? `-${origin.service}` : ""}-${origin.run}-${origin.attempt}.jsonl`;
}
export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export const sha512 = (bytes) =>
  "sha512-" + createHash("sha512").update(bytes).digest("base64");
export const jsonBytes = (value) =>
  Buffer.from(JSON.stringify(value, null, 2) + "\n");
/** Separate durable intents from proved unsent requests without inventing an outcome. */
export function requestedIntents(records) {
  const result = [];
  for (let index = 0; index < records.length; index += 2) {
    const [intent, outcome] = records.slice(index, index + 2);
    assert.equal(intent.state, "intent");
    if (outcome) {
      assert.ok(
        ["completed", "outcome-unknown", "request-not-sent"].includes(
          outcome.state,
        ),
      );
      assert.equal(
        outcome.intentSha256,
        sha256(Buffer.from(JSON.stringify(intent) + "\n")),
      );
      if (outcome.state === "request-not-sent") {
        assert.equal(outcome.requestStarted, false);
        continue;
      }
    } else
      assert.equal(
        index,
        records.length - 1,
        "Only the final request outcome may be absent",
      );
    result.push(intent);
  }
  return result;
}
export function save(path, value) {
  writeFileSync(path, Buffer.isBuffer(value) ? value : jsonBytes(value), {
    flag: "wx",
    flush: true,
  });
}
export function regularBytes(path, limit = 20000000) {
  const stat = lstatSync(path);
  assert.ok(
    stat.isFile() && !stat.isSymbolicLink() && stat.size <= limit,
    "Unsafe or oversized evidence file",
  );
  return readFileSync(path);
}
/** Binary subjects share package transport bounds; metadata keeps its own bound. */
export function releaseArtifactBytes(path) {
  return regularBytes(
    path,
    /\.(?:tgz|tar\.gz)$/u.test(String(path))
      ? packageCapabilities.maximumArchiveBytes
      : 20000000,
  );
}
export const readJson = (path) => JSON.parse(regularBytes(path));

/** Index only bounded ordinary files; artifact consumers name each retained member. */
export function evidenceIndex(directory) {
  const entries = readdirSync(directory, {
    recursive: true,
    withFileTypes: true,
  });
  assert.ok(
    entries.every((entry) => entry.isFile() || entry.isDirectory()),
    "Linked or unsupported evidence entry",
  );
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const full = join(entry.parentPath, entry.name),
        name = full.slice(directory.length + 1).replaceAll("\\", "/");
      const bytes = releaseArtifactBytes(full);
      return { name, sha256: sha256(bytes), size: bytes.length };
    });
  assert.ok(files.length <= 4096);
  return files;
}
export function sealBundle(directory, manifestSha) {
  const files = evidenceIndex(directory).filter(
    ({ name }) => name !== "evidence-index.json",
  );
  writeFileSync(
    join(directory, "evidence-index.json"),
    jsonBytes({ schemaVersion: 1, manifestSha256: manifestSha, files }),
    { flush: true },
  );
}
export function recordNoRequest(directory, phase, env) {
  const origin = {
    run: env.GITHUB_RUN_ID,
    attempt: env.GITHUB_RUN_ATTEMPT,
    ...(env.PROMOTION_SERVICE ? { service: env.PROMOTION_SERVICE } : {}),
  };
  const journal = join(directory, effectJournal(phase, origin));
  assert.ok(
    !existsSync(journal) || regularBytes(journal).length === 0,
    "No-request marker conflicts with a request journal",
  );
  const path = join(
      directory,
      `no-effect-${phase}${origin.service ? `-${origin.service}` : ""}-${origin.run}-${origin.attempt}.json`,
    ),
    marker = {
      schemaVersion: 1,
      state: "no-request",
      phase,
      ...origin,
      controller: env.GITHUB_SHA,
      manifestSha256: env.MANIFEST_SHA,
    };
  if (existsSync(path)) assert.deepEqual(readJson(path), marker);
  else save(path, marker);
}

export function journalEffect(
  path,
  subject,
  operation,
  request,
  {
    env = process.env,
    before = null,
    guard,
    verify = (value) => value,
    preRequest,
  } = {},
) {
  if (existsSync(path)) {
    const prior = readFileSync(path, "utf8").trim();
    const records = prior
      ? prior.split("\n").map((line) => JSON.parse(line))
      : [];
    assert.equal(records.length % 2, 0, "Unresolved prior journal request");
    for (let i = 0; i < records.length; i += 2) {
      assert.equal(
        records[i + 1].state,
        "completed",
        "Unknown request cannot be retried",
      );
      assert.ok(
        records[i].operation !== operation,
        "Request operation was already journalled",
      );
    }
  }
  const intent = {
    ...(env.PROMOTION_SERVICE
      ? { schemaVersion: 2, service: env.PROMOTION_SERVICE }
      : {}),
    state: "intent",
    package: subject.package,
    version: subject.version,
    source: subject.source.commit,
    manifestSha256: env.MANIFEST_SHA,
    integrity: subject.archive.integrity,
    operation,
    run: env.GITHUB_RUN_ID,
    attempt: env.GITHUB_RUN_ATTEMPT,
    controller: env.GITHUB_SHA,
    before,
    ...(guard ? { guard } : {}),
    requestedAt: new Date().toISOString(),
  };
  const line = Buffer.from(JSON.stringify(intent) + "\n");
  appendFileSync(path, line, { flag: "a", flush: true });
  let requestStarted = false;
  let acknowledgement;
  const acknowledge = () => {
    const name = `${path}.${sha256(line)}.ack.json`;
    acknowledgement = {
      schemaVersion: 1,
      state: "request-acknowledged",
      intentSha256: sha256(line),
      observedAt: new Date().toISOString(),
    };
    save(name, acknowledgement);
  };
  try {
    preRequest?.();
    requestStarted = true;
    const result = verify(request(acknowledge));
    const outcome = {
      state: "completed",
      intentSha256: sha256(line),
      result,
      ...(acknowledgement
        ? {
            requestAcknowledged: true,
            acknowledgementSha256: sha256(jsonBytes(acknowledgement)),
          }
        : {}),
      observedAt: new Date().toISOString(),
    };
    appendFileSync(path, JSON.stringify(outcome) + "\n", { flush: true });
    return outcome;
  } catch (error) {
    appendFileSync(
      path,
      JSON.stringify({
        state: requestStarted ? "outcome-unknown" : "request-not-sent",
        requestStarted,
        intentSha256: sha256(line),
        nextAction: requestStarted
          ? "Inspect native state and retained request/response; do not repeat this request."
          : "Guard refused before the provider request; a new owner decision must bind current preimages.",
        ...(acknowledgement || error.requestAcknowledged
          ? {
              requestAcknowledged: true,
              ...(acknowledgement
                ? { acknowledgementSha256: sha256(jsonBytes(acknowledgement)) }
                : {}),
              ...(error.completion ? { completion: error.completion } : {}),
            }
          : {}),
      }) + "\n",
      { flush: true },
    );
    throw error;
  }
}
