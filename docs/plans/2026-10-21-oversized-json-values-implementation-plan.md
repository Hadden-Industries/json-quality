# Incremental JSON checking and oversized values: implementation plan

**Issue:** [JSON Quality #3](https://github.com/Hadden-Industries/json-quality/issues/3).\
**Revision:** 3, 21 October 2026; parent-validated JSONL framing corrections; Claude review incomplete.\
**Status:** Detailed draft for review; conditional implementation handoff, not an accepted design or permission to implement, publish, or change an execution.\
**Source baseline:** `6bae0cfb2f7bdb186f31246eb50ecfb8fdfb74df`.\
**Proposed route:** HISEW R2, subject to the implementation owner's accepted risk route.\
**Method:** HISEW dev.29 planning procedure and engineering principles, including NAM-01, NSH-01, DRY-01, REU-01, VER-01, LIC-01, and declaration documentation.

## Purpose, authority, and scope

JSON Quality should check and expose complete JSON documents even when one string, member name, number, object, record, or collection exceeds today's materialization limits.
Increasing a byte allowance must not merely move the failure into `Buffer`, JavaScript strings, an AST, a diagnostic array, or a downstream `JSON.parse`.
A successful check must mean that the entire selected quality contract was checked against the identified bytes.
Consumers must be able to use those bytes and values without recreating the same limit.

The requester explicitly superseded issue #3's acceptance requirement to retain existing API/CLI behaviour for current consumers.
All current consumers may be updated.
This plan therefore chooses a coordinated contract migration, with no compatibility shims, deprecated aliases, legacy result projection, or second parser retained to preserve old behaviour.
Existing names may remain only when their meaning and responsibility remain accurate; renaming everything is not a goal.
Semantic meaning, one authority for each rule, and honest completion take precedence over API continuity.

Only that compatibility requirement is superseded.
Explicit contract/schema versions, preservation of immutable source bytes and historical hashes, and complete selected quality checks remain required.
Permission to change an API does not authorize weakening a quality policy, turning a failed check into a pass, or rewriting retained evidence.
The GitHub issue itself has not been edited by this planning task.

This plan authorizes no product implementation.
It records a draft dossier and proposed decisions because a protected implementation baseline, native software-selection assessment, design acceptance, and final distribution clearance have not yet been accepted.
The [NFC and presentation proof report](2026-10-21-nfc-presentation-proof.md) resolves the two technical feasibility gates with current-source research, isolated native experiments and independent finite oracles.
DEC-005/006 now specify concrete mechanisms that preserve the existing selected quality policies; the remaining gates concern acceptance, production integration and qualification.
The earlier parser experiments and this new proof do not establish a finished full-quality product or release.

Included:

- Incremental strict JSON/JSONL byte admission, parsing, checking, diagnostics, inventory, and consumption for physical, logical, and trusted native documents.
- File-backed large values and indexes, exact identity and number lexemes, bounded transport, explicit completion, cancellation, and owned cleanup.
- Replacement of conflicting public contracts and migration of JSON Quality itself and all discovered external consumers.
- Supported Windows/Linux native distribution, acquisition, package qualification, and a documented non-Node consumption boundary for the planned HISEW integration.
- Preservation of the existing responsibilities of guarded formatting, normalization, acquisition, identity linting, and domain validators while their callers migrate.

Excluded:

- A new JSON dialect, generic JSON Schema engine, blob service, distributed scheduler, or HISEW lifecycle implementation.
- A promise of constant memory at arbitrary nesting depth or unlimited machine resources.
- New oversized formatting/NFC-repair capabilities unless separately justified and accepted as an explicit write feature.
  Read-only checking never triggers repair.
- Consumer commits, releases, registry publication, engine selection, worktree/execution adoption, or provider review as effects of writing this plan.

HISEW applicability was inspected for this repository and was active with personal applicability.
No existing execution was selected, adopted, closed, or otherwise changed.
The prior instruction to protect other executions continues to apply.
The present request permits this planning document under `docs/plans`.

## Reused evidence and its limits

The earlier HISEW issue #187 work supplies the strongest available parsing and consumption evidence.
Its local artifacts are retained at `G:\My Drive\Hadden Industries\sew\HISEW-issue-187-review-evidence-2026-10-19\revision-5`.
They are evidence locators for the owner, not package runtime dependencies.
Public technical references and the consequential observations are included here so that the implementation handoff does not depend on reading the chat.

| Evidence                    | Immutable identity or scope                                                                                                                                                                                                                    | Reuse and limit                                                                                                                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frozen R5 plan              | `plan-revised-r5.md`, SHA-256 `5ee28142a42572824f6e7c7f31646200c3534cc9767ce36e8187409581a443f3`                                                                                                                                               | HISEW consumer needs, owned cancellation, immutable evidence, domain validation. Do not inherit its implementation authority or unrelated slices.                                      |
| Software-selection research | `software-selection-research-r5.md`, SHA-256 `30c395cde022b33482cda845fe32b560e3bf2c4ee68ff21a4f69463a0310c9e8`                                                                                                                                | Reuse alternative evaluation and current-source investigation. Changed JSON Quality rules need the additional gates below.                                                             |
| Decision and experiments    | `oversized-json-decision-and-experiments.md`, SHA-256 `e92c242153e8342920fa15d2173131dfceeecba2aa8a1c1c6e32d13ce2c00925`                                                                                                                       | Parser fragments, disk-backed consumption, exact comparisons, schema projection, failure cases. These are prototypes, not shipped interfaces.                                          |
| R5 manifest                 | `manifest.json`, SHA-256 `2ea883aca3474a1630dbb18eafd30c39d977cec284c18eb6cce2327f8f216aad`                                                                                                                                                    | Source/build/experiment identities and preservation observations. Its pre-publication issue status is historical.                                                                      |
| Published issue body        | `publication-2026-10-21/issue-body.md`: LF-normalized submitted-text SHA-256 `ce2e9e23ada92ade6e5dbc3500cd53a45259ad4d61585277347b6e1faba5e4a1`; retained CRLF file SHA-256 `cb2b24088259ff6a049ed1433ae3a111f31a8020ef69faaa7b472419906a67f7` | Remote readback matched the approved proposal. Both representations were rechecked during planning. Current requester override replaces its API-continuity constraint.                 |
| Native probe                | SHA-256 `685d0990fb71e07db5290a817b8d71ba3ebe2e92f8c988925956ddec9343e34f`                                                                                                                                                                     | Boost 1.92.0 public `basic_parser` handlers, strict UTF-8/UTF-16, fragmented keys/strings/numbers and no numeric materialization. No private lexer or upstream source patch.           |
| Existing project plans      | [DRY remediation](2026-10-16-remaining-dry-remediation-plan.md), [architecture checks](2026-10-16-architecture-checks-implementation-plan.md), [release assurance](2026-10-18-release-publishing-assurance-implementation-plan.md)             | Reuse native authority, independent token oracle, dependency checks, clean-source acquisition, and distinct release evidence. Older acceptance/approval/status claims do not transfer. |

The isolated workspace was `C:\Users\maksy\.codex\tmp\issue187-json-research-2026-10-21`.
Its build used MSVC 14.51.36231, Windows SDK 10.0.28000.0 and C++20 on Windows 11 x64; consumers used Python 3.15.0 and the existing JSON Quality API used Node 24.21.0.
The Boost source archive SHA-256 was `c4a3b310ddd2472416e091067166b0713be97c63f38c212c484ada022fd296ce`.

There were **65 experiment runs: 62 native parser runs, two Python baseline runs, and one consumer-only missing-EOF run**.
There were also 23 additional conformance checks, seven JSON Quality semantic cases, and two JSON Quality size measurements.
All declared final expectations passed.
These categories must not be collapsed into a claim of 65 product/parser tests.

Relevant measurements and observations:

- For 8/32/128 MiB strings, native parser peak memory was about 3.67 MiB and the separate file-backed consumer about 21.27/21.31/21.23 MiB.
  The 128 MiB phases took 0.132/0.329 seconds respectively.
  Phases ran sequentially; these are not a concurrent production peak or a cross-runtime benchmark.
- A 32 MiB key and million-digit integer/exponent were consumed as fragments.
  Syntactically valid numbers were not thereby admitted to JavaScript or HISEW numeric domains.
- A 100,000-record, 20.78 MiB input used about 3.69 MiB in the parser and 23.17 MiB in the consumer.
  Scalar/index storage reached 92.69 MiB, excluding raw/event files.
  Disk amplification is a material trade-off.
- Chunk sizes 1, 7, and 65,536 preserved decoded Unicode and raw number lexemes.
  Escaped duplicate names were detected by the consumer's exact comparison.
  Forced digest collisions did not make distinct names equal.
- Invalid UTF-8, truncation, forbidden syntax, trailing input, missing terminal EOF and events after terminal closure were rejected.
  Depth 128 worked; a configured limit of 64 rejected it.
- `1e309` was valid syntax but rejected by the HISEW finite-number consumer.
  Escaped lone surrogates were rejected strictly; accepting them with replacement characters would change meaning.
- Existing native HISEW schemas and a proposed reference-bearing schema were exercised separately.
  The 100,000-record schema test used a synthetic per-record contract and an external uniqueness index; it did not qualify all HISEW schemas.
- A cancellation probe terminated its owned child in roughly 0.012 seconds and left an unrelated sentinel unchanged.
  It did not qualify production Windows Job/POSIX containment.

Those earlier experiments did not qualify NFC, normalization collisions or presentation.
Revision 2 adds the following separate proof; it does not retroactively extend their scope.
Earlier AGY and Claude reviews covered earlier HISEW plan revisions, not this JSON Quality plan.
Do not relabel those reviews as review of this candidate.

### Revision 2 normalization and presentation proof

The [companion report](2026-10-21-nfc-presentation-proof.md) records primary sources, exact component/source/binary identities, actual terms inspected, alternatives, bounded residual custom work, reproduction and limits.
Its compact evidence packet is `G:\My Drive\Hadden Industries\sew\json-quality-issue-3-proof-2026-10-21\experiment-evidence.zip`, SHA-256 `7df75c7751e75bbc9671e7f0324a7d6b0d15f0babdf0b696074763ad8f5d9c6a`.
The frozen revision-1 plan has SHA-256 `abaac9a3bbbe074d61c6ffcad09e8892c7d8329fb0cfd65a3b531a75ca8d0cd8`.

- ICU 78.3/Unicode 17 public scalar operations with external stable class queues and a pending composition tail passed 1,232,234 comparisons: all five NFC relations for 20,034 official rows, 20,000 random contexts, and every Unicode scalar individually against native ICU.
  Node's current NFC implementation independently agreed with all 100,170 official relations.
- Ordered, reordered and already-NFC combining sequences completed at 8/32/128 MiB with exact expected bytes.
  The 128 MiB probes used 5.25–5.38 MiB peak native working set and about 512 MiB of intermediate spools.
  An all-55-class case used 9.03 MiB and 56 spill files.
  These fixed-class bounds and disk costs are explicit design inputs, not a universal product-memory claim.
- A 40 MiB JSON integration distinguished giant decoded duplicates, normalized collisions, false digest candidates and object scope while preserving a narrow value pin.
  Source hashes stayed unchanged.
  Cancellation during external replay and injected resource/input failures did not assert completion.
- All six existing presentation contracts matched the current package in 1,140 finite differential comparisons, including a 19,990-value finite binary64 corpus.
  Another 54 scale/fault cases and 23 edge cases passed their declared expectations. Correct 128 MiB strings and giant keys completed; giant number spellings passed the default raw-spelling policy and correctly failed producer canonical presentation. The scale/fault matrix peaked at 4.06 MiB native working set.
- Fourteen JSONL framing cases included thirteen existing-API comparisons and two 128 MiB records in one complete stream.
  No policy replacement, stream-safe insertion or size-based legacy path was required.

These are prototype/oracle results.
Production diagnostics, all shared-rule integration, Linux, clean installed artifacts, native security, distribution closure, process containment and the real consumer cohort still require the planned qualification.
The JSONL and duplicate-key composition limits are explicit in the report.
Neither this packet nor an older provider review is an independent review of the final implementation.

### Revision 3 framing correction and review outcome

The review attempt summarized below is distinct from the independently validated parent finding P-01.
Claude Opus 5.5 at Max received frozen revision 2 and its proof report with a 60-minute execution allowance.
The process timed out without readable findings or a report; this is neither a completed review nor a clean review result.
No Claude finding is attributed to this revision, and the amended documents have not received a completed external review.

Parent finding P-01 reproduced a narrower gap in the retained JSONL harness: 10 of 15 added cases differed from the current API's framing/admission summary, although neither path accepted the invalid inputs.
Eight differences concern blank-record classification; two concern source byte admission and record-count scope.
An independent comparison over all 1,112,064 Unicode scalars validated the proposed shared ECMAScript trim predicate against Node: 25 members, zero mismatches.
The [proof report](2026-10-21-nfc-presentation-proof.md#jsonl-follow-up-blank-classification-and-byte-admission) records the exact experiment, primary sources and remaining integration gates.
This corrects the scope of the 14 earlier JSONL observations; it does not invalidate the NFC or six per-document presentation feasibility results.
DEC-006, the shared rule contract, QA-006/009/016 and the DRY ownership matrix now require explicit framing, source/record BOM treatment and diagnostic precedence.
API/schema migration remains authorized; preserving semantic distinctions does not require a legacy result projection or shim.

During the review another execution advanced JSON Quality to `5ae3dd4cbde23462f8c9e5df819c8393f233dd60` by committing changes to `CONTRIBUTING.md` and `package.json`.
The analyzed product sources and the two frozen documents were unchanged at follow-up validation.
That concurrent commit is preserved; the source baseline above identifies the analyzed inputs rather than claiming that HEAD stayed fixed.

## Current architecture and consumer baseline

The source package identifies version `1.0.0` as an internal development candidate, not an existing npm publication.
Configuration schema 1, result schema 4, and document request schema 1 are current contracts.
The declared Node range is `^22.13.0 || ^24.0.0 || ^26.0.0`; the producer uses npm 12.2.1.
Refresh these identities at implementation freeze through the existing policy owners.

| Current authority                                                      | Observed limit or responsibility                                                                                                                     | Planned treatment                                                                                                                                           |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/json-bytes.js`, `src/documents.js`, `src/quality.js`              | Whole byte decoding, ESLint JSON AST, findings arrays; exact decimal rule still materializes exponent with `BigInt`; NFC uses whole strings and maps | One incremental read/check authority; retain semantic requirements and independently compare finite overlap. Remove displaced runtime rule implementations. |
| `src/json-lines.js`                                                    | Whole-input decode/split, whole-record checks and selectors                                                                                          | Incremental framing, per-record completion and selector references; a giant record remains supported.                                                       |
| `src/presentation.js`, `src/json-format-options.json`                  | Prettier checks whole text; producer contracts parse/stringify whole documents                                                                       | Implement the proven DEC-006 predicates; preserve policy semantics and shared duplicate facts. No implicit omission or preserved-bytes exemption.           |
| `src/inventory.js`, `src/execution.js`, `src/result.js`                | Full inventories, snapshots and result arrays can grow independently of token size                                                                   | Iterable discovery, external reconciliation and diagnostic/result streams with explicit closure.                                                            |
| `src/logical-documents.js`, `src/native-documents.js`                  | Whole containers, base64 materialization, provider arrays and cloned buffers                                                                         | Streamed sources, independent census closure, incremental identity verification and exact member linkage.                                                   |
| `src/replacement.js`, source formatting/NFC repair                     | Guarded writes, peer preflight, source identity and partial-write accounting                                                                         | Preserve this separate effect authority; adapt preflight to the new checker. No check-to-write fallback.                                                    |
| `src/installation.js`, `src/acquire.js`, qualification/release scripts | Native npm integrity, isolated acquisition, generated bootstrap and transported package proof                                                        | Extend the same acquisition/qualification closure for native artifacts. Do not add an unrelated downloader.                                                 |
| `src/eslint/`, native Ajv and consumer schema validators               | Serialization-as-identity linting, control-contract validation and consumer meaning                                                                  | Retain their separate authority. The identity ESLint plugin is not the JSON document parser.                                                                |

The local package-manifest census found four external consumers, all pinned through `tooling/json/package.json` to `6bae0cfb2f7bdb186f31246eb50ecfb8fdfb74df`.
This is an inspected portfolio census, not proof that no unavailable or remote consumer exists.
Refresh repository/code/CI references before baseline acceptance.

| Consumer and inspected HEAD                                     | Migration surface and evidence owner                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Markdown Quality — `7765a8227318ddd997daf706bc195e615f9d74e1`   | `tooling/json`, `scripts/runRepositoryJsonQuality.mjs`, `scripts/qualify-json-packages.mjs`, `scripts/native-json-documents.mjs`, schema/performance producers, identity lint and JSON tooling tests. Its integration owner proves full native/package census and generated-output meaning.  |
| OwlAPI — `f998ca0d68fa76242ca335b3e0d6f6abb564b155`             | `tooling/json`, `scripts/run-json-quality.mjs`, `scripts/json-quality-policy.mjs`, logical JSON-LD/native archive providers, JSON/protected-preservation probes and workflow callers. Run the real complete adapter; literal file filtering cannot discharge required native outputs.        |
| WebVOWL — `37fd52759f231d3c1b4794f15b5c599f717b0ddc`            | `tooling/json`, `util/runRepositoryJsonQuality.mjs`, `util/jsonIntegration.probes.mjs`, provider/policy modules, scripts and CI. Verify authored, generated, protected and exact expected findings.                                                                                          |
| Universal Ontology — `eb653e5c598dbe90f019c3f023e8c52f2b767edf` | `tooling/json`, `scripts/runRepositoryJsonQuality.js`, JSON tests, PR check selection/job evaluation, `.github/workflows/development-checks.yml`, distribution verification membership. Preserve old frozen release inventories; new source membership needs a new candidate identity.       |
| JSON Quality itself — source baseline above                     | Public/API/CLI tests, own JSON checks, qualification probes, generated acquisition bootstrap, reusable consumer workflow, release/schema readers and docs. This is a consumer migration, not merely the producer implementation.                                                             |
| HISEW — `3c912ae33950c8434a42429e3eb6d9002f2161ce`              | Prospective consumer from [issue #187](https://github.com/Hadden-Industries/software-engineering-workflow/issues/187), not an existing package dependency. Qualify a documented Python/native boundary and contract examples here; actual HISEW integration remains its own governed change. |

## Draft requirements and acceptance criteria

These IDs belong to JSON Quality issue #3; similarly numbered HISEW issue #187 IDs are a different namespace.
Each AC below is a local, falsifiable refinement.
The parenthesized issue references map back to the published issue's numbered acceptance items.

| Requirement                                            | Acceptance criterion                                                                                                                                                                                                                                                          | Issue mapping              |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| REQ-001: Consume every admitted byte incrementally     | AC-001: Small and giant scalar/object/record inputs use the same semantic read path; finite capacities reject explicitly and disabled capacities introduce no hidden DOM, record or token ceiling. Strict syntax and exact EOF are established.                               | 1, 3                       |
| REQ-002: Preserve identity and meaning                 | AC-002: Raw hash/length, decoded Unicode, exact number lexemes, locations, duplicate names and normalized-name collisions remain correct across arbitrary chunk boundaries and forced digest collisions. No source bytes are changed.                                         | 3, 4                       |
| REQ-003: Complete the selected quality contract        | AC-003: Every selected byte, syntax, interoperability, key, NFC, preservation, expectation and presentation rule has a completed result or explicit failure/incompleteness. No skipped rule or dropped diagnostic produces a quality pass.                                    | 4, 5                       |
| REQ-004: Make resource use explicit and scalable       | AC-004: Increasing token/document/finding/census sizes have measured parent-plus-child RSS, time, temporary disk, descriptors and retained bytes; growth follows the declared model and actual native limits are identified. Policy resolution is consistent across bindings. | 1, 2                       |
| REQ-005: Expose usable values and complete outcomes    | AC-005: Consumers access scalar fragments, structural/record events and stable scoped references without mandatory materialization. Parse completion, rule completion, delivery completion and domain admission are distinct.                                                 | 5, 6                       |
| REQ-006: Preserve inventory and provider authority     | AC-006: Physical/logical/native/JSONL obligations reconcile completely; missing, duplicated, changed or unauthorized sources fail. Oversized logical strings/base64 and archive members do not force whole-container decoding.                                                | 1, 3, 6                    |
| REQ-007: Respect ownership and interruption            | AC-007: Backpressure, input/output failure, cancellation, process death and disk exhaustion prevent success; cleanup affects only owned artifacts/children and borrowed reference lifetime is enforced.                                                                       | 6, 7                       |
| REQ-008: Migrate contracts without shims               | AC-008: All enumerated consumers use the accepted new contract and exact candidate; obsolete interfaces/flags/shapes and runtime compatibility branches are removed. New schemas explicitly reject unsupported versions; historical bytes remain unchanged.                   | 8, with requester override |
| REQ-009: Reuse maintained authorities                  | AC-009: The exact supported parser/dependencies, native validators, licenses, source closure and residual custom rules are documented and qualified. Node/Python consumers do not fork document parsing or quality semantics.                                                 | 3, 9                       |
| REQ-010: Preserve effect and trust boundaries          | AC-010: Checking never writes source, performs repair, loads consumer code from data, installs tools or retrieves external schemas. Guarded writes remain explicit and honest about materialization limits and partial completion.                                            | 4, 7, scope                |
| REQ-011: Deliver one supported package contract        | AC-011: Clean installed API/CLI, platform artifacts, native protocol and schema exports pass Windows/Linux and declared runtime/acquisition matrices; unavailable platforms fail clearly without fallback.                                                                    | 9                          |
| REQ-012: Make release and recovery evidence reviewable | AC-012: Exact candidate, cohort, owner, review, security, rights, hosted qualification and release receipts are separate and traceable; rollback/forward repair and historical retention are demonstrated.                                                                    | 8, 9                       |

## Consequential decisions and research gates

### DEC-001 — One incremental semantic read path

**Proposed, supported by the parser experiments.**
Use the maintained Boost.JSON `basic_parser` fragment interface for strict parsing, with exact number-lexeme transport rather than automatic floating-point conversion.
One JSON Quality owned core supplies syntax, decoded fragments, locations and the quality consumers.
Do not dispatch small inputs to today's AST checker and large inputs to a second checker.
Old parsing may remain only as an explicitly independent finite test oracle where useful, not as a production compatibility path.

The [Boost release source](https://www.boost.org/releases/latest/) still identified 1.92.0 when refreshed on 21 October 2026.
The experimental archive identity and build are retained above.
Freeze the latest applicable stable source at incorporation, rerun affected proof for changes, and use public handlers/options only.
A transport wrapper over this authority is a real platform boundary, not a shim for an old API.

### DEC-002 — File-backed values, exact equality and private indexing

**Proposed; storage packaging qualification remains.**
Keep scalar bytes and raw captures in owned files or file segments; index metadata separately.
Identify values by session/document/value identity and representation, with exact byte length and digest.
Digests narrow candidate lookup; equality still compares complete decoded bytes.
Duplicate-name identity is per object, not global across the document.
Normalized-key collision identity is distinct from decoded-name equality.

Prefer the maintained SQLite C API for the private structural/key/diagnostic index, reusing the experiment's proven storage model rather than inventing a database or requiring Python in Node consumers.
SQLite belongs with the shared core, so the Node and Python integrations do not implement competing indexes.
The current [official download](https://www.sqlite.org/download.html) identified 3.54.1; that exact production integration has not been qualified.
Retain source checksums, build configuration and actual distributed terms at the gate.

Do not place a giant key/string in a SQLite column or SQL statement. Its documented [row/BLOB length limits](https://www.sqlite.org/limits.html) would recreate a token ceiling.
Store bounded metadata and external byte ranges; bind parameters; disable extension loading; own cache, journal and temporary-file placement.
Native offset/database limits are reported, not hidden as JSON syntax errors.
The database is disposable private scratch, not a new consumer persistence format or global cache.

### DEC-003 — Value consumption and language bindings

**Proposed.**
The public contract describes sources, events, value references, completion and lifetime independently of JavaScript object materialization.
Node uses the shipped core through a versioned bounded protocol.
Non-Node consumers use the same supported executable protocol; add a Python-facing adapter only for actual repetitive transport work, not another parser, rule engine or storage owner.
A packaged HISEW consumer must not require an undocumented global Node, compiler, or Python package installation.

An object-building convenience API, if retained, is explicitly materializing and separately named/documented; it is never the implementation of the scalable check path.
It can reject an unrepresentable caller request without invalidating a successfully completed streaming check.
Numbers expose original lexemes.
Converting a number to binary64, an integer, a decimal domain or a schema instance is a declared consumer action with native admission rules.

### DEC-004 — Four independent completion claims

**Proposed invariant.**
Distinguish parser completion at exact EOF, selected-quality-rule completion, delivery/diagnostic completion, and downstream domain admission. A structural event or scalar reference is provisional until its document closes. A final quality pass requires complete inventory reconciliation, completed applicable rules, fully delivered/persisted diagnostics and no operational failure.
A syntactically complete but quality-invalid input can have complete rule evidence and a failed quality outcome.

Do not flatten everything to one `valid` Boolean.
A consumer's schema pass cannot excuse a missing parser terminator; a parser terminator cannot imply schema admission.
A terminal result binds document/source/configuration/core identities and the diagnostic stream identity/count.
A missing, duplicate, inconsistent or non-final terminal record is a protocol failure.

### DEC-005 — NFC and normalized-key collisions: feasibility resolved

**Technical proof complete; proposed design awaits acceptance and production qualification. Owner: JSON Quality integration owner with the Unicode/rule reviewer.**
Use ICU **78.3** with Unicode **17.0** and its public `unorm2_getDecomposition`, `unorm2_getCombiningClass`, and `unorm2_composePair` operations.
The [proof report](2026-10-21-nfc-presentation-proof.md) records current stable-release research, actual license texts, competing approaches, exact sources and successful conformance/scale/failure evidence.
ICU 79 was a release candidate; its availability does not justify replacing the stable data/API baseline.

ICU owns processed scalar decomposition, class data, composition exclusions and pair decisions.
JSON Quality owns the residual external-memory orchestration: stable per-class FIFO spools, increasing-class replay, the blocked-composition state and a spooled tail behind a still-changeable starter.
It keeps complete UTF-8 scalars at fragment boundaries and permits native exact-size retry only for one scalar's decomposition.
No pending combining run, normalized value or object-key set is assembled in RAM.

The residual ordering/blocking logic is real custom work and requires review.
Investigation found no demonstrated maintained drop-in that both preserves arbitrary runs exactly and bounds retained memory.
Whole boundary segments and growable iterator buffers retain the original problem; Stream-Safe insertion changes data.
Do not copy private ICU internals, introduce a private Unicode table or normalize chunks independently.
Optional native quick-check optimizations must preserve the same contract and receive affected proof; they are not a second reader.

Write derived NFC bytes only to owned scratch.
For values, compare them exactly with decoded source bytes to decide NFC.
For keys, use that same derived representation for the per-object normalization index; digest/length narrow candidates, and complete bytes establish equality.
Keep decoded duplicates distinct from normalization collisions and preserve current occurrence semantics, including comparison with the latest prior equivalent normalized name where relevant.
Avoid a quadratic all-pairs diagnostic expansion.
The shared derived representation serves both checks under DRY-01.

Apply existing normalization selection and preservation permissions without broadening them.
An exact pointer/record/value pin can suppress only its authorized unnormalized-value finding; it cannot suppress key collisions, other strings, noncharacters or presentation.
Raw encoded bytes, decoded bytes and derived NFC bytes remain distinct identities.
Check-only work never repairs source bytes.

The prototype passed official Unicode 17 relations, random contexts, every scalar, 1/7/65,536-byte boundaries, all 55 present nonzero classes, long leading/ordered/reordered/already-NFC runs, giant escaped collisions, false digest candidates, nested object scope and narrow pins. Both correct and incorrect inputs completed at 128 MiB without proportional retained RAM. Cancellation during spill/replay and resource/input failures were incomplete.
See QA-005 for incorporation obligations.

Budget fixed per-class caches and handles per active worker plus input/output/index state.
Measured long-run intermediate spools approached 4x decoded input before other artifacts; the complete experimental JSON/NFC packet approached 8x raw source. These are measured cases, not universal upper bounds. Production must account for decomposition expansion, journals, events, captures, retained values and diagnostics; use checked offsets and explicit capacity/failure outcomes.
Arbitrary scalar length is not permission for unbounded concurrency or disk consumption.

### DEC-006 — Presentation: feasibility resolved, existing policies retained

**Technical proof complete; proposed design awaits acceptance and production qualification. Owner: JSON Quality integration owner and affected producer owners.**
Retain the six current presentation contracts.
The [proof report](2026-10-21-nfc-presentation-proof.md) contains their exact predicates, accepted/rejected examples, maintained component boundaries, finite/giant experiments and JSONL limits.
The current `check` still includes presentation.
A successful parser or lint stage alone never establishes a full check.

Prettier **3.9.10**, with the existing `json-stringify` options, uses fixed two-space hard-line layout for nonempty containers, inline empty containers and one final LF.
Its strict JSON string/number spellings and member order are preserved; `printWidth` does not introduce a future-content layout decision for this printer.
Therefore the default policy can be checked by bounded trivia observation over strictly validated source bytes.
This is an implementation of the existing contract, not the replacement policy contemplated in revision 1.

Boost remains the sole syntax authority.
The layout observer can retain quote/escape and depth/span state but cannot accept JSON independently.
Require exact parser EOF and the same frozen source identity for raw-span observation or a second pass.
Unexpected source drift, truncation or uncorrelated spans prevents completion.
Keep this responsibility in the shared core, with one policy definition and explicit independent finite oracle tests.

For `producer-json-indent[-body]` and `producer-json-compact[-body]`, compare bounded native canonical output against the source comparison view.
Use public Boost serialization on bounded complete UTF-8 string fragments, with boundary carry and enclosing quotes handled by the core.
Reuse Google **double-conversion 3.4.0** public parsing/`EcmaScriptConverter` for numeric candidates within its documented 25-byte shortest-output bound.
A longer strict numeric token is a completed producer-presentation mismatch, not a syntax failure, input-size rejection or reason to stop consuming.
Nonfinite conversion and negative zero retain native stringify presentation semantics; original lexemes and separate numeric-admission checks are never replaced by this conversion.

Producer equality also requires the shared exact decoded-duplicate predicate and native object-key ordering.
Recognize array-index names in 0..4,294,967,294 with bounded decoded-prefix state; they must precede other names in increasing order.
Non-index names retain source insertion order.
Do not create a second name map or duplicate rule.
The experimental presentation probe explicitly composes an independent duplicate result; production completion must wire the shared rule evidence, not expose its partial `matchesExceptDuplicateKeys` result as a full verdict.

Preserve body handling exactly: comparison-only CRLF-to-LF projection and one final LF added only if absent.
Do not trim extra trailing whitespace or alter source bytes.
`producer-json-body` uses the default layout predicate with that projection.
JSONL uses incremental physical-LF framing and compact-body presentation per admitted record; never materialize a giant line.
Preserve the explicit blank-record and byte-admission semantics in the shared rule contract below; Unicode line-separator characters do not become additional record delimiters.
The existing preserved-bytes admission remains restricted to its authorized native/logical contracts and full non-presentation obligations.

All six contracts matched 1,140 current-package finite comparisons with zero mismatches.
The successful scale/edge matrix includes 128 MiB strings/keys/numbers, 400,000 objects, every Unicode scalar, large escapes/controls, final-LF and CRLF refill boundaries, malformed tails and cancellation during layout replay.
Fourteen original JSONL cases included two giant records.
Their coverage is limited to that corpus: follow-up P-01 exposed blank-classification and byte-admission differences in the retained framer.
The shared predicate has separate exhaustive scalar evidence; corrected production framing, admission precedence and diagnostic integration remain required by QA-006/009/016 and installed-cohort proof.

The explicit formatter relationship is unchanged: source formatting must produce the current default presentation while preserving admitted token meaning; native-value producer formatting follows its declared serializer contract.
Retained materializing writers declare their capability before materialization and do not constrain read/check scale. No new oversized writer is implied. If a future formatter/option/component change alters accepted bytes, reopen this decision with concrete examples and accepted producer migration. Never retain old/new read engines by input size, omit presentation, silently use preserved-bytes, or rewrite historical protected bytes.

### DEC-007 — Explicit resource policy and failure

**Proposed.**
Keep independent capacities for input bytes, work/inventory, depth, temporary storage, time and concurrency where supported, owned by one resource-policy definition projected into API, CLI, schemas and docs.
Omission resolves a declared default; disabling a capacity removes that package policy ceiling.
It does not disable syntax, diagnostics, trust checks, EOF or native limitations.
Record effective value, units, source and any external constraint.
Decide the new wire spelling once; do not retain multiple old spellings as aliases.

Use fixed-size fragments, bounded queues/caches and backpressure. With fixed depth and concurrency, scalar length and record/diagnostic count must not require proportional retained RAM.
Depth state may grow with depth; exact indexes and spool files grow on disk.
No eager array of files, records, findings, object keys or logical documents may defeat this model.
Limits and cancellation are checked during fragments, indexing, normalization, comparison and output, not only between complete documents.
For normalization, include per-class cache/handle reservations, decomposition expansion, bucket/tail spools and derived bytes.
For presentation, include bounded serializer expansion, comparison buffers and any second read of the same frozen source.
Track complete temporary-storage use rather than treating 4x or 8x experimental measurements as a guaranteed ceiling.
Resource failure is incomplete; a rule mismatch still requires complete syntax and diagnostic delivery.

### DEC-008 — Breaking contract migration, immutable history

**Required by requester direction.**
Freeze one new public API/CLI/result/provider/native-protocol cohort after DEC-005/006. Inventory every export and command by meaning. Replace `contentBase64` whole-document transport where it conflicts with the streaming contract; remove obsolete request/result schemas and entrypoints from supported exports.
Do not keep aliases, silent coercions, old-to-new wrappers, dual-version dispatch or aggregate legacy result views.

The exact new schema numbers and public names are design outputs, not numbers to invent in advance.
Reserve versions once against the refreshed baseline.
Unsupported versions fail before effects.
Preserve old schemas and receipts as historical artifacts in their original versions when needed, outside the current runtime contract; a separate authorized archival interpretation is not a reason to add a live compatibility layer.
Regenerate only mutable/new producer outputs.
Never rewrite frozen bytes or hashes to make them resemble the new schema.

### DEC-009 — Native distribution through existing acquisition ownership

**Proposed, pending platform/rights proof.**
Reuse JSON Quality's existing npm integrity, isolated acquisition, source coordinates, generated bootstrap, pack and release evidence.
Use Markdown Quality's native packaging as a donor for principles and concrete controls: [native build evidence](https://github.com/Hadden-Industries/markdown-quality/blob/7765a8227318ddd997daf706bc195e615f9d74e1/docs/native-builds.md) and [verified tool resolution](https://github.com/Hadden-Industries/markdown-quality/blob/7765a8227318ddd997daf706bc195e615f9d74e1/src/native-tool.js).
Its synchronous whole-output capture is unsuitable for this feature and must not be copied.

Ship exact, verified Windows x64 and supported Linux x64 artifacts with explicit OS/libc support. Validate executable, component, protocol and core-package identities before launch. Preserve the existing Node runtime range unless native support evidence requires an explicit baseline change. Git-source and package/archive acquisition must work with lifecycle scripts disabled; do not rely on `prepare`, postinstall downloads, a compiler on the consumer host, or a binary discovered on `PATH`.
Do not claim other OS/architectures silently work through the old JS parser.

### DEC-010 — Keep domain validation with its owner

**Proposed.**
JSON Quality owns shared strict syntax/quality and lossless consumption, not HISEW report schemas, RDF semantics, archive provenance, JavaScript identity protocols or arbitrary JSON Schema streaming. Use existing supported Ajv for JSON Quality control schemas and each consumer's native domain validator for its actual schema/dialect.

Where a consumer schema needs complete objects, it must explicitly adapt its domain representation: bounded control metadata plus verified payload references, or independently valid records plus externally indexed global constraints.
Keep cross-record uniqueness, dependencies, counts, ordering and reference resolution complete.
No unchecked field deletion or ad hoc stream-schema subset.
HISEW's existing store/claim ownership is reused for durable payloads; JSON Quality does not create a new durable blob service.

### DEC-011 — No new oversized write path by accident

**Proposed.**
Formatting and normalization remain explicit transformations with source identity, peer preflight, collision checks and truthful partial-write outcomes.
Shared lexical/semantic facts come from the new reader. Their transformation-specific native tools are not competing read validators. A retained materializing writer must declare its capability before reading all input; its inability to transform a giant value must not restrict the scalable read/check capability or invoke a fallback automatically.
The checker/formatter relationship is resolved at DEC-006: retain the current policy semantics, keep explicit writer ownership/capability separate, and use independent finite producer/formatter oracles to prove their output remains accepted.
Reopen that decision if options or native semantics change; do not add a giant write path as a side effect of implementing the checker.

### DEC-012 — Exact release/cohort evidence and owned recovery

**Proposed.**
Release acceptance concerns an exact core, platform artifact set, contract set and consumer cohort.
It is not established by source tests, a parser prototype, an npm pack, or one hosted green job.
Failure recovery first halts new adoption, preserves original receipts and identifies the owner and changed identities.
Re-pinning the whole prior executable/consumer cohort is possible only where old inputs/contracts remain usable; otherwise use forward repair.
There is no claim of atomic publication across repositories.

## Architectural contracts to freeze

### Sources, raw identity and value references

A source is a trusted capability to open identified bytes, plus origin and ownership metadata.
It is not an arbitrary path supplied by a JSON value.
Paths, archive members, supplied streams and logical members retain distinct provenance.
Hash the exact raw bytes while reading; verify declared lengths/digests at closure and reject source mutation between census, opening, reading and reuse.
If stable rereading cannot be guaranteed, freeze an owned spool before exposing reusable references.
Document the existing limit on concurrent hostile filesystem mutation rather than promising an impossible snapshot.

Represent the original encoded JSON bytes, decoded string UTF-8, original numeric lexeme and any derived normalized identity as different representations.
Each reference names its representation and source relationship.
A decoded string range is not a raw source range.
Keep object/array ancestry as indexed identifiers and decoded path segments, so a giant member name cannot force a giant JSON Pointer in every diagnostic. Provide streamed rendering/lookup when a full pointer is requested; bounded previews are labelled previews.

A borrowed value reference is valid only within its owning open session.
Closing the session invalidates it.
A consumer needing durable data explicitly copies it to its own verified store and receives a newly identified artifact.
No public reference grants arbitrary access to scratch files; no sibling session may resolve it.
Specify opening, iteration, cancellation, closed-reference errors and cleanup completion.
Optional persistent checkpoints need a separately reviewed design; the initial recovery contract is restart from a stable source, not implicit partial-session resumption.

Use exact integer representations for byte offsets, lengths, counts and sequence numbers.
Define a canonical wire form that does not round beyond JavaScript's safe integer range.
Bound each transport frame independently of the total value; fragment payloads rather than base64-encoding an entire document into one JSON message.
Native framing/control messages and their schemas have an owner and version; user content cannot inject control frames.
Event, source and diagnostic streams have explicit correlation, order and closure.

### Quality rules and diagnostic delivery

Freeze a rule-coverage matrix from `src/quality.js`, `src/documents.js`, `src/presentation.js`, JSONL framing and protected expectations before deleting the old checker.
Include fatal UTF-8/BOM policy, strict grammar, decoded duplicate keys, empty/whitespace keys and exact allowed-empty-key pointers, noncharacters, unsafe numeric values, NFC keys/values, normalized-key collisions, presentation and immutable/preserved-value contracts.
Rule IDs may change only with a reviewed semantic mapping and consumer expectation migration.

Use one explicit ECMAScript trim-character predicate for meaningful-key checks and JSONL blank-record classification, as both current authorities use `String.prototype.trim()`.
Its meaning is ECMAScript WhiteSpace plus LineTerminator: ICU's public `u_charType` category `U_SPACE_SEPARATOR`, plus TAB, VT, FF, U+FEFF, LF, CR, U+2028 and U+2029.
Keep Unicode category data in pinned ICU and the language-policy union in one shared rule; do not copy Unicode tables or substitute `u_isUWhiteSpace`, which adds U+0085 and omits U+FEFF.
This predicate classifies decoded content; JSON syntax whitespace remains the grammar's space, TAB, LF and CR, and JSONL record separation remains physical LF.
Blank classification must be incremental across UTF-8/chunk boundaries without retaining an entire line or key.

Preserve source byte admission before publishing final JSONL record findings: fatal UTF-8 anywhere in the source and a BOM at source start have source scope and do not establish admitted record counts.
Choose a stable, identity-bound source admission pass before record processing, or retain provisional record findings in owned bounded storage until source admission closes; charge that pass/storage to the resource policy.
Do not irreversibly publish completed record outcomes that a late byte error invalidates.
After source admission, a later record containing only trim characters (including U+FEFF) is a blank-record finding; a nonblank later record beginning with U+FEFF reaches record byte admission before parsing.
U+FEFF within a quoted value is content, subject to the selected quality rules, not a source BOM.
Freeze the old/new mapping of source versus record scope, precedence, completion and counts with consumer expectations.
New API shapes and rule identities may change; accidental loss of those distinctions is not an approved migration.

For numbers, retain sign, fraction/exponent spelling, negative zero and the complete lexeme.
Exact unsafe-integer checking must classify huge exponents without constructing `BigInt(exponent)`, expanding powers of ten or rounding first.
Use a reviewed streaming decimal classification with bounded metadata and native conversion only where the selected domain actually requires it.
Distinguish syntactic validity, mathematical value, safe-integer interoperability and finite floating-point admission.
Test leading exponent zeros, negative exponents, zero mantissas and fractional spellings of integers, not just huge positive integers.

Diagnostics are an ordered stream or replayable indexed spool, not a growing JavaScript array.
A finding carries a stable rule identity, severity, source/location reference and structured arguments; oversized arguments are value references.
Preserve exact diagnostic multiplicity and order under concurrency.
Any human summary is a presentation view over complete machine evidence.
Display filtering never removes required stored findings or changes the outcome.
Delivery failure, a diagnostic capacity stop or failed spill marks incomplete; it cannot produce exit zero.

Expected-negative evidence remains visible as negative evidence admitted by exact byte identity and exact expected findings.
Migrate expectation metadata using the reviewed old/new semantic mapping; do not regenerate baselines indiscriminately from whatever the new checker emits.
Missing expected findings, additional findings, changed pinned values or unavailable source members fail.
NFC-preservation permissions remain narrow and attributable; matching a hash is not permission to suppress unrelated quality rules.

### Inventory, logical documents and domain consumers

Discovery reconciles Git, the owned-tree walk and declared sources through bounded iteration and external indexes.
Keep tracked files inside declared external boundaries checked, retain independent native census, and detect missing/extra/duplicate source identities before final success.
Temporary sorting or deterministic merging must use bounded memory.
Source filtering cannot silently remove the adapter's required obligations.

Logical documents use the same parser to select a linked string or encoded member by decoded path.
Decode base64 incrementally with strict framing and exact re-encoding/identity checks where the source contract requires them.
Stream the selected content to the same document checker.
Do not decode the entire container or trust a provider's assertion that its census is complete.
Trusted provider code is injected by the caller; documents and configuration cannot supply executable module paths.
Archive extraction remains with the native archive owner, including traversal, decompression and provenance controls.

JSONL framing must handle CRLF splits, the shared ECMAScript blank predicate, source/record byte-admission precedence, incomplete last records, record numbers and a single giant record.
Use the shared rule contract above for these meanings and never infer framing equivalence from presentation acceptance alone.
Define whether an operation stops on its first unrecoverable syntax error or continues at a valid framing boundary; whichever policy is selected, report exactly which records/rules were checked.
Collection-wide domain constraints finish after all relevant records.
Per-record schema success never stands in for global admission.

### DRY decision test and module ownership

These are predicted seams, not required new module names or a second workflow framework.
Name final declarations by their actual domain responsibility and document units, encodings, lifetime, completion, errors and mutation rights at the declaration.
Update architecture docs and supported exports when a seam changes.

| Rule/decision                             | Current and proposed owner                                                                                                                            | Latest consumers and failure/deployment boundary                                                                               | Implementation strategy and drift control                                                                                                                                                           |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strict document parsing and quality facts | Current AST rules; proposed shared native core with maintained parser/Unicode primitives                                                              | API, CLI, physical/logical/native/JSONL paths and future non-Node consumption; core crash invalidates its sessions             | One rule implementation. Bindings only transport/admit contracts. Finite differential oracles are test-only; architecture checks reject production imports of the displaced checker.                |
| Blank decoded content                     | Current `trim()` use in meaningful-key and JSONL rules; proposed shared core predicate backed by public ICU categories and explicit ECMAScript policy | Quality keys and JSONL blank records share the rule; syntax whitespace and physical record boundaries retain distinct meanings | One predicate, independent scalar oracle and framed byte-admission tests. No copied Unicode tables or per-binding variants.                                                                         |
| NFC representation and collision identity | Current JS normalization/AST maps; proposed ICU primitives plus core spool/index ownership                                                            | Key/value checks, per-object collisions and narrow preservation permissions; Unicode data and worker lifetime are explicit     | Derive NFC once for exact value comparison and normalized-key indexing. ICU owns Unicode facts; reviewed core logic owns external ordering/blocking. Pin corpus and data identity together.         |
| Presentation policy                       | Current Prettier/native stringify read checks; proposed shared core observers and maintained scalar serializers                                       | All six physical/logical/native/JSONL policies; source identity, syntax EOF and duplicate evidence govern completion           | One preserved predicate per policy for every size; reuse Boost escaping, double-conversion and the shared exact duplicate result. Keep whole-value oracles test-only and explicit writers separate. |
| Resource resolution                       | `schemas/configuration.schema.json` capacity definitions, `src/limits.js` and existing projections                                                    | Operations, CLI, schemas, core and qualification                                                                               | One canonical definition and checked projections. Core enforces resolved values; bindings do not invent defaults or aliases.                                                                        |
| Scope and native authority                | Inventory/selection/provider modules                                                                                                                  | Repository adapter obligations and caller-owned source boundaries                                                              | Keep owner-specific discovery, share source admission/reconciliation. Do not generalize archive/RDF meaning into JSON Quality.                                                                      |
| Scratch/index/value lifetime              | Proposed core session store                                                                                                                           | Node and Python-facing clients; per-session OS/filesystem ownership                                                            | One implementation and protocol; database/temporary files private. Consumer durable stores remain separate authorities.                                                                             |
| Result and diagnostic semantics           | `src/result.js`, schemas; proposed stream contract                                                                                                    | CLI, JS API, native protocol, tests, release probes and all adapters                                                           | One versioned contract/schema authority with native validator reuse. Human views are projections; no second quality decision.                                                                       |
| Acquisition and installed identity        | Existing installation/acquire/bootstrap owners                                                                                                        | Git/npm/archive consumers and native platform packages                                                                         | Extend installed-payload verification; generated standalone bootstrap remains deliberate deployment duplication with byte-conformance proof, not hand-maintained forks.                             |
| Schema/domain admission                   | Ajv and actual consumer validators                                                                                                                    | Producer/control schemas, HISEW, RDF/archive consumers                                                                         | Keep their supported validators and explicit projections; no shared home-grown dialect subset.                                                                                                      |
| Formatting and repair effects             | Native formatter plus replacement/normalization owners                                                                                                | Explicit writer APIs and producer helpers                                                                                      | Share read facts and preflight; retain transformation-specific ownership. Remove duplicated validation, not distinct native serialization or historical identity rules.                             |

Likely affected existing files are `src/index.js`, `src/commands.js`, `src/cli.js`, `src/documents.js`, `src/json-lines.js`, `src/json-bytes.js`, `src/quality.js`, `src/presentation.js`, `src/result.js`, `src/execution.js`, `src/inventory.js`, `src/logical-documents.js`, `src/native-documents.js`, `src/limits.js`, `src/document-operation.js`, source-formatting/normalization modules, and installation/acquisition modules.
Predict new native source/build, bounded protocol, session-store and conformance-harness modules only after decisions are accepted; avoid creating a general framework around a single feature.

Update affected schemas, resource/runtime projections, `package.json` and native lockfiles through their owning tools, qualification/release scripts, package membership, workflows, `README.md`, `docs/consumer-guide.md`, `docs/centralized-contracts.md`, `docs/architecture.md`, `docs/resource-limits.md`, security/support docs and third-party notices. Extend dependency/affected-test coverage for native source, generated bindings and child-process relations; a passing JavaScript dependency graph cannot prove C++ layering or select all native-impact tests.

## Falsifiable quality scenarios and oracles

The following are proposed acceptance targets for the implementation baseline, not measurements already achieved.
Each scenario records source/candidate/contract identity, environment, resolved capacities, original failure output and owned cleanup.
Fix an observed failure before repeating broad qualification.
A changed host may require a justified baseline update; do not quietly relax a failed threshold.

| Scenario | Stimulus, environment and measurable response                                                                                                                                                                                                                                                                                                                                                                                                                               | Oracle and owner                                                                                                                                                                                                                    |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QA-001   | On each supported OS, check strings at 8/32/128 MiB, giant keys at 1/8/32 MiB and integers/exponents at 1,000/100,000/1,000,000 digits. Run finite rejection and disabled-capacity completion; no materializing path appears.                                                                                                                                                                                                                                               | Exact fixture generator lengths/hashes; independent parser overlap; runtime owner.                                                                                                                                                  |
| QA-002   | Replay valid/invalid Unicode, escapes, delimiters and numbers at 1/7/65,536-byte and seeded random boundaries; outcomes, decoded bytes, locations and raw identity agree. Reject UTF-8 errors, BOM by policy, lone surrogates, comments, trailing tokens and truncation.                                                                                                                                                                                                    | Maintained parser conformance inputs plus independent native byte/finite semantic oracle; parser reviewer.                                                                                                                          |
| QA-003   | Duplicate names with literal/escaped spellings in one object fail; equal names in different objects do not. Force digest collisions and multiple giant names; only complete decoded equality establishes duplicates.                                                                                                                                                                                                                                                        | Independently generated byte pairs, exact external comparison, collision injection below the lookup abstraction; core owner.                                                                                                        |
| QA-004   | Exercise `9007199254740993`, `1e309`, negative zero, integral decimal spellings, enormous positive/negative exponents and exponent zeros. Syntax, exact lexeme, safe-integer rule and consumer admission remain separately correct.                                                                                                                                                                                                                                         | Mathematical classifications and native finite-domain validators on representable overlap; numeric rule reviewer.                                                                                                                   |
| QA-005   | Incorporate the Unicode 17 relations, scalar/random overlap and 8/32/128 MiB ordered/reordered/already-NFC proof. Add production all-class, collision/pin, exact-byte, replay-cancellation, offset and complete storage-fault coverage; no proportional run buffer or source changes.                                                                                                                                                                                       | Revision-2 DEC-005 packet establishes feasibility; official/native/Python/Node oracles and exact generated identities remain independent. Unicode reviewer accepts production ordering/blocking, diagnostics and resource lifetime. |
| QA-006   | Preserve all six policies against current Prettier/native serializer oracles. Incorporate finite/giant strings, keys, numbers, containers, Unicode, LF/CRLF and JSONL proofs; verify shared duplicate integration, source-pass identity, bounded numeric mismatch, final EOF and complete diagnostic delivery. Include P-01 blank classification, source/record BOM precedence and late invalid UTF-8; presentation equality alone is insufficient.                         | Revision-2 DEC-006 packet establishes feasibility with no replacement policy. Producer/presentation owners accept production finite differential, giant expected-byte and malformed/fault results; retain independent oracles.      |
| QA-007   | Produce 1,000/100,000/1,000,000 findings with giant keys/arguments; slow or interrupt the output consumer. Exact count, deterministic order, complete spool and terminal identity agree; dropped output never passes.                                                                                                                                                                                                                                                       | Independently counted fixture events, terminal/readback verifier and sink failure injection; result owner.                                                                                                                          |
| QA-008   | Stop after a syntactically valid prefix, omit/duplicate terminal closure, append an event after closure, truncate a frame or mismatch its sequence/document. Every case fails without publishing complete evidence.                                                                                                                                                                                                                                                         | Protocol state-machine tests with independently authored malformed frames; transport owner.                                                                                                                                         |
| QA-009   | Scale full inventories and JSONL collections from 1,000 to 100,000 records, plus a giant record. Add required missing/extra sources, ignored-generated files, boundary-tracked files and blank/truncated records. Cover VT/FF, non-ASCII trim characters, U+0085, source/later-record U+FEFF and malformed UTF-8 across record/chunk boundaries. Source byte rejection must not publish admitted record counts; admitted counts and scoped findings reconcile exactly.      | Git/native census and independently enumerated fixture inventory; repository adapter owner.                                                                                                                                         |
| QA-010   | Stream giant UTF-8/base64 logical members and native archive members; mutate bytes between census/read, forge provenance or omit a member. Verify exact linkage; wrong or stale identity fails.                                                                                                                                                                                                                                                                             | Source/container hashes and actual trusted provider contracts, real archive tool where applicable; provider owner.                                                                                                                  |
| QA-011   | Validate record metadata with native consumer schemas, then introduce duplicate cross-record IDs, missing dependencies, wrong counts or wrong payload digest. Per-record passes do not hide global failure.                                                                                                                                                                                                                                                                 | Actual supported schema validator plus independent external constraint index; consumer owner.                                                                                                                                       |
| QA-012   | Apply backpressure at every boundary, cancel during parsing, normalization, indexing and output, and inject input/output/disk-full failures. Stop admitting work promptly and close owned children; unrelated processes/files remain unchanged.                                                                                                                                                                                                                             | Real OS/process/filesystem integration with a foreign sentinel. Initial targets: cancellation observed within 250 ms and owned shutdown within 5 s, excluding a documented uninterruptible OS call; supervisor owner.               |
| QA-013   | Close a session with outstanding references, attempt cross-session/reference-path access, crash before cleanup, and rerun recovery. Closed/foreign references fail; only exactly owned scratch is removed; ambiguous ownership is retained and reported.                                                                                                                                                                                                                    | Ownership manifest, OS handles and sentinel hashes; lifecycle owner.                                                                                                                                                                |
| QA-014   | At fixed depth/concurrency, raise scalar size 8 to 128 MiB and record/finding counts by 100x. Measure combined live parent/child RSS and process peaks; target added peak RSS at most 32 MiB for scalar scaling and 64 MiB for collection scaling. Include spool/cache/normalization paths.                                                                                                                                                                                 | Independent external sampler, fixed host and complete machine evidence; performance reviewer. These provisional targets must be accepted or rebaselined with evidence before implementation.                                        |
| QA-015   | Measure wall time, all temporary artifacts including journals/raw/events, open files and cleanup at every scale. For a 4x input step, investigate time or scratch growth over 6x; classify fixed costs, depth and collision effects. Enforce explicit native offset/disk exhaustion failures.                                                                                                                                                                               | External sampler and independent filesystem census, no selective phase accounting; performance/storage owner.                                                                                                                       |
| QA-016   | Run protected and expected-negative corpora, NFC pins, explicit format/normalize and partial-write interruption. Checking leaves byte hashes unchanged; expected findings remain visible; writer changes preserve admitted meaning and report completed/unprocessed paths accurately. Migrate expected findings for P-01 through reviewed source/record scope and precedence, including U+FEFF in strings/keys, without deriving expectations blindly from the new checker. | Existing retained-identity/replacement/NFC tests and Momoa token-meaning oracle, independently validated expected-finding migration; writer owner.                                                                                  |
| QA-017   | Every current consumer runs its real complete adapter and its API/CLI/protocol/schema probes against the exact new package. Search confirms no obsolete calls, flags, schema projections or old production checker remain.                                                                                                                                                                                                                                                  | Refreshed static census plus runtime/cohort receipts; integration owner and each repository owner.                                                                                                                                  |
| QA-018   | Install clean transported artifacts with lifecycle scripts disabled across supported Windows/Linux and Node minima/current-family matrix. Missing/tampered/wrong-platform/core-version binaries fail; no network/compiler/PATH fallback. Exercise non-Node protocol independently.                                                                                                                                                                                          | Existing acquisition/integrity/runtime qualification expanded for native artifacts; packaging owner.                                                                                                                                |
| QA-019   | Fuzz native parser/protocol/index boundaries and run supported sanitizers on malformed/untrusted inputs. Test path traversal, symlink/reference substitution, control injection, crashes and hostile cardinality/collision workloads. No corruption, authority escape or success after failure.                                                                                                                                                                             | Native security reviewer with independently minimized corpus and declared coverage; zero unresolved high-impact findings at release.                                                                                                |
| QA-020   | Stage a cohort, interrupt adoption, then exercise allowed rollback and forward repair without rewriting historical receipts. Verify version rejection, retained evidence and exact prior/new artifact identities.                                                                                                                                                                                                                                                           | Release/recovery rehearsals through current native tooling; release observer.                                                                                                                                                       |

Do not mock the parser, Unicode implementation, schema validator, npm integrity or filesystem equality in their acceptance tests.
Genuine external boundaries may be substituted for focused tests: a failing byte supplier, blocked output sink, registry availability, clock or process fault injector.
Real native/OS/package tests must then cover the associated boundary.
Existing `tests/json-token-meaning.js` supplies an independent finite semantic oracle; preserving an obsolete production checker solely to satisfy snapshots would defeat the design.

## Vertical delivery slices and traceability

The integration owner is the JSON Quality maintainer appointed at baseline acceptance; the requester owns scope and consequential policy decisions.
Each affected repository appoints its consumer owner.
Roles below are assignments to establish, not invented approvals.
Slices produce observable complete paths and evidence; intermediate parser-only work must not be released as issue #3 completion.

| Slice     | REQ / AC / QA / DEC links                                                                                                                                                                                                                        | End-to-end increment and falsifiable proof                                                                                                                                                                                                                                                                       | Dependency, release and cleanup implication                                                                                                                                                                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SLICE-001 | REQ-002/003/008/009/012; AC-002/003/008/009/012; QA-005/006/017/018; DEC-001/002/005/006/008/009                                                                                                                                                 | Freeze the actual rule/consumer inventory; review and accept the revision-2 NFC/presentation mechanisms, residual custom work and measured resource costs. Complete native storage/platform investigation and record exact versions/rights, contract examples and R2 route. Deliver an accepted decision packet. | First. NFC/presentation feasibility is resolved; do not repeat the search without a material trigger. Requester/named owners still accept design and protected selection/rights/platform obligations. Preserve compact proof and owned large fixtures; no implicit implementation approval.                                |
| SLICE-002 | REQ-001/002/004/005/007/009; AC-001/002/004/005/007/009; QA-001/002/003/004/008/012/013; DEC-001/002/003/004/007                                                                                                                                 | Through a private candidate API and executable, open one source, parse strict fragments, preserve raw/decoded identity, inspect a giant value reference, establish EOF, then close and prove cleanup. Include duplicates and numeric lexeme/admission distinctions.                                              | Requires accepted affected decisions from SLICE-001. New protocol is tested end to end, with no old-path fallback. Candidate-only; no quality-pass claim yet.                                                                                                                                                              |
| SLICE-003 | REQ-002/003/004/005/010; AC-002/003/004/005/010; QA-004/005/006/007/014/015/016; DEC-004/005/006/007/011                                                                                                                                         | Complete one physical document's full selected quality contract, from source bytes through NFC/collision/presentation checks and streamed diagnostics to a verified final result. Retire displaced document-rule implementations after independent overlap proof.                                                | Requires SLICE-002 and accepted DEC-005/006 designs from the completed proof. Integrate ICU spool orchestration, one normalization index, policy observers/native scalar conversion, shared duplicate evidence and completion. Demonstrate giant valid/invalid full checks and preserved pins; no incomplete-rule release. |
| SLICE-004 | REQ-001/003/004/006/007; AC-001/003/004/006/007; QA-007/009/010/012/013/014/015; DEC-002/004/007/010                                                                                                                                             | Check a real repository fixture through complete physical/native/logical/JSONL census, oversized member consumption and deterministic multi-document results. Reconcile all counts and independent native closure.                                                                                               | Builds on SLICE-003; providers use the frozen source contract. Faults after many records still fail. Only owned spill/census artifacts are cleaned.                                                                                                                                                                        |
| SLICE-005 | REQ-005/008/010; AC-005/008/010; QA-008/011/016/017; DEC-003/004/008/010/011                                                                                                                                                                     | Expose the accepted API/CLI/schema and non-Node protocol, migrate JSON Quality's own probes/commands, exercise native consumer-schema plus global constraints, and update explicit writer callers. Remove obsolete exports, transport envelopes, flags and runtime compatibility branches.                       | Requires complete checker/census contracts. Actual HISEW product adoption stays in #187. New installed contract rejects old versions; old evidence remains unchanged.                                                                                                                                                      |
| SLICE-006 | REQ-004/007/009/011/012; AC-004/007/009/011/012; QA-012/013/014/015/018/019; DEC-001/002/003/007/009/012                                                                                                                                         | Build and verify exact platform artifacts, then install and run a giant full check through clean API/CLI/non-Node consumers on Windows/Linux. Exercise native failure, cancellation, sanitizers and archive/integrity rejection.                                                                                 | Packaging design starts at SLICE-001; qualification requires SLICE-005. Do not copy the donor's whole-output capture. Candidate artifacts retained; no implicit publish/install on user machines.                                                                                                                          |
| SLICE-007 | REQ-006/008/010/011/012; AC-006/008/010/011/012; QA-009/010/016/017/018; DEC-006/008/009/010/011                                                                                                                                                 | Migrate all four external consumers as a coherent exact-candidate cohort, including APIs, providers, expectations, producers, locks, bootstraps, docs, native census and CI/release readers. Demonstrate the real complete command in each.                                                                      | Contract freeze and available qualified artifacts from SLICE-005/006. Repository edits may be independently prepared after the shared contract freezes. Keep coordinated delivery state; no cross-repository atomicity claim.                                                                                              |
| SLICE-008 | REQ-001/002/003/004/005/006/007/008/009/010/011/012; AC-001/002/003/004/005/006/007/008/009/010/011/012; QA-001/002/003/004/005/006/007/008/009/010/011/012/013/014/015/016/017/018/019/020; DEC-001/002/003/004/005/006/007/008/009/010/011/012 | Freeze the final producer/artifact/cohort identity, complete focused independent review and route-selected native security/verification/release-readiness evidence, rehearse recovery, then hand off explicit publication/adoption decisions.                                                                    | All earlier slices. Separate source completion, package qualification, hosted qualification, consumer adoption and release acceptance. Retain required evidence and clean only owned eligible scratch after all references release it.                                                                                     |

Integration order is SLICE-001, then the single-document path, complete checking, census, public/self-consumption, platform qualification, consumer cohort, and final acceptance. Cross-platform build investigation, independent oracle preparation and static consumer inventories can proceed separately after their inputs are frozen. Do not parallelize competing edits to protocol, rule semantics or resource defaults, and do not launch extra agents/review services without the applicable authority.

## Consumer migration and removal checklist

For each row of the consumer table, retain an old/new semantic mapping and exact source/package/lock/runtime identities.
Inventory more than imports: CLI flags, output readers, expected rule IDs, request/result schemas, native/logical provider shape, direct formatter calls, source identity annotations, required CI jobs, acquisition bootstrap bytes and packaged/release membership all participate.

Migrate caller intent directly to the new contract.
A repository adapter may still fix its root, supply its trusted native sources and invoke JSON Quality; it may not translate an obsolete JSON Quality API or reconstruct a whole legacy result to avoid updating a caller.
Replace consumer result-array assumptions with iteration and validated final summaries.
Replace whole-document base64 providers with authorized streamed sources.
Update exact expected-negative metadata by reviewed rule meaning while preserving original fixture bytes.

Where producers call `formatJsonSource`/`formatJsonValue`, distinguish source-meaning preservation from native serialization of an already admitted value. Keep only interfaces with a real distinct responsibility. Coordinate the accepted presentation policy and generated schemas/reports; never repair presentation by converting exact number lexemes through binary64.
Reusable workflow users and qualification CLI consumers migrate with ordinary library callers.
Verify that control-plane schemas/metadata remain within their declared domains without imposing their limits on document payloads.

Remove obsolete public exports and flags, duplicate AST quality rules, old document/result envelope readers, compatibility tests, unreachable package dependencies and contradictory docs in the same candidate that finishes migration.
Retain ESLint where the JavaScript identity rule needs it, native Ajv where control schemas need it, and finite independent test oracles where they add evidence.
A dependency's old use disappearing does not prove it is unused everywhere; confirm the final dependency graph and transported package membership.

Consumer delivery is staged: freeze the new candidate and migration instructions, prepare exact-pin consumer changes, qualify the full cohort, then perform only authorized repository/publication effects in the agreed order. An unconverted consumer stays pinned to its complete old package; the new package does not impersonate the old API. Report such an outstanding consumer as incomplete migration, not a reason to add a shim or to claim AC-008 passed. Refresh the remote/available-repository census before claiming all current consumers are covered.

## Security, rights, observability and operations

This proposed R2 change adds native processing of untrusted bytes, temporary storage and process communication, and changes cross-repository contracts.
The implementation owner must obtain the accepted route and appoint an independent native security reviewer; current source tests or a generic JavaScript scan do not discharge native C++/protocol coverage. Under SEC-01, use the designated host's native security workflow when available and approved, with the actual repository security policy and exact candidate; a general-purpose review is not its substitute. Threat analysis covers malformed input, memory/CPU/disk exhaustion, hash-collision workloads, integer overflow, reference/path substitution, output/control injection, platform artifact substitution and foreign-session cleanup.
Keep external schema retrieval and executable loading from document content disabled.

Each session has an owned private directory and ownership record; any process containment is tied to its exact child/descendants. Do not kill by executable name or shared PID discovery, delete a common temp root, scavenge foreign sessions, or remove a locked/ambiguous resource.
Use the native supervisor and explicit cancellation propagation; a forced stop records incomplete consumption.
Handle crashes without automatically trusting partially written manifests.
Retained raw evidence may contain sensitive data: no telemetry of payloads, minimal diagnostic previews, no network service, and explicit permissions/retention on Windows and Linux.

Read-only operations leave source bytes untouched, but may need owned temporary scratch.
Document this distinction and the scratch destination/resource policy.
Before acknowledging success, close required output and establish that its complete evidence is readable.
Reporting a successful quality pass while later losing the diagnostic spool is not acceptable.
Keep cleanup errors visible separately; success semantics must specify whether required retained evidence survived.

The rights gate records each exact source/binary/runtime/data component, source revision, digest, terms actually read, intended local/redistributed use and notice/source obligations. Boost's experimental BSL-1.0 inspection supports the experiment, not the complete new shipped closure. SQLite's [official dedication](https://www.sqlite.org/copyright.html) distinguishes deliverable source from build scripts; inspect the exact selected bundle rather than treating the project label as a complete artifact audit.
The proof packet pins ICU 78.3/Unicode 17 and double-conversion 3.4.0 and retains the actual license texts inspected for local experiments. Production must assess the exact shipped ICU data/libraries, double-conversion notices, Boost/SQLite and compiler runtime closure, including source and attribution obligations; local proof is not distribution clearance.
Preserve JSON Quality's AGPL-3.0-only license and upstream terms; no blanket relicensing or invented clearance.

Before incorporation, refresh the latest stable/applicable LTS identity and supported APIs for each newly selected component. Existing package pins are source facts, not proof of latest release. Avoid unrelated updates, but record and resolve a materially superseded selected target rather than choosing an older version because local tools are absent. Native build tools/versions and target flags belong to a frozen build manifest; consumer runtime qualification and build-host availability are separate evidence.
No license/terms gate is fulfilled merely by this plan.

Observe, without payload leakage: source/core/protocol/configuration identities; resolved capacities; raw/decoded/diagnostic bytes; documents/records/findings counted and reconciled; rule and delivery completion; peak live parent/child memory; duration; scratch peak and final retained bytes; open handles; queue pressure; cancellation observation/termination latency; cleanup status; and any native/platform constraint.
These answer whether the whole operation completed, where its resources went, whether a consumer received the result, and whether recovery can safely act.
They are not a new monitoring service.

## HISEW dev.29 conformity checks

| Principle                 | Concrete review requirement in this change                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NAM-01 and DOC-01         | Review every added/changed name, including retained names whose responsibility changes, at declarations and use sites. Record the single concept it denotes, competing names, precise units/representation and any misleading old meaning. Modules, types and public/non-obvious functions document their contracts; non-obvious choices document their reason. Correct stale comments as defects. |
| NSH-01                    | No prior no-shim override is being invoked. The requester explicitly prioritizes no shims over current API continuity. Review the final package and consumers for aliases, dual-version dispatch, legacy projections and second runtime implementations. Genuine platform/domain adapters must have distinct responsibilities.                                                                     |
| PRP-01 and OUT-01         | Accept the proposed R2 route against actual native/trust/availability impact; do not import an older plan's R1 acceptance. Each slice links to the higher outcome and falsifiable proof. Plan-only verification stays proportionate; product release needs its own evidence.                                                                                                                       |
| REU-01, VER-01 and LIC-01 | Reuse the completed parser/NFC/presentation research and donor evidence; review the precisely bounded custom orchestration before incorporation. Resolve remaining native-storage/platform evidence, refresh material component changes and inspect actual distribution terms. A prototype is neither a protected software-selection receipt nor distribution approval.                            |
| DRY-01                    | Apply the authority/consumer/deployment/failure decision table above; review semantic rule ownership, not merely repeated text. Generated bootstrap duplication retains its existing conformance control. No language binding or consumer owns a forked quality engine.                                                                                                                            |
| VAL-01                    | Use supported native argument/schema/parser/domain validators at their real input boundaries. Do not pre-implement another JSON Schema dialect, accept an invalid producer report by cleaning it silently, or run a destructive consumer as a pretend validator.                                                                                                                                   |
| SEC-01 and CMD-01         | Bind approved native security review to the actual changed native and protocol paths. Preserve native destructive-command protection for covered shell actions; a guard rejection requires diagnosis and an allowed route, never a syntax workaround. This plan requires no destructive shell action.                                                                                              |
| CLEAN-01                  | Record task-owned working artifacts, active reference consumers, durable evidence and removal triggers. Clean only eligible owned material at its checkpoint; preserve historical and ambiguous artifacts and all other executions.                                                                                                                                                                |

The future owner must bind the exact accepted research bytes, current source/terms, checked-at/valid-until conditions and applicable qualification proof to HISEW's existing software-selection evidence mechanism when that protected obligation applies.
A Markdown link or manually asserted pass is not the assessment receipt.
This plan has not selected a procedure execution or fulfilled that obligation on another execution's behalf.

## Verification, checkpoints and acceptance

During implementation, use focused tests around each changed boundary, then affected regression selection where its graph is complete.
Native source, protocol, tooling, resource or unrecognized dependency changes must select the full relevant suites instead of trusting an incomplete JavaScript-only graph.
Expand existing tests for byte admission, JSONL, NFC preservation, expectations, identity, source presentation, logical/native documents, resources, replacement, contracts, CLI, installation, consumer CI, packing and release contracts. Add genuinely independent large-input/resource/protocol tests; avoid tests that merely restate implementation structure.

The repository currently exposes `npm run check:node`, `npm run check:resources`, `npm run check:architecture`, `npm run check:release`, `npm test`, `npm run lint`, `npm run format:check`, `npm run qualify:package`, and `npm run check:json` through `npm run check:full`.
Preserve or deliberately update their ownership; add native compilation/conformance/sanitizer/packaged-protocol coverage to the verification graph. Current hosted qualification retains Windows/Linux and the supported Node consumer matrix.
Refresh exact workflow/job names and profiles at candidate freeze; do not invent passing receipts for proposed commands.

Implementation checkpoints:

1. **Accepted design checkpoint:** review and accept the completed DEC-005/006 proof and its residual custom logic; close remaining storage/platform/rights/contract gates, appoint owners, accept route and requirements, and retain the exact plan/research identities.
   A closed technical feasibility question does not imply this acceptance checkpoint has occurred.
   Commit the accepted plan only when repository delivery is authorized.
   This planning request itself creates no commit.
2. **Integrated source checkpoint:** review the complete meaningful change, including removal and consumer mappings.
   Before every authorized commit, format and lint every file in that exact commit scope, including Markdown, and check exit codes.
   Record focused and remaining verification honestly.
3. **Transported candidate checkpoint:** full package qualification requires clean committed source.
   Bind a clean producer candidate, platform artifacts and lockfiles, then run the exact transported API/CLI/schema/non-Node and consumer matrices.
   Do not run clean-source qualification against uncommitted bytes and label it equivalent.
4. **Final acceptance checkpoint:** complete route-selected independent code/security review, resolve validated findings, reuse still-matching evidence, and rerun only affected/required checks.
   Supply release-readiness and recovery evidence separately from publication or installation.
   An unresolved material failure or incomplete consumer is reported, not waived by a green subset.

The requested proof work used isolated native experiments and independent finite oracles outside the repositories.
Final document validation covers Markdown format/lint/link and traceability on this plan, its companion proof report and the review-attempt/disposition record.
The requested Claude attempt timed out without a report; external review remains incomplete.
No product suite, hosted run, completed provider review or package release is implied by saving these documents.

## Rollout, abort and recovery

The appointed release observer owns the cohort ledger and watches the first real complete checks of every migrated consumer.
Each receipt binds source/payload hashes, core/platform/protocol/schema versions, complete inventory, effective policy and final outcomes.
Source implementation, local tests, hosted qualification, package availability, consumer adoption and HISEW integration remain separate columns with their own acceptance evidence.

Abort adoption for false success, changed source meaning/identity, missing rules or findings, unowned deletion/termination, uncontrolled memory/disk growth, unresolved native security/rights gaps, or a consumer requiring an undocumented runtime.
Pause the affected delivery step, retain original failed evidence and candidate identities, and diagnose against the corresponding unchanged baseline.
Do not hide failures by enabling the old parser, dropping a quality rule, reducing census scope or increasing a limit automatically.

The recovery decision is concrete: repin the full previous package/native-artifact/consumer cohort only if its contracts can still read required mutable inputs and no irreversible downstream effect makes that unsafe.
Do not mix old adapters with new schema/core packages. If newly produced references/contracts cannot be consumed by the old cohort, preserve them under their producing identity and forward-fix the affected reader/producer.
Regenerate only reproducible mutable outputs through their owner, with new identities.
Frozen evidence and historical digests are never backfilled in place.

Cancellation/crash recovery starts a new session from a stable source and explicitly marks the previous attempt incomplete.
It does not claim to resume validation from an arbitrary byte offset.
Cleanup waits until consumers release borrowed references and required evidence has been retained.
Use the exact ownership manifest and resolved session path; retain and report ambiguous or still-in-use material.
Large experimental fixtures, compiler downloads and earlier review artifacts are not eligible for cleanup simply because this plan is complete.

## Stop conditions and reassessment

| Open decision or trigger                                                                                             | Accountable owner                                | Minimum evidence needed to continue                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ICU/API/data changes or production behavior contradicts the proven external-memory NFC mechanism                     | Integration owner and Unicode reviewer           | Reopen DEC-005 with the failing candidate and retained revision-2 proof; diagnose ordering/blocking, native changes and resource ownership. Require affected conformance/scale evidence before resuming, without losing existing findings. |
| A formatter option/native scalar behavior changes, or production presentation disagrees with the preserved contract  | Integration owner, requester and producer owners | Reopen DEC-006 with exact counterexamples and independent oracle/source identity. Fix the implementation or obtain a concrete accepted policy/producer change. No silent whole-value fallback, omission or API-authority waiver.           |
| Native storage, transport, bindings or acquisition cannot meet an existing supported platform/runtime                | Packaging and consumer owners                    | Exact current component/source/rights identity, clean installed proof or an explicitly accepted support change. No older-version or runtime fallback by convenience.                                                                       |
| Existing schema needs unbounded materialization or a global constraint was omitted                                   | Actual domain/schema owner                       | Native-validator-compatible representation/projection plus complete global-constraint and payload-identity proof. Do not move schema ownership into a generic private validator.                                                           |
| Rule outcomes, Unicode data version or expected findings differ on overlap                                           | Rule reviewer and corpus/producer owner          | Independent diagnosis, semantic decision and reviewed expectation migration; preserve original negative fixtures and failed evidence.                                                                                                      |
| Another current consumer, parallel checkout change or active ownership conflict is discovered                        | Integration owner and repository owner           | Refreshed census/baseline and safe integration order; preserve foreign work and do not adopt its execution implicitly.                                                                                                                     |
| Measured growth violates the model, cancellation misses its accepted bounds or exact comparison becomes pathological | Performance/security owners                      | Complete end-to-end resource evidence and a revised mechanism/accepted capacity model. Do not characterize an isolated parser measurement as product success.                                                                              |
| Upstream release, API, license, build dependency, protected route or source baseline materially changes              | Selection/rights/integration owners              | Refreshed applicable research, actual terms, affected proofs and re-baselined candidate. Prior review does not automatically apply.                                                                                                        |

The higher outcome is dependable shared JSON interpretation and quality across the portfolio.
The principal costs are native distribution, disk I/O, scratch amplification, normalization/presentation complexity and coordinated consumer migration.
Reassess the design if those costs exceed the demonstrated need, but do not meet the goal by reducing meaning, hiding incompleteness or adding compatibility layers the requester explicitly rejected.
