# DRY principle remediation implementation plan

Date: 16 October 2026.
Repository baseline: `d4a9bb16de304cf58a14cc9875cb0a17d48aed96` on `main`.
Decision owner: repository owner; integration owner: the implementing agent in this chat.
Authority: the owner requested implementation of a DRY plan for this repository, following the work in the other local repositories.
The existing chat authorization covers required configuration, signed commits and direct source delivery to main.
No package release, deployment or downstream adoption is included.

## Outcome and audit evidence

Give shared rules one current owner so a maintenance change reaches every applicable consumer without synchronizing parallel definitions.
Preserve the public exports, configuration schema 1, result schema 3, diagnostic identities, JSON semantics, runtime support, native acquisition and guarded write guarantees.
Success is ownership and consumer conformance, not a clone percentage or a promise that all similar text should disappear.

Read-only inspection covered the tracked file inventory, runtime/tooling declarations, schema constraints, tests, documentation and CI.
A native Espree token inspection parsed all 52 JavaScript files among 71 tracked files and indexed 595 functions/callbacks.
There were no normalized whole-function clone candidates at the selected threshold of 55 tokens; this does not establish absence of duplicated policy or smaller fragments.
Semantic inspection identified the seven bounded groups below.
No new scanner, utility dependency, cross-repository framework or operational service is required.

The precedents inspected locally were Markdown Quality's `2026-10-13-dry-principle-remediation-implementation-plan.md` and `centralized-contracts.md`, OwlAPI's `dry-principle-remediation.md`, and WebVOWL's `2026-10-12-dry-principle-remediation-implementation-plan.md`.
Their common decision rule is adopted: consolidate shared meaning and change responsibility, and explicitly retain independently owned contracts, mutable state and test oracles.
These plans supply design precedent, not verification or authority over this repository.
Existing internal modules, native Node, Ajv, ESLint and Prettier remain the selected capabilities; dependency versions and AGPL-3.0-only licensing remain unchanged.

## Risk route

Risk class: R2.
Decision owner: repository owner through the requested implementation and retained delivery authorization.
Reasoning: behavior-preserving refactoring touches public result production, presentation and path admission; an incorrect extraction could weaken write or input checks.
Potential blast radius: installed CLI/API/plugin/schema consumers on supported Windows/Linux runtimes and local qualification tooling.
Reversibility: signed source forward repair or revert with applicable proof; no persistent-data migration or deployed service change.
Principal unknowns: native Prettier debug-check configuration behavior, fixture cleanup assumptions and packaged inclusion of extracted modules/data.
Required artifacts: this plan at the first signed checkpoint, native requirement snapshot/route, ownership guide and retained verification/review/handoff evidence.
Required specialist lenses: ordinary correctness/DRY review, independent execution, and frozen security diff assessment for changed path/input admission.
Required verification: focused preservation/characterization, full HISEW profile, independent final execution and existing complete Windows/Linux consumer CI at the delivered head.
Required human approvals: reuse the explicit implementation and source-delivery authority; new public behavior, dependency changes, control changes or out-of-scope effects need a separate decision.
Maximum sensible autonomy: implement the seven bounded remediations, preserve unrelated work, and continue signed source delivery and hosted closure without phase prompts.
Next lifecycle step: protect the plan, capture the native requirement snapshot and start a new owned R2 execution; the completed Node task is not adopted or rerouted.

## Requirements and quality scenarios

| Requirement                                               | Acceptance criterion                                                                                                                                                                  | Quality scenario                                                                                                                                                                                        |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-001: Consolidate result construction knowledge        | AC-001: both success and operational-error paths derive version and fresh write-accounting keys from result schema ownership                                                          | QA-001: ordinary and error CLI/API results retain schema version 3 and independent write arrays; one operation cannot contaminate another                                                               |
| REQ-002: Consolidate empty-key policy shape               | AC-002: ESLint option validation reuses the existing configuration schema's empty-key-pointer constraint                                                                              | QA-002: both entry paths accept escaped empty-key pointers and reject malformed or duplicate entries without relaxing semantic lint                                                                     |
| REQ-003: Consolidate presentation knowledge               | AC-003: one JSONL presentation admission rule serves policy resolution and direct JSONL analysis; formatting and native debug-check use one options authority                         | QA-003: all existing producer formats, JSONL rejection/defaults, fatal UTF-8/BOM checks and exact token-preserving formatting remain; conflicting consumer formatter configuration cannot change output |
| REQ-004: Consolidate compatible containment policy        | AC-004: regular-source admission and external pack destination admission use one lexical containment predicate while retaining realpath and destination-specific enforcement          | QA-004: equality, descendants, sibling prefixes and parent traversal retain their decisions on Windows/Linux; symlink and special-file failures remain enforced before effects                          |
| REQ-005: Consolidate invalid-byte diagnostic construction | AC-005: document and JSONL byte failures share diagnostic identity/location construction; JSONL retains unknown record count                                                          | QA-005: malformed UTF-8 and BOM vectors yield the same independent exact expected findings; JSONL never reports zero records for undecodable input                                                      |
| REQ-006: Share neutral fixture setup only                 | AC-006: applicable Git fixtures share allocation/init/cleanup mechanics while their policy, identity and outcome expectations remain test-owned                                       | QA-006: fresh repositories are independent, cleanup targets only their owned temporary roots and existing native/logical/write regression expectations remain unchanged                                 |
| REQ-007: Codify intentional separation and deliver        | AC-007: an ownership guide names current authorities, consumers, deliberate distinctions and reassessment triggers; full/review/independent/hosted evidence binds the final candidate | QA-007: unchanged historical evidence is not relabeled; missing runtime lanes or failed admission cannot become a reduced green result                                                                  |

## Ownership decisions

Locations below describe observed owners and predicted seams; exact implementation may use a narrower coherent interface while retaining these decisions.

| Finding | Current repeated knowledge and consumers                                                                                     | Strategy and intended owner                                                                                                                                | Proof                                                                                                       |
| ------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| DRY-001 | `schemaVersion: 3` and empty writes in `src/execution.js` and `src/cli.js` independently repeat `schemas/result.schema.json` | Derive version and fresh accounting construction in existing `src/result.js`; schema remains the contract authority                                        | Existing result/CLI regressions and independent mutation/isolation assertions                               |
| DRY-002 | `EMPTY_KEY_POINTERS` in `src/quality.js` duplicates the `allowEmptyKeys` schema                                              | Reuse that closed existing schema fragment for native ESLint validation; do not alter the accepted schema                                                  | Schema and native ESLint admission vectors                                                                  |
| DRY-003 | JSONL format default/admission repeated in `jsonContract` and `checkJsonLines`                                               | One presentation rule, enforced at both entry paths; likely `src/presentation.js`                                                                          | Existing JSONL/policy rejection and default vectors                                                         |
| DRY-004 | Formatter options in `jsonFormatOptions` independently repeated as native debug-check CLI values                             | One package-owned options source, consumed by API formatting/checking and explicit native CLI configuration; likely a packed presentation module/data file | Real Prettier execution, token-preservation checks, hostile consumer configuration and pack/installed proof |
| DRY-005 | Lexical containment is independently implemented in regular-source checks and producer pack destination checks               | Small pure predicate in existing `src/paths.js`; callers retain realpath, regularity and opposite inclusion/exclusion decisions                            | Independent path table plus existing path/pack negative cases                                               |
| DRY-006 | Identical invalid-byte finding envelope in document and JSONL analysis                                                       | Document analysis owns construction; JSONL adds its framing-specific `recordCount: null`; fatal decoding remains one reusable native capability            | Exact byte-failure outputs across both interfaces                                                           |
| DRY-007 | Repeated temporary Git initialization and cleanup across execution/native/source-presentation fixtures                       | Test-owned neutral repository helper; source policy and all expected decisions stay in their original tests                                                | Existing full fixture consumers, parallel isolation and actual filesystem cleanup                           |

Moving byte decoding/presentation to coherent dependency modules may be needed to avoid cycles.
The root package keeps its existing export names and signatures; internal imports move to their current owner rather than adding old-path aliases or compatibility shims.
Public result validation continues to perform its own trust enforcement even when it uses shared pure facts.
No controls, versions, limits or semantic oracles are changed to manufacture a passing refactor.

## Deliberate distinctions

- Configuration and result schemas are separate public contracts; JSON syntax and Ajv remain their native authorities. Do not create a universal schema or merge validators that admit different records.
- CLI commands and semantic result operations have different meanings and mappings. Existing commands own user interaction; result schema owns serialized operations. Existing conformance checks preserve their relationship.
- Physical, logical, native and expected-negative input identities have distinct provenance and enforcement. Share pure rules only where their complete contracts align; do not merge source authority, snapshots, budgets or per-operation mutable state.
- SHA-256 calls across different evidence protocols reuse native crypto already. Identical one-line syntax alone does not justify a generic identity framework or algorithm migration.
- Copied `src/acquire.js` must remain standalone in a cold consumer. Its temporary workspace cleanup includes a specific prefix and realpath gate; it cannot import producer-private helpers. Preserve it and its byte-conformance/bootstrap tests.
- Affected-test snapshot path admission, policy globs, literal repository paths and native archive members have distinct caller contracts. Do not broaden one to accept the others or silently tighten the snapshot protocol under this refactor.
- Exact source/lock admission remains independent from the qualification probe's expected producer identity. Preserve exact HTTPS/SSH allowlisting and independently expected full commits.
- Existing runtime policy projections are already checked from one authority. Preserve the producer/consumer split, reference/latest/minimum lanes and final completeness gate.
- Expected diagnostics, retained vectors, fixture bytes and historical plans/evidence remain independent. Test setup may be shared; expected decisions are not generated from the implementation under test.

Repository maintainers own these decisions.
Reassess when meanings or release/failure boundaries converge, a new consumer requires different semantics, an authority is duplicated again, or existing conformance checks expose drift.
An arbitrary copy count is not a removal criterion.

## Vertical slices and evidence

| Slice     | Traceability                       | Observable increment and predicted seams                                                                                              | Proof                                                                                                                            | Release and cleanup implication                                                                           |
| --------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| SLICE-001 | REQ/AC/QA-001/002; DRY-001/002     | Schema-owned result construction and empty-key admission across CLI/API/ESLint                                                        | Focused result, command and native lint/schema cases; independent expected values                                                | No schema/version change; source revert remains bounded                                                   |
| SLICE-002 | REQ/AC/QA-003/005; DRY-003/004/006 | One presentation/decoding seam and shared invalid-byte construction exercised through document, JSONL and actual formatter interfaces | Existing byte/format/JSONL/preservation vectors; real native debug-check under conflicting consumer config                       | Extracted code/data must be included in immutable archive; preserve unsupported-input failures            |
| SLICE-003 | REQ/AC/QA-004/006/007; DRY-005/007 | Compatible path consumers, neutral fixture mechanics and maintained ownership guide                                                   | Path/pack negative cases, existing native/execution fixtures, full HISEW proof and final independent/review/security assessments | Exact signed source delivery, all14 consumer lanes and CodeQL; resource reconciliation and native handoff |

One integration owner writes all coupled source changes.
No parallel write agent or speculative framework is selected.
Use native configured ordinary/security providers after the consolidated candidate; independent verification is read-only and cannot replace the implementer's native receipt.
Repairs receive affected checks and narrow review; unchanged evidence retains its actual identity.

## Execution, qualification and recovery

Use preservation/characterization for already-correct behavior, retaining meaningful passing tests rather than manufacturing failures.
New regression assertions use accepted fixtures or independent exact expectations and the real exported/module interfaces.
Mock only external boundaries where necessary; native filesystem/Git/npm/cache/tar/Prettier qualification remains real.
No new test merely mirrors a helper's code or derives expected outcomes from its source.

Complete formatting, cheap lint/drift checks, staging and authorized signed implementation commits before the canonical full HISEW run, because native pack qualification requires clean committed source.
Run each required full obligation once on the frozen candidate; independent execution is a distinct R2 obligation.
Source writes after that point invalidate affected evidence according to actual scope; no blanket documentation exclusion or cached pass is introduced.
Use the existing CI workflow without weakening lane coverage, action pins, permissions, npm engine admission or immutable archive identity.
Required final proof includes the reference producer, all14 minimum/current/reference consumers on Windows/Linux, actual exact Git installation and offline replay.

No data migration, backfill, rollout flag or service telemetry is applicable.
Maintainers observe schema/diagnostic preservation, rule ownership, native proof and the final hosted gate.
Abort or replan on changed public contracts, failed preservation, missing archive members, inadequate native tooling, new dependencies, expanded path/admission semantics or unavailable required review.
Recovery is a signed forward repair or source revert with applicable requalification; existing immutable source and evidence remain recoverable.
Separate publication or downstream adoption requires its own authority and verification.

Keep raw evidence in the selected external HISEW evidence store and native security artifacts in their owning store.
Allocate temporary groups before accumulation; place a verifier clone directly in its allocated group rather than declaring overlapping parent/child scratch locations.
Release consumers before recoverable disposal and retain required raw outputs independently.
Finish with resource reconciliation, exact remote readback and native HISEW completion using admissible receipts.
