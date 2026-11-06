# Public API

Import the typed ESM API from `@hadden-industries/json-quality` in Node.js.
Use Node-aware TypeScript resolution such as `NodeNext`.
The root export includes declarations generated from source JSDoc and the public schemas.
Use package exports for supported entry points.

## Exports by task

### Check and read sources

- **`openJsonSourceSession(options?)`** returns a promise for a source/value session.
  Opening verifies the installed native companion.
  The session owns memory and scratch until `close()`.
  Invalid controls, a missing or mismatched companion, and native failures reject.
- **`checkJsonFiles(options)`** streams events for named physical files under root policy without writing them.
  An invalid selection, stale source or cleanup failure prevents a successful `selection-terminal`.
  See the [selected-file example](#repository-operations).
- **`openJsonRepositorySession({root, ...options})`** returns a promise for a complete repository session with owned scratch.
  It reads physical, native and logical sources.
  Discovery, authority, observation or cleanup failures prevent successful completion.
- **`qualifyGitJsonSources(options)`** streams events for immutable candidate Git JSON under trusted policy.
  Supply absolute roots and full trusted and candidate commit IDs.
  Consume through `execution-terminal`.
  [Trusted CI](ci-trust.md)

### Produce JSON text

These functions return promises.
A writer can reject input that exceeds its materialization limits even when streamed checking succeeds.

- **`formatJsonSource(text, options?)`** returns formatted JSON and preserves member order, decoded values and numeric lexemes.
  Parsing, policy and formatting errors reject.
- **`formatJsonValue(value, options?)`** returns formatted text for a plain JSON value.
  Executable accessors, custom serializers, cycles and unsupported values reject.
  Both producer and writer limits apply.
- **`normalizeJsonSource(text, options?)`** returns text with eligible NFC key and string spans repaired.
  Collisions or unsupported contracts reject.
- **`jsonFormatOptions()`** resolves to an independent copy of the fixed formatter options.

### Resolve policy and validate events

- **`resolveJsonQualityPolicy(configuration?, options?)`** synchronously builds an independent, deeply frozen effective policy from sparse plain input.
  Invalid, executable, cyclic or oversized input throws before caller code can execute.
- **`defaultJsonQualityPolicy`** is the deeply frozen package baseline.
  Call the resolver for an independent snapshot.
- **`resolveJsonSourceContract(path, policy, {tracked?}?)`** synchronously selects a contract for a repository-relative POSIX path.
  Conflicting exceptions throw.
  Tracked files under excluded installed trees still receive a contract.
- **`validateJsonQualityEvent(value)`** is a synchronous type predicate for serialized events.
  Invalid events return `false`.
  Access to retained data requires a reference from the owning session.

### Run the CLI or verify an installation

- **`runJsonQualityCli(args, context?)`** resolves to the [CLI exit status](cli.md#exit-status).
  It consumes CLI input and uses bounded output streams.
  Only a filesystem `--write` operation replaces sources.
  Supply trusted context as an object or async factory.
- **`assertJsonQualityInstallationRoot(toolingRoot)`** synchronously checks filesystem resolution and returns the verified isolated root.
  It throws if the package resolves outside that installation.
- **`parseJsonQualityRegistrySpecifier(specifier, npmCliPath?)`** uses native npm metadata tooling to return `{kind: "registry", version}` synchronously without network access.
  It accepts exact versions and exact npm aliases of this package.
  Ranges, other package identities and Git or source selectors reject.
- **`verifyJsonQualityInstallation(options)`** resolves to package and native identities and checked file counts.
  It reads the manifest, lock, npm cache and installed bytes without downloading or extracting files.
  Selector, integrity, platform or member mismatches reject.

### Default limit profiles

`DEFAULT_JSON_TRANSFORM_LIMITS` covers materializing writers, `DEFAULT_JSON_PRODUCER_LIMITS` covers producer serialization, and `DEFAULT_PACKAGE_VERIFICATION_LIMITS` covers archives, members and expanded bytes.
The profiles are frozen values.
Callers own their existing producer objects and domain validation.
[Resource limits and overrides](resource-limits.md)

## Options and TypeScript types

Session options include `capacityLimits`, `runtimeControls`, `temporaryDirectory` and `signal`.
Repository options additionally select trusted providers, required outputs, `gitExecutable`, retention and correlation settings.

Writer options accept a closed `contract` for normalization, empty keys, protected NFC values, write permission and owner/reason.
They also accept `transformControls` and, for `formatJsonValue`, `producerControls`.

Optional installation verification accepts independent `installationControls` and `verificationControls`; each profile permits `false` for unlimited quotas and per-field numeric/null overrides.
The exported `DEFAULT_*_LIMITS` objects are frozen default profiles; supported operation controls can override their quotas.
Ordinary unlimited reads select both `capacityLimits: false` and `runtimeControls: false`; explicit numeric fields remain enforceable.

Use the exported `SessionOptions`, `RepositoryOptions`, `WriterOptions`, `JsonQualityPolicy`, `JsonSourceContract`, `JsonQualityEvent`, `SourceReference` and `ValueReference` types.
See [resource controls](resource-limits.md) for authoritative names, numeric ranges and ownership.

## Source and value sessions

From the source checkout, run the [maintained source example](../examples/source-session.mjs).
It prints `Source contract satisfied` after receiving a successful terminal.

```sh
node examples/source-session.mjs
```

`session.check({open, identity?}, contract?, options?)` returns an async event stream.
The lazy `open({signal})` supplies an async iterable of UTF-8 byte chunks; declared byte length and SHA-256 are independently checked.
Options select `signal`, `includeValueEvents`, `retainValues` and `requestId`.
Consume the final `terminal` and always await `close()`.
A missing terminal or failed cleanup is incomplete work.

### Select a retained value

References belong to the open session that minted them.
`select(source, pointer = "", record?)` and `selectByPointerStream(source, pointerByteChunks, {identity, record?, signal?})` resolve retained values.
The required stream identity describes the UTF-8 pointer bytes, not the source being selected; missing identity refuses before the pointer producer opens.

JSONL selection requires a canonical one-based physical record number; blank records still count.
`children(value)` streams immediate members; `describe(value)` exposes bounded descriptor metadata; `sameReference(left, right)` compares scoped logical identity.

### Read ranges and fragments

`read(value, representation, byteOffset?, maximumBytes?)` and `readSource(source, byteOffset?, maximumBytes?)` return `{bytes, byteOffset, totalByteLength}`.
`fragments` and `sourceFragments` stream complete representations with backpressure.
Representations include `source-json`, `decoded-utf8`, `number-lexeme`, `nfc-utf8` and `json-pointer`.

Offsets and lengths are canonical unsigned decimal strings and count bytes of the selected representation, not code points.
Value descriptors distinguish raw JSON token `rawByteLength` (quotes/escapes included), decoded `byteLength`, optional `nfcByteLength` and original `sourceByteOffset`.

### Materialize and release a lease

`materialize(value, representation, maximumBytes)` returns a borrowed byte lease.
`materializeControl(value, maximumBytes, validate)` returns an object lease only after positive shared admission and caller-owned complete domain validation.

Both charge the managed ledger and require `release()`; control `transfer()` invalidates the lease, releases its native reservation and returns the independent JavaScript value plus `managedReservationBytes` for caller accounting.
Borrowed bytes/objects must not be used after release.
Serialized references, foreign-session references and closed-session references cannot access native values.

### Interpret identities and collisions

`session.implementationIdentity` reports the core source-input digest, Node-API version and ICU/Unicode/SQLite versions.
It does not identify a particular session.
Each source/value `referenceId` is an opaque scoped label; serializing it cannot transfer authority.

NFC collision events identify the containing object with `containerValue`, so repeated collisions in one object share an identity and sibling objects have distinct identities.
For `nfc-key-collision-risk`, this field is on the event; enforced `json-quality/nfc-strings` / `collision` findings carry it in `arguments`, together with `priorValue` and both key spans.

These identities do not promise retained value data: with `retainValues: false`, bounded diagnostic identity can remain available while `describe` or pointer reads are unavailable.

With retained values, read `containerValue` as `"json-pointer"` through the session's bounded `read` or `fragments` methods to obtain the exact containing-object pointer, including escaped path segments.
No complete pointer string is copied into collision events; very large paths remain streamed, and JSONL events retain their separate record number.

`cancel(reason?: unknown)` requests cancellation and preserves the caller's abort reason; always await `close()` for settlement and cleanup.
`resources.admission` resolves `capacityLimits` and `resources.runtime` resolves `runtimeControls`, reported as canonical decimal strings or `null`.

## Repository operations

`checkJsonFiles(options)` accepts the closed `FileCheckOptions` fields `root`, nonempty `files`, `capacityLimits`, `runtimeControls`, `temporaryDirectory`, `signal` and `requestId`.
Pass an explicit absolute `root` and literal root-relative POSIX paths in `files`; directories and glob expansion are unsupported.

It streams selected physical source events through `selection-terminal` after cleanup and policy/selected-source freshness checks.
It performs no Git discovery, native/logical provider or required-output inventory and exposes no rewrite or retained-reference capability.

The terminal declares `operationScope.completeRepositoryCheck: false`; use the repository session for full acceptance.
Explicit selection is not silently omitted by ignore/discovery exclusions; each selected contract retains expectations and protected values.
Linked-document expectations refuse this scope instead of being discarded.

```js
import { resolve } from "node:path";
import { checkJsonFiles } from "@hadden-industries/json-quality";

let terminal;
for await (const event of checkJsonFiles({
  root: resolve("."),
  files: ["data/authored.json"],
})) {
  if (event.type === "selection-terminal") terminal = event;
  // Consume findings here, including deliberately expected negatives.
}
if (!terminal) throw new Error("Incomplete selected-file check.");
if (!terminal.contractSatisfied) throw new Error("Selected contract refused.");
```

`contractSatisfied` includes admitted exact expected negatives; inspect `qualityPassed` for intrinsic shared quality.
Neither field establishes domain-specific validity or complete repository acceptance.

### Check a complete repository and rewrite files

`session.check()` reconciles complete physical/native/logical inventory and emits `execution-terminal` only after source, observation, diagnostic and linkage obligations settle.
The lazy iterator can be claimed once and must reach `execution-terminal`.

After complete checking, `session.rewrite("format" | "normalize", {files?, transformControls?, dryRun?})` selects eligible physical paths for guarded replacement.
Normalize requires a nonempty explicit `files` list; `dryRun: true` performs complete actual-candidate no-write preflight for either operation.
Format preview ends in `format-preview-terminal`; normalize preview ends in `normalization-preview-terminal`.

Format preserves decoded strings and may leave only ordinary NFC drift; normalize preserves presentation outside patched string spans and may leave presentation findings.
Strict syntax, exact duplicates, enforced collisions, numbers, expectations, ownership and complete peer checks still block unsafe effects.
Successful requested effects and overall quality are separate: inspect `qualityPassed` and `findingCount` on the terminal.

The write stream ends with `write-terminal`; a later failure preserves confirmed writes and reports any uncertain path.
There is no automatic rollback or batch-atomicity promise.
Checking and read APIs perform no network acquisition; trusted provider openers and explicit installation tooling retain their own effects.

The [consumer guide](consumer-guide.md) contains lossless selection, adapter and rewrite examples.
The [packed consumer corpus](https://github.com/Hadden-Industries/json-quality/blob/main/scripts/consumer-probe.mjs) exercises the actual public package before and after offline lock replay.

## Other package exports

`@hadden-industries/json-quality/eslint` exports the typed plugin and recommended flat configuration described in the [rule reference](rules/no-json-stringify-identity.md).
`configuration-schema`, `effective-policy-schema`, `source-contract-schema`, `event-schema` and `contract-cohort` export the package's actual JSON files.
Use [the schema identifiers and offline registration procedure](configuration.md).

## Provider declarations

### Native providers

`nativeProviders` is `Record<string, NativeProvider>`, not an array.
A provider receives `{root, parameters, signal}` and returns, synchronously or by promise, `{authorities, inventory, documents, close?}`.
The three fields themselves are async iterables, not arrays or promises of streams.

Authorities contain `{path, sha256, byteLength}`.
Inventory entries contain `{path, sha256, byteLength, source}`, where source is an authority plus `kind: "content-addressed"`, or `kind: "archive-member"` and `memberPath`.
Documents contain `{path, chunks}` with async byte views of at most 65,536 bytes each.
Provider `close` may return void or a promise.

### Logical providers

`logicalProviders` is an array of `{definition, inventory(access)}`.
Definitions contain `{id, containerPaths, minimumDocuments?, formatContract?}`; selectors are nonempty and minimum documents defaults to zero.
The inventory factory returns an async iterable directly or by promise.
Each entry contains `{path, containerPath, pointer, record?, encoding, sha256, byteLength}`; encoding is `utf8` or `base64`.

Borrowed logical access exposes resources, signal, scoped reads/materialization and `capturedSource(path)`.
Unavailable/out-of-scope sources reject; borrowed access has no close, upload, rewrite or raw-ID authority.
Its owner settles it after the inventory finishes.

### Provider and value types

Reusable declarations include `JsonQualityConfiguration`, `JsonQualityPolicy`, `ReadonlyJsonQualityPolicy`, `ImplementationIdentity`, `ResolvedResources`, `ValueDescriptor`, `RepositoryRewriteOptions`, provider interfaces, byte/object leases and `InstallationVerificationOptions`.
The defaults export and resolved policies use `ReadonlyJsonQualityPolicy`, including nested objects and arrays; source-contract resolution accepts these immutable policies.

Object-name descriptors have `valueKind: "key"` and remain distinct from JSON string values.
Installation verification uses `installationControls` plus independent `verificationControls`; its numeric `fileCount` covers core plus native, with the nested native count a subset.
