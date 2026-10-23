# Deliberate releases

The release interface is five manually dispatched GitHub Actions workflows in `Hadden-Industries/json-quality`.
Ordinary product CI stays manual.
Automatic CodeQL remains independent.
A source push, dependency update, or tag cannot stage or publish a package.

The package has one designated tarball.
Its local `.provenance.json` records byte identity; authenticated registry provenance comes from native npm verification.
The current oversized-value source candidate uses package version 2.0.0 and configuration/event/native cohort 2.
Public API/schema exports, executable artifacts, CLI entrypoints and consumer Node floors remain separate compatibility contracts.

The earlier release plan recorded a 1.0.0 selection on 2026-10-18.
The later accepted oversized-value plan replaces conflicting APIs and requires a new complete consumer cohort; that older selection does not authorize publishing the 2.0.0 candidate.
Current implementation verification follows its task's explicit ordering: consolidate the candidate, resolve external review findings, then perform final security/full verification.
Source versioning, focused checks and static reviews do not establish release qualification or acceptance.

No artificial prerelease is required to warm npm or GitHub.
Use the exact separately accepted version initially under the existing `pilot` availability tag, qualify real registry recipients, and promote only after acceptance.
Create the GitHub release as a draft, attach and verify every asset, then publish immutably through the existing archival workflow.
Its pilot/prerelease marker can later change during promotion without replacing locked assets or tags.
For a new npm package identity, native staging may create the public `0.0.0-stage` placeholder; owner bootstrap and 2FA still precede trusted-publisher setup.
That bootstrap is a separate explicit effect, not a dummy package or test release silently performed by this change.
See [npm staged publishing](https://docs.npmjs.com/staged-publishing/) and [GitHub immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases).

## Before first use

Select the exact version and compatibility intent with the owner.
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
Preserve the sole-maintainer direct-main model.
No mandatory PR, second maintainer, Actions dependency lockfile, or preview lockfile policy is introduced.

Use the current native [npm trust interface](https://docs.npmjs.com/cli/v12/commands/npm-trust/) and read its actual flags before configuring connections.
The package must exist, the owner needs write access and 2FA, and a newly created connection has a limited first-use window.
The promotion connection's native ability to stage remains a residual capability even when direct publication is denied.

For a nonexistent package, npm staging creates a public `0.0.0-stage` placeholder.
Owner-session bootstrap, native rejection and OIDC re-staging need exact-version, exact-byte authorization and observed native support.
Do not create a dummy release, approve a local bootstrap and call it OIDC provenance, or infer package ownership from a 404.
The hosted staging command refuses incomplete bootstrap.
See [npm staged publishing](https://docs.npmjs.com/staged-publishing/).

## Qualification and owner review

1. Commit the owner-selected version and settled implementation.
   Run local HISEW assurance on clean committed source.
   Keep the producer npm policy in `assets/node-support.json`; do not raise consumer floors to run publisher tools.
2. Dispatch `release-qualification.yml` on `main` with the exact committed version.
   One matrix is frozen once.
   Callable product CI runs producer checks and transports the same tarball through every Windows/Linux minimum, reference, and current-family lane.
   Root and isolated consumers retain native dependency validity, audit, lock, SBOM, location and behavioral evidence.
3. Wait for the complete run.
   Inspect the real provider job graph, all reports, exact-source Actions and JavaScript/TypeScript CodeQL analyses, warnings and query identities.
   Nonzero findings, including low-severity dependency advisories, block admission.
   A current-main alert dismissal does not prove an older source analysis was clean.
4. Record the candidate manifest SHA-256.
   Independently review source, security, SemVer, shipment rights and retention.
   Create an owner-signed annotated tag `vVERSION` at the candidate source.
   Verify it and create the intended draft GitHub release; no personal signing key belongs in Actions.
5. Retain the exact `release-review.json` for dispatch.
   It is an external decision about the frozen manifest, never a commit that changes its own subject.

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
The read-only admission job does not need access to a private draft decision.
Admission independently reads the completed native run, every job, artifact digest, expected recipient lane and previous writer attempt.
Missing, duplicate, skipped, expired or substituted inputs stop the workflow.
The final staging job repeats admission under `npm-publication` and is the only staging job with npm OIDC authority.

The exact tarball is passed to `npm stage publish` with lifecycle scripts disabled, public access, explicit `pilot`, and provenance.
A durable request intent precedes the single native request.
Success is `staged-awaiting-owner`; it is not public availability.
The effect artifact retains the manifest, source, evidence, native response, original journal and stage identity.

The owner uses interactive npm authentication and 2FA to inspect the exact stage, download and compare bytes/integrity, and approve that specific item.
Stage list, view, approval and rejection cannot be impersonated by CI's OIDC token.
Never poll indefinitely for a person or automatically reject a staged item.

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

Dispatch `github-release.yml` with that completed registry predecessor, the manifest/review digests, and `acceptance_sha`.
The archival environment has GitHub write authority and no npm OIDC.
It verifies the signed tag, complete draft assets, downloaded bytes and the digest-bound owner settings evidence before publication.
It resolves drafts through the complete draft-capable release list and pins their native release ID.
Actual immutability is verified after publication.
It archives the tarball, manifest, public and candidate evidence, original staging journal, complete corresponding source archive, license and notices.
Every native asset and release attestation is verified after publication.

For prereleases, retain explicit pilot/prerelease availability and the correct GitHub prerelease/latest markers; do not invoke stable promotion.

## Promotion and restoration

Dispatch `promote-release.yml` against the completed archival predecessor with the exact manifest/review/acceptance digests and `expected_labels`, for example:

```json
{"latest":null,"githubLatest":null}
```

Absence is explicit.
Existing values are exact npm versions and GitHub tags such as `v0.1.0`.
Both services are read before the effect and immediately before their own changes.
Changed prior labels block the operation.
Exact-source CodeQL and the retained recipient locks receive fresh native security assessment before promotion.
Independent promotion OIDC permits dist-tags with direct publish denied.
A later GitHub error after npm success remains a partial outcome.

Restoration additionally requires an owner-reviewed `release-restoration.json`, its exact text in `restoration_json`, its `restoration_sha`, and exact `restore_version`.
The dispatch decision is admitted into the evidence bundle; it is not fetched from or added to the already immutable affected release.
Its phase is `restoration`; it binds the affected manifest, target version/integrity, previous labels and qualification evidence.
Only an already qualified immutable target is eligible.
Removing a first release's `latest` is a distinct owner decision; the normal restoration path does not silently convert prior absence into a removal.

Dist-tag restoration cannot undo downloads.
Published npm versions cannot be replaced.
Immutable assets and tags are retained; corrections use a new identity.

## Failure, recovery and evidence

All mutating workflows share `json-quality-release-mutation` with cancellation disabled.
Native run history still inspects every attempt of every writer; concurrency alone is not an effect ledger.
Request journals are append-only and flush intent before each effect.
`outcome-unknown`, an absent journal, truncated history or an active producer blocks another effect.
Do not rerun a failed stage or assume a missing receipt means no request reached the service.

Read existing logs and native state first.
Retain the exact original journal, request/response, candidate digest and provider attempt. The owner resolves an uncertain effect against the native stage/public version, draft/immutable asset or label state before explicitly authorizing its continuation.
Preserve the original records and any already completed effect; never edit evidence to turn failure into success or automatically overwrite a newer legitimate promotion.

The optional `recovery_json` dispatch input contains `schemaVersion: 1`, owner, exact manifest/version, originating `phase`, `run`, `attempt`, original `journalSha256`, `acceptedAt` and a specific `rationale`.
Stage continuation also names the owner-inspected `stageId`; label reconciliation names `targetVersion`.
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
`expected_labels` always describes the original pre-effect labels, including restoration.
Reconciliation reads the original intent's `before` value instead of relabelling the already-applied npm target as its prior state.

Promotion recovery acquires the selected original promotion journal from its verified `effect-promote-ATTEMPT` artifact before reconciliation, preserving the archival predecessor and original journal bytes.

Before the 90-day Actions retention window expires, export complete writer history with `node scripts/release-provider.js history OUTPUT SCRATCH [PRIOR_CHECKPOINT_JSON]`.
Keep `OUTPUT` as `release-history.json` in an owner-controlled commit, and create an owner-signed annotated tag named `release-history-IDENTIFIER` for that commit.
This is a separate owner-operated retention action; the exporter performs reads only and preserves unresolved outcomes without certifying them.
A renewed export uses the previous checkpoint reference to read expired original artifacts.
The current digest-bound `release-review.json` must explicitly admit the reference:

```json
{"historyCheckpoint":{"tag":"release-history-20261018","tagSha":"<exact annotated-tag SHA>","sha256":"<release-history.json SHA256>"}}
```

Admission verifies the signed tag and exact file bytes, still enumerates every native writer/run/attempt/job, and uses only a matching original journal or no-request marker when its Actions artifact is missing or expired.
Missing attempts, changed controllers and unknown effects remain blockers.
Readback uses bounded native raw contents transport, including checkpoints larger than 1 MB.
Retain or renew checkpoints while their original artifacts remain available; missing original bytes cannot be reconstructed from a green run or public state.
Completed native writer continuations retain their exact owner recovery records alongside the original journals.
Checkpoint renewal preserves those settlements; later versions accept them only with a fresh successful complete continuation graph and matching original journal/run/attempt/manifest/version.
Failed or incomplete continuations cannot settle historical unknown effects.

Execution budgets are distinct: each install/ci has five minutes, a Node suite has thirty minutes, hosted qualification jobs have forty-five minutes, and fast identity/read operations retain their own finite bounds.
Local HISEW supervision uses its registered profile.
Structured phase diagnostics include successful timings and native failure output without environment/credential dumps.

For diagnosis, use the existing manual `ci.yml` optional `diagnostic_os` and `diagnostic_node` inputs for one supported frozen lane.
Inspect existing runs, form a specific hypothesis, and select a bounded experiment before dispatch.
That CI run cannot satisfy release admission.
Do not repeatedly launch a full matrix until a failure disappears.

Uploads contain only named machine-consumed evidence, with 90-day hosted retention.
Disposable dependency installs, validator executables, caches and fixture directories stay outside uploads.
Release archives retain the evidence that must survive hosted expiration.
Native npm SBOMs keep their emitted schema version; source production inventories come from a clean production-only manifest against the unchanged source lock.
Every installed location and graph edge is retained separately so native component coalescing cannot hide a difference.
Only the exact native file distribution URI can receive a recorded representation repair; original SBOM bytes and native validation are retained.

Implementation, local assurance, source delivery, remote configuration, complete hosted qualification, public release, immutable archival, promotion and owner operational acceptance are separate reported states.
See the [accepted implementation plan](plans/2026-10-18-release-publishing-assurance-implementation-plan.md) for the complete acceptance and recovery gates.
