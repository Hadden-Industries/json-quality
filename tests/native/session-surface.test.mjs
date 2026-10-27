// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  createSourceSession,
  createRepositorySession,
} from "../../src/session-surface.js";
import { nativeTemporaryRoot, verifiedComponent } from "./client.mjs";
import { validateJsonQualityEvent } from "../../src/events.js";

const options = { temporaryDirectory: nativeTemporaryRoot },
  contract = { formatContract: "producer-json-compact-body" },
  source = (text) => ({
    async *open() {
      yield Buffer.from(text);
    },
  });

test("source facade keeps capabilities after terminal and closes them explicitly", async () => {
  const session = await createSourceSession(verifiedComponent, options),
    sibling = await createSourceSession(verifiedComponent, options);
  try {
    assert.equal(session.projectRepositoryEvents, undefined);
    assert.equal(session.core, undefined);
    let reference;
    for await (const event of session.check(source('"retained"'), contract)) {
      if (event.type === "source") reference = event.source;
      if (event.type === "terminal")
        assert.equal(event.contractSatisfied, true);
    }
    const value = await session.select(reference);
    assert.equal(
      (await session.readSource(reference)).bytes.toString(),
      '"retained"',
    );
    await assert.rejects(
      sibling.readSource(reference),
      /foreign-or-invalid-reference/,
    );
    await assert.rejects(
      sibling.select(reference),
      /foreign-or-invalid-reference/,
    );
    assert.equal(
      (await session.read(value, "decoded-utf8")).bytes.toString(),
      "retained",
    );
    await Promise.all([session.close(), session.close()]);
    await assert.rejects(session.read(value, "decoded-utf8"), /closed-session/);
  } finally {
    await session.close();
    await sibling.close();
  }
});

test("source declaration admission precedes opening trusted input", async () => {
  const session = await createSourceSession(verifiedComponent, options);
  let opened = false;
  try {
    await assert.rejects(async () => {
      for await (const event of session.check(
        {
          identity: { byteLength: "invalid", sha256: "invalid" },
          async *open() {
            opened = true;
            yield Buffer.from("0");
          },
        },
        contract,
      ))
        void event;
    });
    assert.equal(opened, false);
  } finally {
    await session.close();
  }
});

test("scratch parent admission precedes opening source bytes", async () => {
  const session = await createSourceSession(verifiedComponent, {
    temporaryDirectory: join(nativeTemporaryRoot, "absent-scratch-parent"),
  });
  let opened = false;
  try {
    await assert.rejects(async () => {
      for await (const event of session.check(
        {
          async *open() {
            opened = true;
            yield Buffer.from("0");
          },
        },
        contract,
      ))
        void event;
    });
    assert.equal(opened, false);
  } finally {
    await session.close();
  }
  await assert.rejects(
    createSourceSession(verifiedComponent, { temporaryDirectory: "\uD800" }),
    /Temporary directory/,
  );
});

test("versioned event delivery preserves caller correlation and snapshotted flags across complete structural delivery", async () => {
  const session = await createSourceSession(verifiedComponent, options),
    consumption = {
      includeValues: true,
      requestId: "independent-request",
      retainValues: true,
    };
  try {
    const iterator = session.check(
      source('{"n":1,"v":[true,null,"a"]}'),
      contract,
      consumption,
    );
    consumption.includeValues = false;
    consumption.requestId = "changed-later";
    let values = 0,
      reference,
      root;
    for await (const event of iterator) {
      assert.equal(validateJsonQualityEvent(event), true);
      assert.equal(event.schemaVersion, 2);
      assert.equal(event.requestId, "independent-request");
      if (event.type === "source") reference = event.source;
      if (event.type === "value") {
        values++;
        if (event.kind === "object") {
          root = event.reference;
          assert.equal(event.sha256, null);
        }
      }
    }
    assert.equal(values, 8);
    assert.equal(
      session.sameReference(root, await session.select(reference)),
      true,
    );
    await assert.rejects(
      session.describe({ ...root }),
      /foreign-or-invalid-reference/,
    );
    assert.equal(
      validateJsonQualityEvent({ schemaVersion: 1, type: "terminal" }),
      false,
    );
    assert.equal(
      validateJsonQualityEvent({
        schemaVersion: 2,
        requestId: "incomplete",
        type: "terminal",
        qualityPassed: true,
      }),
      false,
    );
  } finally {
    await session.close();
  }
});

test("source facade rejects obsolete options and coerced consumption flags", async () => {
  await assert.rejects(
    createSourceSession(verifiedComponent, { backend: "node" }),
    /Invalid JSON session options/,
  );
  const session = await createSourceSession(verifiedComponent, options);
  try {
    for (const name of ["includeValues", "retainValues"])
      assert.throws(
        () => session.check(source("0"), contract, { [name]: "true" }),
        /boolean/,
      );
    session.check(source("0"), contract);
    await session.close();
    assert.throws(() => session.check(source("0"), contract), /closed-session/);
  } finally {
    await session.close();
  }
});

test("close aborts and settles a cooperative source before releasing its session", async () => {
  const session = await createSourceSession(verifiedComponent, options);
  let announce,
    settled = false;
  const opened = new Promise((resolve) => {
      announce = resolve;
    }),
    iterator = session.check(
      {
        // eslint-disable-next-line require-yield -- Cancellation fixture deliberately emits nothing.
        async *open({ signal }) {
          try {
            announce();
            await new Promise((resolve) => {
              if (signal.aborted) resolve();
              else signal.addEventListener("abort", resolve, { once: true });
            });
            signal.throwIfAborted();
          } finally {
            settled = true;
          }
        },
      },
      contract,
    ),
    pending = iterator.next();
  // Observe rejection immediately, before close initiates cancellation.
  const rejected = assert.rejects(pending);
  await opened;
  await session.close();
  await rejected;
  assert.equal(settled, true);
  assert.equal(session.signal.aborted, true);
});

test("repository facade consumes one census and retains scoped reads until close", async () => {
  const root = await mkdtemp(join(nativeTemporaryRoot, "surface-repository-"));
  let session;
  try {
    execFileSync("git", ["-C", root, "init", "--quiet"], { windowsHide: true });
    await writeFile(
      join(root, ".json-quality.json"),
      JSON.stringify(
        {
          schemaVersion: 2,
          defaults: {
            formatContract: "prettier-json",
            allowFormatWrites: true,
            normalization: "NFC",
          },
          exceptions: [],
        },
        null,
        2,
      ) + "\n",
    );
    await writeFile(join(root, "value.json"), '"retained"\n');
    session = await createRepositorySession(verifiedComponent, {
      ...options,
      root,
    });
    let reference, terminal;
    for await (const event of session.events()) {
      if (event.type === "execution") {
        const unknown = structuredClone(event);
        unknown.resources.runtime.unknownBudget = "1";
        assert.equal(validateJsonQualityEvent(unknown), false);
        const missing = structuredClone(event);
        delete missing.resources.admission.maxFileBytes;
        assert.equal(validateJsonQualityEvent(missing), false);
        const disabledRuntime = structuredClone(event);
        disabledRuntime.resources.runtime.maxCheckTimeMs = null;
        assert.equal(validateJsonQualityEvent(disabledRuntime), false);
      }
      if (event.type === "source" && event.path === "value.json")
        reference = event.source;
      if (event.type === "execution-terminal") terminal = event;
    }
    assert.equal(terminal.contractSatisfied, true);
    assert.throws(() => session.events(), /execution-events-already-consumed/);
    const value = await session.select(reference);
    assert.equal(
      (await session.read(value, "decoded-utf8")).bytes.toString(),
      "retained",
    );
  } finally {
    await session?.close();
    await rm(root, { recursive: true, force: true });
  }
});
