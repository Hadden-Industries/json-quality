// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveJsonQualityPolicy,
  defaultJsonQualityPolicy,
  resolveJsonSourceContract,
} from "../src/configuration.js";
import { snapshotControl } from "../src/control-snapshot.js";

test("absent and sparse policy resolve into independent immutable NFC defaults", () => {
  const absent = resolveJsonQualityPolicy(),
    empty = resolveJsonQualityPolicy({});
  assert.deepEqual(absent, empty);
  assert.notEqual(absent, empty);
  assert.notEqual(absent.defaults, defaultJsonQualityPolicy.defaults);
  assert.equal(absent.schemaVersion, 4);
  assert.equal(absent.defaults.normalization, "NFC");
  for (const value of [
    absent,
    absent.defaults,
    absent.exceptions,
    defaultJsonQualityPolicy.defaults,
  ])
    assert.ok(Object.isFrozen(value));
  const input = { defaults: { normalization: "preserve" } },
    copy = resolveJsonQualityPolicy(input);
  input.defaults.normalization = "NFC";
  assert.equal(copy.defaults.normalization, "preserve");
  assert.equal(copy.defaults.allowSourceRewrites, true);
  assert.throws(
    () => resolveJsonQualityPolicy({ schemaVersion: 3 }),
    /cohort 4/u,
  );
  assert.throws(() => resolveJsonQualityPolicy(null), /configuration/u);
});

test("descriptor and proxy admission never executes caller code", () => {
  let calls = 0;
  const getter = Object.defineProperty({}, "defaults", {
    enumerable: true,
    get() {
      calls++;
      throw new Error("executed");
    },
  });
  const proxy = new Proxy(
    {},
    {
      ownKeys() {
        calls++;
        throw new Error("executed");
      },
      getPrototypeOf() {
        calls++;
        throw new Error("executed");
      },
    },
  );
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();
  for (const value of [
    getter,
    proxy,
    revoked.proxy,
    { defaults: proxy },
    {
      toJSON() {
        calls++;
      },
    },
  ])
    assert.throws(() => resolveJsonQualityPolicy(value), /policy-control/u);
  for (const options of [
    getter,
    proxy,
    { capacityLimits: proxy },
    { runtimeControls: getter },
  ])
    assert.throws(
      () => resolveJsonQualityPolicy({}, options),
      /control option/iu,
    );
  assert.equal(calls, 0);
});

test("plain controls reject lossy JSON values and count repeated occurrences", () => {
  for (const value of [
    undefined,
    NaN,
    Infinity,
    -0,
    1n,
    Symbol(),
    () => 0,
    "\ud800",
    new Date(),
    Array(1),
    Object.assign([], { extra: 1 }),
    Object.defineProperty({}, "x", { value: 1 }),
  ])
    assert.throws(() => snapshotControl(value), /policy-control/u);
  const shared = { x: 1 },
    copied = snapshotControl([shared, shared]);
  assert.equal(copied.valueNodeCount, 5n);
  assert.notEqual(copied.value[0], copied.value[1]);
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => snapshotControl(cyclic), /policy-control-data/u);
  const prototypeKey = snapshotControl(
    JSON.parse('{"__proto__":{"polluted":true}}'),
  ).value;
  assert.equal(Object.getPrototypeOf(prototypeKey), Object.prototype);
  assert.ok(Object.hasOwn(prototypeKey, "__proto__"));
  assert.equal({}.polluted, undefined);
  assert.equal(prototypeKey.__proto__.polluted, true);
});

test("resolver enforces invocation bytes, nesting, memory and exact UTF-8 cost", () => {
  const text = '{"a":"é\\n\\u0000😀"}',
    input = JSON.parse(text);
  const measured = snapshotControl(input);
  assert.equal(
    measured.encodedByteLength,
    BigInt(Buffer.byteLength(JSON.stringify(input))),
  );
  assert.equal(
    measured.managedReservationBytes,
    measured.encodedByteLength * 5n + measured.valueNodeCount * 256n,
  );
  assert.throws(
    () =>
      snapshotControl(input, {
        maximumBytes: Number(measured.encodedByteLength) - 1,
      }),
    /byte-capacity/u,
  );
  assert.throws(
    () =>
      resolveJsonQualityPolicy({}, { capacityLimits: { maxPolicyBytes: 2 } }),
    /byte-capacity/u,
  );
  assert.throws(
    () =>
      resolveJsonQualityPolicy(
        {},
        { runtimeControls: { maxManagedMemoryBytes: 256 } },
      ),
    /memory-capacity/u,
  );
  assert.throws(
    () =>
      resolveJsonQualityPolicy(
        { defaults: {} },
        { runtimeControls: { maxNestingDepth: 1 } },
      ),
    /nesting-capacity/u,
  );
  let deep = {};
  for (let index = 0; index < 20000; index++) deep = { child: deep };
  assert.throws(() => resolveJsonQualityPolicy(deep), /nesting-capacity/u);
});

test("package boundaries protect tracked dependencies and npm locks without broad exclusions", () => {
  const policy = resolveJsonQualityPolicy();
  for (const path of [
    "node_modules/a/data.json",
    "x/node_modules/a/data.json",
    ".git/state.json",
  ])
    assert.equal(
      resolveJsonSourceContract(path, policy).excludeUntrackedSources,
      true,
    );
  const tracked = resolveJsonSourceContract(
    "x/node_modules/a/data.json",
    policy,
    { tracked: true },
  );
  assert.equal(tracked.excludeUntrackedSources, false);
  assert.equal(tracked.allowSourceRewrites, false);
  for (const path of [
    "dist/a.json",
    "vendor/a.json",
    "generated/a.json",
    ".hidden/a.json",
  ])
    assert.equal(
      resolveJsonSourceContract(path, policy).excludeUntrackedSources,
      false,
    );
  for (const path of ["package-lock.json", "x/npm-shrinkwrap.json"]) {
    const lock = resolveJsonSourceContract(path, policy);
    assert.equal(lock.allowSourceRewrites, false);
    assert.equal(lock.formatContract, "producer-json-indent");
    assert.deepEqual(lock.allowEmptyKeys, ["/packages/"]);
  }
});
