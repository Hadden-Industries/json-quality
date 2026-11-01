# Zero-config consumption and opinionated JSON policy: implementation plan

Date: 2026-11-01, Europe/Bucharest.
Revision: 3; naming-audit integration, accepted aggregate producer count and explicit contract-change specifications.
Status: revision 3 accepted for local implementation by the owner's subsequent instruction in this chat.
The functional requirements below remain the implementation baseline; earlier planning-only authority observations are historical.
Decision owner: Maksym Shostak / Hadden Industries.
Scope: Hadden-Industries/json-quality.
Inspected source: `3d4db7106b44e226607ceee6500258c9b94e14cd` for revisions 2 and 3; revision 1 inspected `e23b3156f23d4a9a516c8ceced3cb18a3d4a5505`.
Source package: `1.0.0-rc.2`; public contract cohort: `3`.

## 1. Purpose, authority and source baseline

### Implementation authorization and process override

The owner accepted revision 3 and authorized implementation on the existing local `main`, signed intermediate commits, required configuration changes and commit messages, with **no pushes**.
The first implementation action is to commit this plan and its referenced audit/performance artifacts before product edits.
A fresh remote observation confirms that baseline `3d4db7106b44e226607ceee6500258c9b94e14cd` is six commits ahead of, and not divergent from, `origin/main` at `33c95858d316ca3cdabf319a2705f9161d44e7e5`.

Reuse this accepted plan, R2 route and decisions in one execution; do not restart routing or close executions between source increments.
Use the existing task and native records without duplicate manifests, receipts or evidence packaging; commit-helper evidence plumbing is waived.
Consolidate changes and run exact-scope formatting/linting before one ordinary review per coherent increment; review repairs narrowly and reuse valid testing.
Ordinary code review uses Review Agent with GPT-6 Astra Extra High; Codex Security uses the same model/effort only for the final commit.
No external reviews are authorized.
Straightforward delegated work uses at least GPT-6.1 Sol at Medium.
Retain signing, meaningful product assertions, original failed results and honest qualification limits.
Delete task-created temporary files/clones when no longer needed using bounded ordinary filesystem cleanup, not HISEW's deletion component.
Additional HISEW bookkeeping/test demands do not expand this task; genuine guard refusals and existing effect/ownership boundaries remain binding.
No installation, deployment, activation, engine selection change, release promotion or downstream modification is authorized.

The sections below retain the planning observations and technical acceptance criteria; this authorization supersedes their earlier draft-status, isolated-branch and duplicate administrative-process wording.

Make the ordinary consumer contract: install the development dependency, then use the public binary with no configuration file, npm script, JavaScript wrapper or custom provider.
Package-owned defaults should deliver complete discovery, strict admission, useful diagnostics and safe explicit repairs.
Configuration should express exceptional ownership and supported deviations without repeating fixed package constants.

The user requested a detailed HISEW implementation plan based on `C:/Users/maksy/Downloads/Deep research_ making @hadden-industries_json-quality genuinely zero-config and more opinionated.md`, saved under `docs/plans`.
The inspected research file has SHA-256 `58eb991f4215c9728eac88e61ab25a40672cc4b37d0cca42613d26959d35f517`.
Its citation tokens and references to two attached repository adapters are not independently usable source links in this checkout.
This dossier refreshes material claims against current repository code and primary documentation; it does not claim to have inspected those missing attachments.

Revision 2 also incorporates the owner's attached `C:/Users/maksy/.codex/attachments/593ad532-7f6e-4e84-94ee-53618720deda/Pasted text.txt`, SHA-256 `0d6098824acae6d69aa0c9a37d5e8055eab5578b9c6c2f651b0b85368b6884fe`.
That attachment selects NFC as the built-in, overridable convention: check enforces it, format preserves decoded strings, and explicit normalize repairs eligible strings and keys.
It does not ask format, install or check to rewrite Unicode automatically.
The substantive changes to revision 1 are a supported sparse global `preserve` override, explicit collision/preview/version contracts, and measured performance evidence; revision 1 already retained NFC checking by default.

At revision 1 inspection the repository was clean and `main` was five commits ahead of the locally recorded `origin/main` before this document was added.
Revision 2 observed six local commits ahead and only this untracked plan; intervening release-writer changes are unrelated to NFC.
No remote refresh or publication check was performed, so this describes local Git observations only.
Existing CI hardening and Node-policy changes are part of this source baseline, not work to repeat under this plan.

Revision 3 incorporates the public naming audit and the owner's explicit acceptance of `maximumTotalValues`.
It keeps that quota's existing behavior, supplies exact migration mappings, and specifies the different behavior needed for policy snapshots, operation-scoped resources, diagnostic identities and provenance.
The source commit is unchanged; the observed untracked planning/audit/performance artifacts belong to this planning work.

The requests authorize this plan, scoped document validation, lower-powered inspection subagents and a local performance investigation using an unchanged representative repository sample and temporary benchmark artifacts.
It does not authorize product implementation, HISEW engine selection changes, downstream repository edits, workflow dispatch, publication or release promotion.
The NFC-default direction and consumer preservation override are owner-selected by the follow-up request; no accepted exact requirement snapshot for the complete implementation was supplied.
The `REQ`, `AC`, `QA`, `DEC` and `SLICE` identifiers below form a proposed draft baseline, not a claim of recorded HISEW acceptance.
Section 13 names the prerequisites and evidence needed before implementation; independent planning work is complete without resolving those implementation gates today.

### 1.1 HISEW observations and retained selection

The HISEW planning and management skills were consulted from the loaded `hisew-dev/0.1.0-dev.29` artifact.
Read-only native inspection established:

| Observation                     | Result                                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Selected engine                 | `0.1.0.dev29`, release `a69680c5fa7d47f2ffb7a56d75747d7696e102ac61d3998a1481f66e5fb176fb`                  |
| Loaded artifact                 | `0.1.0.dev29`, release `78d10f49862633eff7fb157c6709af0b11470209c5dfad9858b837ae402dfa06`                  |
| Selected generation and attempt | Generation `14`; attempt `ecc9bed1-3350-435a-b1b6-dd276b09c332`                                            |
| Runtime key                     | `0.1.0.dev29-a69680c5-00`                                                                                  |
| Installation and host           | Installation `3ea0be5b-1850-4be3-b18b-bf1cd6f90368`; host `codex`                                          |
| Planning chat                   | `01a1989e-faee-7ab1-be14-343b091c7dd7`                                                                     |
| Project applicability           | `personal`, `active: true`                                                                                 |
| Project / worktree              | `deb3363f-2f3c-488a-b20e-57d8760daef3` / `5163f2d2-392c-4676-b05d-909a0914749d`                            |
| Workflow inspection             | Selected worktree admitted; focused, affected and full profiles exist; input ordering remains unverified   |
| Execution status                | Status reported no HISEW work in progress in this repository; this is not a portfolio-wide owner inventory |
| Loaded setup inspection         | Requested artifact not ready; selected runtime observed; activation unverified                             |

Retain the primary startup classification `selection-mismatch` / `HOOK_SELECTION_MISMATCH`, with diagnostic retention reported unavailable (`RETENTION_UNAVAILABLE`).
The loaded adapter's `setup-required` result does not supersede the established mismatch or authorize installation, repair or acquisition.
Equal human version labels do not establish equal release identity or successor order.
No selection, hook activation, execution ownership or assurance coordination was changed by this task.
Before implementation through HISEW, the management owner must establish the intended loaded/selected pairing and coordinate any transition with actual affected assurance owners, preserving generation checks and existing evidence.
Retain the current selection until that supported process is complete; do not bypass it to start execution.
Unrelated pending continuations, branch cleanup and storage inventory remain outside this plan.
Revision 2 rechecked personal applicability as active through the same selected launcher; the release/generation observations above remain those recorded during revision 1, not a new activation claim.
Revision 3 again observed `personal` / `active: true` through `inspect-project-applicability`; the loaded/selected mismatch and retained-selection instruction are unchanged.

## 2. What changes, and what the research already found in place

### 2.1 Research-to-source reconciliation

| Research proposal                                | Current owning evidence                                                                                                                             | Implementation disposition                                                                                                  |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Use the installed `json-quality` binary directly | `package.json`, `src/cli.js` and `src/commands.js` already expose it and default the root to the current directory                                  | Preserve the invocation; make the installed no-config path an enforced qualification case                                   |
| Add immutable package defaults                   | `src/configuration.js` resolves exceptions but has no ordinary missing-policy path                                                                  | Add one policy resolver and deeply immutable default contract                                                               |
| Make the policy file optional                    | `src/policy-bootstrap.js` unconditionally observes `.json-quality.json`; execution and rewrites assume an observation exists                        | Introduce explicit present/absent provenance and freshness checks across all consumers                                      |
| Accept sparse configuration                      | `schemas/configuration.schema.json` requires version, defaults and exceptions; its defaults are fixed                                               | Separate sparse input from resolved effective policy in the next coherent cohort                                            |
| Separate formatting from NFC mutation            | `src/native-formatting.js` preserves meaning; `src/native-normalization.js` explicitly edits NFC spans                                              | Preserve that boundary; repair command admission for mixed presentation/NFC findings rather than inventing a new normalizer |
| Add strict/interoperability checks if absent     | `native/core/document_check.hpp` and `decimal_admission.hpp` already implement BOM/UTF-8, decoded duplicates, noncharacters and numeric diagnostics | Characterize and retain existing behavior; add only evidenced gaps                                                          |
| Keep order and numeric lexemes                   | Existing native meaning proofs and formatter tests own this behavior                                                                                | Extend independent preservation and idempotence coverage to the no-config path                                              |
| Avoid mandatory custom providers                 | `createRepositoryExecution` defaults provider inputs to empty collections                                                                           | Preserve advanced provider validation; ordinary physical discovery must need none                                           |
| Qualify a minimal consumer                       | `scripts/qualify-package.js` currently creates a separate configured fixture and runs an API probe                                                  | Add a true consumer-root CLI fixture; retain the richer existing probe                                                      |
| Simplify beginner documentation                  | README still requires a policy file; consumer guide emphasizes isolated acquisition                                                                 | Put normal npm use first and retain advanced assurance documentation                                                        |

Additional corrections matter to implementation:

- README's starter policy says schema version `2`, while the current runtime requires `3`; architecture prose also contains an older cohort label.
  Refresh executable examples with the cohort change rather than propagating those stale labels.
- The CLI currently supports `check`, `source`, `format` and `normalize`.
  The research's `inventory` command claim does not match `src/commands.js`; `inventory:json` is a repository script invoking `check --json`.
  Adding a new public inventory command is not required here.
- `normalization: "NFC"` already controls checking and repair eligibility; it does not itself authorize ambient filesystem mutation.
  Keep it as the package default.
  A deliberate consumer `"preserve"` override suppresses ordinary non-NFC enforcement, while exact duplicate detection and independent byte/write ownership remain mandatory.
  The present schema fixes repository defaults to NFC and binds path-level preservation to no generic writes; revision 2 deliberately changes those configuration semantics in the new cohort.
- Resource defaults are intentionally projected from schema definitions by `src/resource-profile.js` and native resource tooling.
  Avoid Ajv default insertion for configuration resolution, but do not duplicate or relocate that separate resource authority just because policy defaults become package-owned.
- Discovery requires Git today.
  Zero configuration does not imply no runtime prerequisites, non-Git folder support, arbitrary platform support or an absent native companion.

### 2.2 Included and excluded scope

Included: optional policy loading; sparse configuration and effective-policy schemas; typed public resolver/defaults; overridable built-in NFC; collision-safe normalization with a no-write preview; package-owned external boundaries and npm lockfile ownership; truthful policy provenance; command-specific safe repair admission; preservation of existing strict rules; installed CLI qualification; coherent cohort migration; beginner and advanced documentation; the necessary CI/evidence consumers.
Revision 3 also includes the exposed-name migration, corrected public structural types, bounded policy snapshots, operation-scoped resource profiles and explicit diagnostic/provenance identity migration specified in sections 4.5-4.10.

Excluded: a new parser, a second Unicode engine, canonicalization/JCS, key sorting, JSONC/JSON5 acceptance, generic domain JSON Schema validation, editor integration, recursive parent-directory config discovery, arbitrary config imports, executable config, new provider transports, non-Git folder scanning, new operating systems/architectures, generic package-manager detection and publication during implementation planning.
Yarn/pnpm/Bun ownership presets require separate evidence and are not silently inferred from the npm fixture.

## 3. Proposed risk route

**Risk class:** R2, proposed for implementation.
Public configuration/event contracts, write admission, native candidate verification and policy freshness are material boundaries.
No evidence supplied establishes an R3 organizational obligation.

**Decision owner:** Maksym Shostak / Hadden Industries.
The integration implementer, independent verifier, native/security reviewer and release observer must be assigned before their respective gates; this document does not appoint other chats or services.

**Reasoning:** A permissive fallback could hide an invalid policy; a shallow default object could leak mutations between sessions; an incorrect repair classifier could authorize semantic changes; a stale policy observation could admit writes under changed authority.
These failures can reach every installed consumer.

**Potential blast radius:** CLI and library consumers, mutable repository checks and writes, immutable Git qualification, advanced adapters, schema consumers, native companions, generated types and qualification/release evidence readers.

**Reversibility:** Unpublished source changes are reversible.
Cohort migration needs coordinated package/config/schema restoration.
Formatting and normalization modify user files, and NFC is not invertible; package rollback alone cannot restore source bytes.
Released versions and existing evidence must remain immutable.

**Principal unknowns:** Exact operation-specific repair predicates; policy absence observation; full migration inventory; lockfile serialization behavior across qualified npm versions; consumer archive routing; current native dependency freshness; HISEW selection coordination.

**Required artifacts:** Accepted revision of this dossier or equivalent protected requirement baseline; consequential decision dispositions; source-bound verification and independent review; migration/rollback instructions; installed consumer and release evidence at the actual delivery stage.

**Required specialist lenses:** Native write safety and Unicode/numeric semantics; schema/API compatibility; Codex Security assessment of changed policy admission, containment and write boundaries under `SECURITY.md`.
R2 requires independent verification.
This is a future assurance requirement, not a claim that scans or delegation ran while writing the plan.

**Required verification:** Focused checks while iterating, affected checks for each coherent integration, final relevant full profile, rebuilt native transport/platform qualification and packed/registry consumer evidence as specified below.
A generic focused profile alone cannot prove this change.

**Required human approvals:** Accept the exact R2 requirement/design baseline and consequential decisions before implementation; resolve any new rights or no-shim exception; retain existing release decisions for externally visible publication.
Do not insert repetitive approvals into already authorized reversible implementation work.

**Maximum sensible autonomy:** This task produces and checks the document.
A later implementation authorization permits ordinary scoped edits and checks under the accepted route, subject to actual HISEW readiness and independently owned assurance.
No inferred authority to migrate other repositories or alter engine selection.

**Next lifecycle step:** Resolve `GATE-001` through `GATE-004`, then implement `SLICE-001`; use `EXP-001` through `EXP-004` to close the specific uncertainties without changing the baseline silently.

## 4. Proposed decisions and public behavior

The owner selected the NFC-default/preserve-override direction in DEC-004.
Its detailed implementation and all other decisions remain proposed for this draft.
No specific prior NSH-01 shim override was found or assumed.

| ID      | Decision                                                                                                                       | Consequence                                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-001 | Package-owned defaults are the standard case; only proven absence selects them                                                 | Missing config is valid; malformed, inaccessible, linked or changing config remains an error                                           |
| DEC-002 | Separate sparse configuration input from a complete effective policy                                                           | Ajv validates both shapes without mutation; one resolver serves CLI, SDK and immutable Git policy loading                              |
| DEC-003 | Advance the coupled contract family from cohort 3 to proposed cohort 4                                                         | Migrate current consumers together; reject old explicit schema markers without a compatibility parser or alias                         |
| DEC-004 | Make NFC the built-in default, with sparse global/path `preserve` overrides; only explicit `normalize` changes decoded strings | Keep presentation and Unicode mutation separate; consumer overrides do not waive exact duplicates or protected ownership               |
| DEC-005 | Permit a selected repair to leave only the other repairable presentation/NFC condition unresolved                              | Format preserves non-NFC values; normalize preserves presentation outside changed string spans; retain complete safety and peer checks |
| DEC-006 | Preserve strict syntax/interoperability rules and current numeric policy                                                       | No parse/stringify replacement, global severity switches or unreviewed numerical narrowing                                             |
| DEC-007 | Provide package-owned dependency/VCS boundaries and narrow npm lock ownership                                                  | A real npm consumer works without copying repository-specific exclusions                                                               |
| DEC-008 | Keep complete discovery, guarded writes, JSONL framing and advanced providers                                                  | Defaulting must not conceal tracked files or weaken adapter authority                                                                  |
| DEC-009 | Add exact public CLI consumer evidence to existing qualification                                                               | No wrapper, API import or handwritten policy may satisfy this evidence field                                                           |
| DEC-010 | Preserve ordinary and isolated install layouts and deliberate CI scheduling                                                    | Extend existing orchestration and evidence contracts instead of adding a second release system                                         |
| DEC-011 | Teach normal npm use first; retain advanced acquisition and provider material                                                  | Simplified onboarding does not remove package integrity or assurance capabilities                                                      |
| DEC-012 | Treat qualification, publication and downstream adoption separately                                                            | Choose the release version later; source completion does not make the current published package zero-config                            |
| DEC-013 | Refuse NFC-colliding keys before any selected batch write; offer a complete no-write normalization preview                     | Never merge, discard or rename colliding members automatically; diagnostics identify the owning object and both locations              |
| DEC-014 | Report potential NFC collisions under `preserve` as a separate non-blocking nfc-key-collision-risk event                       | Preserve distinct decoded keys; never relabel the event as strict JSON failure or let it authorize normalization                       |
| DEC-015 | Bind Unicode/ICU identity to preview, checking and write evidence                                                              | Use the packaged native normalizer and matching official conformance data; reject stale preview reuse                                  |

Revision 3 adds these decisions to the preceding table:

| Decision | Selected design                                                                      | Implementation constraint                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| DEC-016  | Use producer `maximumTotalValues`, as explicitly accepted by the owner               | Retain the current root-inclusive, occurrence-based aggregate count, default 65,536 and separate depth/byte limits                               |
| DEC-017  | Incorporate every naming-audit item with an explicit disposition                     | Sections 4.5-4.10 distinguish unchanged behavior, corrected declarations and changed contracts; do not use indiscriminate replacement            |
| DEC-018  | Separate source admission, installation-family admission and acquisition controls    | Preserve the old effective default bounds; explicitly migrate old overrides with multiple effects                                                |
| DEC-019  | Make policy resolution produce a bounded, independent immutable snapshot             | Replace the misleading public admission promise with one resolver and a private complete-policy assertion; no getter/custom-serializer execution |
| DEC-020  | Use precise diagnostic identities without changing their severity or detection scope | Migrate live expected pins and digests deliberately; retain historical oracle bytes                                                              |
| DEC-021  | Specify policy provenance preimages and public structural types                      | No invented file hash, transferable reference ID, undocumented count unit or untyped provider contract                                           |

`DEC-016` is owner-selected.
The detailed contracts in `DEC-017` through `DEC-021` are the concrete proposed design requested by the owner, not a claim that the whole implementation dossier has been baselined.

### 4.1 Configuration resolution contract

The proposed input schema admits `{}` and an exception-only document.
`schemaVersion` may be absent; absence explicitly means the configuration contract shipped with the installed package, not version detection.
If present it must equal the current new cohort version.
Pinning the package/lockfile supplies reproducibility for markerless configurations; documentation should recommend an explicit marker for long-lived externally managed policies.

The resolver accepts only bounded plain control data using the existing supported control-admission boundary before reading getters or custom serialization.
Filesystem JSON still passes through the strict native reader, including decoded duplicate-name and byte checks.
Unknown fields, `null` where omission is intended, unsafe patterns, conflicting exceptions and unknown versions fail closed.
There is no environment interpolation, remote schema fetch, config search above the chosen root, `extends`, executable configuration or automatic file creation.

Proposed precedence and merge rules:

1. The immutable package baseline owns fixed presentation, default NFC checking, ordinary write eligibility and built-in ownership contracts.
2. Sparse user fields supply supported resource/provider controls and explicit path exceptions.
   Omitted lists become empty user lists; a supplied user list replaces that input field, never mutates package state.
3. Built-in path ownership and explicit exceptions are resolved by one path-contract owner.
   Ordinary ownership presets may be overridden by supported explicit deviations; mandatory safety and protected write boundaries cannot be weakened.
4. Two explicit user exceptions assigning different values to the same matching contract field remain an error; array order is not last-wins precedence.
5. Existing invocation-level resource precedence remains authoritative.
   Resource quotas and producer/domain authority are not interchangeable with formatter preferences.

Keep a complete `defaults` object optional in the input for explicit current-cohort declarations.
Presentation values remain fixed; `defaults.normalization` now explicitly admits `"NFC"` and `"preserve"`.
Path exceptions may select either value, so a consumer can preserve globally and re-enable NFC for authored paths, or preserve only narrow exceptions under the NFC default.
The effective schema requires every runtime-required field, even when omitted in input.
Its package-owned profile records built-in ownership provenance separately from user exception provenance, so the rules are explainable without fabricating owner/reason entries supplied by the user.

A proposed minimal user configuration is:

```json
{
  "exceptions": [
    {
      "paths": ["generated/**"],
      "allowSourceRewrites": false,
      "owner": "Repository generator",
      "reason": "The generator owns serialization; quality checks still apply."
    }
  ]
}
```

Export proposed `defaultJsonQualityPolicy` and `resolveJsonQualityPolicy` through `src/index.js`, with distinct `JsonQualityConfiguration` and `JsonQualityPolicy` types and an `effective-policy-schema` export.
These names distinguish input configuration, resolved policy and per-source contract; do not leave `JsonQualityPolicy` ambiguously describing sparse input.
Freeze every nested default/result object and array, snapshot mutable caller data, and prevent one consumer's mutation from affecting another session.

The owner's requested minimal global opt-out is:

```json
{
  "defaults": {
    "normalization": "preserve"
  }
}
```

This selects exact decoded Unicode preservation, not exact source-byte preservation.
Presentation-only format remains eligible unless an independent owner/write contract forbids it; normalize refuses a selected preserved source rather than silently overriding policy or claiming a successful repair.
If a normalize selection mixes preserved and NFC-eligible sources, the policy refusal occurs during complete batch preflight and leaves every selected source unchanged; do not silently skip the preserved target.
Signed/canonicalized payloads, producer-owned bytes and opaque data requiring byte identity still need their existing protected-byte/no-write contracts.
Migrate existing `allowFormatWrites: false` and `preserveNfcValues` to `allowSourceRewrites: false` and `nfcExemptStringValues` without removing their restrictions or changing their pin bytes.
Consumer choice never disables strict UTF-8/scalar, duplicate-decoded-key or numeric rules.

### 4.2 Built-in discovery and ownership

The minimal supported case is an existing Git repository on a currently supported platform with Node, npm, Git and the matching verified native companion available.
`--root .` remains optional; the chosen root remains explicit current-directory scope, not an implicit ancestor search.
Missing Git, a nonrepository root, unsupported platform or missing companion produces an actionable incomplete/error result, not an alternative parser or downloader.

The package should prune Git metadata and dependency installations such as root/nested `node_modules` using the existing discovery and containment model.
Preserve tracked-file admission even under excluded ancestors: such owned JSON remains checked and protected from generic writes.
Do not blanket-exclude `vendor`, `dist`, `build`, `generated`, `coverage`, hidden directories or ignored JSON; those names alone do not establish external ownership.
Retain required-output obligations and unsupported-dialect refusals.
Test nested dependency boundaries, symlink/junction boundaries and Windows spelling rather than assuming a textual glob is sufficient.

Built-in npm ownership covers root/nested `package-lock.json` and `npm-shrinkwrap.json`, with generic writes prohibited and only the known `/packages/` empty-key use admitted.
Reuse a supported producer presentation contract for npm serialization after `EXP-003`; do not ignore lockfiles entirely or suppress their syntax, Unicode and numeric checks.
No user exception may turn the package-owned lockfile write prohibition into generic rewrite permission in this cohort.
Unknown lockfile structures remain structurally checked and receive actionable findings; this package does not become npm's domain validator.
The package's own native-prebuilt and frozen-oracle exceptions remain repository-local.

### 4.3 Command semantics, including mixed repair conditions

| Command               | Required outcome                                                                                                                              | Mutation and exit behavior                                                                                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check`               | Complete census, strict rules, default NFC findings and presentation findings; honor explicit preservation                                    | No source writes; `0` satisfied, `1` complete quality failure, `2` incomplete/error; a preserve-mode nfc-key-collision-risk event alone is non-blocking                          |
| `format`              | Selected eligible physical JSON gains package-defined presentation while decoded strings, exact number lexemes and member order are preserved | May leave only ordinary non-NFC findings in selected files; successful write operation returns `0` with truthful remaining-quality metadata                                      |
| `normalize`           | Explicit eligible physical selections gain NFC keys/values after collision preflight                                                          | Preserve all nonpatched bytes and numeric lexemes; may leave presentation findings; successful write operation returns `0` with truthful remaining-quality metadata              |
| `normalize --dry-run` | Complete the same policy, selection, collision and candidate checks and report the exact planned changes                                      | No source writes; `0` complete admissible preview, `1` complete collision/quality refusal, `2` invalid selection/policy, resource or incomplete error; no write-success terminal |
| `check-source`        | Existing raw-stdin source contract                                                                                                            | No repository lookup, config synthesis or file writes                                                                                                                            |

The new operation predicate is narrower than ignoring lint errors.
Only an ordinary `json-quality/nfc-strings` / `unnormalized` finding may remain after format, and only presentation findings may remain after normalize.
Duplicate decoded keys, enforced NFC collisions, invalid bytes/scalars, noncharacters, unsafe numeric findings, meaningful-key errors, failed expectations, stale policy, incomplete streams and protected ownership continue to block writes.
In preserve mode, potential NFC equivalence is advisory for presentation-only format; it never waives exact duplicate rejection and normalize remains disallowed by the preserved contract.
Unselected peers and derived logical dependents retain their complete current contracts; the selected-file exception must not leak to them.
No permission flag supplied by an untrusted caller may attest that a source is safe: the native owner derives eligibility from completed source facts and candidate lineage.

Both selected repair orders must work on a document containing ordinary NFC drift plus presentation drift: format then normalize, and normalize then format.
After the first operation, `check` still returns `1` for the remaining condition; after the second, it returns `0`.
The write terminal must distinguish successful requested effects from overall repository quality, and human output must state remaining findings instead of implying a clean repository.
This is a proposed behavior extension required to make the separated commands useful; it needs explicit baseline acceptance and native/security review, not a silent relaxation of `contractSatisfied`.

JSONL/NDJSON remain checked under their framing contract and unavailable to the generic document writers.
Normalization still requires explicit file selection.
Preserved-byte, producer-owned, pinned NFC-value, native-authority and ignored-source protections remain in force.

### 4.4 Collision, preview and Unicode-version contract

Compare keys after JSON escape decoding, and scope identity to their containing object, including the record boundary for JSONL.
In NFC mode, compare their NFC representations as well.
A digest is only a candidate filter: full normalized-byte equality must decide equivalence, and all matching candidates must contribute to collision detection.
Never feed source objects through a JavaScript dictionary or `JSON.parse`/stringify cycle before detecting duplicates; that can already discard a member.

For `{"\u00e9":1,"e\u0301":2}`, retain both members and refuse normalization of the entire selected batch before its first write.
No first-wins, last-wins, merge, auto-suffix or value-dropping behavior is permitted, even when the values happen to match.
The source/domain owner must rename or reconcile the keys explicitly, or select preservation where exact sequences are intentional.
Identical normalized names in different objects are not collisions.

Diagnostics distinguish exact decoded duplicates, enforced NFC collisions and preserve-mode potential collisions.
Report both source locations, containing-object identity/pointer and a bounded normalized identity; do not print arbitrarily large or sensitive key/value contents by default.
Preserve-mode detection normalizes keys for comparison only, not values for enforcement or mutation.
Represent its advisory as a separate `nfc-key-collision-risk` event, not an error-shaped `finding` with a different label: current native `SourceOutcome` counts every finding as failed quality.
Extend event validators, CLI rendering, delivery completeness and native/consumer tests coherently; no generic lint-severity framework is required.
This advisory is proposed from the attachment's optional recommendation and is not implemented in the performance comparison.

`normalize --dry-run` reports every eligible changed key/value with file and source span, pointer/record identity where applicable, before/after decoded byte length and digest, and the native ICU/Unicode identity.
Provide bounded explicit previews of text only when requested by the caller; enforce existing output/resource quotas and fail incomplete rather than silently truncate a complete-plan claim.
Its final event distinguishes a complete candidate preview from actual effects, includes selected/changed counts, and surfaces collisions and protected selections.
Reuse the same preparation/candidate owner for preview and write; do not introduce a separate approximate normalizer.
A later write rechecks current source and policy rather than treating a stale preview as authorization.
Actual writes remain guarded per file and are not atomic after preflight.

Require `normalize(normalize(x)) === normalize(x)` for admitted input and both command/API paths.
Use the packaged ICU/Unicode data, never the host JavaScript or Python normalization version as production authority.
Retain the current ASCII fast path and use native supported normalization/conformance primitives for any further optimization.
Unicode-data upgrades require identity changes, version-matched conformance evidence, collision/normalization corpus comparison and consumer documentation; no new dependencies or Unicode algorithm are selected here.

### 4.5 Naming migration: exact mapping and change classes

This section incorporates [the public naming audit](2026-11-01-public-naming-audit.md); an implementer must not need the chat to decide what a replacement means.
An **R** item changes a name or representation label while preserving the successful operation, quotas, selection, error category and side effects.
A public R item is still a breaking interface change.
A **D** item corrects declarations or documentation to describe existing behavior.
A **B** item changes admission, responsibility, control scope or observable diagnostic/provenance contracts and requires the procedure and behavioral cases below.
Do not infer that B permits unrelated changes to quality rules or permissions.

For every R item, change the owning definition, all live call sites, generated types/schema projections, CLI/help/environment projections where applicable, package probes and current examples together.
Preserve function argument order and return shape except explicitly renamed fields.
Reject old object keys/flags/environment contracts in the new cohort with the replacement named in the error; remove old root exports/binaries without an alias.
Keep old identifiers inside immutable historical evidence and this plan's explicitly labeled migration mappings.

| Audit item   | Old surface to new surface                                                                                                                                                                                                                  | Class and exact invariant                                                                                                                                                                                                                                                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NAME-001     | `allowFormatWrites` to `allowSourceRewrites`                                                                                                                                                                                                | R: same generic repository format/normalize permission; false blocks both. It never authorizes producer or arbitrary filesystem writes. Source-contract restrictions and native admission use the same spelling.                                                                                                                                                        |
| NAME-002     | `preserveNfcValues` to `nfcExemptStringValues`; `$defs.nfcValues` to `$defs.nfcExemptStringValuePins`                                                                                                                                       | R: exact pointer/record/decoded UTF-8 hash/length pins, values only, existing owner/reason and write protection. Keys cannot acquire an exemption.                                                                                                                                                                                                                      |
| NAME-003     | Three capability constants to `DEFAULT_JSON_TRANSFORM_LIMITS`, `DEFAULT_JSON_PRODUCER_LIMITS`, `DEFAULT_PACKAGE_VERIFICATION_LIMITS`                                                                                                        | R: frozen default profiles, not hard implementation maxima. Generate from the same schema owners. Do not rename unrelated live reference capabilities.                                                                                                                                                                                                                  |
| NAME-004     | Public `npmExecutable` to `npmCliPath`                                                                                                                                                                                                      | R: same npm JavaScript entry-file path used for module resolution. Retain external `npm_execpath`; do not replace actual Git/process executable parameters.                                                                                                                                                                                                             |
| NAME-005     | `managedMemoryTargetBytes` to `maxManagedMemoryBytes`, and generated `--max-managed-memory-bytes`                                                                                                                                           | R: same hard managed-allocation quota; private spill target is separately named `spillWorkingTargetBytes`, with the existing finite default when quota is unlimited. No RSS claim or new tuning option.                                                                                                                                                                 |
| NAME-006     | Only producer `maximumMembers` to `maximumTotalValues`                                                                                                                                                                                      | R, owner-selected: section 4.6. Archive `verificationControls.maximumMembers` remains unchanged.                                                                                                                                                                                                                                                                        |
| NAME-007     | `qualifyJsonConsumer` to `qualifyGitJsonSources`; bin `json-quality-qualify` to `json-quality-qualify-git`                                                                                                                                  | R: immutable candidate Git JSON under trusted-commit policy only. Use workflow display name “Trusted Git JSON source qualification”; retain workflow file identity unless it has another actual naming defect.                                                                                                                                                          |
| NAME-008     | `exclude` to `excludeUntrackedSources`                                                                                                                                                                                                      | R: matching untracked sources can be excluded; tracked sources remain checked and generic-write-protected. Rename the selected-contract field too.                                                                                                                                                                                                                      |
| NAME-009     | `selectStream` to `selectByPointerStream`; parameter `chunks` to `pointerByteChunks`                                                                                                                                                        | R: captured source plus UTF-8 pointer-byte stream; optional stream identity identifies pointer bytes. No source parsing or lookup semantics change.                                                                                                                                                                                                                     |
| NAME-010     | Session `identity` to `implementationIdentity`; source/value reference `identity` to `referenceId`                                                                                                                                          | R: component metadata versus opaque scoped label. Keep source opener `identity: {sha256, byteLength}` for content identity. Update the event reference schemas; never derive live authority from the serialized label.                                                                                                                                                  |
| NAME-011     | `jsonQualityAcquisitionBootstrap` to `readJsonQualityAcquisitionBootstrapSource`                                                                                                                                                            | R: same synchronous read and returned JavaScript source text; no installation effect.                                                                                                                                                                                                                                                                                   |
| NAME-012     | `jsonQualitySourceCoordinate` to `parseJsonQualityRegistrySpecifier`                                                                                                                                                                        | R: same exact registry version/alias admission and `{kind: "registry", version}` result; no Git selector or network support.                                                                                                                                                                                                                                            |
| NAME-013     | `--json` to `--ndjson`; CLI verb `source` to `check-source`                                                                                                                                                                                 | R: same versioned event-line framing and raw stdin behavior. The `--contract` argument remains one JSON document; its meaning must not change with the output flag.                                                                                                                                                                                                     |
| NAME-014     | Repository session `events()` to `check()`                                                                                                                                                                                                  | R: same lazy, one-shot check iterator, event ordering, cancellation and terminal requirements. Source session `check(source, ...)` keeps its existing signature; these are different receiver types.                                                                                                                                                                    |
| NAME-015     | Event `findings` to `findingCount`, `members` to `inventoryMemberCount`, `transitions` to `spillTransitionCount`; write counters to `selectedPathCount`, `changedPathCount`, `writtenPathCount`; installation result `files` to `fileCount` | R: retain exact values and units. Wire/event counts stay canonical unsigned decimal strings; installation counts stay numbers. `written` remains an event type, not a renamed count. Root installation count includes core plus native; nested native count is a subset.                                                                                                |
| NAME-016     | Positional `maximum`/`offset` to `maximumBytes`/`byteOffset`; returned `ByteRange.offset` to `byteOffset`; limits to `maxRequestIdCodePoints`, `maxRequestPathCodePoints`                                                                   | R: same byte ranges and Unicode scalar counting. Rename corresponding owned native range fields, but not unrelated ordinals/offsets. Public correlation IDs and separately generated ASCII native sequence IDs are distinct domains; ASCII byte length already equals code-point count.                                                                                 |
| NAME-017     | Source and installation resource names/populations                                                                                                                                                                                          | B for separating ownership and override routing; R for source populations. Section 4.6 fixes both the names and the complete behavior table.                                                                                                                                                                                                                            |
| NAME-018     | `trustedPolicyBlob` to `trustedPolicyBlobId`; qualification `trustedSha`/`candidateSha` to `trustedCommitId`/`candidateCommitId`                                                                                                            | R for names and existing exact Git identity validation; section 4.10 adds explicit absence behavior. Project flags to `--trusted-commit-id` / `--candidate-commit-id`, environment to `JSON_QUALITY_TRUSTED_COMMIT_ID` / `JSON_QUALITY_CANDIDATE_COMMIT_ID`, and workflow inputs to `trusted-commit-id` / `candidate-commit-id`. Roots/repository inputs are unchanged. |
| NAME-019     | `json-quality/meaningful-keys`                                                                                                                                                                                                              | B for diagnostic partition and identities only: exact mapping in section 4.8; no added domain-meaning check.                                                                                                                                                                                                                                                            |
| NAME-020     | `json-quality/interoperability` to `json-quality/no-unicode-noncharacters`                                                                                                                                                                  | B for diagnostic identities/digests; retain noncharacter detection, severity and code-point argument.                                                                                                                                                                                                                                                                   |
| NAME-021     | `json-quality/normalized-strings` to `json-quality/nfc-strings`                                                                                                                                                                             | B for diagnostic identities/digests; retain existing message IDs and detection rules except already accepted collision/advisory behavior in section 4.4.                                                                                                                                                                                                                |
| CONTRACT-001 | Public `admitJsonPolicy` replaced by `resolveJsonQualityPolicy`                                                                                                                                                                             | B: public sparse-input snapshot/resolution boundary in section 4.7. Keep complete-policy assertion private and accurately named.                                                                                                                                                                                                                                        |
| CONTRACT-002 | Source-contract schema title                                                                                                                                                                                                                | D: title, `$id`, references, generated type names and cohort metadata agree with cohort 4. Do not edit historical v3 evidence.                                                                                                                                                                                                                                          |
| CONTRACT-003 | Provider/session/metadata/rewrite declarations                                                                                                                                                                                              | D unless runtime enforcement is explicitly listed in section 4.9. Correct map/array shapes, cancellation and structural types; no newly permissive provider admission.                                                                                                                                                                                                  |
| CONTRACT-004 | `preserveSourcePresentation`                                                                                                                                                                                                                | D: retain name; schema/API description limits it to provenance-admitted native/logical sources. Add ordinary-physical misuse case; do not extend its scope.                                                                                                                                                                                                             |
| CONTRACT-005 | Value lengths, records and lease `transfer()`                                                                                                                                                                                               | D: exact representations and ownership lifecycle in section 4.9; retain `transfer` and its existing effect.                                                                                                                                                                                                                                                             |
| CONTRACT-006 | `resources.admission` / `resources.runtime`                                                                                                                                                                                                 | D: retain group names, give them exact resolved types and explain their input-control mapping. Apply renamed leaf fields.                                                                                                                                                                                                                                               |
| CONTRACT-007 | `JSON_QUALITY_CLEANUP` to `JSON_QUALITY_ACQUISITION_CLEANUP`                                                                                                                                                                                | R: same acquisition cleanup retries. Node option keys `maxRetries` and `retryDelay` remain; explicitly document milliseconds. Reject the old environment name rather than silently ignoring it.                                                                                                                                                                         |

Resolve the remaining audit recommendations as follows, rather than leaving alternatives to the implementer:

- Rename `jsonContract` to `resolveJsonSourceContract`, `assertIsolatedJsonQuality` to `assertJsonQualityInstallationRoot`, and `InstallationOptions` to `InstallationVerificationOptions`.
  Preserve their existing operation scope; the installation-root assertion does not certify hermetic isolation.
- Rename source-check `includeValues` to `includeValueEvents`, matching native vocabulary; retain independent `retainValues`.
  Neither option changes diagnostic delivery or reference retention rules.
- Replace contributor `inventory:json` with `check:json:ndjson`.
  Remove `format:json:check` and migrate its callers to `check:json`; do not implement a new presentation-only checker.
  Rename `check:security` to `check:dependency-advisories` and update `check:full` plus CI callers without dropping the audit.
- Retain `lint:json` as an existing semantically valid script, not a newly introduced compatibility alias; use `check:json` in new guidance.
  Keep `jsonFormatOptions`, `validateJsonQualityEvent`, `formatJsonValue` and other audit-retained names.
  Do not spend this change adding cosmetic `get` prefixes.
- Keep `defaultJsonQualityPolicy` as a deeply frozen value, not a factory.
  Keep `JsonQualityConfiguration`, `JsonQualityPolicy`, `effective-policy-schema`, `resolveJsonQualityPolicy`, `normalize --dry-run` and normalization enum values with their defined roles.
- Use event type `nfc-key-collision-risk` for the proposed preserve-mode advisory.
  Resolve provenance names and preimages in section 4.10; do not implement the earlier placeholder `policySource`.

### 4.6 Producer counting and resource-scope contracts

#### Accepted producer count: no behavior change

`producerControls.maximumTotalValues` is the maximum number of JSON value occurrences visited for one serialization, over the entire tree, including its one root.
Count each scalar, object and array once when visited; object property names are not additional values.
Visit a shared acyclic JavaScript object again at every occurrence where it will be serialized; do not deduplicate by identity.
Retain the ancestor set for detecting actual cycles, rather than replacing it with a global visited set.

| Input                                              | Required total | Smallest admitted value-count limit |
| -------------------------------------------------- | -------------- | ----------------------------------- |
| `42`, `{}`, or `[]`                                | 1 each         | 1                                   |
| `{ "a": 1 }`                                       | 2              | 2                                   |
| `[1, 2]`                                           | 3              | 3                                   |
| `{ "a": { "b": 1 }, "c": [2, 3] }`                 | 6              | 6                                   |
| `[shared, shared]`, where `shared` is `{ "a": 1 }` | 5              | 5                                   |

Keep default 65,536, positive safe-integer numeric admission, `null` for this quota alone, and `producerControls: false` for the whole producer quota profile.
Zero remains invalid because even an empty container has one value; do not import the abandoned root-excluding alternative into this revision.
An input costing exactly N passes this quota and N+1 fails it, subject to independent depth, byte and quality controls.
Rename the internal count to `totalValues` and its stable exposed capacity diagnostic to `producer-value-capacity` where that error is surfaced; there is no change in when it fails.
Retain early array-length and own-property-count checks as lower bounds against the remaining value budget, excluding the array's own `length` descriptor.
They must not double-charge children: the authoritative increment occurs once on visiting each value.
Keep getter, cycle, sparse/extended-array, nonfinite-number and unsupported-prototype refusals.
Rename only this producer quota; archive member counting is a different concept.

Acceptance: run the table at N-1/N/N+1 where the bound is valid, test 65,536 versus 65,537 shallow values, and test `null`/whole-profile false with a still-binding depth or byte limit.
For scalar cost 1, verify numeric zero is rejected as an invalid control separately from value-capacity failure.
Check repeated references and a genuine cycle separately, and prove a rejected accessor was never invoked.
Compare old/new writer outputs byte-for-byte for admitted cases; a rename must not produce a speedup claim or change resource accounting.

#### Source admission: keep populations, make them explicit

Do not collapse the existing two overlapping source counters into one or rename them both to a vague document count.
Use the following precise advanced controls; their longer names make the actual combined populations explicit without adding configurable source-kind machinery.

| Old control           | New control                             | Default     | Scope retained                                                                                                                                           |
| --------------------- | --------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maxFiles`            | `maxPhysicalAndNativeSources`           | 50,000      | Combined physical + native captures per session; the census independently enforces the same ceiling on distinct physical + native members                |
| `maxLogicalDocuments` | `maxNativeLogicalAndTransformedSources` | 100,000     | Combined native + logical + transformed captures; the census applies it to native + logical members, since transformed candidates are not census members |
| `maxFileBytes`        | `maxSourceBytes`                        | 33,554,432  | Every individual captured byte stream, including authority and transformed streams; retain Git pre-read and census identity checks                       |
| `maxTotalBytes`       | `maxTotalSourceBytes`                   | 268,435,456 | Sum of bytes captured within the native session, including logical/native/authority and rewrite candidates                                               |

| Source kind | First count | Second count | Per-source and aggregate bytes |
| ----------- | ----------- | ------------ | ------------------------------ |
| physical    | Yes         | No           | Yes                            |
| native      | Yes         | Yes          | Yes                            |
| logical     | No          | Yes          | Yes                            |
| transformed | No          | Yes          | Yes                            |
| authority   | No          | No           | Yes                            |

Census deduplication of the same physical path must not become an extra member charge; a new captured stream is still subject to capture accounting.
Keep counters in their existing owning lifecycle: policy bootstrap has its own native session; do not silently add its captured bytes to a later session's source totals.
Its retained control-object reservation is still carried into the repository session as required below.
`maxPolicyBytes` remains the earlier policy-specific ceiling; passing it does not waive source-byte or runtime limits.
Source limit overrun during complete rewrite preparation must prevent every selected batch write.
Wire/event leaf names and generated CLI flags follow these new names.

#### Installation and acquisition: changed ownership of controls

Introduce `installationControls`, accepted by `verifyJsonQualityInstallation` and its cold bootstrap, with one schema-owned definition projected into the standalone acquisition source.
It is not a repository-policy property and is not selected by `capacityLimits`.
Its fields are `maximumPackageFamilyFiles` (50,000), `maximumPackageFamilyBytes` (268,435,456), `maxCacheLookupTimeMs` (60,000), and `maxCacheOutputBytes` (1,048,576).
The package family is exactly the core package plus its selected platform companion, not arbitrary transitive application dependencies.
File counts/expanded bytes count verified regular payload files once; directory entries and tar metadata do not become files.
Archive and installed bytes are two observations of the same expected payload, not a double charge to the family total.

Retain the existing `verificationControls` profile and every existing default, including `maximumMembers: 8192`, `maximumMemberBytes: 134217728` and `maximumExpandedBytes: 536870912`.
For each archive, apply the minimum of its verification count/expanded-byte limit and the remaining installation-family count/byte budget; then update family usage once after that package is verified.
Use checked integer arithmetic and reject a declared oversized member before reading it where possible; enforce streamed lengths too.
The defaults therefore still impose 8,192 regular files per archive, 128 MiB per regular member, and 256 MiB across the core/native family (hence at most 256 MiB for either archive).
The 50,000 family file cap remains even though the two default per-archive limits are tighter.
Retain SRI/member hashes, installed-tree observations, selector/platform checks and path/link refusal when quotas are removed.

Remove `capacityLimits` from `InstallationVerificationOptions` after migrating its consumers; source limits must no longer affect binary payload admission or cache lookup.
Move `maxAcquisitionTimeMs` (1,200,000) to an `acquisitionControls` definition used only by the explicit cold installation operation.
Remove `maxAcquisitionTimeMs`, `maxCacheLookupTimeMs` and `maxCacheOutputBytes` from source `capacityLimits` and native source projections; the latter two now belong to installation cache lookup.
Retain source `maxToolTimeMs`/`maxToolOutputBytes`, which still govern formatting/report operations, and Git supervision controls.
Cold acquisition reads `JSON_QUALITY_ACQUISITION_CONTROLS`, `JSON_QUALITY_INSTALLATION_CONTROLS` and `JSON_QUALITY_VERIFICATION_CONTROLS`, each for its named scope; it no longer reads or forwards `JSON_QUALITY_CAPACITY_LIMITS` as installation authority.
A source-check environment setting may coexist but has no installation effect.
Validate every operation-specific environment value before creating scratch or invoking npm; reject old keys inside those new objects.

Each profile uses existing resolution rules: omission/`true` selects its own defaults, an object overrides named fields only, field `null` removes only that bound, and profile `false` removes that profile's quotas only.
Numeric overrides over a disabled source group retain the existing explicit re-enablement semantics.
No settings in another profile are changed as a side effect.

| Selection                      | Required consequence                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| Source `capacityLimits: false` | Source admission quotas removed; installation and archive defaults remain                        |
| `installationControls: false`  | Family and cache-lookup quotas removed; per-archive verification and acquisition deadline remain |
| `verificationControls: false`  | Archive verification quotas removed; family and cache-lookup quotas remain                       |
| `acquisitionControls: false`   | Acquisition deadline removed; selected installation and verification quotas remain               |
| One field set to `null`        | Only that field is unlimited; omitted siblings retain their own defaults                         |

Manual migration of old explicit settings must preserve their former effects when desired: old `maxFiles` maps to both source `maxPhysicalAndNativeSources` and installation `maximumPackageFamilyFiles`; old `maxTotalBytes` maps to both source `maxTotalSourceBytes` and installation `maximumPackageFamilyBytes`.
Old cache/acquisition settings move to the profiles above; old `maxFileBytes` and `maxLogicalDocuments` map only to source controls.
An old install-time `capacityLimits: false` becomes `installationControls: false` plus `acquisitionControls: false` only where both effects were actually intended by that invocation; retain its independently selected verification controls.
Do not silently infer these owner decisions from a historical file or implement a compatibility translator.

Acceptance: prove the source-kind matrix and byte boundaries with real captured sources; test early declared-length and late chunk overruns, duplicate census sightings and later rewrite-candidate refusal with zero writes.
For installation, use two verified fixture archives to test the remaining family budget, default-effective-bound equivalence, independent null/false overrides and a large native binary unaffected by a tiny source-byte setting.
Test cache lookup time/output and acquisition deadline forwarding separately, including new environment names and old installation option rejection.
Regenerate schema, native resource headers, standalone bootstrap defaults, event snapshots and declarations from their single owners; no duplicate numeric catalog is permitted.

### 4.7 Safe policy snapshots: changed admission behavior

Remove the public `admitJsonPolicy` export in the new cohort.
The public operation is synchronous `resolveJsonQualityPolicy(configuration?, options?)`, returning a complete deeply frozen `JsonQualityPolicy` without filesystem I/O, source parsing or native acquisition.
`options` accepts the existing `capacityLimits` and `runtimeControls` groups for invocation-owned bootstrap ceilings; do not let the unadmitted configuration raise the limits used to admit itself.
Keep `assertValidJsonQualityPolicy` private, returning no policy snapshot: it validates a complete owned policy and throws on failure.
The public resolver owns sparse validation, defaults, snapshot independence and final freeze; no public “skip validation” or “already trusted” option is added.

Implement the boundary in this order:

1. Admit the resolver's small closed options record and both nested control groups without reading getters: reject proxies first, inspect only data descriptors, allow only the fixed recognized option/field names and boolean/finite-integer/null control forms. Apply the same prototype/accessor/symbol/non-enumerable rules as configuration.
   The option shape has a fixed field count and nesting bound; it cannot authorize its own admission.
   Resolve invocation defaults before inspecting configuration.
   `undefined` means absent configuration; `null`, arrays and non-plain configuration root objects fail.
2. Traverse configuration iteratively through own property descriptors.
   Reject functions, symbols, bigint, undefined property/element values, nonfinite numbers, negative zero, ill-formed strings, accessors, custom prototypes/serialization, sparse arrays, extra array properties, and non-enumerable properties except an ordinary array's intrinsic `length`.
   Ordinary and null-prototype records are allowed; arrays use the ordinary array prototype.
   Detect ancestor cycles; repeated non-cyclic objects are copied per occurrence.
3. In this Node package, reject a Proxy before any reflective access using the maintained `node:util` `types.isProxy` capability, including nested/revoked proxies. Do not claim ordinary JavaScript reflection can safely inspect an arbitrary Proxy. Keep a zero-hit trap/accessor test.
   Use safe property definition or null-prototype records for copies so names such as `__proto__` cannot change their prototypes; the closed schema subsequently rejects unsupported fields.
4. Account exact UTF-8 control-serialization bytes, container depth and value occurrences while inspecting, before allocating the encoded copy or an unbounded clone.
   Use `capacityLimits.maxPolicyBytes` and `runtimeControls.maxNestingDepth`.
   Container depth matches strict parsing: a scalar has zero container depth; `{}` and `{ "a": 1 }` have depth 1; `{ "a": [] }` has depth 2.
   This differs from producer `maximumDepth` and must not reuse the producer's root-zero traversal counter blindly.
   Use the existing conservative control workspace formula as the shared starting authority: encoded bytes times 5 plus value-node count times 256.
   A standalone resolver checks the sum of simultaneously live copy/merge estimates against the selected `maxManagedMemoryBytes` before allocation; this is a per-call conservative workspace preflight, not a native-ledger reservation, measured JS heap ceiling or cross-call/session memory account.
   Avoid integer overflow and account each additional live copy separately.
5. After successful descriptor admission, construct an independent data-only snapshot without invoking caller `toJSON`, getters or coercions.
   Validate the sparse schema with Ajv defaults/coercion/removal disabled, apply the deterministic merge rules in section 4.1, then assert the complete effective schema and path-domain rules.
   Unknown fields, contradictions and unsupported versions fail before a session opens its content producers.
6. Recheck the resolved result's byte/depth/workspace bounds, then deeply freeze all result records and arrays iteratively.
   Never freeze or mutate the caller's objects.
   End standalone temporary accounting on return; direct library callers own the result's JavaScript lifetime and receive no native reservation token.
   Repository bootstrap uses the separate real reservation lifecycle below.

`src/native-control.js` is a reuse seam, not a ready-made implementation of this contract: today it is recursive, can serialize array holes as null and omit unsupported properties, and does not supply the independent depth/workspace admission above.
Share plain-control inspection/byte accounting where semantics agree, but preserve existing native transport encoding and protocol-envelope constraints for its other consumers.
Do not introduce a second payload JSON parser or use producer quotas to give configuration an undocumented 65,536-value cap.
Finite source/control limits can be disabled through their existing explicit profile semantics; physical JavaScript representation limits still fail explicitly, and the API must not claim a whole-process RSS ceiling.
Check a finite `maxCheckTimeMs` at bounded traversal/merge steps; bootstrap passes its remaining operation allowance rather than resetting the deadline for each phase.
The standalone resolver creates no scratch, so scratch quotas do not imply a disk-backed fallback for this JavaScript object operation.

Filesystem and Git configuration still pass through the strict native byte/duplicate-name reader and `materializeControl` before policy resolution.
Reuse `policy-bootstrap.js` ownership transfer and the repository controller's adoption of `controlStateReservationBytes`.
Before bootstrap allocates extra snapshot/merge/result copies, reserve their conservative incremental workspace in the same native allocation ledger while the parsed-input materialization lease is still live.
Extend the existing private control-reservation operation if necessary; a JavaScript estimate alone is not a reservation.
Keep the parsed-input and output reservations distinct, release temporary/input charges after they become unreachable, transfer exactly the retained resolved-policy charge, and adopt it in the main repository core before pulling content producers. Release every acquired charge on schema/merge/freeze failure.
This is a required change to admission ownership, not a documentation claim about existing code.
If an internal path avoids a redundant copy of an already owned snapshot, keep that path private and prove no caller alias survives; charge simultaneous parsed input and resolved output until the former is released.
Missing configuration still incurs the owned resolved-policy reservation; zero bytes of configuration is not zero policy workspace.
Retain source authority observations separately from the new policy object.

Acceptance cases: absent/empty/sparse/full equivalent input; nested caller mutation after return; attempted nested result mutation; two concurrent sessions; getters/toJSON/proxy traps never called; cycles versus repeated references; holes/extra array keys/symbol/non-enumerable/custom-prototype/negative-zero refusal; exact byte and depth boundaries; workspace exhaustion during merge; unsupported schema markers and conflicting exceptions; no `RangeError` caused by recursive traversal on deep input.
Use actual native configuration bootstrap for malformed bytes and decoded duplicate names; a JavaScript object cannot represent that negative case faithfully.
The supported Proxy detector is documented by [Node.js](https://nodejs.org/api/util.html#utiltypesisproxyvalue); qualify its use through the existing supported runtime matrix.
Include nested and revoked proxy cases in both configuration and options.
Reject an own or inherited `toJSON` descriptor before any encoding, including a custom descriptor installed on an otherwise accepted prototype.
Inputs from a caller remain caller-owned allocations; neither standalone preflight nor bootstrap reservation claims to bound pre-existing caller objects or whole-process RSS.

### 4.8 Diagnostic identity migration: preserve rules, change observable contracts

Compute the same decoded key properties as today using the existing ECMAScript trim predicate.
Do not add trimming, case folding, visual-confusable checks, domain key validation or implicit rewriting.
Adopt the following live-cohort partition:

| Condition                                                                        | Cohort-4 rule/message                                                                                 | Required behavior                                                                                       |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Empty key with an exact admitted empty-key pointer                               | No empty-key finding                                                                                  | Existing exception only; other checks still run                                                         |
| Empty or trim-whitespace-only key not admitted                                   | `json-quality/no-empty-keys` / `emptyKey`                                                             | Error; emit once, regardless of whether unrelated empty-key exceptions exist                            |
| Nonempty key with leading/trailing trim whitespace, not whitespace-only          | `json-quality/no-surrounding-key-whitespace` / `whitespace`                                           | Error; preserve source bytes and location                                                               |
| Unicode noncharacter                                                             | `json-quality/no-unicode-noncharacters` / `noncharacter`                                              | Same error and `codePoint` evidence for keys and string values                                          |
| NFC drift, enforced collision or preservation mismatch                           | `json-quality/nfc-strings` with existing `unnormalized`, `collision`, `preservationMismatch` messages | Same severity, exemptions and strict collision behavior, with the separately specified repair predicate |
| Distinct decoded keys become equal only under NFC while preservation is selected | Event `nfc-key-collision-risk`                                                                        | Non-blocking advisory; not an error finding and not a normalization permission                          |

Consolidate the live empty-key partition deliberately: the current `json/no-empty-keys` branch and `json-quality/meaningful-keys` / `empty` branch both map to the new empty-key identity above.
This is a specific exception to retaining other upstream-style diagnostic IDs; keep `json/no-duplicate-keys` and `json/no-unsafe-values` unchanged.
Change native emission, outcome predicates, presentation/repair selectors, public renderers, schema examples and current expectations together.
The format residual predicate must match the precise NFC rule/message pair, not a substring or every finding in that rule.

For every current exact expected-negative pin, record its old identity and new identity, with unchanged source hash/length/span/code point; update the configured rule/message only through that explicit mapping.
Recompute the canonical diagnostic digest through the existing digest owner using the migrated identity fields.
Do not update expected values by blindly blessing a candidate run; the mapping and independently reviewed expected findings are the oracle.
Historical finite-v1 fixtures retain their original IDs and bytes; compare through a test-only explicit identity mapping where required, never a production compatibility path.
Prove finding count/severity/locations stay equal for existing cases except the already specified new advisory and complete collision-group behavior.
Test empty strings, whitespace-only strings, surrounding whitespace, internal whitespace, exact empty-key exemptions, unmatched exemption pins, noncharacters and NFC collisions through Node-API and framed consumers.

### 4.9 Declarations, lifetimes and metadata: describe actual behavior

Generate declarations from source JSDoc and schema owners; do not patch generated `.d.ts` files alone.
Correct `nativeProviders` to `Record<string, NativeProvider>` while keeping `logicalProviders` an array of definitions/factories.
Model native provider inputs `{root, parameters, signal}` and results `authorities`, `inventory`, `documents`, optional `close` from the actual existing provider owners; model logical provider `definition`, `containerPaths`, `inventory(access)` and yielded linkage records similarly.
Do not change provider execution order, source trust, containment, completion or callback cardinality as a type fix.

Use the following public type contracts; `MaybePromise<T>` means `T | Promise<T>`, while `AsyncIterable<T>` must actually expose `Symbol.asyncIterator` and is not an eager array or a promise of a stream unless explicitly stated:

| Public type                          | Required shape                                                                                                                                                                                                                                                                    |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SourceIdentity` / `NativeAuthority` | Identity is `{sha256: string, byteLength: string}` with existing digest/canonical-decimal validation; authority adds `path: string`                                                                                                                                               |
| `NativeSourceOrigin`                 | Authority fields plus `kind: "content-addressed"`, or authority fields plus `kind: "archive-member"` and `memberPath: string`                                                                                                                                                     |
| `NativeInventoryEntry`               | `{path: string, sha256: string, byteLength: string, source: NativeSourceOrigin}`; content-addressed member identity equals its authority, while archive path is authority path plus `!/` plus member path                                                                         |
| `NativeDocument`                     | `{path: string, chunks: AsyncIterable<ArrayBufferView>}`; views including Uint8Array/Buffer are bounded to 65,536 bytes per fragment by the existing consumer                                                                                                                     |
| `NativeProviderStreams`              | `{authorities: AsyncIterable<NativeAuthority>, inventory: AsyncIterable<NativeInventoryEntry>, documents: AsyncIterable<NativeDocument>, close?: () => MaybePromise<void>}`; the three fields themselves are streams, not promises                                                |
| `NativeProvider`                     | `(input: {root: string, parameters: Record<string, JsonValue>, signal: AbortSignal}) => MaybePromise<NativeProviderStreams>`                                                                                                                                                      |
| `LogicalProviderDefinition`          | `{id: string, containerPaths: string[], minimumDocuments?: number, formatContract?: JsonFormatContract}`; container paths are a nonempty selector list, minimum defaults to zero, formatContract uses existing admitted presentation values                                       |
| `LogicalInventoryEntry`              | `{path: string, containerPath: string, pointer: string, record?: string, encoding: "utf8" \| "base64", sha256: string, byteLength: string}`; record is the existing canonical physical JSONL record number                                                                        |
| `LogicalProvider`                    | `{definition: LogicalProviderDefinition, inventory: (access: LogicalSourceAccess) => MaybePromise<AsyncIterable<LogicalInventoryEntry>>}`                                                                                                                                         |
| `LogicalSourceAccess`                | Read-only `resources`, `signal`, `capturedSource(path): Promise<SourceReference>`, and the existing scoped `select`, `describe`, `children`, `read`, `readSource`, `fragments`, `sourceFragments`, `materialize`, `materializeControl` methods with the new field/parameter names |

Derive provider field names from `src/native-provider.js`, `src/logical-provider.js`, `src/logical-inventory.js` and their native census validator.
Do not add a `close`, upload, rewrite or raw-ID method to borrowed logical access; settlement closes that borrowed view through its existing owner.
`capturedSource` rejects unavailable/out-of-scope paths rather than returning an invented reference or null. Add declaration cases for synchronous bundle/factory returns and promised bundles/streams, and negative cases for arrays masquerading as async streams and promise-valued native stream fields.

Expose precise types for `ImplementationIdentity`, resolved admission/runtime profiles, value descriptors, rewrite options, byte ranges, leases and qualification options, and export the reusable public types consumers need from the package root.
`implementationIdentity` contains `coreSourceInputsSha256`, `nodeApiVersion` and the existing ICU/Unicode/SQLite component-version object; it is not a per-session identifier.
Reference `referenceId` remains an opaque session-scoped label.
Deserializing `{kind, referenceId}` must still fail access checks; `sameReference` uses the existing private ownership state.
`resources.admission` reports the resolved `capacityLimits`; `resources.runtime` reports resolved runtime controls.
Preserve canonical decimal-string/null reporting and make the mapping explicit in types and docs.
Keep input controls as safe integers/null, independently from wire representation.

Declare `cancel(reason?: unknown): void`, matching the existing abort-reason behavior, on both session types.
It requests cancellation; it does not replace awaited `close()` or certify cleanup.
Keep close settlement and failure behavior.
Repository `check()` starts checking on iteration, can be claimed once and must reach `execution-terminal`; merely obtaining its iterator is not proof of any check.
Source check retention/event options remain separately typed and tested.
Replace generic rewrite records with a closed `RepositoryRewriteOptions` matching actual accepted keys, including the new preview option once implemented; do not invent unsupported flags to fill the type.
The concrete option set is `files?: string[]`, `transformControls?: TransformControls`, and proposed `dryRun?: boolean`; operation remains the separate `"format" | "normalize"` argument.
`dryRun: true` is accepted only for normalize in this scope; format with true fails before selection or effects.
Normalize always requires a nonempty explicit file list, including preview.
False/omission uses the existing write path; CLI `--dry-run` maps to this property.

Document lengths and leases precisely:

- `rawByteLength` is the raw JSON token span, including quotes and escape spelling.
  `byteLength` is the length of the relevant source/decoded representation; `nfcByteLength` is the NFC-derived byte length.
  `byteOffset` and `maximumBytes` count bytes of the selected representation, never code points.
- `record` is a one-based physical JSONL record number; blank records still count and produce findings.
  `recordCount` can be null when whole-source byte admission fails.
  `inventoryMemberCount` can include unmatched expected members and is not a completed-source count.
- `materializeControl` requires a completed positively checked value and caller-owned complete domain validator.
  Its lease keeps the existing reservation behavior.
  `transfer()` invalidates the lease, releases native reservation and returns the independent JavaScript value plus `managedReservationBytes` for the caller's accounting; it does not extend a native reference lifetime.
- `preserveSourcePresentation` applies only after native/logical provenance admission. An ordinary physical source must not acquire that contract from this rule, even if its textual path matches; demonstrate its existing refusal/unsatisfied-obligation outcome.
  A type/documentation edit must not broaden that permission.

Acceptance: compile a small consumer using a native provider map, a logical provider array, both check receivers, cancellation, every renamed metadata field and lease transfer; ensure array-shaped native providers and old property names fail type checks.
Run the corresponding runtime examples against the packed package, including forged/deserialized/foreign-session references, cancellation followed by close, second check claim, released/transferred lease access, and normal source access after a completed valid check.

### 4.10 Provenance names and exact hash meanings

Replace the revision-2 placeholder vocabulary with these closed public facts:

- `configurationOrigin` is a discriminated object whose `kind` is `repository-file`, `repository-absence`, `git-blob` or `git-absence`.
  Repository variants name the fixed root-relative `.json-quality.json` location; Git variants include the exact trusted `commitId`, and only `git-blob` includes `blobId`.
  Absence is an observed authority state, not an empty file.
- `defaultPolicySha256` hashes exact UTF-8 bytes of a maintained packaged default-policy artifact.
  Generate the imported deeply frozen baseline and declared digest from that owner; exclude no byte silently.
  Use the package's existing strict JSON presentation and one LF in the maintained artifact.
  Do not hash a nonexistent repository file.
- `policyResolverInputsSha256` identifies the resolver/domain-rule implementation and relevant schema/default inputs.
  Reuse the repository's source-manifest/hash machinery: maintain one sorted relative-path/digest input manifest, include all policy-affecting JS/schema/default owners, exclude timestamps and absolute checkout paths, and prove a change to any listed input changes this identity.
  Do not include the resulting digest file in its own preimage.
- `configurationBytesSha256` and `configurationByteLength` exist only for a present file/blob and identify its exact original bytes.
  Omit them for absence; do not substitute the serialization of `{}`.
  Keep the length as canonical unsigned decimal text.
- `policyInputsSha256` hashes a specified versioned ordered tuple of the preceding policy inputs; it does not claim to be a hash of the effective policy serialization.
  Do not add an `effectivePolicySha256` field in this change.

Use this unambiguous tuple preimage for `policyInputsSha256`: UTF-8 encoding, with no trailing newline, of a compact JSON array in this exact order: format tag `json-quality-policy-inputs-v1`, cohort version as a decimal string, `defaultPolicySha256`, `policyResolverInputsSha256`, origin kind, root-relative configuration path, trusted commit ID or null, Git blob ID or null, configuration byte length or null, configuration bytes SHA-256 or null.
All fields are strings or null; there are no object-key ordering decisions or JSON numbers to canonicalize.
Use the maintained control serializer after plain tuple admission and document the intentional ordered-tuple identity where required by the ESLint guard.
This is byte/provenance identity, not semantic JSON equality; no JCS dependency is added.
Two different whitespace spellings of explicit configuration can resolve to equal policies while retaining different configuration/input hashes.
Absent configuration and explicit `{}` likewise have distinct origins and input hashes.

Replace execution-event `policySha256` with these facts and migrate every freshness/evidence reader.
Freshness still compares actual current source observations or immutable Git authority, not just a self-reported digest.
The policy tuple excludes invocation resource overrides; events must separately retain resolved resources, command and core/component identity, and qualification/reuse must compare those as well.
In `qualification`, make `trustedPolicyBlobId` present only for a trusted `git-blob` origin; it must equal that origin's `blobId`.
Its absence is valid only for verified `git-absence`, never for an incomplete lookup.
Candidate commit identity is reported separately and never supplies trusted policy authority.

The origin object is closed in every variant, with the following exact required fields; other fields are forbidden, rather than optionally null:

| Kind                 | Origin object fields                                       | Sibling configuration byte identity                                    |
| -------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| `repository-file`    | `kind`, `path: ".json-quality.json"`                       | Both `configurationBytesSha256` and `configurationByteLength` required |
| `repository-absence` | `kind`, `path: ".json-quality.json"`                       | Both forbidden                                                         |
| `git-blob`           | `kind`, `path: ".json-quality.json"`, `commitId`, `blobId` | Both required                                                          |
| `git-absence`        | `kind`, `path: ".json-quality.json"`, `commitId`           | Both forbidden                                                         |

Repository origins are relative to the invocation's admitted root; persisted evidence must retain that root/context separately.
Do not insert an absolute path or imply this event alone globally identifies a repository.
Maintain packaged `assets/default-json-quality-policy.json` and `assets/json-quality-policy-inputs.json` as the default-byte and resolver-input authorities, add them to package membership checks, and regenerate their consumers through existing build/evidence owners.
The latter is the compact UTF-8 JSON tuple `["json-quality-policy-resolver-inputs-v1", entries]` followed by one LF, where `entries` is the sorted array of `[repositoryRelativePath, lowercaseSha256]` pairs.
Sort by ordinal path text after slash normalization; no locale ordering, timestamps, absolute paths or self-entry.
`policyResolverInputsSha256` hashes those exact manifest bytes, including LF.
Package verification binds the manifest to the shipped files; consumers and qualification can independently regenerate the same list/digests.
Use fixture mutations of each declared input to test regeneration drift, including default bytes and the sparse/effective schema owners. Check that imported policy-semantic dependencies are covered by the manifest rather than allowing a newly added helper to escape its input inventory. Native semantics remain separately bound by the recorded core/component identity.

Acceptance: independent literal tuple/hash vectors for all four origins; absence versus `{}`; same policy with different source bytes; resolver/default/schema input mutation; Git blob/commit mismatch; omitted present-source digest; fabricated absent-source digest; current policy races; and old event-shape rejection.
Freeze an independently computed expected vector in tests rather than calling the production encoder to compute both sides.

## 5. Requirements and acceptance criteria

| Requirement                                  | Acceptance criterion | Required observable proof                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-001: dependency-only use                 | AC-001               | A fresh supported Git consumer has only a private manifest declaring the package as a dev dependency plus authored JSON; exact installed commands succeed without scripts, config or adapter                                                                                                                                                 |
| REQ-002: optional strict config              | AC-002               | Proven absence and `{}` resolve defaults; malformed/duplicate-key/invalid/unreadable/nonregular config returns error without fallback or source writes                                                                                                                                                                                       |
| REQ-003: sparse deterministic policy         | AC-003               | Exception-only and equivalent explicit current-cohort inputs yield equal contracts; unsupported fields and contradictory explicit overlaps fail                                                                                                                                                                                              |
| REQ-004: single immutable authority          | AC-004               | CLI, repository API and Git qualification agree on defaults; nested mutations and later caller mutations cannot alter current or concurrent sessions                                                                                                                                                                                         |
| REQ-005: truthful authority freshness        | AC-005               | Present-to-absent, absent-to-present, replacement and malformed-policy races prevent a successful final verdict or subsequent write under stale authority                                                                                                                                                                                    |
| REQ-006: complete ordinary discovery         | AC-006               | Tracked, hidden, untracked and ignored owned JSON remain obligations; external dependency metadata is pruned; tracked files under excluded ancestors remain checked and write-protected                                                                                                                                                      |
| REQ-007: producer ownership                  | AC-007               | Real npm-generated locks pass the selected producer presentation/empty-key contract and stay byte-identical through generic writes; malformed lock content still fails                                                                                                                                                                       |
| REQ-008: presentation-only format            | AC-008               | Independent token meaning, key order and exact number-lexeme comparisons survive format; repeated format is byte-idempotent; non-NFC strings remain unchanged                                                                                                                                                                                |
| REQ-009: explicit NFC repair                 | AC-009               | Check reports NFC drift; normalize changes only eligible spans; normalization collisions and pinned identities prevent effects; both mixed-repair orders converge                                                                                                                                                                            |
| REQ-010: strict/interoperable profile        | AC-010               | Independent positive/negative cases cover syntax, UTF-8/BOM, decoded duplicates, scalar validity, noncharacters, meaningful keys and numeric boundaries with stable findings                                                                                                                                                                 |
| REQ-011: resource and lifecycle preservation | AC-011               | Resolution, parsing and repair retain quota precedence, bounded materialization, cancellation, spill ownership and cleanup; no terminal on incomplete delivery                                                                                                                                                                               |
| REQ-012: optional advanced providers         | AC-012               | Empty provider input works normally; declared missing/mismatched providers still fail; repository-controlled data never imports provider code                                                                                                                                                                                                |
| REQ-013: coherent public contracts           | AC-013               | New schemas compile offline, generated types match, all exports ship, cohort mismatches are rejected, and current docs/examples execute against the candidate                                                                                                                                                                                |
| REQ-014: installed consumer evidence         | AC-014               | Exact packed and later registry bytes execute the no-config CLI cases on every required platform/runtime lane; omission of any required case invalidates evidence                                                                                                                                                                            |
| REQ-015: trust and workflow continuity       | AC-015               | Trusted Git policy absence uses package defaults at the trusted authority; candidate config never controls qualification; both install layouts and deliberate CI gates remain required                                                                                                                                                       |
| REQ-016: supportable adoption and recovery   | AC-016               | Migration examples, version/cohort guidance, remaining-quality output, source preimage recovery and publication limitations are documented and independently reviewed                                                                                                                                                                        |
| REQ-017: deliberate Unicode preservation     | AC-017               | Missing config enforces NFC; global/path preserve and path re-enablement resolve deterministically; format preserves decoded sequences, normalize refuses preserved selections, exact duplicates still fail and advisory risk alone does not fail check                                                                                      |
| REQ-018: inspectable collision-safe repair   | AC-018               | Preview and write share candidate preparation; all same-object normalized collisions are reported with both locations; enforced collisions in a normalization batch abort preflight with zero writes, while preserve-mode advisory alone does not fail check/format; preview completeness and later freshness are independently demonstrated |
| REQ-019: versioned, idempotent normalization | AC-019               | Native ICU/Unicode identities appear in normalization evidence; official matching conformance tests and repeat-normalize byte equality pass; stale-version previews are not reused                                                                                                                                                           |

Each acceptance criterion is conjunctive: passing its happy-path example does not waive its negative cases or the linked quality scenario.
Quality exceptions retain visible diagnostics; the plan does not make expected-negative fixtures intrinsically valid JSON.

Revision 3 adds these requirements and acceptance criteria:

| Requirement                                 | Acceptance criterion | Required evidence                                                                                                                                                                                                                 |
| ------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-020: precise exposed vocabulary         | AC-020               | Every NAME-001 through NAME-021 and CONTRACT-001 through CONTRACT-007 has its section-4.5 disposition implemented, including scripts and optional-name decisions; old/current mappings and unchanged behavior proofs are retained |
| REQ-021: aggregate producer budget          | AC-021               | Root-inclusive count table, repeated references, cycles, exact limits, default 65,536, null/false and independent byte/depth constraints pass under `maximumTotalValues`; archive member semantics remain unchanged               |
| REQ-022: operation-scoped resources         | AC-022               | Source-kind count/byte matrix and installation/acquisition split match section 4.6; effective default bounds are unchanged; explicit overrides cannot cross scopes and migrated dual-effect overrides are documented              |
| REQ-023: safe policy snapshot boundary      | AC-023               | Section 4.7 procedure rejects executable/lossy input before evaluation, enforces byte/depth/workspace accounting, freezes independent results and transfers only correctly owned reservations                                     |
| REQ-024: truthful diagnostic identities     | AC-024               | Section 4.8 condition table has exact positive/negative results; live pins/digests migrate by reviewed identity mapping, detection/severity do not drift and historical oracle bytes are unchanged                                |
| REQ-025: usable public structural contracts | AC-025               | Packed TypeScript and runtime consumer examples agree on provider shapes, cancellation, check laziness, scoped references, byte units, counts and lease lifetime; section 4.9 misuse cases are rejected                           |
| REQ-026: exact policy provenance            | AC-026               | Independent section-4.10 tuple vectors and origin/absence rules pass; default/resolver/schema changes invalidate the input identity; present/absent hash forgery and old event shapes are rejected                                |

## 6. Domain invariants and quality scenarios

The domain invariants are one strict parser/rule authority; package-defined presentation; numeric lexeme and member-order preservation; no implicit string mutation; complete source/provider accounting; source observations before effects; bounded owned memory/storage; no runtime acquisition; and independent consumer ownership of domain meaning.
Neither sparse config nor operation-specific repair may turn these invariants into user-selectable lint preferences.

| Scenario                                 | Stimulus and environment                                                                                                                          | Required response and measure                                                                                                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QA-001: zero-config onboarding           | Empty Git consumer receives the packed package with optional dependencies enabled                                                                 | Exact public commands run; no config/script/adapter generated; installed binary/package identity recorded                                                                                                            |
| QA-002: config admission                 | Missing, empty, truncated, duplicate-key, unknown-field, permission-denied and directory/symlink policy inputs                                    | Only proven absence defaults; every invalid present input fails before effects                                                                                                                                       |
| QA-003: policy race                      | Create/remove/replace policy between bootstrap, capture, preflight and final observation                                                          | No stale success; no writes after the changed authority is detected; report any prior committed paths truthfully                                                                                                     |
| QA-004: shared-state isolation           | Two overlapping sessions resolve different sparse inputs; caller mutates nested arrays                                                            | Stable independent contracts and unchanged default bytes; no cross-session leakage                                                                                                                                   |
| QA-005: complete discovery               | Nested dependencies, tracked excluded children, hidden/ignored JSON, unsupported dialects, case aliases                                           | All owned obligations retained; external subtrees pruned; zero protected writes and no path escape                                                                                                                   |
| QA-006: formatting preservation          | Escapes, `-0`, `1.00e+2`, key-order variants, long strings and decomposed Unicode                                                                 | Exact token-based value/number/order equivalence and idempotence, with NFC drift still visible                                                                                                                       |
| QA-007: normalization safety             | Composed/decomposed keys collide, or a value has an exact preservation pin                                                                        | Collision/preservation refusal before effects; for admitted repair only recorded spans differ                                                                                                                        |
| QA-008: mixed repair and peers           | Selected source has presentation plus NFC drift; unselected peer separately fails safety                                                          | Both isolated mixed-repair orders converge; unsafe peer still refuses the batch; no blanket quality bypass                                                                                                           |
| QA-009: numeric/Unicode boundaries       | Chunk-split escaped keys, every noncharacter class, invalid surrogate sequences, huge exponents and binary64 edges                                | Stable native diagnostic identities without JavaScript number conversion or unbounded exponent expansion                                                                                                             |
| QA-010: finite resources                 | Large sparse config, deep input, cancellation, exhausted output budget or spill failure                                                           | Retained control charges and finite defaults apply; cleanup settles; failure remains incomplete, never pass                                                                                                          |
| QA-011: guarded replacement              | File/permissions change, interrupted staged write, rename or final-observation failure                                                            | Existing per-file guarantees hold; confirmed writes and uncertain path are accurate; no atomic-batch claim                                                                                                           |
| QA-012: Git authority                    | Trusted commit lacks config; candidate contains a permissive config/provider declaration                                                          | Trusted package defaults apply; candidate file is data; no execution of candidate code or policy                                                                                                                     |
| QA-013: transported installation         | Every supported consumer lane installs the same archive family in root and isolated layouts                                                       | Zero-config cases run through npm's installed binary; no global/cache substitution; missing/mixed native payloads fail clearly                                                                                       |
| QA-014: evidence integrity               | Delete, duplicate, forge or stale one zero-config result; vary default or cohort identity                                                         | Ordinary CI, reuse and release readers reject incomplete/mismatched evidence                                                                                                                                         |
| QA-015: preservation override            | Global preserve, narrow preserve under NFC, NFC path override under global preserve, and a mixed preserved/NFC normalize selection                | Values remain unchanged; exact duplicates fail; canonical-only key equivalence is advisory; normalize and its preview refuse preserved selections before any batch write; eligible NFC-only selection still succeeds |
| QA-016: collision groups                 | Two/three normalized-equivalent names, later exact duplicates, reversed order, equal values, forced digest bucket, separate objects/JSONL records | No overwritten collision evidence, false hash collision or cross-object conflation; zero selected-batch writes on enforced collision                                                                                 |
| QA-017: no-write preview                 | Mixed source strings/keys, long names, protected selections, collision, cancellation and output-quota exhaustion                                  | Accurate bounded changes and distinct complete/incomplete/refused preview terminal; zero source writes and no stale preview authorization                                                                            |
| QA-018: Unicode identity and idempotence | Official version-matched corpus, Hangul, reordered/long combining runs, repeated normalize and a changed Unicode build                            | Correct native normalization and collision results, byte-idempotence, declared identities and new evidence after version changes                                                                                     |
| QA-019: workload-dependent cost          | Re-run the retained Google sample plus ASCII/NFC/NFD and Unicode-key-heavy controls on the final implementation                                   | Separate default-vs-explicit NFC, preserve, preview and actual-write costs; inspect paired timing ranges and native memory/spill; no unsupported speedup or constant-overhead claim                                  |

Revision 3 adds the following discriminating scenarios:

| Scenario                           | Stimulus                                                                                                                            | Required response and measure                                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| QA-020: rename equivalence         | Run the same consumer operation before/after one R mapping with translated control names                                            | Same accepted/refused inputs, values, source bytes, effects and cleanup; only declared public labels change                   |
| QA-021: producer counting          | Scalar/empty/nested/repeated-reference inputs at the exact value boundary, then one value over                                      | Counts match section 4.6; no root subtraction or identity deduplication; overflow refuses before serialization effects        |
| QA-022: scoped resource admission  | Tiny source limits with valid native installation; finite family limit with unlimited archive limit; late capture/candidate overrun | Profiles remain independent, defaults remain conservative and no over-limit prepared batch writes                             |
| QA-023: hostile control objects    | Getters, toJSON, proxies, cycles, holes, malformed values and oversized/deep merge results                                          | Zero callback/trap invocation, explicit admission failure, no recursive-stack error, no leaked mutation or reservation        |
| QA-024: diagnostic migration       | Empty/whitespace keys, existing pins, noncharacters, NFC findings and preservation advisory                                         | Exact new identities and reviewed digests; unchanged strict outcomes; advisory never becomes an error or write permission     |
| QA-025: facade lifetime and typing | Typed provider map/array, lazy repository check, foreign reference, cancellation and lease transfer                                 | Types match runtime; no fabricated capabilities, cleanup claims or usable released lease                                      |
| QA-026: provenance vectors         | Equivalent policy from absent/empty/differently spelled inputs plus altered resolver/default/schema owner                           | Equal policy can have distinct provenance; specified hashes change on the right inputs and evidence readers reject mismatches |

These are acceptance targets, not reported measurements.
Performance acceptance preserves existing budgets and bounded-memory guarantees; measure no-config startup and mixed-repair costs against the same-machine baseline before setting any new numerical SLO.
An unexplained material regression or unbounded growth blocks completion even if a small fixture passes.
Revision 2's [performance assessment](2026-11-01-nfc-performance-assessment.md) supplies a measured current-path baseline and explicitly unmeasured future costs; it does not qualify the proposed resolver, advisory event or preview implementation.

## 7. Architecture, reuse and rule ownership

### 7.1 Architectural seams and DRY-01 decisions

Paths below are likely change locations, not a commitment to their final decomposition or predicted line numbers.

| Shared rule and current authority                                                                  | Current consumers and boundary                                                    | Proposed strategy / drift control                                                                                                                                                |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Config admission and path contracts: `src/configuration.js`, configuration schema                  | Bootstrap, repository execution, source contracts, qualification, generated types | Add sparse admission plus resolved-policy validation around one resolver; separate shared schema definitions from distinct input/effective shapes without two editable rule sets |
| Default presentation: `src/json-format-options.json` and native presentation implementation        | Prettier writes, streaming native checks, examples                                | Keep fixed package options; preserve independent expected bytes and cross-implementation conformance tests rather than making the oracle import the new resolver                 |
| Resource defaults: schema `$defs`, `src/resource-profile.js`, `scripts/project-resource-limits.js` | CLI controls, execution bootstrap, native generated limits                        | Retain schema projections and current precedence; effective-policy resolution must not create another numeric default catalog                                                    |
| Policy authority: `src/policy-bootstrap.js`, `src/repository-source.js`                            | Execution events, final checks, rewrite freshness, immutable Git qualification    | Introduce an explicit present/absent origin and shared recheck boundary; filesystem absence and immutable Git absence have distinct validation mechanisms                        |
| Strict and Unicode/numeric rules: native document/decimal/Unicode owners                           | Node-API, framed executable, raw source, physical/logical/native sources          | Keep native derivation; add conformance cases, not JS regex/DOM shadow validators                                                                                                |
| Repair eligibility: `native/core/source_outcome.hpp`, `session.hpp`, `source_rewrites.hpp`         | Writer preflight, candidate binding, peer admission, JS orchestration             | Derive operation-specific predicates once from completed findings; native enforcement remains independent of caller claims                                                       |
| Physical discovery and protection: repository discovery/path/observation owners                    | Check, rewrite, provider authorities                                              | Reuse census and containment; package presets feed the same matcher; retain tracked protection and write-time checks                                                             |
| Public contracts: cohort/schema sources and `scripts/build-types.js`                               | SDK types, event validators, native manifests, pack probes                        | Generate projections; migrate all current consumers coherently; preserve immutable historical oracle copies as evidence                                                          |
| Installed evidence: `scripts/qualify-package.js`, `consumer-layouts.js`, CI/release readers        | Ordinary qualification, PR acceptance/reuse, release registry admission           | Extend existing evidence with observed case results; preserve root/isolated comparison and remove hard-coded export-count assumptions coherently                                 |

The public resolver operates on data; loading native components and reading the filesystem stay outside it.
The existing bootstrap owns strict parsing, object reservation and transfer into execution.
For resolved output, account for defaults plus merged user state, not merely the smaller sparse input byte count.
Keep bootstrap/main native lifetimes nonoverlapping and avoid an uncharged temporary second effective object.

Intentional independent representations remain: native presentation versus finite Prettier formatting; immutable finite-v1 oracle versus current implementation; generated JS/C++ resource views; immutable Git versus filesystem observations.
They have different execution/trust or test-oracle responsibilities.
Conformance tests and generated drift checks control shared meaning; do not consolidate them into a new cross-language policy service.

### 7.2 Policy identity and absence are first-class facts

Current `admitted.observation.sha256` and unconditional rewrite rechecks cannot simply receive `undefined`.
Model at least a package-default origin and a repository-file origin, each bound to the current resolver/default/cohort identity.
Implement `configurationOrigin`, `defaultPolicySha256`, `policyResolverInputsSha256`, optional `configurationBytesSha256` / `configurationByteLength`, and `policyInputsSha256` exactly as specified in section 4.10.
That section fixes the names, origin variants and preimages; do not retain revision 2's placeholder vocabulary or label synthetic bytes as a nonexistent file's hash.
An absent local config and an explicit `{}` may yield identical effective contracts while retaining different provenance identities.

Use a documented versioned input-identity encoding over package/default authority, cohort and explicit configuration bytes or an absence marker, reusing existing hash/identity mechanisms where suitable.
The ordered tuple in section 4.10 is that encoding; do not design a second representation in the event producer or release reader.
Do not use arbitrary `JSON.stringify` equality as a semantic identity proof or introduce JCS as an incidental dependency.
Bind changes in built-in rules to qualification/reuse identity so old results cannot qualify a changed default profile.

Observe absence only at the exact safe policy pathname beneath an admitted root.
Do not catch any later `ENOENT` from a partially observed/read file and reinterpret it as initial absence.
Recheck presence/absence at the same authority checkpoints as an existing file, before the final repository verdict and before/after write effects.
Directory observations help but do not replace explicit policy authority checks, especially when own staged writes change directory metadata.
The documented hostile-concurrency limit remains; avoid claiming transactional filesystem exclusion.

For immutable Git qualification, derive absence from the complete trusted commit tree lookup.
Never fall back to candidate policy bytes or working-tree state.
The built-in default remains package authority even if the candidate adds `.json-quality.json`; candidate content is still checked as ordinary JSON.

### 7.3 Source-backed software selection and rights

The supplied research, current owners above and the primary sources below support extending the existing composition.
On 2026-11-01, read-only `npm view <package> version license --json` returned Prettier `3.9.10`, Ajv `8.20.0`, `@eslint/json` `2.1.1`, and Biome `2.6.4`.
Prettier and Ajv match the exact runtime versions in this checkout.
These are checked-at registry observations, not permission to float versions during implementation.

| Candidate                           | Fit and limitation                                                                                                                 | Selection and rights status                                                                                                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing native core with Boost/ICU | Already owns strict streamed admission, exact decimals, NFC and bounded storage; has the source facts needed for repair predicates | Retain and extend the owner. Current recorded native versions are Boost 1.92.0, ICU 79.1/Unicode 18, SQLite 3.54.1 and double-conversion 3.4.0; upstream freshness was not requalified during planning          |
| Prettier 3.9.10                     | Existing finite formatter and fixed public options; does not own census, Unicode quality or guarded replacement                    | Retain supported API and independent native candidate proof; installed MIT license text inspected; preserve notices                                                                                             |
| Ajv 8.20.0                          | Existing offline closed-schema consumer; schema validation is separate from policy merging                                         | Retain strict 2020-12 validation without data mutation; installed MIT text inspected; preserve notices                                                                                                          |
| `@eslint/json` 2.1.1                | Maintained JSON/JSONC/JSON5 languages and rules; useful existing independent finite oracle                                         | Retain development-only role; not a replacement for bounded native capture or physical/provider census; recorded Apache-2.0 notice retained                                                                     |
| Biome 2.6.4                         | Maintained formatter/linter alternative with explicit JSON options                                                                 | No demonstrated fit for this package's capture, exact-lexeme and guarded-write contract sufficient to justify replacing the current engine; not adopted; license metadata alone is not redistribution clearance |
| Node/npm built-ins                  | Installed dependency bin resolution, paths, filesystem observations and hashing already serve the required boundaries              | Use supported native APIs/CLI; no bootstrap framework, config-search package, generic deep-merge package or new dependency resolver                                                                             |

The residual custom work is package-specific policy resolution, authority provenance, native repair admission and existing qualification integration.
For revision 2 it also includes reusing the native candidate preparation as a no-write preview and separating preservation-risk events from quality findings; Unicode normalization itself remains the existing ICU-backed owner.
No new third-party runtime dependency is proposed.
Do not describe this as proving no other tool could ever meet the requirements.
Before materially extending or replacing native dependencies, refresh exact upstream releases, support, APIs, license texts and packaged notices through the existing producer/rights workflow; an unresolved selection/rights gap blocks that adoption, not independent documentation.
The repository is AGPL-3.0-only; technical selection, existing notices and release rights clearance remain separate evidence.

Primary sources refreshed for this plan:

- [npm exec documentation](https://docs.npmjs.com/cli/v11/commands/npm-exec/): local dependency binaries are available, and explicitly naming the binary avoids multi-bin inference.
  The harness must prevent unintended npm acquisition during execution.
- [Ajv options](https://ajv.js.org/options.html): default insertion and coercion are optional data-changing behaviors; keep both disabled and perform an explicit resolver step.
- [RFC 8259](https://www.rfc-editor.org/info/rfc8259/): strict JSON, interoperability considerations and permitted implementation limits.
  BOM rejection here is a stronger authored-source convention, not a claim that every compliant parser must reject a BOM.
- [RFC 7493](https://www.rfc-editor.org/info/rfc7493/): decoded duplicate-name, Unicode and numeric interoperability basis.
  Empty/whitespace keys, NFC and the package's subnormal policy are additional product conventions, not universal JSON requirements.
- [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785.html): string preservation and canonicalization explain why JCS is a separate capability, outside this plan.
- [Unicode normalization specification, revision 58](https://www.unicode.org/reports/tr15/tr15-58.html) and [ICU normalization guide](https://unicode-org.github.io/icu/userguide/transforms/normalization/): use NFC rather than compatibility normalization, version-matched conformance data and supported native primitives.
  These sources were refreshed for revision 2; no JCS-conformance claim is made for NFC rewriting.
- [Prettier options](https://prettier.io/docs/options): fixed width/indent/end-of-line settings are usable package policy; print width is a target, not a hard maximum line length.
- [ESLint JSON project](https://github.com/eslint/json): explicit language modes and maintained rules support its current development-oracle role.
- [Biome configuration](https://biomejs.dev/reference/configuration/): contemporary alternative options support comparison, but its current JSON indentation default is tabs.
  Do not repeat the research's implied universal two-space consensus.

## 8. Vertical implementation slices

An integration implementer owns the combined baseline and prevents coupled contracts from landing independently.
Each slice demonstrates a complete user or assurance path; intermediate source commits need not be separately published.
No slice alone authorizes a new public release.

### SLICE-001: resolve and check a repository with no policy file

Implement the package baseline, pure resolver and sparse/effective schema distinction through bootstrap, repository execution and public types.
Make NFC the built-in value, admit the sparse preservation override, and keep normalization choice separate from explicit write protection.
Demonstrate global preserve with path NFC re-enablement and a narrow preserve exception under the default.
Include basic dependency/VCS boundaries so a normal installed tree is not mistakenly treated as authored JSON.
The first end-to-end demonstration is a safe Git fixture checked through `runJsonQualityCli` with no policy, with equivalent `{}` and explicit-current-policy controls.
Invalid present policy must fail immediately.
Carry control reservations, deep immutability and truthful default/file provenance through the event path.

Likely files: `src/configuration.js`, a small new default-policy owner if needed, `src/policy-bootstrap.js`, `src/repository-execution.js`, `src/repository-check.js`, `src/index.js`, `src/api-types.js`, configuration/effective/event schemas, `schemas/contract-cohort.json`, generated types, schema/type build scripts and focused policy/CLI tests.
Move shared schema definitions only when needed to avoid duplicated rules; do not rebuild the entire schema toolchain.

Proof: `AC-002` through `AC-004`, no-config check, nested freeze/mutation checks, offline schema admission and explicit config-error assertions.
Include negative resource-control cases and an absence-specific reservation assertion.
Implement the applicable R/D mappings and section 4.7's full boundary in this slice; prove `AC-020`, `AC-023`, `QA-020` and `QA-023` for policy input/result paths.
A clone/freeze promise is not complete with only a type rename.
Release/rollback: source-only coherent cohort candidate; no production claim until all consumers migrate.

### SLICE-002: preserve policy authority across check, write and trusted Git

Complete the provenance observation/recheck path for present and absent policy, including the rewrite policy-last logic.
Exercise check and guarded format on a clean no-config fixture, then inject policy creation/removal/replacement at deterministic observation boundaries.
Extend trusted Git qualification to use defaults only for proven absence in the trusted commit; verify candidate policy cannot take control.
Expose the final event identity through CLI/API and reject old or incomplete event shapes.

Likely files: `src/policy-bootstrap.js`, `src/repository-source.js`, `src/repository-check.js`, `src/repository-rewrite.js`, `src/qualification.js`, `src/events.js`, schema/type consumers, native policy-bootstrap/repository-rewrite/Git-qualification tests.

Proof: `AC-005`, `AC-015`, `QA-003`, `QA-011`, `QA-012`; real temporary filesystem and Git cases, including permission/nonregular errors and config appearing after initial observation.
Also implement the section-4.10 provenance schema/encoding and Git qualification names, proving `AC-026` and independent `QA-026` vectors through both repository and trusted Git paths.
Do not replace the race assertion with a mocked resolver returning a chosen answer.
Release/rollback: no defaulting path may be released while it omits a freshness consumer; restore the coherent schema/runtime family if reverting before release.

### SLICE-003: qualify ordinary npm ownership and complete discovery

Run the real install-root path with manifest, generated lock, dependency directories and authored files together.
Add built-in npm lock ownership through the shared matcher, preserving strict checks and non-writability.
Verify nested roots/workspaces, shrinkwrap, hidden/ignored owned files, required outputs and tracked excluded children.
Retain per-repository special cases rather than copying this repository's native/oracle/coverage rules into every consumer.

Likely files: package default owner, `src/configuration.js`, `src/repository-discovery.js` only where necessary, discovery/path/writer tests, new small no-config fixtures.

Proof: `AC-001`, `AC-006`, `AC-007`, `QA-005`; npm-generated lock snapshots remain byte-identical through format and normalize, malformed locks still fail, dependency JSON is not enumerated as owned content.
Release/rollback: this is required for the zero-config claim; unresolved npm serialization mismatch blocks the claim rather than just excluding lockfiles.

### SLICE-009: expose precise bounded producer and installation controls

This additive ID preserves the earlier slice identities; execute it after `SLICE-003` and before `SLICE-004`.
Demonstrate one consumer serializing a bounded plain value under `maximumTotalValues`, checking a repository under renamed source controls, and verifying the same installed package family under independent installation controls.
Implement section 4.6 end to end, including moved cache/acquisition fields, standalone bootstrap projections, environment routing and manual override migration examples.
The producer count is an R change; separation of previously shared source/installation settings is a B change even though effective defaults remain equal.
Include the hard-quota versus private-spill-target distinction and exact input/wire resource types.

Likely owners: `src/producer-json.js`, `src/resource-profile.js`, `src/execution-resources.js`, `src/installation.js`, `src/package-payload.js`, `src/acquire.js`, configuration/resource schemas and native resource/census/session owners, existing resource projection scripts, CLI/help/event types and installation/acquisition/producer tests.
Keep all new defaults in the owning schema definitions; generate the bootstrap/native views.

Proof: `AC-011`, `AC-020` through `AC-022`, `QA-020` through `QA-022`; the section-4.6 exact count and source-kind tables, preserved default installation bounds, remaining-family-budget refusal, independent profile null/false cases, cold-bootstrap forwarding, and no source-byte cap on native binaries.
Use fixture identities and actual package verification; mocks of the verdict cannot prove the scope split.
If a verifier path still reads source capacities or a native projection keeps a removed acquisition field, this slice is incomplete.
Release/rollback: source candidate only; preserve an explicit old-to-new override migration manifest and restore the whole matching profile/schema/native family if reverting unpublished work.

### SLICE-004: make separated format and normalize repairs composable

Implement `DEC-005` in the native outcome/closure/rewrite owners and both writer entry paths.
Implement `DEC-013` through `DEC-015` alongside it: complete collision groups, separate preserve-mode risk events, versioned idempotent normalization and `normalize --dry-run` through shared preparation.
Keep complete native findings and distinct quality versus operation acceptance.
Permit only the named residual condition for selected physical sources; keep complete peer/dependent contracts and collision/ownership safeguards.
Expose truthful remaining-quality state in write events and human output.
Exercise the library writer and repository CLI so one entry point cannot retain a stale all-quality or unsafe blanket predicate.

Likely files: `native/core/document_check.hpp`, `native/core/source_outcome.hpp`, `native/core/session.hpp`, `native/core/source_rewrites.hpp`, possibly closure storage in `adaptive_store.hpp`, `src/native-formatting.js`, `src/native-normalization.js`, `src/repository-rewrite.js`, `src/commands.js`, `src/cli.js`, event schema and native manifests/types.

Proof: `AC-008`, `AC-009`, `QA-006` through `QA-008`, `QA-011`; both mixed-repair orders, independent token preservation, exact changed-span checks, no writes on unsafe peers/collisions, Node-API/framed parity.
Also prove `AC-017` through `AC-019` and `QA-015` through `QA-018`, including zero writes across a mixed safe/colliding batch and risk-event delivery without false quality failure.
Rebuild matching native companions and run sanitizers on changed native paths.
Use the new permission/exemption/rule names from the start.
Implement section 4.8's diagnostic identity partition and reviewed live-pin migration alongside the predicates; prove `AC-024` / `QA-024` without broadening accepted quality failures.
Release/rollback: requires independent native and security review; abort if eligibility cannot be proven from retained facts without erasing diagnostics.

### SLICE-005: lock down the opinionated profile through every source path

Run a table-driven conformance corpus against raw source, repository physical sources and representative logical/native sources, with no config and equivalent current config.
Keep existing mandatory checks and repair only demonstrated gaps in the owning implementation.
Add focused numeric/Unicode boundary and chunk-split cases, preservation and idempotence corpus checks, plus bounded fuzz/property work using existing harnesses where available.
Include all-candidate collision permutations, deliberate digest-bucket collisions, key-heavy preservation cases and the official normalization corpus matching the actual native Unicode identity.
Keep JSONL/NDJSON framing and generic write refusals explicit.

Likely files: existing byte-admission, retained-quality, formatting, NFC, JSON-lines and native source-outcome/linked-source tests; native rule files only for reproduced gaps.

Proof: `AC-010` through `AC-012`, `QA-009`, `QA-010`; stable diagnostic assertions and exact token oracles, not a new JavaScript runtime validator.
Any proposed numerical severity or policy change beyond the preserved baseline reopens `DEC-006`.
Apply the explicit live diagnostic mapping when comparing the frozen historical oracle, and add `AC-021` through `AC-026` negative cases to the affected source/consumer paths.
Do not rewrite the oracle to obtain matching names.
Release/rollback: frozen finite-v1 oracle bytes remain untouched; update current independent expectations only for accepted deliberate semantics.

### SLICE-006: qualify the packed dependency-only CLI consumer

Add a maintained fixture/probe that invokes installed npm binaries and never imports the SDK.
The application manifest contains the package in `devDependencies` with no scripts, no ESLint dependency, no adapter and no `.json-quality.json`.
Initialize Git externally as fixture setup, install the exact transported package family with lifecycle scripts disabled, and leave npm's generated lock in the checked consumer root.
Use root and isolated layouts through existing orchestration; keep the richer API/protected-provider probe as a separate retained obligation.
The root layout is the ordinary application demonstration.
For the isolated layout, run the same minimal CLI fixture from its actual installed graph root as a separately initialized Git consumer, while retaining the existing outer-repository integration probe.
Do not imply that npm discovers a binary in an unrelated tooling subtree when invoked from the outer application root.

Execute from the actual consumer root:

```sh
npm exec -- json-quality check --root .
npm exec -- json-quality format --root . -- authored.json
npm exec -- json-quality normalize --root . -- authored.json
npm exec -- json-quality check
```

Use distinct prepared fixtures for satisfied input, presentation-only drift, NFC-only drift, mixed drift and invalid/protected input so earlier effects cannot hide missing checks.
Add the sparse global preserve override, canonical-equivalent key refusal and a zero-write preview case to the installed CLI evidence.
Freeze npm's registry/cache policy for execution, disable prompts/acquisition, and ensure the invoked `.bin` resolves to the installed candidate rather than a global or previously cached command.
The npm command path is test machinery; neither its JS launcher nor shell handling may alter the public argv under test.

The current transported installer supplies platform-package overrides and places the package in `dependencies` alongside ESLint.
Do not call that unchanged harness a minimal consumer.
For the new packed-only fixture, use external fixture registry/routing of the exact candidate archives if needed to resolve unpublished companion versions; record that limitation explicitly.
Prefer existing transport/cache capabilities or a maintained fixture service; a new registry emulator is not implicitly authorized residual work and requires its own reuse assessment.
Do not hide platform overrides or extra dependencies in the asserted application manifest.
After authorized publication, anonymous registry qualification must repeat the genuinely ordinary install with only the core dev dependency and no private routing/overrides.

Likely files: `scripts/qualify-package.js`, a separate CLI probe, `scripts/qualify-runtime.js`, `scripts/consumer-layouts.js`, consumer CI/package-probe tests, qualification workflows and relevant release evidence validators.

Proof: `AC-001`, `AC-014`, `QA-001`, `QA-013`, `QA-014`; both platforms and all policy-selected consumer runtimes, offline reinstall, missing-companion refusal, exact version/cohort/policy/command/result identity.
Extend the separate packed SDK probe with `AC-020` and `AC-025`: compile and execute new public names/types, cancellation and lease examples, while the dependency-only CLI probe remains free of SDK imports. Probe new CLI/bin/environment contracts and old-name refusal.
Release/rollback: evidence carries actual observed cases; missing/stale/duplicate results fail admission.
Preserve both existing layouts.

### SLICE-007: migrate contracts, examples and consumer guidance coherently

Complete the current-cohort migration across public exports, schemas, types, native protocol/component manifests, package membership, generated resource projections, maintained examples, qualification counts and all current source fixtures.
Update README, CLI/API/configuration/consumer guides and release notes together.
Lead with ordinary npm installation and no-config commands; label provider and hermetic acquisition paths as advanced.
Provide sparse examples, lock ownership explanation, mixed-repair behavior and a manual old-policy-to-current-policy migration example.
Include the owner's minimal preserve example, decoded-versus-byte preservation distinction, no automatic Unicode mutation by format, collision remediation, preview exit behavior and Unicode-version reporting.
Remove repeated fixed defaults from this repository's policy only after equivalent resolved contracts are demonstrated; retain runtime overrides and special ownership exceptions.

Likely files: `package.json`, `schemas/`, `types/`, type/schema/package checks, `scripts/consumer-probe.mjs`, `.json-quality.json`, `examples/policy.json`, README, `docs/api.md`, `docs/cli.md`, `docs/configuration.md`, `docs/consumer-guide.md`, `docs/architecture.md`, `docs/centralized-contracts.md`, `docs/native-protocol.md`, `docs/release-operations.md`, `CHANGELOG.md` and applicable tests.

Proof: `AC-013`, `AC-016`; exact package-export admission, generated types, old-version rejection with actionable error, runnable examples and scoped document checks.
Complete every mapping and D correction in sections 4.5 and 4.9, including scripts, workflow inputs, annotation examples, schema titles and public type exports.
Prove `AC-020`, `AC-025`, `QA-020`, `QA-025`; a search with unexplained live old names or a generic-record facade declaration is not completion.
Release/rollback: no silent v3 translation, legacy alias or dual old/new runtime entry path.
A demanded bridge requires a specific prior NSH-01 decision and revised plan.

### SLICE-008: integrate, independently verify and prepare release evidence

Freeze the accepted implementation and execute full relevant verification after all coupled consumers are updated.
Run independent verification and the required native/security assessment, resolve findings, and refresh the exact affected evidence after fixes.
Use the existing source-bound native producer, package qualification, CI acceptance/reuse and release machinery.
Prepare a release candidate and migration/recovery notes only under the subsequent delivery authorization; no version number or promotion approval is assumed by this plan.

Proof: all acceptance criteria, source/runtime/platform/archives bound to the same candidate, complete root/isolated receipts, exact zero-config cases, rights and recovery evidence.
Hosted workflow results and registry acceptance must be observed separately from local source checks.
Release/rollback: follow section 12, retaining immutable artifacts and honest partial outcomes.

### 8.1 Traceability and dependency order

| Slice     | REQ / AC               | QA                        | DEC                    | Proof                                                                 | Release / cleanup implication                          |
| --------- | ---------------------- | ------------------------- | ---------------------- | --------------------------------------------------------------------- | ------------------------------------------------------ |
| SLICE-001 | 002-004, 011, 013, 017 | 002, 004, 010, 015        | 001-004                | No-config/default/preserve CLI/API checks; schemas and resolver       | New cohort candidate; owned control charges            |
| SLICE-002 | 005, 015               | 003, 011, 012             | 001, 003, 008          | Policy races and trusted Git absence                                  | No partial freshness rollout                           |
| SLICE-003 | 001, 006-007           | 001, 005                  | 007-008                | Actual npm tree, locks and census                                     | Keep local exceptions; retain generated-lock bytes     |
| SLICE-004 | 008-009, 011, 017-019  | 006-008, 010-011, 015-018 | 004-006, 013-015       | Both repair orders, preserve advisories, preview and collision safety | Rebuild native family; retain preimages                |
| SLICE-005 | 010-012, 017-019       | 006-010, 015-019          | 004, 006, 008, 013-015 | Independent conformance, collision and performance corpus             | Frozen oracle unchanged                                |
| SLICE-006 | 001, 014-015, 017-019  | 001, 013-018              | 009-010, 012-015       | Exact installed CLI, preservation and preview cases                   | Retain archive/receipt identity; owned fixture cleanup |
| SLICE-007 | 003, 013, 016-019      | 002, 013, 015-018         | 002-004, 011-015       | Schema/type/export/example migration and NFC guidance                 | Coordinated config/package adoption                    |
| SLICE-008 | 001-026                | 001-026                   | 001-021                | Full relevant and independent evidence                                | Separate release, availability and downstream claims   |

In this table, numeric REQ/AC ranges reference the identically numbered rows in section 5; all other ranges reference their prefixed IDs in sections 4 and 6.

Revision-3 traceability extends the table as follows; these rows are obligations, not optional follow-ups:

| Slice     | Additional REQ / AC | Additional QA | Additional DEC | Additional proof                                                                            |
| --------- | ------------------- | ------------- | -------------- | ------------------------------------------------------------------------------------------- |
| SLICE-001 | 020, 023            | 020, 023      | 017, 019       | Bounded policy snapshot, unchanged permission/exemption names and complete effective result |
| SLICE-002 | 020, 026            | 020, 026      | 017, 021       | Exact origin/hash vectors, Git qualification vocabulary and absence contracts               |
| SLICE-003 | 020                 | 020           | 017            | Renamed exclusion still checks and protects tracked sources                                 |
| SLICE-009 | 020-022             | 020-022       | 016-018        | Aggregate value counts, source-kind matrix, independent installation/acquisition limits     |
| SLICE-004 | 020, 024            | 020, 024      | 017, 020       | New diagnostic identities integrated with safe repair predicates and pins                   |
| SLICE-005 | 021-026             | 021-026       | 016-021        | Independent corpus and negative-contract regression coverage                                |
| SLICE-006 | 020, 025-026        | 020, 025-026  | 017, 021       | Packed CLI and separate typed SDK probes, actual identity/effect parity                     |
| SLICE-007 | 020-026             | 020-026       | 016-021        | Complete migration coverage and executable advanced examples                                |
| SLICE-008 | 001-026             | 001-026       | 001-021        | Frozen whole-cohort evidence; all new contract cases included                               |

All references to “all acceptance criteria” include the revision-3 rows.
`SLICE-008` is still the final integration slice despite the later numeric ID of `SLICE-009`.

Dependency order: gates first; `SLICE-001` before `002` and `003`; then `009` establishes precise resource contracts; `004` integrates repair and diagnostic changes; `005` verifies the integrated rule profile; `006` consumes the resulting candidate; `007` completes coherent migration; `008` freezes and qualifies the whole change.
Schema/type/example updates needed to keep an earlier slice buildable belong in that slice, not an intentionally broken deferred batch.
Documentation research, independent oracle design and qualification-harness design may proceed alongside implementation once their semantic contracts are accepted.
Do not assign parallel writers to configuration/schema/native event definitions or repair predicates without resolved ownership and a shared baseline.
This dependency analysis does not itself authorize spawning agents.

## 9. Verification strategy and oracle ownership

### 9.1 Next useful checks versus final assurance

The first implementation check is a real minimal-consumer reproduction plus the focused policy/bootstrap tests.
Do not begin by running every release workflow or editing all fixtures.
After source work starts, use current package scripts and the current HISEW profile registration; the planning inspection established profile names, not their exact coverage or input ordering.

Useful existing focused suites include:

```sh
node --test tests/contracts.test.js tests/schema-isolation.test.js tests/cli-flexibility.test.js
node --test tests/native/policy-bootstrap.test.mjs tests/native/repository-discovery.test.mjs tests/native/repository-execution.test.mjs tests/native/git-qualification.test.mjs
node --test tests/formatting.test.js tests/nfc-preservation.test.js tests/native/normalization.test.mjs tests/native/repository-rewrite.test.mjs tests/native/source-outcome.test.mjs
node --test tests/byte-admission.test.js tests/retained-quality.test.js tests/json-lines.test.js tests/native/resource-policy.test.mjs
node --test tests/consumer-ci.test.js tests/package-probe.test.js tests/pack.test.js tests/ci-proof.test.js
```

These are existing file paths and starting points; add the accepted new zero-config tests rather than treating existing coverage as sufficient.
For revision 3, also start from `tests/native/control.test.mjs`, `tests/native/source-contract.test.mjs`, `tests/native/value-session.test.mjs`, and existing provider/installation/acquisition tests located by their owning modules.
Add focused resolver/producer/profile-migration cases when no existing suite owns the required boundary; do not write tests that merely assert the new strings exist.
Partition evidence into R equivalence, D declaration/runtime agreement, and B acceptance tables, and attach each to its `AC-020` through `AC-026` requirement.
For R evidence, compare the same inputs through frozen old/new implementations with an explicit name mapping.
For B evidence, assert the deliberately different result from the independently specified table, not blanket equality with the old implementation.
After native edits, rebuild and stage through the maintained producer before interpreting native test results.
After schema changes, regenerate declarations and resource projections through their existing owners, then run their read-only drift checks.

Final source obligations include:

```sh
npm run check:schemas
npm run check:types
npm run check:types:generated
npm run check:resources
npm run check:architecture
npm run check:package
npm run check:affected
npm run check:full
```

The full command already includes many listed checks; do not repeat successful expensive checks without changed inputs or unresolved concerns.
Keep focused evidence distinct from final exact-source evidence.
Transported package qualification needs its required clean committed source and candidate archive family; a dirty-worktree failure is not evidence that the product contract passed or failed.
The existing Node policy currently lists majors 22, 24 and 26, reference 26.13.0, Windows 2025 and Ubuntu 24.04, and consumer npm 11.21.1.
These are local policy facts, not newly verified upstream LTS/security status; use the maintained matrix resolver and refresh supported identities when freezing qualification.
Do not hard-code a reduced matrix in the new probe.

### 9.2 Independent oracles and allowed doubles

- The decision owner and independent verifier approve expected command results and rule cases.
  Tests must not calculate expected defaults by importing the resolver under test.
- Preserve `tests/oracles/finite-v1` byte identities.
  Its immutable historical semantics remain evidence, not a current production fallback or an editable snapshot to bless new behavior.
- Reuse `tests/json-token-meaning.js` and the existing independent parser/oracle boundary for decoded values, member order and exact numeric token comparisons.
  JavaScript `JSON.parse` equality cannot prove numeric lexeme preservation.
- Expected numeric and Unicode boundary cases come from named specifications, independent exact values and accepted product conventions.
  Avoid generating both expected and actual NFC/number results through the same production function.
- Real files, Git trees, installed native companions and npm bins are required for ownership, discovery, race and consumer tests.
  Fault injection may stop an external I/O/process boundary, but must leave the real admission decision under test.
- Mock remote registries/services only for orchestration fault cases. Do not count a mocked install, process spawn, parser, policy resolver, native rewrite verdict or terminal as product/installed acceptance.

Any evidence result records source/cohort/default identity, command, toolchain/platform, outcome and limitations.
No terminal, timeout, cleanup failure or incomplete diagnostic delivery remains incomplete.

## 10. Compatibility, migration and resumption

### 10.1 Contract cohort migration

Treat configuration input, effective policy, source contract references, events, native protocol and component manifests as one coherent migration.
Proposed cohort `4` must be confirmed against the current repository before implementation; another concurrent change may already consume that version.
Update generated declarations and all live consumers, including schema registration/type generation, package export inventories, consumer probes, CI proof readers and release receipts.
`scripts/consumer-layouts.js` and `scripts/qualify-package.js` currently hard-code six public exports; adding a schema requires changing both producers and validators, not simply the manifest.

Explicit old schema versions fail with a migration message before source writes.
Markerless sparse config is new current-cohort input, not automatic admission of historical shapes.
Do not broaden a v3 `$id` in place or silently translate old semantics.
Retain historical plans and frozen oracles with their historical identities; distinguish those from live examples requiring migration.
Existing exact preservation hashes and producer ownership must survive the migration unchanged unless their actual source bytes change under their owners.

No user-data backfill is required for defaulting.
Config migration is an explicit reviewed edit; check, format and normalize do not create a config file or upgrade its version as a side effect.
Before removing an explicit defaults block, compare resolved per-path contracts across an independently enumerated representative corpus, including special providers and protected paths.
Do not automatically remove repository exceptions merely because the new package has similarly named presets.

Maintain a reviewed migration ledger covering every row of section 4.5 and every public policy/resource field introduced in sections 4.6-4.10.
For each row record the owning source, current consumers, generated artifacts, class R/D/B, exact old/new examples, affected expected-pin/evidence identity and the acceptance case that proves it.
Use structured/language-aware rename tools for symbols; change JSON keys, command tokens and serialized event fields through their schema/owner, not a repository-wide textual substitution.
An old name retained in a current file must be an explicit rejection message, migration example or test of refusal, not a hidden supported path.

For a manual v3 configuration migration, change write/exemption/exclusion/resource keys first, retain owner/reason and exact pin bytes, apply the reviewed diagnostic-ID mapping, and set the new marker only after offline validation of the complete new input succeeds.
Resolve both old and migrated configurations with their corresponding frozen implementations over the same enumerated sources and compare behavior through the accepted identity/name mapping.
Expected differences are only the separately specified defaulting/repair/advisory/admission/profile-scope changes; an unexplained permission or source-coverage difference blocks migration.
For CLI consumers update scripts/flags/binaries, for workflow callers update commit-ID inputs, and for advanced installs explicitly split old dual-effect quotas and environment profiles as section 4.6 requires.
Do not run normal `check`, `format` or `normalize` as a configuration upgrader.

Compatibility refusal tests include old named ESM imports, old binaries/verbs/flags, old option/schema keys, old event shapes and the retired cleanup environment name.
An old source-capacity environment setting has no effect on new cold installation; this intentional independence is documented and tested, rather than treated as an automatic install migration.
Document module-resolution failure for removed exports and actionable structured errors for admitted entry points receiving old keys; do not build a shim merely to customize a missing-export error.

### 10.2 Interrupted writes and recovery

Per-file guarded replacement remains nontransactional across a batch.
Retain source preimages or source-control references under the user's recovery policy before wide explicit normalization.
After interruption, inspect confirmed writes and any uncertain pathname, reconcile actual bytes, re-run check under current policy and resume only eligible remaining work.
Do not replay a stale candidate list or assume missing final acknowledgement means nothing changed.

Configuration/package rollback restores a matching family: core/native packages, lockfile, config schema, policy and invocation assumptions.
Restoring source data requires its recorded preimages; no inverse NFC algorithm can reconstruct the original spelling.
If the old consumer is unsupported or unsafe, restrict affected writes and prepare a qualified forward fix rather than silently reviving an obsolete compatibility path.

## 11. Security, privacy and observability

Policy files and all source bytes are untrusted data even when their repository is selected by the operator.
Trusted provider functions remain explicitly injected code; defaults and config never search for, import or execute repository modules.
Retain local closed-schema resolution, descriptor/containment checks, no runtime download/compiler/parser fallback, finite control/object accounting and explicit effects.
Avoid prototype pollution, getters/custom serialization and shared mutable defaults at the new resolver boundary.
Audit every missing-file catch: permission, malformed data, path substitution and interrupted reads cannot become successful defaulting.

The native/security review must trace the repair predicate from source finding through closure, selection, candidate proof, dependent checks, peer preflight and final filesystem replacement.
It must also trace preview through the same candidate owner, preserve-mode advisory aggregation, all-candidate collision reporting, and exact Unicode-version identity.
The review must also cover policy creation after bootstrap, package-preset precedence, tracked files under exclusions, malformed event/evidence admission and candidate-versus-trusted Git policy.
Use the repository's native Codex Security workflow and keep any private source/findings within authorized boundaries.
No external message, scan, disclosure or source upload is authorized merely by writing this plan.

Required observable questions and local signals:

| Question                                                   | Signal / acceptance                                                                                  |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Which policy authority governed this run?                  | Default/cohort/package identity plus present/absent config provenance in versioned events            |
| Why was a file excluded or write-protected?                | Built-in or user owner/reason classification, without dumping document content                       |
| Did the requested repair finish, and is quality now clean? | Separate write completion and remaining quality state; accurate confirmed/uncertain paths on failure |
| Did zero-config qualification actually execute?            | Observed case IDs, argv, exit/terminal outcomes and fixture-shape assertions in retained receipts    |
| Did defaults become slower or consume unbounded state?     | Same-input startup, resource/managed/spill observations and cleanup evidence compared with baseline  |
| Did policy or candidate authority change?                  | A failure naming the violated authority/freshness boundary, with no fabricated successful terminal   |

No network telemetry service is needed.
Retained evidence should prefer identities and bounded diagnostics over raw JSON content, and follow existing retention/privacy controls.
The release observer uses actual supported consumer behavior as production acceptance, not only a workflow badge or a published README.

## 12. Rollout, abort, recovery and cleanup

1. Accept and freeze the draft decisions, requirements, risk route, assurance ownership and cohort choice after resolving material gates.
2. Implement on an isolated source branch/worktree as appropriate, preserving concurrent changes; keep all generated dependency/environment directories outside `G:/My Drive`.
3. Demonstrate the vertical slices locally, then freeze exact source and qualify rebuilt Windows/Linux native companions plus root/isolated packed consumers on the maintained runtime matrix.
4. Complete independent verification and security dispositions.
   Update current docs, migration examples and release evidence readers before any release claim.
5. Under actual release authorization, choose an appropriate new version for the breaking cohort/behavior change and run the existing fresh qualification/staging/promotion process.
   Do not republish `1.0.0-rc.2` or infer registry availability from the manifest.
6. Repeat minimal ordinary consumption from the public registry and observe the exact target platforms/runtimes; promote availability only with the required evidence and release decision.
   Record any distinction between candidate routing and normal anonymous installation.
7. Migrate authorized downstream consumers with matching config/package/native versions and their owner-specific exceptions.
   This plan does not itself authorize editing another repository or the missing research attachments.

Abort promotion for semantic/lexeme drift, writes on protected inputs, defaulting after invalid policy, stale policy success, incomplete native or installed evidence, unexplained material resource regression, incompatible schema consumers, or an unresolved high-impact review finding.
Never relax the no-config fixture, drop isolated coverage, erase a finding or reset evidence identity to make a candidate pass.

The integration implementer owns source-level recovery; the release observer owns monitoring and escalation through the existing release operation; source-data owners authorize restoration of their preimages.
Revert unpublished code coherently or prepare a new qualified release; availability restoration may select a prior supported qualified release only under the existing recovery decision.
Published artifacts, original receipts and prior run outcomes remain immutable.
Stopping promotion does not repair files already normalized by a consumer.

Clean only owned fixture repositories, temporary npm caches/registry fixtures, staging files and spill directories after retaining required receipts and diagnostics.
Use the existing temporary-directory/native cleanup owners and verify bounded paths before recursive cleanup.
Do not delete frozen oracle material, historical releases, source preimages, HISEW stores or another execution's residue.
Uncertain ownership or failed cleanup remains reported rather than converted into a pass.

## 13. Prerequisites, discriminating experiments and re-planning

### 13.1 Implementation gates

| Gate     | Missing decision or evidence                            | Owner and minimum completion evidence                                                                                                                                                                                                                     |
| -------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GATE-001 | Exact accepted revision-3 R2 baseline                   | Decision owner accepts this revision or a revised protected dossier, including the preview/advisory design and `DEC-017` through `DEC-021`; retain the owner-selected NFC-default/preserve and `DEC-016` counting decisions without requesting them again |
| GATE-002 | HISEW loaded/selected alignment and assurance ownership | Management and affected actual owners establish intended releases/generation and supported readiness; retain selection until coordinated; no workflow bypass                                                                                              |
| GATE-003 | Native repair predicate and event semantics             | Native/API owner plus independent verifier approve the positive and negative truth table, remaining-quality behavior and both mixed-repair demonstrations                                                                                                 |
| GATE-004 | Dependency/rights and delivery inventory                | Integration/release owner refreshes material native selections and affected live consumers, confirms retained/new rights obligations and exact qualification matrix                                                                                       |

The source research supplies broad direction but not these captured decisions or product evidence.
Missing gates limit implementation readiness, not the usefulness of this completed draft.

### 13.2 Cheapest useful experiments

| Experiment | Question                                                                        | Evidence and disposition                                                                                                                                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EXP-001    | What prevents the exact minimal consumer today?                                 | Run the packed CLI on a temporary real Git consumer without policy, then with the smallest current policy; retain first failure, command identity and installed tree. Use this to validate scope before editing                                                   |
| EXP-002    | Can mixed drift be repaired without unsafe admission?                           | Trace and reproduce one formatted/NFC pair, one mixed case, one NFC collision and one unsafe peer across `source_outcome`, writer and candidate binding. Adopt only the narrow proposed predicate; broader needs re-baselining                                    |
| EXP-003    | Which existing presentation contract matches real npm locks?                    | Generate package-lock/shrinkwrap using the qualified npm versions, including workspace/empty-key cases; compare current native producer contracts and writer protections. If no existing contract fits, research npm's supported serialization before custom work |
| EXP-004    | Can absence stay trustworthy through actual writes?                             | Deterministically create/remove/substitute config between each observed phase on Windows and Linux; verify final verdict/write refusal and honest partial results. An unobservable gap requires a revised authority model                                         |
| EXP-005    | Can the packed fixture stay minimal?                                            | Install one exact unpublished core/native family using external archive routing, inspect application manifest, lock and bin resolution, then run exact commands offline. Distinguish this evidence from later public-registry acceptance                          |
| EXP-006    | Does defaulting add hidden resource cost?                                       | Compare absent, `{}`, explicit-equivalent and large sparse configs using existing managed/process observations; prove charged effective objects and bounded per-session state                                                                                     |
| EXP-007    | What does NFC currently cost and what changes with preservation-key advisories? | Revision 2 measured existing default/NFC/preserve paths on Google plus controls; repeat on the implemented resolver/preview and Unicode-key-heavy data. The current preserve result excludes future advisory-key normalization                                    |
| EXP-008    | Is collision reporting complete and scope-correct?                              | Current API probes reject two-key collision and exact duplicates and normalize separate scopes idempotently. Extend to three-key/order permutations, all-candidate aggregation, forced hashes, JSONL and zero-write whole-batch preflight                         |

EXP-007 and the bounded current API portion of EXP-008 have exploratory evidence in the linked performance assessment; the remaining work is planned implementation verification, not executed qualification.

Re-plan or re-baseline if the inspected commit/cohort changes materially; an actual consumer requires legacy compatibility; defaults need a broader package-manager catalog; non-Git support becomes required; producer locks need blanket exclusions; an operation predicate weakens strict/peer safety; absence cannot be observed within the supported concurrency model; new native/dependency rights are unresolved; required platforms cannot supply the package; or measured costs defeat the supported resource envelope.
For revision 3, also re-baseline if a proposed rename would change an unlisted source population or counting threshold, installation defaults cannot be preserved, bootstrap cannot reserve the extra policy workspace, the resolver-input manifest misses an executable policy dependency, or exact diagnostic-pin migration needs a rule change beyond section 4.8.
Do not silently solve such a case by disabling quotas, broadening permissions, adding an alias or rewriting historical evidence.
Likewise reassess if the new configuration model needs a generic style/rule framework: that would expand the product beyond exception-oriented policy.

The higher outcome remains a smaller consumer integration with the same or stronger safety and assurance.
Reassess the design if a supposedly zero-config installation still needs a generated adapter, handwritten exclusion list, hidden policy file, extra application dependency or undocumented repair order.
Do not trade complete discovery or source preservation for an attractive quick-start example.

## 14. Completion criteria and planning evidence

Implementation is complete only when the accepted requirements have source-bound evidence, independent assurance is resolved, current schemas/types/native artifacts/docs agree, and the required packed consumer cases pass across the supported matrix.
Release completion additionally requires the separately authorized publication and ordinary registry acceptance evidence.
Downstream adoption remains a further observable outcome.

This planning task inspected both supplied documents, current source owners, relevant tests and qualification paths; checked HISEW applicability/selection read-only; refreshed primary documentation and selected npm metadata; and created/revised this dossier.
Revision 2 used two lower-powered inspection subagents and measured current source-session performance plus bounded in-memory collision/normalization probes; source snapshots and hashes were retained locally, with no representative repository writes.
The results and limitations are in the [performance assessment](2026-11-01-nfc-performance-assessment.md).
No product implementation, native build, full product test suite, hosted qualification, publication or downstream migration was performed by creating or revising the plan.
Document validation and its actual outcome are reported with the task handoff; commands in section 9 describe future implementation verification.

Revision 3 incorporates the [public naming audit](2026-11-01-public-naming-audit.md) in sections 4.5-4.10 and extends requirements, scenarios, slices, migration and evidence accordingly.
It records the owner's `maximumTotalValues` decision while preserving its current counting behavior, and distinguishes name-only work from changed admission/resource/diagnostic/provenance contracts.
Two lower-powered agents re-traced current ownership and reviewed the detailed specifications.
This is planning evidence, not implementation verification.
