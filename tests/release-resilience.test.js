// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gh } from "../scripts/release-provider.js";
import { budgets } from "../scripts/qualification-budgets.js";
import { downloadEvidence } from "../scripts/download-evidence.js";
import { registryBytes } from "../scripts/qualify-registry.js";
import { checkWorkflows } from "../scripts/check-workflows.js";
import {
  bundleReleaseAssets,
  acquireArchiveEvidence,
} from "../scripts/release-assets.js";
import {
  jsonBytes,
  releasePackages,
  sha256,
  sha512,
  restorationAvailability,
} from "../scripts/release-contract.js";
import {
  applyAvailability,
  stagePublishArguments,
  verifyNpmOnlyGithubState,
} from "../scripts/release-effects.js";
import {
  reconcilePromotionLabels,
  verifyRecoveryRecord,
} from "../scripts/release-recovery.js";

function temporary(t) {
  const root = mkdtempSync(join(tmpdir(), "json-quality-release-resilience-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
function release() {
  return {
    package: "@hadden-industries/json-quality",
    version: "1.0.0-rc.2",
    source: { commit: "a".repeat(40) },
    archive: { filename: "core.tgz", integrity: sha512(Buffer.from("core")) },
    platformArchives: ["linux-x64", "win32-x64"].map((platform) => ({
      package: `@hadden-industries/json-quality-${platform}`,
      version: "1.0.0-rc.2",
      archive: { filename: `${platform}.tgz` },
    })),
  };
}

test("GitHub binary operations inherit maintained transfer profiles and writes are never retried", () => {
  const calls = [];
  const invoke = (command, args, options) =>
    calls.push({ command, args, options });
  for (const args of [
    ["api", "repos/example"],
    ["release", "upload", "v1"],
    ["release", "download", "v1"],
  ])
    gh(args, {}, invoke);
  assert.deepEqual(
    calls.map((call) => call.options.timeout),
    [budgets.read, budgets.upload, budgets.collection],
  );
  let attempts = 0;
  assert.throws(
    () =>
      gh(["release", "upload", "v1"], {}, () => {
        attempts++;
        throw Object.assign(new Error("lost acknowledgement"), {
          code: "ECONNRESET",
        });
      }),
    /lost acknowledgement/,
  );
  assert.equal(attempts, 1);
});

test("artifact readback cannot start a fresh extraction window after its total deadline", async (t) => {
  const root = temporary(t),
    bytes = Buffer.from("not materialized");
  const metadata = {
    id: 1,
    expired: false,
    digest: `sha256:${sha256(bytes)}`,
    size_in_bytes: bytes.length,
    workflow_run: {
      id: 2,
      repository_id: 3,
      head_repository_id: 3,
      head_sha: "a".repeat(40),
    },
  };
  let reads = 0;
  await assert.rejects(
    downloadEvidence({
      id: 1,
      destination: join(root, "out"),
      runId: 2,
      repositoryId: 3,
      headSha: "a".repeat(40),
      deadline: 500,
      now: () => (reads >= 3 ? 1000 : 0),
      read: async (path) => {
        reads++;
        return path.endsWith("/zip") ? bytes : metadata;
      },
    }),
    /budget exhausted/,
  );
  assert.deepEqual(readdirSync(root), []);
});

test("registry availability retries exact coordinates with a shared deadline and fails closed on permanent/admission errors", async () => {
  const url = "https://registry.npmjs.org/%40fixture%2Fpackage/1.0.0-rc.2";
  for (const status of [404, 408, 429, 503]) {
    let clock = 0,
      calls = 0;
    const bytes = await registryBytes(
      url,
      16,
      async (location, options) => {
        assert.equal(location.href, url);
        assert.equal(options.redirect, "error");
        assert.equal(options.headers, undefined);
        return ++calls === 1
          ? new Response(null, { status, headers: { "retry-after": "2" } })
          : new Response("proof");
      },
      {
        now: () => clock,
        deadline: 10000,
        sleep: async (wait) => {
          clock += wait;
        },
      },
    );
    assert.equal(bytes.toString(), "proof");
    assert.equal(calls, 2);
    assert.ok(clock >= 2000);
  }
  let clock = 0,
    calls = 0;
  const collection = { bytes: 0 };
  const retried = await registryBytes(
    url,
    16,
    async () => {
      if (++calls === 1)
        return {
          status: 200,
          body: (async function* () {
            yield Buffer.from("part");
            throw Object.assign(new Error("socket reset"), {
              code: "ECONNRESET",
            });
          })(),
        };
      return new Response("proof");
    },
    {
      now: () => clock,
      deadline: 10000,
      sleep: async (wait) => {
        clock += wait;
      },
      collection,
    },
  );
  assert.equal(retried.toString(), "proof");
  assert.equal(calls, 2);
  assert.equal(collection.bytes, 9);
  clock = 0;
  calls = 0;
  await assert.rejects(
    registryBytes(
      url,
      16,
      async () => {
        calls++;
        return new Response(null, { status: 404 });
      },
      {
        now: () => clock,
        deadline: 3000,
        sleep: async (wait) => {
          clock += wait;
        },
      },
    ),
    /budget exhausted/,
  );
  assert.equal(calls, 2);
  calls = 0;
  await assert.rejects(
    registryBytes(url, 16, async () => {
      calls++;
      return new Response(null, { status: 403 });
    }),
    /HTTP 403/,
  );
  assert.equal(calls, 1);
  calls = 0;
  await assert.rejects(
    (async () =>
      JSON.parse(
        (
          await registryBytes(url, 16, async () => {
            calls++;
            return new Response("{bad");
          })
        ).toString(),
      ))(),
  );
  assert.equal(calls, 1);
});

test("workflow contracts reject reuse proof whose producer expires before the proof horizon", () => {
  const source = readFileSync(
    new URL("../.github/workflows/qualification.yml", import.meta.url),
    "utf8",
  );
  assert.ok(checkWorkflows().workflows > 0);
  assert.throws(
    () =>
      checkWorkflows({
        overrides: {
          ".github/workflows/qualification.yml": source.replace(
            "(inputs.release-mode || inputs.emit-proof)",
            "inputs.release-mode",
          ),
        },
      }),
    /retention/,
  );
});

test("restoration reads actual bundled output and historical flat proof with exact member identities", (t) => {
  const root = temporary(t),
    input = join(root, "input"),
    scratch = join(root, "scratch"),
    subject = release();
  mkdirSync(input);
  mkdirSync(scratch);
  const content = new Map([
    ["source.tar.gz", Buffer.from("source")],
    [
      "release-manifest.json",
      jsonBytes({ source: subject.source, version: subject.version }),
    ],
    ["release-review.json", Buffer.from("review")],
    ["release-acceptance.json", Buffer.from("acceptance")],
    ["THIRD-PARTY-NOTICES.md", Buffer.from("notices")],
    [
      "context.json",
      jsonBytes({
        registry: {
          run: "123",
          attempt: "1",
          controller: subject.source.commit,
        },
      }),
    ],
    [
      "public-ubuntu-24.04-24.22.1/root-lock.json",
      jsonBytes({ lockfileVersion: 3, packages: {} }),
    ],
    [
      "public-ubuntu-24.04-24.22.1/isolated-lock.json",
      jsonBytes({ lockfileVersion: 3, packages: {} }),
    ],
  ]);
  for (const item of releasePackages(subject)) {
    const bytes = Buffer.from(item.archive.filename);
    Object.assign(item.archive, { size: bytes.length, sha256: sha256(bytes) });
    content.set(item.archive.filename, bytes);
  }
  for (const [path, bytes] of content) {
    const target = join(input, path);
    mkdirSync(join(target, ".."), { recursive: true });
    writeFileSync(target, bytes);
  }
  const manifestSha = sha256(content.get("release-manifest.json"));
  const packed = bundleReleaseAssets(input, subject, scratch, manifestSha);
  const requested = [...content.keys()].filter(
    (path) => path === "context.json" || path.endsWith("-lock.json"),
  );
  const check = (directory, source, assets) => {
    mkdirSync(directory);
    for (const name of ["release-manifest.json", "release-assets.json"])
      copyFileSync(join(source, name), join(directory, name));
    acquireArchiveEvidence(
      directory,
      subject,
      assets.map((asset) => ({
        name: asset.name,
        size: asset.size,
        digest: `sha256:${asset.sha256}`,
      })),
      requested,
      {
        acquire: (name) =>
          copyFileSync(join(source, name), join(directory, name)),
      },
    );
    for (const path of requested)
      assert.deepEqual(readFileSync(join(directory, path)), content.get(path));
  };
  check(join(root, "bundle-read"), packed.bundle, packed.assets);
  const legacy = join(root, "legacy");
  mkdirSync(legacy);
  const assets = [...content].map(([path, bytes]) => {
    const name = path.replaceAll("/", "--");
    writeFileSync(join(legacy, name), bytes);
    return { name, source: path, size: bytes.length, sha256: sha256(bytes) };
  });
  const legacyIndex = jsonBytes({
    schemaVersion: 1,
    source: subject.source.commit,
    manifestSha256: manifestSha,
    assets,
  });
  writeFileSync(join(legacy, "release-assets.json"), legacyIndex);
  check(join(root, "legacy-read"), legacy, [
    ...assets,
    {
      name: "release-assets.json",
      size: legacyIndex.length,
      sha256: sha256(legacyIndex),
    },
  ]);
  const corrupted = join(root, "corrupted");
  mkdirSync(corrupted);
  for (const name of ["release-manifest.json", "release-assets.json"])
    copyFileSync(join(packed.bundle, name), join(corrupted, name));
  assert.throws(
    () =>
      acquireArchiveEvidence(
        corrupted,
        subject,
        packed.assets.map((asset) => ({
          name: asset.name,
          size: asset.size,
          digest: `sha256:${asset.sha256}`,
        })),
        requested,
        {
          acquire: (name) =>
            writeFileSync(join(corrupted, name), "substituted"),
        },
      ),
    /differs/,
  );
  assert.equal(existsSync(join(corrupted, "context.json")), false);
});

test("reviewed RC latest can restore npm-only, rejects races and reconciles an unknown npm effect without a GitHub write", (t) => {
  const root = temporary(t),
    subject = release(),
    target = "1.0.0-rc.1";
  const expected = { latest: subject.version, githubLatest: null };
  const state = {
    latest: null,
    affected: {
      id: 2,
      tag_name: `v${subject.version}`,
      prerelease: true,
      immutable: true,
      draft: false,
    },
    target: {
      id: 1,
      tag_name: `v${target}`,
      prerelease: true,
      immutable: true,
      draft: false,
    },
  };
  const snapshot = verifyNpmOnlyGithubState(state, state);
  assert.equal(
    restorationAvailability(
      {
        availability: "npm-only",
        expectedGithubLatest: null,
        affectedPrerelease: true,
        targetPrerelease: true,
      },
      expected,
    ),
    "npm-only",
  );
  assert.throws(() =>
    restorationAvailability({ availability: "npm-only" }, expected),
  );
  assert.ok(
    stagePublishArguments(root, subject, { npmTag: "latest" }).includes(
      "--tag=latest",
    ),
  );
  const env = {
    MANIFEST_SHA: "b".repeat(64),
    GITHUB_RUN_ID: "100",
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_SHA: "c".repeat(40),
  };
  let tags = { latest: subject.version },
    github = structuredClone(state),
    npmWrites = 0,
    githubWrites = 0,
    loseResponse = false;
  const operations = {
    assertCurrent: () => {},
    readNpmTags: () => ({ ...tags }),
    readGithubState: () => structuredClone(github),
    writeNpmLatest: (value) => {
      npmWrites++;
      tags.latest = value;
      if (loseResponse) throw new Error("lost npm response");
    },
    writeGithubLatest: () => {
      githubWrites++;
      throw new Error("GitHub mutation forbidden in npm-only mode");
    },
  };
  const data = {
    release: subject,
    target,
    expected,
    planOptions: { reviewedTag: "latest", npmOnly: true },
    githubSnapshot: snapshot,
    env,
  };
  const journal = join(root, "normal.jsonl");
  writeFileSync(journal, "");
  const completed = applyAvailability(
    { ...data, journal },
    operations,
  ).completed;
  assert.equal(completed.npm.latest, target);
  assert.equal(npmWrites, 1);
  assert.equal(githubWrites, 0);
  assert.deepEqual(github, state);
  tags.latest = "concurrent";
  const raced = join(root, "raced.jsonl");
  writeFileSync(raced, "");
  assert.throws(
    () => applyAvailability({ ...data, journal: raced }, operations),
    /changed/,
  );
  tags.latest = subject.version;
  github.target.prerelease = false;
  assert.throws(
    () => applyAvailability({ ...data, journal: raced }, operations),
    /changed/,
  );
  assert.equal(npmWrites, 1);
  assert.equal(githubWrites, 0);
  github = structuredClone(state);
  github.latest = { id: 3, tag_name: "v2.0.0" };
  const concurrentSnapshot = verifyNpmOnlyGithubState(github, github);
  assert.throws(
    () =>
      applyAvailability(
        { ...data, journal: raced, githubSnapshot: concurrentSnapshot },
        operations,
      ),
    /GitHub latest changed/,
  );
  assert.equal(
    npmWrites,
    1,
    "A newly captured snapshot cannot replace owner intent",
  );
  assert.equal(githubWrites, 0);
  github = structuredClone(state);
  loseResponse = true;
  const unknown = join(root, "unknown.jsonl");
  writeFileSync(unknown, "");
  assert.throws(
    () => applyAvailability({ ...data, journal: unknown }, operations),
    /lost npm response/,
  );
  const raw = readFileSync(unknown),
    record = {
      schemaVersion: 1,
      owner: "maksymshostak",
      phase: "promote",
      version: subject.version,
      manifestSha256: env.MANIFEST_SHA,
      run: "100",
      attempt: "1",
      journalSha256: sha256(raw),
      acceptedAt: "2026-10-28T00:00:00Z",
      rationale:
        "Owner selected exact native npm readback without repeating the write.",
      targetVersion: target,
      availability: "npm-only",
      expectedGithubLatest: null,
    };
  const records = verifyRecoveryRecord(record, subject, env.MANIFEST_SHA, raw);
  const observed = reconcilePromotionLabels(record, records, tags, null);
  assert.equal(records.at(-1).state, "outcome-unknown");
  assert.throws(
    () =>
      reconcilePromotionLabels(record, records, tags, {
        tag_name: "vconcurrent",
      }),
    /changed/,
  );
  loseResponse = false;
  const recovered = join(root, "recovered.jsonl");
  writeFileSync(recovered, "");
  const priorWrites = npmWrites;
  applyAvailability(
    {
      ...data,
      journal: recovered,
      recovery: { record, observed, priorLabels: expected },
    },
    operations,
  );
  assert.equal(npmWrites, priorWrites);
  assert.equal(githubWrites, 0);
  assert.deepEqual(readFileSync(unknown), raw);
  assert.equal(
    JSON.parse(readFileSync(recovered, "utf8").split("\n")[0]).operation,
    "completion-readback",
  );
});
