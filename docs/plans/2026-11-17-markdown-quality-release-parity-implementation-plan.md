# JSON Quality: promote tested releases and preserve recovery evidence

## Direction and baseline

**JSON Quality does not yet have all the applicable GitHub Actions improvements added to Markdown Quality after `9093122423953c788490bc974cbe93d400dbb8a2`.**
The largest gap is release qualification: JSON Quality can reuse PR proof for main qualification, but a deliberate release still runs a new producer, runtime matrix and CodeQL graph.
Make a normal merged PR's authenticated package archives directly promotable, then carry their original provenance through staging, registry verification, archival and recovery.
Retain the workflow and recovery corrections learned during Markdown Quality's actual 3.0.3 release.

This is a **draft HISEW implementation plan**, prepared on 2026-11-17, with the owner decisions below confirmed through the grilling session on that date.
It authorizes planning only; implementation, commits, hosted runs, configuration changes and publication require their respective task authority.
The proposed implementation route is R2 because the change affects admission to protected cross-service writes and signed recovery.
The plan is self-contained; donor references explain provenance and provide implementation examples.

### Confirmed planning decisions · 2026-11-17

These decisions supersede the earlier draft's automatic fresh fallback and blanket 30-day candidate horizon:

1. **Require reuse by default.**
   A normal release-qualification request either admits existing CI evidence or stops before expensive qualification.
   Only an explicitly selected `force-fresh` request launches the complete fresh path; it cannot bypass source admission, writer authorization or recovery checks.
2. **Retain the latest fully qualified main candidate for up to 90 days in native Actions storage.**
   Verify its successor before replacing it, and protect evidence still required by active releases and other named consumers.
   Permit brief replacement overlap.
   There is no indefinite candidate store or periodic re-upload to reset expiry in this increment.
3. **Keep native workflow dependency lockfile migration separate.**
   Retain reviewed full-SHA pins for this parity implementation.
   A future migration must preserve controller/candidate identity and local/reusable-action coverage; it is not a release prerequisite here.

Expiry of required evidence stops reuse and requires an explicit fresh-qualification decision.
Protection from application cleanup cannot extend GitHub's retention limits; show the actual earliest expiry across required evidence and use the already approved, opt-in recovery capture when applicable.
These are confirmed plan decisions, not authority to implement, commit, dispatch, delete remote artifacts or publish.

Inspected source baselines:

- **JSON Quality:** `c663451261bd9957f424051885844e347a188867`, branch `one-oh-two`, clean when inspected.
  The package version is `1.0.1`; the branch name does not select a release version.
- **Markdown Quality:** `cc3d8f70eb8a1f8218cc2393dc23d44f82b55d2b`, branch `fix/release-archive-gates`.
  The comparison excludes the supplied starting commit and includes every subsequent non-merge change through this revision.
- **Sibling HISEW guidance:** `89e05c2cae4c17e9c12c7845ec292dc057271bb7`.
  Read the [planning skill][hisew-plan], [implementation skill][hisew-implement], and relevant engineering, reuse and resource guidance from that checkout.
  Use these instructions as guidance, without invoking the installed HISEW engine or introducing its execution bookkeeping.

The earlier [evidence and recovery plan](2026-11-16-release-workflow-evidence-and-recovery-implementation-plan.md) was implemented in `74a1795`, `41e2ed8` and `1db902f`.
Its three agreed decisions continue to govern:

1. Durable staging capture is opt-in for selected interrupted releases, with permanent public retention cleared and measured Git storage acceptable.
   Private or oversized bundles need separately approved custody.
2. After historical cutover reconciliation, every staging, archival and promotion attempt, including an authorized rerun, needs its own owner-signed reservation.
   Read-only operations do not.
3. A fresh owner-captured pending npm stage observation gates all three write paths.
   Refreshing it carries forward the same approved release decision.

The current request is a new incremental comparison, not a request to repeat that implementation.
Preserve its stronger original-attempt and recovery checks.
The standing instruction to run **no more Security scans** applies to this work.
This plan neither invokes a scan nor authorizes a future one.
Existing release security gates remain part of the product design; describing them does not execute them.
No external review is requested.

### Best-practice verification · 2026-11-17

The proposed design is consistent with the current primary guidance cited in the source register, subject to the explicit trust, compatibility and custody conditions below.
This is a design assessment, not a claim of SLSA certification, passing implementation tests or verified hosted permissions.

- Promote authenticated, byte-identical artifacts while retaining their original build identity; provenance and successful qualification are separate claims.
- Treat PR artifacts as untrusted data until independently admitted by the trusted controller.
  A green run or matching digest alone cannot supply authorization.
- Reuse deterministic results only while their relevant inputs and required policy remain compatible.
  A fresh alert lookup does not run newly added CodeQL queries against old source.
- Preserve minimal permissions, OIDC, protected environments, substantive completion gates and exact-outcome recovery.
- Retain the bytes still needed for publication or recovery.
  Compact receipts can replace duplicated builds, but cannot reconstruct an unavailable unpublished tarball.

Normal-merge-only admission, latest-candidate selection, owner reservations, the 20,000,000-byte history boundary and conservative dispatch byte counting are repository choices, not universal requirements imposed by GitHub, npm or SLSA.
The initial candidate retention ceiling is 90 days, matching the public-repository Actions maximum; actual repository/organization settings and each required object's expiry can shorten usable custody.
The history size experiment remains necessary before selecting compression or changing an allowance.

GitHub now prefers native workflow dependency lockfiles, including transitive action identities, over SHA pinning alone.
JSON Quality currently enforces full SHA pins and has no `actions.lock`; this remains GitHub's documented alternative when lockfiles cannot yet be adopted.
Adoption needs a separate bounded compatibility change: the native generator cannot resolve nested actions behind the current `./` composite references without migration or complete explicit coverage, and the current checker accepts neither tag-based references nor the `$/` same-repository form.
Do not mechanically migrate these references: `./` follows the checked-out workspace, whereas `$/` follows the workflow commit, which can change the trusted controller/candidate boundary.
Keep the reviewed SHA policy for this parity change; a later native lockfile migration must preserve those identities and cover reusable workflows in their owning repository.
It is not an additional release prerequisite in this plan.

## Comparison and scope

The statuses below come from current source inspection, not a claim that JSON Quality's hosted workflows have passed these scenarios.

| Improvement                                                              | JSON Quality at the inspected baseline                                                                                                                                                                       | Disposition                                                                                   |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Promote exact CI-tested package bytes                                    | `release-qualification.yml` always calls `qualification.yml` and `security.yml`. `main-qualification.yml` reuse does not supply a release candidate.                                                         | Missing; slices 001–004.                                                                      |
| Release-capable evidence from ordinary PR CI                             | Archives and compact lane proof exist. Release manifests, source inventories and full recipient evidence are conditional on `release-mode`.                                                                  | Partial; extend existing producers in slice 001.                                              |
| Separate original build and landed release identities                    | `release-evidence.js`, signed-tag checks, source archival and qualified targets primarily bind to `release.source.commit`.                                                                                   | Missing for promotion; slice 003.                                                             |
| Audit original source and recipient locks under a newer controller       | `check-security.js` audits the current checkout. `release-security.js` selects main-ref analyses, not authenticated original PR executions.                                                                  | Missing for promotion; slice 004.                                                             |
| Complete collection within one budget and reuse original job inventories | `ci-proof.js` repeats original-attempt reads; `github-evidence.js` has a fixed 64-request allowance.                                                                                                         | Partial; slice 002, with measured capacity rather than a copied constant.                     |
| Retained host identity adapted to its authenticated lane                 | The proof verifier expects `host.lane`; the new release caller does not exist yet.                                                                                                                           | Prevent the donor's failed adapter in slice 002.                                              |
| Pinned npm before downstream registry reads                              | `setup-producer` and `setup-writer` already select policy-owned npm. Registry, archive and history callers use these actions.                                                                                | Runtime provision already present; strengthen path/order checks in slice 005.                 |
| SDK uploader dependencies on its actual execution path                   | Existing callers install tooling, but the general local-action loop does not enforce preceding SDK setup. Some release checks use `!step.if`, which accepts YAML `false`.                                    | Concrete guard gap; slice 005.                                                                |
| Skip-aware gates and truthful completion                                 | Current archive graph is a straight `admit → archive` path, so it has no donor-style skipped legacy ancestor. Conditional reuse will add new branches.                                                       | Preserve existing behaviour; cover the new graph and mandatory results in slice 005.          |
| Compact signed history and stable re-export identity                     | Target sidecars and receipt selection already exist. The index is plaintext, bounded at 20,000,000 bytes. Target renewal compares full asset records and may replace an equally rich earlier representation. | Partial; slice 006.                                                                           |
| Avoid recursively retaining history snapshots                            | JSON Quality has its own `operationEvidence`, target references and stage sidecars; it does not use the donor's staging-history file layout.                                                                 | Trace actual consumers and remove only proven duplication in slice 006.                       |
| No-request recovery and finite transfer profiles                         | Startup-safe `release-command.js`, signed `noEffect` records, original-attempt reconciliation and transfer budgets already exist.                                                                            | Preserve and extend realistic journeys in slice 007; do not import donor incident exceptions. |
| Validate the entire escaped dispatch before creating a run               | No maintained complete-request preflight corresponding to the donor's dispatch validator was found.                                                                                                          | Missing; slice 007.                                                                           |
| Complete scoped-package endpoint encoding                                | `rejected-pilot-request.js` still has two single-occurrence slash replacements.                                                                                                                              | Small parity correction in slice 007.                                                         |
| Cold CLI rehearsal through actual release consumers                      | `release-startup.test.js` and its provider harness already exercise staging, promotion and completion without project dependencies.                                                                          | Extend to promotion/re-export/failure journeys in slice 007.                                  |
| CI-enforced versioned documentation                                      | `sync:version` and `check:version` project package metadata only. README, consumer guide and runbook repeat the current version.                                                                             | Missing adjacent CI guard; slice 008.                                                         |
| Dependency refresh and runner policy                                     | Node `26.13.1`, npm `12.2.2` and the reported dependency upgrades are already represented in JSON Quality's current updates. Runner selection is centralized by the prior work.                              | No dependency migration or runner rename in this plan.                                        |

Preserve the public CLI/API, contract cohort, native C++/ICU production, package filenames, corresponding-source obligations, supported runtimes, consumer npm policy, channel selection, protected environments, native-first staging, separate interactive npm approvals and one-shot writes.
Keep JSON Quality's current Windows policy; do not substitute Markdown Quality's runner label or Python scan inventory for JSON Quality's C++ scans.
Do not change SemVer, move existing tags, republish an existing version, automatically retire `pilot`, add credentials, or change trusted publishers as part of implementation.
A dependency on the published Markdown Quality linter does not provide access to its private release-controller modules.

## Requirements and selected decisions

### REQ-01 · Reuse the exact qualified candidate

**AC-01:** An eligible ordinary same-repository merge can complete deliberate release qualification with zero additional package builds, source suites, native validation runs, installed runtime matrices or performance corpora.
The original three tarballs, their filenames, digests and embedded provenance remain byte-identical.
Required deterministic inventories are generated during CI and subsequently validated and retained.
The release summary identifies the original run and producing attempts and clearly reports `REUSED`, an explicitly requested fresh qualification, or a stopped request with the precise reason.
An absent or false `force-fresh` input must launch zero package builds, source test suites, native validation runs, runtime matrices or performance corpora when reuse cannot be admitted.
Necessary source admission and read-only evidence verification still apply.

**DEC-01:** Extend the existing `ci-proof.js`/`ci-command.js` authority, authenticated transport and package qualification.
Do not create an alternative CI trust system or use a cache hit as proof.
Require the same complete source tree and ordered parents, original repository IDs, unique ordinary merged PR association, current compatible policy/matrix and complete successful predecessor executions.
Authenticate the original producing attempt separately for each reused job, including partial reruns.
Do not select an older green run over a newer failed or incomplete candidate.
The merge relationship comes from native Git objects and authenticated GitHub records, not caller-supplied equality claims.
Run the verifier and any privileged consumer from the admitted trusted controller, never code or actions loaded from the downloaded candidate.
Do not extract candidate files over the controller checkout or execute their lifecycle hooks during admission.
Preserve minimal job permissions, isolated producer/writer environments, reviewed external action pins and disabled checkout credential persistence; ordinary PR qualification gains no package/repository publication credentials or new write permissions.

Reuse must fail before a partial candidate becomes visible.
Before admission, confirmed missing/expired artifacts, a supported older proof or an unsupported merge relationship stop the normal request with the exact reason retained; none selects fresh qualification automatically.
Malformed or contradictory evidence, digest/identity mismatches, access denial, collection exhaustion and unresolved provider errors stop admission with a diagnostic; they must not be silently converted into evidence absence or an expensive automatic fresh run.
After output materialization or a release effect has started, an error is terminal for that operation; it cannot silently select another route.
Only an explicit `force-fresh: true` input selects the full fresh path, including initial qualification or deliberate requalification after expiry.
Select that mode before collection/fan-out; do not turn a reuse error into a fresh run within the same request.
Fresh qualification still requires all existing admission and assurance gates and never replays an existing writer attempt.
Do not add a time-only expiry rule for deterministic results beyond actual custody, applicable policy and provider constraints.

### REQ-02 · Preserve build identity while authorizing the landed release

**AC-02:** A synthetic tested PR merge and the landed main commit may differ in SHA while sharing the authenticated complete tree and ordered parents.
Packages continue to name the original build commit; the signed version tag identifies the landed release commit.
All downstream readers accept that distinction only through validated promotion evidence.
No package is repacked merely to rewrite the commit in its provenance or filename.

**DEC-02:** Introduce a strict promoted-manifest variant in the maintained release schema, using the next unallocated version, **4 at this baseline**.
Keep schema-3 fresh manifests and historically supported records under their existing meanings; current code reads these legitimate evidence formats without reviving old writer implementations.
The new variant retains the original source, package, archive and distribution fields and requires a promotion descriptor containing:

- Original build commit, landed release commit, complete tree and ordered parents.
- Original CI workflow, repository, run, attempt and PR identities.
- SHA-256 of the exact original build manifest and qualification proof.
- Authenticated references to original producing executions and retained evidence.

Retain the exact original manifest, producer lock and proof as separate members of the admitted bundle.
Owner decisions bind the new promoted manifest digest.
One repository-owned accessor/validator resolves the release commit; consumers must not independently guess whether `source.commit` means build or release.
The equal-tree landed commit supplies durable corresponding source and release documents when the synthetic PR ref disappears.
Original native production has its own source-input and provider identities and must remain independent of package-family packing.

### REQ-03 · Refresh changing facts without reproducing deterministic work

**AC-03:** The release consumes the original CodeQL analyses, query/rule inventory, recipient locks and SBOMs, while checking current applicable findings and advisories against the original graphs.
A newer controller's lockfile cannot substitute for the qualified source lock.
Fresh registry installation and provenance verification remain mandatory after publication because they test registry delivery, not the earlier local tarballs.

**DEC-03:** Extend the existing `release-security.js`, `check-security.js`, recipient inventory and security-contract validators.
For reuse, accept only the original authenticated PR ref/workflow/commit and successful producing interval; preserve all entries in JSON Quality's `securityScans`, including both native platforms and the Actions approval model.
Check scan completion, warnings, native SARIF and policy compatibility before reuse.
Compatibility includes the required scanner/CLI version, query-pack versions and rule inventory, configuration/custom model, languages and analysis mode, not only source equality or a recent timestamp.
A current alert lookup cannot discover findings that require queries never run on that source.
When required assurance inputs change, refuse that assurance claim and identify the affected gate; retain independently valid package/test evidence rather than automatically rebuilding everything.
Use the maintained npm client to audit digest-verified lockfiles in isolated scratch with lifecycle scripts disabled and without reinstalling dependencies; verify the lock bytes remain unchanged.
If an old candidate lacks a retained producer lock, an exact original-commit lookup is allowed only when it matches the recorded digest; otherwise qualification cannot claim that graph.
Any new scan execution remains subject to the standing user prohibition and later explicit authority, independently of what the workflow design requires.

### REQ-04 · Make workflow execution match its declared prerequisites

**AC-04:** Every reachable uploader and npm consumer has its actual runtime/tooling prerequisites before invocation.
An omitted `if` and explicit YAML `false` are different.
The selected reuse or fresh route reaches the final gate, and a failed, skipped, cancelled or missing mandatory producer cannot yield successful qualification or completion.

**DEC-04:** Strengthen the maintained YAML contract checker and test the actual workflow documents and inline gate programs.
Use explicit cancellation-aware status conditions where a valid route has an intentionally skipped ancestor.
The terminal gate accepts a skipped fresh graph only alongside fully admitted reuse; it requires successful execution of all remaining obligations.
Keep existing useful failure-evidence upload behaviour.
Do not add a redundant archive job merely to mimic Markdown Quality's different DAG, or broaden write eligibility with an unconditional `always()`.

### REQ-05 · Keep compact recovery independently usable

**AC-05:** A cold reader can authenticate retained history, restore the selected original target or staging predecessor after confirmed provider expiry, and re-export it without changing its established identity.
Changed asset download counts do not make an immutable target conflict; a changed asset ID, name, size or digest does.
An unknown original effect remains unknown after compression, omission or re-export.

**DEC-05:** Keep JSON Quality's index, lazy target sidecars and opt-in stage chunks.
Prefer compact receipts and authenticated references to already immutable release assets over duplicated tarballs, unpacked builds or verbose logs.
Logs can carry compact receipts, but expiring Actions logs cannot be the sole permanent authority for an otherwise recoverable operation.
For ordinary candidates, use native Actions retention up to 90 days and retain one latest fully qualified main candidate plus evidence required by active consumers.
Replace a candidate only after the complete successor is independently admitted; an incomplete, failed or unrelated PR run is not its successor.
Retain necessary original bytes through the existing opt-in recovery mechanism where applicable, and never deliberately delete the last admissible copy while a named consumer still needs it.
No periodic copying/re-uploading may renew the ordinary candidate's expiry.
If required provider evidence expires without admitted retained custody, stop reuse and recovery claims rather than treating package bytes alone as proof.

For an already signed target, validate incoming observations against stable immutable identity, then carry forward the original authenticated representation and required file map.
Do not replace it merely because the new collector chooses fewer files or an equal `richness` score.
If a genuinely additional settlement is needed, represent it as an explicitly bound addition using the existing settlement model rather than changing the old subject under the same digest.
Keep manifest SHA, qualification-byte SHA, transport SHA and provider asset digests distinct.

Add a separately discriminated, versioned compressed transport envelope where measured history requires it.
**Do not copy Markdown Quality's outer `schemaVersion: 3`: JSON Quality already assigns data schema 3 to staging predecessors and writer closures.**
Authenticate the exact signed outer bytes before decoding; require encoding, declared original size and original digest, canonical base64, finite decompression and normal inner schema validation.
Enforce the transport limit before base64 allocation, validate the declared expansion against the selected limit, and enforce output size during decompression using native `maxOutputLength` or bounded streaming; checking size only after expansion is insufficient.
Retain plaintext reading for authenticated historical records.
The existing 20,000,000-byte signed-file boundary remains in force unless separately justified; establish an expanded-size bound from the actual retained workload and reader occupancy in slice 006, not from the donor's constants.
Prefer existing sidecars when an index can be reduced without a new representation.

### REQ-06 · Discover operational failures before spending a writer attempt

**AC-06:** A local complete-request preflight and isolated real-entry-point rehearsals detect malformed dispatches, absent tooling, incompatible historical records, retention growth and incomplete release outcomes without any live mutation.
Every simulated interruption records the attempted prefix and proves that continuation does not replay it.

**DEC-06:** Extend JSON Quality's existing entry fixture and startup/resilience suites.
Mock only external provider/process boundaries; run the actual admission, schema, signature, extraction and release command implementations.
Use test-owned signing keys and real native verification; never use the owner's private key or a boolean signature stub as evidence of cryptographic verification.
Explicitly distinguish this proof from hosted scheduling, real OIDC permission, registry propagation and owner 2FA.

The complete dispatch validator checks the selected workflow's declared inputs, required values, types, exact ref, digest bindings and total escaped input size before any dispatch or writer reservation is spent.
The inspected GitHub contract permits 25 inputs and 65,535 characters.
Follow the donor's conservative UTF-8 byte count over the entire serialized inputs object and explain that policy; do not validate each embedded decision independently and overlook aggregate growth.
Use existing decision validators wherever they already own an input contract.

### REQ-07 · Keep published documentation synchronized

**AC-07:** One edit to `package.json.version`, followed by `sync:version`, updates current release text, examples and links.
`check:version`, source admission and packing reject drift.
Published documents read correctly after npm publication; historical records and the public contract cohort remain literal and unchanged.

**DEC-07:** Extend the existing version projection rather than adding another release-version owner.
Use maintained templates only for documents with current release references; introduce one previous-version input only where an authored comparison requires it.
Generate all outputs in memory and validate them before writing the batch.
Do not derive version from the branch name or choose a new version while implementing this plan.

## Architecture, reuse and deployment boundaries

These are predicted edit seams, not an instruction to duplicate the donor's module layout.
The implementation owner may keep private helper names and decomposition appropriate to JSON Quality while preserving the contracts above.

| Rule                                   | Current authority and consumers                                                                              | Selected strategy                                                                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CI identity and original attempts      | `ci-proof.js`, `ci-command.js`, main qualification and release resolver                                      | Extend the existing verifier; share completed attempt inventories only within one admission. Re-read mutable run/ref/artifact state at the existing final barriers. |
| Source, archive and promotion identity | Release schema, `release-contract.js`, `release-evidence.js`, writer admission, assets and target readers    | One strict promotion contract and release-commit resolver; update all effect and recovery consumers together.                                                       |
| Node/npm and SDK setup                 | `assets/node-support.json`, `qualification-process.js`, producer/writer composites                           | Reuse the current composites and explicit producer executable paths. No second npm bootstrap implementation.                                                        |
| History identity and retained bytes    | `release-provider.js`, `release-history-targets.js`, `stage-predecessor.js`, signing and recovery validators | Preserve lazy sidecars and immutable originals; centralize encoding/decoding only where the transport actually changes.                                             |
| Transfer and execution resources       | `qualification-budgets.js`, `artifact-policy.js`, native GitHub reader and uploader                          | Keep separate read, collection, upload, extraction and registry boundaries. Measure full-path usage before altering an allowance.                                   |
| Current documentation versions         | `package.json`, `project-package-version.js`, source checks and packer                                       | Generate authored current-version references and check drift. Never regenerate historical release evidence.                                                         |

GitHub's native artifact/run/job APIs, the existing artifact SDK/actions, native Git/OpenSSH verification, npm and Node's built-in zlib already supply the required mechanisms.
No new hosted service, credential store, signing service or third-party package is selected.
The custom residual work is JSON Quality's merge/evidence admission, lossless representation and effect ordering; native tools do not decide those repository contracts.
Both repositories identify adapted release code as AGPL-3.0-only.
Preserve SPDX and donor attribution on adapted implementation, and keep the existing third-party/native inventory owners; inspect any newly introduced dependency's rights separately.

Cross-repository copying is not the DRY strategy inside JSON Quality.
Its schema, C++ native packages, staging format and release effects are independently deployed contracts.
Use pinned donor references and conformance scenarios to carry the lessons over, then maintain one owner per JSON Quality rule.
Reconsider a separately published shared controller only if independent deployment and stable public APIs justify it; extracting such a product is outside this plan.

## Implementation slices

### SLICE-001 · Make an ordinary CI candidate release-capable

**Trace:** REQ-01, REQ-02 → AC-01, AC-02 → DEC-01, DEC-02.

**Outcome:** Existing PR qualification retains a complete, authenticated release candidate from the same packing and installation operations it already executes.

**Likely owners:** `.github/workflows/ci.yml`, `.github/workflows/qualification.yml`, `.github/workflows/main-qualification.yml`, `scripts/release-prepare.js`, `scripts/release-inventory.js`, `scripts/release-distribution.js`, `scripts/pack.js`, `scripts/ci-command.js`, `scripts/ci-proof.js`, `scripts/qualify-runtime.js`, existing artifact transport/consumer inventory and the manifest schema.
Donor: [artifact promotion][mq-promotion], [CI workflow][mq-ci], [original lock retention][mq-lock].

- Make release manifest/source inventory production available for ordinary qualified PR candidates without granting publication authority or changing deliberate CI triggers.
- Freeze the producer lock next to the archive family and verify its digest before and after packing.
  Keep that evidence outside the published package unless its existing shipment contract requires otherwise.
- Collect the recipient locks, results, inventories and SBOMs from the existing root/isolated installations, with all required platform/runtime identities.
  Do not install again to reconstruct them.
- Retain existing performance and native-production evidence.
  JSON Quality's distribution inventory is already integrated into release preparation and native input reconciliation; a separate job named `Distribution` is optional, but its required work must be represented in final CI proof.
- Extend proof versioning/coverage so old compact proofs cannot claim newly required release evidence.
  Keep old main-qualification proof semantics valid where they still meet that operation's contract.
- Align necessary producer/lane artifacts and compact proof with the agreed retention ceiling of 90 days, subject to configured provider caps.
  Avoid a second full build archive; record exactly which consumer requires each retained member.
- Select the latest fully qualified main candidate only after authenticating its successful CI and ordinary merge relationship.
  Keep temporary PR evidence required by active CI/admission consumers distinct from the retained main candidate; an unrelated PR cannot displace it.
- Plan candidate replacement and cleanup as a separate trusted operation, not a side effect of the read-only release resolver or an untrusted PR job.
  Use the native artifact API and narrowly scoped permissions; enumerate original artifact IDs and their consumers, including shared native origins and partial-rerun evidence, before authorizing removal.
  Serialize replacement against competing selection/release consumption, verify the successor first, and recheck live references before deletion.
  If ownership or use is uncertain, retain the evidence and report the unresolved cleanup.
  Remove only superseded candidate artifacts proven unused; do not delete entire workflow runs, active release/recovery evidence or published assets to enforce a single-candidate count.
- Report the effective reuse deadline as the earliest expiry of all indispensable artifacts, run/check records and proof dependencies.
  Inspect current repository/organization retention settings; requesting 90 days on an upload does not extend other objects or retroactively renew old evidence.
  Preserve the existing opt-in interrupted-release custody policy; do not add an indefinite candidate store or scheduled re-upload renewal.

**Proof:** Through the actual producer and consumer collection path, verify one package tuple, unchanged archive digests, original manifest/lock linkage, both layouts and complete native/source inventory.
Removing an inventory, substituting a lock or skipping a required lane must prevent release-capable acceptance.
A pre-change proof must be reported ineligible for promotion, never upgraded by inference.
Exercise successful replacement, failed/incomplete successors, unrelated PRs, concurrent selection, active release consumers, shared native artifacts, partial reruns and expiry through the actual selection/cleanup consumer.
Assert the selected candidate and every still-needed original artifact survive; only explicitly identified unused predecessor artifacts can be removed.
Provider deletion is mocked in local proof.
Verify 90-day upload projections and a shorter effective deadline when any required provider record expires earlier; no test may infer that an active-consumer pin overrides provider expiry.
Focused existing suites: `tests/ci-proof.test.js`, `tests/pack.test.js`, `tests/recipient-inventory.test.js`, `tests/release-contract.test.js` and workflow governance tests.
New promotion-specific fixtures are proposed, not existing passing evidence.

**Delivery boundary:** Evidence production can land before activation of reuse.
Old release qualification remains functional while its downstream consumers are updated.
Abort candidate export on a mismatch; remove only unpublished task-owned scratch.

### SLICE-002 · Resolve merged CI evidence before release fan-out

**Trace:** REQ-01, REQ-04 → AC-01, AC-04 → DEC-01, DEC-04.
Depends on slice 001.

**Outcome:** A manual main release request reuses a fully verified existing candidate or stops before launching matrices; an explicit `force-fresh` request selects the complete fresh qualification path.

**Likely owners:** `release-qualification.yml`, a proposed reusable fresh-qualification workflow, `ci-proof.js`, `ci-command.js`, `github-evidence.js`, `download-evidence.js`, `release-prepare.js`, and a proposed repository-local release reuse resolver.
Donor: [release resolver][mq-reuse], [retained host and collection correction][mq-hosts], [qualification workflow][mq-qualification].

- Reuse the existing ordinary-merge selector and original-attempt verifier.
  Require the requested version and frozen current matrix to match the retained candidate.
- Project each recorded host together with its authenticated lane.
  Do not require an observer-only `lane` property to have existed in the producer's host record, or replace historical producer identity with today's runner image.
- Bind every acquired artifact to its original successful producing job/attempt, native ID, name, digest, size and execution interval.
  Use existing writer receipt admission where applicable; do not weaken it to matching names.
- Share immutable completed-attempt inventories within this collection.
  Preserve fresh final run, artifact and main-ref observations so a concurrent rerun or main movement still refuses admission.
- Use one collection deadline across proof and required artifacts.
  Measure request counts, retries, redirects and bytes through the actual resolver.
  Parameterize capacity only if the measured complete operation exceeds the present 64-request allowance; keep the ordinary-reader default and explicit exhaustion result.
  The donor's 128 is a reference measurement, not JSON Quality policy.
- Build the promoted candidate in isolated scratch, authenticate all its members, then expose its outputs once.
  A failure copying/exporting admitted outputs fails the job; it cannot launch fresh work.
- Keep the full fresh graph behind an explicit branch and `force-fresh`, preserving source admission and all current mandatory native, runtime, dependency and scanner obligations.
  Apply DEC-01's reuse-required default: both expected absence/ineligibility and failed trust/collection checks stop before fan-out unless fresh mode was explicitly selected at request admission.

**Proof:** Exercise the real resolver with distinct synthetic and landed SHAs, the same tree/parents, retained hosts without `lane`, partial reruns, missing/expired artifacts, wrong tree, foreign repository, substituted upload, changed final run state, collection exhaustion and output failure.
Count original-attempt requests and assert no build/install/matrix invocation on successful reuse.
Test omitted, false and true `force-fresh` inputs against the actual workflow dispatch and branch gates.
Missing/expired evidence with omitted/false input must fail before expensive jobs; explicit true must run the complete fresh graph with normal safeguards and leave no reused candidate behind.
Adversarial candidate files must neither replace controller code nor execute in admission; access denial, digest mismatch and exhausted collection must launch neither reuse nor fresh matrices.
Add a proposed `tests/release-reuse.test.js`; extend `ci-proof.test.js` and transport tests.

**Delivery boundary:** Keep promotion activation coupled to slices 003–005.
A resolver-only success is not evidence that a release can be staged.
The diagnostic escape hatch requalifies source; it never replays an existing writer attempt.

### SLICE-003 · Carry promotion identity through every downstream reader

**Trace:** REQ-02, REQ-05 → AC-02, AC-05 → DEC-02, DEC-05.
Depends on slices 001–002.

**Outcome:** The promoted candidate reaches native staging, core continuation, public qualification, corresponding-source archival and signed recovery with its original packages intact.

**Likely owners:** `schemas/release-manifest.schema.json`, `release-contract.js`, `release-evidence.js`, `admit-release-evidence.js`, `release-writer-admission.js`, `release-records.js`, `release-effects.js`, `release-recovery.js`, `release-assets.js`, `release-provider.js`, `qualified-release-contract.js`, `qualified-release-checkpoint.js`, `stage-predecessor.js` and history preparation.
Donor: [promotion identity and validation][mq-identities], [retained evidence correction][mq-lock], [archive asset validation][mq-assets].

- Distinguish build identity, landed release identity and executing controller identity everywhere they affect admission.
  Review checks using `source.commit`, source archives, tag verification, controller deltas and production attestations as one connected change.
- Verify the promoted descriptor and original manifest/proof before using the landed commit.
  Schema validation alone must not establish the GitHub merge relationship.
- Derive corresponding source and notices from the authenticated landed equal-content tree.
  Retain the original source in package and native-production provenance.
- Carry promoted evidence into the admitted release bundle.
  Later archival and recovery use those retained members rather than requiring every original PR artifact to remain downloadable.
- Preserve original distribution subjects and lock digests; newly authored wrapper records bind the new manifest and refer to the originals instead of overwriting their identity.
- Audit existing `schemaVersion >= 3` branches: schema 4 must retain distribution, channel, staging and immutable-publication protections.
- If a transported npm lock enters a JSON validation surface, give its exact path the existing npm root-key treatment.
  Do not relax the empty-key or JSON policy globally.

**Proof:** Run a promoted candidate through actual admission and writer preparation, validate the landed signed tag, then restore the same candidate with original CI downloads unavailable.
Wrong build lock, tree, tag target, descriptor digest, native provenance or retained report must refuse before any request.
Historical fresh schema-2/3 release evidence keeps its original interpretation. Verify package filenames and SHA-256/SHA-512 before and after the journey.
Extend `release-contract.test.js`, `release-assets.test.js`, `release-writer-history.test.js`, `release-startup.test.js` and the proposed reuse suite.

**Delivery boundary:** Update producers and consumers together before enabling promoted output.
Before any effect, an incompatible candidate can be abandoned or requalified.
After staging/publication, retain its exact manifest and approvals and use forward repair/reconciliation; never relabel its original provenance.

### SLICE-004 · Refresh assurance using the original qualified graphs

**Trace:** REQ-03 → AC-03 → DEC-03.
Depends on slice 003; integrate with slice 002 activation.

**Outcome:** Current release checks inspect the exact original source and recipient graphs under the correct analysis identities without repeating installations or source scans merely because the release run is new.

**Likely owners:** `release-security.js`, `release-qualification-contract.js`, `release-evidence.js`, `check-security.js`, `release-inventory.js`, `release-registry-evidence.js`, `release-qualification.yml` and `release-registry.yml`.
Donor: [exact-source assurance][mq-security], [retained graph fixes][mq-lock].

- Bind reused CodeQL to the authenticated original PR merge ref, workflow, commit, category and producing job interval.
  Retain JSON Quality's actual Actions/JavaScript/C++ query and runner requirements.
- Compare the recorded scanner, query-pack/rule and configuration identities against the currently required assurance policy.
  An upgraded required query/model invalidates the affected analysis claim even when the tarballs and source tree are unchanged; checking existing alerts alone cannot renew that claim.
- Keep fresh main qualification as its own accepted route; do not broaden all scans to accept arbitrary refs.
- Refresh permitted current alert/advisory observations, check the original source lock and required retained recipient locks, and bind results to both the promoted manifest and original graph digests.
- Reuse the current audit validator and npm environment isolation.
  Do not run arbitrary downloaded package code while resolving or auditing reuse evidence.
- Reuse original SBOMs and native inventories only after validating their actual bytes and subjects.
  Preserve independent post-publication registry qualification across the supported matrix and both layouts.

**Proof:** Different controller and build locks must select the build lock.
A wrong/missing lock, changed recipient graph, mismatched analysis interval/ref/category, incompatible required scanner/query/model, warning, missing query inventory or current finding must fail the relevant gate. New fixtures must include native C++ scans, not only donor languages. Tests use native-shaped captured/constructed provider responses and assert no install or rescan command on the eligible reuse path.
Extend the existing release-contract, recipient-inventory and security tests; use the repository's current `requireCleanAudit` contract as the output validator.

**Delivery boundary:** This slice changes the assurance code and fixtures.
Do not run a Security scan to prepare or validate this plan.
During later implementation, distinguish permitted offline tests, ordinary configured CI obligations and any newly requested live scan; a prohibition cannot be silently converted into a green result.

### SLICE-005 · Enforce real setup and skip-resistant completion

**Trace:** REQ-04 → AC-04 → DEC-04.
Existing guard repairs can proceed independently; final graph checks depend on slices 001–004.

**Outcome:** Workflow contracts reject the defects that caused extra hosted repair cycles in Markdown Quality before a release is attempted.

**Likely owners:** `scripts/check-workflows.js`, producer/writer composites, qualification and release workflows, `tests/governance.test.js`, `tests/release-resilience.test.js`, and `tests/release-startup.test.js`.
Donor: [uploader prerequisites][mq-upload], [explicit-false correction][mq-false], [npm bootstrap repair][mq-npm], [skipped-writer repair][mq-skip].

- Require preceding frozen dependency setup for the local SDK uploader on every actual execution path, including a newly introduced conditional reuse branch and the shared qualification workflow's immutable producer directory.
- Require absent conditions for unconditional setup, or the same supported condition as its consumer when conditional.
  Reject YAML `false`, expression-false, late setup, wrong working directory and a later runtime replacement.
- Verify the internals of `setup-producer` and `setup-writer` select the policy's npm before registry/audit/release commands.
  Extend checks to registry, checkpoint and independent completion jobs, not just writers.
  Keep writers free of project dependency installs.
- Run inline terminal result assertions from the actual workflow text against success, failure, skipped, cancelled and missing results.
  Bind them to the real `needs` object and ensure they run before evidence retrieval can appear to complete an unsuccessful path.
- For the new reuse/fresh diamond, explicitly model skip propagation and cancellation.
  Preserve the current straight archive path unless its new dependencies require a status override.
- Retain the existing allowed npm-only promotion skip under its admitted decision; do not turn it into a general permission to omit GitHub work.

**Proof:** Mutate each material setup/condition/gate in parsed production YAML and require the checker to reject it.
Execute the gate programs, not an equivalent helper that could disagree with them.
The approved conditional path must pass with its unused branch skipped and fail with the selected branch skipped.

**Delivery boundary:** Static and local execution checks prove contract sensitivity, not GitHub's scheduler.
One later authorized hosted reuse run must verify the actual DAG and substantive terminal result.
No workflow cancellation, dispatch or release is authorized by this plan.

### SLICE-006 · Make signed history compact and stable across renewal

**Trace:** REQ-05 → AC-05 → DEC-05.
Independent of promotion until the final combined recovery test.

**Outcome:** History renewal preserves original authenticated subjects and fits a justified transport/storage policy without carrying redundant builds or recursively embedding prior histories.

**Likely owners:** `release-provider.js`, `prepare-release-history.js`, `release-history-targets.js`, `qualified-release-checkpoint.js`, `qualified-release-contract.js`, `stage-predecessor.js`, `release-records.js` and `prepare-release-history.yml`.
Donor: [compressed checkpoint transport][mq-history-format], [original-subject preservation][mq-subjects], [export and asset-identity repair][mq-export], [continuation rehearsal][mq-rehearsal].

First perform a bounded, read-only representation experiment on available JSON Quality history/fixtures: measure index bytes, unique target/stage bytes, repeated snapshots, encoded and expanded bytes, peak retained buffers and at least two consecutive renewal generations.
Follow the actual collector into every history consumer.
Do not download full build artifacts solely to measure a receipt that is already available.

Then implement the following selected branches:

- Always fix stable asset comparison and original-subject preservation.
  Compare sorted unique asset ID/name/size/digest identities and tag/release bindings; mutable counters and incidental timestamps are not immutable identity.
- Prefer the existing lazy target references and content-addressed stage chunks.
  Preserve original signed sidecar bytes when carrying them forward, including their exact digest and byte count.
- Omit a snapshot only after the normal consumer can prove the same authenticated subject from retained receipts/manifests.
  Contradictory snapshots refuse; unknown evidence stays verbatim.
  A new receipt representation must not rewrite an older signed representation in place.
- If the remaining index fits its existing bound with bounded occupancy, keep it compact plaintext.
  If required history still grows beyond it, use the separately discriminated gzip/base64 transport in DEC-05 and justify its expanded-size allowance from the experiment. Do not impose the donor's 48/256 MiB policy on this repository.
- If an individual selected record cannot fit the demonstrated reader/storage contract, report incomplete export and retain original custody.
  Use the existing opt-in public-retention policy; do not truncate, silently relax a bound or select a new external store.
- Share an authenticated per-operation history collection through its consumers where safe.
  If freshness is projected to a scalar, reject missing/malformed original timestamps and compare parsed instants numerically.
  JSON Quality already rejects invalid stage timestamps; retain that protection.

**Proof:** Run the real exporter and cold reader for a single target, multiple targets, fewer newly selected files, changed download counters, genuinely changed assets, provider expiry, stage sidecars and repeated renewals.
Verify real fixture signatures and reject post-signing tampering, noncanonical base64, wrong size/digest, oversized expansion and conflicting originals.
Assert that receipt-only renewal does not accumulate nested copies or re-download immutable package bytes unnecessarily.
Extend `release-writer-history.test.js` and `release-workflow-evidence.test.js`; a new format-focused test file is conditional on selecting a new envelope.

**Delivery boundary:** Read support precedes emission of a new transport.
Prior signed refs remain untouched.
A failed export never claims completeness or advances the recovery authority.
After a new-format signed checkpoint becomes authoritative, use a reader-compatible forward fix; reverting to a reader that cannot consume it is not a recovery plan.

### SLICE-007 · Rehearse complete requests and interrupted release journeys

**Trace:** REQ-01–REQ-06 → AC-01–AC-06 → DEC-01–DEC-06.
Extends existing harnesses; final journey depends on slices 001–006.

**Outcome:** The implementation predicts and tests the actual next release operations, including effect counts and saved recovery state.

**Likely owners:** Existing decision/admission modules plus a proposed local dispatch-preflight entry point; `rejected-pilot-request.js`; `tests/release-entry-fixture.mjs`, `tests/release-provider-fixture-hook.mjs`, `release-startup.test.js`, `release-resilience.test.js`, `release-workflow-evidence.test.js` and `release-writer-history.test.js`.
Donor: [dispatch validation and retention rehearsal][mq-rehearsal], [scoped endpoint correction][mq-endpoint], [final rehearsal corrections][mq-rehearsal-fixes].

- Validate the entire final dispatch payload locally before native `gh workflow run`/API submission. Check exact required/optional inputs, escaped JSON, Unicode, combined byte size and digest bindings.
  This entry point is read-only and cannot reserve, dispatch or retry a writer.
- Use the real caller graph in fresh-process fixtures with project dependencies absent for narrow writers.
  Permit only declared native provider routes and fail on unexpected processes or network access.
- Extend existing real Git signature fixtures through checkpoint restoration and re-export.
  Model native npm JSON accurately, including JSON-quoted scalar integrity and supported singleton response shapes where used.
- Preserve startup/no-request records and exact original-attempt inventories.
  A known pre-request failure can continue only through the existing authenticated evidence rules.
  Do not copy Markdown Quality's run IDs, signed baseline exceptions or exact legacy GET settlement into JSON Quality.
- Replace both single-occurrence scoped-package slash encodings with the complete canonical encoding expected by the fixed family and native npm endpoint.
  Assert literal expected URLs, not the same encoder in the test oracle.
- Keep maintained read/collection/upload/registry deadlines through the real child processes.
  Read-only retry does not encompass validation failures or effects.
  Existing timeout tests already cover many of these contracts; extend only uncovered new paths.
- Keep orchestration-only tests in producer verification.
  `qualify-runtime.js` already excludes `release-*` tests; ensure proposed tests retain that classification without reducing consumer behaviour coverage.

**Required scenarios and independent expected outcomes:**

| Scenario                                                    | Observable result                                                                                                                             |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Eligible merged candidate                                   | Exact same three tarballs; no second source/native/runtime/performance qualification; a bound promoted manifest.                              |
| Missing/expired evidence with reuse required                | Stopped request, no producer or matrices, no surviving reused output; explicit fresh qualification remains a separate choice.                 |
| Explicit `force-fresh: true` request                        | Complete fresh qualification with all normal gates; no reuse claim or replay of an existing writer attempt.                                   |
| New fully qualified main candidate replaces its predecessor | Verify the successor first; delete only proven-unused predecessor artifacts after reference checks, with active consumers protected.          |
| Candidate or indispensable original proof expires           | Stop reuse without automatic requalification; retained package bytes alone cannot establish missing qualification.                            |
| Output failure after admission                              | Failed job, no automatic fresh graph, no publication request.                                                                                 |
| Native staging succeeds                                     | One Windows and one Linux stage request, no core request; two owner approvals remain separate.                                                |
| First native response is lost after application             | One attempted request and unknown outcome; second native/core absent; retry adds zero requests until reconciliation.                          |
| One native is already public during continuation            | Exact native integrity/provenance checked; no restaging of that package.                                                                      |
| Core continuation                                           | Both original native public checks succeed before exactly one core stage request.                                                             |
| Corrupt artifact, stale inventory or substituted controller | Zero release mutations; original evidence remains intact.                                                                                     |
| A public runtime/layout lane fails                          | No archive publication; actual defaults and original approvals retained.                                                                      |
| Direct stable `latest` release                              | No separate npm dist-tag promotion; archival verifies the package family before stable/latest classification.                                 |
| Fresh archive / existing partial draft                      | Create only when absent; upload only missing verified assets. Asset count comes from JSON Quality's inventory, never the donor's count of 18. |
| Applied archive request loses its acknowledgement           | Preserve the attempted prefix; no duplicate create/upload/publish/classification based on stale absence.                                      |
| Immutable release already complete                          | Read-only verification and zero new publication effects.                                                                                      |
| Mandatory writer is skipped or failed                       | Terminal result cannot report successful publication; retain read-only failure evidence.                                                      |
| Logs/artifacts expire after complete signed capture         | Cold recovery uses authenticated retained bytes and original attempts; access denial or mismatch never becomes confirmed absence.             |
| Repeated checkpoint renewal                                 | Same established subjects, no recursive snapshots, measured bounded representation and preserved unresolved writers.                          |

**Proof:** Count requests at the external boundary and assert the intermediate journal states, not just final exit status.
Exercise each material failure through the final consumer.
Existing passing tests count when they cover the same scenario; do not duplicate them for a new checklist.

**Delivery boundary:** Hosted permissions, OIDC exchange, npm approval and scheduler behaviour remain separately unverified until an authorized live run.
Release rehearsals perform no live writes.
Remove fixture keys, scratch archives and disposable repositories when their consumers finish.

### SLICE-008 · Synchronize release documentation and explain the operating path

**Trace:** REQ-07 and all operator-facing acceptance criteria → AC-07 → DEC-07.
Projection can proceed independently; workflow prose follows slices 001–007.

**Outcome:** Current release documents describe the actual reuse/fresh/recovery paths, and their version references are checked before packing.

**Likely owners:** `project-package-version.js`, a proposed small documentation renderer, selected `docs/release-templates/*.in`, `README.md`, `CONTRIBUTING.md`, `docs/consumer-guide.md`, `docs/release-operations.md`, `docs/ci-trust.md`, current release notes and `tests/package-version.test.js`.
Donor: [documentation projection][mq-docs], [version synchronization commit][mq-version].

- Keep `package.json.version` as the current release authority.
  Parameterize current examples/links/anchors; leave historical changelog entries, signed evidence, accepted plans, contract cohort and third-party versions literal.
- Preserve JSON Quality's existing document structure and published-release voice.
  Do not import Markdown Quality's release number, asset count or migration claims.
- Extend `check:version` through its existing source and packing boundaries.
  Reject unknown/unresolved variables, missing outputs and stale generated files before a partially computed batch is written.
- Document the normal route: complete PR CI, ordinary merge, read-only release qualification with `REUSED`, reviewed promoted manifest, landed signed tag, reserved native staging, owner approvals, core continuation, public qualification, archival and selected signed retention.
- Explain stopped-reuse reasons and explicit `force-fresh` selection, original build versus landed release commit, original-lock audits, compact retention, complete dispatch preflight, direct `latest` behaviour and recovery after a controller-only correction.
- Document latest-main-candidate retention up to 90 days, verified replacement, active-consumer protection, effective expiry and the absence of automatic fresh qualification or periodic retention renewal.
  State that native workflow dependency lockfile migration is a separate follow-up and not a prerequisite for this parity release.
- State that npm website tag views can lag registry observations, and that browser login, CLI authentication, trusted-publisher configuration and owner approval are different checks.
  These are runbook lessons, not extra routine approval stages.

**Proof:** Change a future version in an isolated fixture and verify all selected current references, idempotence, historical preservation, valid anchors and packed-document links.
A bad template must fail before writing any output.
Run formatting/Markdown checks on the exact authored/generated scope and the existing package-version tests.

**Delivery boundary:** No release version is selected by this slice.
Keep generated files and templates together; after implementation, maintainers edit templates and run the existing sync command.

## Integration, verification and rollout

One implementation owner integrates manifest/schema changes, qualification workflow selection and downstream admission.
Slices 001–004 share those interfaces and should be implemented sequentially or coordinated under that owner.
Existing guard repairs in slice 005, the bounded history experiment in slice 006 and version projection in slice 008 can proceed independently; avoid parallel edits to shared contract/checker files.
The integrated cold journey in slice 007 comes after all contributing changes.

Use the sibling implementation skill's test-first route for changed decisions and behaviour, with an independently expected outcome and a meaningful failure before the repair where practical.
Use preservation checks for behaviour already present, configuration mutation tests for workflow contracts and format/link checks for this plan.
Do not deliberately break correct code to manufacture red, repeat an unchanged full matrix for bookkeeping, or run a Security scan because a generic checklist suggests it.

Maintained verification entry points inspected in `package.json`:

- `npm run check:workflow-contracts` validates workflow contracts.
- `npm run check:version` and `npm run check:node-support` validate their projections.
- `npm run check:source` covers formatting, JavaScript lint, projections, workflows, architecture, schemas, types, shipment and JSON policy.
- `node --test --test-concurrency=1 <selected test files>` is the native focused test route; choose the existing files named by each slice and any newly added ones after checking their actual prerequisites.
- `npm run test:affected` and `scripts/test-impact.js` supply the repository's affected-test selection.
  Inspect its supported arguments and resulting scope before use; do not invent a selection syntax.
- `npm test` and `npm run qualify:package` provide broader behaviour/package coverage when the final impact requires them.
  `check:product` and `check:repository` also contact the advisory service; they are unnecessary for this plan-only task.
  This plan does not authorize extra scans or waive the repository's existing CI/release gates.
  During later authorized implementation, select checks within the active authority and report any required but unexecuted gate explicitly rather than weakening it or claiming success.

These are planned implementation checks, not results of this planning task.
Reuse relevant valid evidence; rerun affected checks after semantic changes and source checks after final generators/formatters.
Review the final implementation as one coherent change, paying particular attention to trust boundaries, original identities and consumer compatibility.
The user's no-external-review and no-further-Security-scan instructions remain in force; do not infer review execution authority from this document.

Activate in this order when implementation and delivery are separately authorized:

1. Finish local source/contract tests and the full cold release journey; keep new promotion output disabled until all current consumers accept it.
2. Run one deliberate complete PR qualification on the final candidate.
   Require release-capable proof and retained artifacts before ordinary merge.
3. Observe the landed merge and an authorized read-only release qualification.
   Check substantive `REUSED`, original IDs, unchanged archives, the skipped fresh graph and successful current gates.
   A stopped reuse request is a diagnostic result; identify the reason before explicitly choosing fresh qualification.
   Automatic fresh fan-out is a defect.
   Check effective retention and candidate selection using provider metadata.
   Verify any later authorized cleanup separately from read-only qualification; this plan update performs no remote deletion.
4. Treat live release configuration as a separate precondition: check JSON Quality's actual environments, immutable releases, signed-history cutover and npm trusted publishers for all three package names.
   Markdown Quality's verified settings do not prove JSON Quality's settings.
   Match the actual calling workflow and environment, including parent/child OIDC permissions for reusable publication workflows.
   Staging permission does not imply dist-tag permission; owner stage inventory and approvals still require interactive authentication.
   Request only permissions needed by the selected route: direct `latest` staging does not need a separate dist-tag mutation, while a later channel promotion does.
5. Only under release authority, perform native-first staging, owner approvals, public registry qualification and immutable archival.
   A later controller-only fix may reuse still-valid package qualification after reviewing its exact delta and re-admitting the original evidence; it does not imply that a changed package tree is qualified.
6. Retain the selected complete signed checkpoint, verify it from cold custody, and then dispose of task-owned temporary bytes.
   Do not delete provider artifacts or protected refs merely to reduce storage while another consumer still needs them.

Before a new format is emitted or any effect occurs, abort by leaving the previous qualified path available and reporting the missing criterion.
After an npm/GitHub request, preserve every journal and pending approval; use the existing exact-outcome reconciliation.
Published versions, signed tags and immutable assets cannot be undone by reverting source.
Use forward repair or an explicitly approved availability operation; never reissue an uncertain write, overwrite a version or rewrite signed history.

## Observability, unknowns and reconsideration

Report useful questions through existing job summaries and compact receipts:

- Which CI run/attempt and producing jobs qualified these exact bytes?
- Why was reuse accepted or rejected, and what fresh work actually ran?
- Was fresh qualification explicitly requested, which candidate is retained, when does its first required evidence expire, and which consumers prevent predecessor cleanup?
- Which build, release and controller commits are in play?
- Which source/recipient lock and analysis identities were inspected, and when were changing facts observed?
- Which writer requests were attempted, acknowledged, unresolved or never issued?
- How large are the signed index, expanded representation and unique sidecars, and which original subjects survive renewal?

Avoid creating a second receipt merely to restate an existing authenticated receipt.
The storage target is one necessary copy per custody boundary plus compact references, not zero archive retention before publication.
The initial candidate policy keeps the latest qualified main candidate for at most 90 days, with transient replacement overlap and necessary active-consumer evidence; it does not retain every superseded candidate for a blanket 90 days.

Remaining factual uncertainties have bounded discovery routes:

| Unknown                                                                                          | Cheapest discriminating observation                                                                                                          | Conditional next step                                                                                                                                           |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Whether ordinary PR CI can collect every native/distribution prerequisite under read permissions | Exercise its real release-manifest collector against the existing native origins and provider fixtures, then one authorized hosted candidate | Reuse existing native origin custody; if unavailable, retain an explicit fresh requirement. Do not grant PR write authority.                                    |
| Complete reuse request and byte demand                                                           | Count calls, redirects and bytes through the actual resolver with representative partial reruns                                              | Share repeated immutable reads first; adjust a scoped allowance only with a resource rationale and exhaustion test.                                             |
| Necessary history expansion/storage allowance                                                    | Measure real available JSON Quality records and repeated cold export/restore                                                                 | Keep sidecars/plaintext when sufficient; otherwise select the separate bounded envelope. Oversized or uncleared staging bundles remain outside durable capture. |
| New workflow scheduling and uploader runtime                                                     | Parsed production mutations plus one authorized read-only hosted reuse run                                                                   | Repair the owning YAML/setup path; do not label an all-skipped or failed result successful.                                                                     |
| Live JSON Quality release permissions and retained cutover state                                 | Read actual package/service configuration before an authorized release                                                                       | Identify only the missing binding or custody decision; no automatic settings changes.                                                                           |

Reconsider only the affected decision if the target branch or policy changes, a schema version is allocated elsewhere, a new required consumer appears, the native API no longer supplies the necessary identity, legitimate history cannot fit the selected custody, scanner policy invalidates prior analyses, or hosted observation contradicts the rehearsal.
Continue independent work while resolving that specific gap.
Do not reopen the three agreed recovery decisions or invent a second signing/approval ceremony.

## Source register and release lessons

The donor range contains dependency/documentation preparation, artifact promotion, retained-evidence corrections and the operational fixes below.
Merge commits introduce no separate implementation to copy.
The JSON Quality baseline was inspected directly; branch labels or old plan completion statements were not treated as proof of current parity.

| Donor commits                   | Applicable lesson and planned owner                                                                                                                                        |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dabd1a0`, `7965598`            | Dependency refresh already represented; versioned documentation drift remains for slice 008.                                                                               |
| `7f8160d`, `ed55271`, `104349e` | Complete CI candidate, exact archive promotion, original locks, retained evidence and accurate operator guidance; slices 001–004 and 008.                                  |
| `7158e52`, `749a07c`, `8e04d32` | Compact history, immutable subject preservation, actual exporter coverage and narrow npm lock policy; slices 003 and 006.                                                  |
| `218b864`                       | Canonical complete scoped-package endpoint encoding; slice 007.                                                                                                            |
| `99754bb`                       | Real retained-host shape and whole-collection cost; slice 002.                                                                                                             |
| `58076b4`, `ccbffa4`            | Upload tooling must exist on the chosen path; explicit `false` cannot pass a setup guard; slice 005.                                                                       |
| `2b2e6c3`, `772b0b7`            | Exact evidence can distinguish a read-only/pre-request failure from an unknown write. Preserve the general principle, never copy incident-specific settlements; slice 007. |
| `2e6dc07`, `1d436d8`            | Complete dispatch checks, cold entry-point rehearsal, compact history, native-shaped JSON, real signature sensitivity and validated timestamps; slices 002, 006 and 007.   |
| `b002b7a`, `b4e23aa`            | Read-only jobs also need their selected npm; skipped ancestors and green no-op completion require actual DAG/gate coverage; slice 005.                                     |

The thread's hosted observations explain why helper-only proof was insufficient: run `43900658316` selected redundant fresh work, `43962402096` stopped at npm bootstrap, and `43971573004` reported success while its archival writer and completion were skipped.
After repairs, release qualification `43917797156/1` reused PR CI, public qualification `43969567116/1` passed, and archive `43980861855/1` completed using that existing public evidence.
These are historical donor observations, not fresh JSON Quality verification.
The final signed donor export was about 37 MB on the wire; copying its storage policy would conflict with JSON Quality's current smaller signed-file contract.

Current primary-source guidance was checked on 2026-11-17:

- [SLSA artifact verification](https://slsa.dev/spec/v1.2/verifying-artifacts) supports checking artifact provenance against expected producer/input policy; it does not by itself attest that tests passed.
  The [current approved specification](https://slsa.dev/spec/) resolves to version 1.2.
- [GitHub secure use](https://docs.github.com/en/actions/reference/security/secure-use) supports least privilege and careful handling of artifacts from less-trusted workflows.
- [Workflow dependency lockfiles](https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles) are now the preferred action-resolution mechanism; the [native migration procedure](https://docs.github.com/en/actions/how-tos/secure-your-work/lock-workflow-dependencies) explains local-action coverage and the `./` versus `$/` distinction relevant to this repository.
- [CodeQL analysis and query packs](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning) explain why the CLI/query versions are material reuse inputs, and why reading existing alerts is not a new analysis.
- [npm audit](https://docs.npmjs.com/cli/v12/commands/npm-audit/) supports lock-only dependency observation and distinguishes report-only audit from `audit fix`, which installs and changes dependencies.
  Do not use `fix` on qualified graphs.
- [GitHub PR events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request) distinguish the tested merge ref from the PR head, which is why original build and landed release identities must be explicit.
- [GitHub job dependencies](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-jobs) and [status expressions](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions#status-check-functions) document skip propagation and cancellation-aware conditions.
- [GitHub workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onworkflow_dispatchinputs) supplies the dispatch input count/payload contract used by local preflight.
- [GitHub workflow artifacts](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts) distinguish retained artifacts from dependency caches; [immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases) protect published asset and tag identity.
  Release title, notes, prerelease and latest classification remain mutable; they are current observations, not immutable asset identity.
- [GitHub retention settings](https://docs.github.com/en/organizations/managing-organization-settings/configuring-the-retention-period-for-github-actions-artifacts-and-logs-in-your-organization) cap public-repository retention at 90 days and also cover checks, runs and statuses.
  The candidate's usable lifetime depends on every required original record, not just its tarball upload.
- [Node zlib options](https://nodejs.org/api/zlib.html#class-options) provide a native output bound for decompression; the application still owns transport, expansion and occupancy limits.
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) describes workflow-bound OIDC and package-specific configuration.
  Existing repository staging and owner-approval policy still governs the actual release.

[hisew-plan]: https://github.com/Hadden-Industries/software-engineering-workflow/blob/89e05c2cae4c17e9c12c7845ec292dc057271bb7/skills/hadden-industries-plan-software-change/SKILL.md
[hisew-implement]: https://github.com/Hadden-Industries/software-engineering-workflow/blob/89e05c2cae4c17e9c12c7845ec292dc057271bb7/skills/hadden-industries-implement-software-change/SKILL.md
[mq-promotion]: https://github.com/Hadden-Industries/markdown-quality/blob/cc3d8f70eb8a1f8218cc2393dc23d44f82b55d2b/docs/plans/2026-11-16-release-artifact-promotion.md
[mq-ci]: https://github.com/Hadden-Industries/markdown-quality/blob/cc3d8f70eb8a1f8218cc2393dc23d44f82b55d2b/.github/workflows/ci.yml
[mq-lock]: https://github.com/Hadden-Industries/markdown-quality/commit/ed55271b4060940df4091e19d0f09cf0899d4bd4
[mq-reuse]: https://github.com/Hadden-Industries/markdown-quality/blob/cc3d8f70eb8a1f8218cc2393dc23d44f82b55d2b/scripts/release-reuse.js
[mq-hosts]: https://github.com/Hadden-Industries/markdown-quality/commit/99754bb78698e46ba7d331b13960a045c1fc7a06
[mq-qualification]: https://github.com/Hadden-Industries/markdown-quality/blob/cc3d8f70eb8a1f8218cc2393dc23d44f82b55d2b/.github/workflows/release-qualification.yml
[mq-identities]: https://github.com/Hadden-Industries/markdown-quality/blob/cc3d8f70eb8a1f8218cc2393dc23d44f82b55d2b/scripts/release-qualification.js
[mq-assets]: https://github.com/Hadden-Industries/markdown-quality/blob/cc3d8f70eb8a1f8218cc2393dc23d44f82b55d2b/scripts/release-assets.js
[mq-security]: https://github.com/Hadden-Industries/markdown-quality/blob/cc3d8f70eb8a1f8218cc2393dc23d44f82b55d2b/scripts/qualify-release-security.js
[mq-upload]: https://github.com/Hadden-Industries/markdown-quality/commit/58076b4
[mq-false]: https://github.com/Hadden-Industries/markdown-quality/commit/ccbffa4
[mq-npm]: https://github.com/Hadden-Industries/markdown-quality/commit/b002b7a98218aaf9acc84197218f3a3659380fa9
[mq-skip]: https://github.com/Hadden-Industries/markdown-quality/commit/b4e23aa25762f2180940ff94bab61db4f6888316
[mq-history-format]: https://github.com/Hadden-Industries/markdown-quality/blob/cc3d8f70eb8a1f8218cc2393dc23d44f82b55d2b/scripts/release-history-format.js
[mq-subjects]: https://github.com/Hadden-Industries/markdown-quality/commit/749a07c2554c57c380ffd42a85eb5a394a17beee
[mq-export]: https://github.com/Hadden-Industries/markdown-quality/commit/8e04d32c9a17c0c6b676141b4049ea6fdf56df7e
[mq-rehearsal]: https://github.com/Hadden-Industries/markdown-quality/blob/cc3d8f70eb8a1f8218cc2393dc23d44f82b55d2b/docs/plans/2026-11-16-release-continuation-rehearsal.md
[mq-endpoint]: https://github.com/Hadden-Industries/markdown-quality/commit/218b86425e79f041babbfcd18c2ce51466296325
[mq-rehearsal-fixes]: https://github.com/Hadden-Industries/markdown-quality/commit/1d436d85b6760a6dbbc51e9039cb2301800b4903
[mq-docs]: https://github.com/Hadden-Industries/markdown-quality/blob/cc3d8f70eb8a1f8218cc2393dc23d44f82b55d2b/scripts/release-documentation.js
[mq-version]: https://github.com/Hadden-Industries/markdown-quality/commit/79655986ead4e28b35e34c89c533420264601ee6
