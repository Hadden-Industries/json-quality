# Trusted consumer CI

`json-quality-qualify` and the `qualifyJsonConsumer` asynchronous iterator check immutable candidate Git JSON under the policy from an independently selected immutable trusted commit.
The reusable [workflow](https://github.com/Hadden-Industries/json-quality/blob/main/.github/workflows/json-quality.yml) must be pinned to a reviewed full producer commit.

```sh
json-quality-qualify --trusted-root /trusted --candidate-root /candidate \
  --trusted-sha FULL_COMMIT --candidate-sha FULL_COMMIT
```

Both identities must be full 40-character commit object IDs.
The scope is explicitly `immutable-git-json`: checkout/HEAD cleanliness is not a qualification claim. The command reads the selected objects, leaving dirty or transformed working bytes untouched. A missing commit, non-commit identity or absent/nonregular trusted policy refuses completion.

The producer's installed component and local schemas own admission.
A bounded native/Ajv bootstrap reads the trusted `.json-quality.json` from its Git blob, verifies exact bytes and transfers the admitted frozen control charge into the main core.
Candidate policy is ordinary checked candidate data; it never selects the governing policy or loads code.

Raw native Git metadata and blob streams supply the candidate census.
Blob length and Git's framed object SHA-1 are independently verified before the source terminator.
JSON parsing and byte/rule checking occur in the shared native core. No complete document array, copied scratch checkout or second JavaScript JSON checker is used. Recognized unsupported dialects and tracked symlink/nonregular JSON entries refuse admission.

Git is selected as an external native tool outside both source roots.
Its identity is observed and rechecked.
Inherited Git directory/config injection, replacement objects and lazy fetching are disabled. The path uses `ls-tree`/raw `cat-file`; it does not invoke candidate npm scripts, imports, dependency graphs, Git status/fsmonitor, checkout filters or hooks.
The trusted policy cannot fetch schemas or executable providers from data.

Source-only qualification refuses policy requirements for native sources, original native/logical presentation or expected logical linkage.
Use the complete trusted repository adapter to discharge those obligations.
It also makes no application-domain, archive-meaning or installation-integrity claim.

Output is cohort-3 NDJSON, with correlated `execution`, source/finding/terminal events and final `execution-terminal`.
Execution metadata names the trusted/candidate commits, trusted policy blob, policy SHA-256, core source identity and `immutable-git-json` scope.
Only the final terminal closes inventory, diagnostic and source-observation obligations.
`domainComplete` stays false.
The terminal is delivered after owned native storage and Git subprocesses settle.

Exit 0 means the selected source contracts were satisfied and delivery completed.
Shared contract failure returns 1.
Acquisition, resource, identity, cancellation, cleanup or output failure returns 2 and provides no successful final verdict.
Exact expected negatives can satisfy their pinned contracts while intrinsic `qualityPassed` is false; findings remain visible.

The API takes `{ trustedRoot, candidateRoot, trustedSha, candidateSha, capacityLimits, runtimeControls, temporaryDirectory, signal, requestId }`.
Consume the iterator to completion or cancel/return it. CLI resource/runtime flags share the ordinary vocabulary and environment contracts in the [resource guide](resource-limits.md).

The reusable workflow retains read-only repository permissions and no publication/OIDC authority.
Its admission setting, finite runtime controls, 15-minute check step and enclosing job deadline govern separate boundaries.
The event stream remains in native job logs; it is not copied into an Actions diagnostic artifact.
Hosted checkout/acquisition and native platform availability need their own workflow evidence; a local source-only pass does not establish a clean transported package, consumer adoption or release approval.

## Deliberate repository acceptance

The PR wrapper runs only for `pull_request: ready_for_review` into `main`.
Feature pushes and `synchronize` do not launch full qualification.
The source/base head must match the checked-out integration and frozen matrix.
Required `CI / acceptance` admits product/native/dependency/CodeQL results and every packed-consumer receipt; skipped, incomplete, foreign or failed mandatory jobs remain blocking.
The owner reviews changes to workflow code, tests and trust policy, then deliberately chooses whether to merge.
CODEOWNERS routes that review without requiring an additional maintainer or reporting App.
The native Actions App restriction authenticates the check source; it does not prove that candidate-edited workflow code reports honestly.
Approved fork PRs execute the same mandatory qualification and complete inventory admission.
Their head repository is authenticated separately from the base repository; they do not upload an unused main-reuse proof, and the main observer still requires a same-repository merge.

`.github/governance.json` records the reviewed cutover settings, including the active strict main ruleset with no bypass, the expected Actions App, read-only tokens and external-contributor approval.
`node scripts/github-governance.js` inspects the live settings without changing them; `--check` fails on drift.
After the source has been published and the native PR acceptance check has existed, a separately authorized operator can use `--apply` on clean signed published `main`.
Bootstrap authenticates the exact Actions job/check, its App and the reviewed CI workflow bytes at the check's integration commit.
The initial check may have failed while advanced CodeQL conflicts with default setup; selecting it as required still blocks merging until it succeeds after cutover.
The operator route reads back each change, never automatically retries a settings mutation and preserves unrelated rulesets.
It disables CodeQL default setup before using the explicit advanced workflow; the two modes cannot run concurrently.
The local implementation does not activate these settings or establish the draft-PR process proof.

### Operator cutover

After publishing the reviewed source, explicitly dispatch **Main qualification** on `main` with `gh workflow run main-qualification.yml --ref main`.
Prepare a draft runbook PR from the same source and deliberately mark it ready for review to establish the native `CI / acceptance` context.
The bootstrap prerequisite establishes that the check is selectable; a failed or incomplete check is never evidence that the candidate passed.
Return to clean signed published `main`, run `node scripts/github-governance.js --apply`, then use `--check` to verify the complete settings readback.
After the default-setup cutover, use `gh run rerun RUN_ID --failed` to rerun infrastructure-failed CodeQL jobs for the same candidate while retaining successful lanes.
Source repairs require a new candidate and a new ready-for-review checkpoint; never replay publication effects to recover missing qualification.

After an ordinary merge, `main-qualification.yml` performs lightweight image/input/provenance admission.
The proof must bind the same tree, parents, workflow, dependency selectors/locks, generated declarations, JSON policy/schema/tool/native inputs, resolved runtimes and supported platform contracts.
Each original job retains its actual runner image and `ImageVersion` as provenance; image build numbers do not have to match other lanes or a later main observer.
The platform contract requires Ubuntu 24.04 or Windows Server 2025 on x64, with the selected Node/npm matrix and pinned transport Python.
Windows 2025 tool-image variants belong to the same consumer platform; an unsupported OS/image family, changed architecture/runtime or missing image provenance remains ineligible.
The same platform validator admits PR consumer receipts and main probes, so two matching but unsupported image families cannot establish acceptance.
Native results still belong to their authenticated original producer, exact tested tree and transported artifact identities.
An unused compiler on the later observer is not a native rebuild input; fresh native production and commit-bound release qualification retain their own toolchain and verification requirements.
This follows [GitHub's guidance to select tool versions explicitly across rolling runner updates](https://docs.github.com/en/actions/concepts/runners/github-hosted-runners#runner-images).
Equal-input JSON is eligible for `REUSED` with the rest of the complete qualification.
Missing, expired, conflicted or changed proof yields `FULL_REQUIRED`; no full suite is launched automatically.
The owner explicitly dispatches **Main qualification** on `main` for fresh `FULL` assurance.
That dispatch cannot create PR acceptance or a reusable PR proof.
Release qualification still creates a fresh commit-bound candidate and does not reuse a PR tarball as a main release.

Partial reruns authenticate each retained job's original producing attempt by name, run, head SHA, runner and start/completion times.
Mutable job/check IDs and copied attempt labels are not producer identity.
The latest complete required inventory and the original execution must agree.
An ambiguous lineage remains unavailable.
After all native workflow predecessors report success, acceptance allows three observations for their job inventory to finish registering, with pauses derived from the shared two-minute lookup budget.
Only missing expected entries or pending jobs with no conclusion can settle this way; failed, foreign, duplicated or malformed evidence refuses immediately.
Both the latest projection and the current attempt must become complete before original producing-attempt admission, and no product job is rerun by this wait.

## Recovery and retention

`npm run check:ci` checks the complete local workflow/action graph before the candidate policy job starts expensive fan-out.
The same owner, `scripts/check-workflows.js`, follows [OwlAPI's workflow governance](https://github.com/Hadden-Industries/owlapi/blob/36e28374447d94d9734960aaed6d3ab4be52ca17/scripts/workflow-governance.mjs): it validates YAML, native action entries, required/declared inputs, immutable external action references and transfer deadlines against the shared budget module.
Mutation tests cover broken callers and metadata across dormant release paths as well as normal CI; native Node action entry points participate in JavaScript lint and native architecture/syntax admission.

Artifact uploads use the native Node action handler, following OwlAPI's maintained transport boundary, so the SDK receives runner credentials without shell exports.
Proof selection, byte transfer and receipt admission remain separate operations, as in [WebVOWL's verified-reuse driver](https://github.com/Hadden-Industries/webvowl/blob/7a298176a9cb7fff31c89069a63d6746bf9bf23a/util/ciEvidenceCommand.mjs).
Downloaded bytes must satisfy the admitted provider identity, exact size and digest before bounded extraction or receipt parsing; only allowlisted signed-storage redirects are followed, without forwarding the GitHub credential.
Native job logs include the qualification mode and its explanation; diagnostic log copies are not uploaded.
`scripts/artifact-policy.js` separates compact proof, payload/envelope, cumulative download and metadata byte budgets.
Failed transfer bytes retain their cumulative charge; a large admitted payload does not consume the subsequent metadata-read allowance.
Provider identity, digest and expiry are rechecked before materialization, keeping the network lookup separate from the bounded extraction phase.

GET recovery allows at most three attempts within a shared two-minute lookup budget, with finite requests and bytes.
Only classified transport errors, transient HTTP statuses and confirmed rate limits recover; malformed JSON, schema, digest or provenance failures do not.
Server retry hints are minimum waits, and an over-budget wait stops admission.
Uploads use a four-minute upload/reconciliation budget inside a five-minute step.
A lost acknowledgement is reconciled by exact bytes/digest/size; only confirmed absence permits a fresh name, while unknown or conflicting lookup stops recovery.
Publication writes are one-shot and retain their separate release journal/reconciliation rules.

| Retained material                                           | Named consumer                                           | Normal retention                                                                      |
| ----------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Qualified producer archive, including measurement data      | Frozen runtime consumers; deliberate release preparation | 1 day for same-run transfer; 30 days for release input                                |
| Compact lane proof with all performance samples             | Acceptance collector                                     | 1 day                                                                                 |
| Compact `FULL` PR proof                                     | Main equal-input observer                                | 30 days                                                                               |
| Lightweight host record                                     | Main observer in the same run                            | 1 day                                                                                 |
| Native component payload and original rights/build identity | Explicit component staging/package assembly              | 30 days                                                                               |
| Release consumer/security evidence                          | Deliberate release admission                             | 30 days                                                                               |
| Admitted next-step bundle                                   | Exactly the next release writer                          | 1 day                                                                                 |
| Effect journals and recovery records                        | One-shot release reconciliation                          | 90 days operationally; required release proof is preserved with the immutable release |

Compiler, sanitizer and other diagnostics stay in native stdout/stderr and summaries under repository run retention.
They are not copied into `.log`/diagnostic artifacts.
Preserved release proof must retain independent provider/run/job identities and checkpoints for the lifetime of the immutable release; expired operational metadata is not independent proof.
