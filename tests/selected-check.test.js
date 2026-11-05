// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { writeFile, mkdir, link, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { subscribe, unsubscribe } from "node:diagnostics_channel";
import { temporaryDirectory } from "./temporary-directory.js";
import {
  checkJsonFiles,
  checkSelectedFiles,
  openSelectedExecution,
} from "../src/selected-check.js";

test("selected option admission rejects implicit roots and authority-bearing fields before component acquisition", async () => {
  for (const options of [
    { files: ["a.json"] },
    { root: "", files: ["a.json"] },
    { root: ".", files: ["a.json"], nativeProviders: {} },
    { root: ".", files: ["a.json"], logicalProviders: [] },
    { root: ".", files: ["a.json"], requiredOutputs: [] },
    { root: ".", files: ["a.json"], retainValues: true },
    { root: ".", files: ["a.json"], component: {} },
  ])
    await assert.rejects(
      checkJsonFiles(options).next(),
      /explicit root|control option/u,
    );
});

test("selected option admission rejects executable data and invalid literal identities", async () => {
  let invoked = false;
  const getter = {
      root: ".",
      get files() {
        invoked = true;
        return ["a.json"];
      },
    },
    files = [];
  Object.defineProperty(files, "0", {
    get() {
      invoked = true;
      return "a.json";
    },
    enumerable: true,
  });
  for (const options of [
    getter,
    { root: ".", files },
    { root: ".", files: new Proxy(["a.json"], {}) },
  ])
    await assert.rejects(
      checkJsonFiles(options).next(),
      /control option|plain literal|nonempty literal/u,
    );
  assert.equal(invoked, false);
  for (const selection of [
    [],
    ["../a.json"],
    ["/a.json"],
    ["a\\b.json"],
    ["dir/./a.json"],
    ["a.jsonc"],
    ["a.JSON"],
    [""],
  ])
    await assert.rejects(
      checkJsonFiles({ root: ".", files: selection }).next(),
      /literal files|repository-relative|Unsupported JSON/u,
    );
});

async function fixture(t, documents, policy = {}) {
  const root = temporaryDirectory(t, "json-selected-root-"),
    temporary = temporaryDirectory(t, "json-selected-storage-"),
    { verifiedComponent } = await import("./native/client.mjs");
  await writeFile(
    join(root, ".json-quality.json"),
    JSON.stringify(
      {
        schemaVersion: 4,
        defaults: {
          formatContract: "prettier-json",
          normalization: "NFC",
          allowSourceRewrites: true,
        },
        exceptions: [],
        ...policy,
      },
      null,
      2,
    ) + "\n",
  );
  for (const [path, content] of Object.entries(documents)) {
    const parent = path.includes("/")
      ? path.slice(0, path.lastIndexOf("/"))
      : "";
    if (parent && parent !== path)
      await mkdir(join(root, parent), { recursive: true });
    await writeFile(join(root, path), content);
  }
  return { root, temporaryDirectory: temporary, component: verifiedComponent };
}

async function collect(options, component) {
  const events = [];
  for await (const event of checkSelectedFiles(options, component))
    events.push(event);
  return events;
}

test("selected native checks pass beside invalid unselected peers without Git or provider execution", async (t) => {
  const { component, ...options } = await fixture(t, {
      "good.json": "{}\n",
      "bad.json": "{bad",
    }),
    children = [],
    observe = ({ process: child }) => children.push(child.spawnargs);
  subscribe("child_process", observe);
  let events;
  try {
    events = await collect(
      { ...options, files: ["good.json"], requestId: "selected-good" },
      component,
    );
  } finally {
    unsubscribe("child_process", observe);
  }
  assert.deepEqual(children, []);
  const terminal = events.at(-1);
  assert.equal(terminal.type, "selection-terminal");
  assert.deepEqual(terminal.operationScope, {
    kind: "selected-files",
    policy: "repository",
    completeRepositoryCheck: false,
  });
  assert.equal(terminal.qualityPassed, true);
  assert.equal(terminal.contractSatisfied, true);
  assert.equal(terminal.selectedSourceCount, "1");
  assert.equal(terminal.completedSourceCount, "1");
  assert.equal(terminal.policyObservationComplete, true);
  assert.equal(terminal.sourceObservationsComplete, true);
  assert.ok(
    events.every(
      (event) =>
        event.schemaVersion === 5 && event.requestId === "selected-good",
    ),
  );
  assert.ok(
    !events.some(
      (event) =>
        event.path === "bad.json" || event.type === "execution-terminal",
    ),
  );
  assert.ok(!(await readdir(options.root)).includes(".git"));
  assert.deepEqual(await readdir(options.temporaryDirectory), []);
});

test("selected native checks retain explicit excluded reads and producer ownership", async (t) => {
  const { component, ...options } = await fixture(
      t,
      { "hidden/a.json": "{}\n", "package-lock.json": "{}\n" },
      {
        exceptions: [
          {
            paths: ["hidden/**"],
            owner: "fixture",
            reason: "Automatic discovery boundary",
            excludeUntrackedSources: true,
          },
        ],
      },
    ),
    owner = await openSelectedExecution(options, component);
  try {
    assert.equal(
      owner.contractFor("hidden/a.json").excludeUntrackedSources,
      true,
    );
    assert.equal(
      owner.contractFor("package-lock.json").allowSourceRewrites,
      false,
    );
    assert.equal(
      owner.contractFor("package-lock.json").formatContract,
      "producer-json-indent",
    );
  } finally {
    await owner.close();
  }
  const events = await collect(
    { ...options, files: ["hidden/a.json", "package-lock.json"] },
    component,
  );
  assert.equal(events.at(-1).completedSourceCount, "2");
  assert.equal(events.at(-1).contractSatisfied, true);
});

test("selected native admission rejects duplicate physical aliases and directories before source delivery", async (t) => {
  const { component, ...options } = await fixture(t, {
    "a.json": "{}\n",
    "dir/a.json": "{}\n",
  });
  await link(join(options.root, "a.json"), join(options.root, "alias.json"));
  await mkdir(join(options.root, "directory.json"));
  for (const files of [
    ["a.json", "a.json"],
    ["a.json", "alias.json"],
    ["a.json", "directory.json"],
    ["a.json", "missing.json"],
  ]) {
    const delivered = [];
    await assert.rejects(async () => {
      for await (const event of checkSelectedFiles(
        { ...options, files },
        component,
      ))
        delivered.push(event);
    }, /Duplicate|Nonregular|ENOENT/u);
    assert.deepEqual(delivered, []);
  }
});

test("selected native terminals retain completed quality refusals and policy freshness", async (t) => {
  const { component, ...options } = await fixture(t, {
      "bad.json": "{bad",
      "good.json": "{}\n",
    }),
    refused = await collect({ ...options, files: ["bad.json"] }, component);
  assert.equal(refused.at(-1).type, "selection-terminal");
  assert.equal(refused.at(-1).complete, true);
  assert.equal(refused.at(-1).qualityPassed, false);
  const delivered = [];
  await assert.rejects(async () => {
    for await (const event of checkSelectedFiles(
      { ...options, files: ["good.json"] },
      component,
    )) {
      delivered.push(event);
      if (event.type === "terminal")
        await writeFile(join(options.root, ".json-quality.json"), "{}\n");
    }
  }, /changed/u);
  assert.ok(!delivered.some((event) => event.type === "selection-terminal"));
});

test("selected native iteration cleanup withholds completion and empties owned temporary storage", async (t) => {
  const { component, ...options } = await fixture(t, { "a.json": "{}\n" }),
    iterator = checkSelectedFiles({ ...options, files: ["a.json"] }, component);
  assert.equal((await iterator.next()).value.type, "selection");
  await iterator.return();
  assert.deepEqual(await readdir(options.temporaryDirectory), []);
});

test("selected native cleanup failure withholds the aggregate terminal", async (t) => {
  const { component, ...options } = await fixture(t, { "a.json": "{}\n" }),
    binding = component.binding,
    original = new Error("selected-cleanup-failed"),
    delivered = [];
  let closeRequests = 0,
    retainedHandle,
    retainedFrame;
  const injected = {
    ...component,
    binding: {
      create: (...args) => binding.create(...args),
      hello: (...args) => binding.hello(...args),
      cancel: (...args) => binding.cancel(...args),
      release: (...args) => binding.release(...args),
      exchange(handle, bytes) {
        if (
          bytes[0] === "c".charCodeAt(0) &&
          JSON.parse(bytes.subarray(5).toString("utf8")).command === "close" &&
          ++closeRequests === 2
        ) {
          retainedHandle = handle;
          retainedFrame = Buffer.from(bytes);
          return Promise.reject(original);
        }
        return binding.exchange(handle, bytes);
      },
    },
  };
  try {
    await assert.rejects(
      async () => {
        for await (const event of checkSelectedFiles(
          { ...options, files: ["a.json"] },
          injected,
        ))
          delivered.push(event);
      },
      (error) => error === original,
    );
    assert.ok(delivered.some((event) => event.type === "terminal"));
    assert.ok(!delivered.some((event) => event.type === "selection-terminal"));
  } finally {
    // Settle the real retained native owner after the one injected failure.
    if (retainedHandle) {
      await binding.exchange(retainedHandle, retainedFrame);
      binding.release(retainedHandle);
    }
  }
  assert.deepEqual(await readdir(options.temporaryDirectory), []);
});

test("selected native checks refuse linked obligations before delivering a selected source", async (t) => {
  const input = '{\n  "embedded": "{}\\n"\n}\n',
    digest = (text) => createHash("sha256").update(text).digest("hex"),
    { component, ...options } = await fixture(
      t,
      { "a.json": input },
      {
        exceptions: [
          {
            paths: ["a.json"],
            owner: "fixture",
            reason: "An independently checked linked source is required",
            allowSourceRewrites: false,
            expected: {
              sha256: digest(input),
              byteLength: String(Buffer.byteLength(input)),
              diagnostics: [],
              linkedDocuments: [
                {
                  path: "linked.json",
                  pointer: "/embedded",
                  encoding: "utf8",
                  sha256: digest("{}\n"),
                  byteLength: "3",
                },
              ],
            },
          },
        ],
      },
    );
  const delivered = [];
  await assert.rejects(async () => {
    for await (const event of checkSelectedFiles(
      { ...options, files: ["a.json"] },
      component,
    ))
      delivered.push(event);
  }, /linked-document obligations.*Run check/u);
  assert.deepEqual(delivered, []);
});

test("selected native checks withhold terminals after selected mutation or newly appearing policy", async (t) => {
  const { component, ...options } = await fixture(t, { "a.json": "{}\n" }),
    delivered = [];
  await assert.rejects(async () => {
    for await (const event of checkSelectedFiles(
      { ...options, files: ["a.json"] },
      component,
    )) {
      delivered.push(event);
      if (event.type === "terminal")
        await writeFile(join(options.root, "a.json"), "[]\n");
    }
  }, /changed/u);
  assert.ok(!delivered.some((event) => event.type === "selection-terminal"));
  await rm(join(options.root, ".json-quality.json"));
  const owner = await openSelectedExecution(options, component);
  try {
    await writeFile(join(options.root, ".json-quality.json"), "{}\n");
    await assert.rejects(owner.recheck(), /Configuration appeared/u);
  } finally {
    await owner.close();
  }
});

test("selected native admission charges the complete selection before source delivery", async (t) => {
  const { component, ...options } = await fixture(t, {
      "a.json": "{}\n",
      "b.json": "{}\n",
    }),
    delivered = [];
  await assert.rejects(async () => {
    for await (const event of checkSelectedFiles(
      {
        ...options,
        files: ["a.json", "b.json"],
        capacityLimits: { maxPhysicalAndNativeSources: 1 },
      },
      component,
    ))
      delivered.push(event);
  }, /selected-source-capacity/u);
  assert.deepEqual(delivered, []);
  assert.deepEqual(await readdir(options.temporaryDirectory), []);
});

test("selected virtual contracts preserve producer protection without invented disk identities", async (t) => {
  const { component, ...options } = await fixture(
      t,
      {},
      {
        preserveSourcePresentation: [
          {
            paths: ["owned.json"],
            owner: "producer",
            reason: "Source serialization belongs to producer",
          },
        ],
      },
    ),
    owner = await openSelectedExecution(options, component);
  try {
    const contract = owner.contractFor("owned.json", undefined, true);
    assert.equal(contract.allowSourceRewrites, false);
    assert.equal(contract.formatContract, "preserved-bytes");
    assert.equal(contract.expected, undefined);
    assert.equal(
      owner.contractFor("new.json", undefined, true).allowSourceRewrites,
      true,
    );
  } finally {
    await owner.close();
  }
});
