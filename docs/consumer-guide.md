# Consumer guide: cohort 2

Version 2 replaces the aggregate checking APIs and Base64 document request/response envelopes.
Move consumers together to the configuration, source-contract, event and native-protocol versions in `./contract-cohort`.
There is no old-reader backend or size-dependent dispatch.
Historical artifacts retain their original bytes and versions.

## Acquisition and public exports

Install the package in an isolated tooling graph with lifecycle scripts disabled.
Pin a reviewed full producer commit until a separately authorized registry release is available.
Retain the native npm lock.
`jsonQualitySourceCoordinate` admits exact versions or a full commit in the declared producer repository; ranges and alternate repositories are refused.

`jsonQualityAcquisitionBootstrap()` generates the maintained cold adapter.
Copy its returned source verbatim into the consumer's installer.
After installation, `verifyJsonQualityInstallation({ toolingRoot, bootstrapPath })` verifies selector/lock identity, generated-bootstrap agreement and every installed package member against the independently cached locked payload.
It performs no extraction or download.
Run through the selected npm toolchain and keep its native cache available.
An unverified local archive is not equivalent proof.

`assertIsolatedJsonQuality(toolingRoot)` prevents a tooling bridge from silently resolving a parent installation.
An installed checker resolves its exact platform component under `native/prebuilt/`; there is no environment override, PATH search, runtime compiler or acquisition fallback.

The root export supplies:

- `openJsonSourceSession`, `openJsonRepositorySession` and `validateJsonQualityEvent`;
- `formatJsonSource`, `formatJsonValue`, `normalizeJsonSource` and their declared capability objects;
- `admitJsonPolicy`, `jsonContract` and `jsonFormatOptions`;
- `runJsonQualityCli`, `qualifyJsonConsumer` and acquisition/installation helpers.

Closed schemas are available through `./configuration-schema`, `./source-contract-schema`, `./event-schema` and `./contract-cohort`.
`./eslint` exports the JavaScript identity guard; consumers install their own supported ESLint.
Private source paths and retired schema exports are denied.

## Stream a source and read lossless values

```js
import { openJsonSourceSession } from "@hadden-industries/json-quality";

const session = await openJsonSourceSession({
  runtimeControls: { managedMemoryTargetBytes: 33554432 },
});
try {
  let source;
  for await (const event of session.check({
    async *open({ signal }) {
      signal.throwIfAborted();
      yield Buffer.from('{\n  "value": 1.00\n}\n');
    },
  })) {
    if (event.type === "source") source = event.source;
    // Findings remain visible, including deliberately expected negatives.
  }
  const value = await session.select(source, "/value");
  const part = await session.read(value, "number-lexeme", "0", "65536");
  console.log(part.bytes.toString()); // 1.00
} finally {
  await session.close();
}
```

An opener returns an asynchronous byte stream.
It receives cancellation and must cooperate with it.
An optional `identity` declares exact `sha256` and canonical decimal `byteLength`; the core verifies both.
Contracts are validated before the opener is invoked.
Supplying arrays, objects, a materialized document or a caller-selected backend is not this source contract.

`select` accepts a decoded JSON Pointer.
`selectStream` supports an identified streamed pointer for oversized keys.
JSONL selection requires its exact physical `record` number in canonical decimal form.
`describe`, `sameReference`, `read`, `fragments`, `readSource` and `sourceFragments` operate within the same session and store.
`children(container)` asynchronously yields immediate children in source order as `{ value, name, ordinal }`, one descriptor at a time.
`name` is a scoped key reference for object members and `null` for array elements; use bounded reads for large names.
Duplicate members remain distinct.
Byte offsets, lengths and counts use decimal strings; references are opaque capabilities.
Serialized reference labels do not grant access or survive closure.

Read representations include `source-json`, `decoded-utf8`, `number-lexeme`, `nfc-utf8` and `json-pointer`, where applicable to the selected kind.
Range reads return `bytes`, `offset` and `totalByteLength`.
Consume fragments before requesting the next fragment.
Retaining returned events, bytes or references adds consumer-owned state.

`materialize` explicitly leases bounded representation bytes.
`materializeControl(value, maximum, validator)` first reserves conservative byte/node workspace, then parses and invokes a complete caller-owned validator.
The entire retained source must have completed positive shared checking, including when only a finite subtree is converted.
A subtree reservation excludes unrelated sibling nodes.
Inspect `lease.value` while live, and `await lease.release()` afterwards.
`transfer()` moves an independently admitted object and its accounting obligation to the caller; it does not prolong borrowed references.
A shared quality pass is not domain admission.

Always await `close()`.
Early iterator return cancels incomplete work.
Concurrent exchanges within one session are refused; independent sessions retain independent budgets and lifetimes.

## Complete repository checks and trusted adapters

```js
const session = await openJsonRepositorySession({ root: repositoryRoot });
try {
  for await (const event of session.events()) consume(event);
} finally {
  await session.close();
}
```

The repository owns a strictly admitted, bounded `.json-quality.json` with `schemaVersion: 2`.
Bootstrap is checked by the same core, materialized under a reservation, validated with the package's local Ajv schema, frozen, and charged to the configured execution.
Invocation controls govern bootstrap; effective policy controls govern the main operation.

Checking reconciles Git, actual owned-tree discovery, required generated outputs, native providers and logical providers.
Source terminals are provisional.
`execution-terminal` establishes complete inventory, observations, diagnostics and declared linkage; `domainComplete` remains false.
`qualityPassed` describes intrinsic shared quality, while `contractSatisfied` includes exact expected-negative obligations.
Expected findings remain delivered.
Changed bytes, spans, Unicode scalar identities or missing logical members cannot match a pin.

`nativeProviders` maps declared policy provider names to trusted functions.
A function receives `{ root, parameters, signal }` and returns asynchronous `authorities`, `inventory` and `documents` streams plus optional `close`.
Each authority supplies a path, SHA-256 and decimal byte length.
Each inventory entry independently identifies a member and its content-addressed source or archive member.
A document supplies `{ path, chunks }`; each chunk is at most 64 KiB.
The core reconciles inventory and actual capture, and rechecks physical authorities.
Empty native scope still requires a verified authority.
Missing, extra or undeclared providers cannot complete.

An admitted content-addressed source may store strict JSON under an opaque filename.
Archive members require a supported JSON dialect; independently inventoried `.map` source maps use strict JSON grammar.
A recognizable unsupported suffix such as `.json5` remains refused.
Native provider obligations cannot be excluded into a successful incomplete census: reconcile the trusted owner and policy instead.
The native definition's `formatContract` supplies a producer default; exact policy path exceptions retain precedence over that default.

`logicalProviders` entries contain a trusted `definition` and an `inventory(access)` asynchronous factory returning an asynchronous stream.
Each definition declares nonempty `containerPaths` glob selectors for the captured metadata and payload containers it needs.
The factory can access and link only those containers; this does not filter repository checking.
Check-only executions retain full value indexes for those containers and exact policy linkage obligations, while other sources still receive complete quality checking and immutable capture.
Explicit `retainValues: true` additionally retains values for the caller's later access.
The factory runs after physical/native capture and receives a read-only view of the same execution's captured sources, value operations, effective resources and cancellation signal.
Use `access.capturedSource(path)` and `select`/`describe`/`read`/`fragments` to locate actual container metadata without parsing a second complete container object.
For one finite metadata record, `access.materializeControl(value, maximum, validator)` uses the shared byte/node reservation and caller-owned domain validator; release its lease before requesting another.
Provider settlement releases any remaining borrowed lease.
Explicit small `materialize` leases charge that same execution and must be released after use; factory settlement releases its outstanding leases and invalidates its borrowed references.
The view exposes no source upload, checker, raw native ID, backend, close or write authority.
References from the provider view cannot be used through the caller's separate session facade.
A logical inventory member declares `path`, `containerPath`, decoded `pointer`, optional record selector, `encoding` (`utf8` or canonical `base64`), SHA-256 and decimal byte length.
The core reselects from the frozen checked container and verifies the actual decoded bytes.
Do not supply an unrelated document buffer as linkage evidence.

`preserveSourcePresentation` is available only after native or logical provenance admission.
It retains presentation while preserving semantic and exact-byte obligations.
Ordinary physical JSON is not covered by that seam.
Narrow NFC preservation pins name attributable, protected exact decoded values.
Collisions, unpinned values and other shared rules remain checked.

## Explicit transformations and replacements

The pure writers return finite text and never write a file.
`formatJsonSource(text)` preserves decoded values, order and numeric lexemes under fixed package Prettier options.
Default quality admission refuses unsafe or non-NFC content.
Explicit source preservation can be selected through a closed `contract`, for example `{ normalization: "preserve", allowFormatWrites: false, owner, reason }`.
This is an attributable contract choice, not automatic normalization.

`formatJsonValue(value)` accepts an already materialized plain producer object.
Getters, custom serialization, sparse/extended arrays, cycles, unsupported values, nonfinite numbers and negative zero are refused before producer serialization. Object ownership and domain validation remain with the producer. `normalizeJsonSource(text)` changes string/key literal spans only, with collision preflight and complete semantic checks.

All pure writers use options `{ contract, temporaryDirectory, capacityLimits, runtimeControls, signal }`.
Their separate capability is 2 MiB source/output and at most 4096 normalization changes. Larger or more complex transformations can refuse while scalable reads/checks remain available.
Existing semantic hashing/canonicalization protocols must not be replaced by formatting.

For repository effects, consume `session.events()` to completion, then iterate `session.rewrite("format", { files })` or `session.rewrite("normalize", { files })`.
Normalization requires explicit paths; formatting can select all writable physical sources.
One rewrite is permitted per retained session.
A session opened with `retainValues: false` cannot rewrite.

The writer preflights the complete peer set and every actual candidate, including changed logical dependents, before the first replacement.
A candidate must satisfy its complete selected contract.
Consequently normalization refuses an otherwise repaired file that would still have presentation errors; make the authored input presentation valid or repair through its owning producer.
Protected/ignored/native/logical/JSONL sources never acquire generic write permission.
Windows policy matching also checks the actual filesystem spelling of a Git alias.

`write-preflight`, `written` and `write-terminal`/`write-failure` report decimal selected, changed and confirmed-written counts.
Replacement uses exclusive sibling staging, permissions, actual staged-byte hashes, original observations and post-rename verification.
Failures can report an uncertain path.
Batches are not atomic; completed writes are not silently rolled back.
The policy is replaced last.

## CLI and migration

| Command                                        | Input and completion                                             |
| ---------------------------------------------- | ---------------------------------------------------------------- |
| `check --root PATH --json`                     | Complete repository, NDJSON ending in `execution-terminal`.      |
| `source --json --contract JSON`                | Raw stdin, closed source contract, final source `terminal`.      |
| `format --root PATH --json -- literal.json`    | Complete preflight, selected explicit writes, final write event. |
| `normalize --root PATH --json -- literal.json` | Complete preflight and explicit NFC write selection.             |

CLI success requires the applicable final terminal and exit 0.
Shared quality/contract failure returns 1 for read-only checks.
Operational, replacement or delivery failure returns 2.
The final applicable terminal is withheld until cleanup succeeds.
NDJSON uses backpressure; broken output cannot produce success.

`runJsonQualityCli(args, context)` supports a trusted object or async context factory with `root`, `requiredOutputs`, `nativeProviders` and `logicalProviders`.
A trusted root cannot be overridden on the command line.
Help and invalid command grammar do not load the context.
Raw source checking cannot replace trusted repository obligations.

Remove `inventory`, `lint`, `format --check`, `--scope`, `--request`, `--files`, `--concurrency`, aggregate result readers and Base64 envelopes.
Use complete checking, streamed events, explicit source openers and literal write selection.
Rework consumers around terminal evidence instead of reconstructing an unbounded aggregate report.

The [resource guide](resource-limits.md), [native protocol](native-protocol.md) and [trusted CI guide](ci-trust.md) describe independent controls and evidence boundaries.
