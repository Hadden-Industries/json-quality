// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  discoverRepositorySources,
  recheckRepositoryDiscovery,
} from "../../src/repository-discovery.js";
import {
  captureRepositorySource,
  recheckRepositorySource,
} from "../../src/repository-source.js";
import { NativeSession, nativeTemporaryRoot } from "./client.mjs";

test("real repository discovery rescues tracked boundaries and includes ignored owned JSON", async () => {
  const root = await mkdtemp(join(nativeTemporaryRoot, "repository-census-"));
  const session = new NativeSession();
  try {
    for (const directory of ["external/.hidden", "generated", "owned/nested"])
      await mkdir(join(root, directory), { recursive: true });
    for (const path of [
      "external/.hidden/tracked.json",
      "external/omitted.json",
      "generated/ignored.json",
      "owned/nested/ordinary.json",
    ])
      await writeFile(join(root, path), "0");
    await writeFile(join(root, ".gitignore"), "generated/\nexternal/\n");
    const git = (args) =>
      execFileSync("git", ["-C", root, ...args], {
        windowsHide: true,
        encoding: "utf8",
      });
    git(["init", "--quiet"]);
    git(["add", "--force", "external/.hidden/tracked.json"]);
    assert.equal(git(["ls-files"]), "external/.hidden/tracked.json\n");
    const configured = await session.configure();
    await discoverRepositorySources({
      root,
      session,
      capacities: configured.result.resources.admission,
      contractFor: (path) => ({
        exclude: path.startsWith(".git/") || path.startsWith("external/"),
      }),
      requiredOutputs: ["generated/*.json"],
    });
    const found = [];
    let after = "";
    while (true) {
      const { member } = (await session.command("census-next", { after }))
        .result;
      if (!member) break;
      found.push(member.path);
      after = member.path;
    }
    assert.deepEqual(found, [
      "external/.hidden/tracked.json",
      "generated/ignored.json",
      "owned/nested/ordinary.json",
    ]);
    const status = (await session.command("census-status")).result;
    assert.equal(status.complete, false);
    assert.equal(status.members, "3");
    assert.equal(status.missing, "3");
    for (const path of found) {
      const { member } = (
        await session.command("census-next", { after: path.slice(0, -1) })
      ).result;
      assert.equal(member.path, path);
      const captured = await captureRepositorySource({
        root,
        member,
        session,
        contract: { formatContract: "producer-json-compact-body" },
      });
      for await (const event of session.events())
        if (event.type === "terminal")
          assert.equal(event.contractSatisfied, true);
      await session.command("census-bind", { path, source: captured.source });
    }
    for (const provider of ["git", "tree"])
      await session.command("census-close-provider", { provider });
    assert.equal(
      (await session.command("census-status")).result.complete,
      true,
    );
    const { member } = (await session.command("census-next", { after: "" }))
      .result;
    await recheckRepositoryDiscovery({
      root,
      session,
      capacities: configured.result.resources.admission,
    });
    await recheckRepositorySource({ root, member });
    await writeFile(join(root, member.path), "1");
    await assert.rejects(
      recheckRepositorySource({ root, member }),
      /Source changed/,
    );
  } finally {
    await session.close();
    await rm(root, { recursive: true, force: true });
  }
});

for (const change of ["directory", "Git"]) {
  test(`the ${change} census is rechecked after discovery`, async () => {
    const root = await mkdtemp(
      join(nativeTemporaryRoot, "repository-freshness-"),
    );
    const session = new NativeSession();
    try {
      execFileSync("git", ["-C", root, "init", "--quiet"], {
        windowsHide: true,
      });
      await writeFile(join(root, "one.json"), "0");
      const configured = await session.configure();
      const options = {
        root,
        session,
        capacities: configured.result.resources.admission,
        contractFor: (path) => ({ exclude: path.startsWith(".git/") }),
      };
      await discoverRepositorySources(options);
      await recheckRepositoryDiscovery(options);
      if (change === "directory")
        await writeFile(join(root, "extra.json"), "0");
      else
        execFileSync("git", ["-C", root, "add", "one.json"], {
          windowsHide: true,
        });
      await assert.rejects(
        recheckRepositoryDiscovery(options),
        /changed after discovery/,
      );
    } finally {
      await session.close();
      await rm(root, { recursive: true, force: true });
    }
  });
}

test("a file changed after discovery cannot become a checked census member", async () => {
  const root = await mkdtemp(join(nativeTemporaryRoot, "repository-mutation-"));
  const session = new NativeSession();
  try {
    execFileSync("git", ["-C", root, "init", "--quiet"], { windowsHide: true });
    await writeFile(join(root, "one.json"), "0");
    const configured = await session.configure();
    await discoverRepositorySources({
      root,
      session,
      capacities: configured.result.resources.admission,
      contractFor: (path) => ({ exclude: path.startsWith(".git/") }),
    });
    const { member } = (await session.command("census-next", { after: "" }))
      .result;
    assert.equal(member.path, "one.json");
    await writeFile(join(root, "one.json"), "true");
    await assert.rejects(
      captureRepositorySource({ root, member, session }),
      /Source changed/,
    );
    assert.equal((await session.command("census-status")).result.missing, "1");
  } finally {
    await session.close();
    await rm(root, { recursive: true, force: true });
  }
});
