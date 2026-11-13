# JSON Quality consumer guide

Use this guide to [read a value from its original bytes](#stream-a-source-and-read-lossless-values), [check a complete repository](#complete-repository-checks-and-trusted-adapters), or [apply a guarded repair](#explicit-transformations-and-replacements).
The examples use JSON Quality 1.0.1 and the Node.js ESM API from contract cohort 6.
For individual signatures and return types, see the [API reference](api.md).

## Acquisition and public exports

Install version 1.0.1 as a development dependency and invoke its public binary:

```sh
npm install --save-dev --save-exact @hadden-industries/json-quality@1.0.1
npm exec -- json-quality check
```

No wrapper, copied repository exclusions or `.json-quality.json` is required.
Commit the npm-generated lockfile and use `npm ci` for clean installs.

An exact-version install selects this release independently of npm availability tags.
An unversioned install follows `latest`, which can select a different version.

### Node.js runtime boundary

The CLI, root SDK and `./eslint` integration are Node.js tooling, including when used as development dependencies in frontend projects.
Do not import the JavaScript entry points into browser application code.
Both JavaScript exports put an explicit browser refusal before their Node condition and refuse unmatched environments.

Their TypeScript declarations are selected within the Node condition; use Node-aware module resolution such as `NodeNext`.
Browser conditions also refuse declarations, and generic bundler resolution without the Node condition cannot select them.

The four JSON schemas and `./contract-cohort` remain independent data exports under all of these conditions.
Reading those resources does not make the SDK browser-compatible.

### Find a package export

The root export supplies:

- `checkJsonFiles`, `openJsonSourceSession`, `openJsonRepositorySession` and `validateJsonQualityEvent`;
- `formatJsonSource`, `formatJsonValue`, `normalizeJsonSource` and their declared capability objects;
- `resolveJsonQualityPolicy`, `resolveJsonSourceContract` and `jsonFormatOptions`;
- `runJsonQualityCli`, `qualifyGitJsonSources` and optional installation-verification helpers.

Closed schemas are available through `./configuration-schema`, `./effective-policy-schema`, `./source-contract-schema` and `./event-schema`; `./contract-cohort` inventories their versions.
`./eslint` exports the JavaScript identity guard; consumers install their own supported ESLint.
Private source paths and retired schema exports are denied.

### Advanced installation verification

Consumers can optionally verify package-family integrity independently of installation, including in an isolated tooling graph.
Declare the qualified exact package version in that graph and keep lifecycle scripts disabled when its admission workflow requires it.
`parseJsonQualityRegistrySpecifier` admits exact registry versions or exact aliases of this package; ranges, Git dependencies, file archives and alternate packages are refused.

The producer owns native compilation, packaging and distribution; consumers do not copy release archives into their repositories.
Source commits identify review and CI inputs separately from the registry archive's immutable integrity.

After an ordinary npm installation, `verifyJsonQualityInstallation({ toolingRoot })` verifies selector/lock identity and every installed package member against the independently cached locked payload.
Its independent `installationControls` and `verificationControls` options govern installed-family and archive verification quotas.
It performs no extraction or download.

Run through the selected npm toolchain and keep its native cache available.
The cache is populated by native npm acquisition from the locked registry artifact.
Git dependencies do not guarantee a portable packed-archive digest and cannot supply this proof.

`assertJsonQualityInstallationRoot(toolingRoot)` prevents a tooling bridge from silently resolving a parent installation.
The core declares exact-version optional packages for Windows x64 and Linux x64 glibc, matching Markdown Quality's distribution pattern.
Native npm installs the matching package; keep optional dependencies enabled.
The installed checker resolves that package and requires its version to match the core.

Each native package contains both the Node addon and standalone executable, component identities and notices.
There is no environment override, PATH search, runtime compiler or acquisition fallback.
Omitting the matching optional dependency fails explicitly.

## Stream a source and read lossless values

The input contains the number `1.00`.
Read it as a `number-lexeme` to get all four bytes back.
Run the example as an ES module in a project with the package installed.

```js
import { openJsonSourceSession } from "@hadden-industries/json-quality";

const session = await openJsonSourceSession({
  runtimeControls: { maxManagedMemoryBytes: 33554432 },
});
try {
  let source;
  let terminal;
  for await (const event of session.check({
    async *open({ signal }) {
      signal.throwIfAborted();
      yield Buffer.from('{\n  "value": 1.00\n}\n');
    },
  })) {
    if (event.type === "source") source = event.source;
    if (event.type === "terminal") terminal = event;
    if (event.type === "finding") console.error(event);
  }
  if (!source || !terminal?.contractSatisfied) {
    throw new Error("Source check did not complete successfully.");
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

### Select a value and read its bytes

`select` accepts a decoded JSON Pointer.
`selectByPointerStream` supports an identified streamed pointer for oversized keys.
JSONL selection requires its exact physical `record` number in canonical decimal form.

`describe`, `sameReference`, `read`, `fragments`, `readSource` and `sourceFragments` operate within the same session and store.
`children(container)` asynchronously yields immediate children in source order as `{ value, name, ordinal }`, one descriptor at a time.
`name` is a scoped key reference for object members and `null` for array elements; use bounded reads for large names.
Duplicate members remain distinct.

Byte offsets, lengths and counts use decimal strings; references are opaque capabilities.
Serialized reference labels do not grant access or survive closure.

Read representations include `source-json`, `decoded-utf8`, `number-lexeme`, `nfc-utf8` and `json-pointer`, where applicable to the selected kind.
Range reads return `bytes`, `byteOffset` and `totalByteLength`.
Consume fragments before requesting the next fragment.
Retaining returned events, bytes or references adds consumer-owned state.

### Borrow or transfer a materialized value

`materialize` explicitly leases bounded representation bytes.
`materializeControl(value, maximumBytes, validator)` first reserves conservative byte/node workspace, then parses and invokes a complete caller-owned validator.
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
import { openJsonRepositorySession } from "@hadden-industries/json-quality";

const session = await openJsonRepositorySession({ root: process.cwd() });
try {
  let terminal;
  for await (const event of session.check()) {
    if (event.type === "finding") console.error(event);
    if (event.type === "execution-terminal") terminal = event;
  }
  if (!terminal) throw new Error("Repository check did not complete.");
  if (!terminal.contractSatisfied) throw new Error("Repository contract refused.");
} finally {
  await session.close();
}
```

Proven policy absence selects an independent package-default snapshot.
An optional `.json-quality.json` can contain `{}`, sparse overrides, or an explicit current `schemaVersion: 4` declaration.
Present configuration is checked by the same core, materialized under a reservation, resolved with the package's local schemas, frozen, and charged to the execution.
Invocation controls govern bootstrap; effective policy controls govern the main operation.

Checking reconciles Git, actual owned-tree discovery, required generated outputs, native providers and logical providers.
Source terminals are provisional.
`execution-terminal` establishes complete inventory, observations, diagnostics and declared linkage; `domainComplete` remains false.
`qualityPassed` describes intrinsic shared quality, while `contractSatisfied` includes exact expected-negative obligations.
Expected findings remain delivered.
Changed bytes, spans, Unicode scalar identities or missing logical members cannot match a pin.

### Supply a native provider

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

### Link documents inside a container

`logicalProviders` entries contain a trusted `definition` and an `inventory(access)` asynchronous factory returning an asynchronous stream.
Each definition declares nonempty `containerPaths` glob selectors for the captured metadata and payload containers it needs.
The factory can access and link only those containers; this does not filter repository checking.

Check-only executions retain full value indexes for those containers and exact policy linkage obligations, while other sources still receive complete quality checking and immutable capture.
Explicit `retainValues: true` additionally retains values for the caller's later access.

The factory runs after physical/native capture and receives a read-only view of the same execution's captured sources, value operations, effective resources and cancellation signal.
Use `access.capturedSource(path)` and `select`/`describe`/`read`/`fragments` to locate actual container metadata without parsing a second complete container object.

For one finite metadata record, `access.materializeControl(value, maximumBytes, validator)` uses the shared byte/node reservation and caller-owned domain validator; release its lease before requesting another.
Provider settlement releases any remaining borrowed lease.
Explicit small `materialize` leases charge that same execution and must be released after use; factory settlement releases its outstanding leases and invalidates its borrowed references.

The view exposes no source upload, checker, raw native ID, backend, close or write authority.
References from the provider view cannot be used through the caller's separate session facade.

A logical inventory member declares `path`, `containerPath`, decoded `pointer`, optional record selector, `encoding` (`utf8` or canonical `base64`), SHA-256 and decimal byte length.
The core reselects from the frozen checked container and verifies the actual decoded bytes.
Do not supply an unrelated document buffer as linkage evidence.

### Preserve producer-owned presentation

`preserveSourcePresentation` is available only after native or logical provenance admission.
It retains presentation while preserving semantic and exact-byte obligations.
Ordinary physical JSON is not covered by that seam.
Narrow NFC preservation pins name attributable, protected exact decoded values.
Collisions, unpinned values and other shared rules remain checked.

## Explicit transformations and replacements

The pure writers return finite text and never write a file.
`formatJsonSource(text)` preserves decoded values, order and numeric lexemes under fixed package Prettier options.
Formatting refuses invalid or unsafe content; ordinary NFC findings may remain because formatting preserves decoded strings.

Explicit decoded-Unicode preservation can be selected through a closed `contract`, for example `{ normalization: "preserve" }`, or sparse repository configuration `{ defaults: { normalization: "preserve" } }`.
Formatting can preserve those sequences while repairing presentation; normalization refuses a preserved target.
Use separate owner/rewrite or protected-byte controls when source bytes belong to another producer.
This is an attributable contract choice, not automatic normalization.

`formatJsonValue(value)` accepts an already materialized plain producer object.
Getters, custom serialization, sparse/extended arrays, cycles, unsupported values, nonfinite numbers and negative zero are refused before producer serialization.
Object ownership and domain validation remain with the producer.

`normalizeJsonSource(text)` changes string/key literal spans only, with collision preflight and complete semantic checks.

All pure writers use options `{ contract, temporaryDirectory, capacityLimits, runtimeControls, transformControls, producerControls, signal }`.
Transform defaults are 2 MiB source/output and 4096 normalization changes; `transformControls: false` removes them, and numeric/null overrides select individual quotas.

`producerControls` applies to `formatJsonValue` and can independently remove depth and `maximumTotalValues` quotas; the latter counts each scalar, object and array occurrence.
Ordinary source checking does not inherit these materializing-operation defaults.
Existing semantic hashing/canonicalization protocols must not be replaced by formatting.

### Preview and apply a repository rewrite

For repository effects, consume `session.check()` to completion, then iterate `session.rewrite("format", { files })` or `session.rewrite("normalize", { files })`.
Normalize preview uses `session.rewrite("normalize", { files, dryRun: true })` and completes the same no-write batch preflight.
NFC collisions refuse the entire selection before any write; owners must reconcile colliding keys explicitly.

Format can leave ordinary NFC drift; normalize can leave presentation findings.
`qualityPassed` and `findingCount` report the remaining quality separately from success of the selected operation.

Normalization requires explicit paths; formatting can select all writable physical sources.
One rewrite is permitted per retained session.
A session opened with `retainValues: false` cannot rewrite.

The writer preflights the complete peer set and every actual candidate, including changed logical dependents, before the first replacement.
Candidates must satisfy operation-specific eligibility, selected expectations and protection requirements.
Formatting may leave ordinary NFC findings; normalization may leave presentation findings.
Neither successful operation alone establishes complete quality acceptance.

Protected/ignored/native/logical/JSONL sources never acquire generic write permission.
Windows policy matching also checks the actual filesystem spelling of a Git alias.

`write-preflight`, `written` and `write-terminal`/`write-failure` report decimal selected, changed and confirmed-written counts.
Replacement uses exclusive sibling staging, permissions, actual staged-byte hashes, original observations and post-rename verification.
Failures can report an uncertain path.
Batches are not atomic; completed writes are not silently rolled back.
The policy is replaced last.

## CLI and migration

For commands and examples, see [CLI scope](cli.md#commands-and-scope), [stdin options](cli.md#stdin-and-conflicts) and [exit status](cli.md#exit-status).
Consume the applicable final event and check the exit status before treating a command as complete.

`runJsonQualityCli(args, context)` supports a trusted object or async context factory with `root`, `requiredOutputs`, `nativeProviders` and `logicalProviders`.
A trusted root cannot be overridden on the command line.
Help and invalid command grammar do not load the context.
Raw source checking cannot replace trusted repository obligations.

### Upgrade an existing integration

Upgrade the core and platform companions together.
The `contract-cohort` export identifies cohort 6, events 5, configuration/source-contract 4, native protocol 5, component schema 4 and Node-API 9.
Historical artifacts retain their original versions.
Use cohort-matched evidence for qualification and [migrate retired policy fields](configuration.md#provenance-and-migration).

Remove `inventory`, `lint`, `format --check`, `--scope`, `--request`, `--files`, `--concurrency`, aggregate result readers and Base64 envelopes.
Use complete checking, streamed events, explicit source openers and literal write selection.
Rework consumers around terminal evidence instead of reconstructing an unbounded aggregate report.

The [resource guide](resource-limits.md), [native protocol](native-protocol.md) and [trusted CI guide](ci-trust.md) describe independent controls and evidence boundaries.
