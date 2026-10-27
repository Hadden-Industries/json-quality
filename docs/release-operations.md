# Deliberate releases

The release interface is five manually dispatched GitHub Actions workflows in `Hadden-Industries/json-quality`.
PR product acceptance is deliberately triggered by Ready for review; the owner chooses when to merge.
The main observer automatically performs only equal-input reuse admission; `FULL_REQUIRED` waits for an explicit main-qualification dispatch.
CodeQL participates in PR acceptance and also has weekly/manual default-branch scans.
A source push, dependency update, or tag cannot stage or publish a package.

The release has three designated tarballs: `@hadden-industries/json-quality`, `@hadden-industries/json-quality-linux-x64`, and `@hadden-industries/json-quality-win32-x64`.
The small core declares exact-version optional dependencies, following Markdown Quality's existing distribution pattern.
Native npm selects Windows x64 or Linux x64 glibc; each platform package contains its Node addon, standalone executable and verified notices.
The producer's development file links are rewritten to exact registry versions only in the staged core.
All packages share the owner-selected version, but retain independent archive integrity and authenticated registry provenance.
The existing `--archive` and `--provenance` inputs identify the core and its frozen companion archives; each recipient qualifies the core and only its matching platform payload.
Linux executable mode is checked in the actual native archive.
The local `.provenance.json` records all three byte identities; authenticated registry provenance comes from native npm verification.
The published `1.0.0-rc.1` uses configuration/event/native cohort 2.
The resource-override source candidate is `1.0.0-rc.2`, with cohort 3; preparing that version does not publish it or select it in consumers.
Formal release publication and HISEW adoption require their owner's separate decisions.
Public API/schema exports, executable artifacts, CLI entrypoints and consumer Node floors remain separate compatibility contracts.

The earlier release plan recorded a 1.0.0 selection on 2026-10-18.
The accepted oversized-value plan replaces conflicting APIs and requires a complete consumer cohort.
The owner's 24 October instruction supersedes the earlier package version selections with `1.0.0-rc.1`, limits registry migration to JSON Quality, and leaves Markdown Quality distribution unchanged.
Consumer installation requires an exact registry version and its npm-generated lockfile; the Git-source installation promise is retired because a source commit does not identify one cross-host packed archive.
Current implementation verification follows its task's explicit ordering: consolidate the candidate, resolve external review findings, then perform final security/full verification.
Source versioning, focused checks and static reviews do not establish release qualification or acceptance.

No artificial prerelease is required to warm npm or GitHub.
Use the exact separately accepted version initially under the existing `pilot` availability tag, qualify real registry recipients, and promote only after acceptance.
An owner may instead explicitly select `"npmTag":"latest"` in the digest-bound release review, including for a release candidate.
This makes unpinned npm installations select that version; omission preserves `pilot`.
The choice applies to the core and both matching platform packages and does not change the GitHub prerelease marker.
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
Start staging within 30 days of qualification, while the producer archive, recipient reports and security evidence remain available.
Expired qualification inputs require fresh qualification; a green historical run cannot replace their bytes.
The read-only admission job does not need access to a private draft decision.
Admission independently reads the completed native run, every job, artifact digest, expected recipient lane and previous writer attempt.
Missing, duplicate, skipped, expired or substituted inputs stop the workflow.
The final staging job repeats admission under `npm-publication` and is the only staging job with npm OIDC authority.

Each exact tarball is passed to `npm stage publish` with lifecycle scripts disabled, public access, the owner-reviewed npm tag (`pilot` by default), and provenance.
A durable request intent precedes each native request, staging the platforms before the core.
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

For prereleases, verify the owner-selected npm tag on all three packages and retain the GitHub prerelease marker; do not invoke stable promotion.
An explicitly reviewed npm `latest` release candidate remains a GitHub prerelease and does not become GitHub's latest stable release.

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
Stage continuation names all three owner-inspected stages in `stages`, each with `package` and `stageId`; label reconciliation names `targetVersion`.
Every stage effect records its actual package identity, integrity and independent response before the next package is attempted.
Platforms stage before core; all three owner approvals precede registry qualification.
An incomplete family cannot be reported as a successful release or automatically completed by replaying requests.
If an early stage loses its response, the owner can explicitly choose `disposition: "abandon-family"` and name exactly the attempted stages.
Readback must independently observe their matching public versions and integrity; an unapproved unknown stage remains blocked.
The abandoned family supplies no registry admission or new stage request.
To proceed, select and qualify a new version, then pass the old family's original manifest, run, journal digest and abandonment decision in `recovery_json`.
Admission acquires and retains the old subject and journals separately, settles only observed effects, and preserves the new candidate identity.
The original version cannot advance or be staged again.
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
It uses only a matching original journal or no-request marker when an operational artifact is missing or expired.
Missing attempts, changed controllers and unknown effects remain blockers.
Readback uses bounded native raw contents transport, including checkpoints larger than 1 MB.
Retain or renew checkpoints while their original artifacts remain available; missing original bytes cannot be reconstructed from a green run or public state.
Completed native writer continuations retain their exact owner recovery records alongside the original journals.
Checkpoint renewal preserves those settlements; later versions accept them only with a fresh successful complete continuation graph and matching original journal/run/attempt/manifest/version.
Failed or incomplete continuations cannot settle historical unknown effects.

Execution budgets are shared by purpose: install/ci has twenty minutes, a Node suite thirty minutes, hosted qualification jobs two hours, bounded evidence reads two minutes, collection fifteen minutes and registry availability thirty minutes.
The JSON check has ten minutes inside a fifteen-minute step; uploads share four minutes inside a five-minute step.
`scripts/qualification-budgets.js` owns these profiles and `scripts/qualification-process.js` re-exports them for native command callers; product resource limits and deliberate timeout tests retain their separate contracts.
Local HISEW supervision uses its registered profile.
Structured phase diagnostics include successful timings and native failure output without environment/credential dumps.

For diagnosis, inspect native job logs and reproduce the affected frozen runtime lane with `scripts/qualify-runtime.js` and its documented archive/environment inputs.
Inspect existing runs, form a specific hypothesis, and select a bounded experiment before dispatch.
An isolated diagnostic run cannot satisfy release admission.
Do not repeatedly launch a full matrix until a failure disappears.

Hosted retention follows the artifact's purpose:

- Same-run admission bundles and ordinary producer transport: 1 day.
- Compact PR proof, release qualification inputs and native payloads: 30 days.
- Final effect journals and public-registry evidence bundles: 90 days.

Ordinary test/npm output and failure diagnostics remain native Actions logs, with no uploaded log copies.
The shared JSON workflow streams NDJSON into the job log and creates no report artifact.
GitHub's repository retention setting governs logs and provider records together; it does not provide a separate per-workflow log-retention control.
The repository default remains 90 days to preserve one-shot recovery records; the named artifact classes use shorter explicit retention.
Same-run transfer expiration also bounds any environment approval wait; if approval exceeds that window, dispatch fresh admission.
Disposable dependency installs, validator executables, caches and fixture directories stay outside uploads.
Release archives retain the evidence that must survive hosted expiration.
GitHub archival publishes exactly ten uploaded assets for the three-package family: the three npm tarballs, corresponding source archive, release manifest, owner review, owner acceptance, third-party notices, `release-assets.json` and `release-evidence.zip`.
The ZIP preserves the original proof paths and a manifest-bound `evidence-index.json` containing every retained member's size and SHA-256.
`release-assets.json` binds the ZIP digest and repeats its member index so downloaded proof can be independently checked without one asset per evidence file.
The bundle includes build attestations, native verification results, provider records, inventories and request journals; standalone package/source archives are not duplicated inside it.
Disposable source installs, npm caches and the SBOM validator use a separate temporary workspace and never enter the retained producer directory.
Binary evidence collection uses the shared fifteen-minute collection budget; metadata reads retain their shared two-minute budget, with both using bounded retries and remaining-time redirect handling.
The archival workflow creates GitHub build attestations for all three tarballs and the release manifest, then uses native `gh attestation verify` against the exact repository, signer workflow, controller digest and subject bytes.
The bundle and native verification results accompany the immutable release assets.
Read-only recovery of an already archived release does not create another attestation.
Native npm SBOMs keep their emitted schema version; source production inventories come from a clean production-only manifest against the unchanged source lock.
Every installed location and graph edge is retained separately so native component coalescing cannot hide a difference.
Only the exact native file distribution URI can receive a recorded representation repair; original SBOM bytes and native validation are retained.

Implementation, local assurance, source delivery, remote configuration, complete hosted qualification, public release, immutable archival, promotion and owner operational acceptance are separate reported states.
See the [accepted implementation plan](https://github.com/Hadden-Industries/json-quality/blob/main/docs/plans/2026-10-18-release-publishing-assurance-implementation-plan.md) for the complete acceptance and recovery gates.
