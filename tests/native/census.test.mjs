// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { NativeSession } from "./client.mjs";

const contract = { formatContract: "producer-json-compact-body" };
const identity = (text) => ({
  byteLength: String(Buffer.byteLength(text)),
  sha256: createHash("sha256").update(text).digest("hex"),
});
async function provider(session, id, kind = "physical", minimum = "0") {
  return session.command("census-provider", { id, kind, minimum });
}
async function add(session, provider, path, fields = {}) {
  return session.command("census-add", { provider, path, ...fields });
}
async function archiveAuthority(session) {
  const bytes = Buffer.from([0xff, 0x00]),
    pin = identity(bytes);
  const captured = await session.capture(
    [bytes],
    {},
    { sourceKind: "authority", identity: pin },
  );
  await session.command("census-authority", {
    provider: "archive",
    path: "bundle.zip",
    source: captured.source,
    identity: pin,
  });
  return (memberPath) => ({
    source: captured.source,
    kind: "archive-member",
    memberPath,
    path: "bundle.zip",
    ...pin,
  });
}
async function capture(session, text) {
  const source = await session.capture([Buffer.from(text)], contract);
  for await (const event of session.events())
    if (event.type === "terminal")
      assert.equal(event.diagnosticsComplete, true);
  return source.source;
}

test("census path admission counts separators and Unicode scalar characters", async () => {
  for (const [path, accepted] of [
    ["a.json", true],
    ["é.json", true],
    ["a/b.json", false],
  ]) {
    const session = new NativeSession();
    try {
      await session.configure({ maxRequestPathCharacters: "7" });
      await provider(session, "tree");
      if (accepted) await add(session, "tree", path);
      else
        await assert.rejects(
          add(session, "tree", path),
          /request-path-capacity/,
        );
    } finally {
      await session.close();
    }
  }
});

test("census reconciles independent physical sightings and checked source identities", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    await provider(session, "git");
    await provider(session, "tree");
    await add(session, "git", "vendor/tracked.json");
    await add(session, "tree", "owned.json");
    await add(session, "git", "owned.json");
    const before = (await session.command("census-status")).result;
    assert.equal(before.complete, false);
    assert.equal(before.members, "2");
    assert.equal(before.missing, "2");
    for (const [path, text] of [
      ["owned.json", "0"],
      ["vendor/tracked.json", "true"],
    ]) {
      const source = await capture(session, text);
      await session.command("census-bind", { path, source });
    }
    await session.command("census-close-inventory", { provider: "git" });
    await session.command("census-close-inventory", { provider: "tree" });
    assert.equal(
      (await session.command("census-status")).result.complete,
      false,
    );
    await session.command("census-close-provider", { provider: "tree" });
    await session.command("census-close-provider", { provider: "git" });
    const terminal = (await session.command("census-status")).result;
    assert.equal(terminal.complete, true);
    assert.equal(terminal.contractSatisfied, true);
    assert.equal(terminal.members, "2");
    assert.equal(terminal.missing, "0");
    const first = (await session.command("census-next", { after: "" })).result;
    assert.equal(first.member.path, "owned.json");
    const second = (
      await session.command("census-next", { after: first.member.path })
    ).result;
    assert.equal(second.member.path, "vendor/tracked.json");
    assert.equal(
      (await session.command("census-next", { after: second.member.path }))
        .result.member,
      null,
    );
    assert.equal((await session.command("metrics")).result.transitions, "0");
  } finally {
    await session.close();
  }
});

test("native census cannot close with a missing independently enumerated member", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    await provider(session, "archive", "native", "2");
    const origin = await archiveAuthority(session);
    await add(session, "archive", "bundle.zip!/one.json", {
      identity: identity("0"),
      origin: origin("one.json"),
    });
    await add(session, "archive", "bundle.zip!/two.json", {
      identity: identity("1"),
      origin: origin("two.json"),
    });
    await session.command("census-close-inventory", { provider: "archive" });
    assert.equal((await session.command("census-status")).result.missing, "2");
    await assert.rejects(
      session.command("census-close-provider", { provider: "archive" }),
      /census-member-missing/,
    );
  } finally {
    await session.close();
  }
});

for (const [name, first, second, error] of [
  ["duplicate sighting", "one.json", "one.json", /census-member-duplicate/],
  ["ASCII case collision", "A.json", "a.json", /census-case-collision/],
  ["Unicode case collision", "Σ.json", "σ.json", /census-case-collision/],
  ["nonliteral path", "one.json", "../two.json", /census-path-contract/],
]) {
  test(`census rejects ${name}`, async () => {
    const session = new NativeSession();
    try {
      await session.configure();
      await provider(session, "git");
      await add(session, "git", first);
      await assert.rejects(add(session, "git", second), error);
    } finally {
      await session.close();
    }
  });
}

test("native member binding verifies the actual captured bytes and kind", async () => {
  for (const wrongBytes of [false, true]) {
    const session = new NativeSession();
    try {
      await session.configure();
      await provider(session, "archive", "native", "1");
      const origin = await archiveAuthority(session);
      await add(session, "archive", "bundle.zip!/one.json", {
        identity: identity("0"),
        origin: origin("one.json"),
      });
      await session.command("census-close-inventory", { provider: "archive" });
      const captured = await session.capture(
        [Buffer.from(wrongBytes ? "1" : "0")],
        contract,
        { sourceKind: "native" },
      );
      for await (const event of session.events())
        if (event.type === "terminal")
          assert.equal(event.contractSatisfied, true);
      const bind = () =>
        session.command("census-bind", {
          path: "bundle.zip!/one.json",
          source: captured.source,
        });
      if (wrongBytes)
        await assert.rejects(bind(), /census-member-source-mismatch/);
      else {
        await bind();
        await session.command("census-close-provider", { provider: "archive" });
        assert.equal(
          (await session.command("census-status")).result.complete,
          true,
        );
      }
    } finally {
      await session.close();
    }
  }
});

test("census refuses a member whose diagnostic stream has not closed", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    await provider(session, "tree");
    await add(session, "tree", "one.json");
    const captured = await session.capture([Buffer.from("0")], contract);
    await assert.rejects(
      session.command("census-bind", {
        path: "one.json",
        source: captured.source,
      }),
      /census-source-incomplete/,
    );
  } finally {
    await session.close();
  }
});

test("census rejects an unexpected delivered member and an undersized native inventory", async () => {
  for (const extra of [false, true]) {
    const session = new NativeSession();
    try {
      await session.configure();
      await provider(session, "archive", "native", "1");
      if (extra) {
        const source = await capture(session, "0");
        await assert.rejects(
          session.command("census-bind", { path: "extra.json", source }),
          /census-member-unexpected/,
        );
      } else {
        await session.command("census-close-inventory", {
          provider: "archive",
        });
        await assert.rejects(
          session.command("census-close-provider", { provider: "archive" }),
          /census-provider-minimum/,
        );
      }
    } finally {
      await session.close();
    }
  }
});

test("logical census rejects equal bytes detached from their enumerated container value", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    const container = await capture(session, '["0","0"]');
    const selected = [];
    for (const pointer of ["/0", "/1"])
      selected.push(
        (await session.command("select-value", { source: container, pointer }))
          .result.value.id,
      );
    assert.notEqual(selected[0], selected[1]);
    await provider(session, "logical", "logical", "1");
    await add(session, "logical", "derived.json", {
      identity: identity("0"),
      containerSource: container,
      value: selected[0],
      encoding: "utf8",
    });
    const { result: captured } = await session.command("begin-linked-source", {
      value: selected[1],
      encoding: "utf8",
      identity: identity("0"),
      contract,
    });
    for await (const event of session.events())
      if (event.type === "terminal")
        assert.equal(event.contractSatisfied, true);
    await assert.rejects(
      session.command("census-bind", {
        path: "derived.json",
        source: captured.source,
      }),
      /census-logical-linkage/,
    );
  } finally {
    await session.close();
  }
});

test("large independent census spills once under the shared budget and retains sorted membership", async () => {
  const session = new NativeSession();
  try {
    await session.configure({ managedMemoryTargetBytes: "16777216" });
    await provider(session, "tree");
    const prefix = "x".repeat(120) + "/" + "y".repeat(100) + "/";
    for (let index = 9999; index >= 0; index--)
      await add(
        session,
        "tree",
        prefix + String(index).padStart(5, "0") + ".json",
      );
    await session.command("census-close-inventory", { provider: "tree" });
    const status = (await session.command("census-status")).result;
    assert.equal(status.members, "10000");
    assert.equal(status.missing, "10000");
    assert.equal(status.complete, false);
    assert.equal(
      (await session.command("census-next", { after: "" })).result.member.path,
      prefix + "00000.json",
    );
    assert.equal(
      (await session.command("census-next", { after: prefix + "09998.json" }))
        .result.member.path,
      prefix + "09999.json",
    );
    const metrics = (await session.command("metrics")).result;
    assert.equal(metrics.transitions, "1");
    assert.ok(BigInt(metrics.managedPeakBytes) <= 16777216n);
    assert.ok(BigInt(metrics.scratchPeakBytes) > 0n);
  } finally {
    await session.close();
  }
});

test("one hundred thousand inventory identities retain exact capacity and completion accounting", async () => {
  const session = new NativeSession();
  try {
    await session.configure({
      managedMemoryTargetBytes: "16777216",
      maxFiles: "100000",
    });
    await provider(session, "tree");
    for (let index = 0; index < 100000; index++)
      await add(
        session,
        "tree",
        "member-" + String(index).padStart(6, "0") + ".json",
      );
    const status = (await session.command("census-status")).result;
    assert.equal(status.members, "100000");
    assert.equal(status.missing, "100000");
    assert.equal(status.complete, false);
    assert.equal((await session.command("metrics")).result.transitions, "1");
    await assert.rejects(
      add(session, "tree", "overflow.json"),
      /census-file-capacity/,
    );
  } finally {
    await session.close();
  }
});

test("directory traversal drains one persisted lease at a time before inventory closure", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    await provider(session, "tree");
    await session.command("census-enqueue-directory", {
      provider: "tree",
      path: "",
    });
    const take = async () =>
      (await session.command("census-take-directory", { provider: "tree" }))
        .result.directory;
    assert.equal(await take(), "");
    await session.command("census-enqueue-directory", {
      provider: "tree",
      path: "nested",
    });
    await session.command("census-close-directory", {
      provider: "tree",
      path: "",
    });
    assert.equal(await take(), "nested");
    await session.command("census-close-directory", {
      provider: "tree",
      path: "nested",
    });
    assert.equal(await take(), null);
    const closed = (
      await session.command("census-next-closed-directory", {
        provider: "tree",
        after: null,
      })
    ).result.directory;
    assert.equal(closed.path, "");
    assert.equal(closed.observation, "");
    await session.command("census-close-inventory", { provider: "tree" });
  } finally {
    await session.close();
  }
});

test("an undrained directory queue cannot assert complete tree inventory", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    await provider(session, "tree");
    await session.command("census-enqueue-directory", {
      provider: "tree",
      path: "",
    });
    await assert.rejects(
      session.command("census-close-inventory", { provider: "tree" }),
      /census-directory-incomplete/,
    );
  } finally {
    await session.close();
  }
});

test("independent sightings cannot replace a frozen filesystem observation", async () => {
  const session = new NativeSession();
  try {
    await session.configure();
    await provider(session, "git");
    await provider(session, "tree");
    await add(session, "git", "one.json", { observation: "original-file" });
    await assert.rejects(
      add(session, "tree", "one.json", { observation: "replacement-file" }),
      /census-source-observation-changed/,
    );
  } finally {
    await session.close();
  }
});
