# Deliberate GitHub and npm releases: HISEW implementation plan

Date: 2026-10-18, Europe/Bucharest.
Revision: 1.
Status: accepted R2 implementation baseline; implementation in progress.
Decision owner: Maksym Shostak / Hadden Industries.
Repository: `Hadden-Industries/json-quality`.
Source baseline: `ac99cb9980e2a4d2fa0d831ad1dbb29e00f88784`, matching local and remote `main` at inspection.
Reference implementation: `Hadden-Industries/markdown-quality` at `2aa6843f01edfb2e0bc7f4bbd97fcd749eb6ed0d`, matching its remote `main` at inspection.

This document combines the draft change dossier, proposed R2 route, design decisions, quality scenarios, implementation slices, research refresh, and acceptance gates.
Identifiers are local to this plan.
The requested outcome is a release process based on the **final implemented Markdown Quality approach and its subsequent repairs**, adapted to this repository's single JavaScript package.

On 2026-10-18 the owner requested implementation using HISEW, minimized artifact creation, continued work through completion, pre-authorized detailed per-file commit messages and configuration-file changes called for here, and required committing this plan at the first commit checkpoint.
This accepts the R2 implementation route and authorizes source/configuration-file implementation, necessary local verification and local signed commits.
It does not select a release version or authorize public package creation, npm staging/approval/promotion, GitHub publication, remote settings changes, or an unbounded hosted experiment campaign.
Reuse this authority without repeated implementation or commit-message prompts; keep remaining release decisions explicit.

## 1. Outcome and operating constraints

The maintainer should be able to develop quickly while releasing deliberately.
A completed release must connect the intended source, one qualified tarball, hosted test results, security and inventory evidence, explicit approval, public npm bytes, immutable GitHub assets, and final availability labels.
The mechanism must explain and safely resume partial outcomes.

Use these design choices from the final reference:

- Preserve sole-maintainer direct-to-main development and local verification before authorized signed delivery. Do not introduce mandatory PRs, second-person approvals, or branch checks that obstruct that operating model.
- Keep ordinary JSON Quality CI manual, as already implemented. Preserve independently configured automatic CodeQL. A source push, tag push, dependency update, or successful background run must not publish anything.
- Run all release-required qualification in GitHub Actions. Local checks support development and HISEW delivery; they do not replace hosted release proof.
- Separate qualification, npm staging, human approval, public registry qualification, GitHub archival, and stable promotion.
- Use npm OIDC with stage-only preparation, human 2FA approval, a `pilot` initial tag, and a distinct promotion boundary.
- Use maintained native npm, GitHub, Node, and SBOM interfaces. Custom code owns only repository-specific identity, admission, evidence composition, and recovery.
- Keep full-SHA Action pinning. Carry forward the reference's explicit exclusion of Actions workflow dependency lockfiles/public-preview lockfile policies.
- Preserve configuration schema 1, result schema 3, public exports, exact-Git acquisition, JSON preservation, write safety, and runtime support.
- Treat correctness, consumer performance, process deadlines, hosted job limits, and HISEW supervision as different contracts.

Non-goals: migrating downstream repositories, replacing GitHub/npm, adding a release service or scheduler, bundling native executables, importing Markdown Quality's three-package coordination, changing JSON semantics, or broad dependency/refactoring work unrelated to a demonstrated release blocker.

## 2. Evidence lineage and maturity of the reference

The originating [Markdown Quality chat](codex://threads/01a1434f-2582-76b1-b7e7-c4be5272add7), its final [release plan][mq-plan], [release operations][mq-operations], [repair evidence][mq-repair], and [Windows observation and production adoption][mq-observation] were reviewed alongside implementation commits.

The reference is useful implemented design, **not evidence that its complete new release journey has passed**.
Its implementation record still distinguishes source delivery, local verification, hosted qualification, authenticated npm configuration, first real staged approval, and release completion.
The last chat turn reports local full verification and delivery of the timeout-policy change, with no new hosted qualification or release.
Earlier passing candidate/performance/security lanes do not repair an overall failed release run.
JSON Quality must establish its own complete journey.

| Reference checkpoint                                | What it establishes for this plan                                                                                                                                |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`92fc7a0`][mq-plan-commit]                         | Plan and research checkpoint before implementation; later changes must be read as amendments to the initial advice.                                              |
| [`2c5dce1`][mq-implementation]                      | Separate manual qualification, staging, public qualification, archival, and promotion; bound review decisions, effect history, SBOMs, and exact-source security. |
| [`a74d46f`][mq-doc-fix]                             | Installed documentation must not point to repository-only files.                                                                                                 |
| [`ff9d709`][mq-admission-fix]                       | GitHub's actual reusable-workflow graph includes an explicitly inactive fixture job; skipped-job admission must be precise.                                      |
| [`994b660`][mq-blocker-fix]                         | Fresh recipient dependencies, archive limits, runtime performance, and license evidence can reveal blockers absent from producer tests.                          |
| [`f6c56aa`][mq-integration-fix]                     | Offline workload scope, child cleanup, exact-source CodeQL, package URLs, and Windows SBOM interoperability need real integration proof.                         |
| [`04b932b`][mq-artifacts]                           | Retain machine-consumed evidence; put ordinary diagnostics in logs/summaries; exclude copied corpora from uploads.                                               |
| [`c3d2c1a`][mq-lifecycle]                           | Close owned registry fixtures before filesystem cleanup; retain test progress and native failure details.                                                        |
| [`4d5d128`][mq-phases], [`2f4718f`][mq-npm-timings] | Measure packing, installation, runtime checks, offline work, and cleanup; preserve native npm timing clues.                                                      |
| [`5881356`][mq-observation-commit]                  | One targeted hosted Windows observation, instead of another full matrix, can expose later checks and quantify margin.                                            |
| [`2aa6843`][mq-budgets]                             | Final production policy: 5-minute installation, 30-minute Node suites, 45-minute qualification jobs; product assertions and release controls unchanged.          |

The reference's final policy supersedes earlier recommendations to preserve the 120-second installation and 600-second suite ceilings.
The single observation passed in 11m 26s overall; its Node suite took about 570 seconds, and its slowest real install about 79 seconds.
It did not reproduce the intermittent failures or prove their cause.
These are reference observations, not JSON Quality performance estimates.

## 3. JSON Quality baseline and early blockers

Read-only inspection on 2026-10-18 found:

| Area                  | Observed state                                                                                                                                                   | Planning consequence                                                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Source                | Clean checkout at `ac99cb9`; local and remote `main` equal.                                                                                                      | Recheck drift before implementation; never adopt unrelated changes.                                                                              |
| Package               | `@hadden-industries/json-quality@0.1.0-dev.0`; AGPL-3.0-only; one source package; four public exports and one CLI.                                               | No native-package tuple, Rust, Python, or platform binary release machinery.                                                                     |
| Public registry       | Anonymous package metadata request returned HTTP 404.                                                                                                            | No public package was observable. Private/staged ownership and authenticated access remain unknown; first-package setup is an explicit gate.     |
| GitHub releases       | Release listing empty; immutable releases `enabled: false`, `enforced_by_owner: false`.                                                                          | Enable and verify immutability before the first published GitHub release.                                                                        |
| GitHub governance     | Public repository, `main` unprotected, rulesets empty.                                                                                                           | Preserve the selected direct-main model; this is not independent source review or protection against an administrator changing controls.         |
| Actions defaults      | `default_workflow_permissions: write`; Actions PR approvals enabled.                                                                                             | Inventory job needs, then propose read-only default and disabled Actions PR approvals; read back the actual settings.                            |
| Environments          | No deployment environments returned.                                                                                                                             | Create separate main-only npm staging, GitHub archival, and npm promotion environments during authorized cutover.                                |
| CI source             | `.github/workflows/ci.yml` has only `workflow_dispatch`; read-only workflow token; SHA-pinned Actions; producer plus Windows/Linux consumer matrix.              | Compose this capability into release qualification; do not add automatic product matrices.                                                       |
| CodeQL                | Default setup configured; exact baseline analysis `1966268651` for JavaScript/TypeScript has one result; Actions analysis `1966266566` has zero.                 | Security readiness is already a release blocker under the proposed zero-finding rule.                                                            |
| Open finding          | [CodeQL alert 1][json-alert]: `js/bad-code-sanitization` in `tests/execution.test.js`.                                                                           | Triage and repair/dispose explicitly before release. This plan does not establish exploitability or silently dismiss it because it is test code. |
| Runtime authority     | `assets/node-support.json`: floors 22.13.0, 24.0.0, 26.0.0; reference 24.21.0; producer npm 12.2.0; consumer npm 11.21.1; Windows 2025 and Ubuntu 24.04.         | Preserve the producer/consumer toolchain split; resolve current-family lanes once per candidate.                                                 |
| Packing               | `scripts/pack.js` already owns native npm packing, clean-source admission, external destination, source/tree/lock identities, archive SHA-256 and npm integrity. | Extend its contract coherently; do not introduce another packer.                                                                                 |
| Consumer verification | Transported archive, isolated install, API/CLI/plugin/schema probes, offline reinstall, and exact-Git acquisition exist.                                         | Reuse them and add anonymous **registry** installation, signatures/provenance, dependency audit, SBOM, and complete lane collection.             |
| Existing budgets      | Pack 120s; package install/ci 180s; runtime wrappers 600s; CI jobs 20min; acquisition contains 300s operations.                                                  | Reconcile nested deadlines deliberately; changing only outer YAML limits would leave inner failures unchanged.                                   |
| Documentation         | `docs/` ships in the npm package; Prettier covers Markdown and GitHub YAML; no dedicated Markdown lint script is declared.                                       | Validate installed links and exact-file formatting. Do not invent an existing Markdown gate.                                                     |

The existing `.tgz.provenance.json` is a package-owned identity record, not an authenticated npm/Sigstore provenance attestation.
Keep that semantic distinction in documentation and release reports.

### HISEW applicability

Native inspection returned active personal applicability and ready worktree admission.
Project: `deb3363f-2f3c-488a-b20e-57d8760daef3`.
Worktree: `5163f2d2-392c-4676-b05d-909a0914749d`.
Installed engine: `0.1.0.dev26`.
No active execution was reported; focused, affected, and full profiles exist.
Status also reports undeclared input ordering and retained unresolved resource inventory.

Do not import the reference chat's old engine mismatch as a current blocker.
Do not claim this inspection proves review capability, live hook activation, profile coverage, or resource closure.
Before implementation, select the exact repository using the actual session identity, reuse the accepted task/route, inspect applicability, and establish the execution owner through supported operations.
Resolve review/security/independent-verifier capabilities against actual current tools and scoped authority when those operations become required.
No reviewer, scanner, subagent, engine update, ownership transfer, or cleanup was launched for planning.

Rediscover external configuration/evidence roots before producing workflow artifacts.
Keep canonical receipts separate from supplemental operator evidence.
Use `inspect-resource-inventory` to identify existing coordinators and checkpoints; preserve their resources and obligations rather than adopting them.
Plan validation alone does not require a product full-suite run or an implementation execution.

## 4. Proposed R2 route and approval boundaries

R2 is proposed because the change introduces privileged workflows, package-publication authority, artifact trust, human approvals, cross-service state, concurrent effects, and irreversible public versions.
The small package count reduces coordination complexity, not the consequences of incorrect admission.
No R3 consequence has been established.

Required artifacts are this accepted or revised baseline, a frozen release contract, exact-source review/security evidence, hosted qualification evidence, immutable artifact identities, effect journals, remote configuration readback, owner acceptance, and a retained release/recovery record.

Required lenses are ordinary code/design review, an independent verifier, and scoped native security assessment of the final authorization, input, artifact, secret, filesystem, and network boundaries.
Reuse the configured supported providers; discovery does not authorize scans or delegation.
License and distribution inventory review applies to what actually ships and to newly adopted tools.

| Boundary                         | Required authority and evidence                                                                                                                                                                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Implementation entry             | Owner acceptance of this draft, R2 route, source scope, intended configuration effects, and allowed delivery/hosted experiments. Commit the accepted plan first if commit/delivery authority is granted, following HISEW and exact-file formatting/linting. |
| Nonpublishing hosted experiments | Explicit scope covering named workflows/lanes and a bounded run budget; inspect existing runs before dispatch.                                                                                                                                              |
| Remote control cutover           | Concrete before/after settings, affected publisher identities, owner/2FA availability, and recovery plan. Carry existing accepted authority through unchanged effects.                                                                                      |
| Package creation/bootstrap       | Exact package/version/bytes and acknowledgement of npm's public placeholder behavior, plus authenticated ownership and bootstrap route.                                                                                                                     |
| Real release                     | Exact version, source, tarball and manifest digests, accepted reviews, and completed hosted preparation.                                                                                                                                                    |
| Owner approval                   | Human-controlled npm 2FA for the exact staged item; no token or script impersonates this decision.                                                                                                                                                          |
| Stable promotion/recovery        | Exact target, prior labels including absence, public qualification, immutable archive verification, and attributable owner acceptance.                                                                                                                      |

Source and unpublished configuration can be repaired with reviewed forward changes.
Published package versions cannot be replaced.
Restoring a dist-tag cannot undo downloads.
Immutable GitHub assets/tags are retained; corrections require a new release identity.
Rejecting a staged item is a distinct destructive npm action, not an automatic cleanup step.

## 5. Requirements and acceptance criteria

| Requirement                                    | Acceptance criterion                                                                                                                                                                                                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-001 Deliberate effects                     | AC-001: only admitted manual operations in the intended repository/main environment can stage, archive, or promote; automatic CI has no release authority. Negative event/ref/repository tests prove denial.                                                            |
| REQ-002 One qualified artifact                 | AC-002: one clean committed producer tarball is transported unchanged through qualification, staging, registry readback, and GitHub archival; hashes, npm integrity, source/tree, and lock identity agree.                                                              |
| REQ-003 Complete hosted proof                  | AC-003: admission verifies the complete expected graph and every required frozen lane from one selected run/attempt, including provider-reported completion, source, workflow, and artifact identity. Missing, stale, failed, cancelled, or unexpected evidence fails.  |
| REQ-004 Toolchain compatibility                | AC-004: consumer floors and current/reference lanes retain native supported npm execution; modern publishing/security tools run on their qualified producer runtime without raising public Node floors.                                                                 |
| REQ-005 Explicit npm approval                  | AC-005: staging uses OIDC without reusable publish tokens, direct publishing disabled, explicit `pilot`, exact stage identity, verified bytes, and owner 2FA before public availability of release contents. First-package placeholder effects are separately admitted. |
| REQ-006 Safe continuation                      | AC-006: interrupted, concurrent, or lost-response attempts reconcile all relevant history and native state before another effect; unknown outcome never becomes permission to retry.                                                                                    |
| REQ-007 Real recipient/security proof          | AC-007: fresh anonymous root and isolated registry consumers pass public contracts, native dependency validity, audit, signature/provenance verification, and installed-payload identity. Exact-source CodeQL and required independent review are admitted separately.  |
| REQ-008 Honest inventory/rights                | AC-008: shipped file inventory, source production graph, and actual recipient graph have explicit scope; native SBOM validation and component/edge/license conservation pass, including Windows inputs.                                                                 |
| REQ-009 Immutable GitHub archive               | AC-009: a verified source tag and complete read-back draft precede publication; immutability, release attestation and each declared asset verify natively after publication.                                                                                            |
| REQ-010 Stable labels only after acceptance    | AC-010: `latest` changes only after public qualification, immutable archival and exact owner/pilot acceptance; prereleases cannot become stable by accident; final npm/GitHub readback agrees.                                                                          |
| REQ-011 Bounded observable execution           | AC-011: success and failure identify phases, timings and native outcomes; nested budgets are coherent; cleanup terminates owned children; diagnostic collection cannot turn failure into success.                                                                       |
| REQ-012 Proportionate evidence/verification    | AC-012: logs/summaries carry diagnostics, only identified consumers justify artifacts, settled evidence is reused when its bindings remain valid, and bounded targeted diagnosis precedes another full matrix.                                                          |
| REQ-013 Preserve existing consumers            | AC-013: API/CLI/plugin/schema behavior, source preservation, exact-Git bootstrap, archive rejection, runtime policy, architecture boundaries, and installed document links remain qualified.                                                                            |
| REQ-014 Independent release/control identities | AC-014: artifact source, qualification run, executing control source, stage origin, approval, registry run, archival and promotion are separately bound; no evidence self-reference or executing untrusted artifact-supplied control code.                              |

Invariants: no implicit version selection; no forced version reuse; no repacking after qualification; no token fallback; no approval inferred from a green run; no private credential/report upload; no simulated platform result described as actual execution; no unknown effect described as absent.

## 6. Quality scenarios and decisive negative cases

| Scenario                       | Stimulus and required observable response                                                                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QA-001 Authorization           | Dispatch from a fork, wrong workflow/ref/environment, malformed version/digest/run input, or automatic event. Reject before credentials or effect; record the failed boundary.                                                  |
| QA-002 Artifact substitution   | Change tarball bytes, manifest, source/tree, lock, artifact ID/digest, or report subject. Deny staging/continuation; retain expected and observed identities.                                                                   |
| QA-003 Hosted graph            | Omit/duplicate a lane, truncate pagination, mix attempts, substitute an unrelated green run, skip a required job, or present an active caller as completed. Deny admission.                                                     |
| QA-004 Inactive branch         | If workflow structure necessarily creates an inactive job, admit only its declared name, exact condition, `skipped` state and empty steps for that route. Any other skip fails. Prefer a graph without unused fixture branches. |
| QA-005 Interrupted publication | Simulate timeout before request, response lost after accepted request, journal upload lost, approval between reads, and pre-existing unknown attempts. Reconcile; emit no duplicate stage/publication.                          |
| QA-006 Concurrency             | Two staging/promotion runs or an older still-active run target the package. Serialize effects with one repository release concurrency group, then recheck all prior producers and current labels.                               |
| QA-007 Recipient drift         | Producer lock/audit passes but a clean recipient resolves vulnerable or invalid dependencies. Block release; never claim producer overrides protect recipients.                                                                 |
| QA-008 Minimum runtime         | Exercise Node 22.13.0 with the supported consumer npm; execute unsupported modern tooling only on the producer. Engine warnings/failures cannot be ignored or hidden by a version shim.                                         |
| QA-009 Windows interchange     | Paths contain drive letters, spaces, Unicode, backslashes and at-signs. Native processes launch correctly; transported/registry inventories validate without losing component identity or rights.                               |
| QA-010 Child lifecycle         | Registry fixture exits before readiness, dies during work, or cleanup throws. Completion is captured immediately; server/process shutdown precedes directory removal, with bounded waits and retained original error.           |
| QA-011 Budget semantics        | Tiny real-child fixtures distinguish request timeout, whole install deadline, suite exhaustion, job cancellation, and downstream assertion failure. A longer execution budget never weakens a product assertion.                |
| QA-012 Recovery/promotion      | Registry bytes are wrong, previous `latest` is absent/changed, GitHub publication response is lost, or npm promotion succeeds while GitHub marking fails. Report partial state and reconcile actual remote state before repair. |
| QA-013 Inventory and links     | Missing/unexpected tar members, a broken shipped link, duplicate-location components, lost dependency edges, or an invalid SBOM URI cause failure at the relevant boundary.                                                     |
| QA-014 Operational restraint   | One hosted failure occurs. Retain evidence, classify the mechanism, choose the cheapest discriminating probe, and run it within accepted scope; no unattended full-matrix repair loop.                                          |

## 7. Selected design and native reuse

### Decisions

| Decision                             | Selected approach and reason                                                                                                                                                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-001 Operating model              | Direct-main, manual product CI and deliberate release entry; automatic CodeQL remains independent. No mandatory PR or second maintainer.                                                                                                  |
| DEC-002 Reuse existing qualification | Make `ci.yml` callable as well as manually dispatchable, or extract a shared callable workflow if its current manual interface cannot remain clear. Reuse the same product commands and archive producer.                                 |
| DEC-003 Package scope                | One npm package and one tarball. Omit native-before-core phases, tuple reconciliation, Cargo/Syft binary discovery, and Markdown-specific performance corpora.                                                                            |
| DEC-004 Tool identities              | `assets/node-support.json` remains the runtime/toolchain owner. Assess npm 12.2.1, now the upstream stable release, rather than copying the reference's 12.2.0 pin. Requalify native pack/lock/output contracts before adoption.          |
| DEC-005 Human presence               | Stage-only OIDC plus npm owner 2FA. An optional GitHub self-approval checkpoint is not independent human review and is not a duplicate mandatory gate.                                                                                    |
| DEC-006 Least privilege              | Separate staging, archival and promotion workflows/environments. Promotion's npm connection permits dist-tags, denies direct publish; npm still inherently permits staging on that connection. Document the residual capability honestly. |
| DEC-007 Evidence closure             | Freeze one candidate manifest; bind later records to its digest. Keep approval and post-publication receipts outside the source commit/archive to avoid circular identities.                                                              |
| DEC-008 Current contract             | Introduce one current release contract. Preserve existing archive identity readers and historical evidence; no direct-publish fallback or legacy authorization downgrade.                                                                 |
| DEC-009 Inventory scope              | Use native npm inventories/SBOMs and actual archive membership. Add a standalone native CycloneDX validator if required; do not build a schema/provenance/package resolver.                                                               |
| DEC-010 Execution budgets            | Adopt the reference's final 5/30/45-minute release execution policy, instrumented from the first hosted exercise. Measure JSON Quality behavior and adjust only with evidence and owner disposition.                                      |
| DEC-011 Repair cadence               | Consolidate implementation before broad review; narrow review of repairs; one settled local full check and final hosted graph, with targeted diagnostics for new failures.                                                                |
| DEC-012 Bootstrap                    | Treat initially absent public package, placeholder creation, trust setup, rejection/re-staging and first-use expiration as a separate owner-operated migration path, proven before real release effects.                                  |

No semantic aliases, compatibility shims, npm monkey patches, or approval bypasses are proposed.
A genuine new incompatibility requires an explicit design decision and, if applicable, a scoped NSH-01 override; none is currently granted.
Names must distinguish `stage`, `approve`, `qualify`, `archive`, and `promote`.
Do not call a local hash record authenticated provenance.

### Research refresh and selection

| Capability and candidate                                | Fit, current evidence, residual work                                                                                                                                                                                                                                                  |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing JSON Quality pack/runtime/installation modules | Best fit for its single package, exact-Git and runtime contracts. Reuse in place with caller-owned admission; no new cross-repository dependency.                                                                                                                                     |
| Final Markdown Quality adapters/tests                   | Source design and failure-case reference, AGPL-3.0-only repository code. Adapt only applicable behavior, retain source attribution, and inspect final commits rather than copying the initial feature commit.                                                                         |
| Native npm CLI                                          | Owns packing, SemVer/package specifications, registry integrity, staging, audit/signatures, SBOM and dist-tags. Official release API reports [12.2.1][npm-release], published 2026-10-15; some documentation banners still say 12.2.0. The release identity wins over a stale banner. |
| Native GitHub Actions/API/CLI                           | Owns job/run/artifact identities, permissions, environments, immutable release state and attestation verification. Installed `gh` is 2.102.0; refresh supported stable CLI/action identities and freeze them at implementation.                                                       |
| CycloneDX CLI                                           | Reference uses 0.33.1; upstream latest release inspection still returns 0.33.1. Native validator/optional composition, standalone CI tool; prove actual output support and acquire by verified release identity/digest.                                                               |
| Existing Ajv                                            | Appropriate for repository-owned JSON release schemas using the existing dependency. It is not a replacement for native npm/GitHub cryptographic verification or a complete CycloneDX consumer.                                                                                       |
| Syft/cargo-cyclonedx                                    | Relevant to the reference's binaries and embedded Rust graph; no corresponding JSON Quality contents. Do not acquire them absent evidence that native npm/archive inventories leave a real coverage gap.                                                                              |
| Automatic release/version bots or a new framework       | Their release automation does not remove the deliberate approval, exact-byte, cross-service reconciliation requirements. No additional service is justified for this single package.                                                                                                  |

Rights: retain JSON Quality's AGPL-3.0-only notices and dependency license obligations.
The [npm CLI license record][npm-license] includes its own and bundled-component terms; [CycloneDX CLI 0.33.1][cdx-license] uses Apache-2.0.
These references establish source-level selection evidence, not blanket redistribution clearance.
Before acquiring/adapting code, review the exact selected archive/source notices and intended use.
Analysis tools are not shipped with the npm package; new bundled runtime content would reopen scope, rights, inventory and package-size decisions.

The custom residual gap is enforcing this repository's release identity, exact gate inventory, authorization record, operation journal and reconciliation.
Neither npm nor GitHub supplies that application-specific cross-service transaction.
Prefer small adapters composed with current owners, not a generic release platform.

### Architectural seams and DRY ownership

Predicted files are implementation hypotheses, not mandatory file proliferation.

| Rule and current authority                                                                         | Predicted change and consumers                                                                                                   | Boundary/drift control                                                                                                                      |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `assets/node-support.json`, `scripts/node-matrix.js`, `scripts/project-node-support.js`            | Project any selected producer npm update; freeze and pass one matrix to preparation and public qualification.                    | Never duplicate current Node lists in YAML; keep consumer compatibility distinct from publisher requirements.                               |
| `scripts/pack.js`                                                                                  | Reuse `runNpmPack`/`readPackReport` and `packCandidate`; add only release-required identity/member evidence.                     | Native keyed npm report remains native-owned. Archive admission retains its own trust boundary and independent corruption tests.            |
| `scripts/qualify-package.js`, `qualify-runtime.js`, `qualify-acquisition.js`, `consumer-probe.mjs` | Extract a reusable installed-consumer probe seam; add registry acquisition while preserving exact-Git and transported contracts. | Avoid duplicating public test assertions across workflows; retain independent expected values and per-boundary provenance checks.           |
| `src/installation.js`, `src/acquire.js`                                                            | Consume existing exact npm/Git selectors and payload verification.                                                               | No runtime changes merely to support release tooling; any real change needs public regression coverage.                                     |
| `.github/actions/setup-producer/action.yml` and `ci.yml`                                           | Callable qualification, shared setup, frozen archive and reports.                                                                | Producer setup remains singular; publishing jobs get isolated config and narrowly elevated permissions.                                     |
| Predicted `scripts/release-contract.js` and `schemas/release-manifest.schema.json`                 | Common identity fields, stage states, expected graph and current evidence schema.                                                | Same semantic rules shared; external admission remains independent. Do not accept arbitrary evidence just because its schema is valid.      |
| Predicted qualification/security/evidence/staging/registry/archive/promotion adapters              | Thin native-service orchestration, complete effect history, phase-specific permission checks.                                    | Separate failure/authority boundaries; do not merge write operations with read-only collectors.                                             |
| Predicted `scripts/qualification-process.js`                                                       | One execution-policy owner for producer/consumer command budgets, selected Node/npm invocation, bounded diagnostics.             | Only common semantics shared; keep operation-specific pack/probe/test fixture limits. Do not change runtime acquisition policy by accident. |
| `scripts/test-impact.js`, architecture rules and new release tests                                 | Declare non-import workflow/schema/manifest dependencies and producer-only test ownership.                                       | Preserve conservative affected fallback; inspect new tests against minimum-runtime selection before adding them to the generic test glob.   |
| `docs/centralized-contracts.md`, predicted `docs/release-operations.md`                            | Current ownership and operator recovery instructions.                                                                            | Relative links must work in installed package contents; use immutable repository URLs for unshipped sources.                                |

Integration owner: the future implementing coordinator, accountable to the repository owner.
Requirements, naming, contract, workflow graph and admission changes are coupled and should be integrated together.
Research/inspection can be independent, but this plan authorizes no parallel writers or delegation.

## 8. Operator journey and identity model

1. Select the exact version and compatibility intent. Accept valid npm SemVer, including intentional 0.x or prerelease releases; do not copy Markdown Quality's regex requiring a positive major stable version. Stable promotion excludes prereleases unless a separately accepted policy changes that rule.
2. Commit the version and settled implementation with local evidence. Freeze source, tree, lock, runtime policy, resolved matrix and tool identities.
3. Manually run nonpublishing release qualification. The reference producer qualifies the source and produces the designated tarball once; consumer lanes receive that tarball. Fixture packs made inside tests are not release artifacts.
4. Collect the complete terminal hosted graph, exact-source security and inventory evidence. Review the candidate manifest digest, SemVer, rights, retention, recovery and security decisions.
5. Create/verify the owner-authorized signed annotated source tag and draft release, without uploading a personal signing key to Actions. Bind review records to the candidate digest rather than committing an approval that changes its own source.
6. Manually stage the exact tarball under `pilot` with admitted OIDC authority. Record intent before request and the native outcome; finish the job in `staged-awaiting-owner` instead of polling for human action.
7. The owner inspects native stage details and downloaded bytes and approves the exact item with 2FA. Staging success alone is not approval evidence.
8. Manually run public registry qualification. Fresh anonymous installations verify exact public bytes, original publication provenance and recipient behavior across the frozen matrix; dependency audit/registry security evidence is refreshed here.
9. A separate archival workflow consumes that **completed** registry run, verifies every draft asset, publishes the immutable GitHub release, and verifies its attestation and assets. It cannot claim its own still-running predecessor is complete.
10. After exact pilot/consumer/restoration acceptance, manually promote npm `latest` and the intended GitHub release marker. Read both services back and retain a final outcome record.

For prereleases, finish with the explicit prerelease channel and correct GitHub prerelease/latest flags.
Do not infer stable authority from the absence of an error or from the current `0.1.0-dev.0` manifest.

Bind at least:

| Identity group     | Required fields                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Candidate          | Package/name/version, source commit/tree, clean-source status, lock and policy digests, tarball filename/size/SHA-256/SHA-512 integrity, member inventory, tool versions, frozen OS/Node matrix. |
| Hosted proof       | Repository identity, workflow path/revision, event/ref, run ID/attempt, exact job/lane identities and outcomes, artifact IDs/digests, report subjects and hashes.                                |
| Control provenance | Each executing workflow/control commit, current authorized main ref, environment identity, relevant control changes since qualification, and owner review reference.                             |
| Effect             | Package/version/digest, operation, actor/run/attempt, prior state, request timestamp, native stage/release ID, observed result and journal digest.                                               |
| Acceptance         | Owner identity, phase, candidate digest, specific decisions/evidence, review/pilot relationships, approval observation and timestamp.                                                            |
| Public outcome     | Registry version/integrity/provenance, registry qualification run/attempt, verified tag/source, immutable release ID and asset hashes, prior/final labels, unresolved effects.                   |

Artifact source and control source are distinct.
Initial control should use the qualified source; a later manual continuation can use a newer reviewed controller only when it explicitly preserves the original artifact and records the control delta.
Recheck the executing control ref immediately before effects; drift during a run stops that effect.
A later controller must never silently repack old-version source, substitute new tests as old qualification, or rewrite original publication provenance.

The candidate manifest does not hash itself.
A later evidence index references its digest and subsequent reports; its own digest is stored by the next authenticated or owner-approved boundary.
Terminal job admission occurs in a later reader after the run has completed.
Historical npm bootstrap placeholders and schema-1 archive identity records remain distinguishable from current release evidence.

## 9. Hosted gate inventory and privilege design

| Gate                       | Required proof                                                                                                                                                                                                     | Boundary                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| GATE-001 Candidate/version | Valid exact selected version, clean/frozen source, package/lock agreement, one tarball, policy/tool identities and signed tag relation.                                                                            | Before staging                                                              |
| GATE-002 Product           | Existing `check:node`, `check:architecture`, tests, lint, formatting and JSON dogfood coverage from `check:full`; explicit release-tool/workflow regressions included.                                             | Before staging                                                              |
| GATE-003 Consumers         | Source behavior on supported runtimes; same tarball on all frozen OS/Node lanes; root/isolated public probes and existing exact-Git acquisition; native engine validation.                                         | Before staging                                                              |
| GATE-004 Security          | Exact-source Actions and JavaScript/TypeScript CodeQL analyses and query identities; recipient audit; independent scoped security assessment and disposition. Do not import Python coverage from Markdown Quality. | Before staging; refresh time-sensitive recipient questions before promotion |
| GATE-005 Inventory/rights  | Actual tar members and exports, production and recipient inventories/SBOMs, native validation, package licenses/notices, shipped document links, complete evidence closure.                                        | Before staging and archival                                                 |
| GATE-006 Native admission  | Complete run/attempt/job/artifact set, immutable candidate digest, prior-attempt reconciliation, current environment/ref and review decision.                                                                      | Before each privileged phase                                                |
| GATE-007 Stage/owner       | Exact stage/download identity, observed owner 2FA approval or attributable reconciliation, no unresolved competing stage/publication.                                                                              | Before registry acceptance                                                  |
| GATE-008 Public registry   | Anonymous exact-version root/isolated consumers, tarball integrity, native signatures/provenance, valid dependency graph, current audit, runtime/API/CLI/schema behavior, offline reinstall.                       | Before archival/promotion                                                   |
| GATE-009 GitHub archive    | Verified signed tag, all draft assets and hashes, enabled immutability, native `gh release verify` and `gh release verify-asset` results.                                                                          | Before stable promotion                                                     |
| GATE-010 Owner acceptance  | Exact compatibility, security, rights, retention, representative consumer and restoration decisions for this package/version. No copied OwlAPI/WebVOWL-specific acceptance keys.                                   | Before stable promotion                                                     |
| GATE-011 Completion        | No active/unknown competing effect; expected prior labels; exact npm and GitHub readback; retained final evidence and operational/resource disposition.                                                            | Before claiming release complete                                            |

Default security policy follows the final reference: nonzero exact-source CodeQL or recipient audit findings block release, including low-severity audit findings.
A false-positive or risk disposition must be an explicit reviewed change to the accepted gate, with evidence; a dismissed current-main alert alone is not clean historical-source analysis.
Missing permission, missing analysis, incomplete audit, warning requiring disposition, or unavailable native verification remains a gap.

Qualification and registry jobs have read permissions only.
Grant `security-events: read` only where analysis retrieval needs it.
Staging alone gets npm-publication environment and `id-token: write`, with direct publish/dist-tag disabled on its npm connection.
Archival alone gets `contents: write`.
Promotion gets its own npm-promotion environment and OIDC dist-tag capability, plus GitHub write only where it changes the release marker.
All environments admit exactly `main` and are re-read at admission.
Checkout disables persisted credentials; native npm runs with isolated user/global config, disabled lifecycle scripts, and no long-lived token fallback.
The privileged job must not execute downloaded package scripts or artifact-supplied workflow helpers.

Use one named concurrency group across workflows that mutate release state, with `cancel-in-progress: false`.
Concurrency is not a durable transaction log: also inspect complete prior attempts, active producers and native state.
Pagination must be complete or explicitly fail closed.
Read-only qualification can use separate concurrency without granting mutation rights.

## 10. Inventory, registry and first-package integration

### Distribution and recipient meaning

JSON Quality currently ships its own JavaScript, schemas, license/notices, README and docs.
Its ordinary npm dependencies are resolved by consumers; they are not bundled by the current package manifest.

Retain three distinct subjects:

1. The exact shipped file inventory and package component, including file hashes where release admission needs them.
2. The producer/source production dependency graph from the frozen lock, clearly labeled as that graph.
3. The actual clean installed recipient graph for each meaningful OS/layout, with its native lock, npm dependency validity, audit and SBOM.

Use native `npm sbom` for dependency inventories and native CycloneDX validation of the emitted format.
Do not relabel an npm-generated older valid CycloneDX document as 1.7 by changing a field.
If a newer interchange document is needed, use native supported conversion and prove component, relationship, location, license and evidence conservation.
A current specification version does not by itself establish better coverage.

Retain native originals.
If Windows file references fail strict validation, prefer fixing the authoritative input or selecting a supported native output.
Any narrow file-URI representation adapter must first bind exact path/package/version/integrity, use Node's `pathToFileURL`, preserve every other field, and pass native validation plus conservation tests.
No blanket slash replacement, component deletion, deduplication by name/version alone, or ignored-validator-error fallback.
Native tools may diagnose on stdout; bounded failures preserve both streams.
Scoped names/versions in package URLs require standards-compliant encoding, not ad hoc string sanitization.

Fresh anonymous consumer graphs are authoritative for what recipients install.
Do not infer their safety from producer overrides or a producer-only lock.
If an advisory emerges, inspect real reachability and prefer a maintained upstream repair; do not copy the reference's KaTeX-specific bundle.
Any necessary vendoring/bundling is a separately reviewed scope/rights/size/inventory decision.

Registry signature/provenance verification uses supported native npm tooling on a compatible runtime.
Where minimum-runtime npm cannot perform a required verification, qualify consumer behavior on that runtime and perform cryptographic inspection on the qualified modern toolchain against the **same** locked bytes and original publication identity.
Do not raise the product floor, silently switch consumer execution, or substitute a current controller's identity for the original publisher.

### First-package bootstrap gate

Anonymous HTTP 404 does not prove namespace ownership, package availability to the authenticated owner, or absence of staged/private state.
Inspect those through supported authenticated controls during authorized implementation.

npm documents that staging a previously nonexistent package creates a **public `0.0.0-stage` placeholder**, while staged release contents remain private until approval.
This must be disclosed and authorized before bootstrap.
It is not an effect-free rehearsal. [Staged publishing][npm-staged]

Preferred sequence to qualify, without assuming unsupported account behavior:

1. Establish owner/org publish access, 2FA availability, existing stages and allowed native setup interfaces.
2. Determine whether the package identity and desired trust connections can be prepared before staging the actual release.
3. If owner-session staging is required to create the identity, propose the exact tarball/version, placeholder effect, stage record, and disposition before executing it.
4. Inspect whether native rejection and OIDC re-staging of the same intended version is supported while preserving the package identity and settings. Rejection requires its own owner 2FA; record both stage identities.
5. Configure exact repository/workflow/environment connections and package token restrictions, then complete the first real OIDC stage/approval within the documented connection-validation window.
6. Verify public provenance and bytes before accepting that bootstrap as the start of a release.

Do not approve a local bootstrap stage and then claim OIDC provenance.
Do not publish an unqualified dummy version to bypass setup.
If no supported route preserves the selected guarantees, stop the bootstrap slice and replan it with the owner; completed source/nonpublishing work remains usable.

Trusted-publisher mappings must be re-read after creation; documentation says their fields cannot be edited in place and unused new connections expire after two days.
Create them near a prepared first-use window, not at the beginning of a lengthy coding task.
The promotion connection also needs an explicit first-use validation plan; do not assume a dist-tag call satisfies a requirement phrased as first successful publication.
Current npm docs differ in older generic trust wording versus newer dist-tag guidance: validate the actual supported CLI/UI operation, rather than inventing flags. [Trusted publishing][npm-trust-publishing] [Native trust management][npm-trust]

## 11. Lessons converted into preventive controls

| Lesson from the lengthy reference repair tail                                    | Prevention here                                                                                                                   | Proof/owner                          |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Initial audit advice included mandatory PRs and an excluded preview.             | Start from final decisions, preserving sole-maintainer and manual-CI constraints.                                                 | DEC-001; owner acceptance            |
| A correct local plan did not establish live npm settings or full hosted success. | Report source/configuration/qualification/publication separately and keep unresolved gates visible.                               | GATE-006..011; integration owner     |
| Packed docs linked to unshipped material.                                        | Test all relevant relative links against actual tar membership before first hosted fan-out.                                       | QA-013; packaging owner              |
| Expected job lists did not match GitHub's inactive branch.                       | Capture actual provider graph early; explicit inactive-role contract, never general skip tolerance.                               | QA-003/004; workflow owner           |
| Producer audit/overrides missed recipient vulnerabilities.                       | Run real clean recipient audit in the first vertical qualification slice.                                                         | QA-007; security owner               |
| Windows native SBOM paths and scoped PURLs failed downstream checks.             | Exercise actual Windows output and native validators early, preserving original evidence.                                         | QA-009/013; inventory owner          |
| Expanded bundle exceeded archive assumptions.                                    | Test actual native pack membership/count/size before admitting new contents; preserve safe-path/link/collision checks.            | QA-013; packaging owner              |
| Network and offline installation delays were conflated.                          | Separate network request, dependency resolution, extraction, offline work and total deadline observations.                        | QA-011; qualification owner          |
| A server could outlive the test after cleanup failure or missed exit event.      | Capture child completion on creation, close in `finally` before directory cleanup, test premature exit.                           | QA-010; fixture owner                |
| Local 2–3 minute success was treated as evidence of hosted deadline headroom.    | Measure actual Windows lanes; start with final reference budgets; do not infer hosted distribution from one workstation.          | QA-011; maintainer                   |
| Repeated full matrices consumed time without narrowing the cause.                | One bounded failing-lane/phase experiment after diagnosis, then relevant repair evidence before another full graph.               | QA-014; coordinator                  |
| Raising only a job timeout left shorter subprocess limits.                       | Inventory every enclosing/inner timer, including recovery and npm tool acquisition; remove unlimited overrides.                   | AC-011; process-policy owner         |
| Logs showed outcomes too late and omitted successful timings.                    | Emit start/end phase records and success/failure timings from the outset, with bounded safe labels.                               | AC-011; observability owner          |
| Artifacts copied large corpora that no collector read.                           | Whitelist evidence files with named consumers; diagnostics in logs/summaries; no workspace/cache/fixture uploads.                 | AC-012; evidence owner               |
| A historical registry fixture was judged by a newer contract.                    | Use version-specific expectations; retain old evidence read-only; current live behavior awaits a matching authorized publication. | AC-013; registry owner               |
| Later review exposed lost-response and omitted-history admission gaps.           | Exercise adversarial prior-attempt and uncertain-effect cases before granting release credentials.                                | QA-005/006/012; independent verifier |
| Security checks used current alerts instead of exact-source findings.            | Bind native analysis/SARIF and query coverage to the candidate source. Current alert status is supplementary.                     | AC-007; security owner               |
| Recovery qualification retained a stale job timeout.                             | Treat primary and recovery consumers as one budget-policy inventory.                                                              | DEC-010; workflow owner              |

## 12. Execution budgets, diagnostics and experiment discipline

Use the reference's final production execution limits as the proposed initial release policy:

| Operation                                                                     |                                     Initial execution budget | Interpretation                                                                            |
| ----------------------------------------------------------------------------- | -----------------------------------------------------------: | ----------------------------------------------------------------------------------------- |
| Each native npm install/ci, including tool provisioning and offline reinstall |                                                    5 minutes | Finite process budget; not a package-performance requirement.                             |
| Node test suite                                                               |                                                   30 minutes | A complete suite's execution budget, with progress.                                       |
| Hosted product/transported/registry/recovery qualification job                |                                                   45 minutes | Includes setup, relevant suites, evidence and cleanup.                                    |
| Fast identity/admission/readback jobs                                         |                              Operation-specific finite limit | Do not enlarge every job automatically.                                                   |
| Existing pack, public probes, JSON resource/performance assertions            | Explicit existing contract until measured change is accepted | Preserve semantics; assess cumulative nesting rather than inheriting a universal timeout. |
| Local HISEW supervision                                                       |                            Current registered profile budget | Inspect separately; do not silently change personal settings to match hosted jobs.        |

The current `qualify-runtime.js` wraps both source tests and package qualification at 600 seconds.
Reconcile those wrappers with the new phase budgets; otherwise they will pre-empt the intended 30-minute suite.
A 45-minute job is not a promise that several sequential 30-minute phases can all exhaust their budgets.
Measure the actual phase composition and split jobs if necessary while retaining artifact and lane identity.
Keep network request timeout/retry/backoff within the parent install allowance; bounded read recovery is not permission to repeat a stage, promotion, or publication.

Diagnostics should record run/attempt/source, actual runner image/resources, Node/npm/executable identity, package/lock digest, phase, monotonic elapsed time, exit/signal/timeout and bounded completed npm timings.
Record successful timings too.
Do not interpret overlapping nested npm timings as additive or identify a network cause solely from total duration.
Preserve native stdout/stderr excerpts without environment dumps, npm credentials, arbitrary workflow-command text, or private source/report content.

After a failure:

1. Read existing logs, reports, sibling outcomes and current active runs.
2. Classify the observed boundary; distinguish demonstrated mechanism from hypothesis.
3. Select a minimal representative probe: lifecycle fixture, exact SBOM replay, graph-admission fixture, isolated install, or one actual hosted lane.
4. State source/harness identities, changed variables, finite budget, evidence destination and the decision its result changes.
5. Execute only within the accepted experiment scope; if still unexplained, revise the hypothesis rather than automatically launching a full matrix.
6. Consolidate fixes and focused proof, then perform the required final hosted qualification on the settled candidate.

Retain failed evidence.
A later successful attempt is new evidence, not a rewrite of the failed one.
A diagnostic workflow is not release qualification, and a manually cancelled run is not a passing gate.

## 13. Vertical implementation slices

Each slice produces a demonstrable result and its tests/documentation together.
No executable work begins until the implementation baseline/risk route is accepted.

### SLICE-001 — Freeze the contract and clear first-use feasibility

Deliver a reviewable candidate/evidence schema, workflow/privilege map, SemVer policy, release actor model, complete test inventory, and remote before/after proposal.
Inspect current recipient dependencies, CodeQL alert 1, package namespace/stages, trust bootstrap and tool compatibility.
Complete safe local/native contract probes; remote effects remain gated.
Confirm package-document inclusion and current final reference deltas before copying any behavior.

Predicted surfaces: release contract/schema/tests, runtime policy projections if the producer npm update is accepted, and this plan's decision/open-item amendments.

Proof: independent positive/negative identity/version fixtures, npm 12.2.1 native pack shape/engine compatibility evidence, existing schema/runtime checks, exact CodeQL triage record and authenticated bootstrap feasibility.
No claim that a credential-free dry run proves OIDC, owner approval, or remote permission.

Exit: unresolved material bootstrap/security decisions have a concrete owner and gate; implementation contract is stable enough for one real nonpublishing path.

### SLICE-002 — Qualify one frozen tarball through the existing hosted path

Compose callable CI and explicit manual release qualification around existing source/product/transported checks.
Freeze the matrix once; retain one designated tarball, complete per-lane reports and actual provider graph.
Implement coherent execution budgets and phase diagnostics now.
Support a bounded nonpublishing diagnostic lane without allowing it to mint release qualification.

Predicted surfaces: `ci.yml`, setup-producer action, new `release-qualification.yml`, runtime/package qualifiers, process policy and focused workflow/graph tests.

Proof: native local qualification and workflow syntax/contracts; then authorized Linux/Windows representative lanes, including minimum/runtime-toolchain separation, real job names, report closure and timeout classification.
These diagnostic lanes enable integration learning; only the complete final graph satisfies release admission.

Exit: one complete source-to-tarball-to-installed-consumer path works on each OS and the collector rejects stale/missing/substituted evidence.
No publish credentials are involved.

### SLICE-003 — Close security, recipient inventory and shipment gaps

Add clean root/isolated recipient dependency validity/audit/SBOM evidence, exact-source CodeQL admission, shipped links and complete distribution inventory.
Reuse public probes and native tools.
Repair demonstrated in-scope gate defects; escalate a runtime dependency/bundling change before adopting it.

Predicted surfaces: installed-consumer probe seam, release security/inventory/evidence adapters, schemas and focused fixtures, existing pack/architecture/document contracts.

Proof: actual recipient graphs on Windows/Linux, native SBOM validation, CodeQL finding/stale/warning/missing-language denial, missing-member/link rejection, component/edge/license conservation, no lost native diagnostics.

Exit: complete preparation manifest can explain what ships and what recipients installed, with all required gates satisfied.
The current baseline CodeQL finding must be resolved for a releasable candidate.

### SLICE-004 — Admit and stage exactly one approved package

Implement read-only admission, exact signed-tag/review verification, shared mutation concurrency, complete prior-attempt history, isolated npm configuration and an intent/outcome journal.
Only the final staging job can obtain OIDC.
Implement pending-owner and uncertain-effect outcomes before connecting live privileges.

Predicted surfaces: `stage-release.yml`, publication context/history/staging adapters and hostile-history fixtures.

Proof: wrong event/ref/repository, stale controller, incomplete graph, invalid review, changed tarball, wrong tag, duplicate stage, lost response and omitted history all stop before further effects.
A permitted native tarball dry run preserves integrity without repacking; its limitations are explicit.

Exit: reviewed code is ready for cutover and one separately authorized real staging use.
No bootstrap, trust creation or staged rejection is inferred from passing fixtures.

### SLICE-005 — Resume from owner approval and qualify public recipients

Implement explicit continuation against the original manifest/stage origin and native public state.
Run fresh anonymous exact-version acquisition and installed-payload/signature/provenance checks through the same frozen matrix and root/isolated public probes.
Retain a separate reconciliation record; preserve the original request journal byte-for-byte.

Predicted surfaces: `release-registry.yml`, registry/continuation/evidence adapters and installed-consumer tests.

Proof: missing or mismatched approval, altered public tarball, wrong original publisher/source, unsupported verifier runtime, old-schema fixture and unknown stage outcomes fail correctly.
Real public acceptance requires the authorized actual version; mocks/dry runs cannot close it.

Exit: completed exact public registry run and audit/inventory reports are available to the archival reader.

### SLICE-006 — Publish and verify the complete immutable GitHub archive

Implement a dedicated writer consuming completed public qualification, exact source tag and declared assets.
Create/update only the intended draft under authority, read every asset back, and require enabled immutability before final publication.
Verify native release and per-asset attestations afterwards.

Predicted surfaces: `github-release.yml`, GitHub archive/asset adapters and native-response fixtures.

Proof: missing/extra/swapped draft assets, wrong tag signature/source, disabled immutability, incomplete predecessor and lost publication response block or reconcile safely.
Source archive and required source/license material are mapped to actual distribution obligations; autogenerated GitHub ZIPs are not the npm tarball.

Exit: verified immutable release retained with its asset manifest and public-registry evidence, without an unapproved stable-label change.

### SLICE-007 — Promote and recover exact availability labels

Implement explicit accepted pilot/consumer/restoration evidence, before-state readback, independent promotion trust, journalled label change and cross-service completion readback.
Cover first release with no previous `latest` and prerelease behavior.
Do not automatically roll back a newer legitimate concurrent promotion.

Predicted surfaces: `promote-release.yml`, acceptance/promotion/recovery adapters, operations docs and native-state fixtures.

Proof: changed prior label, wrong acceptance digest, prerelease-to-latest, stale security, partial npm/GitHub effect, and lost response produce correct denial or explicit partial completion.
Restoration targets only an already qualified version under specific authority; label absence requires its own considered recovery.

Exit: the actual authorized release has coherent final labels or a retained actionable partial-state record.

### SLICE-008 — Consolidated assurance, cutover and first live acceptance

Consolidate the final patch; complete ordinary review, independent verification and native security assessment.
Format/lint the exact commit scope, including docs, run the required local HISEW profile once on the settled inputs, and bind eligible evidence across content-preserving commits.
Deliver only through the owner-authorized route.

Then apply and read back the reviewed GitHub controls; prepare npm bootstrap/trust just in time; execute one authorized complete hosted/release journey.
Refresh candidate-specific and time-sensitive gates at the appropriate boundaries.
Document observed setup differences and first-use outcomes.
Retain protected receipts and dispose only task-owned eligible temporary material.

Exit: distinguish implemented, locally verified, delivered, remotely configured, hosted-qualified, publicly published, archived, promoted and operationally accepted states.
Do not complete the release because only source delivery or a partial lane succeeded.

### Slice traceability

| Slice     | Requirements / acceptance      | Scenarios / decisions                            | Falsifiable proof                                                           | Release / cleanup implication                            |
| --------- | ------------------------------ | ------------------------------------------------ | --------------------------------------------------------------------------- | -------------------------------------------------------- |
| SLICE-001 | REQ/AC-001, 004, 014           | QA-001/008; DEC-001/003/004/012                  | Contract/version/toolchain/first-use evidence and blocker disposition       | No effects; accepted baseline retained                   |
| SLICE-002 | REQ/AC-002, 003, 004, 011, 013 | QA-002..004/008/010/011/014; DEC-002/007/010/011 | Real transported archive, observed provider graph, bounded process failures | No publishing rights; temporary consumers owned          |
| SLICE-003 | REQ/AC-007, 008, 013           | QA-007/009/013; DEC-009                          | Actual recipient/native inventory and exact-source security gates           | Preparation eligible only when all required results pass |
| SLICE-004 | REQ/AC-001, 005, 006, 014      | QA-001/002/005/006; DEC-005/006/007/012          | Effect-free rejection fixtures and native staging integration               | Live staging/placeholder requires separate authority     |
| SLICE-005 | REQ/AC-004, 006, 007, 014      | QA-005/007/008/009; DEC-007/008                  | Fresh public version, cryptography, consumers and reconciliation            | Original stage journal retained; no republish            |
| SLICE-006 | REQ/AC-008, 009, 014           | QA-002/003/012/013; DEC-006/007                  | Full draft readback and native immutable-release/asset verification         | Immutable assets retained; failed drafts reconciled      |
| SLICE-007 | REQ/AC-006, 010                | QA-005/006/012; DEC-005/006                      | Exact acceptance/prior-state checks and final native readback               | Reversible labels only; public bytes remain              |
| SLICE-008 | REQ/AC-001..014                | QA-001..014; DEC-001..012                        | Consolidated review, final local/hosted proof and real owner journey        | Separate delivery/release/resource closure               |

Dependencies: SLICE-001 precedes SLICE-002/003; both preparation slices precede granting SLICE-004 live effects.
SLICE-005 follows real owner approval; SLICE-006 consumes its completed result; SLICE-007 follows immutable verification and acceptance.
SLICE-008's source assurance/cutover checkpoints surround the live portions of SLICE-004..007; its final acceptance is last.
A blocked live slice does not justify manufacturing proof or discarding completed nonpublishing work.

## 14. Verification and test-oracle ownership

Use test-first executable admission for consequential boundaries, with native integrations where feasible.
Do not add mirror tests for trivial documentation or reversible wiring.

| Concern                         | Oracle and boundary                                                                                                                                                                |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Run/job/event/attempt admission | Independently authored allowed/denied fixtures plus a captured real GitHub provider response; the implementation's expected-list builder cannot generate its own sole test oracle. |
| Packing/lock/install            | Native npm reports, actual tarball bytes, clean real root/isolated installations and independently expected public behavior.                                                       |
| Runtime policy                  | Existing canonical policy/projections and real selected Node/npm execution; no mocked platform acceptance.                                                                         |
| Cryptography and native formats | Native npm/GitHub verification and native SBOM validator; custom code only binds results to the intended subject.                                                                  |
| Publication failures            | Mock service transport only for otherwise irreversible/uncertain cases; preserve realistic status/error/pagination behavior, supplemented by authorized actual first-use evidence. |
| Child cleanup/timeouts          | Real bounded subprocess/server fixtures and sentinels; completion ownership and original failure preservation.                                                                     |
| Security                        | Exact-source CodeQL plus native security assessment, audited recipient graphs, and accountable disposition. Schema validation and a zero-current-alert list are insufficient.      |
| Recovery                        | Independent previous/current remote-state fixtures and a reviewed runbook; actual authorized readback before effects.                                                              |

Development cadence:

- Run focused changed-boundary tests while editing; use `check:affected` at meaningful integration points.
- Ensure new release tests are classified correctly by `qualify-runtime.js`. Producer-only registry/GitHub/security-tool tests must not require unavailable modern tooling in every minimum-runtime consumer lane.
- Run exact-scope formatting/lint/schema/workflow checks before every authorized commit; do not use a later broad suite to excuse omission.
- Complete one consolidated ordinary/security/independent assessment of the frozen scope; review fixes narrowly.
- Run required HISEW full relevant verification once on the settled candidate. The existing `check:full` packs only clean committed source; preserve that guard and agree the checkpoint/clean-source sequence with native evidence admission rather than disabling it.
- Compare content/tree, measured inputs, tools, profile and environment before reusing evidence. A changed commit label alone does not justify rerunning identical work; changed tested inputs or time-sensitive registry questions do.
- Run the complete explicit hosted preparation for a real release; later stages reuse its exact archived proof unless invalidated. Public registry tests remain a separate actual public-boundary obligation.

Changing producer npm to 12.2.1 needs the existing native pack-report, lock, archive and runtime tests.
Do not couple that change to unrelated dependency upgrades.
Security findings or actual recipient graph changes can require a separately bounded repair and corresponding new proof.

## 15. Migration, recovery and retention

### Cutover order

Prepare and verify source with no release credentials.
Review the concrete remote control proposal and inspect all current publishers/producers.
Apply read-only Actions defaults and specific environment restrictions with readback, preserving explicit required permissions.
Enable immutable releases before publishing any GitHub release.
Complete authenticated npm ownership/bootstrap and stage-only/promotion configuration near first use.
Verify stronger package publishing access and remove only specifically identified obsolete scoped credentials under authority.
No unqualified publication is used merely to test setup.

Preserve existing exact-Git consumers throughout.
Do not change consumer pins, lockfiles or installation caches in other repositories.
Representative pilot acceptance can use isolated fixtures or explicitly authorized consumers; it does not authorize their migration.

### Failure and recovery matrix

| Observed state                                           | Required action                                                                                                                           |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Qualification/security/inventory fails before staging    | Retain failed proof; repair and qualify the changed candidate. No publication or label operation.                                         |
| Staging request attempted, outcome unknown               | Freeze further effects; inspect all attempts and authenticated native stage/public state. Missing journal/response is not absence.        |
| Stage exists, owner has not approved                     | End the job; report exact pending owner action. Do not keep a runner polling or auto-approve.                                             |
| Wrong stage/version/tag/bytes                            | Owner reviews native rejection with 2FA; preserve identity and rejection evidence before an independently authorized replacement.         |
| Public version exists with intended bytes                | Reconcile to original stage/publisher evidence and run public qualification. Never republish it.                                          |
| Public version exists with different bytes               | Block and investigate; use a new version for repair. Do not force, overwrite or unpublish to erase the conflict.                          |
| Public qualification fails after approval                | Keep `pilot`, do not promote. Classify code/dependency/environment failure and choose a reviewed forward fix; downloads already occurred. |
| GitHub response lost or immutable release already exists | Read exact tag/release/assets and verify natively. Matching state can reconcile; conflicting immutable state requires a new release.      |
| npm promotion succeeded; GitHub marker update failed     | Record partial stable state and prior/actual labels; repair only the remaining authorized effect after fresh readback.                    |
| Prior label changed by another actor                     | Stop stale promotion/recovery. Obtain a new attributable decision against the actual state.                                               |
| Evidence expired or was deleted                          | Recover authenticated retained exact records or qualify an appropriate new candidate; never synthesize missing run/job/origin evidence.   |
| Connection expired before first use                      | Reconcile retained stage/effects, recreate only the authorized exact connection and verify native settings; no fallback publish token.    |

### Evidence and resource policy

Durable public release assets should include the exact npm tarball, closed release/evidence manifests, package identity/member inventory, scoped SBOMs and rights/source material required for the actual distribution, and compact public qualification/security/acceptance records.
Select exact asset names in SLICE-001.
Preserve full private security reports and sensitive authenticated observations in restricted external storage; public records expose only reviewed safe summaries/digests.

Routine progress and diagnostics go to logs and concise job summaries.
Action artifacts are justified only for machine handoff, later verification or recovery.
Specify a consumer and retention period for each artifact before uploading it.
Use a proposed 90-day working-artifact window only after checking repository/organization limits; immutable release evidence must survive that window.
Archive required recovery evidence before expiry or owner deletion.
Do not upload workspaces, installed node_modules, caches, copied corpora, raw private SARIF, credentials or unrelated fixtures.

The coordinator records task-owned temporary directories/processes, consumer, preservation destination, size where material, and cleanup trigger.
Release fixtures can be cleaned after their consumers finish and required evidence is retained; immutable/history records remain.
Existing unrelated HISEW resource holds retain their original coordinators and are not treated as failed release logic or permission for broad cleanup.

## 16. Open decisions and cheapest next evidence

| Item                                                   | Owner / smallest useful evidence                                                                                                                            | Gate and consequence                                                                                           |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| OPEN-001 Implementation authority and route            | Maintainer accepts/revises this draft, R2 scope, delivery/configuration authority and bounded hosted experiment scope.                                      | Before executable work; planning is complete without inventing acceptance.                                     |
| OPEN-002 First version and compatibility               | Maintainer selects exact npm SemVer and prerelease/stable intent from the actual unpublished API/schema/behavior delta.                                     | Before version commit/staging; `0.1.0-dev.0` is not an automatic release choice.                               |
| OPEN-003 npm ownership/bootstrap                       | Authenticated package/org/stage/settings inspection, documented placeholder-aware native setup path and exact proposed effects.                             | Before first package/trust effect; unresolved bootstrap blocks live release, not nonpublishing implementation. |
| OPEN-004 Current CodeQL finding                        | Security owner triages alert 1 at the exact source, repairs real cause or proposes an evidence-backed gate disposition, then obtains exact-source analysis. | Zero-finding release gate currently cannot pass.                                                               |
| OPEN-005 Actual recipient graph                        | One clean root and isolated native install/audit/ls/SBOM per OS, with original logs and locks.                                                              | Before full fan-out/staging; don't discover a systematic advisory only at final release.                       |
| OPEN-006 npm/tool adoption                             | Native npm 12.2.1 engines/report/pack checks; selected validator/action/CLI release and exact-license/digest records.                                       | Before executing newly selected tooling; no floating latest execution.                                         |
| OPEN-007 First hosted graph                            | One authorized nonpublishing representative path and actual provider job/artifact responses.                                                                | Before freezing graph admission; explicit inactive branches only.                                              |
| OPEN-008 Staged provenance/approval retention          | Exact native stage/download/approval and public provenance from the first authorized release.                                                               | Dry-run evidence does not close this; stable promotion waits.                                                  |
| OPEN-009 Publisher first use and expiry                | Native settings readback plus explicit stage and promotion connection validation semantics/window.                                                          | Configure just in time; do not assume a tag-only operation activates a connection.                             |
| OPEN-010 Representative acceptance/restoration         | Maintainer chooses actual JSON Quality consumer scenarios and prior-qualified-version/first-release recovery expectations.                                  | Before stable promotion; no inherited Markdown-specific consumer keys.                                         |
| OPEN-011 Hosted timing and supervision                 | Measured JSON Quality phase durations, actual nested limits and registered HISEW profile budget.                                                            | Before claiming operational headroom; 5/30/45 values are selected policy, not a platform standard.             |
| OPEN-012 Native remote controls and evidence retention | Exact environments, defaults, immutability, publisher/token restrictions and artifact-retention readback.                                                   | Before live effects and final closure; API permission errors remain explicit gaps.                             |

Replan when a native API cannot enforce the selected boundary, source/control compatibility changes, additional contributors gain release authority, recipient repair requires bundling/new runtime behavior, platform coverage changes, version/bootstrap policy changes, deadlines invalidate actual product requirements, licensing is unresolved, or evidence cannot be retained/reconciled.
Reassess whether each added mechanism improves the maintainer's trustworthy release outcome or merely adds another report/workflow.

## 17. Completion and handoff

Implementation is complete only when the accepted source/configuration scope, consolidated review, required local proof, exact delivery and configuration readback are done.
Hosted release readiness requires the final complete nonpublishing graph.
Public release completion additionally requires the actual staged/owner/public-registry/archive/promotion journey and final accepted state.
If version/owner presence is intentionally pending, hand off an implemented, verified mechanism with that precise live boundary open.

The implementing handoff must state:

- Accepted baseline revision, source/control commits, version if selected, and remaining decisions.
- Which checks were fresh, reused with valid bindings, failed, unavailable or deliberately pending.
- Exact remote configuration and package/release effects actually observed.
- Any uncertain or partial effects, next actor/action, and bounded recovery procedure.
- Retained evidence, expiration/cleanup obligations, and original resource coordinators.

For the original planning checkpoint, only this document was added.
The original planning record claimed no executable implementation, commit, push, workflow run, remote setting, npm stage, approval, GitHub release or dist-tag change.

### Implementation checkpoint, 2026-10-18

The accepted plan was committed first as signed commit `4b93d0038b406843255bd963af94a3728c596da5`.
HISEW execution `54f7876e-8a1c-4b9c-8f3b-ba2bea3769ba` owns the accepted R2 source implementation.
The source checkpoint follows focused admission/native-tool/workflow proof; the required clean-source full profile and consolidated ordinary, independent and native security assessments follow on the frozen committed candidate.
Forward fixes receive their own exact-scope format/lint and signed commits; verification is reused only where native content/environment admission permits it.
This order preserves `packCandidate`'s clean committed-source requirement and avoids running the same full suite before and after an equal-content checkpoint merely for commit timing.

Producer npm 12.2.1 was acquired in a task-owned disposable prefix, with its actual license and engine/pack-report/runtime-policy contracts inspected and exercised on Node 24.21.0.
The policy pin is adopted without changing the personal/global npm installation, consumer npm, public Node floors, runtime dependencies or lock graph.
Native CycloneDX 0.33.1 validated actual Windows npm output.
The tool's roughly 80 MB executable has a separate finite acquisition bound; package archives retain the 20 MB boundary.
An observed native npm SBOM omission in a mixed production/development installation is addressed by a clean production-only manifest installed against the unchanged source lock, with complete location/edge/rights admission rather than editing native SBOM components.
CodeQL alert 1's generated-JavaScript test fixture is replaced by a static fixture receiving JSON data; final hosted CodeQL disposition remains unverified.

Five explicit release workflows and callable manual CI implement the source seams; the existing manual CI also supports one supported diagnostic lane that cannot satisfy release admission.
The operations guide is the single maintained operator contract; no separate dossier, release framework or preview lockfile is added.
Source review/verification and task resource dispositions remain implementation obligations until their actual evidence is admitted.
Consolidated source review identified and repaired the release artifact root, originating promotion-journal acquisition, post-publication restoration decision channel, native npm build-metadata normalization, and expired Actions history admission.
The retention repair reuses the digest-bound owner review: an explicitly reviewed signed annotated checkpoint tag retains exact original journals before expiry, while every fresh native writer/attempt is still enumerated and unknown outcomes remain blockers.
The read-only exporter accepts a prior checkpoint for renewal; it creates no remote state. The operations guide owns the exact checkpoint and restoration inputs.
Focused regressions cover admission-driven promotion journal acquisition, digest-bound restoration without mutable release assets, and expired-history readback above 1 MB with unresolved outcomes still refused.
Independent CLI review additionally repaired draft-capable lookup, workflow-token settings permission assumptions, complete-only prior-run status admission, bounded completion jobs, historical successful-continuation settlements, explicit idempotent GitHub-only repair, and fresh target-label verification before completion.
The one-hour owner native immutability read is digest-bound in the existing pilot decision because the workflow token has no Administration permission; actual immutable release and asset verification remain mandatory after publication.
Actual Windows root and isolated transported consumers on Node 24.21.0/npm 11.21.1 exposed and repaired fixture PURL identity and native slash-spelling differences; both layouts then passed native dependency/audit/SBOM/location/rights validation, CycloneDX 0.33.1 validation, public contracts and offline reinstall. These local diagnostic observations do not substitute for the hosted frozen matrix or public-registry provenance gate.
Independent repair review also closed predecessor/history acquisition collisions and restored original prior-label identity during partial restoration. Stage review bytes now use the same explicit digest-bound dispatch pattern as restoration; successive recovery records retain their own original journals in one append-preserving index. Focused native-filesystem and restoration-recovery regressions exercise these composition seams.
No push, hosted dispatch, remote setting change, first-package bootstrap, real version selection, npm stage/approval, GitHub publication or availability-label change is claimed at this source checkpoint.

## 18. Authoritative references and source links

The following primary sources were refreshed on 2026-10-18.
Service behavior must be rechecked at implementation/cutover where it affects admission.
The design tables above describe this repository's selected/proposed policy; they do not claim a certification or a SLSA level.

| Source                                                                                                              | Decision supported                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [npm trusted publishing][npm-trust-publishing]                                                                      | OIDC identity, independent direct-publish/dist-tag permissions, first-use expiry and native permission limitations. |
| [npm staged publishing][npm-staged] and [npm stage CLI][npm-stage]                                                  | New-package placeholder, native stage/download/approve/reject lifecycle, fixed initial tag and version uniqueness.  |
| [npm trust CLI][npm-trust] and [package 2FA controls][npm-2fa]                                                      | Supported account configuration and token restrictions.                                                             |
| [npm provenance][npm-provenance] and [npm audit][npm-audit]                                                         | Native provenance/signature and dependency-assessment boundaries.                                                   |
| [npm SBOM][npm-sbom] and [CycloneDX specification][cdx-spec]                                                        | Native inventory output, lifecycle/subject clarity and real consumer validation.                                    |
| [GitHub secure use][gh-security] and [workflow reuse][gh-reuse]                                                     | Narrow permissions, pinned dependencies, untrusted-input handling and supported composition.                        |
| [GitHub immutable releases][gh-immutable], [release verification][gh-verify], [asset verification][gh-verify-asset] | Draft-before-publish order, immutable assets/tag and native verification.                                           |
| [GitHub code-scanning API][gh-code-scanning]                                                                        | Exact-source analysis identity and native result retrieval.                                                         |
| [GitHub artifacts][gh-artifacts] and [job summaries][gh-summaries]                                                  | Machine evidence handoff/retention versus human diagnostics.                                                        |
| [SemVer 2.0.0][semver]                                                                                              | Valid versions, compatibility intent, prerelease distinction and immutable published contents.                      |
| [RFC 8089][file-uri]                                                                                                | File-URI representation for native Windows SBOM interoperability.                                                   |
| [npm 12.2.1 release][npm-release], [npm license][npm-license], [CycloneDX CLI license][cdx-license]                 | Actual maintained release/rights selection rather than copied documentation banners.                                |

[mq-plan]: https://github.com/Hadden-Industries/markdown-quality/blob/2aa6843f01edfb2e0bc7f4bbd97fcd749eb6ed0d/docs/plans/2026-10-16-release-publishing-assurance-implementation-plan.md
[mq-operations]: https://github.com/Hadden-Industries/markdown-quality/blob/2aa6843f01edfb2e0bc7f4bbd97fcd749eb6ed0d/docs/release-operations.md
[mq-repair]: https://github.com/Hadden-Industries/markdown-quality/blob/2aa6843f01edfb2e0bc7f4bbd97fcd749eb6ed0d/docs/research/2026-10-17-release-qualification-repair.md
[mq-observation]: https://github.com/Hadden-Industries/markdown-quality/blob/2aa6843f01edfb2e0bc7f4bbd97fcd749eb6ed0d/docs/research/2026-10-18-windows-ci-observation.md
[mq-plan-commit]: https://github.com/Hadden-Industries/markdown-quality/commit/92fc7a01ae46afbfa17a6ee86ec1419fc5f33c2c
[mq-implementation]: https://github.com/Hadden-Industries/markdown-quality/commit/2c5dce124bfa04c5df7785f94fe921ec1f12c89f
[mq-doc-fix]: https://github.com/Hadden-Industries/markdown-quality/commit/a74d46f0ba0c8f469b417c2155417ccebba5121c
[mq-admission-fix]: https://github.com/Hadden-Industries/markdown-quality/commit/ff9d7099bd24e01002d74f8197b59e58be79adcb
[mq-blocker-fix]: https://github.com/Hadden-Industries/markdown-quality/commit/994b660ffe163989fec47e0b1ea27edc1f120049
[mq-integration-fix]: https://github.com/Hadden-Industries/markdown-quality/commit/f6c56aa43c86b4e7bf37b8e15fd7b89ed7068e51
[mq-artifacts]: https://github.com/Hadden-Industries/markdown-quality/commit/04b932bc37109a45600d231cfc63ab6f6c812821
[mq-lifecycle]: https://github.com/Hadden-Industries/markdown-quality/commit/c3d2c1a6713eadaa32af9f82e95789081c90aad6
[mq-phases]: https://github.com/Hadden-Industries/markdown-quality/commit/4d5d128cbe03dc17b529d541803da70d4774bc72
[mq-npm-timings]: https://github.com/Hadden-Industries/markdown-quality/commit/2f4718f05df9565ba9d9bb0f14ef56f0ca93a539
[mq-observation-commit]: https://github.com/Hadden-Industries/markdown-quality/commit/58813562ca00e8ad2aa0d8ade5b468445ee4a3a2
[mq-budgets]: https://github.com/Hadden-Industries/markdown-quality/commit/2aa6843f01edfb2e0bc7f4bbd97fcd749eb6ed0d
[json-alert]: https://github.com/Hadden-Industries/json-quality/security/code-scanning/1
[npm-trust-publishing]: https://docs.npmjs.com/trusted-publishers/
[npm-staged]: https://docs.npmjs.com/staged-publishing/
[npm-stage]: https://docs.npmjs.com/cli/v12/commands/npm-stage/
[npm-trust]: https://docs.npmjs.com/cli/v12/commands/npm-trust/
[npm-2fa]: https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/
[npm-provenance]: https://docs.npmjs.com/generating-provenance-statements/
[npm-audit]: https://docs.npmjs.com/cli/v12/commands/npm-audit/
[npm-sbom]: https://docs.npmjs.com/cli/v12/commands/npm-sbom/
[cdx-spec]: https://cyclonedx.org/specification/overview/
[gh-security]: https://docs.github.com/en/actions/reference/security/secure-use
[gh-reuse]: https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows
[gh-immutable]: https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases
[gh-verify]: https://cli.github.com/manual/gh_release_verify
[gh-verify-asset]: https://cli.github.com/manual/gh_release_verify-asset
[gh-code-scanning]: https://docs.github.com/en/rest/code-scanning/code-scanning
[gh-artifacts]: https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts
[gh-summaries]: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands#adding-a-job-summary
[semver]: https://semver.org/spec/v2.0.0.html
[file-uri]: https://www.rfc-editor.org/rfc/rfc8089.html
[npm-release]: https://github.com/npm/cli/releases/tag/v12.2.1
[npm-license]: https://github.com/npm/cli/blob/v12.2.1/LICENSE
[cdx-license]: https://github.com/CycloneDX/cyclonedx-cli/blob/v0.33.1/LICENSE
