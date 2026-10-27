// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  readdirSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { downloadEvidence } from "../scripts/download-evidence.js";
import { budgets } from "../scripts/qualification-process.js";
import { sourceInventoryWorkspace } from "../scripts/release-inventory.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const python = process.platform === "win32" ? "python" : "python3";
function temporary(t) {
  const path = mkdtempSync(join(tmpdir(), "json-quality-transport-"));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  return path;
}
function command(args) {
  return spawnSync(python, args, {
    encoding: "utf8",
    windowsHide: true,
    timeout: budgets.read,
    cwd: root,
  });
}
function zip(path, name) {
  const result = command([
    "-c",
    "import sys,zipfile; z=zipfile.ZipFile(sys.argv[1],'w'); z.writestr(sys.argv[2],'proof'); z.close()",
    path,
    name,
  ]);
  assert.equal(result.status, 0, result.stderr);
}
test("native ZIP inspection rejects traversal and excessive expansion before any writes", (t) => {
  const temp = temporary(t);
  for (const [index, name] of [
    "../escape",
    "nested/../../escape",
    "C:/escape",
    "a\\b",
    "CON.json",
    "x./proof",
    "nested/proof",
  ].entries()) {
    const archive = join(temp, `${index}.zip`),
      destination = join(temp, `out-${index}`);
    mkdirSync(destination);
    zip(archive, name);
    const result = command([
      "scripts/extract-artifact.py",
      archive,
      destination,
      "4",
    ]);
    assert.notEqual(result.status, 0, name);
    assert.deepEqual(readdirSync(destination), []);
  }
  const archive = join(temp, "valid.zip"),
    destination = join(temp, "valid");
  mkdirSync(destination);
  zip(archive, "nested/proof.json");
  const result = command([
    "scripts/extract-artifact.py",
    archive,
    destination,
    "5",
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    readFileSync(join(destination, "nested/proof.json"), "utf8"),
    "proof",
  );
});
test("artifact pack is deterministic and refuses diagnostic log copies", (t) => {
  const temp = temporary(t),
    source = join(temp, "source");
  mkdirSync(source);
  writeFileSync(join(source, "proof.json"), "{}\n");
  for (const name of ["a.zip", "b.zip"]) {
    const result = command([
      "scripts/pack-artifact.py",
      source,
      join(temp, name),
      "1024",
    ]);
    assert.equal(result.status, 0, result.stderr);
  }
  assert.deepEqual(
    readFileSync(join(temp, "a.zip")),
    readFileSync(join(temp, "b.zip")),
  );
  writeFileSync(join(source, "driver.log"), "diagnostic");
  assert.notEqual(
    command(["scripts/pack-artifact.py", source, join(temp, "c.zip"), "1024"])
      .status,
    0,
  );
});
test("release inventory scratch never enters its admitted evidence transport", (t) => {
  const temp = temporary(t),
    output = join(temp, "evidence");
  mkdirSync(output);
  const workspace = sourceInventoryWorkspace(output, temp);
  mkdirSync(join(workspace, "source-install", "node_modules"), {
    recursive: true,
  });
  mkdirSync(join(workspace, "logs"), { recursive: true });
  writeFileSync(
    join(workspace, "source-install", "node_modules", "package.json"),
    "{}",
  );
  writeFileSync(join(workspace, "logs", "npm.log"), "diagnostic");
  writeFileSync(join(output, "source-audit.json"), "{}");
  const result = command([
    "scripts/pack-artifact.py",
    output,
    join(temp, "proof.zip"),
    "1024",
  ]);
  assert.equal(result.status, 0, result.stderr);
});
test("native payload transport preserves safe executable permissions", (t) => {
  const temp = temporary(t),
    source = join(temp, "source"),
    archive = join(temp, "payload.zip"),
    destination = join(temp, "extracted");
  mkdirSync(source);
  mkdirSync(destination);
  const setup = command([
    "-c",
    "import pathlib,sys; p=pathlib.Path(sys.argv[1])/'tool'; p.write_text('payload'); p.chmod(0o755)",
    source,
  ]);
  assert.equal(setup.status, 0, setup.stderr);
  assert.equal(
    command(["scripts/pack-artifact.py", source, archive, "1024"]).status,
    0,
  );
  const verify = command([
    "-c",
    "import pathlib,sys,zipfile; p=pathlib.Path(sys.argv[1])/'tool'; i=zipfile.ZipFile(sys.argv[2]).getinfo('tool'); assert (i.external_attr >> 16) & 0o111 == p.stat().st_mode & 0o111",
    source,
    archive,
  ]);
  assert.equal(verify.status, 0, verify.stderr);
  const crafted = join(temp, "executable.zip");
  const makeExecutable = command([
    "-c",
    "import sys,zipfile; z=zipfile.ZipFile(sys.argv[1],'w'); i=zipfile.ZipInfo('tool'); i.external_attr=0o104755 << 16; z.writestr(i,'payload'); z.close()",
    crafted,
  ]);
  assert.equal(makeExecutable.status, 0, makeExecutable.stderr);
  const extraction = command([
    "scripts/extract-artifact.py",
    crafted,
    destination,
    "1024",
  ]);
  assert.equal(extraction.status, 0, extraction.stderr);
  const mode = command([
    "-c",
    "import os,pathlib,stat,sys; p=pathlib.Path(sys.argv[1])/'tool'; assert p.read_text()=='payload'; assert os.name=='nt' or stat.S_IMODE(p.stat().st_mode)==0o755",
    destination,
  ]);
  assert.equal(mode.status, 0, mode.stderr);
});
test("download digest mismatch stops before extraction and valid bytes are consumed exactly once", async (t) => {
  const temp = temporary(t),
    archive = join(temp, "proof.zip");
  zip(archive, "proof.json");
  const bytes = readFileSync(archive);
  const digest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  const metadata = {
    id: 7,
    expired: false,
    digest,
    size_in_bytes: bytes.length,
    workflow_run: {
      id: 8,
      repository_id: 9,
      head_repository_id: 9,
      head_sha: "a".repeat(40),
    },
  };
  let downloads = 0;
  const read = async (path) => {
    if (path.endsWith("/zip")) {
      downloads++;
      return bytes;
    }
    return metadata;
  };
  const input = {
    id: 7,
    destination: join(temp, "out"),
    read,
    runId: 8,
    repositoryId: 9,
    headSha: "a".repeat(40),
  };
  const before = process.env.RUNNER_TEMP;
  process.env.RUNNER_TEMP = temp;
  t.after(() => {
    if (before === undefined) delete process.env.RUNNER_TEMP;
    else process.env.RUNNER_TEMP = before;
  });
  metadata.digest = "sha256:" + "b".repeat(64);
  await assert.rejects(downloadEvidence(input));
  assert.equal(downloads, 1);
  metadata.digest = digest;
  let observations = 0;
  const expiredDestination = join(temp, "expired");
  await assert.rejects(
    downloadEvidence({
      ...input,
      destination: expiredDestination,
      read: async (path) =>
        path.endsWith("/zip")
          ? bytes
          : { ...metadata, expired: ++observations > 1 },
    }),
  );
  assert.equal(
    existsSync(expiredDestination),
    false,
    "Expired metadata must fail before materialization",
  );
  await downloadEvidence(input);
  assert.equal(downloads, 2);
  assert.equal(readFileSync(join(temp, "out/proof.json"), "utf8"), "proof");
  metadata.workflow_run.head_repository_id = 10;
  await assert.rejects(
    downloadEvidence({ ...input, destination: join(temp, "foreign") }),
  );
  assert.equal(
    downloads,
    2,
    "Unexpected fork identity must fail before downloading",
  );
  await downloadEvidence({
    ...input,
    headRepositoryId: 10,
    destination: join(temp, "fork"),
  });
  assert.equal(downloads, 3);
  assert.equal(readFileSync(join(temp, "fork/proof.json"), "utf8"), "proof");
});
