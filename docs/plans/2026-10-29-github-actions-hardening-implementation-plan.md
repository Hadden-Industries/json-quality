# GitHub Actions hardening from the Markdown Quality comparison: implementation plan

Date: 2026-10-29, Europe/Bucharest.
Revision: 1.
Status: draft implementation dossier based on the owner's agreed direction; implementation has not started under this plan.
Decision owner: Maksym Shostak / Hadden Industries.
Implementation scope: Hadden-Industries/json-quality only.
Inspected JSON source: 33c95858d316ca3cdabf319a2705f9161d44e7e5.
Inspected Markdown reference source: fa1188a867b29bddd0b972a080b7fcd0261bdec3.
Originating task: the GitHub Actions comparison and owner decisions in Codex conversation 01a18571-e3ca-7f42-9a2a-cd0c65f04ab5.

## 1. Purpose, authority and boundaries

Strengthen JSON Quality's existing deliberate qualification and release system using the useful differences identified in Markdown Quality.
The intended result is complete installed-layout evidence in ordinary CI, better process-resource observations, security analysis of all maintained implementation languages, and publication jobs with narrower authority.
Preserve JSON's existing source, package, native, evidence and recovery guarantees while making those improvements.

This dossier synthesizes the local Markdown plan at C:/Users/maksy/GitHub/markdown-quality/docs/plans/2026-10-29-github-actions-convergence-implementation-plan.md, revision 1, including its corrected conditional KaTeX-retirement decision.
The inspected plan's SHA-256 is 0c837f45f49948b4abc4d10dd71f7aa7aeedb2efd1f2a08cf8bd81a54a836321.
That file was a local planning artifact, not a published implementation or immutable Git reference.
Its section 11 identified four JSON follow-ups: ordinary isolated installs with complete receipts, process-tree observation, Python and C/C++ CodeQL, and separated npm/GitHub promotion privileges.
This request authorizes planning those follow-ups in this repository.
It does not authorize editing the Markdown plan or implementing its changes here.

The owner has accepted the broad design direction, exactly Node >=22.13.0 with best-effort support outside tested LTS releases, deliberate-only ordinary CI, and the exclusion of GitHub workflow dependency lockfiles.
The detailed requirements, scenario identifiers, schema changes, slice boundaries and C/C++ extraction topology below are proposed representations and implementation choices for review.
They are not an already captured HISEW requirement snapshot or proof that the exact implementation baseline has been accepted.

The present task authorizes this Markdown document and its scoped validation only.
It does not start a HISEW execution, adopt existing execution ownership, change code or settings, dispatch workflows, create issues, commit, push, stage packages, approve npm stages, publish releases or alter another repository.
When implementation is authorized, reuse that authority without unnecessary phase confirmations; the present planning boundary must not be mistaken for a permanent requirement to ask again for every reversible step.

There are three separate completion claims:

1. Source implementation: an exact JSON commit satisfies the accepted contracts and relevant local verification.
2. Hosted activation: the new qualification graph, scan identities and privilege boundaries work under the actual repository and publisher settings.
3. Package release: a separately selected version completes fresh release qualification, staging, owner approval, anonymous registry checks, archival and any authorized availability change.

Source completion does not prove hosted activation or authorize a package release.
No next version is selected here; package.json currently declares 1.0.0-rc.2.
Existing published versions, original artifacts, source identities and recovery journals remain immutable.

## 2. Decision synthesis and scope

### 2.1 Mapping the ten comparison points

| Decision | Comparison point | Result for JSON Quality                                                                                                                 | Consequence                                                                                                  |
| -------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| DEC-001  | 1                | Preserve JSON's coordinated producer, reusable qualification and single acceptance graph                                                | Extend the existing authorities; do not replace them with Markdown's older parallel pipelines                |
| DEC-002  | 2                | Preserve deliberate-only ordinary product qualification                                                                                 | ready_for_review runs full CI; main push observes reuse; FULL_REQUIRED never starts full tests automatically |
| DEC-003  | 3                | Keep engines.node exactly >=22.13.0 and best-effort non-LTS support                                                                     | Producer and action runtimes remain distinct from the installed consumer floor                               |
| DEC-004  | 4                | Retain JSON's C++20, Node-API 9 and framed executable production model                                                                  | Preserve Windows/Linux builds, source/rights identities and ASan/UBSan; do not import Rust/Snapper           |
| DEC-005  | 5                | Run root and isolated installed-consumer qualification in ordinary as well as release lanes                                             | Both results must survive into acceptance and reuse; release-only audit evidence remains release-only        |
| DEC-006  | 5                | Add process-tree resource observation beside existing JSON metrics                                                                      | Preserve correctness, startup-count and cleanup checks; do not copy Markdown's numerical performance limits  |
| DEC-007  | 6                | Keep JSON's packaging, recipient inventory and trusted-source contracts, strengthening their integration where these changes touch them | No second packer, generic bundle repair system or full Markdown-tree verifier is needed                      |
| DEC-008  | 7                | Extend explicit security orchestration to Python and C/C++ without losing Actions or JavaScript/TypeScript                              | Scan production, mandatory job inventories, PR proof and release admission change together                   |
| DEC-009  | 8                | Separate npm promotion authority from GitHub release mutation authority while retaining JSON's centralized contracts and recovery model | Partial outcomes need authenticated handoff and service-specific reconciliation                              |
| DEC-010  | 9                | Retain immutable transport, original-attempt evidence and whole-workflow validation; add checks for new contracts                       | SHA pinning stays; GitHub workflow dependency lockfiles are excluded                                         |
| DEC-011  | 10               | Preserve JSON governance and change only settings required by this implementation                                                       | Check and read back concrete environment/publisher changes; no wholesale governance rewrite                  |
| DEC-012  | Cross-cutting    | Keep all implementation and activation work scoped to JSON Quality                                                                      | No sibling-checkout runtime dependency, shared CI service, downstream migration or Markdown edits            |

These choices are consistent with preserving coverage, least privilege, reproducibility and honest evidence.
Deliberate-only qualification remains an explicit owner process choice: it relies on mandatory acceptance and correct current-source checks, and cannot mean that stale or absent qualification is acceptable.
No decision here introduces a known exception to the agreed safety invariants.

### 2.2 Included changes

- Ordinary runtime lanes execute both existing install layouts against the same transported archive family and frozen consumer runtime.
- Ordinary compact receipts, PR proof, main reuse and affected release readers require the complete current evidence contract.
- Existing orchestration benchmarks gain process-tree observations and explicit cleanup/observation outcomes on both supported platforms.
- CodeQL covers Actions, JavaScript/TypeScript, Python and C/C++, with extraction sufficient for the actual native implementation.
- Promotion and restoration use separate jobs, credentials, operation-specific journals and authenticated continuation evidence for npm and GitHub effects.
- Workflow validation, source-input identities, tests, documentation, evidence retention and activation procedures follow those changes.

### 2.3 Excluded changes and features to preserve

Do not alter JSON discovery, schema admission, duplicate detection, number lexemes, NFC/Unicode semantics, formatting, rewrite authorization, source containment, logical-source contracts or public resource defaults.
Do not replace native components, remove sanitizers, change the dependency supply chain merely to simplify scanning, or convert observation into a new product runtime limit.
Do not add automatic full tests on push, an automatic FULL_REQUIRED fallback, workflow dependency lockfiles, publication credentials in PR jobs, or a new generic evidence service.

Markdown's real-corpus correctness qualification remains required in the Markdown plan.
This plan preserves JSON's own public consumer probe, functional/native cohorts and benchmark correctness, but does not claim that its synthetic workloads reproduce Markdown's real corpora or add those corpora as JSON release requirements.
Adding a new real-world JSON corpus campaign or performance SLO requires its own accepted workload/oracle and is outside this comparison-derived scope.

The KaTeX repair belongs to Markdown's dependency/package chain.
Keep any existing JSON development-tool dependency safeguards intact while using its locked Markdown toolchain, but do not copy Markdown's manifest repair or special bundling into JSON's published product.
The owner's instruction means retaining the repair while necessary, then removing redundant machinery after a maintained upstream upgrade and equivalent consumer checks; it does not require another keep-or-remove decision.
A future JSON development-tool update may consume that qualified upstream result, but this plan does not independently upgrade or remove the current tooling override.

Preserve the public reusable json-quality.yml workflow, its immutable trusted-source semantics and current inputs.
Markdown's full committed-tree validation is needed for Markdown documents and non-Markdown link targets; it is not a reason to replace JSON's domain-specific trusted JSON source contract with an unrelated whole-tree requirement.

## 3. Evidence baseline and known limits

The JSON checkout was clean at inspection before this document was added.
The inspected commit matches the JSON donor baseline recorded in the Markdown plan.
Current-source facts below were refreshed locally; historical measurements are attributed separately.

| Evidence | Observation and source                                                                                                                                          | Planning implication                                                                                            |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| EVID-001 | scripts/qualify-runtime.js selects root only unless JSON_QUALITY_RELEASE_OUTPUT is set                                                                          | The isolated implementation already exists; extend orchestration rather than invent another installer           |
| EVID-002 | qualification.yml and ci-command.js use one consumer-result.json; ci-proof.js validates one consumer object                                                     | A loop change alone would overwrite or fail output creation and leave proof incomplete                          |
| EVID-003 | qualify-package.js checks installed core/native bytes, public behavior and offline reinstall; reference lanes additionally run qualifyPublicApi                 | Retain all common checks in both layouts and preserve reference-only tooling distinctions                       |
| EVID-004 | recipientEvidence is conditional on --evidence; release-registry-evidence.js expects root-result.json and isolated-result.json                                  | Ordinary coverage need not duplicate release SBOM, recipient audit and signature generation                     |
| EVID-005 | bench-orchestration.js states child RSS is excluded; performance-probe.js samples parent memory and records native managed/scratch peaks and real child events  | Add an independent outer observation without replacing current measurements or interception-free child counting |
| EVID-006 | security.yml scans only actions and javascript-typescript with build-mode none                                                                                  | Python scripts and native C/C++ need explicit scan coverage                                                     |
| EVID-007 | ci-proof.js job names, release-contract.js expected jobs, release-security.js and release-evidence.js encode the two-scan contract                              | Every consumer of scan completeness must migrate in the same coherent change                                    |
| EVID-008 | promote-release.yml grants one promote job contents:write and id-token:write in npm-promotion                                                                   | Split the effect boundary; job names alone cannot enforce the separation                                        |
| EVID-009 | release-effects.js applyAvailability executes npm-latest and github-latest through one journal; recovery supports npm-only restoration and partial continuation | Separate service authority without losing original decisions, journal lineage or no-repeat guarantees           |
| EVID-010 | native/build.py owns verified source/dependency acquisition, generated resource headers, CMake builds and rights evidence                                       | Reuse this builder for traced extraction; scan artifacts must not replace production artifacts                  |
| EVID-011 | package engines is >=22.13.0; policy uses Windows 2025 and Ubuntu 24.04, producer Node 24.22.1/npm 12.2.1, consumer npm 11.21.1                                 | Preserve the support contract and freeze separately selected producer/consumer identities                       |
| EVID-012 | HISEW reports personal applicability active and worktree-local focused/affected/full commands                                                                   | Use the actual registered route during implementation; declarations are not proof of coverage                   |

HISEW profile inspection returned worktree ID 5163f2d2-392c-4676-b05d-909a0914749d, focused and affected timeouts of 600 seconds, and a full timeout of 1,800 seconds.
The commands are npm run check:focused, npm run check:affected and npm run check:full.
Its retained baseline was 183721ed1682526f00409eb4a0f41a4a0de94906, with coverage and input ordering reported unknown and no declared path coverage for those profiles.
The reported full obligation describes existing engine context; it does not select a route or transfer ownership for this new plan.
Do not attribute the engine's larger historical changed-path inventory to this task or reset retained execution state to make it match the current checkout.

### 3.1 Isolated-layout cost evidence

The prior comparison inspected JSON release run 40661674658 from 2026-10-28.
The Markdown plan records eight consumer lanes, with the isolated work shared by ordinary CI taking approximately 9-11 seconds per Linux lane and 48-88 seconds per Windows lane: 291.918 seconds, about 4.9 runner-minutes in total.
The whole isolated release segments, including release-specific work, totaled 350.915 seconds, about 5.85 runner-minutes.
An estimated parallel elapsed addition of roughly 1-1.5 minutes was plausible for that run, not a service guarantee.

Those values are inherited historical phase-log measurements, not a newly executed non-release A/B benchmark.
They justify the agreed coverage improvement; they do not establish the cost of new CodeQL builds, process observers or changed reference API tooling.
Measure the final graph on equivalent inputs and distinguish runner minutes, critical-path elapsed time, queue delay, registry variability and retries.
Do not remove isolated coverage if a later run is slow; diagnose and optimize redundant work within the accepted coverage first.

### 3.2 Reuse and primary-source assessment

The reuse basis is the existing JSON implementation plus Markdown's process observer and privilege-separated workflow at the frozen source above.
Both repositories' inspected LICENSE files have identical AGPL-3.0-only text, SHA-256 8486a10c4393cee1c25392769ddd3b2d6c242d6ec7928e1414efff7dfb2f07ef.
Preserve attribution for adapted code and inspect notices/terms of any newly selected third-party component separately; matching project licenses do not clear unrelated dependencies.

| Capability             | Selected reuse or composition                                                                                                | Residual work and rejected shortcut                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Installed layouts      | Existing qualify-package.js, consumer-toolchain.js, public probe and native npm                                              | Orchestrate two layouts and bind their evidence; no second packer or installer                                                    |
| Process observation    | Adapt Markdown's fresh Python driver using Python standard library, Windows Job Objects and Linux process-group observations | Integrate JSON probe/report/cleanup semantics; parent-only process.memoryUsage and child counts cannot supply tree memory         |
| Static analysis        | Existing pinned GitHub CodeQL action and native/build.py for compiled extraction                                             | Add scan inventory and native build integration; a prebuilt binary cannot supply a traced source database                         |
| Publication separation | GitHub job permissions/environments plus existing JSON effect, journal, transport and recovery modules                       | Separate the npm/GitHub capabilities and evidence; do not copy Markdown's weaker or differently scoped release contract wholesale |
| Evidence validation    | Existing YAML parser, native npm/SemVer, artifact SDK, bounded transport and exact-byte release validators                   | Extend domain contracts and rejection tests; no hand-written YAML/SARIF grammar or alternate upload service                       |

Windows Job Objects provide native grouped-process accounting; the retained metric must identify committed-memory accounting rather than calling it RSS.
Linux process-group RSS sampling has different semantics and can miss short-lived peaks or count shared pages more than once.
Use those limitations in the report and acceptance contract, not as hidden implementation details.
The proposed observer does not promise hostile-process containment or complete lifetime enumeration of processes that escape the group.
Relevant platform sources are [Windows Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects), [job memory accounting](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-jobobject_extended_limit_information) and [Linux process status](https://man7.org/linux/man-pages/man5/proc_pid_status.5.html).

CodeQL supports C/C++ without a build, but generated inputs, compiler definitions and external headers can affect extraction accuracy.
The proposed manual-build choice follows JSON's actual generated headers and platform-specific implementation; it remains an integration hypothesis until both databases demonstrate coverage.
See [CodeQL build modes](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-for-compiled-languages) and [compiled-language extraction guidance](https://docs.github.com/en/code-security/reference/code-scanning/codeql/build-options-for-compiled-languages).

Npm's trusted publishing distinguishes direct publishing, staging and dist-tag permission.
Current documentation states staging remains available to configured trusted publishers; disabling direct publish does not make the credential intrinsically dist-tag-only.
Describe the promotion credential accurately and enforce an operation allowlist in addition to its platform permissions.
See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).
Job-local minimum permissions follow [GitHub secure workflow use](https://docs.github.com/en/actions/reference/security/secure-use).

These sources were checked on the planning date.
At implementation selection, refresh the exact CodeQL action, supported toolchains and terms; select current stable or applicable LTS identities under HISEW VER-01 and freeze them before execution.
Do not silently retain an obsolete pin because it appears in the donor, select moving latest during a run, or raise the public consumer floor to satisfy producer tooling.
Existing Python setup already supplies the repository interpreter; adding a new third-party process library is not necessary for the proposed bounded observer.
If that proposal cannot meet the accepted observation contract, research the specific missing capability before building another monitor.

## 4. Proposed HISEW route

### Risk class:

R2 for future implementation, proposed for owner acceptance.
Writing this plan does not activate that route.

### Decision owner:

Maksym Shostak / Hadden Industries owns scope, risk, activation and release decisions.
The implementing coordinator owns integration, evidence, preservation of unrelated work and task-owned cleanup within the accepted authority.

### Reasoning:

The change alters acceptance evidence, scan completeness, credential boundaries and cross-service publication/recovery.
A faulty consumer or continuation can admit unqualified bytes or repeat an externally visible mutation.
These are R2 triggers even if public JSON behavior remains unchanged.
No R3 consequence has been established by this task.

### Potential blast radius:

Contributors, CI/reuse consumers, release operators, the core package and its Windows/Linux native package family, and consumers of published JSON versions.
Other repositories remain outside implementation authority.

### Reversibility:

Unactivated source can be reverted.
Hosted permissions/settings can be restored only to a captured, compatible and authorized state.
External effects, downloads and immutable publication cannot be undone by reverting Git.
Unknown outcomes require native readback and explicit reconciliation; old incomplete evidence must not be relabeled as sufficient.

### Principal unknowns:

Process-observer reliability under actual hosted supervision, C/C++ extraction completeness and cost, exact current publisher/environment settings, active historical release continuations, and final profile coverage/duration.
Section 12 specifies bounded experiments and owners.

### Required artifacts:

Accepted exact plan and protected requirement snapshot, route rationale and sensitive-scope selection, changed source, focused and full evidence, independent review dispositions, hosted identities, and activation/recovery readbacks when applicable.
Retain compact records in existing evidence owners rather than introducing a parallel reporting system.

### Required specialist lenses:

Independent contract/implementation review and security assessment of changed input, artifact, privilege and recovery boundaries under the selected R2 procedure.
Native/extraction and licensing review applies where materially changed.
This planning task launches no external review, security scan or subagent and grants no delegation authority.

### Required verification:

Focused slice checks, the full relevant local profile, Windows/Linux frozen runtime lanes, both install layouts, native/sanitizer preservation, complete scan inventory, negative evidence cases and authorized hosted readback.
Local test success, HISEW receipts, hosted qualification, configuration activation and release completion are distinct evidence classes.

### Required human approvals:

Accept the exact implementation baseline and R2 route before execution.
Use existing or subsequently supplied authorization for concrete remote changes and publication, preserving npm owner approval and current release decision boundaries.
Do not introduce repeated approvals merely because execution crosses a slice boundary.

### Maximum sensible autonomy:

For this request, write and validate this plan only.
Following implementation authorization, complete the accepted source and verification work without unnecessary pauses, respecting actual remote-effect and unrelated-resource boundaries.

### Next lifecycle step:

Review this revision, capture the accepted exact requirements, recheck applicability and genuine execution ownership, select the relevant obligations, then start SLICE-001.
Commit the accepted plan at the first authorized implementation checkpoint before executable changes.
Format and lint every file in each exact commit scope and check exit codes before committing.

## 5. Requirements, acceptance criteria and scenarios

### 5.1 Requirements and acceptance

| Requirement | Required behavior                                                              | Acceptance criterion                                                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-001     | Preserve deliberate orchestration and support policy                           | AC-001: ready_for_review, explicit main dispatch and observation-only main push retain their meanings; >=22.13.0 and best-effort wording remain; no workflow dependency lockfiles  |
| REQ-002     | Qualify both installed layouts in every ordinary/release runtime lane          | AC-002: exactly one successful root and isolated result per frozen lane, same transported package tuple and source/runtime identity, with all common recipient assertions          |
| REQ-003     | Admit complete, authenticated current-layout evidence                          | AC-003: acceptance/reuse rejects missing, duplicate, conflicting, old-schema or foreign layout evidence and retains original producing attempts                                    |
| REQ-004     | Observe the workload process tree without discarding existing metrics          | AC-004: both platforms report metric, method, scope, sample/identity context, cleanup and observation outcomes alongside parent and native values                                  |
| REQ-005     | Preserve performance correctness and distinguish evidence from budgets         | AC-005: structural startup and functional assertions remain; failed/incomplete observations fail qualification; no copied 30-second/512-MiB limit or claimed population percentile |
| REQ-006     | Scan all maintained implementation languages with meaningful native extraction | AC-006: Actions, JS/TS, Python and supported-platform C/C++ observations exist for the exact source; both native bindings and generated inputs are represented                     |
| REQ-007     | Require complete scan evidence at every applicable admission boundary          | AC-007: PR job inventory, main reuse, release qualification, registry/security collection and promotion reject any missing/foreign/failed required scan                            |
| REQ-008     | Enforce separate npm and GitHub mutation capabilities                          | AC-008: npm effect job lacks contents:write; GitHub promotion job lacks npm OIDC and tokens; neither dispatcher exposes the other service's mutation                               |
| REQ-009     | Preserve recoverable, one-request-at-a-time release effects                    | AC-009: authenticated handoff, original journals, guarded readbacks and recovery prevent replay of completed/unknown effects; npm-only restoration leaves GitHub state unchanged   |
| REQ-010     | Preserve package, native, trusted-source and evidence guarantees               | AC-010: one transported tuple, exact installed bytes, public APIs, offline reinstall, rights/sanitizers, trusted-source isolation and bounded artifact transport remain exercised  |
| REQ-011     | Make migration and operational activation explicit                             | AC-011: new schemas and job/category identities have current readers, old proof is denied, gates remain effective, environment/publisher settings are read back before effects     |
| REQ-012     | Deliver proportionate, maintainable evidence and documentation                 | AC-012: DRY authorities, semantic names, focused/full mapping, cost/retention facts, runbooks and owned cleanup are complete without cross-repository mutations                    |

### 5.2 Falsifiable quality scenarios and oracle ownership

Expected outcomes come from the accepted contract and independent fixtures, not by calling the production validator to generate its own expectations.
Mock only genuine provider/clock/transport/process-observation boundaries; exercise internal packing, parsing, admission and continuation logic directly where practical.
Real hosted/provider evidence remains required for claims that a local mock cannot establish.

| Scenario | Stimulus                                                                                | Required response and independent oracle                                                                                            |
| -------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| QA-001   | Main push has no current PR proof or only schema-1 root-only proof                      | FULL_REQUIRED with a reason; no full graph launched; coordinator checks provider job inventory                                      |
| QA-002   | One frozen lane passes root but isolated is missing or fails                            | Lane and aggregate fail; fixture explicitly removes/fails the isolated observation                                                  |
| QA-003   | Duplicate root result, swapped layout labels, mismatched archive/source/native identity | Rejection before proof creation/reuse; independent receipt mutations                                                                |
| QA-004   | Floor Node 22.13.0 on Windows and Linux installs each layout                            | Real public behavior and offline lock replay pass; npm/native executable identities recorded                                        |
| QA-005   | Retained jobs come from earlier original attempts during a rerun                        | Authenticate original executions; reject relabeled provenance and mixed archive families                                            |
| QA-006   | A workload child holds a known large allocation while parent memory stays small         | Tree observation detects the child contribution with platform-appropriate tolerance; separate fixture knows allocation/lifetime     |
| QA-007   | Probe exits but an owned child/grandchild remains, or the workload times out            | Bounded shutdown and explicit failure; never pass solely on parent exit; independent child/process readback                         |
| QA-008   | Observer access/accounting fails or a sample cannot be validated                        | Observation-incomplete failure, retained diagnostics, no zero-memory substitute or success fallback                                 |
| QA-009   | Same fixed benchmark runs with the new observer                                         | Correct terminal results, native identities, batching counts and raw samples preserved; report observer overhead separately         |
| QA-010   | Python scan fails or one C/C++ platform extraction is empty/incomplete                  | Mandatory scan/acceptance fails even if other languages are green; extraction/source inventory is the oracle                        |
| QA-011   | Analysis has wrong SHA, ref, category, workflow identity, warnings/errors or findings   | Release admission rejects under current security policy; explicit provider/SARIF fixtures                                           |
| QA-012   | Duplicate Linux C/C++ record substitutes for missing Windows record                     | Exact unique scan-key inventory rejects it; language count alone cannot pass                                                        |
| QA-013   | npm job attempts GitHub mutation, or GitHub job attempts npm mutation                   | Static permission/operation checks and constrained boundary tests reject; hosted bindings read back                                 |
| QA-014   | Npm succeeded; handoff upload or later GitHub effect failed                             | Preserve partial result; reconcile actual npm state and original journal; do not repeat npm                                         |
| QA-015   | Network loss follows a mutation request before response persistence                     | Outcome remains unknown; next effect blocked until owner-selected native reconciliation                                             |
| QA-016   | Foreign, stale or digest-mismatched handoff is supplied                                 | GitHub job denies before write; test provider artifact identity, source, decisions, target and prior labels separately              |
| QA-017   | Another writer changes labels or main while approval/handoff is pending                 | Just-in-time guards reject; concurrency is not treated as an atomic cross-service transaction                                       |
| QA-018   | Owner selects npm-only restoration to a qualified immutable prerelease                  | Core npm default changes once; GitHub latest and both prerelease markers remain unchanged; no GitHub writer required                |
| QA-019   | Current security knowledge or scan contract invalidates historical continuation         | Block effects, retain original evidence, select qualified forward/recovery route; never fabricate historical scans                  |
| QA-020   | Native/transport/trusted-source regression is introduced during integration             | Existing negative archive/source/native tests fail; qualified package tuple and trusted contract remain authoritative               |
| QA-021   | New required check/category or publisher environment is not active                      | Withhold affected activation/effects; keep effective protection and record pending evidence                                         |
| QA-022   | Performance/output artifact grows or old proof expires                                  | Measure named-consumer bounds; fail boundedly or require deliberate requalification; no summary scraping or automatic full fallback |

## 6. Architecture, ownership and proposed contracts

### 6.1 Installed layouts and compact proof

Keep qualification.yml's existing producer and frozen runtime matrix.
The producer still makes one authoritative transported core/native archive family; each runtime source suite runs once per lane, followed by two installed layouts.
Both layouts execute qualify-package.js with the same archive/provenance and selected Node/npm.
Retain reference-runtime public API/type/tooling checks in both reference layouts; do not run producer-only tooling on the minimum runtime or weaken its engine checks.

Use one per-lane output directory in ordinary and release modes, with independently created root-result.json and isolated-result.json.
Separate the output-directory meaning from the decision to emit release audit/SBOM evidence.
The current JSON_QUALITY_RELEASE_OUTPUT variable conflates them and the single JSON_QUALITY_REPORT path cannot represent two results safely.
Update all live callers together with precise names; no implicit alias or old single-result fallback.
The exact replacement variable names are an implementation detail, but the two meanings must be distinct.

The compact lane record should contain exactly one keyed result for each required layout, plus common lane, host, source, archive transport and performance context.
Each result preserves its native package identity, archive hash, version, public-export/CLI assertions, installation source and qualification mode.
Validate shared identity agreement explicitly; two independent successes for different archives do not prove the lane.
Require completed offline replay/public probes before the result is written, preserving exclusive creation and no overwritten success.

Version the lane and aggregate proof where their wire meaning changes.
Update ci-command.js, ci-proof.js, fixtures, main reuse and source-input projection together.
Old single-layout proof remains historical data and yields FULL_REQUIRED under the new contract.
It must not be upgraded in place, padded with an inferred isolated result or silently admitted as a weaker legacy mode.
Release evidence retains its existing two-layout layout/inventory binding, amended only where the shared report contract actually changes.

### 6.2 Process-tree observation

Extend bench-orchestration.js around each fresh performance-probe.js execution rather than placing a process-wide monitor around the entire benchmark controller.
Use a fresh observer/owned process domain for each warmup and retained sample, preserving per-sample peaks and independent baseline/candidate runs.
Adapt Markdown's Python driver after reviewing its platform methods and failure paths; do not copy corpus-specific rules, percentile labels or numerical thresholds.

Windows uses a fresh Job Object associated before the workload can launch children, includes the observer in the declared measurement scope, and reads native memory/accounting through supported APIs.
Linux uses a dedicated process group with explicit group membership and bounded periodic RSS sampling.
Preserve the stated sampling limitations and test the actual child topology used by JSON.
If a reachable product child can escape the observation domain, do not claim full-tree coverage; resolve that gap with a suitable supported observer or revise the accepted claim before qualification.

Report the metric name, units, platform/method, driver inclusion, sampling cadence/count where applicable, observed process count semantics, peak, elapsed time, timeout/cancellation and quiescence outcome.
Keep parent RSS/heap/external/ArrayBuffer measurements and native managedPeakBytes/scratchPeakBytes in their existing meanings.
Do not add these overlapping quantities together or compare Windows committed-byte peaks numerically with Linux sampled RSS as though they were the same metric.
Count JSON's actual Git/Prettier children through its existing diagnostics channel; exclude the observer from product startup assertions.

Success requires a complete workload result and successful owned-process cleanup/observation under the declared method.
Timeout, observation failure, surviving owned processes, malformed output or changed source/native identity produces a failed report retaining available samples.
Do not retry to discard bad samples or lower the observed maximum.
The observer owns only its fresh child domain and scratch; it must not terminate other benchmark runs, HISEW, the user's terminal or unrelated processes.

Existing structural batching checks remain immediate gates.
Timing and tree-memory magnitudes remain diagnostic until platform/workload-specific budgets are accepted; no new public resource contract is introduced here.
A five-sample descriptive p95 is not a population percentile guarantee.
Compare observer overhead using identical workloads and baseline/candidate ordering, and retain the old report as historical evidence with its original limited scope.

### 6.3 Security coverage and compiled extraction

Keep security.yml callable, manually dispatchable and scheduled as today.
Preserve the Actions and JS/TS scans, add Python, and add C/C++ analysis for both supported native platforms.
The proposed initial scan inventory is five observations across four languages:

| Scan key              | Language              | Proposed execution                       | Category meaning                         |
| --------------------- | --------------------- | ---------------------------------------- | ---------------------------------------- |
| actions               | actions               | Ubuntu, build-mode none                  | Preserve /language:actions               |
| javascript-typescript | javascript-typescript | Ubuntu, build-mode none                  | Preserve /language:javascript-typescript |
| python                | python                | Ubuntu, build-mode none                  | /language:python                         |
| cpp-linux             | c-cpp                 | Ubuntu 24.04, traced manual native build | Distinct C/C++ Linux category            |
| cpp-windows           | c-cpp                 | Windows 2025, traced manual native build | Distinct C/C++ Windows category          |

The two-platform C/C++ topology is a proposed detailed implementation choice, not a claim that the owner previously specified five scans.
It follows the real generated headers, Windows-specific definitions/libraries and native platform branches.
Freeze final category strings and job names in the accepted scan contract before changing producers/readers; proposed forms are /language:c-cpp/platform:linux and /language:c-cpp/platform:windows.
Validate the selected CodeQL action's canonical language identifier and actual provider environment metadata instead of guessing them from display labels.

Initialize CodeQL before a clean native/build.py build and analyze after both framed executable and Node-API binding compilation.
Use the verified dependency/source inputs, generated resource defaults and compiler identities from the native owner.
Inspect extraction diagnostics and represented first-party translation units/headers on each platform, including the platform-specific paths; a successful upload or nonzero rules count is insufficient proof of coverage.
Do not stage the scan build into native/prebuilt or publish it as the production component.
Keep existing independent native builds and sanitizer checks; static analysis is not their replacement.

Sharing the native builder is required; moving production and security into a single job is not required.
Initially accept the extra traced builds as a distinct verification purpose and measure their cost.
Any later build consolidation must preserve source identity, scan extraction, rights evidence, sanitizer separation and artifact provenance.
Do not switch to autobuild or no-build merely to make a failing/slow manual scan green without demonstrating equivalent intended coverage.

Maintain one semantic scan inventory with checked workflow projections and readers, likely a small repository-owned policy module/data file rather than another service.
CI job inventories, release expected jobs, exact-source CodeQL admission, SARIF checks, evidence-index collection and promotion refresh all consume the same current scan meanings.
Verify exact source/ref, expected caller workflow identity, distinct category/platform, tool/query identity and successful analysis under the existing no-findings/no-error/no-warning release policy.
Handle multiple historical analyses deterministically without selecting an older green result to mask a current failed attempt.
Scheduled scan success does not itself constitute full product qualification.

### 6.4 Publication privileges and durable handoff

Retain promote-release.yml's explicit owner dispatch, decision digests, expected prior labels, shared mutation concurrency group and cancellation-disabled policy.
Replace the combined writer with a read-only admission path, an npm-only effect job, a GitHub-only effect job for dual-service availability, and a final read-only completion decision where needed.
Names must describe their actual operation; "completed" means all services selected by the decision have been independently read back.

| Boundary                                | Required authority                                                                                                       | Explicit restriction                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Admission and fresh qualification reads | contents/actions/security reads as actually needed                                                                       | No npm or GitHub mutation capability                                                               |
| Npm availability effect                 | npm-promotion environment, OIDC, repository reads, permitted dist-tag operation                                          | No contents:write, no long-lived npm token, no direct publish, no stage invocation in this command |
| GitHub availability effect              | github-release environment or an equivalently explicit existing protected environment, contents:write and required reads | No npm OIDC request capability, npm token or npm mutation entry point                              |
| Completion/recovery observation         | Only reads required for the selected service scope                                                                       | Cannot turn a missing/unknown effect into success                                                  |

GitHub archival may legitimately use OIDC for attestation in a different job if its contract requires it.
The prohibition above is on npm authority in the GitHub promotion effect, not a blanket ban on every GitHub job ever requesting an identity token.
Provider bindings, environment names, audience and allowed operations determine actual authority.

Factor common immutable admission, target selection, security refresh and recovery logic in the existing release modules.
Do not duplicate complete admission implementations in two scripts or continue exposing a combined mutation dispatcher to both jobs.
Keep effect-time guards immediately before each native service mutation; sharing pure policy logic does not remove enforcement at each boundary.

The npm effect produces a sealed continuation bundle identifying the repository, controller/source, manifest, review/acceptance/restoration decisions, target/version/integrity, availability scope, explicit prior labels, original execution, npm journal digest and native readback.
Transfer it through the existing artifact-ID/digest/size/run/attempt checks and bounded extraction.
The GitHub job authenticates that exact predecessor and also checks current npm/GitHub state and current-main guards before its write.
Do not trust an output string, artifact name, green summary or unbound completion file as authority.

Use service-specific effect identity within the release phase so npm and GitHub jobs cannot collide on a phase/run/attempt journal path or overwrite each other's sealed evidence.
Preserve exact original journal bytes, append-only request/outcome records, no-request markers and recovery-index uniqueness.
Each job uploads its journal/evidence on failure as well as success; an absent artifact still cannot prove no request happened.
The handoff state distinguishes npm-complete/GitHub-pending from fully completed availability.

Preserve JSON's current label scope: stable promotion changes the core package's npm latest and the selected GitHub latest state; native packages remain selected by the core package's exact optional dependencies.
Do not copy Markdown's native-tag sequencing and thereby broaden JSON's current mutation scope accidentally.
All package-family version/integrity checks and platform-before-core staging remain intact in their existing phase.

Npm-only restoration must continue to admit an explicitly qualified immutable prerelease target when the owner's restoration decision permits it.
It changes only the core npm default and verifies the unchanged GitHub latest value, affected/target identities and prerelease flags.
It must not require launching a GitHub write-capable job or requesting its environment approval just to do readback.
The final acceptance contract explicitly recognizes the selected npm-only scope; a skipped required dual-service writer must still block ordinary promotion.

Recovery is forward reconciliation, not automatic retry.
If npm succeeded and GitHub failed, authenticate the old npm effect and resume only the missing GitHub operation after fresh admission.
If a response or journal was lost, retain unknown status and require owner-selected native readback under the existing recovery model.
Preserve existing repair-current-label behavior, prior-label guards, staged-family abandonment, historical immutable-target readers and multi-attempt writer-history checks.
Never rewrite historical journals into the new schema or infer that a failed job performed no mutation.

### 6.5 DRY-01 authority and deployment table

| Knowledge and current authority                         | Latest consumers affected                                       | Strategy and failure boundary                                                                  | Owner and drift control                                                |
| ------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Runtime policy: assets/node-support.json                | Matrix, setup, package projections, release policy              | Preserve one source; distinct producer/consumer roles                                          | Maintainer; existing projection/matrix tests                           |
| Consumer semantics: qualify-package.js and public probe | Runtime orchestration, release/registry qualification           | Reuse implementation in two layouts; release evidence remains a separate concern               | Package owner; negative installed fixtures                             |
| Required layout set and current receipt meaning         | Runtime output, ci-command, ci-proof, reuse and release readers | One current contract with checked producers/readers; reject obsolete live proof                | Coordinator; schema/mutation tests                                     |
| Benchmark workload and product result                   | bench-orchestration.js and performance-probe.js                 | Observer supplies platform facts, not product expected results                                 | Performance owner; independent workload and child fixtures             |
| Platform process accounting                             | Adapted repository-owned observer                               | Separate Windows/Linux methods with explicit meanings; no cross-platform numerical equivalence | Performance owner; platform conformance and failure tests              |
| Scan inventory                                          | security.yml, CI/release job and analysis readers               | One policy with checked static workflow projection                                             | Security/integration owner; missing/duplicate/wrong-platform mutations |
| Release identity and decisions                          | release-contract.js, evidence, effects, recovery, workflows     | Shared pure rules; enforce at each new capability boundary                                     | Release operator; independent expected state transitions               |
| Artifact admission                                      | Existing transport and artifact policy modules                  | Reuse bounded immutable transfer; no name-only continuation                                    | Evidence owner; hostile/corrupt archive regressions                    |
| Mutable service effects                                 | Effect-specific operations and journals                         | Deliberately separate capabilities; shared decision semantics                                  | Release operator; wrong-service rejection and interruption tests       |
| Workflow permissions and settings                       | YAML validator, governance policy, environments/npm publishers  | Source declarations plus native provider readback; neither alone proves effective settings     | Maintainer; desired-state diff and readback                            |

The Markdown and JSON observers remain separately released repository implementations of the same platform techniques.
That duplication preserves independent delivery and avoids a new cross-repository runtime service for this scope.
Retain donor attribution and the precise method/limitations contract, with platform regression cases as drift control.
Reassess sharing only if real maintenance divergence justifies a separately authorized common component.

NAM-01 is mandatory: distinguish layout results from release evidence, observation from limits, scan language from scan instance, and partial from complete publication.
DOC-01 records reasons and limitations that names cannot carry.
No compatibility alias, permissive old-proof reader or silent fallback is authorized under NSH-01.
Existing historical release readers retain their accepted audit/recovery purpose; they do not exempt new continuations from current security/authorization requirements.

## 7. Vertical implementation slices

Paths below name existing seams unless explicitly described as proposed.
They predict change locations, not complete code or a mandatory sequence of microscopic edits.
Each slice includes its tests/docs and can be demonstrated before the final consolidated review.
Some contract changes must activate together even when developed incrementally.

### SLICE-001: One ordinary lane proves both installed layouts

Change qualify-runtime.js and qualification.yml to execute root and isolated against the same frozen tuple and produce separate results in both modes.
Update ci-command.js and ci-proof.js to carry and validate both layouts, including output naming, exact identity agreement, original attempts and schema version.
Update main reuse and every relevant fixture so a root-only historical receipt yields FULL_REQUIRED.
Preserve source-suite execution once per lane and reference API tooling scope.

Likely files: scripts/qualify-runtime.js, scripts/qualify-package.js only if report metadata needs refinement, scripts/ci-command.js, scripts/ci-proof.js, .github/workflows/qualification.yml, tests/ci-proof.test.js, tests/ci-hardening.test.js, tests/package-probe.test.js, tests/consumer-ci.test.js and docs/ci-trust.md.
Inspect other report consumers through the dependency graph before freezing the schema.

Proof: QA-001 through QA-005 plus ordinary versus release runs on both supported floor lanes.
Real isolated installation must resolve its package/native component from the nested tool root, pass public probes and survive offline reinstall.
Mutate each required layout/identity and demonstrate rejection at proof creation and main reuse.
Measure the added phase cost without enabling release-only evidence generation in ordinary CI.

Release/recovery implication: old PR proof becomes unusable under the new contract; explicit qualification is the recovery.
Historical release evidence is not modified.
Remove the obsolete single-result caller contract and task-owned install scratch after its evidence consumers finish.

### SLICE-002: A benchmark sample reports tree resources and cleanup

Introduce the narrowly adapted observer, proposed scripts/observe-process-tree.py, and integrate it with existing benchmark/probe output.
Keep the same public session workload, native identity, alternating comparison, warmup, retained samples and child-count gate.
Version changed report meaning and include the observer/policy inputs in source identity and CI proof invalidation.
Update the affected-test graph for Python/script/workflow changes so new contracts cannot be skipped.

Likely files: scripts/bench-orchestration.js, scripts/performance-probe.js, the proposed observer, scripts/ci-command.js and scripts/ci-proof.js where reports are admitted, tests/native/orchestration-benchmark.test.mjs, native process/cleanup test helpers, scripts/affected-tests.js and docs/javascript-performance.md.
Keep public resource-policy code unchanged unless an actual defect is separately accepted.

Proof: QA-006 through QA-009, including a memory-heavy child, a surviving grandchild, timeout, unavailable observation and deterministic cleanup on Windows/Linux.
Check fixture/product bytes and current benchmark assertions independently of observer output.
A failure report must retain the recipe, available environment, source/native identity, raw samples and observation-failure reason.
No success fallback to the old parent-only metric is allowed in a mandatory lane.

Release/recovery implication: incomplete new resource evidence blocks current qualification but does not imply a previously published version violated a newly invented memory SLO.
Retain historical baseline reports unchanged; delete only owned process domains and scratch after settlement.

### SLICE-003: Full-language scans reach CI and release admission

Add Python and proposed platform-specific traced C/C++ jobs using security.yml and the existing native builder.
Introduce or consolidate the required scan inventory, update expected provider jobs/categories and validate extraction completeness.
Extend CI proof and release security contracts together, including registry collection and promotion-time refresh.

Likely files: .github/workflows/security.yml, caller workflow permissions if necessary, scripts/ci-proof.js, scripts/release-contract.js, scripts/release-security.js, scripts/release-evidence.js, scripts/release-registry-evidence.js, scripts/check-workflows.js, tests/ci-proof.test.js, tests/release-contract.test.js, tests/ci-hardening.test.js and docs/ci-trust.md.
Inspect native/build.py only for necessary supported tracing integration; do not fork its build/dependency logic.

Proof: QA-010 through QA-012 and QA-019.
Inspect exact-source hosted analysis metadata and source extraction for both native bindings/platform branches.
Remove Python, duplicate one native platform, alter category/workflow/ref/source, inject failed analysis and invalid SARIF identity independently; all applicable consumers must deny admission.
Existing Actions/JS results, dependency review and sanitizer obligations remain mandatory.

Release/recovery implication: old two-language proof cannot authorize new full acceptance or release effects.
Preserve immutable old evidence and provide fresh current qualification where supported; do not add invented scan records to old release assets.
Keep new scan outputs distinct from production packages and clean only task-owned scan build trees.

### SLICE-004: Promotion crosses separate capability boundaries safely

Split the combined promotion writer into service-specific jobs and entry points with a sealed handoff.
Refactor shared admission/decision logic into existing authorities, introduce collision-free effect-specific journals, update provider job expectations and preserve interruption/recovery records.
Carry through stable promotion, dual-service restoration, npm-only restoration and repair-current-label cases.

Likely files: .github/workflows/promote-release.yml, scripts/release-effects.js, scripts/release-contract.js, scripts/release-evidence.js, scripts/release-recovery.js, scripts/release-provider.js as needed, scripts/check-workflows.js, tests/release-contract.test.js, tests/release-resilience.test.js, tests/ci-hardening.test.js and docs/release-operations.md.
Do not change stage-release.yml or github-release.yml authority except where a shared contract change requires a checked projection.

Proof: QA-013 through QA-019.
Use recording provider fixtures to count actual mutation requests and independently assert expected states after failures at every handoff/effect boundary.
Test no-request, request-sent/unknown, completed npm/pending GitHub, completed dual-service and completed npm-only outcomes.
Static workflow checks must fail if privileges recombine or wrong-service mutation paths become reachable.
Hosted readback later establishes actual environment/trust configuration; a mocked passing release is not publication qualification.

Release/recovery implication: current writer-history admission must understand both original combined journals and new service-specific journals for their accepted historical/recovery purposes.
Do not let this compatibility for immutable history become permission to execute the obsolete combined writer after activation.
Reconcile active old attempts before new mutation activation.
Retain unknown/failed journals through the recovery horizon rather than deleting them as scratch.

### SLICE-005: Consolidated qualification, activation and operational handoff

Close all producer/consumer/schema projections, source-input hashes, workflow validation, affected-test mappings, package/trusted-source regression coverage and documentation.
Review the complete diff against this dossier, consolidate corrections, then run the selected final relevant full verification and independent assurance.
Refresh only evidence affected by later inputs/failures or actual policy requirements; do not rerun full suites just to decorate a receipt.

Demonstrate the intended deliberate hosted graph on the final source, both layouts across the frozen runtime matrix, platform observers, full scan inventory and preserved native/sanitizer work.
Inspect current rulesets, action policy, environments and npm publisher settings read-only and prepare the minimal concrete activation delta.
Apply/read back only separately authorized remote changes, preserving effective required gates throughout.
Show first-main reuse or honest FULL_REQUIRED; never silently start full tests to hide a cutover gap.

Likely files: docs/ci-trust.md, docs/release-operations.md, docs/javascript-performance.md, docs/README.md if indexing is appropriate, scripts/check-workflows.js and .github/governance.json only if a genuine desired-state change is necessary.
Runtime policy changes are not a goal; stale pre-LTS metadata or tool selection needs a specifically justified refresh if encountered, without changing the public engine range.

Proof: all ACs, especially QA-020 through QA-022; exact final source/review/test linkage; before/after provider state; package and archive regression checks.
No package publication is a required rehearsal for this slice.
Where live write behavior cannot be demonstrated without an unauthorized release, mark that boundary unexecuted and provide the validated runbook rather than claiming release completion.

### 7.1 Traceability and order

| Slice     | Requirements / acceptance | Decisions / scenarios                                      | Proof                                                                             | Delivery and cleanup implication                                                    |
| --------- | ------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| SLICE-001 | REQ/AC-001, 002, 003, 010 | DEC-001/002/003/005/007/010; QA-001..005                   | Real two-layout lane plus rejecting incomplete proof                              | Coherent receipt cutover; preserve archive identity; owned installs removed         |
| SLICE-002 | REQ/AC-004, 005, 010, 012 | DEC-004/006/010; QA-006..009                               | Platform observer fixtures and unchanged product oracles                          | Reports versioned; no new product resource limit; settle owned children             |
| SLICE-003 | REQ/AC-006, 007, 010, 011 | DEC-004/008/010; QA-010..012/019                           | Five proposed scan instances, coverage inspection and rejection cases             | Current job/security contract changes atomically; scan builds remain non-production |
| SLICE-004 | REQ/AC-008, 009, 011      | DEC-007/009/010/011; QA-013..019                           | Least-privilege declarations, guarded state transitions and interruption recovery | Environment/trust activation separate; preserve immutable journals                  |
| SLICE-005 | REQ/AC-001..012           | DEC-001..012; QA-020..022 plus complete scenario inventory | Full relevant exact-source assurance and authorized hosted readback               | Source/activation/release status separated; task-owned cleanup recorded             |

Start with SLICE-001 to establish the current lane contract.
SLICE-002 extends the same proof/report consumers; serialize those edits with SLICE-001.
SLICE-003 updates shared CI/release completeness and must precede final promotion admission qualification.
SLICE-004 builds on that current security contract.
SLICE-005 integrates and activates the coherent result.
All shared receipt, scan and release-state writers have one integration owner.

Read-only native extraction research, process-observer experiments and remote settings inventory are semantically separable preparation after their authority is established.
This does not authorize delegation, concurrent writes to shared contracts or another chat's execution.
No automatic agent fan-out is required by this plan.

## 8. Verification and evidence plan

### 8.1 Focused checks and final coverage

Existing commands below are evidence entry points, not claims that they already test the proposed behavior.
Add the relevant negative scenarios to the same owners and update impact mapping before relying on them.

| Domain                       | Existing focused entry point                                                                                                  | Required addition or preservation                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Workflow and CI proof        | npm run check:ci; node --test tests/ci-proof.test.js tests/ci-hardening.test.js tests/consumer-ci.test.js                     | Both layouts, scan inventory, permission separation, invalid original-attempt/transport cases    |
| Installed packages           | node --test tests/package-probe.test.js tests/installation.test.js tests/recipient-inventory.test.js                          | Real root/isolated archive resolution and common probes; release inventory remains complete      |
| Process/resource observation | node --test tests/native/orchestration-benchmark.test.mjs tests/native/bounded-process.test.mjs tests/native/cleanup.test.mjs | Child allocation, observer failure, timeout/survivor and independent cleanup assertions          |
| Release/recovery             | node --test tests/release-contract.test.js tests/release-resilience.test.js tests/release-asset-verification.test.js          | Service boundaries, authenticated handoff, every interrupted state, npm-only restoration         |
| Native                       | npm run test:native and controlled native/sanitizer hosted paths                                                              | Existing binding, source, rights, resource and sanitizer guarantees                              |
| Performance                  | npm run check:perf and explicit output-preserving benchmark commands                                                          | Existing structural gates plus new observation validity, not uncalibrated magnitude thresholds   |
| Runtime policy               | npm run check:node; npm run test:node-policy                                                                                  | Exact floor, frozen lanes and distinct producer/consumer versions                                |
| Full source                  | npm run check:full through the current authorized HISEW route                                                                 | Map all changed obligations; source full does not include every hosted/platform/permission claim |

The current full command covers Node/workflow/resource/architecture/schema/type/release/package/security checks, serial tests, lint, formatting, package qualification and final JSON checking.
Preserve that coverage and final JSON ordering.
The separate hosted benchmarks, all frozen runtime lanes, CodeQL and native-production/sanitizer jobs remain independently required evidence.
Do not equate the script name full or a broad path declaration with measured coverage.
The registered 1,800-second full timeout and hosted 120-minute job budget are different controls; measure fit and obtain a justified declaration change if necessary rather than silently dropping checks or extending deadlines without evidence.

Format/lint changed JavaScript, Python, YAML, JSON and documentation with their actual repository owners.
The Markdown toolchain is installed separately under tooling/markdown and is excluded from product consumer/runtime behavior.
Use it for this plan and authored documentation; do not substitute Prettier for Markdown where the repository delegates that ownership.

### 8.2 Independent oracles and real boundaries

Receipt fixtures encode expected required layouts and scan keys independently of the production inventory generator.
Tests may share neutral builders/parsers, but a policy function cannot define both the actual decision and its expected answer.
Mutation tests should show each mandatory assertion can fail independently.

Process fixtures control allocation lifetime and descendant behavior without patching the production observer's answers.
Use actual operating-system processes for platform integration and a narrow injected observation boundary for rare error paths.
Release tests replace genuine GitHub/npm transport only; they count mutations and validate original serialized journal bytes through the real readers.
Dry-run or fake credentials never establish actual trusted-publisher permission.
CodeQL metadata fixtures prove verifier behavior; successful hosted extraction and source inventory prove scanning integration.

### 8.3 Evidence, budgets and retention

Keep compact per-lane reports and one aggregate PR proof bound to the original producer artifact.
Preserve the existing 30-day PR proof/archive horizon and release qualification horizons; routine same-run transport may remain one day where all named consumers fit.
Promotion/effect journals currently use 90-day workflow retention; preserve that recovery horizon and the immutable release evidence that refers to them.
Do not let a new handoff expire before a protected environment/recovery consumer can use it; measure the actual horizon and retain or reacquire evidence under the existing identity checks.

Retain all raw benchmark samples, including failed observations, with their metric scopes and source/runtime/native identities.
Avoid separately duplicating entire native source/build trees or CodeQL databases into custom artifacts unless a named consumer needs them.
Use native scan/log facilities for ordinary diagnostics and bounded compact metadata for admission.
Measure proof bytes after adding both layouts and process data; keep existing transport bounds unless an explicit measured requirement justifies a change.

Record ordinary layout overhead, observer overhead, security extraction duration, artifact bytes and critical-path time separately.
Installation/acquisition and queue delays are not product workload time.
No performance improvement or trivial-cost claim is accepted without equivalent frozen measurements.

Remove only task-owned temporary installs, scan builds, observation groups and extraction directories after their consumers finish.
Retain failed/unknown mutation evidence for reconciliation.
Do not delete historical remote artifacts, another session's directories or unresolved HISEW resources under this plan.

## 9. Migration, activation and recovery

### 9.1 Current contracts and historical evidence

Version changed layout, process-report, scan and effect-journal contracts according to wire meaning.
Enumerate every current writer/reader before cutover and update them coherently; test dormantly invoked release workflows as well as ordinary CI.
Recompute source-input identities from actual changed policy, workflow, observer and verifier files.
Do not omit those files to preserve a convenient reuse hit.

Historical receipts remain unchanged and readable only for their intended historical purpose.
Root-only or two-language proof does not meet the new live qualification contract and produces FULL_REQUIRED or release denial.
Old release assets may still establish immutable identity for accepted recovery readers, but new continuation effects must satisfy current security, target and authorization checks.
If current qualification cannot be established for a restoration target, stop that effect and select an explicitly accepted forward/recovery route rather than inventing old evidence.

An old combined promotion attempt cannot be resumed blindly under the new split workflow.
Reconcile its actual service state, original journal and decisions first.
The recovery reader preserves known completed effects and permits only the still-authorized missing operation; no automatic rewrite, replay or new mutation scope is allowed.

### 9.2 Hosted activation sequence

1. Freeze the reviewed source and expected job/category/schema inventory; identify any active release attempts and their owners through read-only evidence.
2. Inspect current required checks, action policy, explicit/default CodeQL setup, environments, npm publisher bindings and allowed operations. Produce a minimal before/desired-state diff.
3. Demonstrate the new product/lane/report/scan graph on the exact candidate through the deliberate process.
   Keep current required acceptance effective; do not remove gates to merge an unqualified change.
4. Confirm Python and both native scan databases include intended first-party sources and that actual provider identities match the verifier.
   If live default CodeQL conflicts with explicit uploads, coordinate a protected switch and keep admission closed through any gap; do not assume this mismatch exists from source policy alone.
5. Validate new environment/publisher bindings and permission declarations before any writer is enabled. Retain the existing workflow filename when practical to avoid unnecessary trust-binding changes; job splitting still requires environment/operation validation.
6. Activate the coherent new reader/writer contract and any authorized settings delta.
   Read back actual state; command success alone is insufficient.
   Preserve CI / acceptance if its meaning remains accurate and no rename is necessary.
7. Observe the first main result.
   Reuse must authenticate current complete proof; otherwise report FULL_REQUIRED and deliberately request full qualification when authorized.
8. Before a separately authorized release or restoration, re-admit current source, decisions, security, predecessor, publisher settings and original-effect history.
   Keep unexecuted live effects explicitly pending in the handoff.

No new workflow-run trigger, automatic publication, bypass actor or blanket required-check removal is part of this migration.
A failed activation is an integration failure to resolve, not a reason to weaken the accepted evidence contract.

### 9.3 Recovery cases and ownership

| Condition                                                   | Required behavior                                                 | Responsible owner and evidence                                                            |
| ----------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Isolated result missing or old proof selected               | Deny acceptance/reuse and report FULL_REQUIRED                    | Coordinator; exact lane/proof failure and deliberate new run                              |
| Process observer fails or cannot establish declared cleanup | Fail observation, retain available report, settle owned resources | Performance owner; actual platform failure and subsequent corrected candidate             |
| New native/Python scan missing or invalid                   | Deny relevant qualification/release boundary                      | Security/integration owner; exact analysis and extraction diagnostics                     |
| Npm request outcome unknown                                 | Preserve journal and stop further mutation                        | Release operator; original bytes plus owner-selected native registry readback             |
| Npm complete, handoff unavailable                           | Do not infer absence or rerun npm                                 | Release operator; authenticated prior attempt and recovered sealed evidence               |
| Npm complete, GitHub pending/failed                         | Re-admit and perform only eligible missing GitHub effect          | Release operator; npm readback, original labels, journal lineage and current GitHub state |
| Npm-only restoration complete                               | Verify unchanged GitHub identity/markers with read authority      | Release operator; explicit scope and matching before/after observations                   |
| Another writer changed labels/main                          | Stop; do not overwrite its result                                 | Maintainer/operator; fresh actual state and a revised explicit decision if warranted      |
| Remote setting change partly applied                        | Stop further activation, read actual state, preserve protection   | Maintainer; captured delta and compatible restore or forward fix                          |
| Published package is defective                              | Use an authorized new identity or supported deprecation response  | Maintainer; fresh qualification and release decision, never overwrite immutable versions  |

## 10. Observability and outcome assessment

Each qualification should explain which source, archive, runtime, layout, native component, scan inventory and original attempt ran, and why acceptance/reuse was granted or denied.
Use specific FULL_REQUIRED reasons such as obsolete contract, missing isolated result, changed scan policy, expired archive or unverified original attempt.
A successful observation job reports that decision; it does not certify missing full qualification.

Process reports must make parent memory, native managed/scratch peaks and tree accounting visibly distinguishable.
Release reports must make selected availability scope, pending service, request status, original journal and reconciliation status explicit.
Do not log credentials, OIDC tokens or complete sensitive provider responses to explain those states.

The operational outcome is achieved when maintainers can deliberately qualify both real installation modes, understand actual resource observations, identify complete security evidence and recover a partial release without combining service write privileges or guessing whether a request ran.
Reassess if those guarantees become opaque, the artifacts outlive their consumers without purpose, proof regularly expires before review, scan cost dominates without demonstrable coverage, or duplication reintroduces inconsistent rules.
Coverage and trustworthy recovery are the guardrails; timing optimization cannot trade them away.

## 11. Cross-repository handoff boundary

The Markdown convergence plan remains independently owned and unchanged.
JSON implementation can proceed from the frozen inspected Markdown techniques and this contract without waiting for the Markdown plan to be implemented.
No shared package, moving sibling source reference or coordinated cross-repository deployment is introduced.

If JSON implementation discovers a generally useful correction to process observation, scan admission or release recovery, record its evidence and exact contract here for a future authorized Markdown follow-up.
Do not silently apply that follow-up, publish a shared library, create issues or send another chat work under this JSON-only request.
The explicit ban on GitHub workflow dependency lockfiles applies throughout.

## 12. Unknowns, experiments and replanning triggers

| Unknown or selection gate                                                   | Cheapest discriminating evidence                                                   | Owner / consequence                                                                                                     |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Actual ordinary isolated-layout cost                                        | One frozen baseline/candidate hosted graph with layout phases separated            | Coordinator; optimize duplication without removing coverage                                                             |
| Windows Job nesting and Linux group behavior under hosted/HISEW supervision | Small child/grandchild allocation and cleanup fixtures on both actual environments | Performance owner; block full-tree claims on incomplete coverage                                                        |
| Observer overhead and report size                                           | Equivalent fixed workload, raw samples and serialized byte count                   | Performance/evidence owner; preserve historical baseline and bounds                                                     |
| CodeQL tracing through native/build.py                                      | One clean traced build per supported platform with extraction inventory            | Native/security owner; resolve generated-header/binding coverage before activation                                      |
| Five-scan category/job identity and total cost                              | Native provider metadata and timed scan jobs                                       | Integration owner; freeze exact contract; any reduced topology needs equivalent-coverage evidence and accepted revision |
| Current action/toolchain identities and terms                               | Official release metadata and selected component notices                           | Coordinator/maintainer; latest applicable selection, no convenience downgrade                                           |
| Live npm/environment permission fit                                         | Read-only settings and explicit operation-policy comparison                        | Release operator; source declarations alone cannot establish trust                                                      |
| Existing unfinished effects                                                 | Original run/attempt/journal and native service state                              | Release operator; no new effect until relevant history is reconciled                                                    |
| HISEW profile coverage and duration                                         | Reinspect selected worktree declarations and map actual changed obligations        | Execution owner; explicit coverage/timeout amendment if needed, no silent route adoption                                |

Re-plan or re-baseline if any of the following occurs:

- The change would alter JSON parsing, formatting, source authorization, public limits, native package identity or support range.
- A proposed shortcut removes a required layout, native/sanitizer check, language/platform scan, independent oracle or source/transport binding.
- The observer cannot truthfully establish its stated method/scope for reachable child behavior, or requires new privileged infrastructure or a third-party runtime dependency.
- Scan integration requires an unreviewed native producer replacement, substantial dependency upgrade or coverage restriction.
- A release split broadens tag scope, makes an unknown effect automatically retryable, grants both write capabilities again or drops npm-only restoration.
- A schema transition needs a new compatibility shim or silently accepts obsolete proof; no such NSH-01 exception exists.
- Current provider capabilities cannot enforce the accepted authority boundary, or activation would leave an unprotected interval.
- A cross-repository change, downstream migration or package release becomes necessary to claim source completion.
- New legal/security consequences raise the risk or invalidate the selected reuse/recovery basis.

An unavailable tool or incomplete hosted experiment is an explicit integration gap, not evidence that the requirement is unnecessary.
Continue independent authorized work while the affected decision remains pending; do not claim complete qualification or release readiness prematurely.

## 13. References and document validation

Local contract authorities: [CI trust](../ci-trust.md), [release operations](../release-operations.md), [runtime support](../node-runtime-compatibility.md), [JavaScript performance](../javascript-performance.md), [centralized contracts](../centralized-contracts.md), [resource limits](../resource-limits.md), [native build documentation](../../native/README.md) and [dependency/test mapping](../dependency-graph-and-tests.md).
Historical plans remain relevant for preserved guarantees: [release assurance](2026-10-18-release-publishing-assurance-implementation-plan.md) and [orchestration performance](2026-10-26-javascript-performance-implementation-plan.md).
This dossier replaces only the explicitly changed CI/evidence/privilege decisions.

Frozen repository references: [JSON source baseline](https://github.com/Hadden-Industries/json-quality/tree/33c95858d316ca3cdabf319a2705f9161d44e7e5), [Markdown process qualifier](https://github.com/Hadden-Industries/markdown-quality/blob/fa1188a867b29bddd0b972a080b7fcd0261bdec3/scripts/qualify-performance.py) and [Markdown separated promotion jobs](https://github.com/Hadden-Industries/markdown-quality/blob/fa1188a867b29bddd0b972a080b7fcd0261bdec3/.github/workflows/promote-release.yml).
Historical cost source: [JSON release run 40661674658](https://github.com/Hadden-Industries/json-quality/actions/runs/40661674658), as analyzed in the companion plan; not rerun for this planning task.

Planning follows the installed HISEW implementation-plan/risk-route procedures and their engineering, verification and recovery principles.
The procedures are planning inputs, not product dependencies or authority to mutate lifecycle state.

Validate this document using JSON's installed Markdown toolchain with this exact file explicitly selected so the untracked document is included.
Check formatting, strict Markdown/local links, decision/requirement/scenario/slice consistency, actual referenced paths, whitespace and repository scope.
Record actual results in the task handoff.
Document validation does not execute the proposed product checks or establish hosted activation, security coverage or publication readiness.
