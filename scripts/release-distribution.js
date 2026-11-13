// SPDX-License-Identifier: AGPL-3.0-only
/** Reconcile distributed native payloads and rights with their original production.
 * GitHub authenticates the producer; member digests establish reuse of those bytes.
 */
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { sha256, regularBytes } from "./release-records.js";
import { nativePackages } from "../src/native-packages.js";

/** Same owned source census as native/build.py; additions must not escape reuse checks. */
export function nativeSourceInputs(root) {
  const paths = [
    "native/CMakeLists.txt",
    "native/dependencies.json",
    "native/icu-windows.props.in",
    "native/build.py",
    ...[
      ["core", ".hpp"],
      ["bindings", ".cpp"],
    ].flatMap(([directory, extension]) =>
      readdirSync(join(root, "native", directory))
        .filter((name) => name.endsWith(extension))
        .map((name) => `native/${directory}/${name}`),
    ),
    ...[
      "configuration.schema.json",
      "source-contract.schema.json",
      "contract-cohort.json",
    ].map((name) => `schemas/${name}`),
  ];
  return Object.fromEntries(
    paths.sort().map((path) => [path, sha256(regularBytes(join(root, path)))]),
  );
}

/** The real archive inventory supplies independently streamed digests, including notice bodies. */
export function reconcileNativeDistribution(
  subject,
  inventory,
  sourceInputs,
  dependencies,
  original,
) {
  const { platform } = subject;
  assert.ok(nativePackages[platform]);
  const files = new Map(inventory.files.map((file) => [file.path, file]));
  const json = (path) => JSON.parse(inventory.contents.get(path));
  const build = json("build-evidence.json"),
    component = json("component.json"),
    notices = json("notice-inventory.json");
  assert.equal(build.platform, platform);
  assert.equal(component.platform, platform);
  assert.deepEqual(
    build.sourceInputs,
    sourceInputs,
    "Native producer input manifest differs from candidate inputs",
  );
  const digest = sha256(
    Buffer.from(
      JSON.stringify(
        Object.fromEntries(
          Object.keys(sourceInputs)
            .sort()
            .map((path) => [path, sourceInputs[path]]),
        ),
      ),
    ),
  );
  assert.equal(build.sourceInputsSha256, digest);
  assert.equal(component.sourceInputsSha256, digest);
  assert.deepEqual(
    component.components,
    Object.fromEntries(
      Object.entries(dependencies).filter(([key]) => key !== "sources"),
    ),
  );
  const selected = Object.entries(dependencies.sources).filter(
    ([, value]) => !value.platform || value.platform === platform,
  );
  assert.deepEqual(
    build.dependencies.map(({ name }) => name).sort(),
    selected.map(([name]) => name).sort(),
    "Missing linked/build component",
  );
  for (const [name, expected] of selected) {
    const actual = build.dependencies.find((value) => value.name === name);
    for (const key of ["url", "sha256", "role"])
      assert.equal(
        actual[key],
        expected[key],
        `Changed native component ${name}`,
      );
  }
  for (const [path, expected] of Object.entries(build.artifactFiles))
    assert.equal(
      files.get(path)?.sha256,
      expected,
      `Packed native member differs: ${path}`,
    );
  for (const [path, expected] of Object.entries(component.artifacts)) {
    assert.equal(files.get(path)?.sha256, expected.sha256);
    assert.equal(files.get(path)?.size, expected.bytes);
  }
  assert.equal(notices.schemaVersion, 1);
  assert.ok(notices.originalFiles.length > 0);
  for (const notice of notices.originalFiles) {
    assert.equal(
      files.get(`notices/${notice.path}`)?.sha256,
      notice.sha256,
      `Missing distributed notice ${notice.path}`,
    );
    assert.equal(files.get(`notices/${notice.path}`)?.size, notice.bytes);
  }
  assert.ok(
    original?.origin && original.files,
    "Authenticated original native producer required",
  );
  // Exact original build evidence prevents substituting another successful build.
  for (const path of [
    "build-evidence.json",
    ...Object.keys(build.artifactFiles),
  ])
    assert.equal(
      files.get(path)?.sha256,
      original.files[path],
      `Shipped bytes differ from original producer: ${path}`,
    );
  return {
    package: subject.package,
    platform,
    archiveSha256: subject.archive.sha256,
    sourceInputsSha256: digest,
    origin: original.origin,
    buildEvidenceSha256: files.get("build-evidence.json").sha256,
    components: build.dependencies,
    artifacts: component.artifacts,
    notices: notices.originalFiles,
  };
}

/** Only the original native run/job/artifact can authenticate a reusable payload. */
export function acquireNativeProduction(origin, root, { provider, download }) {
  const observed = provider(origin.run, origin.attempt),
    run = observed.run;
  assert.equal(run.id, Number(origin.run));
  assert.equal(run.run_attempt, Number(origin.attempt));
  assert.equal(run.repository.full_name, "Hadden-Industries/json-quality");
  assert.equal(run.head_repository.full_name, run.repository.full_name);
  assert.equal(run.path, origin.workflow);
  assert.equal(run.head_sha, origin.controller);
  assert.equal(run.status, "completed");
  assert.equal(run.conclusion, "success");
  assert.equal(observed.jobs.total_count, observed.jobs.jobs.length);
  const jobs = observed.jobs.jobs.filter((job) => job.id === origin.jobId);
  assert.equal(jobs.length, 1);
  const job = jobs[0];
  assert.equal(job.name, origin.job);
  assert.equal(job.run_id, run.id);
  assert.equal(job.run_attempt, run.run_attempt);
  assert.equal(job.head_sha, origin.controller);
  assert.equal(job.conclusion, "success");
  const acquired = download(
    origin.run,
    origin.attempt,
    origin.artifactName,
    root,
  );
  assert.equal(acquired.identity.id, origin.artifactId);
  assert.equal(acquired.identity.digest, origin.artifactDigest);
  const build = JSON.parse(
    regularBytes(join(acquired.directory, "build-evidence.json")),
  );
  const files = Object.fromEntries(
    ["build-evidence.json", ...Object.keys(build.artifactFiles)].map((path) => [
      path,
      sha256(regularBytes(join(acquired.directory, path), 536870912)),
    ]),
  );
  return { origin, files, provider: observed, artifact: acquired.identity };
}

/** Manifest consumers bind inventory subjects to the exact frozen archive census. */
export function verifyDistributionInventory(release) {
  const distribution = release.distribution;
  assert.equal(distribution?.schemaVersion, 1);
  assert.equal(distribution.packing.source, release.source.commit);
  assert.deepEqual(
    distribution.subjects.map((value) => value.package).sort(),
    [
      release.package,
      ...release.platformArchives.map((value) => value.package),
    ].sort(),
  );
  for (const subject of [
    { package: release.package, archive: release.archive },
    ...release.platformArchives,
  ]) {
    const record = distribution.subjects.find(
      (value) => value.package === subject.package,
    );
    assert.equal(record.archiveSha256, subject.archive.sha256);
    assert.deepEqual(record.files, subject.archive.files);
  }
  assert.equal(distribution.native.length, 2);
  for (const subject of release.platformArchives) {
    const records = distribution.native.filter(
      (value) => value.package === subject.package,
    );
    assert.equal(records.length, 1);
    const record = records[0];
    assert.equal(record.platform, subject.platform);
    assert.equal(record.archiveSha256, subject.archive.sha256);
    const files = new Map(
      subject.archive.files.map((value) => [value.path, value]),
    );
    assert.equal(
      record.buildEvidenceSha256,
      files.get("build-evidence.json")?.sha256,
    );
    for (const [path, value] of Object.entries(record.artifacts)) {
      assert.equal(value.sha256, files.get(path)?.sha256);
      assert.equal(value.bytes, files.get(path)?.size);
    }
    for (const notice of record.notices)
      assert.equal(notice.sha256, files.get(`notices/${notice.path}`)?.sha256);
    assert.ok(record.components.length > 0 && record.notices.length > 0);
    assert.match(record.origin.artifactDigest, /^sha256:[a-f0-9]{64}$/u);
  }
  return distribution;
}
