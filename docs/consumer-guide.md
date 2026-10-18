# Consumer contract

Install one exact npm version or a full producer Git commit; checks never acquire tools.
The only editable acquisition selector is `devDependencies["@hadden-industries/json-quality"]` in the isolated tooling manifest.
The next intended release is `1.0.0`; source metadata alone does not establish registry availability.
Once published, use an exact version such as `1.0.0`, an equivalent `npm:@hadden-industries/json-quality@1.0.0` alias, or `git+https://github.com/Hadden-Industries/json-quality.git#FULL_40_CHARACTER_COMMIT`.
Native npm generates the lockfile; do not repeat the selected commit, version or integrity in a second maintained manifest or hand-edit the lock.
Native npm may serialize the HTTPS Git selector as `git+ssh://git@github.com/`; verification accepts only those two spellings of the exact producer repository and full commit.
Other hosts, repositories, revisions, ranges, subdirectories and insecure transports remain rejected.
Development adoption uses a commit until registry publication is separately authorized.
Retain clean producer source and transported-package qualification evidence, while consumer repositories retain the selector and native lock rather than checked-in archives.

`verifyJsonQualityInstallation({ toolingRoot })` admits the selector and lock, then uses the selected npm toolchain's bundled cache reader and tar parser to compare every installed package file with the independently cached locked payload.
It performs no download, extraction or writes and rejects unexpected, linked or unsafe archive members.
Nested installed dependencies retain their own frozen lock identities.
Run this through npm after `npm ci`; the standard native npm cache must remain available for the proof.
Git acquisition does not itself enforce tarball integrity, so this installed-payload check remains mandatory for either source choice.
Its optional `capacityLimits` uses the shared resource-limit contract: `true` enables configured/default capacities, `false` disables them and an object supplies finite overrides; identity checks remain active.

`jsonQualityAcquisitionBootstrap()` returns the producer-owned cold-install source for a consumer's `scripts/installRepositoryQualityTools.mjs` or `util/installRepositoryQualityTools.mjs`.
Materialize this reviewed generated adapter verbatim rather than editing its logic in a consumer.
It runs frozen, script-free acquisition with empty npm configuration files and a restricted environment, admits root Git acquisition only for JSON tooling, and verifies itself against the installed shared source after successful installation.
Markdown acquisition retains its separate frozen graph and disposable cache.
`verifyJsonQualityInstallation({ toolingRoot, bootstrapPath })` also rejects bootstrap drift, allowing only checkout newline differences.
`assertIsolatedJsonQuality(toolingRoot)` lets a thin bridge re-export the public API while rejecting fallback into a parent installation.

The root library exports `runJsonQuality`, `runJsonQualityCli`, `inspectJsonInventory`, `checkJsonInventory`, `checkJsonDocument`, `checkJsonLines`, `normalizeJsonSource`, `formatJsonSource`, `formatJsonValue`, `decodeJsonBytes`, `readJsonPolicy`, `jsonContract`, `jsonFormatOptions`, `checkJsonPresentation`, and `validateJsonQualityResult`, plus the acquisition helpers above and `jsonQualitySourceCoordinate`.
It also exports `formatJsonDocument` for supplied-document formatting and `qualifyJsonConsumer` for [trusted source-only consumer CI](ci-trust.md).
The `./eslint` export supplies `no-json-stringify-identity`; consumers select their JavaScript scope and enable error severity and unused-disable reporting.
`./configuration-schema`, `./result-schema`, `./document-request-schema` and `./document-response-schema` export the closed JSON schemas.
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
For narrower preservation, `preserveNfcValues` pins decoded string values by exact JSON Pointer, SHA-256 and UTF-8 byte length.
It requires one exact protected file and an owner/reason; all keys and other values retain NFC checking.
A changed, missing or non-string value fails.
It cannot coexist with whole-file normalization preservation or expected-negative admission.
JSONL pins additionally require `record: { pointer: "/id", value: "fixture-id" }`.
Exactly one record must match that decoded string identity, regardless of its line number.
No match or duplicate identities fail.
Every unselected record remains checked normally.
Preservation never enables generic formatting or normalization.
Contradictory matching exceptions fail.
External boundaries never conceal tracked files.
Tracked files rescued from a pruned directory retain that boundary's write protection, including hidden basenames that do not themselves match its glob.
They receive ordinary semantic and presentation checks; format and normalization operations cannot rewrite them.

Producer presentation contracts retain the qualified native indented/compact serializers, final-LF and retained-envelope variants.
Producer presentation intrinsically prohibits generic formatting and normalization writes; a sparse presentation exception needs no repeated write-protection setting.
`preserved-bytes` requires one exact protected path, owner/reason and an independently owned SHA-256/byte-length/diagnostic expectation.
For independently admitted native or pointer-linked logical originals, optional `preserveSourcePresentation` groups select `{ paths, owner, reason }`.
Each group must match at least one admitted member.
The package binds preserved presentation to the independently supplied member hash and size, disables writes and requires zero semantic diagnostics by default.
Ordinary physical files never receive this contract.
Known semantic differences still require a separately approved exact-path expectation; this setting neither excludes documents nor relaxes semantic rules.
An exact NFC value pin can coexist with original presentation when the expected diagnostic sequence is empty.
Expected diagnostics are an exact sequence of phase, native rule/message identity and source locations; any extra or missing finding fails.
Matched findings appear under `expectedFindings`, and unperformable parse/presentation phases remain unperformed.
Never create accepted expectations by learning a candidate's current failures.

`runJsonQuality` accepts explicit repository root, required output patterns, `files` selection for every operation, applicable `check` / `scope` modifiers, and optional cumulative logical inventory/documents.
Required outputs add obligations without replacing physical discovery.
Each logical inventory entry contains exactly `path`, `sha256`, `byteLength`, `containerPath`, `pointer` and `encoding` (`utf8` or `base64`).
An expected-diagnostic container can additionally require `expected.linkedDocuments`: exact `path`, `pointer`, `encoding`, `sha256` and `byteLength` pins.
These members must appear in the independently supplied logical census and pass physical-pointer reconciliation before the container exception is admitted.
Standalone document analysis rejects an undischarged linkage requirement.
Each supplied logical document contains exactly its canonical `path` and an owned `Buffer` of `bytes`.
Every member must match its independently owned inventory and the actual pointed-to string in a physically discovered container.
Repository adapters must also invoke their existing storage and domain validators.
Logical and JSONL documents are always protected from generic writes.
Native documents use optional `nativeSources` declarations in configuration and a trusted `nativeProviders` function map in `runJsonQuality` or its CLI context.
JSON configuration selects a name; it never imports executable modules.
Each declaration contains `id`, `provider`, `owner` and `reason`, with optional JSON `parameters`, `minimumDocuments` (default 1; explicitly 0 for a legitimate empty scope) and a source-default `formatContract`.
Exact path exceptions still override that presentation default.
The provider receives `{ root, parameters }` and returns exactly `{ inventory, documents, authorities }`.
It must run its native storage and domain admission first; the package does not implement archive extraction, signature verification or manifest semantics.
Every admitted physical source and authority is protected from generic formatting and normalization, even when its ordinary path policy was writable.
Each inventory entry contains exactly `path`, `sha256`, `byteLength` and `source`.
A content-addressed source contains exactly `kind: "content-addressed"`, `path`, `sha256` and `byteLength`, identical to the document identity.
An archive source contains `kind: "archive-member"`, the physical archive `path`, `sha256`, `byteLength` and a contained `memberPath`; its document path is `archivePath!/memberPath` and its document hash/length describes the original member bytes.
Each supplied document contains exactly `{ path, bytes: Buffer }`.
`authorities` contains at least one independently verified physical `{ path, sha256, byteLength }` identity, such as the native manifest or lock.
All physical sources and authorities must be regular contained files.
Missing, duplicate, unexpected, colliding or changed identities fail before writes.
The package clones admitted buffers and rechecks source/authority snapshots before reporting and writing.
Exclusions still require the complete native census and matching bytes; excluded member paths remain visible in the source summary and external boundaries.
Native documents are always protected.
Result schema 4 reports a separate `counts.native`, per-document `nativeSource` identity and `nativeSources` summaries with authority snapshots, inventoried/included counts and exact excluded paths.
Pure `formatJsonSource(text, { capacityLimits })` preserves strict JSON token spelling and decoded values through the native printer's debug check.
`formatJsonValue(value, { capacityLimits })` first requires plain acyclic JSON data; accessors, custom serialization, sparse arrays, unsupported values, negative zero and nonfinite numbers are rejected rather than silently transformed.
Both return text without acquiring tools or writing files; neither normalizes values or establishes a quality pass.
Keep historical canonical/digest encoders separate.
JSONL uses UTF-8 records, LF or CRLF framing, an optional final terminator, strict per-record analysis and native compact producer presentation; blank records fail.

CLI and library operations are the same five verbs: `inventory`, `lint`, `check`, `format` and `normalize`.
`runJsonQuality("format", { root, check: true })` mirrors `format --check`; `runJsonQuality("check", { root, scope: "protected" })` mirrors `check --scope protected`.
The naming rule is one verb plus named modifiers, with kebab-case terminal flags and camelCase object keys.
[Command Line Interface Guidelines](https://clig.dev/#subcommands) recommends consistent verbs and options; [Prettier](https://prettier.io/docs/options) documents corresponding CLI/API option names, and ESLint uses the same [CLI `--fix`](https://eslint.org/docs/latest/use/command-line-interface#--fix) / [API `fix`](https://eslint.org/docs/latest/integrate/nodejs-api#autofix) concept.
These are design precedents rather than a standard mandating these particular verbs.
The CLI `check --scope protected` reports quality findings on write-protected documents, including authored documents, logical views and native evidence.
The default `check --scope all` covers every document; protection describes write permission rather than producer ownership.
The old `producers` command and operation are removed without aliases.
Result schema 4 reports the same operation and applicable modifiers: every `format` result includes boolean `check`, and every `check` result includes `scope: "all" | "protected"`.
Other operations carry neither modifier.
Regenerate schema 2/3 reports and refresh copied validators; older result contracts are rejected.
`--help` and command-specific help use the same closed command grammar as argument admission and run no repository adapter.
Explicit physical files follow `--`, or use `--files` with a JSON array, including an explicit empty array.
The default remains complete repository checking.
Missing, excluded, duplicate, escaping and nonliteral physical paths are rejected.
Read-only explicit checks analyze the selected physical documents plus all required logical/native documents; required-output adapters reject narrowing.
Explicit formatting validates the complete repository batch before writing only selected sources.
The optional `selection` object reports requested paths, full physical inventory size and actual analysis scope; a scoped pass does not establish repository-wide quality.
Explicit formatting rejects selected write-protected sources instead of silently skipping the requested repair.
Consumers must adopt the current exported result schema 4, including its selection and modifier accounting.
The `files` array supplies selection to `runJsonQuality` for every operation; normalization requires a nonempty unique array and still preflights the entire repository before writing selected files.
`--concurrency N` and API `concurrency` select positive preparation concurrency, defaulting to 1, with deterministic result order and settled preparation before any write.
This is asynchronous preparation concurrency, not a promised number of CPU worker threads or a guaranteed speedup.
`--diagnostic-level info|warning|error` admits the same human-output levels as Markdown Quality; current JSON findings are errors and remain visible at every level.

`json-quality format --request - --json` accepts one bounded UTF-8 JSON request with `schemaVersion: 1`, nonempty `requestId`, a literal strict-JSON `path` and canonical base64 `contentBase64`.
`formatJsonDocument(request, { root, check, capacityLimits })` uses the same contract.
`--request -` names the request while `-` selects stdin transport; the object API receives the parsed request directly.
With `check: true` / `--check`, it verifies presentation without changing the supplied content.
Request mode rejects repository file selection, preparation concurrency and repository adapter obligations.
It resolves the root's trusted policy and refuses excluded or producer-owned paths.
The response contains schema version 1, the request ID and path, output `contentBase64`, and the native quality `result`.
The package exports `document-request-schema` and `document-response-schema`; register the exported `result-schema` under `result.schema.json` when compiling the response schema.
The CLI stdin transport rejects duplicate envelope members, malformed UTF-8 and a leading BOM before schema admission.
The library API receives an already parsed request object and validates its schema and payload bytes.
It never writes files, normalizes strings or claims whole-repository quality.
Semantic findings retain the original content; successful formatting preserves numeric lexemes and passes the package's native preservation check.
Operational CLI failures retain the ordinary error result and exit 2.
The CLI uses `json-quality format --check` for read-only formatting verification and `json-quality format` to apply formatting.
The former API operations `check-format` / `check-protected`, API `sourcePaths`, CLI `--files-json` / `--stdin-request` and export `processJsonDocument` are removed without compatibility aliases.
Use `format` with `check: true`, `check` with `scope: "protected"`, `files` / `--files`, `--request -` and `formatJsonDocument` respectively.
Neither interface accepts `format-check` or `check-scope-protected` as an operation.
The boolean `check` modifier is valid only with `format` in both interfaces; the default is `false`.
The `scope` modifier is valid only with `check`, with default `"all"`.
Unknown modifiers and non-boolean `check` values are rejected rather than silently ignored.
The ordinary `check` covers every phase.
`inventory` reports discovered physical/logical identities, external boundaries and resolved owner/write/presentation/NFC contracts.
It validates policy and scope/provenance accounting without performing JSON analysis or JSONL framing; `syntaxValid` and record counts are null and `checked` is zero.
It establishes scope, never a quality pass; there is no redundant `inspect` alias.
Ordinary inventory reads file identities and sizes without loading their contents; logical provenance still requires reading its declared physical containers.
Undecodable JSONL bytes leave record and checked-document coverage null rather than reporting zero records.
Lint omits presentation findings; presentation checking retains byte/expectation failures; protected-scope checking reaches write-protected inputs.
The CLI exits 0 for a complete pass, 1 for known findings or partial-write failure and 2 for invalid input or operational failure.
Machine output is opt-in `--json` and validated against result schema 4 plus semantic count, identity, phase and write accounting.
Earlier result schemas require regeneration; they are not silently admitted as current native-coverage proof.
Unknown coverage is represented by null counts, never zero.

Optional configuration `capacityLimits` and per-invocation API `capacityLimits` override resource defaults; invocation values take precedence.
Omission inherits policy; explicit `true` or a numeric override object enables finite configured/default capacities even when policy selected `false`.
The [consumer resource guide](resource-limits.md) lists every default, its rationale and overrides for qualification, acquisition, request transport and shared CI.
Values are positive safe integers without arbitrary package ceilings; `capacityLimits: false` disables all 17 shared operation capacity checks.
The CLI exposes each setting, for example `--max-files 100000 --max-file-bytes 67108864`, plus the canonical `--capacity-limits` switch and its native negative form `--no-capacity-limits`.
Individual overrides and `--no-capacity-limits` cannot be combined in one invocation.
The former `--no-limits`, API/policy `limits`, environment `JSON_QUALITY_LIMITS` and workflow input `resource-limits` are not aliases; migrate to the capacity-specific names.
The [`capacityLimits` definition in the configuration schema](../schemas/configuration.schema.json#/definitions/capacityLimits) owns each capacity setting and its default.
Runtime defaults derive from those annotations; consult that declaration for current values.
Native member documents share the cumulative logical-member ceiling; physical/native document identities share the file ceiling.
Native source and authority snapshot bytes, counted once per source path, and every admitted member buffer also consume total input capacity.
Limits fail before writes and never disable semantic rules.
Policy bootstrap bytes, Git/tool output and formatter time are capacity controls too, with corresponding override flags; enlarge policy bootstrap capacity using CLI/API overrides before loading a policy larger than the default.
Operating-system/native-tool constraints still apply when package limits are bypassed; failures never become a pass.
These are cooperative admission controls, not an OS sandbox or a promise that native parsers have constant memory cost.
The separate JavaScript identity rule accepts resource options `maxFrames` and `maxSteps`; [the rule's `DEFAULT_LIMITS` declaration](../src/eslint/noJsonStringifyIdentity.js) owns their defaults.
Each accepts a positive safe integer or `false` to bypass that limit; an options value of `false` bypasses both.
These options never disable the semantic guard or replace consumer permutation tests.

Repository command adapters can call `await runJsonQualityCli(process.argv.slice(2), { root, requiredOutputs, logicalInventory, logicalDocuments })` and assign its returned exit code.
A supplied root is fixed: a conflicting `--root` fails.
Argument parsing, capacity overrides and human/machine result reporting remain package-owned; importing this API performs no command.
Adapters that must load or verify repository-owned inputs may instead supply a trusted asynchronous factory returning that same closed context.
It runs after argument admission, inside the package's error envelope.
Native storage-verification failures then return exit 2 and an incomplete machine result rather than escaping as an unstructured stack trace.

Producer archive qualification selects the policy's producer npm contract and admits its keyed native pack report.
Older report shapes are rejected; the CI matrix explicitly selects the qualified package manager.
Consumer runtime and acquisition requirements are separate from this producer contract; see the [canonical runtime policy](node-runtime-compatibility.md).
The consumer npm toolchain retains native Git restrictions, lockfile version 3, cached archive verification and offline replay at each admitted Node floor.
Platform/runtime support requires the named source and transported tests on Windows and Linux; unobserved hosted results remain gaps.

## CLI and object mappings

The API column refers to `runJsonQuality(operation, options)` unless another function is named.
Root policy stores only policy settings such as `capacityLimits`; invocation modifiers do not become policy keys.
Omitted `files` selects the repository; `files: []` selects no physical files for read-only requests and is rejected by normalization.
Writing `format` with explicit `files: []` still analyzes the full repository and writes nothing; an empty selection never expands into write permission.
For nested capacity rows, `capacityLimits.maxFiles: N` means `{ "capacityLimits": { "maxFiles": N } }`.

| Meaning                         | CLI                                          | JSON/API                                         |
| ------------------------------- | -------------------------------------------- | ------------------------------------------------ |
| Inventory scope                 | `inventory`                                  | `"inventory"`                                    |
| Lint documents                  | `lint`                                       | `"lint"`                                         |
| Check all quality phases        | `check`                                      | `"check"`                                        |
| Check all documents             | `check --scope all`                          | `"check", { scope: "all" }`                      |
| Check protected documents       | `check --scope protected`                    | `"check", { scope: "protected" }`                |
| Apply formatting                | `format` / `format --no-check`               | `"format", { check: false }`                     |
| Verify formatting               | `format --check`                             | `"format", { check: true }`                      |
| Normalize selected files        | `normalize`                                  | `"normalize"` with nonempty `files`              |
| Repository root                 | `--root PATH`                                | `root: "PATH"`                                   |
| Literal file selection          | `-- file.json`                               | `files: ["file.json"]`                           |
| Encoded file selection          | `--files '["file.json"]'`                    | `files: ["file.json"]`                           |
| Preparation concurrency         | `--concurrency N`                            | `concurrency: N`                                 |
| Format a supplied request       | `format --request - --json`                  | `formatJsonDocument(request, options)`           |
| Verify a supplied request       | `format --check --request - --json`          | `formatJsonDocument(request, { check: true })`   |
| Enable capacities               | `--capacity-limits`                          | `capacityLimits: true`                           |
| Disable shared capacities       | `--no-capacity-limits`                       | `capacityLimits: false`                          |
| Maximum files                   | `--max-files N`                              | `capacityLimits.maxFiles: N`                     |
| Maximum bytes per file          | `--max-file-bytes N`                         | `capacityLimits.maxFileBytes: N`                 |
| Maximum total input bytes       | `--max-total-bytes N`                        | `capacityLimits.maxTotalBytes: N`                |
| Maximum logical documents       | `--max-logical-documents N`                  | `capacityLimits.maxLogicalDocuments: N`          |
| Maximum JSON Lines records      | `--max-records N`                            | `capacityLimits.maxRecords: N`                   |
| Maximum diagnostics             | `--max-diagnostics N`                        | `capacityLimits.maxDiagnostics: N`               |
| Maximum policy bytes            | `--max-policy-bytes N`                       | `capacityLimits.maxPolicyBytes: N`               |
| Maximum Git output bytes        | `--max-git-output-bytes N`                   | `capacityLimits.maxGitOutputBytes: N`            |
| Maximum tool output bytes       | `--max-tool-output-bytes N`                  | `capacityLimits.maxToolOutputBytes: N`           |
| Maximum formatter time in ms    | `--max-tool-time-ms N`                       | `capacityLimits.maxToolTimeMs: N`                |
| Maximum Git time in ms          | `--max-git-time-ms N`                        | `capacityLimits.maxGitTimeMs: N`                 |
| Maximum acquisition time in ms  | `--max-acquisition-time-ms N`                | `capacityLimits.maxAcquisitionTimeMs: N`         |
| Maximum cache lookup time in ms | `--max-cache-lookup-time-ms N`               | `capacityLimits.maxCacheLookupTimeMs: N`         |
| Maximum cache output bytes      | `--max-cache-output-bytes N`                 | `capacityLimits.maxCacheOutputBytes: N`          |
| Maximum stdin request bytes     | `--max-request-bytes N`                      | `capacityLimits.maxRequestBytes: N`              |
| Maximum request ID characters   | `--max-request-id-characters N`              | `capacityLimits.maxRequestIdCharacters: N`       |
| Maximum request path characters | `--max-request-path-characters N`            | `capacityLimits.maxRequestPathCharacters: N`     |
| Trusted qualification root      | `json-quality-qualify --trusted-root PATH`   | `qualifyJsonConsumer({ trustedRoot: "PATH" })`   |
| Candidate qualification root    | `json-quality-qualify --candidate-root PATH` | `qualifyJsonConsumer({ candidateRoot: "PATH" })` |
| Trusted immutable commit        | `json-quality-qualify --trusted-sha SHA`     | `qualifyJsonConsumer({ trustedSha: "SHA" })`     |
| Candidate immutable commit      | `json-quality-qualify --candidate-sha SHA`   | `qualifyJsonConsumer({ candidateSha: "SHA" })`   |
| JSON rendering                  | `--json` / `--no-json`                       | CLI only; library returns objects                |
| Help                            | `--help`, `-h` / `--no-help`                 | CLI only                                         |
| Human diagnostic threshold      | `--diagnostic-level info\|warning\|error`    | CLI only; structured findings unchanged          |

The qualification CLI accepts the same capacity flags and help; it always emits JSON and has no redundant `--json` flag.
Its parameter sources also include these environment fallbacks; explicit CLI flags take precedence.

| Meaning                              | Environment                    | JSON/API         |
| ------------------------------------ | ------------------------------ | ---------------- |
| Trusted qualification root           | `JSON_QUALITY_TRUSTED_ROOT`    | `trustedRoot`    |
| Candidate qualification root         | `JSON_QUALITY_CANDIDATE_ROOT`  | `candidateRoot`  |
| Trusted immutable commit             | `JSON_QUALITY_TRUSTED_SHA`     | `trustedSha`     |
| Candidate immutable commit           | `JSON_QUALITY_CANDIDATE_SHA`   | `candidateSha`   |
| Capacity configuration in either CLI | `JSON_QUALITY_CAPACITY_LIMITS` | `capacityLimits` |

The capacity environment value is JSON `true`, `false` or a numeric override object; explicit CLI booleans override its boolean value and numeric flags override object entries.
See [capacity precedence and bootstrap controls](resource-limits.md) for acquisition and policy inheritance.
Trusted adapter options `requiredOutputs`, `logicalInventory`, `logicalDocuments` and `nativeProviders` are supplied programmatically through library options or CLI context, never untrusted command text.
The library-only `gitExecutable` dependency selects a trusted executable for discovery; it is not a candidate-controlled CLI setting.
Independent ESLint `maxFrames` / `maxSteps`, acquisition cleanup settings and GitHub workflow deadlines are documented in the [resource guide](resource-limits.md); they are not repository-operation aliases.
