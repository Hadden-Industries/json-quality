# Public API

Import ESM from `@hadden-industries/json-quality`.
The root `types` condition resolves committed declarations generated from source JSDoc and the exported schemas.
`npm run check:types:generated` rejects regeneration drift.
Package-private source paths are not supported exports.

| Export and signature                                     | Result and effects                                                                                                         | Errors and resource boundary                                                                                       |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `openJsonSourceSession(options?)`                        | Promise of a source/value session; verifies the installed companion and owns native memory/scratch until `close()`         | Invalid controls, missing/mismatched component or native failure reject; shared admission/runtime limits apply     |
| `openJsonRepositorySession({root, ...options})`          | Promise of a complete repository session; reads physical/native/logical sources and owns scratch                           | Discovery, authority, observation or cleanup failures prevent a successful final terminal                          |
| `formatJsonSource(text, options?)`                       | Promise of formatted text; preserves meaning, member order and numeric lexemes; no source-file writes                      | Strict parsing, finite materializing-writer capacity, policy or formatting failures reject                         |
| `formatJsonValue(value, options?)`                       | Promise of formatted producer JSON; accepts plain JSON values, with native platform serialization                          | Executable accessors, custom serializers, cycles and unsupported values reject; producer/writer capabilities apply |
| `normalizeJsonSource(text, options?)`                    | Promise of text with admitted NFC key/string repairs; no source-file writes                                                | Collisions, unsupported contracts and finite writer-capacity failures reject                                       |
| `validateJsonQualityEvent(value)`                        | Synchronous boolean/type predicate for the serialized event contract; no I/O                                               | Invalid events return false; serialized identities do not mint reference capabilities                              |
| `admitJsonPolicy(value)`                                 | Synchronous validated policy snapshot from caller-owned control data; no I/O                                               | Invalid, executable, cyclic or oversized control data throws; this is domain admission, not payload parsing        |
| `jsonContract(path, policy, {tracked?}?)`                | Synchronous selected contract for an admitted policy and POSIX repository-relative path; no I/O                            | Contradictory matching exceptions throw; tracked files cannot be hidden by installed-tree exclusions               |
| `jsonFormatOptions()`                                    | Promise of an independent copy of fixed formatter options; no I/O                                                          | Does not admit input or waive writer capacity                                                                      |
| `runJsonQualityCli(args, context?)`                      | Promise of exit status; consumes CLI input and writes bounded stdout/stderr; writes sources only for explicit write verbs  | See [CLI exit statuses](cli.md); trusted context may be an object or async factory                                 |
| `qualifyJsonConsumer(options)`                           | Async generator of events checking immutable candidate Git JSON under trusted policy; reads repositories and owns scratch  | Full trusted/candidate commit IDs and absolute roots required; consume through `execution-terminal`                |
| `assertIsolatedJsonQuality(toolingRoot)`                 | Synchronously returns a verified isolated tooling root; reads filesystem resolution                                        | Throws when this package resolves outside that installation                                                        |
| `jsonQualityAcquisitionBootstrap()`                      | Synchronously returns the maintained minimal acquisition source text; reads its own package file                           | This does not perform acquisition or install anything                                                              |
| `jsonQualitySourceCoordinate(specifier, npmExecutable?)` | Synchronous `{kind: "registry", version}` for an exact version or npm alias; uses native npm metadata tooling              | Rejects ranges, Git/source selectors and other package identities; no network                                      |
| `verifyJsonQualityInstallation(options)`                 | Promise of package/native identities and checked file counts; reads isolated manifest, lock, npm cache and installed bytes | Exact selector, SRI, platform or member mismatch rejects; no acquisition, extraction or source writes              |
| `JSON_TRANSFORM_CAPABILITIES`                            | Read-only finite transform capabilities; no I/O                                                                            | A materializing writer's envelope is distinct from streamed-reader capacities                                      |
| `JSON_PRODUCER_CAPABILITIES`                             | Read-only producer serialization capabilities; no I/O                                                                      | Producers own their existing object graph and domain admission                                                     |
| `PACKAGE_VERIFICATION_CAPABILITIES`                      | Read-only archive/member/expanded-byte capabilities; no I/O                                                                | Package verification never inherits JSON source-byte bypasses                                                      |

Session options include `capacityLimits`, `runtimeControls`, `temporaryDirectory` and `signal`.
Repository options additionally select trusted providers, required outputs, `gitExecutable`, retention and correlation settings.
Writer options accept a closed `contract` for normalization, empty keys, protected NFC values, write permission and owner/reason.
Use the exported `SessionOptions`, `RepositoryOptions`, `WriterOptions`, `JsonQualityPolicy`, `JsonSourceContract`, `JsonQualityEvent`, `SourceReference` and `ValueReference` types.
See [resource controls](resource-limits.md) for authoritative names, numeric ranges and ownership.

## Source and value sessions

Run [the maintained source example](../examples/source-session.mjs):

```sh
node examples/source-session.mjs
```

`session.check({open, identity?}, contract?, options?)` returns an async event stream.
The lazy `open({signal})` supplies an async iterable of UTF-8 byte chunks; declared byte length and SHA-256 are independently checked.
Options select `signal`, `includeValues`, `retainValues` and `requestId`.
Consume the final `terminal` and always await `close()`.
A missing terminal or failed cleanup is incomplete work.

References belong to the open session that minted them.
`select(source, pointer = "", record?)` and `selectStream(source, chunks, {identity?, record?, signal?}?)` resolve retained values.
JSONL selection requires a canonical physical record number.
`children(value)` streams immediate members; `describe(value)` exposes bounded descriptor metadata; `sameReference(left, right)` compares scoped logical identity.

`read(value, representation, offset?, maximum?)` and `readSource(source, offset?, maximum?)` return bounded byte ranges.
`fragments` and `sourceFragments` stream complete representations with backpressure.
Representations include `source-json`, `decoded-utf8`, `number-lexeme`, `nfc-utf8` and `json-pointer`.
Offsets and lengths are canonical decimal strings.

`materialize(value, representation, maximum)` returns a borrowed byte lease.
`materializeControl(value, maximum, validate)` returns an object lease only after positive shared admission and caller-owned domain validation.
Both charge the managed ledger and require `release()`; control `transfer()` moves the independent object and its accounting obligation to the caller.
Borrowed bytes/objects must not be used after release.
Serialized references, foreign-session references and closed-session references cannot access native values.

## Repository operations

`session.events()` reconciles complete physical/native/logical inventory and emits `execution-terminal` only after source, observation, diagnostic and linkage obligations settle.
After successful consumption, `session.rewrite("format" | "normalize", {files: string[]})` explicitly selects physical paths for guarded replacement.
The write stream ends with `write-terminal`; a later failure preserves confirmed writes and reports any uncertain path.
There is no automatic rollback or batch-atomicity promise.
Checking and read APIs perform no network acquisition; trusted provider openers and explicit installation tooling retain their own effects.

The [consumer guide](consumer-guide.md) contains lossless selection, adapter and rewrite examples.
The [packed consumer corpus](https://github.com/Hadden-Industries/json-quality/blob/main/scripts/consumer-probe.mjs) exercises the actual public package before and after offline lock replay.

## Other package exports

`@hadden-industries/json-quality/eslint` exports the typed plugin and recommended flat configuration described in the [rule reference](rules/no-json-stringify-identity.md).
`configuration-schema`, `source-contract-schema`, `event-schema` and `contract-cohort` export the package's actual JSON files.
Use [the schema identifiers and offline registration procedure](configuration.md).
