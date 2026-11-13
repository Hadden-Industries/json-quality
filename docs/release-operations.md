# Release operations

Release owners use five manually dispatched workflows to qualify and publish the core package and its two native companions.
For a first release, complete [publisher and environment setup](#before-first-use).
If an effect may already have reached npm or GitHub, start with [failure and recovery](#failure-recovery-and-evidence) before dispatching anything else.

1. [Qualify the package family](#qualification-and-owner-review) with `release-qualification.yml`.
   Retain the frozen manifest digest, signed tag and owner review.
2. [Stage the tarballs](#stage-and-approve) with `stage-release.yml`.
   First approve the two native stages; then dispatch the core phase after both public native checks pass and approve its stage.
3. [Verify public packages](#public-recipients-and-immutable-archival) with `release-registry.yml`.
   Review the registry evidence and record the pilot decision.
4. [Archive the verified assets](#publish-the-immutable-github-release) with `github-release.yml`.
   Verify the published release is immutable.
5. [Promote or restore availability](#promotion-and-restoration) with `promote-release.yml`.
   Verify the labels against the owner’s decision.

PR and main checks have their own [acceptance procedure](ci-trust.md#deliberate-repository-acceptance).
Only an explicit release dispatch starts a release phase.

## Package family and version selection

The release has three designated tarballs: `@hadden-industries/json-quality`, `@hadden-industries/json-quality-linux-x64`, and `@hadden-industries/json-quality-win32-x64`.
The small core declares exact-version optional dependencies, following Markdown Quality's existing distribution pattern.
Native npm selects Windows x64 or Linux x64 glibc; each platform package contains its Node addon, standalone executable and verified notices.

The producer's development file links are rewritten to exact registry versions only in the staged core.
All packages share the owner-selected version, but retain independent archive integrity and authenticated registry provenance.

The existing `--archive` and `--provenance` inputs identify the core and its frozen companion archives; each recipient qualifies the core and only its matching platform payload.
Linux executable mode is checked in the actual native archive.
The local `.provenance.json` records all three byte identities; authenticated registry provenance comes from native npm verification.

### Select the candidate

The published `1.0.0-rc.1` uses configuration/event/native cohort 2.
The current source candidate is selected only by [`package.json.version`](../package.json).
The owner selected the stable SemVer coordinate in that manifest for the next release, replacing the proposed prerelease coordinate.

Qualify and publish that final coordinate through the existing `pilot` route, then promote the same qualified artifacts after acceptance.
Do not qualify an RC and relabel its metadata to produce different final-version bytes.
Once publication consumes a version, a pilot defect requires a new version and fresh qualification; published archives cannot be replaced.

Its contracts use cohort 6, events 5, configuration/source-contract 4, native protocol 5, component schema 4 and Node-API 9.
Zero-configuration policy resolution remains supported; preparing source does not publish it or select it in consumers.
Matching new native artifacts and candidate qualification remain required before claiming installed or release acceptance.

### Prepare the native payloads

Produce both platform components from the reviewed source with the [native workflow](https://github.com/Hadden-Industries/json-quality/blob/main/.github/workflows/native.yml), then verify and stage their immutable payloads through the maintained native staging owner.
Commit those platform asset changes before freezing the release archives: packing requires clean committed source and uses the checked-in `native/prebuilt` family.

A standalone native workflow run does not supply components to the release qualification workflow automatically.
The resulting candidate and its exact frozen archive family require their own installed-consumer and release qualification; passing focused native checks alone does not establish that acceptance.

Formal release publication and HISEW adoption require their owner's separate decisions.
Public API/schema exports, executable artifacts, CLI entrypoints and consumer Node floors remain separate compatibility contracts.

### Choose the initial availability tag

No artificial prerelease is required to warm npm or GitHub.
Use the exact separately accepted version initially under the existing `pilot` availability tag, qualify real registry recipients, and promote only after acceptance.

An owner may instead explicitly select `"npmTag":"latest"` in the digest-bound release review, including for a release candidate.
This makes unpinned npm installations select that version; omission preserves `pilot`.
The choice applies to all three packages.
RCs retain GitHub prerelease status on either channel.

Create the GitHub release as a draft, attach and verify every asset, then publish immutably through the existing archival workflow.
Npm availability initially follows the reviewed tag, normally `pilot`; promotion changes availability labels without replacing locked assets or tags.

A stable pilot archives as a GitHub prerelease until promotion.
A direct stable `latest` publication first establishes immutable custody, confirms all three npm defaults, then clears prerelease and sets GitHub latest on that same release ID.

For a new npm package identity, native staging may create the public `0.0.0-stage` placeholder; owner bootstrap and 2FA still precede trusted-publisher setup.
That bootstrap is a separate explicit effect, not a dummy package or test release silently performed by this change.
See [npm staged publishing](https://docs.npmjs.com/staged-publishing/) and [GitHub immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases).

## Before first use

Select the exact version and compatibility intent with the owner.
Edit only `package.json.version`, then run `npm run sync:version` to project the companion manifests and owned lockfile version fields.

Policy provenance independently fingerprints current input bytes and selected dependency declarations; version-only changes leave its readable input inventory and fingerprint unchanged.
`npm run check:version` detects drift without writing; repository qualification and hosted native production run it before expensive work.
Synchronization preserves dependency resolution, native payloads, build evidence, historical plans, published records and release approvals.

Changing the candidate does not authorize publication or transfer qualification from earlier bytes.
The checked-in development version is not implicit permission to release it.
Native npm SemVer admits intentional zero-major and prerelease releases.
Build metadata is rejected because native npm publishing normalizes it, changing the frozen version identity.
A prerelease cannot become `latest` through the promotion workflow.

The source implementation does not establish owner authentication, configured publishers, a passing hosted release graph, or public availability.
The first live journey needs these remaining decisions and observations:

| Control                 | Inspected before implementation                                  | Required cutover                                                                                                  |
| ----------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Actions default token   | Write                                                            | Read                                                                                                              |
| Actions PR approvals    | Enabled                                                          | Disabled                                                                                                          |
| Immutable releases      | Disabled                                                         | Enabled before any release is published                                                                           |
| Deployment environments | Absent                                                           | `npm-publication`, `github-archival`, `npm-promotion`, each restricted to exactly the `main` branch               |
| npm package identity    | Anonymous lookup unavailable; authenticated owner access unknown | Owner confirms package access, stages and 2FA                                                                     |
| Staging trust           | Unconfirmed                                                      | Exact repository, `stage-release.yml`, `npm-publication`; staging allowed, direct publishing and dist-tags denied |
| Promotion trust         | Unconfirmed                                                      | Exact repository, `promote-release.yml`, `npm-promotion`; direct publishing denied, dist-tags allowed             |

Retain the original settings and read back every applied change.
Readback on 2026-10-18 confirms Actions defaults are read-only with PR approvals disabled, immutable releases are enabled, and all three named release environments exist with exactly one `main` branch policy.
The table retains the historical pre-implementation observations; npm account, package and publisher cutover remain unverified.

The modernisation replaces direct-main development with a protected PR path and native `CI / acceptance` from the Actions App.
The sole maintainer retains the deliberate merge decision; no second required reviewer, separate reporting App, Actions dependency lockfile or preview lockfile is introduced.

Use the current native [npm trust interface](https://docs.npmjs.com/cli/v12/commands/npm-trust/) and read its actual flags before configuring connections.
The package must exist, the owner needs write access and 2FA, and a newly created connection has a limited first-use window.
The promotion connection's native ability to stage remains a residual capability even when direct publication is denied.

For a nonexistent package, npm staging creates a public `0.0.0-stage` placeholder.
Owner-session bootstrap, native rejection and OIDC re-staging need exact-version, exact-byte authorization and observed native support.
Do not create a dummy release, approve a local bootstrap and call it OIDC provenance, or infer package ownership from a 404.

The hosted staging command checks all three package identities before any effect and refuses incomplete bootstrap.
Each identity needs its own owner access and trusted-publisher connections.
See [npm staged publishing](https://docs.npmjs.com/staged-publishing/).

## Qualification and owner review

1. Commit the owner-selected version and settled implementation.
   Run local HISEW assurance on clean committed source.
   Keep the producer npm policy in `assets/node-support.json`; do not raise consumer floors to run publisher tools.
2. Dispatch `release-qualification.yml` on `main` with the exact committed version.
   One matrix is frozen once.
   Callable product CI runs producer checks and transports the same frozen release family through every Windows/Linux minimum, reference, and current-family lane.
   Root and isolated consumers retain native dependency validity, audit, lock, SBOM, location and behavioral evidence.
3. Wait for the complete run.
   Inspect the real provider job graph, both installed layouts, exact-source Actions, JavaScript/TypeScript, Python and platform-specific C/C++ CodeQL analyses, warnings and query identities.
   Nonzero findings, including low-severity dependency advisories, block admission.
   A current-main alert dismissal does not prove an older source analysis was clean.
4. Record the candidate manifest SHA-256.
   Independently review source, security, SemVer, shipment rights and retention.
   Create an owner-signed annotated tag `vVERSION` at the candidate source.
   Verify it and create the intended draft GitHub release; no personal signing key belongs in Actions.
5. Retain the exact `release-review.json` for dispatch.
   It is an external decision about the frozen manifest, never a commit that changes its own subject.

### Prepare the owner review

Decision records use schema version 1, `owner: "maksymshostak"`, exact `version`, `source`, `manifestSha256`, an ISO `acceptedAt`, and `phase`.
Review decisions are `semver`, `security`, `rights`, `retention`.

Each has `outcome: "accepted"`, a specific rationale of at least 20 characters, reviewer identity and nonempty HTTPS evidence entries with `url` and `sha256`.
Security requires `independent: true`.
Dispatch passes the SHA-256 of the exact decision bytes.

A newer controller requires explicit `controllerSource` and `controlDeltaSha256` in the review decision.
The native Git diff of `scripts`, `.github`, `assets`, `schemas`, `package.json` and `package-lock.json`, between the original source and controller, must match.
Original tarball/source qualification and publisher provenance retain their original identities.

## Stage and approve

Dispatch `stage-release.yml` with `qualification_run`, `qualification_attempt`, `manifest_sha`, `review_sha`, and the exact decision text in `review_json`.
Start staging within 30 days of qualification, while the producer archive, recipient reports and security evidence remain available.
Expired qualification inputs require fresh qualification; a green historical run cannot replace their bytes.

The read-only admission job does not need access to a private draft decision.
Admission independently reads the completed native run, every job, artifact digest, expected recipient lane and previous writer attempt.
Missing, duplicate, skipped, expired or substituted inputs stop the workflow.
The final staging job consumes the native admission artifact ID, digest and receipt hash under `npm-publication`; it is the only staging job with npm OIDC authority.

Each exact tarball is passed to `npm stage publish` with lifecycle scripts disabled, public access, the owner-reviewed npm tag (`pilot` by default), and provenance.
A durable request intent precedes each one-shot native request.
The default `stage_phase: natives` requests only the two companions.
After owner approval, a new `stage_phase: core` dispatch supplies `native_stage_run` and `native_stage_attempt` from that original native run.
Its read-only Windows/Linux jobs verify anonymous exact bytes, npm signatures/provenance and an actual native operation.
Only both successful, attempt-bound proofs admit the core request.
The resulting context retains one original producing run/attempt/controller/integrity/stage ID per package.
Success is `staged-awaiting-owner`; it is not public availability.
The effect artifact retains the manifest, source, evidence, native response, original journal and stage identity.

The owner uses interactive npm authentication and 2FA to inspect the exact stage, download and compare bytes/integrity, and approve that specific item.
Stage list, view, approval and rejection cannot be impersonated by CI's OIDC token.
Never poll indefinitely for a person or automatically reject a staged item.

### Writer startup and prior attempts

The rc.3 OwlAPI publication exposed a startup failure before the publisher's error handler loaded, followed by a recovery job trying to read a draft with a read-only token.
JSON Quality keeps these boundaries explicit:

- Read-only admission and qualification jobs install the frozen producer dependencies.
  Privileged writers use `setup-writer` with pinned Node/npm/Python and no project dependency installation; their raw artifact ZIP upload uses native Actions transport and exact readback reconciliation.
  The workflow checker rejects missing or conditional setup, later runtime replacement, incorrect draft permissions and lost failure uploads.
  Producer npm commands, archive packing and signature verification retain the paired producer Node executable even inside consumer lanes.
  The frozen manifest records that producer's actual Node and npm versions; a partial retained identity refuses execution.
- Stage, archive and promotion workflows enter through `scripts/release-command.js`.
  Its startup records load without installed npm packages.
  An import failure preserves the original failure and seals a `no-request` marker for the same manifest/controller/run/attempt.
  Existing request bytes or a changed manifest refuse that marker; an unknown outcome still requires reconciliation.
- Draft reads stay in the GitHub writer under its protected environment.
  Read-only admission uses the exact dispatched owner decision and native qualification artifacts.
  A draft hidden from a read-only token is not evidence that it was deleted or is safe to recreate.

The frozen package's source and signed tag retain their qualification identity when a separately reviewed controller is repaired.
Do not move the tag, repack the version or repeat an unknown write to recover a failed controller.
Keep the original failed run and reuse only its still-valid scoped evidence.

A later workflow attempt may be the writer's first execution after an upstream failure.
Admission inspects authenticated attempt-specific job and effect-step histories instead of treating the attempt number as publication authority.
Explicitly skipped writes permit a first execution; missing, duplicate, unresolved or inconsistent native observations do not prove absence.

Staging, archival and both promotion services resolve retained jobs to their original runner execution and compare the retained effect step before reusing its original journal.
Changed attempt/job labels never require an artifact from a writer that did not run again, and never erase a prior unknown outcome or authorize replay.

OwlAPI's scanner-observation refresh and bundled artifact-action lock binding have no equivalent generated inputs here.
This pipeline uses its native package and audit records rather than introducing those additional release gates.

## Public recipients and immutable archival

After approval, dispatch `release-registry.yml` with the original staging `previous_run` and `previous_attempt`, `manifest_sha`, and `review_sha`.
It performs fresh anonymous exact-version downloads and registry installations.
Both layouts on every frozen lane reuse the installed public API/CLI/plugin/schema probes, payload checks and offline reinstall. Modern native npm verifies signatures and provenance against the original staging workflow/controller/run/attempt while consumer behavior executes on the selected consumer runtime.

The original stage request journal remains byte-for-byte unchanged.
A distinct public reconciliation and index record closes the continuation.
Only a later reader may admit this run as completed; a terminal job never certifies its own still-running native provider graph.

Attach `release-acceptance.json` to the draft with phase `pilot`, decision names `consumer`, `pilot`, `restoration`, the original `reviewSha256`, and exact `registryRun` and `registryAttempt` strings.
Each decision retains the evidence and rationale described above.
Consumer acceptance concerns this package's exact public pilot; there are no copied downstream repository-specific keys.

The pilot decision also carries `immutableReleases`: an owner-collected native settings response in `responseJson`, its `evidence.sha256`, the exact `evidence.url` (`https://api.github.com/repos/Hadden-Industries/json-quality/immutable-releases`), and `checkedAt`.
The response must report `enabled: true` and be at most one hour old at publication.
The owner reads this Administration setting with their own authorized account; the workflow token has no Administration permission.

### Publish the immutable GitHub release

Dispatch `github-release.yml` with that completed registry predecessor, the manifest/review digests, and `acceptance_sha`.
The archival environment has GitHub write authority and no npm OIDC.
It verifies the signed tag, complete draft assets, downloaded bytes and the digest-bound owner settings evidence before publication.
It resolves drafts through the complete draft-capable release list and pins their native release ID.

Actual immutability is verified after publication.
It archives the tarball, manifest, public and candidate evidence, original staging journal, complete corresponding source archive, license and notices.
Every native asset and release attestation is verified after publication.

For prereleases, verify the owner-selected npm tag on all three packages and retain the GitHub prerelease marker; do not invoke stable promotion.
An explicitly reviewed npm `latest` release candidate remains a GitHub prerelease and does not become GitHub's latest stable release.

## Promotion and restoration

Dispatch `promote-release.yml` with an exact schema-2 `operation_json` and its `operation_sha`, plus the original manifest/review/acceptance digests.
The operation binds owner, source/version/manifest, original review, current `controllerSource` and control delta, immutable `sourceReleaseId`, accepted time/rationale, qualified `targets` (version/manifest digest/release ID) and `family`.

The family uses `schemaVersion: 2` and `operation`: `promote`, `align`, `restore`, `scoped-restore` or `emergency-core-restore`.
Every package subject supplies `package`, `selected`, exact `prior` and `target` (explicit null for absence), and the target `integrity`.
Excluded subjects keep prior=target.
Removal requires `removalApproved: true`; an already-current selected target requires `noOpApproved: true`.
GitHub supplies selected, prior/target release markers (ID/tag/prerelease), the selected target's `targetPrior` classification, and excluded release `guards` where applicable.
The operation ID is the SHA-256 of the exact decision bytes, never a caller-generated family field.

Ordinary stable promotion/restoration moves Windows, Linux, core, then GitHub to one qualified stable family. Alignment requires core and GitHub already at the selected stable release and changes only the companions. For the historical 1.0.0 split, select release ID 437217191, core/GitHub 1.0.0 and companion preimages 1.0.0-rc.2.
This implementation does not execute that public alignment.

Read-only admission verifies original public qualification, immutable assets, owner-signed tags and exact public tarballs, then refreshes exact-source CodeQL and retained-lock audits.
The npm writer checks every preimage at each effect boundary and preserves one journaled request per changed package; the GitHub writer requires the authenticated npm continuation, rechecks all three labels, and clears prerelease/sets latest on the same immutable target ID.
Approved no-ops retain a readback journal and issue zero requests.

A scoped restore selects only labels established by the original operation and owner settlement; all excluded labels and GitHub markers remain guards.
Unknown requests must be settled before a new operation can approve current-target no-ops.
A GitHub-only continuation is a fresh reviewed operation with npm targets explicitly approved as no-ops.
A later GitHub failure remains a partial outcome.

The following schema-1 restoration fields describe the retained historical core-only reader.
New operations express the emergency core-only scope through the schema-2 family and guard both companions and affected/target GitHub releases.

### Restore an earlier version

Restoration additionally requires an owner-reviewed `release-restoration.json`, its exact text in `restoration_json`, its `restoration_sha`, and exact `restore_version`.
The dispatch decision is admitted into the evidence bundle; it is not fetched from or added to the already immutable affected release.
Its phase is `restoration`; it binds the affected manifest, target version/integrity, previous labels and qualification evidence.

Only an already qualified immutable target is eligible.
Removing a first release's `latest` is a distinct owner decision; the normal restoration path does not silently convert prior absence into a removal.

For an explicitly approved npm-only restoration, the restoration decision adds these fields to the usual target version/integrity/manifest and evidence bindings:

```json
{"availability":"npm-only","expectedGithubLatest":null,"affectedPrerelease":true,"targetPrerelease":true}
```

This mode changes the core package's npm default; its exact optional dependencies select the target's matching native family.
The recorded GitHub latest value, affected and target release identities, and both prerelease markers stay unchanged and are checked before and after the native npm effect.
The mode admits a separately qualified immutable release candidate as the target.

Interrupted npm-only effects require matching owner recovery scope and original journal guard values; an observed completed npm mutation is not repeated.
Stable npm/GitHub promotion retains its separate decision and guard path, including releases whose original owner review selected npm `latest` directly.

Restoration reads both historical flat evidence and the current ZIP layout through one version-aware reader, verifying outer assets and every indexed member before using the original context and recipient locks.

Dist-tag restoration cannot undo downloads.
Published npm versions cannot be replaced.
Immutable assets and tags are retained; corrections use a new identity.

## Failure, recovery and evidence

All mutating workflows share `json-quality-release-mutation` with cancellation disabled.
Native run history still inspects every attempt of every writer; concurrency alone is not an effect ledger.
Request journals are append-only and flush intent before each effect.
`outcome-unknown`, an absent journal or truncated history blocks another effect when the original request may concern the candidate version or shared labels.
Active producers always block globally.

Version scoping uses complete original package/version/source/manifest identities from authenticated request journals, bound to their native writer execution.
Historical archival requests keep their original scope.
A pending stage decision survives dispatch completion: before another version advances, its original approvals must be settled by complete public qualification or explicit owner supersession.
Unknown shared-label effects remain globally blocking.

Promotion uncertainty remains global because npm and GitHub `latest` labels are shared across versions.
Do not rerun a failed stage or assume a missing receipt means no request reached the service.

Read existing logs and native state first.
Retain the exact original journal, request/response, candidate digest and provider attempt. The owner resolves an uncertain effect against the native stage/public version, draft/immutable asset or label state before explicitly authorizing its continuation.
Preserve the original records and any already completed effect; never edit evidence to turn failure into success or automatically overwrite a newer legitimate promotion.

### Reconcile a stage or label request

The optional `recovery_json` dispatch input contains `schemaVersion: 1`, owner, exact manifest/version, originating `phase`, `run`, `attempt`, original `journalSha256`, `acceptedAt` and a specific `rationale`.
Stage continuation names exactly the attempted stages in `stages`, each with `package` and `stageId`.
Core-only recovery preserves the original native outcome and journal while settling the original core request.
Family label recovery additionally selects `service` and the original `operationId`; it retains original operation bytes, receipt, qualified targets and journals.

Every stage effect records its actual package identity, integrity and independent response before the next package is attempted.
Platforms stage before core; all three owner approvals precede registry qualification.
An incomplete family cannot be reported as a successful release or automatically completed by replaying requests.

#### Abandon a partially staged family

If an early stage loses its response, the owner can explicitly choose `disposition: "abandon-family"` and name exactly the attempted stages.
Readback must independently observe their matching public versions and integrity; an unapproved unknown stage remains blocked.
The abandoned family supplies no registry admission or new stage request.

To record that explicit abandonment while advancing a separately qualified new version, pass the old family's original manifest, run, journal digest and abandonment decision in `recovery_json`.
Admission acquires and retains the old subject and journals separately, settles only observed effects, and preserves the new candidate identity.

The original version cannot advance or be staged again.
For the new staging controller, a different version cannot hide outstanding approvals.
Explicit `supersede` settlement binds the original review and journal.
Public members require native provenance verification; rejected members require native rejection acknowledgement and authenticated full stage-list absence retained under an owner-signed history checkpoint.
A late retry of the old candidate requires a fresh continuation review of current defaults.

#### Repair a GitHub label after npm succeeds

If npm has already reached the target but a GitHub label request is unknown, the owner may explicitly select `githubAction: "repair-current-label"` and `expectedGithubLatest` (including null).
Fresh native readback must observe the exact prior GitHub label and npm target.
This authorizes only a separate guarded GitHub label repair; it neither certifies the old request absent nor replays npm.

Only the owner may dispatch or re-run these workflows.
Native readback must actually observe the matching public package, complete immutable assets, or already-applied label.
Public registry qualification still verifies original publisher provenance.

The single `recovery-records.json` index retains each original phase/run/attempt decision, refuses replacement, and carries prior journals forward for successive partial continuations.
Legacy per-phase recovery records remain readable.
The recovery records preserve the original request journals.

Already-observed label effects are skipped, rather than repeated.
An unapproved unknown stage, incomplete draft, absent durable request or unobserved label effect stays blocked for an explicit owner-operated native reconciliation; this interface cannot certify absence of a remote effect.

An unknown asset upload while the release remains a draft still requires explicit owner-operated native reconciliation.
Published immutable recovery, rejected-stage supersession and expired-provider target qualification use their distinct evidence contracts below.

No recovery route authorizes forced publication or replay of an ambiguous request.
A 404 or an apparently correct label alone never settles an original effect.

`expected_labels` always describes the original pre-effect labels, including restoration.
Reconciliation reads the original intent's `before` value instead of relabelling the already-applied npm target as its prior state.

### Recover a split promotion

Promotion uses separate `npm` and `github` jobs followed by read-only `complete` admission.
The npm job uses `npm-promotion`, OIDC and repository read permission; it cannot mutate GitHub releases.
The GitHub job uses `github-release` and repository write permission with no npm OIDC or long-lived npm token; its entry point cannot mutate npm.

The obsolete combined promotion dispatcher is no longer executable.
Both service jobs retain failure/unknown journals for 90 days under `effect-promote-npm-ATTEMPT` and `effect-promote-github-ATTEMPT`.

Their journals are `promote-SERVICE-RUN-ATTEMPT.jsonl`, with schema-2 service-specific intents and the original prior-label guards.
No-request markers and recovery/checkpoint uniqueness include the service.
Historical combined journals remain immutable and readable for their original audit/recovery purpose.

The sealed npm continuation binds source/controller, manifest and owner decision digests, scope, version/integrity, original run/attempt, journal bytes, prior labels and native readback.
The next job authenticates its artifact ID/digest/size/source and original successful npm job before fresh admission and effect-time guards.

`npm-complete` means the npm effect is settled while GitHub may remain pending; only read-only completion can report the selected scope completed.
Npm-only restoration skips the GitHub writer and its protected environment entirely, admits an explicitly qualified immutable prerelease target, and verifies unchanged GitHub identity/markers using reads.
Dual-service completion requires the authenticated GitHub writer and independently rechecks both labels.

Split recovery retains `phase: "promote"` and adds explicit `service: "npm"` or `"github"`, matching `availability`, and the exact original service journal digest.
Admission acquires the matching original service artifact independently of its archival predecessor.
Original prior labels remain in the service journal's guard, including when only GitHub needs repair.

After owner-selected native reconciliation, a fresh npm readback can produce a continuation without replaying npm; only the authorized missing GitHub operation proceeds.
An unknown outcome still requires owner reconciliation, never automatic retry.

### Verify live controls before activation

Before activating this source, read current rulesets/action policy, default CodeQL setup, active release attempts and all existing environment/publisher bindings.
The concrete new environment is `github-release`, restricted to exactly `main`, with protection/reviewer policy chosen consistently with the existing release environments.

Read back that environment and confirm `promote-release.yml`/`npm-promotion` still permits only the intended npm dist-tag path; keep direct publication forbidden.
Do not broaden the promotion scope to native package tags.
No environment, publisher, workflow run, package or live label is changed by the local implementation task.

Hosted extraction, process observation on both runner platforms, publisher/settings readback and live mutation behavior remain separate activation/release checks after source publication is authorized.

### Retain and renew signed writer history

Every release-effect admission requires an owner-admitted signed history baseline, including an explicitly empty first baseline.
Before the 90-day Actions retention window expires, export complete writer history with `node scripts/release-provider.js history OUTPUT SCRATCH [PRIOR_CHECKPOINT_JSON]`.

Keep `OUTPUT` as `release-history.json` in an owner-controlled commit, and create an owner-signed annotated tag named `release-history-IDENTIFIER` for that commit.
This is a separate owner-operated retention action; the exporter performs reads only and preserves unresolved outcomes without certifying them.

A renewed version-2 export retains original provider run/job inventories, journals, no-request markers and settlements, including failed or unresolved attempts.
It unions the prior checkpoint with native enumeration so expired or deleted runs cannot disappear from admission history.
Version-1 checkpoints remain usable while their provider runs are still available; they cannot reconstruct missing provider inventories.

The current digest-bound `release-review.json` must explicitly admit the reference:

```json
{"historyCheckpoint":{"tag":"release-history-20261018","tagSha":"<exact annotated-tag SHA>","sha256":"<release-history.json SHA256>"}}
```

Admission verifies the signed tag and exact file bytes, enumerates every available native writer/run/attempt/job, and retains checkpoint-only original attempts after provider expiry.
For a different-version staging or archival subject, the existing version-2 checkpoint can supply its original journal and provider inventory before artifact acquisition.

Its controller, attempt, native execution and effect step must match fresh provider observations where those observations remain available.
Only the collector's live binding of those original bytes can authorize omission from candidate-specific outcome checks; serialized version fields, run names and the controller checkout version supply no authority.

Matching or unclassifiable subjects still require the original full records and any necessary reconciliation; legacy checkpoints without original provider inventory cannot authorize version omission.
Promotion requests retain their shared-label checks for every version.

Unscoped history export continues retaining every original journal, including unrelated, malformed and unresolved evidence, without rewriting outcomes or dropping expired provider inventories.
Missing attempts, changed controllers and unclassifiable effects remain blockers.
Readback uses bounded native raw contents transport, including checkpoints larger than 1 MB.

Retain or renew checkpoints while their original artifacts remain available; missing original bytes cannot be reconstructed from a green run or public state.

Completed native writer continuations retain their exact owner recovery records alongside the original journals.
Checkpoint renewal preserves those settlements; later versions accept them only with a fresh successful complete continuation graph and matching original journal/run/attempt/manifest/version.
Failed or incomplete continuations cannot settle historical unknown effects.

### Independent completion and durable recovery

`verify-release-completion.yml` accepts the original operation run/attempt with read-only credentials. It re-acquires the original admission and writer artifacts, authenticates them before label observation, verifies every selected target's signed tag/immutable release ID/assets, and polls approved prior-to-target transitions under one five-minute deadline. Provider rate-limit/reset hints and native subprocess timeouts share that budget.
Third values, unexpected release IDs, malformed evidence and permission failures stop immediately.

An original request with a lost acknowledgement reports `writer-outcome-unresolved`.
An acknowledged complete request scope may be observed independently after a failed writer readback.
Pending propagation reports `completion-unconfirmed`, last confirmed provider states and the earliest useful hinted retry time.
Rerunning this observer issues zero mutations.
A failed public matrix retains `public-qualification-incomplete` with observed defaults and original approval identities; GitHub stable classification remains held.

`prepare-release-history.yml` prepares a complete schema-2 checkpoint after archive/availability completion, preserving native writer history plus `qualifiedTargetRefs` and individually bounded `release-targets/<manifest-sha256>.json` files: original public provider inventories/artifact IDs/digests/attempts, exact retained locks/signatures/security/results, manifest, signed tag and immutable assets.
Commit the index and the complete `release-targets` directory together.
Each descriptor binds the target identity, size and SHA-256; recovery fetches only the selected file from that exact signed commit.
Legacy inline `qualifiedTargets` remain readable.
Sign the exact output under a fresh `release-history-*` tag before the reported expiry deadline.
Prepared bytes are not recovery-eligible until owner signed.
Renewed checkpoints retain richer archive continuations.
A writer-only schema-1 checkpoint cannot qualify an expired public target.

For rejected pending stages, the separately invoked local command `node scripts/reject-release-stages.js ORIGINAL_DIRECTORY DECISION_JSON OUTPUT_HISTORY_JSON` performs explicitly selected one-shot npm rejections with the owner’s authenticated npm session and a fresh numeric `NPM_CONFIG_OTP` (six to eight digits).
The captured-output subprocess cannot prompt; obtain the OTP locally and supply it through the environment.
The helper neither records it nor passes it as an argument.
`npm run reject:release-stages -- ORIGINAL_DIRECTORY DECISION_JSON OUTPUT_HISTORY_JSON` is the equivalent package command.
The decision selects `action: reject-original-stages`, owner, original run/attempt/manifest/journal digest, exact package/stage IDs and an existing signed `historyCheckpoint`.
It first verifies native stage identity and tarball SHA-1, flushes intent, records native acknowledgement and authenticated full stage-list absence, then prepares history containing `stageCancellations`.
Unknown rejection results stop.
A retained acknowledgement followed by a failed inventory read resumes only that read; it never repeats DELETE.
The selected stages may be a pending subset of the original family.
Sign that exact output under a fresh history tag; a supersession decision references it as `cancellationCheckpoint` and marks each rejected stage `settlement: rejected`.
This task does not invoke rejection or change live state.

### Diagnose a failed qualification

Execution budgets are shared by purpose: install/ci has twenty minutes, a Node suite thirty minutes, hosted qualification jobs two hours, bounded evidence reads two minutes, collection fifteen minutes and registry availability thirty minutes.
The JSON check has ten minutes inside a fifteen-minute step; uploads share four minutes inside a five-minute step.

`scripts/qualification-budgets.js` owns these profiles and `scripts/qualification-process.js` re-exports them for native command callers; product resource limits and deliberate timeout tests retain their separate contracts.
Local HISEW supervision uses its registered profile.
Structured phase diagnostics include successful timings and native failure output without environment/credential dumps.

For diagnosis, inspect native job logs and reproduce the affected frozen runtime lane with `scripts/qualify-runtime.js` and its documented archive/environment inputs.
Inspect existing runs, form a specific hypothesis, and select a bounded experiment before dispatch.
An isolated diagnostic run cannot satisfy release admission.
Do not repeatedly launch a full matrix until a failure disappears.

### Artifact retention

Hosted retention follows the artifact's purpose:

- Same-run lane receipts and producer transport without PR reuse: 1 day.
- Read-only release writer admission bundles: 90 days, matching the original effect journals.
- Compact PR proof, its required producer transport, release qualification inputs and native payloads: 30 days.
- Final effect journals and public-registry evidence bundles: 90 days.

Ordinary test/npm output and failure diagnostics remain native Actions logs, with no uploaded log copies.
The shared JSON workflow streams NDJSON into the job log and creates no report artifact.

GitHub's repository retention setting governs logs and provider records together; it does not provide a separate per-workflow log-retention control.
The repository default remains 90 days to preserve one-shot recovery records; the named artifact classes use shorter explicit retention.
Same-run transfer expiration also bounds any environment approval wait; if approval exceeds that window, dispatch fresh admission.

Disposable dependency installs, validator executables, caches and fixture directories stay outside uploads.
Release archives retain the evidence that must survive hosted expiration.

### Verify the archived assets

GitHub archival publishes exactly ten uploaded assets for the three-package family: the three npm tarballs, corresponding source archive, release manifest, owner review, owner acceptance, third-party notices, `release-assets.json` and `release-evidence.zip`.

The ZIP preserves the original proof paths and a manifest-bound `evidence-index.json` containing every retained member's size and SHA-256.
`release-assets.json` binds the ZIP digest and repeats its member index so downloaded proof can be independently checked without one asset per evidence file.

The bundle includes build attestations, native verification results, provider records, inventories and request journals; standalone package/source archives are not duplicated inside it.
Disposable source installs, npm caches and the SBOM validator use a separate temporary workspace and never enter the retained producer directory.

Binary evidence collection uses the shared fifteen-minute collection budget; standalone metadata reads retain their shared two-minute budget, with both using bounded retries and remaining-time redirect handling.
An Actions download shares one total deadline across network/readback and extraction, reserving the pack budget for extraction rather than restarting a full collection window.

Native GitHub release uploads use the existing four-minute upload profile; release and validator downloads use the collection profile.
Mutating native requests remain one-shot.

### Wait for attestation and registry visibility

Immutable release-attestation indexing can lag publication.
Before native release verification or asset verification, a shared read-only worker observes the exact signed tag's attestation inventory inside one two-minute read deadline, with the existing request/byte limits and thirty-second observation cadence.
A typed missing or empty inventory permits waiting only after a positive read of the frozen manifest's build-attestation inventory under the same token and repository; this control is repeated for every pending observation.

The worker rechecks the pinned release ID, signed tag/source, immutable/draft/prerelease state and exact asset identities throughout the wait.
Authorization and schema failures remain terminal, while the shared reader retains its classified transport/rate-limit handling.

Native cryptographic verification runs once after readiness; its errors are never used as retry authority because the CLI can report several underlying lookup failures as missing attestations.
Normal archival and read-only reconciliation share this gate, with release verification preceding the asset-verification fan-out.

Anonymous registry availability observation retries exact approved coordinates on 404, transient status and transport failures with backoff inside one shared thirty-minute deadline and bounded cumulative bytes.
Metadata, integrity and provenance admission failures remain immediate failures.
Small offline dependency-graph contracts run under the actual consumer npm in ordinary runtime lanes as well as the producer, including development/optional overlap and conservation of required shared dependencies.

The archival workflow creates GitHub build attestations for all three tarballs and the release manifest, then uses native `gh attestation verify` against the exact repository, signer workflow, controller digest and subject bytes.
The bundle and native verification results accompany the immutable release assets.
Read-only recovery of an already archived release does not create another attestation.

Native npm SBOMs keep their emitted schema version; source production inventories come from a clean production-only manifest against the unchanged source lock.
Every installed location and graph edge is retained separately so native component coalescing cannot hide a difference.
Only the exact native file distribution URI can receive a recorded representation repair; original SBOM bytes and native validation are retained.

## Historical version decisions

The earlier release plan recorded a 1.0.0 selection on 2026-10-18.
The accepted oversized-value plan replaces conflicting APIs and requires a complete consumer cohort.
On 24 October, the owner selected `1.0.0-rc.1`, limited registry migration to JSON Quality, and left Markdown Quality distribution unchanged.

That historical selection is superseded for the next release by the current manifest; published versions and their records retain their original identities.
Consumer installation requires an exact registry version and its npm-generated lockfile; the Git-source installation promise is retired because a source commit does not identify one cross-host packed archive.

Implementation verification follows its task's accepted review and testing scope, with formatting/linting before broad review and focused repair checks afterward.
Source versioning, focused checks and static reviews do not establish release qualification or acceptance.

Implementation, local assurance, source delivery, remote configuration, complete hosted qualification, public release, immutable archival, promotion and owner operational acceptance are separate reported states.
See the [accepted implementation plan](https://github.com/Hadden-Industries/json-quality/blob/main/docs/plans/2026-10-18-release-publishing-assurance-implementation-plan.md) for the complete acceptance and recovery gates.

### Resume acknowledged availability observation

A writer flushes a digest-bound native acknowledgement sidecar immediately after a successful provider mutation returns, before propagation readback.
An independent completion dispatch authenticates the original admission, native service artifacts, original job attempts and exact request journal before reading labels.
Acknowledged complete request scopes may be observed after a failed readback with zero mutations.
`completion-unconfirmed` retains the last confirmed state and retry hint; a later observer uses the same original operation.
A lost response without native acknowledgement remains `writer-outcome-unresolved`; a partially issued family remains `writer-operation-incomplete`.
If npm completed while the selected GitHub job was skipped, observation reports `npm-complete-github-pending` and never invokes GitHub writes.
A completed observation does not rewrite the failed original job or authorize a subsequent write.

Scoped restoration binds `originalEffect` to the exact phase, service, run, attempt, manifest, original journal and operation identity.
Only selected labels that the authenticated original effect changed can be restored to their original preimages, including explicitly approved removal.
A pre-core stage may be restored without inventing an archive; excluded package labels and release identities remain guarded.
Unknown GitHub classification requires either observed application or an explicit owner conditional-repair decision binding the current latest and target classification; observation alone cannot create repair authority.

A new checkpoint index also carries compact settled-stage summaries derived only from the qualified target’s actual native and core publication origins.
Ordinary admission verifies the exact original journal digest and subject identities from that signed index, without downloading every historical target shard.
Old inline checkpoints remain readable through their complete proof.
Signed writer entries retain exact original availability-operation bytes, journals, acknowledgements and original native inventories; a scoped restore can recover that custody independently of the source’s immutable archive origin after Actions expiry.
Large admission and audit reports stay outside the writer-history index.
