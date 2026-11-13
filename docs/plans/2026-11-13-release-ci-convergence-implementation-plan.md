# JSON Quality release CI convergence implementation plan

**Owner-approved implementation plan, 13 November 2026.**
At stable release completion, an unversioned installation of the core or either public native companion must resolve to the qualified family.
The owner can publish through npm `pilot` or explicitly select `latest` for any version, including a release candidate (RC).
An operator must be able to explain which bytes shipped, which npm or GitHub change succeeded, and which action is safe after interruption.
Keep JSON Quality’s exact-source security checks, signed writer history, service-specific permissions and compact immutable archive.

## Baseline and scope

The inspected checkout is `dev/ci` at `6c037cb425613b1c57543156d0b2048d4f3ac97c`.
Remote `dev/ci` matched it.
Local and remote `main` and the signed `v1.0.0` source are `2657eb615a80a8ab02e1688a484d3b28fcd35ca4`.
The comparison partner is Markdown Quality at `b1c345d` on `fix/ci`.
Source delivered on a topic branch still needs normal integration and hosted proof.
[JSON checkout](https://github.com/Hadden-Industries/json-quality/tree/6c037cb425613b1c57543156d0b2048d4f3ac97c) · [Markdown checkout](https://github.com/Hadden-Industries/markdown-quality/tree/b1c345dc077514a903672a27ec6b53266cf57031)

- `64dba10` and `9cdc3f2` freeze Node 22.13.0, 22.23.4, 24.22.2 and 26.13.0 on Ubuntu 26.04 and Windows 2025.
  Producer npm is 12.2.2, consumer npm is 11.21.2.
  JSON deliberately removed its contributor npm floor.
  `4222741` bounds post-write readback to five minutes, polls an approved old value and handles object and singleton-array npm responses.
  `6c037cb` includes the subsequent dependency and formatter refresh.
  Carry those commits forward through their existing integration work.
  Align the remaining present-tense Ubuntu 24.04 instruction with the policy while retaining historical runner evidence.
  [Runtime policy](../../assets/node-support.json) · [Runtime guide](../node-runtime-compatibility.md) · [Readback change](https://github.com/Hadden-Industries/json-quality/commit/4222741)
- The 13 November GitHub readback found active main ruleset 25958823, strict Actions-bound `CI / acceptance`, merge-only PRs, resolved threads, zero required approving reviews and no bypass actors.
  Actions enforces SHA pins and a selected allowlist.
  The release environments restrict deployment to `main`.
  No tag ruleset appeared in the repository or inherited inventory.
  Keep the deliberate `ready_for_review` trigger, qualified PR reuse and manual full/installed-only profiles.
  A successful push observer can return `FULL_REQUIRED`.
  [Governance declaration](../../.github/governance.json) · [Live ruleset](https://github.com/Hadden-Industries/json-quality/rules/25958823) · [CI trust](../ci-trust.md)
- GitHub latest was immutable release **437217191**, `v1.0.0`, with 10 assets.
  Anonymous npm returned `pilot=1.0.0` for all three, `latest=1.0.0` for core and `latest=1.0.0-rc.2` for both companions.
  All three public provenance subjects matched their registry integrity and named stage run 42321261095, attempt 1.
  This metadata check has a narrower scope than the native signature and installed-recipient verification in release CI.
  No new release run after the comparison supplied hosted proof for `dev/ci`.
  [Immutable release](https://github.com/Hadden-Industries/json-quality/releases/tag/v1.0.0) · [Staging run](https://github.com/Hadden-Industries/json-quality/actions/runs/42321261095) · [Public qualification](https://github.com/Hadden-Industries/json-quality/actions/runs/42322378128)

The owner selected HISEW **R2** for this change to public release contracts, cross-service writes and recovery.
The maintainer remains the sole human release approver.
Capture the prior full verification baseline on the exact integration commit before implementation.
Implementing and accepting the controller, activating provider settings, aligning a published release and publishing a new version are separate decisions.
HISEW closed the separate dependency-refresh execution on 13 November 2026 as `completed-elsewhere`, with disposition `closed-without-verification`.
The October release plan records an earlier single-package scope.
Preserve the current runbook’s explicit `npmTag: latest` selection and its emergency core-only restoration.
Amend family promotion, GitHub channel classification, recovery evidence and completion readback together.
Preserve public CLI/API, native protocol, version projection, exact optional dependencies and product performance corpus.
[Existing release plan](2026-10-18-release-publishing-assurance-implementation-plan.md) · [Current operating contract](../release-operations.md)

## Accepted release contracts

1. **REQ-01 · One candidate.**
   Freeze one source, package version, signed annotated tag, three archive integrities and the matrix.
   A later controller may operate on those bytes only under the reviewed source-to-controller delta.
   Stage identities include package, original producing run/attempt, workflow/controller SHA and archive integrity.
   A retry may have a different controller and cannot become the original producer.
2. **REQ-02 · Owner-selected channel.**
   Omission selects npm `pilot`.
   The owner may explicitly select `latest` in the same digest-bound review without a waiver.
   Both routes require approved, public, byte- and provenance-verified native companions working on Linux and Windows before core is staged.
   After core approval, run fresh public qualification of the exact three-package family.
   With `latest`, each package becomes the default as its stage is approved, so direct-route users can see the new core while public qualification is running.
   A stable SemVer pilot stays a GitHub prerelease until promotion.
   A stable version sent directly to npm `latest` becomes GitHub stable/latest after successful public qualification and verified immutable archival.
   An RC remains a GitHub prerelease on either npm channel.
   [npm staged publishing](https://docs.npmjs.com/staged-publishing/) · [GitHub immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)
3. **REQ-03 · Conditional effects.**
   An approved family operation carries an exact prior value per package, explicit absence where relevant, target integrities, target release ID and expected prior GitHub latest ID or absence.
   Intent, provider request and confirmed readback are separate events.
   An attempted or unknown effect requires original evidence and reconciliation.
   A process exit, a 404 or an apparently correct current label alone cannot settle it.
4. **REQ-04 · Evidence and authority.** npm owns stages, signatures, interactive approval and dist-tags.
   GitHub owns tag objects, release IDs, artifact/attempt identities and immutability.
   Local code binds those objects to approvals.
   Run full validation in read-only jobs and keep the npm and GitHub writers separate.
   Preserve all logical archive members, corresponding source, rights and historical readers.
   Keep the two projects independently deployable.
   [npm publisher permissions](https://docs.npmjs.com/trusted-publishers/) · [SLSA artifact verification](https://slsa.dev/spec/v1.2/verifying-artifacts)

## Delivery slices

### SLICE-001 — Establish the baseline and protect signing refs

**REQ-01, REQ-04.**
The repository maintainer reconciles the existing branch with the release controller on main, captures the exact full baseline, and checks the two readback shapes, five-minute deadline, third-value refusal and single write through the npm-context tests.
Reuse `scripts/github-governance.js` and its inspect/check/apply split for managed tag rules.
Cover `refs/tags/v*` and `refs/tags/release-history-*`.
Restrict creation to the approved actor via a creation-only rule.
Enforce update and deletion restrictions separately, with no creation bypass on those rules.
Verify the expected tag object, source and signature against the owner's approved signing identity.
The current release verifier checks GitHub's valid-signature result.
A valid signature from another identity must fail admission even when the owner pushed the ref.
Use the owner's existing signature once per tag and keep the private key outside Actions.
Support deliberate key rotation and retain the trust information needed to verify historical tags.
Renew history under a fresh signed tag.
A mistaken release tag calls for a fresh candidate identity.
[Tag rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)

**Acceptance.**
Test the desired and effective policies, inherited overlaps, an authorized create, an unauthorized create, creator update/delete refusals, a valid but unapproved signer and an approved key rotation in isolated fixtures.
Read back provider policy before and after authorized activation.
Confirm all three npm package bindings to `stage-release.yml`/`npm-publication` and `promote-release.yml`/`npm-promotion`, alternate credentials, 2FA and absence of direct publishing.
The promotion connection also has staging capability under npm’s policy.
Record only non-secret identifiers and permission results.
In `main-qualification.yml`, surface the reason for `FULL_REQUIRED` and the exact manual full follow-up.
An installed-only result cannot satisfy it.
Exercise changed-head, equal-input and missing-proof cases.
Use `tests/governance.test.js`, `tests/ci-proof.test.js` and `npm run check:workflow-contracts`.

### SLICE-002 — Bind the shipped native components to qualification

**REQ-01, REQ-04.**
The native maintainer follows `native/build.py`, `native/stage.py` and `native-producer.yml` into the two checked-in `native/prebuilt` directories and the three tarballs made by the qualification producer.
Compare original producer outputs and input manifests to actual extracted executable/library digests, notices and corresponding source.
Verify the native build’s source-input digest against the candidate’s native inputs.
Where producer bytes came from an earlier build, permit reuse only with an authenticated producer and identical relevant input/payload identities.
If the linkage cannot be established, refresh payloads and original producer evidence before freezing a new candidate.
A second successful build alone cannot identify the bytes in the shipped archive.
[Native producer](../../.github/workflows/native-producer.yml) · [Release qualification](../../.github/workflows/release-qualification.yml)

Extend `scripts/release-inventory.js` and qualification admission with a distribution inventory reconciled against each packed subject, including bundled native dependencies and rights.
Preserve source and installed inventories as independently checked scopes.
Record native build provenance at production and tarball provenance at packing when claiming that builder.
Retain the existing archival attestation as evidence of archival custody.
Use pinned existing tools and the repository’s native dependency/notice authorities.
Additional extractors need a demonstrated gap, supported format and reviewed license before selection.

**Acceptance.**
On both platforms verify a real packed payload and reconcile the distributed components with the actual build/notice inventory.
Swap a payload, omit a linked component or notice, or substitute a different successful producer.
Each case fails release qualification before owner review.
Confirm the release still admits CodeQL for the exact source, including native builds, source and recipient audits, the two installed layouts and offline replay.
Extend `tests/recipient-inventory.test.js`, `tests/release-contract.test.js` and attestation tests.
Keep PR native and sanitizer lanes.

### SLICE-003 — Stage natives first and qualify the selected release channel

**REQ-01–04.**
Extend the existing `stage-release.yml` manual phase input surface, `scripts/release-effects.js`, `release-contract.js`, `release-registry-evidence.js`, registry recipient verification and journal/history readers.
Introduce native and core phases with the same original manifest and review bytes.
In the first phase make two native stage requests, persist their original identities, and wait for owner inspection and 2FA approval.
In a new dispatch, use read-only Windows and Linux verification of exact public native versions, bytes, original provenance and actual supported native operation.
Only both successful results can admit the original core tarball to its own stage and owner approval.
A missing optional native can leave npm installation successful, so installation success alone is insufficient.
[Markdown’s working phase boundary](https://github.com/Hadden-Industries/markdown-quality/blob/b1c345dc077514a903672a27ec6b53266cf57031/.github/workflows/publish.yml)

Pass per-package origins through candidate, journal, public registry qualification, archive, recovery and offline readers.
Adapt the existing single-origin verifier by selecting the exact package’s origin before native validation.
Never collapse mismatched entries into the core origin.
Use the reviewed channel for all three stage requests.
Decode old reviews, single-origin journals and flat archives under the contracts that produced them.
Keep the original operation identity when recovering a historical request.
In `github-release.yml` and `release-effects.js`, retain the fresh owner-collected immutability evidence for draft writes and the verify-only recovery path for already immutable releases.
For a pilot or RC, positively verify immutable release ID, tag, assets, prerelease flag and unchanged GitHub latest, including a previously absent default.
For direct stable `latest`, require the exact public matrix, verified immutable archive and confirmed npm defaults before completing GitHub stable/latest classification on that release ID.
If the public matrix fails after approvals, report which npm defaults changed, leave the release incomplete and hold GitHub stable classification for recovery.
Accept the already-approved npm labels from authenticated stage records and fresh readback without issuing repeat dist-tag writes.

**Acceptance.**
A two-native successful run followed by a distinct core run produces three matching npm provenance subjects.
A one-native approval, absent attestation, skipped platform job, wrong attempt, digest substitution, stale approved controller or attempted request with unresolved result yields zero core requests.
Exercise stable and RC coordinates with both an omitted channel and an explicit `latest` selection.
A stable pilot becomes eligible for later stable promotion.
An RC on npm `latest` retains GitHub prerelease status.
Direct stable publication must handle failed public qualification and successful completion with zero redundant label writes.
Drive fixtures through `release-registry.yml`, archive completion and the existing release contract, resilience and writer-history test suites.
Keep a complete old single-origin release verifiable.

### SLICE-004 — Promote, align and restore the exact package family

**REQ-02–04.**
Extend `promote-release.yml` and the existing `release-promotion.js`, `promotion-service.js`, `promotion-handoff.js`, `promote-npm.js`, `promote-github.js` and `complete-promotion.js` boundaries.
Read each approved preimage immediately before the corresponding write.
Move Windows, Linux, then core.
Verify earlier targets before proceeding, use one journal entry per package and poll only the allowed old value within the existing deadline.
A third value stops the operation.
Seal the npm completion with all three integrities, original run/attempt and guards.
For stable promotion the GitHub writer rechecks the three labels and edits the same immutable release to clear prerelease and set latest.
Extend the existing GitHub edit and completion readers together, preserving RC classification on both channels.
The npm job has npm OIDC and read-only GitHub access.
The separate GitHub writer can edit the release and has no npm promotion identity.
The sole owner dispatches the approved operation once and the two jobs exchange a digest-bound, attempt-specific result.

**Align an existing stable release.**
Add an owner-selectable alignment operation to the same controller, usable before the next release.
Core and GitHub must already identify the explicitly selected qualified stable release.
For the observed `1.0.0` split, bind the approved prior values of both companions (`1.0.0-rc.2`), core (`1.0.0`) and GitHub latest (release ID `437217191`).
Write only the two companion defaults and verify all four defaults.
If core and GitHub disagree, require an explicit promotion or restoration decision.
Qualify `1.0.0` under its actual single-run staging history, using its signed tag, immutable archive, original registry qualification and exact public tarballs/provenance, plus fresh security and retained-lock checks.
Missing or contradictory original proof blocks alignment.
An authenticated pre-existing target authorizes a no-op only within that operation’s reviewed scope.

**Restore a stable family or settle a partial operation.**
An ordinary owner-approved stable restore moves all three defaults and GitHub latest to a previously qualified immutable family.
Preserve the separately approved emergency core-only npm restore to a qualified immutable RC, with the other npm labels, relevant GitHub release IDs, prerelease flags and GitHub latest checked before and after.
Keep historical core-only readers.
After an interrupted alignment or publication, the owner may select only the labels that the original journal and provider readback establish were changed by that operation.
Restore individually approved and qualified prior versions.
For example, after two native approvals and a failed native check before core staging, restore only the affected companion labels, guarding core and GitHub against any change.
If a prior label was absent, preview its package, current version and proposed removal and require explicit approval to delete it.
Re-read each guard at effect time and stop on third-party drift.
Durably reconcile an uncertain write before authorizing another effect.

**Verify completion with read-only credentials.**
Extend `preparePromotion()` in `scripts/release-promotion.js` and the checks in `scripts/complete-promotion.js`.
Preparation currently reads labels and can reject a stale value before the final verification call.
Authenticate the original operation and writer results first, then apply bounded observation at every completion-time label read that could otherwise reject a transient result.
Keep pre-write guards and signature, digest and schema admission strict.
After an acknowledged write, allow reads to converge from the exact approved prior value to the intended target.
Use capped exponential backoff with jitter and one five-minute deadline across the family’s final label checks, including native CLI timeouts and internal retries.
Reuse `scripts/github-evidence.js` for classified network timeouts/resets, temporary server errors and explicit GitHub rate limits.
Honor provider retry/reset hints and account for npm’s own idempotent read retries.
Stop immediately on a third label, wrong release ID outside the approved transition, digest mismatch, malformed evidence or permission denial.
If the deadline expires, persist **completion unconfirmed**, the last confirmed state per provider, the original journals and the earliest useful retry time when the provider supplied one.
Make the read-only check independently runnable against the same operation, approved targets, original run/attempt and authenticated writer results.
On rerun, re-admit the evidence and read current provider state.
Timeout and propagation lag authorize zero writes or rollbacks.
[GitHub reader](../../scripts/github-evidence.js) · [Current completion entry](../../scripts/complete-promotion.js) · [GitHub rate-limit guidance](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api#handle-rate-limit-errors-appropriately) · [npm read retries](https://docs.npmjs.com/cli/v12/using-npm/config/#fetch-retries)

**Acceptance.**
Exercise the `1.0.0` alignment, ordinary stable promotion and restoration, scoped recovery after either native or core, explicit removal versus undeclared prior absence, a substituted npm handoff, and a GitHub-only continuation.
Drive a stale prior read during preparation followed by convergence, a transport reset, a rate-limit delay longer than the remaining deadline, and an unexpected third value.
Check that unconfirmed completion can resume after provider recovery, preserving the exact writer attempt and issuing no mutations.
Verify separate read-only reporting for a failed writer with an unknown effect and for successful writers awaiting readback.
Exactly one request per changed label, zero for a pre-approved no-op or settled effect.
Independent read-only completion verifies every in-scope label, immutable release ID, channel, signed tag and asset inventory.
An emergency fixture also reads back every excluded label.
Run `tests/promotion-service.test.js`, `tests/release-writer-history.test.js` and `tests/release-resilience.test.js` through the npm context.
[Existing promotion graph](../../.github/workflows/promote-release.yml) · [Historical split recovery](https://github.com/Hadden-Industries/json-quality/actions/runs/42547546167)

### SLICE-005 — Reduce privileged setup and prove recovery before expiry

**REQ-03, REQ-04.**
The controller maintainer traces each writer from its workflow and local composite setup into actual imports, including npm’s native CLI and its bundled libraries.
Start with the npm writer, then stage and GitHub writers.
Move full schema, archive, security and dependency checks to read-only admission.
Carry its provider artifact ID, digest, scope, source, controller, operation and attempt into narrowly scoped writers.
Load writers with the pinned runtime/tools and an absent project dependency tree.
Keep the dependency-free startup marker early enough to prove that a failure happened before any request.
Keep live effect guards, journal persistence and readback at the writer.
Port the Markdown runtime import test to the actual JSON entry points.
[Current setup](../../.github/actions/setup-producer/action.yml) · [Markdown runtime test](https://github.com/Hadden-Industries/markdown-quality/blob/b1c345dc077514a903672a27ec6b53266cf57031/test/release-runtime.test.js)

**Acceptance.**
Drive each normal writer entry point through recording transports with the project dependency graph absent.
A missing tool before startup, wrong predecessor, incomplete checkpoint, stale controller or substituted artifact must yield an unresolved or refused result with zero unauthorized requests.
Extend the existing version-2 history exporter and reader in `scripts/release-provider.js` and `scripts/release-recovery.js` to preserve two independently necessary records.
Retain original writer inventories, journals and settlements, and the target’s original public-qualification run, attempt, job and artifact identities and verified evidence bytes.
Bind the latter to the signed tag, manifest, public integrities and immutable archive.
The current runbook holds restoration when the registry run has expired.
Writer history alone cannot prove that the target passed public qualification.
CI prepares the complete checkpoint during release or recovery and identifies any missing evidence and when the owner signature is due.
The owner signs the prepared history ref before source records expire.
Report publication verification and long-term recovery eligibility separately.
Exercise restoration after removing the original provider records in a fixture.
Require the complete authenticated checkpoint and target evidence.
Missing qualification, an unresolved original write or a substituted snapshot blocks the dependent effect.
An unsigned checkpoint leaves post-expiry recovery unconfirmed.
Keep the legacy checkpoint reader and its narrower evidence scope.
Compare privileged setup time, provider calls and transferred bytes with the full-graph path at equal coverage.
Revert individual setup changes on failure, retaining the newer data readers.

### SLICE-006 — Accept the controller and observe production cutover

**REQ-01–04.**
Exercise the complete channel, alignment, restoration and readback paths against isolated providers.
The required public-recipient checks exercise both installed layouts and native operation on the frozen Windows/Linux matrix.
The existing `consumer`, `pilot` and `restoration` decision records must cite the actual evidence for the chosen route.
On direct `latest`, record exact registry qualification and the selected channel without implying an intermediate pilot ran.
A real downstream trial is recommended and optional.
Skipping it needs no waiver.
Markdown Quality is a representative consumer of the CLI/API, ESLint identity rule and native evidence provider.
If the consumer owner elects to participate, select a consumer commit and the exact public version, exercise its existing integrations in a disposable copy, and record the outcome.
Triage a reproducible defect by its severity through the normal release process.
Consumer sign-off is optional.
A timed restoration rehearsal is optional at every stage, including implementation, controller changes and routine releases.
Automated recovery tests and checks on actual restoration targets are required.
[Downstream integration](https://github.com/Hadden-Industries/markdown-quality/blob/b1c345dc077514a903672a27ec6b53266cf57031/docs/json-quality.md)

**Acceptance and production observation.**
Accept the controller on its exact revision after agreed R2 checks and available hosted checks pass.
Record which paths ran in fixtures, which ran on hosted infrastructure and which need live observation.
Production settings activation, aligning `1.0.0` and publishing a new release each require their own owner decision.
At the next authorized operation, capture the labels, provider IDs and authenticated readback for the paths it exercises.
For a new release also record the source-to-tarball chain, original public provenance and immutable release classification.
Compare elapsed/job minutes at equivalent scope.
The historical `1.0.0` promotion took 6.77 elapsed and 6.50 summed job minutes during recovery.
Report the operation and attempt alongside new measurements.
Archive the evidence and prepare the signed history checkpoint before Actions retention expires.

## Integration and stop conditions

The release maintainer integrates both schema readers and writers.
SLICE-001 and native evidence discovery can proceed independently.
Ship historical readers before emitting new records.
Exercise the SLICE-003 and SLICE-004 channel semantics together before the first new publication.
Slim the writers against that settled contract.
Allow one pending release decision across owner approval boundaries until it completes or the owner explicitly supersedes it.
Before an urgent replacement advances, stop the old operation and reconcile its native stages and changed labels, including outstanding npm stages that could still move `latest` upon approval.
A later retry of the superseded release requires a fresh owner review using the then-current defaults.
Test an outstanding native approval and a late retry against an intervening release.
GitHub’s concurrency group serializes active runs but can replace a pending run.
[GitHub concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)

For R2, record a prior full baseline on the exact integration commit and compare the completed candidate with the configured full profile, `npm run check:repository`.
The focused and affected profiles map to `npm run test:contracts-and-identity` and `npm run test:affected`.
Add the slice-specific release tests above because the focused profile alone does not exercise writers.
Retain R2 independent verification of the frozen revision and the existing scoped independent security assessment.
Record the provider, scope, evidence and disposition for each assessment while keeping human release authority with the owner.
Hosted verification uses fresh exact-source release qualification and anonymous public qualification on all eight lanes, both layouts.
Local targeted readback and contract tests passed 59/59 on the inspected branch.
Record release-specific hosted and live observations when the owner authorizes that operation.

Before the first write, a failed gate leaves the candidate available for inspection.
After a possible write, stop further effects, preserve the original attempt, inspect the provider, and resume only from an authenticated settlement.
Metadata can be restored to a qualified prior target.
Defective published bytes require a new version.
Reopen the affected decision if native producer identity cannot be recovered, an old schema cannot express the intended restore scope, npm trust is missing for a companion, or measured savings require dropping a mandatory verifier.
Historical releases and their evidence retain their original meaning.

## Implementation acceptance boundaries

The implementation uses the existing checkout on `dev/ci`, beginning at `69d206dc6cfe708636856ab6495d0c614602fd9d`.
The owner subsequently selected dependency-guided targeted tests in place of the full-repository profile, a GPT-6 Astra Extra High subagent for the final code review, a Codex Security diff scan, and signed detailed per-file commits with fewer than 50 files per change set.
The exact accepted plan bytes remain retained in the HISEW requirement snapshot.

Delivered boundaries include explicit owner SSH trust and tag-rule declarations; authenticated packed native production linkage; two-dispatch native/core staging; family availability decisions and separate writers; independent read-only completion; durable failed-public-proof reporting; and complete signed-history recovery checkpoints, including native rejection certificates for owner-invoked supersession.
The release runbook documents their inputs and authority boundaries.
Historical single-origin 1.0.0 evidence remains a frozen fixture with its original Ubuntu 24.04 lanes.

Local acceptance exercises real npm packing, native npm one-shot mutation behavior against a loopback service, original signed-tag cryptography, normal staging/promotion/completion entry points with project packages absent, native proof refusals, channel classification and read-only independent recovery.
Architecture admission checks native module dependencies and shipped membership.
Hosted platform qualification, live tag-rule activation, npm trust/2FA inspection, public 1.0.0 alignment, rejection, signing/publication of recovery checkpoints and new release publication remain separate owner operations.
No local test establishes those live states.
