# Consumer contract

Install one exact npm version or a full producer Git commit; checks never acquire tools.
The only editable acquisition selector is `devDependencies["@hadden-industries/json-quality"]` in the isolated tooling manifest.
Use an exact version such as `0.1.0`, an equivalent `npm:@hadden-industries/json-quality@0.1.0` alias, or `git+https://github.com/Hadden-Industries/json-quality.git#FULL_40_CHARACTER_COMMIT`.
Native npm generates the lockfile; do not repeat the selected commit, version or integrity in a second maintained manifest or hand-edit the lock.
Development adoption uses a commit until registry publication is separately authorized.
Retain clean producer source and transported-package qualification evidence, while consumer repositories retain the selector and native lock rather than checked-in archives.

`verifyJsonQualityInstallation({ toolingRoot })` admits the selector and lock, then uses the selected npm toolchain's bundled cache reader and tar parser to compare every installed package file with the independently cached locked payload.
It performs no download, extraction or writes and rejects unexpected, linked or unsafe archive members.
Nested installed dependencies retain their own frozen lock identities.
Run this through npm after `npm ci`; the standard native npm cache must remain available for the proof.
Git acquisition does not itself enforce tarball integrity, so this installed-payload check remains mandatory for either source choice.
Its optional `limits` uses the shared resource-limit contract, including explicit `false` bypass; identity checks remain active.

`jsonQualityAcquisitionBootstrap()` returns the producer-owned cold-install source for a consumer's `scripts/installRepositoryQualityTools.mjs` or `util/installRepositoryQualityTools.mjs`.
Materialize this reviewed generated adapter verbatim rather than editing its logic in a consumer.
It runs frozen, script-free acquisition with empty npm configuration files and a restricted environment, admits root Git acquisition only for JSON tooling, and verifies itself against the installed shared source after successful installation.
Markdown acquisition retains its separate frozen graph and disposable cache.
`verifyJsonQualityInstallation({ toolingRoot, bootstrapPath })` also rejects bootstrap drift, allowing only checkout newline differences.
`assertIsolatedJsonQuality(toolingRoot)` lets a thin bridge re-export the public API while rejecting fallback into a parent installation.

The root library exports `runJsonQuality`, `runJsonQualityCli`, `inspectJsonInventory`, `checkJsonInventory`, `checkJsonDocument`, `checkJsonLines`, `normalizeJsonSource`, `formatJsonSource`, `formatJsonValue`, `decodeJsonBytes`, `readJsonPolicy`, `jsonContract`, `jsonFormatOptions`, `checkJsonPresentation`, and `validateJsonQualityResult`, plus the acquisition helpers above and `jsonQualitySourceCoordinate`.
The `./eslint` export supplies `no-json-stringify-identity`; consumers select their JavaScript scope and enable error severity and unused-disable reporting.
`./configuration-schema` and `./result-schema` export the closed JSON schemas.
Deep source imports are unsupported.

```js
import { runJsonQuality, validateJsonQualityResult } from "@hadden-industries/json-quality";

const result = validateJsonQualityResult(await runJsonQuality("check", { root: process.cwd() }));
process.exitCode = result.status === "passed" ? 0 : 1;
```

Configuration is `.json-quality.json`, with schema 1, mandatory defaults and sparse owner/reason exceptions.
UO's former local schema 4 requires explicit migration; it is rejected rather than silently translated.
Defaults require `prettier-json`, writable eligible authored files and all-string NFC.
The npm lock root key needs the precise `allowEmptyKeys: ["/packages/"]` exception.
Preservation of normalization requires generic writes disabled.
For narrower preservation, `preserveNfcValues` pins decoded string values by exact JSON Pointer, SHA-256 and UTF-8 byte length. It requires one exact protected file and an owner/reason; all keys and other values retain NFC checking. A changed, missing or non-string value fails. It cannot coexist with whole-file normalization preservation or expected-negative admission.
JSONL pins additionally require `record: { pointer: "/id", value: "fixture-id" }`. Exactly one record must match that decoded string identity, regardless of its line number. No match or duplicate identities fail. Every unselected record remains checked normally. Preservation never enables generic formatting or normalization.
Contradictory matching exceptions fail.
External boundaries never conceal tracked files.
Tracked files rescued from a pruned directory retain that boundary's write protection, including hidden basenames that do not themselves match its glob. They receive ordinary semantic and presentation checks; format and normalization operations cannot rewrite them.

Producer presentation contracts retain the qualified native indented/compact serializers, final-LF and retained-envelope variants.
Producer presentation intrinsically prohibits generic formatting and normalization writes; a sparse presentation exception needs no repeated write-protection setting.
`preserved-bytes` requires one exact protected path, owner/reason and an independently owned SHA-256/byte-length/diagnostic expectation.
For independently admitted native or pointer-linked logical originals, optional `preserveSourcePresentation` groups select `{ paths, owner, reason }`. Each group must match at least one admitted member. The package binds preserved presentation to the independently supplied member hash and size, disables writes and requires zero semantic diagnostics by default. Ordinary physical files never receive this contract. Known semantic differences still require a separately approved exact-path expectation; this setting neither excludes documents nor relaxes semantic rules. An exact NFC value pin can coexist with original presentation when the expected diagnostic sequence is empty.
Expected diagnostics are an exact sequence of phase, native rule/message identity and source locations; any extra or missing finding fails.
Matched findings appear under `expectedFindings`, and unperformable parse/presentation phases remain unperformed.
Never create accepted expectations by learning a candidate's current failures.

`runJsonQuality` accepts explicit repository root, required output patterns, explicit normalization source paths, and optional cumulative logical inventory/documents.
Required outputs add obligations without replacing physical discovery.
Each logical inventory entry contains exactly `path`, `sha256`, `byteLength`, `containerPath`, `pointer` and `encoding` (`utf8` or `base64`).
An expected-diagnostic container can additionally require `expected.linkedDocuments`: exact `path`, `pointer`, `encoding`, `sha256` and `byteLength` pins. These members must appear in the independently supplied logical census and pass physical-pointer reconciliation before the container exception is admitted. Standalone document analysis rejects an undischarged linkage requirement.
Each supplied logical document contains exactly its canonical `path` and an owned `Buffer` of `bytes`.
Every member must match its independently owned inventory and the actual pointed-to string in a physically discovered container.
Repository adapters must also invoke their existing storage and domain validators.
Logical and JSONL documents are always protected from generic writes.
Native documents use optional `nativeSources` declarations in configuration and a trusted `nativeProviders` function map in `runJsonQuality` or its CLI context. JSON configuration selects a name; it never imports executable modules.
Each declaration contains `id`, `provider`, `owner` and `reason`, with optional JSON `parameters`, `minimumDocuments` (default 1; explicitly 0 for a legitimate empty scope) and a source-default `formatContract`. Exact path exceptions still override that presentation default.
The provider receives `{ root, parameters }` and returns exactly `{ inventory, documents, authorities }`. It must run its native storage and domain admission first; the package does not implement archive extraction, signature verification or manifest semantics. Every admitted physical source and authority is protected from generic formatting and normalization, even when its ordinary path policy was writable.
Each inventory entry contains exactly `path`, `sha256`, `byteLength` and `source`. A content-addressed source contains exactly `kind: "content-addressed"`, `path`, `sha256` and `byteLength`, identical to the document identity. An archive source contains `kind: "archive-member"`, the physical archive `path`, `sha256`, `byteLength` and a contained `memberPath`; its document path is `archivePath!/memberPath` and its document hash/length describes the original member bytes.
Each supplied document contains exactly `{ path, bytes: Buffer }`. `authorities` contains at least one independently verified physical `{ path, sha256, byteLength }` identity, such as the native manifest or lock. All physical sources and authorities must be regular contained files. Missing, duplicate, unexpected, colliding or changed identities fail before writes. The package clones admitted buffers and rechecks source/authority snapshots before reporting and writing.
Exclusions still require the complete native census and matching bytes; excluded member paths remain visible in the source summary and external boundaries. Native documents are always protected. Result schema 3 reports a separate `counts.native`, per-document `nativeSource` identity and `nativeSources` summaries with authority snapshots, inventoried/included counts and exact excluded paths.
Pure `formatJsonSource(text, { limits })` preserves strict JSON token spelling and decoded values through the native printer's debug check. `formatJsonValue(value, { limits })` first requires plain acyclic JSON data; accessors, custom serialization, sparse arrays, unsupported values, negative zero and nonfinite numbers are rejected rather than silently transformed. Both return text without acquiring tools or writing files; neither normalizes values or establishes a quality pass. Keep historical canonical/digest encoders separate.
JSONL uses UTF-8 records, LF or CRLF framing, an optional final terminator, strict per-record analysis and native compact producer presentation; blank records fail.

Library operations are `check`, `inventory`, `lint`, `check-format`, `check-protected`, `format` and `normalize`.
The CLI `check --scope protected` reports quality findings on write-protected documents, including authored documents, logical views and native evidence.
The default `check --scope all` covers every document; protection describes write permission rather than producer ownership.
The old `producers` command and operation are removed without aliases.
Result schema 3 is a clean contract cutover; regenerate current reports instead of accepting schema 2 results.
`--help` and command-specific help use the same closed command grammar as argument admission and run no repository adapter.
The CLI uses `json-quality format --check` for read-only formatting verification and `json-quality format` to apply formatting.
It accepts neither `check-format` nor `format-check` as a CLI command; there are no compatibility aliases.
The `--check` option is valid only with `format`; the library/result operation identity for this check remains `check-format`.
The ordinary `check` covers every phase.
`inventory` reports discovered physical/logical identities, external boundaries and resolved owner/write/presentation/NFC contracts.
It validates policy and scope/provenance accounting without performing JSON analysis or JSONL framing; `syntaxValid` and record counts are null and `checked` is zero.
It establishes scope, never a quality pass; there is no redundant `inspect` alias.
Ordinary inventory reads file identities and sizes without loading their contents; logical provenance still requires reading its declared physical containers. Undecodable JSONL bytes leave record and checked-document coverage null rather than reporting zero records.
Lint omits presentation findings; presentation checking retains byte/expectation failures; protected-scope checking reaches write-protected inputs.
The CLI exits 0 for a complete pass, 1 for known findings or partial-write failure and 2 for invalid input or operational failure.
Machine output is opt-in `--json` and validated against result schema 3 plus semantic count, identity, phase and write accounting. Earlier result schemas require regeneration; they are not silently admitted as current native-coverage proof.
Unknown coverage is represented by null counts, never zero.

Optional configuration `limits` and per-invocation API `limits` override resource defaults; invocation values take precedence.
Values are positive safe integers without arbitrary package ceilings; `limits: false` explicitly bypasses package resource limits.
The CLI exposes each setting, for example `--max-files 100000 --max-file-bytes 67108864`, plus `--no-limits` for the explicit bypass.
Individual overrides and `--no-limits` cannot be combined in one invocation.
Defaults are 50,000 physical files, 32 MiB per document, 256 MiB total physical/logical input, 100,000 logical members, 100,000 records per JSONL file and 10,000 diagnostics.
Native member documents share the cumulative logical-member ceiling; physical/native document identities share the file ceiling. Native source and authority snapshot bytes, counted once per source path, and every admitted member buffer also consume total input capacity.
Limits fail before writes and never disable semantic rules.
Policy bootstrap bytes, Git/tool output and formatter time are capacity controls too, with corresponding override flags; enlarge policy bootstrap capacity using CLI/API overrides before loading a policy larger than the default.
Operating-system/native-tool constraints still apply when package limits are bypassed; failures never become a pass.
These are cooperative admission controls, not an OS sandbox or a promise that native parsers have constant memory cost.
The separate JavaScript identity rule accepts resource options `maxFrames` (default 64) and `maxSteps` (default 100000). Each accepts a positive safe integer or `false` to bypass that limit; an options value of `false` bypasses both. These options never disable the semantic guard or replace consumer permutation tests.

Repository command adapters can call `await runJsonQualityCli(process.argv.slice(2), { root, requiredOutputs, logicalInventory, logicalDocuments })` and assign its returned exit code. A supplied root is fixed: a conflicting `--root` fails. Argument parsing, capacity overrides and human/machine result reporting remain package-owned; importing this API performs no command.
Adapters that must load or verify repository-owned inputs may instead supply a trusted asynchronous factory returning that same closed context. It runs after argument admission, inside the package's error envelope. Native storage-verification failures then return exit 2 and an incomplete machine result rather than escaping as an unstructured stack trace.

Producer archive qualification selects npm 12.2.0 or later within major 12 and admits its keyed native pack report. Older report shapes are rejected; the CI matrix explicitly selects the qualified package manager.
Consumer runtime and acquisition requirements are separate from this producer contract; see the [canonical runtime policy](node-runtime-compatibility.md).
The consumer npm toolchain retains native Git restrictions, lockfile version 3, cached archive verification and offline replay at each admitted Node floor.
Platform/runtime support requires the named source and transported tests on Windows and Linux; unobserved hosted results remain gaps.
