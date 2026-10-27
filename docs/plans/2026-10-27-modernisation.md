# JSON Quality Modernisation Implementation Plan

Revision: 3, 27 October 2026; owner decisions from the design interview incorporated.

This is the replacement implementation plan for `json-quality`, revised from documentation commit `9b3f0cde212c783ae281a75a40177601cb97dce3`.
It proposes changes; it does not establish implementation, hosted qualification, release readiness or approval of new infrastructure.
The target is a public npm package with a deliberately narrow supported-runtime contract, reproducible npm-owned development, manually checkpointed but mandatory CI, strong package/API ergonomics, and a release path that makes the published artefact independently verifiable.

The central engineering decision is:

> **Development branches stay fast and unrestricted; marking a draft PR “Ready for review” is the deliberate request to qualify that exact accumulated change set; the protected default branch cannot accept it until that qualification has passed.**

That separates *when* expensive assurance runs from *whether* assurance is required.

The cross-repository synthesis below draws on the supplied OwlAPI CI discussion and local committed changes from 20–27 October 2026, supplemented by the earlier benchmark and trust decisions those changes rely on.
The source register records exact revisions and adoption limits.
The decisions below record the owner's answers to the design interview and govern this revision.
They settle the plan's scope and operating model; this document does not claim that implementation or verification has occurred.

| Decision            | Agreed outcome                                                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| First delivery      | Modernise the existing Windows x64 and Linux x64/glibc paths. macOS is a separate follow-up milestone and does not block this delivery.                                                    |
| Merge authority     | The owner decides when to merge and reviews changes to CI, tests and trust policy. Use native required Actions checks, with no additional required reviewer and no separate reporting App. |
| Qualification reuse | PR-to-main evidence reuse and correct partial-rerun provenance are required. Adapt the existing Markdown Quality and OwlAPI implementations.                                               |
| Reuse miss          | A lightweight main observer reports `FULL_REQUIRED` and waits for an explicit full-qualification request. It must not automatically launch the full suite.                                 |
| Evidence storage    | Diagnostic logs remain native logs. Minimise Actions artifacts to material with a named downstream consumer; preserve compact independent release proof with each published release.       |
| Deadline policy     | Use fewer shared, generous profiles inherited from the local repositories. Preserve product resource contracts and deliberate timeout tests separately.                                    |

Coordinate orchestration and performance changes with the [JavaScript performance implementation plan](2026-10-26-javascript-performance-implementation-plan.md).
Use its complete-discovery, bounded-resource and guarded-write invariants and share its measurement work.
This plan owns package, CI and release integration; it must not introduce a competing parser, resource policy or performance baseline.

## Runtime, npm and dependency contract

### Replace the Node family expression with the intended compatibility floor

Change:

```json
"engines": {
  "node": "^22.13.0 || ^24.0.0 || ^26.0.0"
}
```

to:

```json
"engines": {
  "node": ">=22.13.0"
}
```

The meaning should be made explicit throughout the repository:

- `>=22.13.0` is the **installability and compatibility floor**.
- Officially tested/support-gating releases are **maintained LTS majors**, plus the owner's explicit advance qualification of **Node 26** before its imminent LTS launch.
- Other releases satisfying the engine range receive **best-effort compatibility**, not release-blocking CI guarantees.
- Documentation should recommend the latest security-patched release of an LTS line for actual use rather than presenting `22.13.0` as a security recommendation.

As of **27 October 2026**, the Node project lists Node 22 and Node 24 as LTS and Node 26 as Current.
The owner subsequently selected **22, 24 and 26** for the initial gating matrix because Node 26's LTS launch is imminent.
Record that exception explicitly as `preLtsMajors: [26]` while metadata still classifies it as Current; this does not relabel Current as LTS or extend gating to arbitrary engine-compatible releases.
The Node project also changes its release model beginning with Node 27, so repository logic must not infer LTS status from “even major number” rules. citeturn6view0

The latest security release on 21 October 2026 produced Node 22.23.4 and 24.22.1, fixing vulnerabilities up to HIGH severity.
Those are appropriate current patch targets at the time of implementation, while `22.13.0` remains the compatibility floor. citeturn5search7

### Reshape `assets/node-support.json`

Replace the present per-family minimum model with a policy that distinguishes the package floor, the currently tested LTS majors, the canonical producer version and best-effort releases.
For example:

```json
{
  "schemaVersion": 2,
  "minimum": "22.13.0",
  "testedLtsMajors": [
    22,
    24,
    26
  ],
  "preLtsMajors": [26],
  "reference": "24.22.1",
  "platforms": [
    "ubuntu-24.04",
    "windows-2025"
  ],
  "support": {
    "otherEngineCompatibleReleases": "best-effort"
  },
  "producerNpm": {
    "version": "12.2.1",
    "range": ">=12.2.1 <13"
  }
}
```

Resolve the exact current patch for each LTS major when the policy is refreshed, record that exact version in CI evidence, and freeze it for the run.
Do not silently change the matrix midway through qualification.

Update `project-node-support.js`, `node-matrix.js`, `ci-node-policy.js`, the Node-policy tests and generated documentation so there is a single authority for:

- the `22.13.0` engine floor;
- which maintained LTS majors and explicit advance-LTS exceptions are qualified;
- exact current secure patches used by a qualification run;
- the canonical development/producer release;
- platform qualification.

Add a dedicated **minimum-floor lane for Node 22.13.0**.
Provision dependencies and the package artefact before entering that lane where practical, then perform its compatibility tests without exposing credentials.
This proves that the declared floor is real rather than merely metadata.

Update `.node-version` to the current canonical LTS patch selected by the policy.

Keep the runtime policy, resource policy and native-platform inventory as separate authorities with explicit projections.
`assets/node-support.json` owns Node/npm qualification; `schemas/configuration.schema.json` owns public resource controls; `assets/native-packages.json` owns available native companions.
Extend the existing projection/check scripts instead of duplicating those decisions in workflow YAML or test helpers.
Bind the source policy, generated projections, `package.json`, every participating lockfile and the resolved platform/runtime matrix into candidate evidence.
A changed dependency selector or policy must invalidate evidence even when an existing archive or lockfile has not changed; Universal Ontology's receipt fix demonstrates that omission.

The first delivery retains the current native inventory: Linux x64/glibc and Windows x64.
macOS is a separate follow-up milestone requiring a native build, companion package, platform/architecture selector, install path, licence evidence and release assets.
Its architecture and minimum OS support will be decided in that milestone; a runner label alone is not a support contract.
Keep macOS outside the first delivery's mandatory matrix and support claims, rather than adding a skipped compatibility lane.

### Make npm the explicit repository toolchain authority

Keep an exact producer npm in `packageManager`, updating it to the latest approved safe npm at implementation time:

```json
"packageManager": "npm@<current-approved-version>"
```

Synchronise `devEngines.packageManager` to that selected major/version policy and make a package-manager mismatch an error. npm's `devEngines` exists specifically to constrain contributor tooling before `install`, `ci` and `run` operations. citeturn7search0

All dependency and lockfile operations in scripts, CI, contributor instructions and release operations should use npm.

### Apply the dependency policy consistently

Refresh every direct and transitive dependency to its latest safe compatible release before the rest of the modernisation is qualified.

Use two deliberately different manifest policies:

```text
Runtime dependencies       exact versions
Development dependencies   >= current latest safe version
```

Thus the runtime portion of `package.json` remains deliberately controlled, while development tools remain floating forwards as requested.

Commit the npm lockfile after every refresh.
Floating development ranges do **not** make CI non-reproducible when `npm ci` consumes a committed lockfile: npm documents `package-lock.json` as the exact dependency tree needed to reproduce installations despite intermediate dependency releases. citeturn7search4

Apply the same latest/safe refresh principle to the isolated Markdown tooling dependency graph and regenerate its native npm lockfile independently.

Add automated checks that reject:

- a runtime dependency expressed as an unintended range;
- a development dependency that has become exact-pinned;
- `package.json` / lockfile drift;
- a generated Node-policy projection differing from its source policy.

### Clean root tooling configuration

Remove the unused file-type-specific indentation override from `.editorconfig`.

Also remove the conversational-source URL comment currently embedded in that file.
Repository configuration should describe the repository's policy directly rather than retain an external conversation as its authority.

## Pull-request CI and default-branch governance

This is the most important process change.

### Introduce a reusable qualification workflow and a deliberately triggered PR wrapper

Reconcile the existing workflows into the following target structure, adding only missing wrappers and shared mechanics:

```text
.github/
  workflows/
    qualification.yml
    ci.yml
    main-qualification.yml
    security.yml
    release-qualification.yml
    stage-release.yml
    release-registry.yml
    github-release.yml
    promote-release.yml
```

`qualification.yml` should be `workflow_call`-only and own the reusable package qualification mechanics.

The five release workflows listed here already exist, as does `ci.yml`.
Extend their existing contracts instead of introducing parallel implementations.
`main-qualification.yml` is the lightweight post-merge reuse observer and the explicit post-merge full-qualification entry point described below; it is separate from the PR merge gate.

`ci.yml` should be the PR acceptance wrapper.
Its principal trigger should be:

```yaml
name: CI

on:
  pull_request:
    branches:
      - main
    types:
      - ready_for_review
```

Do **not** add `push` or `synchronize` to this merge-gating workflow.

This gives the intended lifecycle:

```text
feature branch
     │
     ├── commit
     ├── commit
     ├── push
     ├── commit
     ├── push
     │
     ▼
draft PR
     │
     ├── continue changing/pushing freely
     │      no full acceptance CI
     │
     ▼
Ready for review
     │
     ▼
one qualification of that exact candidate
     │
     ├── fail → return to draft → make a batch of fixes → Ready again
     │
     └── pass → merge eligible
```

A draft PR cannot itself be merged, and GitHub permits switching between draft and ready states, making this a native manual qualification control rather than an invented CI mechanism. citeturn12search17

### Do not use `workflow_dispatch` as the merge gate

A manually dispatched Actions run is superficially attractive but is the wrong primitive for a required PR check.
GitHub documents that native Actions job checks from a `workflow_dispatch` run do not satisfy required PR status checks, even when they ran against the PR's head commit.
`pull_request` is eligible; `workflow_dispatch` is not.
This event restriction does not apply to checks created independently by a GitHub App; this plan uses native Actions checks and the owner-controlled trust boundary described below.
[GitHub required-check semantics](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks).

Therefore **“Ready for review” becomes the manual Run CI button for merge acceptance**.

Any separately retained diagnostic dispatch must remain explicitly non-gating.
An explicit post-merge or release-qualification dispatch may produce fresh evidence for the landed candidate; it must not be presented as a substitute for PR merge acceptance.

### Make a new commit invalidate acceptance without automatically rerunning CI

After a passing run, suppose the branch is:

```text
A ─ B ─ C ─ D
            ▲
          PASS
```

and another commit is pushed:

```text
A ─ B ─ C ─ D ─ E
                ▲
         not qualified
```

GitHub requires a required check to succeed on the latest relevant SHA; the result on `D` cannot satisfy the requirement for `E`. citeturn6view1

Because `synchronize` is deliberately absent, pushing `E` does **not** trigger the full suite.
It simply makes the PR non-mergeable until the author deliberately requests another qualification:

```text
convert to draft
       ↓
finish the next batch
       ↓
Ready for review
       ↓
qualify E
```

This is the exact “fast development but impossible unvalidated merge” behaviour required.

Document that a sufficiently old required check may also need to be rerun: GitHub currently requires a required check to have completed successfully in the repository within the preceding seven days. citeturn6view1

### Use a single, stable merge-gate status

Do not make the ruleset depend on every individual matrix job name.
Expose one protected check whose name never changes:

```text
CI / acceptance
```

Use a final aggregation job to report that protected check from GitHub Actions, under the owner-reviewed workflow and policy described below.
Conceptually:

```yaml
acceptance:
  name: CI / acceptance
  if: ${{ always() }}
  needs:
    - qualification
    - dependency-review
    - codeql
  runs-on: ubuntu-24.04
  steps:
    - name: Require every mandatory predecessor
      env:
        NEEDS_JSON: ${{ toJSON(needs) }}
      run: node scripts/require-successful-ci-needs.js
```

The checker must explicitly assert that **every required predecessor ended in `success`**.

This matters because GitHub treats a skipped job as a successful status for branch-protection purposes.
A required job that merely skips because an `if:` condition is false is therefore not a safe acceptance gate. citeturn7search27

Add tests for `require-successful-ci-needs.js` covering success, failure, cancelled and skipped predecessor states.

The aggregate must also compare the expected job/lane inventory with the observed inventory and require every mandatory receipt.
An empty matrix, removed dependency in `needs`, missing platform or successful process without a complete terminal record must not produce acceptance.
The job above enforces the approved qualification graph; owner review of changes to that graph and its policy is a separate obligation described below.
This PR aggregate requires the full qualification to have executed successfully.
The separate main observer may report `REUSED` only after validating the original complete inventory; skipped local work alone never establishes reuse.

### Structure qualification into reference and compatibility proof

The reusable qualification workflow should produce the package candidate **once**, then test that exact artefact rather than repacking independently on every lane.

Use:

| Job                        | Required change                                                                                                                                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reference qualification    | On the canonical current LTS/npm pair, run complete source tests, lint, formatting, architecture checks, Node-policy checks, package checks, type checks, schema checks, JSON dogfooding and package qualification. Produce one immutable `.tgz`. |
| Engine-floor qualification | Run the installed artefact on Node 22.13.0 with no release credentials.                                                                                                                                                                           |
| LTS/platform matrix        | Qualify the same `.tgz` on the latest secure Node patch for every current LTS major on the supported Ubuntu x64/glibc and Windows x64 platforms.                                                                                                  |
| Package-consumer proof     | Import every public JS entry point, consume every public schema, load the ESLint plugin, execute both binaries and verify package contents from a clean installation.                                                                             |
| Security jobs              | Run dependency review and CodeQL for the candidate.                                                                                                                                                                                               |
| Acceptance                 | Fail unless every mandatory job succeeded.                                                                                                                                                                                                        |

Qualify the installed native package on both supported platforms in the first delivery.
The later macOS milestone adds a mandatory lane only after its native-platform work is complete.

Order each lane by its real input dependencies:

```text
freeze source, policies, toolchain and locked dependency identities
        ↓
acquire approved tools and native companions
        ↓
produce and qualify generated inputs / installed-tool receipts
        ↓
run all source, package and corpus consumers of those inputs
        ↓
check the complete authored and generated JSON inventory
        ↓
freeze the candidate archive and required evidence
        ↓
qualify that exact archive in clean consumers
```

Markdown Quality's fixes place JSON-package qualification before identity/corpus consumers and the final JSON scan after all relevant producers.
Apply that ordering to `check:full`, the reusable workflow and release qualification, with one shared dependency model.
Missing or stale generated evidence must fail explicitly; a warm workspace must not hide an omitted producer.
Keep authored source and declared outputs separate so evidence produced by the final check cannot recursively expand its own input inventory.
Caches may accelerate verified acquisition, but never establish package correctness or substitute for a missing producer.
Exercise a cold-cache installation as well as normal cached execution, and key caches by platform/architecture, toolchain, native tuple and lockfile identities.

### Tolerate slow workers through explicit, layered deadlines

Adopt OwlAPI's distinction between slow infrastructure and a broken operation.
Its October fixes raised browser acquisition from 20 to a shared 30 minutes, JSON checking from four to ten minutes, and native corpus test watchdogs to two minutes, with a 15-minute JSON step and larger enclosing jobs.
Markdown Quality separately moved ordinary fixture commands to a shared 60-second watchdog while preserving deliberately short timeout tests.
The shared profiles below adapt these established policies to JSON Quality, favouring fewer and longer limits.
JSON Quality does not need browser installation merely to copy OwlAPI's pattern.

Extend `scripts/qualification-process.js`, which already declares finite install, suite, job, read and pack budgets, as the orchestration authority.
Reconcile its declared five-minute install limit and existing 45-minute job limit with the effective 20-minute acquisition policy and the agreed profiles below.
A declared constant is not proof that every caller uses it.
Project workflow step/job limits and shared test-helper defaults from that authority, or enforce their relationship with a drift check.
Keep public `runtimeControls` in the configuration schema and pass intentional repository-specific overrides through the existing API/CLI.

| Boundary                              | Shared profile                                                | Existing basis and application                                                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ordinary short command/fixture        | 120 seconds                                                   | JSON Quality's read/native budget and OwlAPI's corpus watchdog; more generous than Markdown Quality's 60 seconds. Long operations use their phase profile instead. |
| Locked tool acquisition               | 20 minutes                                                    | JSON Quality's effective acquisition policy and the isolated-tool/OwlAPI installation patterns. Include npm's inner retries within this allowance.                 |
| Complete Node suite                   | 30 minutes                                                    | JSON Quality's existing suite policy.                                                                                                                              |
| Repository JSON dogfooding            | 10 minutes inside a 15-minute step                            | OwlAPI's established upper policy; WebVOWL and Universal Ontology use five minutes. Apply this as an explicit repository invocation/policy override.               |
| Complete qualification job            | 120 minutes                                                   | OwlAPI's Windows quality job. Leave room for legitimate acquisition, suite, evidence collection and cleanup instead of truncating them at 45 minutes.              |
| Read-only evidence lookup             | 120 seconds total; at most three attempts per GET             | Extend OwlAPI's bounded reader to JSON Quality's longer read profile; all requests, bodies and waits share the logical lookup budget.                              |
| Artifact upload/reconciliation        | Four minutes inside a five-minute step; at most three uploads | OwlAPI's transport profile. Collection has a separate 15-minute budget.                                                                                            |
| Newly submitted registry availability | 30 minutes of bounded read-only observation                   | OwlAPI's availability policy, restricted to the exact already-submitted coordinates. This never retries a publication or promotion write.                          |

These are initial implementation profiles inherited from existing repositories, not claims that hosted performance has already been measured for this candidate.
Keep profile ownership central; derive enclosing step headroom rather than adding short arbitrary timers at individual call sites.
If an operation legitimately needs its full inner allowance, its outer harness must also include cleanup time and must not impose the ordinary 120-second short-command limit.
Preserve the public check default of 120 seconds, explicit user overrides, memory/admission contracts, performance targets and deliberately short timeout/cancellation tests.

Use one monotonic deadline per operation and pass the remaining allowance through nested work.
Retries, sleeps, process startup, response streaming and cleanup must not reset the budget.
Reserve time to terminate owned descendants, settle streams and release temporary/native storage before returning a terminal outcome.
Timeout, cancellation, cleanup failure and incomplete output remain incomplete qualification, never success.

Keep Node test concurrency and native session concurrency within the existing resource contract until measurements justify a change.
Bound matrix parallelism and network acquisition separately; faster local execution does not justify a hosted memory or rate-limit regression.
Use `fail-fast: false` for independent required compatibility lanes when collecting their complete failure evidence, while retaining an overall finite cost bound.

### Recover transient infrastructure failures at the correct boundary

Reuse the official GitHub client/Actions SDK where it satisfies the contract, with one shared, tested repository adapter for remaining policy.
PR proof lookup, release evidence collection and artifact reconciliation should not each implement their own retry loop.
Account for retries already performed by the SDK or npm so nested retry policies cannot multiply attempts silently.

For read-only evidence requests, adopt OwlAPI's `createRepositoryReader` model:

- At most three attempts per GET, with bounded exponential backoff and jitter, a per-request deadline, and shared elapsed-time, request-count and response-byte limits across pagination and retries.
  OwlAPI's concrete reader uses a 10-second request ceiling inside 32 requests/60 seconds and a 2 MiB response cap.
  Retain its narrow classification and request/byte accounting, but use the shared 120-second JSON Quality lookup profile; keep per-request limits in the same authority and subordinate to remaining time.
- Retry only recognised connection/reset/temporary DNS/timeout errors, HTTP 408/500/502/503/504, and confirmed rate limiting.
  Distinguish a rate-limited 403 from ordinary authorization denial.
- Respect `Retry-After` and rate-limit reset as minimum waits.
  If the required wait does not fit the remaining budget, stop the lookup; do not shorten the server's wait.
  This follows [GitHub's API guidance](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api).
- Dispose of incomplete response bodies before another request.
  Keep UTF-8/JSON parsing, schema validation, signature/hash checking and provenance admission outside the transport retry loop.
- Fail immediately for ordinary authorization failures, invalid requests, malformed evidence, digest conflicts and unclassified failures.
  A lookup error is unknown state, not proof that an artifact or publication does not exist.

Do not automatically retry tests, lint, schema failures, semantic mismatches or an entire qualification job until it turns green.
After a classified infrastructure failure, allow an explicit rerun of the affected job and its aggregate while retaining successful predecessor evidence under the provenance rules below.
A source change requires a new deliberate qualification of the new candidate.

Missing or unverifiable reuse proof makes complete qualification necessary.
The automatic main observer reports `FULL_REQUIRED` and stops; only an explicit request may launch that full qualification.
Missing *mandatory candidate/release evidence* blocks acceptance.
If proof becomes invalid after a reuse decision or a required transported archive is corrupt, fail that attempt; only a fresh, complete qualification can establish replacement evidence.

### Make artifact transport recoverable and integrity-enforcing

OwlAPI's shared artifact transport addresses a real lost-finalization response after successful tests.
Adopt its guarantees across the candidate tarball, mandatory qualification records and release collectors, adapting the smallest maintained implementation that satisfies them.
Keep logical artifact coordinates separate from physical upload attempts.
Use the official Actions artifact service/SDK; any repository wrapper must have one policy, pinned dependencies and qualified generated bundles if bundling is necessary.
Preserve the capabilities already supplied by the pinned official actions and the existing JSON Quality package/evidence readers.
OwlAPI's repository-internal actions are implementation references, not a supported external interface: their fixed policy, workspace-only paths, current-run access and naming codec do not directly match JSON Quality's callers.
Adapt only the residual recovery mechanics through the existing repository boundaries; establishing a separately supported cross-repository component is outside this delivery.

1. Freeze the payload in owned temporary storage before the first upload and hash every allowed relative path and file byte sequence into a manifest.
   Define hidden-file handling explicitly and reject unsafe paths and links.
2. Attempt the first upload immediately.
   After a classified transport failure, perform bounded current-run visibility probes before deciding whether another upload is needed.
3. If a finalized artifact exists, verify its server/archive digest and bounded archive entries against the frozen manifest before adopting it.
   A lost acknowledgement may be recovered only when the content is identical.
4. If probes establish that no finalized copy is visible, retry under a fresh physical name after bounded jitter.
   Never delete, overwrite or reuse a potentially reserved backend name to conceal an uncertain outcome.
   An unsuccessful lookup cannot authorize a new upload.
5. Collect by logical coordinate plus run, producing job/attempt and invocation identity.
   Multiple physical copies are acceptable only if their full manifests match; conflicts fail.
   Verify the selected copy again before materializing it into a new owned destination, rejecting traversal, symlink/junction ancestors and archive expansion beyond explicit limits.

Use OwlAPI's three-upload/four-minute recovery and separate 15-minute collection profiles above.
Retain JSON Quality's existing package admission authorities, including 128 MiB archive/member, 512 MiB expanded-byte, 8,192-member and 4 MiB metadata-index limits, within their declared scopes.
Map transport limits to those existing contracts and actual payloads; do not import OwlAPI's gigabyte ceilings or create a second package-size authority.
Bound inventory entries, files, compressed and expanded bytes, cumulative downloads and deadline across the whole operation.
Terminate a timed-out SDK worker and settle its handles before retiring scratch storage.

Required uploads remain required.
The existing workflow already pins `download-artifact` v8.0.2 and sets `digest-mismatch: error`; preserve that behaviour.
The pinned action also supports artifact IDs and `skip-decompress`, which should be reused where appropriate before adding custom download code.
[Pinned download action metadata](https://github.com/actions/download-artifact/blob/9000827ccba6bdab643e8b6fd33ac0654aef8333/action.yml).
Transport recovery grants no retry authority for npm staging, publication, tag changes or release creation.

### Require PR-to-main reuse and preserve partial-rerun provenance

Record the producing workflow attempt separately from the current aggregate attempt and from an artifact's transport ordinal.
OwlAPI found that retained successful jobs can appear with changed job IDs or attempt labels during a partial rerun.
Authenticate their original execution using the run ID, job name, head SHA, runner identity and start/completion timestamps against per-attempt native job inventories.
Admit only the earliest unambiguous producing attempt containing that exact execution, while requiring the latest complete aggregate inventory to succeed.
Do not relabel old evidence as newly produced.
GitHub reruns retain the original event's SHA/ref, so rerunning an old run cannot qualify a newly pushed commit. [GitHub rerun behaviour](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs).

The evidence envelope must bind source commit/tree and relevant parent/base identities, trusted workflow/policy revisions, manifest and lockfile digests, exact resolved Node/npm/native identities, OS/architecture and runner image, expected job inventory, artifact IDs/digests, producer attempts and complete result records.
Use the same verifier in PR aggregation and release admission.
Re-read mutable run/job state after downloading evidence and immediately before granting acceptance.

PR-to-main reuse is required for this delivery.
Adapt Markdown Quality's compact `scripts/ci-reuse.js` and `scripts/ci-reuse-command.js` flow and its `node:test` regression corpus, preserving source attribution.
Incorporate OwlAPI's later bounded evidence reader, API-shape handling and `scripts/github-job-execution.mjs` producing-attempt verification; do not copy Markdown Quality's older assumption that every retained job has the latest attempt label.
Use JSON Quality's existing Node matrix, policy, qualification-process and release provider/contract authorities for repository-specific inputs.
This reuses proven mechanics without introducing a new shared-component project or importing OwlAPI's Java/browser/OWL coverage graph.

Admit only an original, fully executed PR qualification for one ordinary same-repository merge with the exact tested tree, ordered parents and unchanged workflow, toolchain, policy and required artifact identities.
Ordinary merge commits are already the configured policy in JSON Quality, Markdown Quality and OwlAPI; squash/rebase merges are disabled.
Direct/forced/multiple or ambiguous merge history must not be inferred equivalent.
Never search past a newer failed attempt for an older success, or create chains of inherited reuse receipts.
Recheck the proof after transfer and independently in the final aggregate.

JSON checks are eligible for the same verified PR-result reuse as the other qualification families when their merge inputs match.
Do not exclude them solely because the checked material is JSON.
Bind their selected source inventory, trusted policy, schemas/source contracts, tool/native identities and any generated-input producer/output identities; admit reuse only when the complete required tuple and successful coverage match.
Changed or missing JSON inputs/proof require `FULL_REQUIRED` under the same deliberate-execution policy.
The owner clarified on 27 October 2026 that WebVOWL currently omits JSON from this eligibility and is being corrected separately.
That is an intended behaviour and work-in-progress reference, not evidence that the existing WebVOWL implementation already satisfies this requirement.

Use one compact, versioned `receipt.json` for cross-run reuse, retained for 30 days, following Markdown Quality.
Include the complete expected/observed inventory and concrete lane environments as well as source, policy, workflow, artifact and original-producing identities.
Do not make reuse depend accidentally on the existing one-day candidate archive: retain a consumed dependency for the proof window, or admit the recorded package result independently of retaining its archive, as the existing package-reuse design allows.
Logs remain diagnostics and are never parsed as authoritative admission evidence.

Add a separate main-only lightweight observer, triggered after a merge, that resolves current identities and attempts reuse without running the full suite.
Use the following explicit outcomes:

| Outcome         | Meaning and next action                                                                                                                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `REUSED`        | Original complete qualification has been admitted for the landed tree. Report its run and producing attempts; do not rerun the suite.                                                                                              |
| `FULL_REQUIRED` | Proof is absent, expired, incompatible or unverifiable. Report incomplete post-merge qualification, stop, and await the owner's explicit full-qualification request. Block any downstream action that requires that qualification. |
| `FULL`          | A deliberately requested full qualification has completed successfully for the exact landed candidate. Record fresh proof; merely selecting this mode is not a pass.                                                               |

OwlAPI and Markdown Quality automatically run full qualification on a main reuse miss; do not copy that YAML behaviour here.
Branch pushes and PR `synchronize` remain free of full CI, and the main observer must not silently spend a full run either.
If admitted proof changes before the final aggregate, invalidate that attempt and require an explicit fresh qualification.

Keep commit-bound release candidate creation, registry checks and release qualification fresh.
JSON Quality's package/release contracts bind exact source commit and archive bytes; a reused PR result does not authorise republishing its tarball as a newly built main/release candidate.
A changed version tree or package family requires the corresponding fresh evidence.

### Minimise artifacts and preserve durable release proof

Emit structured phase records using the existing qualification helper: effective deadline, elapsed time, source/toolchain/runner identity, attempt count, retry classification, server wait, transferred bytes and terminal outcome.
Make a product failure, an infrastructure failure, a resource refusal and incomplete evidence distinguishable without reading thousands of log lines.
Write ordinary diagnostics to native stdout/stderr and present concise results in job summaries.
Summaries and a zero exit code alone are not admission evidence.

Adopt the reduction demonstrated by Markdown Quality's routine registry qualification: its JSON result goes to stdout without a duplicate report artifact, while deliberate release collectors retain the exact records they consume.
OwlAPI supplies robust transport but still has 39 upload sites, including residual diagnostic uploads; do not reproduce that inventory merely to reuse its transport guarantees.
The owner's policy is stricter than those residual examples: actual logs remain logs.

| Material                                                                    | Destination and retention                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test/npm output, debug messages, diagnostic traces and failure explanations | Native GitHub Actions logs, with concise job summaries. Do not copy `.log`, text-driver or diagnostic dump files into artifacts or release evidence. Exclude secrets and private fixture contents.                                                          |
| Same-run transfers                                                          | One-day artifacts only when a downstream job needs exact bytes that cannot remain local to the producer. Consolidate compatible transfers without weakening recovery records.                                                                               |
| PR reuse receipts and candidate/release inputs                              | Compact structured proof and required package bytes, normally 30 days. Each upload declares its consumer, byte contract and reason for retention.                                                                                                           |
| Effect journals and registry/recovery records                               | Preserve the existing 90-day operational artifact class where required for one-shot effects, and archive the necessary compact history before expiry. These are machine recovery records, not diagnostic logs.                                              |
| Necessary raw performance observations                                      | Retain only observations and reconstruction manifests required by the measurement contract; omit copied corpora, installed dependencies, caches and driver logs.                                                                                            |
| Published-release proof                                                     | Immutable release assets retained for the lifetime of the published release: exact package family and required source/licence material, SBOMs, manifest/digests, provenance, authenticated qualification/run/job identities and necessary recovery records. |

An upload without a named consumer is not justified by labelling it evidence.
The existing seven-day routine and fourteen-day failure report classes do not authorise new diagnostic uploads.
Keep source digests, corpus manifests and reconstruction inputs instead of duplicate large successful corpora where exact reconstruction is demonstrated.
Missing required proof yields `FULL_REQUIRED` and an explicit qualification request, or blocks release admission; it never implies success.

GitHub's native retention setting also expires run/check/status metadata alongside logs; do not assume that a short log policy leaves historical native proof available forever.
[GitHub retention policy](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository).
Preserve the minimal authenticated run/job/provenance records in the independent release proof before provider expiry.
Extend the existing signed-history checkpoint and release-reader path: it currently substitutes missing artifacts while enumerating live runs, which is insufficient when those runs also disappear.
Historical verification must admit the preserved proof without depending on expired native metadata, and must fail on an incomplete or conflicting checkpoint.
Retain native logs under the supported workflow-retention policy; do not implement a second log archive to solve metadata survival.

### Keep performance measurements credible

For the linked performance plan, adopt WebVOWL's executable quiet-host preflight and recorded environment/load state for release-gated benchmarks.
Keep cold/warm cohorts, fixtures, raw samples, runtime/lock identities, aggregation and noise policy explicit.
Contended-run observations may inform CI watchdog sizing but cannot silently replace a controlled performance baseline.
Retain an invalid measurement and its evidenced exclusion reason; do not select a favourable retry or loosen a performance threshold to compensate for setup contention.
Corroborate an apparent regression on the controlled workload before classifying it, and keep the acceptance claim unresolved while measurement quality is insufficient.

### Make CI secure by construction

Set workflow-level permissions to:

```yaml
permissions:
  contents: read
```

and elevate individual jobs only where their function requires it.
CodeQL receives only its required `security-events` permission; publishing receives OIDC only inside the publisher job.

Use:

```yaml
- uses: actions/checkout@<full-commit-sha>
  with:
    persist-credentials: false
```

for external actions generally, with full reviewed commit SHAs and an adjacent release-version comment.
GitHub identifies full-length SHA pinning as the safest stable way to prevent a mutable tag from changing what code executes. citeturn5search1turn5search13

Add PR-level concurrency so a newly requested qualification cancels a superseded in-progress qualification for the same PR:

```yaml
concurrency:
  group: json-quality-pr-${{ github.event.pull_request.number }}
  cancel-in-progress: true
```

Do not use path filters on the required workflow.
A required workflow skipped by filtering can remain pending and block the PR in confusing ways. citeturn5search8

### Preserve the owner-controlled trust boundary

Preserve JSON Quality's existing trusted/candidate separation in `docs/ci-trust.md` and `.github/workflows/json-quality.yml`.
The trusted JSON policy comes from an independently selected immutable commit; candidate policy is checked data and cannot select code, dependencies, exclusions or schemas with network authority.
Keep the producer's complete package tests distinct from the narrower `immutable-git-json` consumer claim.

Use the operating model already established in OwlAPI and documented in Markdown Quality: native required checks plus the owner's deliberate merge decision.
The owner reviews changes to CI, tests, verification helpers and trust policy before merging and accepts the exact candidate and attributable qualification run.
There is no additional mandatory reviewer, unattended merge authority, separately managed reporting App, new App private key or credentialed admission service in this delivery.

State the boundary accurately: selecting a check name and the GitHub Actions App does not pin the workflow implementation behind that name.
A candidate-controlled workflow can be changed to omit checks; SHA-pinned dependencies and `CODEOWNERS` routing do not independently prevent that change.
Owner review of the verification code/policy closes this operational trust boundary; do not claim automated protection against a deceptive replacement workflow.
Within that approved policy, the aggregate and reuse verifier still enforce exact source identity, complete job inventory, current results and mandatory proof.
Changed source/base/policy invalidates earlier acceptance, and delayed reports must not qualify a different candidate.

Do not silently substitute an organisation ruleset's required-workflow feature for the deliberate trigger model.
GitHub documents that such workflows ignore `types` filters and run on default PR activity types, including `synchronize`; directly putting full qualification there would change the agreed cost model.
[GitHub ruleset workflows](https://docs.github.com/en/enterprise-cloud%40latest/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets#require-workflows-to-pass-before-merging).
Revisit a separate reporting identity only if the owner later requests unattended merging or independently enforced workflow-origin admission.
That would be a new design decision with its own credential isolation and recovery proof, not an implicit requirement of this plan.

### Activate a default-branch ruleset

After `CI / acceptance` has existed at least once and can be selected as a status check, create an **active branch ruleset** targeting the default branch with:

| Rule                                  | Configuration                                                   |
| ------------------------------------- | --------------------------------------------------------------- |
| Require a pull request before merging | Enabled                                                         |
| Required approvals                    | Zero additional required reviewers; owner decides when to merge |
| Require status checks                 | `CI / acceptance` from the GitHub Actions App                   |
| Require branch to be up to date       | Enabled                                                         |
| Require conversation resolution       | Enabled                                                         |
| Block force pushes                    | Enabled                                                         |
| Block deletion                        | Enabled                                                         |
| Bypass                                | None for ordinary development/merge operations                  |

GitHub's strict required-status mode requires the topic branch to be current with the base before it can merge, preventing acceptance against an obsolete base. citeturn7search5turn12search16

If `main` advances after a qualification, update the PR branch, convert it back to draft and mark it ready again.
That deliberately spends another qualification only when the integration candidate has actually changed.

The implementation acceptance test for the ruleset should explicitly demonstrate all six states:

| Scenario                          | Required outcome                                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Push repeatedly to feature branch | No full CI                                                                                                |
| Push repeatedly to draft PR       | No full CI                                                                                                |
| Mark draft Ready for review       | Full CI runs once                                                                                         |
| CI fails                          | Merge blocked                                                                                             |
| CI passes                         | Merge eligible                                                                                            |
| Push another commit after PASS    | No automatic full CI; merge immediately becomes blocked until a new Ready-for-review qualification passes |

A direct ordinary push to the protected default branch must also be rejected.
Also demonstrate that a check with the same name from an unexpected App cannot satisfy the configured source restriction.
Review the workflow/test-policy change path with the owner; rejection of a deceptive workflow under the accepted model is an owner-review obligation, not a claimed automatic GitHub guarantee.

## Public API, schemas and package quality

### Add first-class type information without changing the implementation language

Make the JavaScript public API statically checkable using JSDoc plus a current TypeScript compiler as development tooling.

Add:

```text
tsconfig.json
types/
  index.d.ts
  eslint/index.d.ts
```

Annotate all public API inputs, outputs and structured contracts in source JSDoc and enable strict `checkJs`.

Generate declarations deterministically and either commit the generated declarations or generate them into a controlled packaging stage whose output is byte-verified.
Given this repository's emphasis on source/artefact identity, the simpler contract is to commit them and have CI reject regeneration drift.

Change the root export metadata along these lines:

```json
{
  "types": "./types/index.d.ts",
  "exports": {
    ".": {
      "types": "./types/index.d.ts",
      "import": "./src/index.js"
    },
    "./eslint": {
      "types": "./types/eslint/index.d.ts",
      "import": "./src/eslint/index.js"
    }
  }
}
```

Retain the JSON-schema subpath exports, but add consumer compile tests proving that:

- root ESM import resolves correctly;
- named exports have the promised signatures;
- the ESLint plugin has a usable type;
- unsupported internal paths remain unexported;
- a tiny external consumer can type-check using normal Node module resolution.

Add scripts such as:

```json
"check:types": "tsc -p tsconfig.json --noEmit",
"build:types": "tsc -p tsconfig.types.json",
"check:types:generated": "..."
```

and make them part of `check:full`.

### Modernise the public JSON Schemas before stable publication

The package currently mixes Draft 7 public schemas with a 2020-12 release schema.
Standardise the public contract schemas on **JSON Schema 2020-12**, which remains the current published JSON Schema version.
JSON Schema also recommends explicitly declaring `$schema` and using a stable `$id` for real-world schemas. citeturn14search0turn14search2

For each public schema:

```text
configuration.schema.json
source-contract.schema.json
event.schema.json
```

add or standardise:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "<stable project-controlled URI>"
}
```

Then:

- migrate Draft-7-only structure to 2020-12 equivalents;
- migrate `definitions` to `$defs` where applicable;
- make inter-schema `$ref` resolution use the declared identifiers coherently;
- switch runtime compilation to Ajv's 2020-12 implementation;
- compile every schema with strict validation enabled;
- validate each documentation example;
- include deliberately invalid fixtures proving key constraints;
- verify every schema exported through `package.json` is the same byte content used by runtime validation.

If project-controlled GitHub Pages identifiers are used, actually publish the corresponding versioned schemas there rather than leaving identifiers as aspirational addresses.
The implementation uses stable logical GitHub identifiers registered offline from package exports, not a Pages/download service.
The current cohort-2 package no longer exports the earlier result/document-request/document-response envelopes; those retired schemas are outside this migration.

Make schema-version evolution explicit: a breaking wire/configuration schema change requires a new `schemaVersion` and documented migration, independently of package SemVer.

### Strengthen package-level static checking

Add `@eslint/js` as a floating development dependency and extend the repository's ESLint flat configuration from ESLint's recommended JavaScript rules before layering the package's custom rule and repository-specific rules.

Modern ESLint's flat configuration is the default configuration system, and plugins can publish reusable configurations rather than making consumers reconstruct rule wiring manually. citeturn9search0turn9search7

Fix all newly exposed findings rather than disabling the recommended configuration wholesale.

### Turn the exported ESLint rule into a complete public plugin interface

Expand `src/eslint/index.js` from a bare rules object to include:

```js
{
  meta: {
    name: "@hadden-industries/json-quality",
    version: packageVersion
  },
  rules: {
    "no-json-stringify-identity": ...
  },
  configs: {
    recommended: ...
  }
}
```

Provide a flat-config consumer experience such as:

```js
import jsonQuality from "@hadden-industries/json-quality/eslint";

export default [
  jsonQuality.configs.recommended,
];
```

Add a dedicated rule reference describing:

- what is detected;
- examples that fail;
- examples that pass;
- the explicit identity-contract escape hatch;
- resource-limit options;
- why each diagnostic exists.

Add tests that load the **packed** plugin through ESLint using exactly the documented configuration.

### Add dedicated npm-package validation

Add `publint` as a floating development dependency and run it in strict mode against the candidate package artefact.
Its purpose is to detect npm-package metadata/export/resolution compatibility problems that ordinary unit tests do not exercise. citeturn10search6

Add an explicit package contract check covering:

```text
package name
version
licence identifier
engines
bin entries
exports
types
files included
files forbidden
repository metadata
dependency classes
absence of undeclared package entry points
```

Integrate the new checks into:

```text
check:full
release qualification
packaged-consumer qualification
```

### Introduce public-API regression fixtures

Create small fixtures under `tests/consumers/` for:

```text
library API
CLI
qualification CLI
ESLint plugin
configuration schema
result schema
document request/response schemas
typed ESM consumer
```

Each fixture should consume an installed `.tgz`, never source-relative paths.
This ensures the tests prove what npm users actually receive.

Add an explicit exported-name contract test so accidentally adding, removing or renaming a root export becomes a conscious public-API decision.

## Security and dependency automation

### Add Dependabot configuration for npm and GitHub Actions

Create `.github/dependabot.yml` covering at minimum:

```text
npm             /
github-actions  /
```

and the isolated development-tooling npm graph where that graph can be maintained through ordinary npm metadata.

Use a regular scheduled update cadence and grouping that keeps related development updates together.
Enable Dependabot security updates so patched versions produce PRs independently of the normal version-update schedule.
GitHub documents version updates as keeping dependencies current and security updates as opening PRs for vulnerable dependencies with available fixes. citeturn7search3turn7search7

For SHA-pinned Actions, keep the release tag/version comment on the same line; Dependabot understands that format when updating Actions references. citeturn7search17

Dependabot PRs must pass the same normal acceptance gate before merging.
When a bot PR is created already in the ready state, convert it to draft and back to Ready when the candidate is consciously ready for its merge-gating run.

### Add dependency review to PR acceptance

Add `actions/dependency-review-action` as a mandatory `ci.yml` job.

Configure it to fail when a PR introduces a dependency with an unacceptable known vulnerability severity.
GitHub's dependency-review action specifically compares PR dependency changes and can fail the check when new vulnerable dependencies are introduced. citeturn7search2turn7search10

The final `CI / acceptance` job must depend on this result.

### Add CodeQL to the deliberate acceptance checkpoint

Configure CodeQL for JavaScript/TypeScript and run it:

```text
on PR ready-for-review qualification
on a weekly scheduled default-branch security scan
on explicit security workflow dispatch
```

Do not run it on every feature-branch push.

Use the explicit language rather than asking CodeQL to discover every language; GitHub recommends explicit language configuration where multiple possibilities could otherwise be analysed sequentially. citeturn6view5

Make the PR CodeQL result a predecessor of `CI / acceptance`.

### Add dependency vulnerability gates

Add a security script that checks both the runtime graph and complete development graph after the dependency refresh.

For release acceptance:

- no known high/critical runtime vulnerability may be unresolved;
- any lower-severity exception must have a repository-tracked disposition;
- development-tool vulnerabilities that execute during qualification or release receive the same treatment as build-system vulnerabilities, rather than being dismissed because they are not shipped.

Record the dependency graph/SBOM and audit evidence against the exact release candidate.

Cover the root graph, isolated Markdown/CI-tool graphs and native companions separately, including original third-party licence/notice evidence and generated-tool bundle inputs where applicable.
Record the advisory source, observation time and policy/exception revision; an unavailable audit service is incomplete security evidence, not a clean result.
Apply the bounded read-retry policy to transient advisory acquisition failures, then keep unresolved findings and unavailable mandatory evidence blocking under the declared release policy.
Refresh the action allowlist and dependency provenance together with pins so a valid reviewed update is not rejected by a stale projection.

### Harden GitHub Actions settings

Configure repository Actions settings to:

- default `GITHUB_TOKEN` to read-only;
- prevent fork PRs from receiving secrets;
- prevent fork PRs from receiving write tokens;
- require explicit approval before untrusted external PR workflows are allowed to execute where appropriate;
- constrain the set of usable third-party Actions;
- require immutable action identities where the organisation policy supports it.

GitHub emphasises fresh build environments, known build dependencies, least privilege and immutable build dependencies as core build-system security measures. citeturn8view1

Add `CODEOWNERS` entries for sensitive surfaces such as:

```text
/.github/
/package.json
/package-lock.json
/scripts/release-*
/schemas/
/SECURITY.md
```

Use those entries for review routing and visibility; do not make an additional human approval mandatory for the sole-maintainer normal merge path.

### Enable repository-level secret protection

Enable GitHub secret scanning and push protection for the public repository, and make accidental credential material a hard repository-policy failure rather than relying on release review to notice it.

## Release and supply-chain publication

### Harden and integrate the existing release workflows

The five qualification, staging, registry, GitHub-release and promotion workflows already exist.
Reconcile them with the existing release-contract scripts and extend the missing guarantees described here, preserving the owned effect/recovery path instead of creating a second release implementation.

The intended chain should be:

```text
merged, protected main
        │
        ▼
release-qualification.yml
        │
        │ exact tarball + manifest + evidence
        ▼
owner review
        │
        ▼
stage-release.yml
        │
        │ OIDC, stage only
        ▼
npm staged candidate
        │
        ▼
interactive owner inspection + 2FA approval
        │
        ▼
release-registry.yml
        │
        │ qualify exact public registry bytes
        ▼
github-release.yml
        │
        ▼
immutable GitHub release
        │
        ▼
promote-release.yml
        │
        ▼
intended npm dist-tag
```

Every downstream workflow must identify and cryptographically bind its exact predecessor rather than simply accepting “the latest successful run”.

Bind both dependency declarations and locks, all participating policy/tool identities, native companions, generated outputs and the qualified archive into that predecessor record.
Universal Ontology's October receipt repair added the dependency-selecting `package.json` after a changed selector could otherwise escape an output/lock-only receipt.
Reject changed selectors, stale outputs, missing files and unexpected release inventory even if a deployment command supports `force`.
Keep the candidate frozen between qualification and publication; any mutation creates a new candidate requiring the affected proof again.

### Preserve one-shot release effects and reconcile uncertain outcomes

Retain the existing division between `scripts/release-provider.js`, `scripts/release-effects.js` and `scripts/release-recovery.js`.
Record durable intent before each external effect and its observed result afterwards.
A connection loss after submission is `outcome-unknown`, not permission to repeat npm staging, publication, GitHub release creation or a dist-tag change.
Use bounded read-only provider reconciliation against exact package/version, stage/release identity, tag target and artifact digests before continuing.
An unresolved or conflicting outcome stops the chain with the journal and recovery instructions intact.
Preserve the existing requirement for explicit owner repair authority when readback cannot settle the effect.

Serialize release work by candidate/package identity and do not apply PR-style `cancel-in-progress` to publication.
Recover after interruption from durable records, never from a successful-looking summary or by assuming that a missing response means no external change occurred.
Rehearse failure before submission, loss of acknowledgement after submission and interruption between effect and receipt without issuing duplicate effects.
Immutable publication recovery may require a forward fix or a separately authorised tag correction; do not promise deletion or rollback of an immutable release.

### Replace npm publication secrets with trusted publishing

Configure npm Trusted Publishing for the exact GitHub repository and exact staging workflow.

npm Trusted Publishing uses OIDC and eliminates long-lived npm publication tokens. npm currently requires npm CLI 11.5.1 or later and Node 22.14.0 or later for trusted publishing, and supports GitHub-hosted Actions runners. citeturn6view3

Therefore the publishing workflow should run on the canonical current LTS Node release, not the package's 22.13.0 compatibility-floor lane.

Grant:

```yaml
permissions:
  contents: read
  id-token: write
```

only to the actual npm staging job.

Do not put an `NPM_TOKEN` or other long-lived registry write credential in Actions secrets.

Trusted publishing automatically generates npm provenance for public packages, rather than requiring a separately managed provenance credential. citeturn5search6

### Make staged publishing the only normal package-publication route

Configure the trusted publisher so it may **stage** but may not directly publish.

npm staged publishing is specifically designed to let automation prepare a package while deferring the publication decision to an interactive human proof-of-presence/2FA action. citeturn6view4

The staging workflow should:

1. admit the exact previously qualified source SHA and tarball;
2. independently recalculate its hashes;
3. invoke `npm stage publish` on that exact archive;
4. record stage identity and returned registry evidence;
5. stop.

The owner then inspects and approves the staged candidate interactively with 2FA.

At npm package-account level, select the recommended policy that requires 2FA and disallows ordinary publication tokens. npm explicitly recommends this in conjunction with staged publishing. citeturn6view4

### Separate publication and dist-tag authority

Configure a distinct trusted-publisher identity/workflow for `promote-release.yml` that may manage dist-tags but cannot directly publish a new package version.

npm's trusted-publisher permissions treat staging, direct publishing and dist-tag management independently, allowing exactly this privilege separation. citeturn6view3

Stable and prerelease promotion must therefore become explicit, auditable state changes rather than side-effects of uploading the package.

### Requalify the registry artefact

After stage approval makes the candidate available, download it anonymously from the public npm registry by exact version and verify:

- package identity;
- integrity;
- provenance;
- expected workflow/repository/source identity;
- installed file set;
- public entry points;
- CLI behaviour;
- ESLint-plugin behaviour;
- schema behaviour;
- LTS/runtime compatibility.

The release workflow must prove that the registry artefact is the candidate that passed qualification, rather than treating successful upload as sufficient evidence.

### Add GitHub build attestations for release artefacts

For release artefacts attached to GitHub, generate GitHub artifact provenance attestations against the exact tarball and associated SBOM/evidence.
GitHub describes artifact attestations as cryptographically signed claims binding a build artefact to its repository, workflow, commit and build environment. citeturn8view1

Verify the attestation before publishing the GitHub release.

### Enable and enforce immutable GitHub releases

Create the GitHub release as a **draft**, attach all intended artefacts, verify them, and only then publish it.

Enable immutable releases at repository level.
Once published immutably, GitHub prevents the release assets from being changed or deleted and locks the associated tag against movement. citeturn15search0

GitHub itself recommends drafting first so all assets can be attached before the release becomes immutable. citeturn15search1

The release workflow should attach at least:

```text
qualified package archive
release manifest
checksums
SBOM
qualification/acceptance evidence
provenance/attestation material needed by consumers
```

and perform a post-publication verification of the immutable release and uploaded assets.

### Add a public changelog

Add `CHANGELOG.md` as a release-facing record of user-visible changes.

Every release PR must update it under one of:

```text
Added
Changed
Deprecated
Removed
Fixed
Security
```

Breaking API/schema/configuration/CLI changes must be called out explicitly and drive the appropriate SemVer change. npm uses SemVer ranges as the package-version compatibility model, so package versioning and public contract changes need to remain aligned. citeturn7search12

Release notes should be derived from the reviewed changelog and release manifest, not invented independently after the package has been published.

## Documentation and contributor experience

### Rebuild the top of the README around a new user's first five minutes

Move maintainer/release internals out of the opening path and make the public README lead with:

```text
What JSON Quality does
        ↓
Why a developer would use it
        ↓
Install with npm
        ↓
minimal configuration
        ↓
check a repository
        ↓
format a repository
        ↓
use the library
        ↓
use the ESLint plugin
        ↓
Node support policy
        ↓
links to full references
```

Use the npm-only installation:

```sh
npm install --save-dev --save-exact @hadden-industries/json-quality
```

and prefer repo-local execution examples such as:

```sh
npm exec -- json-quality check --root .
npm exec -- json-quality format --root . -- authored.json
```

Add concise badges for:

- npm package/version;
- required CI;
- Node floor;
- licence;
- release provenance/security status where a stable badge exists.

Remove development-candidate and unpublished-package wording once the first public release is actually available.

### Add explicit API and CLI references

Create or expand:

```text
docs/
  api.md
  cli.md
  configuration.md
```

`api.md` should document every root export with:

- signature;
- input shape;
- output shape;
- synchronous/asynchronous behaviour;
- filesystem/network side effects;
- errors;
- resource-limit behaviour;
- minimal example.

`cli.md` should document every verb and option, including:

- exact correspondence to library operations;
- exit status meanings;
- stdout/stderr contracts;
- JSON output mode;
- file-selection semantics;
- check-versus-write behaviour;
- examples of operational failure versus quality failure.

`configuration.md` should be the human companion to the machine-readable schema, with examples that are executed by tests.

Create tested examples under a repository `examples/` area and use those exact files in documentation snippets wherever practical, so documentation cannot silently diverge from supported behaviour.

### Rewrite contributor workflow around draft PR qualification

Replace all contributor-facing statements that permit a direct-default-branch development model or present Actions' **Run workflow** button as product acceptance.

`CONTRIBUTING.md` should prescribe:

```text
create feature branch
        ↓
open draft PR
        ↓
commit/push freely
        ↓
run local focused checks as useful
        ↓
finish candidate
        ↓
mark Ready for review
        ↓
full hosted acceptance
        ↓
fix in draft if necessary
        ↓
Ready again
        ↓
owner reviews and merges after CI / acceptance passes
```

Explicitly explain that:

- full qualification deliberately does not run on every pushed commit; the main observer performs only lightweight reuse admission automatically;
- Ready-for-review means “qualify this exact candidate”;
- a later commit makes the previous result obsolete without automatically spending another run;
- the author returns to draft, batches further changes, and requests qualification again;
- updating against a changed `main` also requires requalification.

After the ordinary merge, the lightweight main observer admits the original proof as `REUSED` or reports `FULL_REQUIRED`.
The latter requires the owner's explicit full-qualification request; it must not launch the suite automatically.
Document that this post-merge dispatch is distinct from the ready-for-review PR acceptance trigger, and that source-commit-bound release qualification remains fresh.

Update the same policy consistently in:

```text
README.md
CONTRIBUTING.md
docs/ci-trust.md
docs/node-runtime-compatibility.md
docs/release-operations.md
```

In particular, remove language preserving a direct-to-default-branch model and remove merge-gating instructions based on `gh workflow run`.

### Rewrite Node support wording to match the intended `owlapi` model

Use one short policy everywhere:

> JSON Quality requires Node.js `>=22.13.0`.
> Official qualification covers maintained LTS Node major versions and the owner's explicit advance Node 26 lane.
> Other engine-compatible Node releases receive best-effort support.
> Use a current security-patched LTS release for production use.

The LTS list itself should be generated/projected from `assets/node-support.json`, not copied manually into multiple documents.

### Add issue forms and a PR template

Add:

```text
.github/
  ISSUE_TEMPLATE/
    bug.yml
    feature.yml
    config.yml
  pull_request_template.md
  CODEOWNERS
```

The bug form should require the information actually needed to reproduce this package's failures:

```text
package/source version
Node version
npm version
OS
command/API operation
minimal configuration
minimal non-sensitive input
expected result
actual result
exit code/diagnostics
```

The PR template should require:

```text
problem being solved
public contract affected
schema/config/API/CLI compatibility effect
tests added/changed
documentation changed
dependency changes
security implications
release-note/changelog entry
```

Do not turn the template into a second test checklist; CI remains authoritative.

### Add a documentation index and separate normative material from history

Add `docs/README.md` dividing documentation into:

```text
Using the package
Public contracts
Architecture
Contributor/development guidance
Release/security operations
Historical implementation/proof records
```

Move old implementation/proof material out of the normal consumer navigation path.

Remove obsolete auxiliary-runtime references from active package configuration and normative documentation so the documented implementation surface corresponds to the actual package.

## Cross-repository source register

These are locally inspected committed sources, not a claim that every associated release path has been exercised or that the local checkout is the latest remote state.
Uncommitted changes in source repositories are excluded from the adopted implementation evidence.
The supplied OwlAPI discussion identifies the incidents and follow-up intent; the paths and immutable revisions below anchor the transferred requirements.

| Source                                          | Committed evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Transfer and limit                                                                                                                                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OwlAPI: slow-worker budgets                     | [Shared browser-install limit, 23 October](https://github.com/Hadden-Industries/owlapi/commit/59bf51bea1454382bfa90bb1c4f11d338f380174); [JSON/corpus deadlines, 24 October](https://github.com/Hadden-Industries/owlapi/commit/57182f3b10037690a54eca33faf18e9e56f5c047); [archive-corpus alignment](https://github.com/Hadden-Industries/owlapi/commit/4cafbdc6bab51c979c7a6219a32ec912459d96c3). Paths: `.github/workflows/ci.yml`, `.json-quality.json`, `util/third-party-evidence/`. | Shared phase budgets and enclosing headroom. Browser acquisition and OwlAPI's exact corpus sizes are not JSON Quality requirements.                                                             |
| OwlAPI: transient evidence reads                | [Bounded reader, 22 October](https://github.com/Hadden-Industries/owlapi/blob/e27a962a92b38a0aeaff4396138d1464f3c7e80e/scripts/ci-verification-command.mjs).                                                                                                                                                                                                                                                                                                                               | Narrow retry classification, jitter, server waits and one aggregate budget; proof validation stays outside retry.                                                                               |
| OwlAPI: immutable transport                     | [Transport decision and guarantees, 22 October](https://github.com/Hadden-Industries/owlapi/blob/ffd812eb0ef9f3019f2c7f439fc56c08badcc48b/docs/release/artifact-transport.md), with shared `retain-artifact` / `collect-artifacts` actions.                                                                                                                                                                                                                                                | Reconcile lost acknowledgements and admit only byte-identical copies. Its documented release-path qualification remains pending; merged CI code is not release proof.                           |
| OwlAPI: partial-rerun provenance                | [Execution identity repair, 23 October](https://github.com/Hadden-Industries/owlapi/commit/2f2dc35d974f31a7098895b9b8cbc22fb1ec6bc4). Paths: `scripts/github-job-execution.mjs`, `docs/adr/0011-full-ci-qualification-lineage.md`.                                                                                                                                                                                                                                                         | Preserve original producing attempts and authenticate retained jobs rather than trusting mutable attempt labels.                                                                                |
| Markdown Quality: harness headroom              | [Fixture/verification fixes, 25 October](https://github.com/Hadden-Industries/markdown-quality/commit/0d09219e11ff3bad8d1daa17e49e2074a1f1c4b7). Paths: `test/helpers.js`, process/cancellation tests, `scripts/verify.js`.                                                                                                                                                                                                                                                                | Shared 60-second ordinary-command watchdog; explicit timeout behaviour stays short and tested.                                                                                                  |
| Markdown Quality: producer ordering             | [Qualify JSON tools before consumers, 24 October](https://github.com/Hadden-Industries/markdown-quality/commit/65afef820be683f6c46181f1375a969d773fb9e3), together with the later `scripts/verify.js` change above.                                                                                                                                                                                                                                                                        | Fresh installed-tool proof before identity/corpus checks; final JSON inventory after producers; immediate native exit-code handling on Windows.                                                 |
| Markdown Quality: trust and evidence retention  | [CI trust document](https://github.com/Hadden-Industries/markdown-quality/blob/04b932bc37109a45600d231cfc63ab6f6c812821/docs/ci-trust.md).                                                                                                                                                                                                                                                                                                                                                 | Separate trusted control from candidate data, authenticate reused proof and retain exact release records. Its manual pilot approval model is not adopted as an extra reviewer requirement here. |
| WebVOWL: consumer deadline                      | [Registry-tool and corpus fix, 25 October](https://github.com/Hadden-Industries/webvowl/commit/4aad0f1390a7e724ceb67c5362f05872f9b0fcaa). Paths: `.json-quality.json`, `tooling/json/`, `util/installRepositoryQualityTools.mjs`.                                                                                                                                                                                                                                                          | Explicit five-minute consumer check policy and locked native-capable tooling; do not increase global product defaults merely for one corpus.                                                    |
| WebVOWL: measurement validity                   | [Quiet-host ADR](https://github.com/Hadden-Industries/webvowl/blob/b30feb5f3161c80451ecd4805b13e0ef0da0904a/docs/adr/0003-quiescent-benchmark-environment.md); [23 October results and qualifications](https://github.com/Hadden-Industries/webvowl/blob/b35e0ed6ffae6b2776b850a2931745d53544c1e2/docs/plans/2026-10-23-foreground-performance-results.md).                                                                                                                                | Executable load preflight, retained raw evidence and explicit exclusions. The contended-host observations do not establish compliance with the original quiet-host protocol.                    |
| Universal Ontology: generated JSON and receipts | [Five-minute generated-JSON check, 26 October](https://github.com/Hadden-Industries/universal-ontology/commit/738938e9efd24fac1309d761c4d1a77bc11ee501); [bind the dependency selector, 27 October](https://github.com/Hadden-Industries/universal-ontology/commit/d43376ba8384a0c6a7206e7db192dc3bc61b7a0e). Paths: `.github/workflows/development-checks.yml`, `scripts/build/fullOntologyAssets.js`, `tests/test_upload_to_s3.py`.                                                      | Check generated outputs after creation; bind manifests as well as locks and outputs; reject changed selectors, corruption and unexpected files even under a force option.                       |
| JSON Quality: existing authorities              | [Inspected baseline](https://github.com/Hadden-Industries/json-quality/tree/9b3f0cde212c783ae281a75a40177601cb97dce3). Paths: `scripts/qualification-process.js`, `scripts/release-{provider,effects,recovery}.js`, `schemas/configuration.schema.json`, `assets/native-packages.json`, `docs/ci-trust.md`.                                                                                                                                                                                | Extend the existing bounded process, native/resource, trusted-consumer and one-shot release mechanisms rather than adding parallel implementations.                                             |

Additional implementation anchors resolved during the design interview:

- Markdown Quality's [initial reuse implementation](https://github.com/Hadden-Industries/markdown-quality/commit/aec44f56b528af592ad6ba7e1e114e333246c19c) and [current policy revision](https://github.com/Hadden-Industries/markdown-quality/commit/a0b7a78b10ce9e82bf045b9d11845e6c5dff4a5e) supply the small verifier/command modules and `node:test` regression corpus.
  Incorporate the later OwlAPI producing-attempt and transient-read fixes listed above rather than preserving older strict-attempt assumptions.
- Markdown Quality's [artifact-reduction change](https://github.com/Hadden-Industries/markdown-quality/commit/04b932bc37109a45600d231cfc63ab6f6c812821) establishes stdout for routine registry results and exact artifacts only for consuming release collectors.
  Its residual performance-driver logs are not adopted under the owner's stricter policy.
- The inspected [OwlAPI workflow snapshot](https://github.com/Hadden-Industries/owlapi/blob/36e28374447d94d9734960aaed6d3ab4be52ca17/.github/workflows/ci.yml) centralises 39 upload sites but still includes diagnostic uploads.
  Its [artifact policy](https://github.com/Hadden-Industries/owlapi/blob/36e28374447d94d9734960aaed6d3ab4be52ca17/docs/release/artifact-transport-policy.json) and [registry availability policy](https://github.com/Hadden-Industries/owlapi/blob/36e28374447d94d9734960aaed6d3ab4be52ca17/docs/release/availability-policy.md) anchor the adopted timing profiles.
- The owner's 27 October clarification records WebVOWL JSON-result reuse as a separate correction in progress.
  Reuse the intended equal-input contract here; do not cite that unfinished correction as implemented proof.

## Implementation sequence and completion gates

The changes should be applied in dependency order rather than as independent edits.

| Order                    | Change set                                                                                                                                                                                          | Completion gate                                                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation               | Update npm/toolchain/dependencies; change Node engine to `>=22.13.0`; redesign Node support policy; bind policy/manifest/lock projections; clean root configuration                                 | `npm ci`, Node-policy tests and drift checks pass; changing a dependency selector invalidates old proof                                           |
| Package contracts        | Add strict JS checking, JSDoc typing, declarations, public API contract tests and strict package linting                                                                                            | `check:types`, ESLint and package-lint checks pass; packed ESM/type consumers succeed                                                             |
| Schema contract          | Migrate public schemas to 2020-12, add stable IDs, update Ajv use and schema fixtures                                                                                                               | Every public schema compiles strictly; positive/negative and cross-schema fixtures pass                                                           |
| Public plugin            | Add metadata, recommended flat config, rule docs/types and installed-consumer tests                                                                                                                 | Packed plugin works using the exact documented configuration                                                                                      |
| Reliable qualification   | Integrate producer ordering, shared phase deadlines, bounded read recovery, exact candidate transport and complete required evidence into the reusable workflow                                     | Cold/slow-worker and injected transient-failure cases satisfy the hardening table below; permanent and incomplete outcomes remain blocking        |
| Deliberate PR CI         | Add the ready-for-review wrapper, LTS/platform matrix and internal aggregate around the proven qualification path                                                                                   | Draft → Ready causes one complete run; a later commit invalidates acceptance without automatically rerunning full CI                              |
| GitHub governance        | Activate the default-branch ruleset, native Actions check-source restriction and owner-reviewed CI/test/policy boundary                                                                             | Direct push and failing/missing/stale checks are blocked; owner retains the merge decision; no separate App or extra required reviewer            |
| Required result reuse    | Adapt Markdown Quality's verifier/tests with OwlAPI's retry/producing-attempt fixes; add the lightweight main observer and explicit full-qualification entry point                                  | Equal-input PR results, including eligible JSON checks, yield `REUSED`; unavailable proof yields `FULL_REQUIRED` without automatic full execution |
| Minimal durable evidence | Keep diagnostics in native logs; consolidate necessary transfers and receipts; preserve compact published-release proof independently of provider metadata                                          | Every artifact has a named consumer; no uploaded log copies; historical proof remains verifiable after native runs/artifacts expire               |
| Security automation      | Add dependency review, CodeQL, Dependabot, audit gates, secret protection and sensitive-path ownership                                                                                              | Dependency/security PRs use the same acceptance path and vulnerable additions are blocked                                                         |
| Release system           | Wire qualification/staging/registry/GitHub-release/promotion workflows into existing evidence/effect/recovery contracts; configure npm OIDC, staged publishing, attestations and immutable releases | Exact candidate traverses the chain without long-lived npm publication credentials; lost acknowledgements reconcile without duplicate effects     |
| Public documentation     | Rewrite README/contributor/runtime/release guidance; add API/CLI/config docs, changelog, issue forms and PR template                                                                                | Every documented command/example is exercised by automated tests and no contributor documentation describes the obsolete merge/CI path            |

Deliver these as reviewable increments with a complete observable path and its focused proof, keeping the existing verified path usable until its replacement passes.
The initial completion gate covers Windows x64 and Linux x64/glibc and includes required result reuse.
macOS native porting, architecture selection and minimum OS support belong to a separately qualified follow-up milestone; they do not block this delivery.
Extend the existing helpers before adding new modules, and keep the following predicted ownership boundaries explicit:

| Concern                              | Existing authority or planned extension                                                                       | Consumers and drift control                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime/native support               | `assets/node-support.json`, `assets/native-packages.json`, existing projection and matrix scripts             | Package engines, setup, native companions, workflow matrix and docs must agree.                                                                   |
| Public resource controls             | `schemas/configuration.schema.json`, `scripts/project-resource-limits.js` and existing native/API projections | CLI/API/bootstrap/events retain one validated contract; CI overrides do not fork it.                                                              |
| CI deadlines and process diagnostics | `scripts/qualification-process.js`, a shared test helper and workflow projections                             | Setup, fixtures, qualification and release consumers share effective phase policy and cleanup rules.                                              |
| Read recovery and artifact transport | A shared adapter over approved GitHub/Actions clients, extending existing evidence boundaries                 | One classification/budget policy across candidate uploads and collectors; no inline retry copies or direct-upload bypasses.                       |
| Admission and release recovery       | Native Actions aggregate, adapted reuse verifier and existing `scripts/release-*` contracts                   | Owner reviews verification-policy changes; receipt validators share identity rules; publication effects retain their separate one-shot authority. |
| Evidence retention                   | Existing workflow retention inputs, artifact contracts and release history/checkpoint readers                 | Named consumers justify artifacts; diagnostic logs stay native; immutable release proof survives provider record expiry.                          |

### Required hardening scenarios

These are acceptance obligations for the agreed implementation plan, not tests executed by this documentation revision.
Use fake clocks and controlled transport/process faults for deterministic boundary tests, then a bounded hosted proof for platform and provider behaviour.
Retain unsuccessful attempts as evidence; do not intentionally overload shared workers to manufacture contention.

| ID    | Trigger                                                                                                                 | Required result                                                                                                                                                                                |
| ----- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CI-01 | Cold or delayed fixture startup completes within its declared operation and harness limits                              | The assertion is reached and passes without an automatic test retry; actual elapsed/remaining budget is recorded.                                                                              |
| CI-02 | Operation hangs, cancellation arrives, or cleanup fails                                                                 | The finite deadline settles owned descendants/streams/storage; incomplete cleanup/output cannot produce a passing terminal record.                                                             |
| CI-03 | Evidence GET resets or returns a transient 5xx before succeeding                                                        | Bounded recovery preserves candidate identity; attempts, delay, requests, bytes and total elapsed time stay within policy.                                                                     |
| CI-04 | A confirmed rate limit requests a wait beyond the remaining budget                                                      | No early retry; the main observer reports `FULL_REQUIRED` without starting full qualification, while mandatory release evidence remains blocked. Ordinary 403 is not retried as rate limiting. |
| CI-05 | A transport succeeds with malformed JSON, an invalid schema, wrong digest or wrong provenance                           | Immediate admission failure; no retry-until-valid and no success based on a warning.                                                                                                           |
| CI-06 | Upload finalizes but acknowledgement is lost; visibility is delayed                                                     | Bounded reconciliation adopts only the byte-identical artifact, or uploads to a fresh name after confirmed absence. Unknown lookup state stops recovery.                                       |
| CI-07 | Artifact candidates conflict or an archive contains traversal, links or excessive expansion                             | No candidate is admitted or materialized; byte/file/time limits apply across all attempts and destinations remain owned.                                                                       |
| CI-08 | Only the infrastructure-failed matrix job and aggregate are rerun                                                       | Retained successful jobs keep authenticated original producing attempts; the complete latest inventory is required and ambiguous lineage fails.                                                |
| CI-09 | Candidate head/base, workflow policy, dependency selector, lock, native tuple or resolved runtime changes               | Old acceptance/reuse is rejected. A late callback cannot restore acceptance for the changed candidate.                                                                                         |
| CI-10 | Expected lane, generated input, installed-tool receipt or final terminal is absent; a predecessor is skipped            | The aggregate fails despite any other successful jobs; a warm cache cannot substitute for the missing producer.                                                                                |
| CI-11 | A check reports the protected name from an unexpected App, or a PR changes the verification workflow/tests/policy       | GitHub rejects the unexpected source. The owner reviews verification changes before merging; the record explicitly distinguishes owner enforcement from automatic workflow-origin enforcement. |
| CI-12 | A declared platform's native companion is missing or incompatible                                                       | Clean installation/runtime qualification fails explicitly; platform support is not inferred from a scheduled or skipped matrix lane.                                                           |
| CI-13 | Publication/staging/tag submission loses its response after the provider applies it                                     | Durable unknown outcome is reconciled by exact readback; no automatic duplicate effect and no subsequent promotion while unresolved.                                                           |
| CI-14 | Benchmark preflight detects load, or retained samples prove interference                                                | Evidence is marked invalid/inconclusive under the predeclared policy; no favourable-sample selection or silent performance-budget increase.                                                    |
| CI-15 | A landed merge has missing, expired or incompatible reuse proof                                                         | The lightweight observer reports `FULL_REQUIRED`; no full suite runs until the owner explicitly requests it, and downstream actions requiring qualification remain blocked.                    |
| CI-16 | Native run/check records and operational artifacts have expired                                                         | Complete preserved release proof remains independently admissible; missing/conflicting checkpoint data fails explicitly rather than disappearing from history enumeration.                     |
| CI-17 | An artifact upload has no downstream consumer or contains diagnostic log copies or unnecessary corpus/dependency copies | Artifact-policy validation rejects the unnecessary payload; ordinary diagnostics remain in native logs and summaries.                                                                          |
| CI-18 | JSON source inventory, policy, schema/tool/native and generated-input identities match the qualified PR                 | JSON results are eligible for `REUSED` with the other complete required results; changing or omitting any required input/proof yields `FULL_REQUIRED`, not a blanket JSON exclusion.           |

The contributor runbook must distinguish source failures, which require a fix and a new ready-for-review checkpoint, from classified infrastructure failures eligible for an explicit targeted rerun of the same candidate.
Show how to identify exhausted budgets, original producing attempts, missing evidence and an uncertain release effect, with the exact safe recovery action for each.
Include the explicit post-merge `FULL_REQUIRED` recovery path and distinguish it from an automatic retry or a new PR acceptance request.

### Decisions and replanning conditions

The design interview settles initial platform scope, owner-controlled trust, required reuse, deliberate handling of reuse misses, artifact minimisation and inherited deadline profiles.
Before implementation acceptance, reconcile actual call sites and workflow settings with those profiles, inventory each retained artifact's consumer, and demonstrate durable recovery after provider expiry.
Record effective phase budgets and package/transport bounds from their existing authorities; do not reopen settled owner decisions merely because local constants currently differ.
The existing dated runtime/version examples must be refreshed from their official authorities at implementation time and then frozen for each candidate.
macOS architecture/support choices and a separate reporting App remain outside the initial delivery, to be reconsidered only in their explicitly scoped follow-up work.

Replan if a required guarantee needs a new platform capability, the trusted gate cannot preserve the deliberate CI trigger, the corpus no longer fits the declared resource envelope, or recovery requires repeating an effect with unknown outcome.
Change a measured budget through a reviewed policy revision with retained evidence, not an ad hoc workflow timeout increase.
When required reuse cannot be admitted, report `FULL_REQUIRED` and wait for explicit full qualification; never disable the gate or launch the full suite automatically as an availability workaround.

The repository-level final acceptance should be one clean run of:

```sh
npm ci --ignore-scripts
npm run install:markdown
npm run check:full
```

with `check:full` expanded to include the new type, schema and package-metadata checks.

Then perform an actual GitHub process proof with a deliberately created draft PR:

```text
multiple pushes while draft
        ↓
zero full acceptance runs
        ↓
Ready for review
        ↓
one full qualification
        ↓
PASS
        ↓
push one harmless additional commit
        ↓
merge becomes blocked, with no automatic full CI
        ↓
convert to draft
        ↓
Ready for review
        ↓
new qualification
        ↓
PASS
        ↓
normal merge succeeds
        ↓
lightweight main observer admits REUSED
        ↓
no duplicate full qualification
```

Also exercise an owned reuse-miss fixture: the observer reports `FULL_REQUIRED`, no full suite starts, and an explicit owner request produces fresh complete evidence.
Include matching and changed JSON-input cases in the successful-reuse and miss proofs.

That process proof and the hardening scenarios establish the intended operating model: **full qualification remains deliberate, matching PR results are reused on main, and the owner retains review of verification policy and the final merge decision.**
GitHub supplies latest-SHA, eligible-event, expected-App and strict-base enforcement; approved repository code validates the complete inventory and evidence contracts.
This is the accepted owner-controlled trust model, not a claim that native check names alone authenticate an unreviewed workflow implementation.
[GitHub required-check semantics](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks).
