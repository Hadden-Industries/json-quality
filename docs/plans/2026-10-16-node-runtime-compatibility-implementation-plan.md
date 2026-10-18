# Supported Node runtime compatibility implementation plan

Date: 2026-10-16.
Status: accepted for implementation by the owner in chat `01a1417f-7a6b-7c81-8a53-9d14900f1c79`, including required configuration, signed commits and direct pushes to main.

## Purpose, authority and baseline

Make JSON Quality usable on the lowest reasonably supportable Node releases in the same families as Markdown Quality, and make future runtime changes a single policy edit with checked projections.
Compatibility minima, current-version CI coverage, and the development/producer reference serve different purposes.
An up-to-date reference runtime must not silently become the consumer installation minimum.

The owner's subsequent implementation request authorizes the requirements, decisions and R2 route below, together with required configuration changes, signed commits and direct delivery to main.
Npm publication and release publication remain separately authorized effects.
This accepted baseline does not claim completed implementation or qualification.
The owner is the acceptance decision owner; the implementing agent owns integration and evidence collection after authorization.

Inspected baselines:

- JSON Quality: clean checkout at `e5e7c66be14af4445946fbb5cf454d4b4a1b7cf5`.
- Markdown Quality: clean checkout at `bfcf44061750851b69128d73aeeaf89bd5e17bcf`.
- OwlAPI: `2bb43e943abbfc4a21c810614d9043fd9aa446e3`, whose runtime policy is a design precedent, not the target version authority.
- [Referenced chat](codex://threads/01a13f94-e2a6-7a11-8054-c628f0f3a28b), particularly the minimum-runtime qualification and subsequent centralization/file-identity repair.

HISEW inspection found personal applicability active and no active change execution.
Registered worktree profiles are `focused`, `affected` and `full`; their commands are described below.
This planning record does not certify those commands' coverage or create a passing receipt.

## Current evidence and proposed support

| Contract                            | Observed JSON Quality baseline                                          | Proposed result, subject to qualification                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Consumer Node families              | Node 24 and 26                                                          | Node 22, 24 and 26 only                                                                                       |
| Consumer minima                     | `24.21.0`, `26.11.1`                                                    | `22.13.0`, `24.0.0`, `26.0.0`                                                                                 |
| npm engines declaration             | Bounded ranges for Node 24 and 26                                       | Bounded ranges for the three qualified families, after proof                                                  |
| Development/producer Node reference | `.node-version`: `24.21.0`                                              | Retain `24.21.0` as its own policy field                                                                      |
| Producer npm                        | `packageManager`: `npm@12.2.0`; development range `>=12.2.0 <13`        | Retain the qualified npm 12 producer and keyed pack-report contract                                           |
| CI                                  | Windows 2025 and Ubuntu 24.04, two exact Node versions                  | Both existing platforms; each minimum, latest stable in each admitted family, and the reference, deduplicated |
| Runtime version authority           | Manifest, lock root, `.node-version`, workflow and prose contain values | One editable package-owned policy; other current declarations generated or checked                            |

The lockfile contains 84 non-development dependency entries.
A static check using npm's bundled `semver` found no declared Node-engine rejection for any proposed minimum.
Node `22.12.0` is rejected by ten entries in the ESLint graph, including production dependencies `eslint@10.12.0` and `@eslint/json@2.1.1`.
[ESLint's official migration guidance](https://eslint.org/docs/latest/use/migrate-to-10.0.0#nodejs--v2019-v21-v23-are-no-longer-supported) independently establishes its Node `22.13.0` boundary.
Thus **22.13.0 is the lowest reasonable initial Node 22 target with the existing production graph**.
Going lower would need a separately accepted dependency/upstream change; a successful isolated invocation on an unsupported version would not remove that boundary.
The current package excludes Node 22 entirely, so this proposal adds Node 22 support at a low floor rather than lowering an existing JSON Quality Node 22 declaration.

There are three material qualifications to the static result:

1. `src/inventory.js`, `src/quality.js` and `src/source-presentation.js` use `path.posix.matchesGlob()` for contract selection.
   The [Node 22.13.0 documentation](https://nodejs.org/download/release/v22.13.0/docs/api/path.html#pathmatchesglobpath-pattern) records this API as experimental; presence alone does not establish unchanged selection semantics.
   JSON schema imports in transported probes use import attributes, which are already supported at the candidate floor according to the [versioned ESM documentation](https://nodejs.org/download/release/v22.13.0/docs/api/esm.html#json-modules).
2. npm `12.2.0` declares `^22.22.2 || ^24.15.0 || >=26.0.0` in its own metadata, confirmed in both the local installation and [registry metadata](https://registry.npmjs.org/npm/12.2.0).
   Its bundled `npm-package-arg@14.0.0` and `cacache@21.0.1` declare the same bounds.
   JSON Quality's exported installation functions load npm's native modules, and its acquisition bootstrap uses npm-specific controls including `--allow-git=root`.
   These are real product integration constraints, not merely development tooling inconveniences.
3. Markdown Quality's Windows defect involved comparing path and handle device identities.
   JSON Quality's `captureSource()` currently compares path observations with path observations; it has no corresponding `fstat()` comparison.
   Do not copy its repair or raise this package's floor without a reproduction at this package's boundary.

The official release index observed during planning reports latest stable family releases `22.23.3`, `24.22.0` and `26.12.0`.
These are dated observations for CI design, not minimum requirements or permanently maintained selectors.
Resolve them afresh from [official Node release metadata](https://nodejs.org/dist/index.json) during each qualification run.

Scope covers runtime declarations, their policy/projections, qualification, CI and directly necessary compatibility repairs.
Dependency upgrades/downgrades, changes to JSON semantics, broader filesystem guarantees, native payloads, new major families, registry publication and downstream adoption are outside this proposed implementation.

## Risk route

Risk class: **R2 proposed**.
The change expands a public runtime contract and can affect file selection, guarded writes and installed-payload validation.

Decision owner: repository owner; implementing agent integrates the accepted scope.

Reasoning: incompatible glob selection could omit evidence or admit writes to protected data; an npm mismatch could prevent cold acquisition or weaken verification.
These are inferences from the inspected call sites, not reproduced defects.

Potential blast radius: CLI/API/plugin/schema consumers and isolated tooling installations on Windows/Linux.
No live consumer changes are authorized by this draft.

Reversibility: source and CI changes can be restored through a follow-up commit, retaining immutable evidence.
A published package's metadata and consumer adoption cannot be silently undone.

Principal unknowns: older-runtime glob semantics, exact compatible npm integration, and installed/writer behavior across the target platforms.

Required artifacts: this protected accepted baseline before implementation, a canonical runtime policy, checked projections, dependency/API qualification record, immutable archive/run identities and the existing HISEW evidence/handoff records.

Required specialist lenses: ordinary code/design review and independent verification for R2. A frozen security diff assessment is required if implementation changes path selection, replacement/identity safeguards, acquisition or archive/cache admission.
A policy-only change needs an explicit scoped security disposition rather than an unrelated repository scan.

Required verification: focused feedback while editing, affected regression checks at integration, the registered `full` profile on the reference runtime, and exact minimum/latest/reference transported-consumer qualification on both platforms.
Passing reference checks alone cannot establish older-runtime compatibility.

Required human approvals: acceptance of the draft runtime/npm design before implementation; additional authority for publication or consumer changes.
Reuse any subsequently granted exact-scope authority without requesting it again.

Maximum sensible autonomy: complete this draft and read-only research now.
After acceptance, implement and repair within the granted scope; do not downgrade dependencies, relax safety controls, add compatibility shims or change shared HISEW configuration to manufacture a pass.

Next lifecycle step: accept the requirement/decision baseline, recheck applicability and execution ownership, then select the installed implementation procedure and start the exact R2 execution.
Record the accepted plan at its first authorized commit checkpoint.

## Requirements, acceptance criteria and quality scenarios

| Requirement                                                                | Acceptance criterion                                                                                                                                                                                                          | Falsifiable quality scenario                                                                                                                                                                               |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-001: Match the three Node families with justified minima               | AC-001: exact proposed floors pass dependency/API and real consumer proof; every higher selected floor has a retained concrete cause and boundary test; `22.12.0`, odd majors, future majors and prereleases are not admitted | QA-001: on each supported OS, execute installed CLI/API/plugin/schema probes with the selected binary; record `process.version`, platform and executable identity; any failure rejects that lane           |
| REQ-002: Establish one editable runtime policy                             | AC-002: a synthetic policy edit updates all current projections, a check detects drift, and a second synchronization produces no changes                                                                                      | QA-002: deliberately alter one projected engine/reference/document value; the read-only drift check fails without rewriting files or unrelated bytes                                                       |
| REQ-003: Separate consumer, producer and acquisition requirements honestly | AC-003: retain Node `24.21.0`/npm `12.2.0` production; qualify every claimed consumer npm pairing and all exported installation APIs, or escalate a narrower contract for owner acceptance                                    | QA-003: a floor lane cannot report success by loading npm 12 on a runtime outside npm's declared support or by silently skipping installation verification                                                 |
| REQ-004: Preserve quality and write boundaries                             | AC-004: identical explicit fixture expectations for inventory, exclusions, protected/native/logical files, numeric/string preservation, NFC collisions and failure behavior across runtimes                                   | QA-004: same-byte replacement, unsafe links, permission constraints or changed authority inputs continue to fail before an unauthorized write; interrupted batches retain completed/unprocessed accounting |
| REQ-005: Keep CI coverage complete and reproducible                        | AC-005: an immutable resolved matrix covers exact minima, current family releases and reference on Windows 2025/Ubuntu 24.04; missing/failed/cancelled lanes fail final admission                                             | QA-005: missing/malformed/oversized release metadata or a missing reference fails matrix resolution; no reduced green matrix or silent previous-run fallback                                               |
| REQ-006: Preserve native packaging and acquisition authority               | AC-006: clean committed source produces an immutable archive with source/tree/lock/hash identities; native installation/cache checks reject tampering and unsafe members                                                      | QA-006: replay an installed locked payload offline; absent cached bytes, a changed installed file or a linked/duplicate archive member fails, without fetching or writing during verification              |
| REQ-007: Deliver a bounded, reviewable change                              | AC-007: final review, independent verification, HISEW proof and any authorized hosted delivery bind the same candidate; consumer adoption and publication retain separate status                                              | QA-007: changed inputs invalidate only affected evidence; incomplete receipt publication or uncertain remote effects remain incomplete until reconciled                                                    |

Quality behavior is unchanged: configuration schema 1, result schema 3, four package export paths, strict diagnostics, resource limits, preservation guarantees and the documented hostile-filesystem-concurrency exclusion retain their meanings.

## Selected design and decisions

The following are proposed decisions for the draft baseline.

**DEC-001 — Package-owned policy and checked projections.**
Follow Markdown Quality's `assets/node-support.json`, matrix resolver and narrow projection pattern, with OwlAPI as the preceding design example.
Create `assets/node-support.json` as the sole editable authority for consumer minima, pinned reference, supported platforms and producer npm selection/range.
Keep consumer npm qualification selections in the same policy if the supported integration needs them; avoid a second hand-maintained version registry.
Predict `scripts/node-matrix.js`, `scripts/project-node-support.js`, `sync:node` and `check:node` entry points, plus a generated section in `docs/node-runtime-compatibility.md`.
These names and paths are predictions, not instructions to copy every Markdown Quality abstraction.

Project into root `package.json` engines/toolchain metadata, `.node-version`, current workflow bootstrap selections and current compatibility documentation.
Keep `package-lock.json` a native npm product: update its root metadata through the approved native npm operation, then check it against policy; do not hand-edit dependency resolutions or generalize the reference repository's lock JSON rewriting.
Preserve exact dependency versions, unrelated workflow bytes, matrix expressions and historical evidence.
The policy is development-owned unless a runtime consumer actually needs it; avoid adding an unused packed runtime dependency.
The compatibility document is already within `files: docs/` and therefore affects archive identity and installation census expectations.

**DEC-002 — Lowest justified floors.**
Start qualification at `22.13.0`, `24.0.0`, `26.0.0`.
Keep `24.21.0` as the producer reference; neither current-family releases nor npm's host requirements implicitly raise consumer minima.
Use equivalent explicit bounded ranges consistently and reject odd/future majors and prereleases.
Runtime compatibility is separate from advice to install current security patches.

**DEC-003 — npm integration is an early decision gate.**
Keep the producer on npm 12 and preserve `readPackReport()`'s keyed native-report admission; do not make it accept older report shapes to run the producer suite on an old runtime.
Build the candidate archive once on the reference, then install and execute that archive in isolated floor environments using an explicitly selected compatible native npm toolchain.
Determine the newest suitable npm line/version from current official metadata and native behavior; do not select an old npm merely because it is conveniently bundled with a downloaded Node binary.
Metadata samples `npm@11.0.0` and `npm@10.9.2` admit the target Node versions, but neither is selected or qualified by this plan.

Prove `npm-package-arg`, `cacache`, `tar`, lockfile version 3 and every required acquisition flag against the selected consumer npm before expanding support claims.
The public installation verifier cannot be omitted because the core checker passes.
The transported `file:` archive is suitable for runtime execution proof, but `jsonQualitySourceCoordinate()` intentionally admits only exact registry versions/aliases or a full producer Git coordinate.
Keep those proof paths distinct: use controlled native fixtures for pre-delivery cache/lock regressions, then qualify real cold Git acquisition and verification against an authorized reachable immutable producer commit before claiming that delivery path passes.
Do not forge a lock's resolved coordinate, accept `file:` in the public verifier as a test shortcut, or treat the transported archive's CLI pass as installed-payload admission.
If no reachable candidate or publication authority exists yet, retain this as a pending delivery gate and continue independent local proof.
If compatible npm lacks a required security control, retain its actual error and compare native supported alternatives at that boundary; do not discard the flag or add a permissive parser/cache fallback.
If full installation integration cannot reasonably support the target floors, return a concrete owner decision: separately documented reference-host acquisition/verification followed by lower-runtime execution, or higher end-to-end minima justified by the npm requirement.
Do not silently relabel a narrower execution-only result as full support.

**DEC-004 — Qualify native APIs before repairs.**
Retain native glob, filesystem and formatter implementations while testing their actual behavior.
Do not introduce a version-switching glob polyfill, copy Markdown Quality's `regular-file.js`, omit device identity checks or weaken preservation assertions without a demonstrated defect and accepted design.
A required repair stays with the owning module and gains a focused regression at its consumer boundary.

**DEC-005 — Distinct CI responsibilities.**
Reference lanes own npm 12 packing, all producer tests, lint, format, JSON dogfood and policy drift checks.
Consumer lanes own actual selected-runtime execution and installation proof, using the identical qualified archive.
Resolve minimum/latest/reference lanes from policy and bounded official release metadata; freeze the resolved values and archive identity before fan-out.
Use a small bootstrap reading of the repository reference selection before package installation, then run the package-owned resolver after the reference toolchain is ready.
Preserve action SHA pins, read-only permissions and `persist-credentials: false`; no new release workflow is needed.

### DRY, reuse and oracle ownership

Within this repository the policy owns current version choices; npm owns lock serialization/cache/archive semantics; native Node owns runtime APIs; existing package modules own quality and write policy.
The resolver/projector implements only the residual policy-to-consumer mapping, rather than a new cross-repository runtime framework.
Checked manifest/workflow/bootstrap/document repetitions are deployment projections with a drift check, not competing authorities.
Historical evidence and deliberately synthetic test policies remain independent immutable inputs.
Keep runtime selection out of JSON diagnostic, formatting and schema policy modules.

The Markdown Quality implementation and this repository both declare AGPL-3.0-only.
Reuse its bounded policy/projection design with attribution where code is actually reused, retaining SPDX/license obligations; review any newly introduced dependency's actual terms before adoption.
No new dependency or portfolio-wide tooling repository is selected here.
Prefer npm's existing semver/native APIs and existing package qualification seams over custom version parsing or copied consumer verifiers.

Existing retained JSON acceptance vectors and explicit expected inventory/writer outcomes own behavioral oracles.
New matrix tests use synthetic release lists and independent expected sets, including a reference that is neither minimum nor latest.
Mock official metadata/network failures and controlled process boundaries only in unit tests; final installed/runtime/filesystem/pack/cache proof uses real native tools and files.
Do not derive all expected values from the function under test or compare only two equally incorrect runtime outputs.

## Vertical implementation slices

| Slice     | Traceability                                                                 | Observable increment and predicted seams                                                                                                                                                                                                                                                                             | Proof                                                                                                                                                                                                                                                                                            | Release and cleanup implication                                                                                                                                  |
| --------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SLICE-001 | REQ-001/003/004; AC-001/003/004; QA-001/003/004; DEC-002/003/004             | Establish the runtime/npm compatibility dossier and one installed end-to-end path at each candidate. Inspect the full graph, glob selection and writer paths; separate producer-only failures. Start at `scripts/qualify-package.js`, `src/installation.js`, `src/acquire.js`, `src/replacement.js` and their tests. | Retained engine/API census; exact Node/npm/native-module identities; real CLI/API/plugin/schema invocation and acquisition/cache probe on both platforms. Demonstrate Node 22.12 rejection and distinguish npm metadata admission from execution.                                                | No engine widening yet. Resolve the npm gate before dependent support declarations; retain failed minimal inputs and reasons.                                    |
| SLICE-002 | REQ-002/005; AC-002/005; QA-002/005; DEC-001/005                             | A canonical policy generates/checks current metadata and documentation and resolves a complete runtime matrix. Introduce the policy/resolver/projector and integrate read-only drift checking into full verification.                                                                                                | Synthetic policy-change/idempotence/drift tests; malformed/duplicate/prerelease/minimum/reference validation; latest-family resolution and deduplication; unchanged dependency resolutions and unrelated workflow values.                                                                        | Project current admitted floors first if compatibility is not yet proven; no premature support claim. Account for packed docs and installed-file census changes. |
| SLICE-003 | REQ-001/003/004/006; AC-001/003/004/006; QA-001/003/004/006; DEC-002/003/004 | Qualify the complete installed consumer contract at the accepted floors; make only demonstrated bounded compatibility repairs. Extend the existing transported corpus and applicable source tests.                                                                                                                   | Real exact-floor runs on Windows/Linux: check/inventory/format-check/format/normalize, library/plugin/schema exports, literal/NFC/failure preservation, native/logical evidence and guarded replacement; strict installation, cache verification and offline replay under admitted npm pairings. | Widen engines only when each asserted contract passes; preserve existing higher-floor behavior. Stop for owner decision if npm forces a narrower contract.       |
| SLICE-004 | REQ-002/005/006/007; AC-002/005/006/007; QA-002/005/006/007; DEC-001/005     | CI runs reference producer proof plus the frozen minimum/latest/reference consumer matrix; documentation states the resulting contracts. Update `.github/workflows/ci.yml`, README and consumer/compatibility guides together.                                                                                       | All resolved lanes required; same archive/source/tree/lock identities; `check:node`, reference `check:full`, final review and independent verification. If source delivery is authorized, inspect hosted checks on the exact delivered head.                                                     | Complete native HISEW assessments/resources/handoff. Source delivery, npm release and downstream adoption remain separate effects with separate authority.       |

Order is SLICE-001, then SLICE-002, then SLICE-003 and SLICE-004 integration.
An offline policy test design and source dependency/API research can proceed independently; runtime-policy declarations and CI edits share semantics and need one integration owner.
This plan does not authorize parallel write agents or launch reviewers.
Each intermediate committed policy must describe currently demonstrated support, never future target support as a completed result.

## Verification and evidence cadence

The registered `focused` profile currently runs `npm run check:focused`, covering `tests/contracts.test.js` and `tests/identity.test.js`.
It does not cover runtime policy, CI resolution or installation by itself.
Run relevant new/changed tests directly for quick feedback, then `npm run check:affected -- --base FULL_ACCEPTED_BASE_SHA` for impacted regression selection; inspect its actual scope rather than assuming completeness.
The `affected` selector must conservatively include new policy/data/process relations or select the full suite when their effect cannot be established.

The registered `full` profile runs `npm run check:full` with its current 1800-second budget.
That script runs all tests, lint, format check, transported-package qualification and JSON dogfood; add the policy drift check to its actual invocation.
Do not require npm 12-only producer pack tests to pass under an unsupported npm/Node pairing as the definition of consumer compatibility.
Conversely, do not skip production behavior merely because its harness currently assumes the reference.

`packCandidate()` requires clean committed source.
During development use source-focused feedback, then finish formatting, review the integrated diff and commit the authorized candidate before the final package/HISEW proof.
The new plan and compatibility documentation become part of the packed `docs/` payload, so settle them before archive freezing.
Do not bypass the clean-source condition, mint source provenance for a dirty tree, or rerun a failing identical expensive qualification without a new causal hypothesis.

Retain exact source commit/tree, native lock digest, archive SHA-256/integrity and package membership; Node distribution checksum, executable/runtime/platform/architecture; npm and bundled native-module versions; resolved matrix; commands/results and reviewer coverage.
Use official Node distributions and published checksum identities.
Record x64 coverage on the existing two platforms; other architectures/platforms remain unqualified unless separately selected.
Offline replay follows a successful native installation and cannot substitute for cold acquisition proof.

Obtain the configured ordinary review and R2 independent verification against the frozen final candidate.
Use the security trigger above for any changed safety boundary, with preserved findings/dispositions and narrow repair review.
Bind providers through current HISEW capability inspection/resolution and actual available tools at use time; saved availability is not completed review or execution.
Recheck applicability before workflow mutations, use the genuine current session identity, and do not adopt another session's execution implicitly.

At planning time HISEW resolves operator evidence under `C:\Users\maksy\.hi\w\e\operator`, with no configured temporary root.
Rediscover this before implementation allocation; retain native receipts through native operations and use approved tool-managed workspaces for disposables.
Declare runtime binaries, npm installations/caches, archives, fixtures and reports before accumulation; preserve failed reproductions and raw evidence with an owner/reassessment event, then remove only verified task-owned disposables after their consumers finish.
Do not place supplemental evidence in historical repository `.sdlc/runtime` paths or copy secrets/environment dumps into reports.

## Rollout, recovery and completion

The owner accepts the draft baseline and npm contract first; an authorized implementing agent then protects that baseline, starts the R2 execution and delivers the bounded source change.
There is no data migration, schema backfill or runtime service deployment.
The meaningful migration is engine/tooling declarations and native lock metadata; retain old source/lock identities and existing immutable archive provenance.
Do not rewrite historical npm artifacts or qualification results to match the new policy.

Abort support expansion if a selected runtime fails a required lane, installed-payload verification loses a security control, path selection changes without accepted semantics, or any writer preservation regression appears.
Preserve the failing snapshot and classify product, runtime, dependency, harness and acquisition causes before a repair or higher-floor decision.
The implementing agent is the immediate observer; the owner accepts any revised compatibility trade-off.
For an unpublished candidate, restore declarations and code through a scoped follow-up commit while retaining evidence.
If already published under separate authority, use a corrected new version and explicit consumer guidance; prior metadata/evidence remains immutable.

Observe acquisition exit status/error/signal/duration, runtime/npm identities, selected versus completed lanes, archive identities, inventory/finding/write counts and failure preservation.
Retain native errors rather than blank install diagnostics; do not add broad telemetry or extend timeouts without operation-specific evidence.
Unknown receipt publication or remote effects require reconciliation before retries.
Completion requires current required proof, resolved review findings, native resource/evidence handoff, and exact remote readback only where source publication was authorized.
It must state separately whether the source, hosted CI, npm artifact and downstream installations were actually changed and verified.

Re-plan if the production graph/API floor changes, the npm gate requires a narrower public contract, glob or identity repair crosses a new trust boundary, a new supported family/platform is requested, current-family CI cannot resolve complete metadata, archive membership changes beyond the accepted scope, or a consumer requires capabilities outside this qualification corpus.
Raise a failed gate as a concrete decision with its smallest reproducer and supported alternatives; do not replace evidence with a blanket requirement for the latest Node patch.

## Source precedents and boundaries

- [Markdown Quality minimum-runtime implementation](https://github.com/Hadden-Industries/markdown-quality/commit/7e4d21c9a893556e46d77e28c4970fb2f04012c1): consumer minima separated from the reference/tooling, with installed qualification.
- [CI evidence and packed documentation repair](https://github.com/Hadden-Industries/markdown-quality/commit/e73a0771050bdc25382170476d927a4c9dee41ae): closed matrix expectations and archive membership must track the final design.
- [Centralized policy and consistent file observations](https://github.com/Hadden-Industries/markdown-quality/commit/e55e1b790365dadcedd3d6a1a9e829d75ee3c0a8): one editable authority, checked projections, and a demonstrated Windows repair rather than a permanent arbitrary floor.
- [Canonical policy contributor guidance](https://github.com/Hadden-Industries/markdown-quality/commit/bfcf44061750851b69128d73aeeaf89bd5e17bcf): avoid continuing manual version edits after centralization.

Planning inspection establishes dependency eligibility and the proposed design only.
The referenced chat reports Markdown Quality qualification and delivery; this plan inspected its local source/commits and does not independently recertify its historical hosted runs.
JSON Quality's proposed floors remain unqualified until this plan's own required evidence exists.
