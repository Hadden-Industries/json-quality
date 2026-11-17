# JSON Quality release workflow evidence and recovery

## Direction and baseline

Make an interrupted release recoverable from the exact evidence of its original GitHub Actions attempt.
Preserve the operator's ability to distinguish a request that never ran, a request that completed, and a request whose result remains unknown.
A new controller, missing Actions artifact, or expired log must leave the original npm and GitHub effects attributable.

This is a **draft HISEW implementation plan**.
The inspected integration baseline is JSON Quality `main` at `c8c74cc6847d1c34c1d86de861d1a6a6b4d26317`, which matched GitHub on 2026-11-16.
Use the **R2 route proposed here**, consistent with the [accepted release CI convergence plan](2026-11-13-release-ci-convergence-implementation-plan.md) for changes to protected cross-service writes and recovery.
The release owner accepts the exact integration baseline and the activation conditions before implementation of dependent work.
This document authorizes planning only.

The scope covers producer-bound upload identity, signed recovery of original staging inputs, expected writer-attempt coverage, an owner-captured pending npm stage inventory, structured pilot refusal evidence, and Windows runner policy.
Preserve JSON Quality's public package and CLI, release manifest and tarball identities, normal release channels, native-first staging, interactive npm 2FA, both public-native checks before core staging, independent registry qualification, protected writer environments, one-shot effects, and read-only completion.
Preserve version-scoped history and signed public target recovery.
Known signed records and original provider observations remain read-only.
Use JSON Quality's existing Actions transport and repository-owned validators.

### Agreed release decisions

- **DEC-02 · Durable recovery.**
  Make capture opt-in for selected interrupted releases.
  The first implementation recovers only staging bundles cleared for permanent public retention that fit the measured Git storage budget.
  Defer private or oversized bundles until approved durable custody is available.
- **DEC-03 · Writer reservations.**
  After reconciling the historical baseline, require an owner-signed reservation for every staging, archival, and promotion attempt, including each authorized rerun.
  Read-only qualification, completion, and recovery checks remain available without a reservation.
- **DEC-04 · Pending npm stage checks.**
  Require a fresh owner-captured observation before staging, archival, and promotion writes.
  An unrelated pending stage blocks each path.
  A refreshed observation carries forward the same approved release decision.

### Observed starting behavior

| Area                        | JSON Quality at the baseline                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Upload and history readback | The writer action packs deterministic raw ZIP bytes, verifies the native artifact ID, name, digest, size, and run, and can reconcile a byte-identical recovery upload after confirmed absence. The later cross-run reader looks up an attempt-qualified name and approved recovery suffixes, selects a remaining artifact when digests agree, and verifies the downloaded bytes. The producing job's selected ID is absent from that later selection.                                                                                                           |
| Staging and expiry          | Core admission starts with the selected native-stage Actions artifact and live provider inventory. Registry admission starts with the selected core-stage artifact and rechecks both producer attempts. Signed history already preserves historical journals, provider inventories, and qualified public targets. The normal core and registry entry points cannot obtain their full predecessor bundle from that history. A failed native-only run can already continue when its completed stage requests and attempt evidence survive a later upload failure. |
| Writer coverage             | The history reader enumerates visible runs and attempts, recovers original execution on a partial rerun, and unions provider observations from the selected owner-signed checkpoint. A run absent from both inputs leaves no expected identity to reconcile.                                                                                                                                                                                                                                                                                                    |
| Pending npm stages          | The pending-decision guard derives outstanding staged families from the release journals and signed settlements. An unrelated pending item created directly on npm need not appear there.                                                                                                                                                                                                                                                                                                                                                                       |
| Pilot refusal               | Exact original job, step logs, operation and labels already govern reconciliation of one refused pilot DELETE. The writer already disables fetch retries. Initial reconciliation derives the HTTP refusal from human-readable npm stderr.                                                                                                                                                                                                                                                                                                                       |
| Windows                     | `assets/node-support.json` declares `windows-2025`. The projection owns Ubuntu selectors. Several workflow lanes, the native workflow contract, host observation, and the historical stage job inventory independently embed Windows labels.                                                                                                                                                                                                                                                                                                                    |

Baseline entry points: [writer upload](../../.github/actions/upload-writer-evidence/action.yml), [stage workflow](../../.github/workflows/stage-release.yml), [public registry workflow](../../.github/workflows/release-registry.yml), [effect admission](../../scripts/admit-release-evidence.js), [history reader and exporter](../../scripts/release-provider.js), [stage decisions](../../scripts/release-decision-state.js), and [pilot refusal verifier](../../scripts/rejected-pilot-request.js).

The repository was public at inspection.
The live record for staging run `43494040933`, attempt `1`, reported `effect-stage-1` as artifact `14071241950`, at 62,548,684 bytes with an expiry of 2027-02-11 19:38:02 UTC.
This is transport metadata for one representative bundle.
A signed recovery export with those bytes has yet to be qualified.
[Observed GitHub artifact](https://github.com/Hadden-Industries/json-quality/actions/runs/43494040933/artifacts/14071241950)

## Requirements and implementation decisions

### REQ-01 · Keep the producing upload identity

**AC-01.**
A new writer artifact is usable only through the original completed writer job's reconciled upload receipt or that same receipt under an accepted signed checkpoint.
Bind repository and head repository IDs, workflow and controller SHA, run, original attempt, job ID, writer role, final artifact ID and name, digest, and byte size.
A successful recovery upload has its own exact ID and name and the original prepared ZIP digest.
Existing historical controllers follow their already supported identity rules, with the stronger route required at an explicit controller cutover.
Wrong identity, duplicate receipt, mismatched live metadata, corrupt bytes, malformed or truncated provider responses, and authorization failures refuse before extraction or a release effect.

**DEC-01.**
The existing producer reconciler in `scripts/writer-evidence.js` owns upload selection.
After it verifies its final artifact, emit one versioned, public-safe machine record from the successful reconciliation step.
Capture it through GitHub's read-only original-job logs endpoint.
Authenticate the original workflow, controller, run attempt, job, and unique completed reconciliation step before accepting the record.
Use exact native step identity and a bounded log frame verified with a representative hosted run.
Accept only known normal and recovery names.
The receipt states which one the writer selected.
A skipped step, an indeterminate upload without a reconciled identity, or a receipt elsewhere in the log cannot authorize an artifact.
The history exporter retains the receipt under the existing owner-signed checkpoint.
A later reader uses that exact ID to retrieve metadata and bytes, normalizes the native digest representation once, and rechecks retained identity under the same read deadline before handing the archive to the existing extractor.

The Actions outputs are immediately usable within the producing workflow.
The repository still needs a link from a later dispatch to the original job's verified selection.
A separately uploaded pointer would add another artifact whose origin needs authentication.
An ID inside the ZIP it identifies would depend on an upload that has yet to occur.
Keep the existing pre-activation read path limited to historical controller identities, with its existing ambiguity and byte checks.
A typed, confirmed-missing or expired result can reach the signed recovery route.
A broad error message or a substituted artifact cannot.

### REQ-02 · Recover an expired or deleted original staging predecessor

**AC-02.**
After confirmed loss of an original native-stage or core-stage artifact or provider attempt, an explicitly selected, complete signed checkpoint supplies the exact predecessor bytes and native inventories for normal core admission and registry qualification.
The same authenticated originals also reach archival evidence consumers that currently read the stage again.
Fresh normal gates still run.
The native-only case preserves both original stage receipts, both operator approvals and both public-native probes; the core case preserves all original package origins and public qualification requirements.
No expired or deleted evidence can turn an unknown request into permission to replay it.

**DEC-02.**
Extend the owner-signed history index with schema 3, carrying the schema 2 history and public-target features plus an optional staging predecessor reference collection.
The index binds phase, run, attempt, controller, manifest and original review identities, the native job inventory and selected transport receipt, plus the payload size, digest and ordered member references.
Capture from a completed original stage while Actions custody remains available.
Historical capture needs independently verified original upload custody, using its original provider evidence or existing authenticated signed evidence.
Retain only explicitly selected native or core predecessors for interrupted releases, with permanent public retention cleared and the measured Git storage budget satisfied.
Use the same authenticated signed-Git content reader used by qualified target sidecars.
For the retained transport use the exact digest-verified ZIP bytes.
Store content-addressed parts within the existing signed content reader's demonstrated per-file bound and reconstruct them in isolated scratch under the existing release-transport byte budget.
Use digest-derived paths under the signed commit; verify each part and the complete byte count and ZIP digest before invoking the existing bounded extractor and normal `verifyBundle` and provider admission.
The signed index stays within its existing limit.
Identical retained payloads share one content identity.
An incomplete materialization stays outside the admission artifact.
A retained checkpoint can outlive live provider data, while any surviving inventory, receipt or artifact metadata must agree with it.

Add an explicit read-only stage-capture mode to the existing history preparation entry point so the release owner can capture before registry qualification or archival has completed.
Run the initial capture locally in the owner's controlled workspace.
Use the original run and attempt and acquire evidence before the first relevant log or artifact expires.
Produce an unsigned candidate index and sidecars.
Classify their contents before any upload or placement on public refs.
The existing owner-controlled signing and tag procedure supplies authority.
The post-archive checkpoint workflow retains its existing default behavior.
Bind the selected checkpoint via the existing owner review or continuation and its digest, or via an equivalent digest-bound recovery reference for registry admission before its existing bundle can be loaded.
For registry selection the reference must bind the expected manifest, review, core run and attempt, and the original native origin when needed.
An arbitrary input cannot override the admitted review or select a different stage.
The reader accepts schema 1 and 2 history in their current roles.
Update both the manual export and workflow renewal to preserve authenticated schema 3 references and exact sidecar bytes when needed, and keep qualified target selection valid across the supported versions.
Writer-only records and old target-only records cannot claim the new staging predecessor capability.

**Production feasibility gate.**
Prove the complete capture and recovery path against representative native and core bundles and classify every retained member before choosing to publish a durable ref in the public repository.
Global repository growth matters as well as per-file limits.
Measure the exact bundle sizes, index size, number of parts, total unique bytes and the effective reader and Git-provider limits.
The agreed first implementation admits only bundles cleared for permanent public retention and within the measured Git storage budget.
Keep bundles with embargoed material, credentials, uncleared content, or excessive size on the existing fail-closed route.
Any later recovery route for those bundles requires a separately approved, immutable custody location that Actions can read without write authority.
Do not trim a required bundle member, publish private pending-stage data, or silently substitute an external store.

### REQ-03 · Account for expected writer attempts after deletion

**AC-03.**
Once the historical baseline is reconciled, every stage, archive, and promotion attempt requires an owner-signed reservation bound to its exact workflow ID, run number, attempt, controller SHA, and effective release decision digest.
Reserve the next run number and attempt 1 for a new dispatch.
Reserve the exact existing run number and next attempt for an authorized rerun.
Missing expected writers block new effects until an owner-signed, complete original inventory settles custody.
A reservation consumed on another ref grants no effect authority and remains auditable after run deletion.
A split npm and GitHub promotion is one reserved workflow attempt with two separately admitted writer roles.
A read-only checkpoint, registry, completion or reconciliation operation needs no reservation.

**DEC-03.**
Reuse the existing owner SSH key verification, protected `release-history-*` tag namespace, and complete native run/attempt collection in `scripts/release-signing.js` and `scripts/release-provider.js`.
Introduce an unambiguous intent-tag sub-namespace with a canonical signed binding to the exact protected controller and approved decision.
Use the same signature/role owner for reserving, reading and verifying intents.
Require a complete legacy cutover inventory of expected workflows, run IDs, last known attempts and controller identities, derived from GitHub Actions and corroborated by deployment and existing signed records.
Avoid inferring an omitted run from the current listing.
For pre-cutover runs that can disappear, an authenticated final observation after the provider's 30-day rerun window and all original attempts are required to close the inventory.
A reserved attempt that has not run must remain visible as an unresolved authorization until the owner reconciles it.
No unsigned cancellation or automatic reuse.
Keep capture, checks and publication of signed refs in their existing owner-controlled path.
Quiesce the old writers during cutover and explicitly classify any previously queued, in-progress or rerunnable older-controller attempt before activation.

### REQ-04 · Guard against pending private npm stages outside Actions

**AC-04.**
Require a fresh, complete owner-captured npm stage observation for the core and both native packages at each staging, archival, and promotion write boundary.
A pending stage outside the admitted operation, including one created manually on npm, blocks all three write paths.
Archival includes publishing the immutable archive and any GitHub latest classification in that workflow.
Promotion includes restoration and pilot retirement.
A late npm approval can move a family label after its public readback.
This also matters to archival because it can set GitHub latest for a direct stable release.
A stage already attributable to an earlier member of the same admitted operation can satisfy the existing continuation rules when its exact stage ID and journal bind it to that member.
Terminal approved, published or rejected records preserve their distinct native meanings.
A missing package, partial list, unknown status, duplicate or conflicting stage ID, future timestamp, expired observation or intervening stage-capable writer produces a refusal before the next effect.

**DEC-04.**
Use the pinned native npm CLI `stage list` with the exact three package selectors, the public registry origin and JSON output from the owner's existing authenticated local session.
Verify native pagination and terminal status behavior with the pinned producer npm before accepting the capture contract.
The local capture validator owns the provider response parsing and completeness check.
Bind only the minimum reviewed record to the existing stage review, archive acceptance, or availability operation and its existing digest.
Include repository, exact family, observation time, exact command and selectors, per-package raw-response digests, and normalized active stage identities and statuses needed for the guard.
Represent a private stage ID as a digest of its exact native value and use the same comparison against the already authenticated original journal.
Keep the complete raw response with the owner where needed for dispute or audit.
Review the normalized fields for disclosure before use in GitHub Actions.
A fingerprint without complete normalized observations cannot discharge the guard.
Use the existing one-hour freshness precedent for owner observations, and require the snapshot to postdate the latest authenticated other stage-capable attempt.
Recheck current provider history immediately before an effect.
A new revision or concurrent external write can invalidate the snapshot.
The observation covers the captured point in time.
Preserve the existing checks around subsequent native effects.

CI validates the bound snapshot and normal release authority.
Private npm sessions and OTP remain in the owner environment.
For an approval delay, allow a separately digest-bound owner refresh of this observation identifying the original manifest, review, acceptance or operation and the same permitted effect scope.
Carry forward the same approved release decision, including its identities, approval, channel, and predecessor inputs.
Keep dispatch payloads within GitHub's native schema and size limits.
Never truncate a capture to fit.

### REQ-05 · Retain a structured, exact pilot DELETE refusal

**AC-05.**
A new structured receipt can support settlement only for the reviewed terminal unknown `retire-pilot` DELETE when the pinned npm process exited nonzero without timeout or signal and its machine response shows HTTP 401 for the exact HTTPS registry endpoint and package.
Existing original job, attempt, reviewed decision, failed step, log custody, unchanged pilot/stable labels and fresh decision checks remain in force.
Timeout, lost response, bare E401, unrelated or duplicate DELETE, wrong endpoint, another unknown request or changed labels leaves the effect unresolved.
Continue reading pre-cutover original records and accepted signed settlements through their existing validated historical contract.

**DEC-05.**
Use the current one-shot label arguments in `scripts/npm-availability.js` and the existing process diagnostics, journal and rejection-settlement owners.
Request JSON from the pinned npm for the pilot delete path once the wire method, path, retry behavior and native failure envelope are confirmed through the existing test harness.
Persist a small machine diagnostic with the exact request identity, exit classification and fixed method/status/endpoint.
Keep provider prose, credentials and raw terminal output out of the durable receipt.
For new controllers, no human-log fallback silently upgrades ambiguous structured output to a rejection.
A signed completed settlement can continue to serve later recovery under the current rule.

### REQ-06 · Derive Windows runner selectors and verify historical lanes

**AC-06.**
A Windows runner policy change reaches the relevant built-in workflows and validators through the existing projection and workflow check.
Current and historical proof resolves runner labels from the policy committed at the producing controller, or from the frozen manifest where it already owns an evidence lane.
Provider-reported labels on completed matrix jobs must agree with the expected lane.
Existing valid legacy job identities, skipped placeholders and earlier Windows evidence remain usable.
A matching job display name with a substituted provider label refuses.

**DEC-06.**
Extend `assets/node-support.json`, `scripts/runner-policy.js` and `scripts/project-node-support.js` as the rule owner and projection.
Start with JSON Quality's current `windows-2025` policy.
GitHub currently lists that name and `windows-2025-vs2026` for the same Windows Server 2025 image, so no image migration is needed to deliver this slice.
Cover main, reusable qualification, native producer, staging and Windows CodeQL lanes, including fixed expected names and host observation in `scripts/native-workflow-contract.js`, `scripts/ci-host.js` and release evidence consumers.
Derive only current runner selectors in YAML.
Keep historical evidence tied to its producing policy, and keep host `ImageOS` observations distinct from a workflow label or a machine image version.
Test projection using an alternate supported label; do not project historical replay strings into today's settings.

## Delivery and proof

Use the existing maintained Node test runner at each seam.
Assertions about writes must count actual calls to the independently scripted provider or loopback npm service.
Use scope-specific native fixtures and external provider observations as the oracles.
Keep the real validator, ZIP extractor, Git signature checker, and effect ordering in the test path.
Mock provider I/O where safe and necessary.
Use real signed Git objects, actual npm CLI loopback requests and hosted read-only workflow observations at their respective boundaries.
Configuration-only changes require both schema checks and effective validation of the changed workflow contract.

### SLICE-001 · Resolve historical upload by original receipt

**REQ-01, AC-01, DEC-01.**
Trace `upload-writer-evidence` through `reconcileWriterEvidence`, `download`, `readEffectHistory` and the signed exporter.
Deliver one vertical writer-to-history path first, covering a stage writer, then apply the same reader and role validation to archive and both promotion jobs.
Before enabling the new route, observe one authenticated hosted normal or recovery receipt through the real job logs, step inventory and artifact endpoint.
Prove correct normal and recovery IDs, delayed exact-ID visibility, and reuse of the producing job on a partial rerun.
Refuse namesakes, same-digest replacements with a different ID, wrong role/controller/attempt, duplicate or out-of-step logs, live/signed conflicts, truncation and provider denials.
A negative fixture passes a previously refused digest substitution through the new caller and still records zero extraction and zero effects.
Use `tests/release-resilience.test.js`, `tests/artifact-transport.test.js` and `tests/release-writer-history.test.js`.
The initial delivery can ship before new signed staging-payload recovery.

### SLICE-002 · Capture and recover the exact stage predecessor

**REQ-02, AC-02, DEC-02.**
Depends on SLICE-001.
Begin with the read-only custody proof in DEC-02 using a representative native-stage and core-stage bundle and the actual signed content reader's raw media type.
Demonstrate destination visibility, complete contents, Git path and size limits, assembled hashes and complete cleanup without publishing a new ref.
Once the custody decision is accepted, exercise original live acquisition, signed capture, then recovery of lost transport through the normal core and registry admission entry points.
Recheck archival compatibility in the same slice where it consumes the recovered originals.
For native-to-core recovery, verify both original approved natives in their hosted lanes and count one new core request only in the isolated effect fixture.
For core-to-registry, require the exact approved family with original origins and zero release effects during qualification.
Include upload-only failure after both native requests, missing or conflicting journals, partial checkpoint, expired proof with live disagreement, corrupted or reordered parts, missing sidecar and an unresolved possible write.
A successful signed recovery and a live predecessor must yield the same admitted frozen bundle and original provider identity.
Use `tests/release-writer-history.test.js`, `tests/release-resilience.test.js`, `tests/release-contract.test.js` and workflow assertions.
Keep existing full history in jobs that use local Git for signatures or the controller delta.
Exercise the workflow checker with a shallow checkout substituted into a Git-dependent admission or writer job and require a refusal.
The read-only `native-public` job consumes the admitted bundle and has no corresponding full-history dependency.

### SLICE-003 · Enforce the independent writer inventory

**REQ-03, AC-03, DEC-03.**
Can develop against the existing history owner in parallel with the custody proof.
Coordinate changes to the exporter and schema after SLICE-002's contract is settled.
Prove the exact current reservation in the normal writer admission and enforce its binding again before the first effect.
Exercise a real signed intent and a complete expected inventory through read-only admission.
Cover missing current intent, wrong run number or attempt, wrong key/controller/decision, copied intent, off-ref consumption, deleted legacy history before closure, signed final legacy closure, and a retained partial rerun with an unreported reserved writer.
Confirm stage, archive and both promotion writers refuse before effect, while independent completion and registry observers remain read-only.
Use `tests/release-writer-history.test.js`, `tests/release-startup.test.js`, `tests/promotion-service.test.js` and the workflow checker.
Activate only after the owner reconciles the exact baseline, verifies the actual tag rules, and closes off conflicting old-controller effects.

### SLICE-004 · Require fresh owner npm stage observations

**REQ-04, AC-04, DEC-04.**
Can develop independently of writer intents using the existing history guard.
Integrate against the actual live history identity rules at activation.
Demonstrate local capture for the exact family and pass the resulting reviewed observation through normal stage, archive and both availability writers.
In scripted npm state, a pending manual stage for one native package that is absent from Actions history must block all relevant effects.
Cover an attributable prior native in a core continuation, terminal items, malformed or incomplete inventories, freshness and intervening-run races, and refresh after an approval delay with the same approved identities.
Prove that neither captured private response content nor authentication data appears in job logs, durable workflow artifacts or the public checkpoint.
Extend `tests/release-contract.test.js`, `tests/release-resilience.test.js` and `tests/promotion-service.test.js` at the existing pre-effect seams.
Keep live validation read-only until authorized release activation.

### SLICE-005 · Settle a structured pilot refusal through native proof

**REQ-05, AC-05, DEC-05.**
Can proceed independently through the existing promotion and settlement contracts.
Coordinate signed history changes with SLICE-001.
Capture the pinned npm command's actual one-shot DELETE and JSON output with the maintained loopback harness.
Prove that only the exact structured registry refusal creates the new receipt, that it survives failed-writer evidence transport and signed renewal, and that a later fresh owner decision can settle it without replaying the old operation.
Exercise unchanged-label guards, wrong endpoint, timeout, retry or duplicate event, mixed effects, malformed response and the historical valid stderr-based case.
Use `tests/promotion-service.test.js`, `tests/release-resilience.test.js` and `tests/release-writer-history.test.js`.
Do not deliberately create a failed live npm permission request for qualification.

### SLICE-006 · Project Windows policy and authenticate runner evidence

**REQ-06, AC-06, DEC-06.**
Independent of storage and pending-stage work.
Settle shared historical job identity checks with SLICE-003 before integration.
Exercise a synthetic supported Windows label through the projection and workflow checker, then test actual and substituted provider labels under current and archived producing policies.
Use a real legacy fixture, including a skipped native-public placeholder, and require both recorded platform identities after a partial rerun.
Check the unchanged Ubuntu rules and Windows native/CodeQL selection.
Use `tests/node-support.test.js`, `tests/ci-proof.test.js`, `tests/release-contract.test.js` and `tests/release-writer-history.test.js`.
Obtain hosted Windows and Ubuntu qualification and Windows native/CodeQL evidence for the exact candidate before accepting new runner evidence.

## Integration, activation and recovery

- **Responsibility.**
  The release maintainer integrates the consumers and workflows.
  The release owner owns accepted operation decisions, signing, evidence visibility and activation.
  An independent verifier checks the frozen candidate, and a release security reviewer examines trust boundaries before protected integration.
  Keep reviews and artifacts within the authorized project environment.
- **Order.**
  Start with the original receipt and custody proof.
  Integrate the signed recovery reader before emitting the new checkpoint form.
  Add the new writer and pending-stage requirements after their producer, validations and operator guidance exist.
  Structured refusal and runner policy may land independently once their affected checks pass.
  Use a reviewed controller boundary for each new required field.
  Preserve old observations with their original meanings.
- **Repository checks.**
  Capture the relevant accepted baseline on the exact integration revision.
  Run the named tests with `node --test --test-concurrency=1`, then `npm run check:workflow-contracts`, `npm run check:node-support`, `npm run check:source` and the existing `npm run check:repository` release integration profile on the frozen candidate.
  Use affected check selection during implementation.
  Record command, candidate, verdict, and unresolved hosted checks in the existing handoff.
- **Hosted proof.**
  Observe release qualification and required security/native lanes on the exact source. For release controller claims, retain the original run/attempt/job, selected artifact ID and digest, signed source and checkpoint identities, both platform probes, and observed zero effects on refusal. First exercise the recovery and negative paths in a read-only hosted fixture with native provider I/O controlled at its boundary.
  A production stage, approval, archive, promotion, tag or ref update has its existing separate authority.
- **Observability and budgets.**
  Show the phase and original attempt, and whether proof was live, signed or unavailable.
  Surface a concise refusal reason and next owner action.
  Keep known effects and unresolved requests explicit.
  Index provider observations by run/attempt and role for one admission, read each selected log and checkpoint once within that scope, and fetch sidecars only for selected predecessors.
  Count reads and bytes in the representative dry run before claiming lower cost.
  Preserve current time, request and byte budgets, permission-denial behavior, checksum validation and redirect boundaries.
  Remove operation-owned scratch after use.
  Retain signed originals under repository policy.
- **Abort and recovery.**
  Keep the affected writer blocked if signed inventory is incomplete, a predecessor conflicts with live evidence, the retained payload is incomplete, npm stage state is stale or unknown, or the effective hosted controls differ from the accepted ones.
  Preserve journal and receipt bytes, original outcomes and the last confirmed public state.
  Before a writer runs, correct the readback or observation and repeat admission.
  After a possible effect, use existing read-only completion and exact reconciliation; known earlier effects remain in place.
  If new readers or reservations have entered use, hold affected writes and fix forward with readers that preserve those records.
  A Git revert cannot withdraw a staged request, restore a moved label, or undo an immutable archive.

### Conditions that reopen a decision

- GitHub does not expose the selected producer's reconciliation record at a reliably attributable step boundary, or its continued availability cannot support capture before expiry.
  Settle DEC-01 with the release maintainer before requiring the new reader.
  Older verified custody remains usable within its original limits.
- The stage capture fails the publication classification, cumulative-volume or actual readback check, or a historical artifact lacks independent original custody.
  Resolve DEC-02 with the release owner for that selected stage.
  The other slices continue.
- Provider workflow identity, tag protection, reservation collisions, or surviving old revisions make the writer baseline incomplete.
  Hold DEC-03 activation until each affected expected attempt is accounted for.
- The pinned npm CLI cannot return a complete, unambiguous stage inventory or a structured refusal with the required exact coordinates.
  Hold only the dependent new route, preserve the current safeguards, and reassess pinned native support and the affected contract with the release owner.
- GitHub changes the Windows alias mapping or older provider records omit labels required by the proposed check.
  Qualify the possible migration or an evidence-backed historical mapping.
  Never infer an OS/toolchain from the display name alone.

## Reuse and reference basis

The design keeps the application-specific rules in JSON Quality.
The pinned upload action and Actions API own immutable artifact IDs, digest representations and job metadata.
Git and the existing owner-key and signed-content readers own signed custody.
Native npm owns private stage listing, staged approvals and the actual label request.
Existing JSON Quality consumers own package, provider, history, journal and effect admission.
The residual code binds these authorities across dispatches.
Reuse the native interfaces and maintained repository implementations.
No additional package, shim, release service or unreviewed pin change is proposed.
Recheck the pinned integration and provider capabilities before adopting a new use or changing a version.
The inspected producer policy specifies npm 12.2.2 and the writer action pins `actions/upload-artifact` v7.0.2.
No upstream code is copied by this plan.
If implementation adapts source code, inspect the exact revision's license and preserve required notices and attribution under the repository's existing process.

- **Producer identity, expiry and checkout completeness.**
  Markdown Quality reads the native upload acknowledgment, rebinds it to the exact original provider attempt, and restores original bytes using the signed checkpoint.
  The retained consumer fetches the history its implementation reads locally.
  [Original upload acknowledgment](https://github.com/Hadden-Industries/markdown-quality/blob/9093122423953c788490bc974cbe93d400dbb8a2/scripts/publication-upload.js) · [Signed acquisition](https://github.com/Hadden-Industries/markdown-quality/blob/9093122423953c788490bc974cbe93d400dbb8a2/scripts/publication-artifact.js) · [Retained checkout fix](https://github.com/Hadden-Industries/markdown-quality/commit/9093122423953c788490bc974cbe93d400dbb8a2)
- **Writer coverage and private pending stages.**
  Markdown Quality identifies expected attempts through protected signed intents and captures owner-observed npm stage state independently from Actions journals.
  [Signed writer inventory](https://github.com/Hadden-Industries/markdown-quality/blob/9093122423953c788490bc974cbe93d400dbb8a2/scripts/release-writer-inventory.js) · [Owner stage observation](https://github.com/Hadden-Industries/markdown-quality/blob/9093122423953c788490bc974cbe93d400dbb8a2/scripts/release-stage-guards.js)
- **Pilot refusal and Windows.**
  Markdown Quality binds a structured diagnostic to the one-shot pilot DELETE and validates retained matrix evidence using producer-owned runner policy.
  [Pilot diagnostics](https://github.com/Hadden-Industries/markdown-quality/blob/9093122423953c788490bc974cbe93d400dbb8a2/scripts/family-labels.js) · [Effect validation](https://github.com/Hadden-Industries/markdown-quality/blob/9093122423953c788490bc974cbe93d400dbb8a2/scripts/release-effects.js) · [Windows projection change](https://github.com/Hadden-Industries/markdown-quality/commit/00929e040e0a1d444a1ba047bdf93d0a02a84a53)
- **Native contracts inspected on 2026-11-16.** [Pinned upload outputs](https://github.com/actions/upload-artifact/blob/cf430e030ddbb5b0abf93d22962f4752f3646cd9/README.md#outputs) · [Actions artifact API](https://docs.github.com/en/rest/actions/artifacts) · [Original job logs](https://docs.github.com/en/rest/actions/workflow-jobs#download-job-logs-for-a-workflow-run) · [GitHub contents limits](https://docs.github.com/en/rest/repos/contents#get-repository-content) · [GitHub large files](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github) · [Rerun semantics](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs) · [Dispatch syntax and limits](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onworkflow_dispatchinputs) · [npm staged publishing](https://docs.npmjs.com/staged-publishing/) · [GitHub runner labels](https://github.com/actions/runner-images#available-images)

Prepared using sibling HISEW source `f47d961403e56ab284a480b4a836bc5b7411e513`, including its planning and implementation skills, engineering principles, and architecture, software selection and resource guidance.
