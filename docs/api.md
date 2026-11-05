# Public API

Import ESM from `@hadden-industries/json-quality`.
The root `types` condition resolves committed declarations generated from source JSDoc and the exported schemas.
`npm run check:types:generated` rejects regeneration drift.
Package-private source paths are not supported exports.

| Export and signature                                        | Result and effects                                                                                                         | Errors and resource boundary                                                                                       |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `openJsonSourceSession(options?)`                           | Promise of a source/value session; verifies the installed companion and owns native memory/scratch until `close()`         | Invalid controls, missing/mismatched component or native failure reject; shared admission/runtime limits apply     |
| `openJsonRepositorySession({root, ...options})`             | Promise of a complete repository session; reads physical/native/logical sources and owns scratch                           | Discovery, authority, observation or cleanup failures prevent a successful final terminal                          |
| `formatJsonSource(text, options?)`                          | Promise of formatted text; preserves meaning, member order and numeric lexemes; no source-file writes                      | Strict parsing, finite materializing-writer capacity, policy or formatting failures reject                         |
| `formatJsonValue(value, options?)`                          | Promise of formatted producer JSON; accepts plain JSON values, with native platform serialization                          | Executable accessors, custom serializers, cycles and unsupported values reject; producer/writer capabilities apply |
| `normalizeJsonSource(text, options?)`                       | Promise of text with admitted NFC key/string repairs; no source-file writes                                                | Collisions, unsupported contracts and finite writer-capacity failures reject                                       |
| `validateJsonQualityEvent(value)`                           | Synchronous boolean/type predicate for the serialized event contract; no I/O                                               | Invalid events return false; serialized identities do not mint reference capabilities                              |
| `resolveJsonQualityPolicy(configuration?, options?)`        | Synchronous independent deeply frozen effective policy from sparse plain input; no I/O                                     | Invalid, executable, cyclic or oversized input throws before caller code can execute                               |
| `defaultJsonQualityPolicy`                                  | Deeply frozen package-owned effective baseline value; no I/O                                                               | Use the resolver for an independent caller snapshot                                                                |
| `resolveJsonSourceContract(path, policy, {tracked?}?)`      | Synchronous selected contract for an admitted policy and POSIX repository-relative path; no I/O                            | Contradictory matching exceptions throw; tracked files cannot be hidden by installed-tree exclusions               |
| `jsonFormatOptions()`                                       | Promise of an independent copy of fixed formatter options; no I/O                                                          | Does not admit input or waive writer capacity                                                                      |
| `runJsonQualityCli(args, context?)`                         | Promise of exit status; consumes CLI input and writes bounded stdout/stderr; writes sources only for explicit write verbs  | See [CLI exit statuses](cli.md); trusted context may be an object or async factory                                 |
| `qualifyGitJsonSources(options)`                            | Async generator of events checking immutable candidate Git JSON under trusted policy; reads repositories and owns scratch  | Full trusted/candidate commit IDs and absolute roots required; consume through `execution-terminal`                |
| `assertJsonQualityInstallationRoot(toolingRoot)`            | Synchronously returns a verified isolated tooling root; reads filesystem resolution                                        | Throws when this package resolves outside that installation                                                        |
| `parseJsonQualityRegistrySpecifier(specifier, npmCliPath?)` | Synchronous `{kind: "registry", version}` for an exact version or npm alias; uses native npm metadata tooling              | Rejects ranges, Git/source selectors and other package identities; no network                                      |
| `verifyJsonQualityInstallation(options)`                    | Promise of package/native identities and checked file counts; reads isolated manifest, lock, npm cache and installed bytes | Exact selector, SRI, platform or member mismatch rejects; no acquisition, extraction or source writes              |
| `DEFAULT_JSON_TRANSFORM_LIMITS`                             | Read-only finite transform capabilities; no I/O                                                                            | A materializing writer's envelope is distinct from streamed-reader capacities                                      |
| `DEFAULT_JSON_PRODUCER_LIMITS`                              | Read-only producer serialization capabilities; no I/O                                                                      | Producers own their existing object graph and domain admission                                                     |
| `DEFAULT_PACKAGE_VERIFICATION_LIMITS`                       | Read-only archive/member/expanded-byte capabilities; no I/O                                                                | Package verification never inherits JSON source-byte bypasses                                                      |

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

Run [the maintained source example](../examples/source-session.mjs):

```sh
node examples/source-session.mjs
```

`session.check({open, identity?}, contract?, options?)` returns an async event stream.
The lazy `open({signal})` supplies an async iterable of UTF-8 byte chunks; declared byte length and SHA-256 are independently checked.
Options select `signal`, `includeValueEvents`, `retainValues` and `requestId`.
Consume the final `terminal` and always await `close()`.
A missing terminal or failed cleanup is incomplete work.

References belong to the open session that minted them.
`select(source, pointer = "", record?)` and `selectByPointerStream(source, pointerByteChunks, {identity, record?, signal?})` resolve retained values.
The required stream identity describes the UTF-8 pointer bytes, not the source being selected; missing identity refuses before the pointer producer opens.
JSONL selection requires a canonical one-based physical record number; blank records still count.
`children(value)` streams immediate members; `describe(value)` exposes bounded descriptor metadata; `sameReference(left, right)` compares scoped logical identity.

`read(value, representation, byteOffset?, maximumBytes?)` and `readSource(source, byteOffset?, maximumBytes?)` return `{bytes, byteOffset, totalByteLength}`.
`fragments` and `sourceFragments` stream complete representations with backpressure.
Representations include `source-json`, `decoded-utf8`, `number-lexeme`, `nfc-utf8` and `json-pointer`.
Offsets and lengths are canonical unsigned decimal strings and count bytes of the selected representation, not code points.
Value descriptors distinguish raw JSON token `rawByteLength` (quotes/escapes included), decoded `byteLength`, optional `nfcByteLength` and original `sourceByteOffset`.

`materialize(value, representation, maximumBytes)` returns a borrowed byte lease.
`materializeControl(value, maximumBytes, validate)` returns an object lease only after positive shared admission and caller-owned complete domain validation.
Both charge the managed ledger and require `release()`; control `transfer()` invalidates the lease, releases its native reservation and returns the independent JavaScript value plus `managedReservationBytes` for caller accounting.
Borrowed bytes/objects must not be used after release.
Serialized references, foreign-session references and closed-session references cannot access native values.

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

`session.check()` reconciles complete physical/native/logical inventory and emits `execution-terminal` only after source, observation, diagnostic and linkage obligations settle.
The lazy iterator can be claimed once and must reach `execution-terminal`.
After complete checking, `session.rewrite("format" | "normalize", {files?, transformControls?, dryRun?})` selects eligible physical paths for guarded replacement.
Normalize requires a nonempty explicit `files` list; `dryRun: true` is accepted only for normalize and performs the complete no-write preflight.
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

`nativeProviders` is `Record<string, NativeProvider>`, not an array.
A provider receives `{root, parameters, signal}` and returns, synchronously or by promise, `{authorities, inventory, documents, close?}`.
The three fields themselves are async iterables, not arrays or promises of streams.
Authorities contain `{path, sha256, byteLength}`.
Inventory entries contain `{path, sha256, byteLength, source}`, where source is an authority plus `kind: "content-addressed"`, or `kind: "archive-member"` and `memberPath`.
Documents contain `{path, chunks}` with async byte views of at most 65,536 bytes each.
Provider `close` may return void or a promise.

`logicalProviders` is an array of `{definition, inventory(access)}`.
Definitions contain `{id, containerPaths, minimumDocuments?, formatContract?}`; selectors are nonempty and minimum documents defaults to zero.
The inventory factory returns an async iterable directly or by promise.
Each entry contains `{path, containerPath, pointer, record?, encoding, sha256, byteLength}`; encoding is `utf8` or `base64`.
Borrowed logical access exposes resources, signal, scoped reads/materialization and `capturedSource(path)`.
Unavailable/out-of-scope sources reject; borrowed access has no close, upload, rewrite or raw-ID authority.
Its owner settles it after the inventory finishes.

Reusable declarations include `JsonQualityConfiguration`, `JsonQualityPolicy`, `ReadonlyJsonQualityPolicy`, `ImplementationIdentity`, `ResolvedResources`, `ValueDescriptor`, `RepositoryRewriteOptions`, provider interfaces, byte/object leases and `InstallationVerificationOptions`.
The defaults export and resolved policies use `ReadonlyJsonQualityPolicy`, including nested objects and arrays; source-contract resolution accepts these immutable policies.
Object-name descriptors have `valueKind: "key"` and remain distinct from JSON string values.
Installation verification uses `installationControls` plus independent `verificationControls`; its numeric `fileCount` covers core plus native, with the nested native count a subset.
