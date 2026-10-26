# JavaScript orchestration performance implementation plan

Date: 2026-10-26.
Revision: 1, draft synthesis for owner review.
Status: documentation only; implementation, risk acceptance, execution adoption, final verification and release remain separate decisions.

## Purpose, authority and baseline

Reduce the time developers and CI workers spend checking, formatting and normalizing repositories while preserving complete discovery, exact JSON meaning, bounded resources and guarded writes.
The main implementation hypothesis is that reducing repeated process startup and filesystem work provides greater value than changing the native parser or micro-optimizing JavaScript syntax.
Success means faster complete operations under the same correctness and resource contracts, not merely fewer subprocesses or a faster test suite.

This document synthesizes both supplied audits, including their measurements, five patch proposals, six numbered findings, additional traversal proposal, rejected alternatives and differing CI budgets.
It distinguishes source-reported results from current static observations and future acceptance evidence.
The user authorized this synthesis and its storage under `docs/plans/`; that request does not approve the proposed product changes.
All new REQ, AC, QA, DEC and SLICE identifiers below are local to this draft and do not replace identically numbered records in other plans.

The inspected repository HEAD was `2e27a0b6c9b0e408617a6fe905cd8938a20d7c22`.
The package manifest identifies `@hadden-industries/json-quality` version `1.0.0-rc.1`, ESM, AGPL-3.0-only, with Ajv `8.20.0` and Prettier `3.9.10`.
The source reports identify contract cohort 2; the inspected implementation uses the cohort-owned schema version and request correlation on session events.
Six pre-existing uncommitted JavaScript files contain the five reported patches; their diff was inspected, not modified or accepted by this planning task.
No associated test changes were present in the inspected tracked diff.

HISEW applicability inspection returned `personal`, `active: true`.
The retained execution `0285706b-d3bb-4137-a721-14550c0ea026`, generation 20, was paused and unrelated to this session, with the purpose of implementing the accepted revision-4 oversized-JSON plan.
This draft is an informational handoff; it does not start new HISEW execution work, adopt or close that execution, or assert its verification.
Before implementation in this worktree, the owner must explicitly decide how to continue or close retained work and authorize the applicable execution association.
The three pending feedback-diagnosis continuations were inspected and remain separate from this performance plan; no feedback dispatch or claim was made.

### Source preservation and provenance

The evidence directory contains byte-for-byte copies with `.md.txt` suffixes.
These are immutable source records, including original Markdown, unified diffs, historical line references and status wording; they are not authored implementation instructions or files to reformat.
The extra suffix distinguishes the preserved records from the maintained plan.

| ID    | Original source and retained copy                                                                                                                                                                                   |  Bytes | SHA-256                                                            |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -----: | ------------------------------------------------------------------ |
| SRC-A | `C:\Users\maksy\Downloads\json-quality-javascript-performance-improvements.md`; [retained comprehensive audit](2026-10-26-javascript-performance-evidence/json-quality-javascript-performance-improvements.md.txt)  | 32,729 | `ac4c9bedc2bc76218726b0245996f1bd455e58ed22812bcd6c0b92a79507a00a` |
| SRC-B | `C:\Users\maksy\.gemini\antigravity\brain\765ac10d-3098-434c-b143-ff1cb3354f86\performance_audit_report.md`; [retained companion audit](2026-10-26-javascript-performance-evidence/performance_audit_report.md.txt) | 25,204 | `09f0ea17edd2d09d6c045a34f60523af2f4fb45003e7005877f6708fdf97761b` |

SRC-A's repeated task-completion lines are preserved as historical activity text, not additional test executions or evidence receipts.
Neither report supplies an immutable audited commit, a complete machine specification, raw timing records for every workload, or an attached executable benchmark harness.
The named `bench.mjs`, `workload_scaling.mjs` and flame graphs were not established as retained, reproducible evidence in this synthesis.
No matching benchmark/profile files appeared in the bounded repository file search; the reports' directory listing contained the report, metadata and scratch directories, which were not exhaustively searched.
Recover their exact artifacts if available; otherwise reproduce the measurements under SLICE-001.

### Existing candidate identity

These hashes identify the working files inspected for this synthesis, not an accepted or published candidate.
Recheck them together with HEAD before reusing any static observation.

| Path                          | SHA-256                                                            |
| ----------------------------- | ------------------------------------------------------------------ |
| `src/bounded-process.js`      | `91b9b6edd436ad89c4406a7ac3901e4a876dc3c6d0ef31f6f39207ef79562bb7` |
| `src/cli.js`                  | `1a03b45a5717b4af04eb7f5dabc3e046029dade954ab65f8145174177b8aa065` |
| `src/paths.js`                | `050eeeb2aa4e4de84a0b108a19684c7de9b6f9f729c8927e2c6528e155a14ab5` |
| `src/repository-discovery.js` | `05cfbc31b58d94bef3b6f062c9550151b5213100c718b4380e18553f7cfd4a8d` |
| `src/repository-rewrite.js`   | `4a620caf181be8a420b780862a48a0186a5748264e2ccc4253a0dfd5e517fe08` |
| `src/repository-source.js`    | `b9df1a86e4680748da4f44896f695130352d7acd8ba739d6a5b57eab9629d7a1` |

## Scope, prerequisites and risk route

Included are Git ignore preflight batching, bounded tool-output handling, repeated source-path checks, root canonicalization, CLI event validation, Git-stream empty-buffer allocation, Prettier debug-check startup costs, directory iteration, representative benchmarks and calibrated CI regression checks.
The inspected native C++20 Node-API architecture remains the authority for strict grammar, exact decimal/number semantics, Unicode NFC and retained data, using Boost, ICU, SQLite and double-conversion.
The reports' approximate 8–12 MiB managed peak is historical and workload-specific; it is neither a whole-process RSS limit nor proof of the candidate's resource behavior.

Excluded are new JSON dialects, a replacement parser/schema validator, weakened source preservation, public event-schema changes, expanded formatting capacity, a public cache/backend switch, unrelated dependency upgrades and automatic publication or consumer migration.
Checking stays read-only with respect to source files; explicitly owned scratch remains a separate resource effect.
Normalization continues to require an explicit nonempty physical-file selection.

The documentation synthesis is bounded work.
The proposed implementation should be routed as **R2 pending owner acceptance**, because filesystem trust, mutation authorization, process limits and validation boundaries are affected despite small diffs.
The audits' individual “Low” risk labels are preserved below as source assessments, not adopted lifecycle classifications.
An accepted dossier, accepted risk route, accepted consequential design, appointed independent verifier and numerical performance budgets have not been supplied for this new change.
The requirements and decisions below provide a concrete draft for those decisions; they do not fabricate acceptance.
Missing acceptance blocks the affected implementation and release, not the preservation of this requested draft.

| Prerequisite                                             | Accountable role                                    | Minimum evidence before dependent work                                                                              |
| -------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Execution ownership and overlap with oversized-JSON work | Repository owner / retained execution owner         | Explicit continue/close/transfer decision, fresh generation and authorized implementation association.              |
| Risk, scope and invariants                               | Repository owner                                    | Accepted R2 route or a justified alternative, this exact draft revision, named integration and verification owners. |
| Real workloads and budgets                               | Performance owner with CI owner                     | Production invocation pattern, file/byte/depth distributions, runner cohorts and accepted statistical rule.         |
| Source-path and root lifetime design                     | Filesystem/security reviewer with integration owner | Current call graph, mutation threat scenarios and proof that retained validation enforces containment.              |
| Event validation ownership                               | Event-contract owner                                | Reachable producer map, mutation/provenance proof and treatment of locally generated failures.                      |
| Prettier verification approach                           | Formatting owner                                    | Supported API/CLI research, bounded proof and exact-version/terms assessment for any new adoption.                  |
| Final assurance                                          | Independent verifier and security owner             | Selected HISEW profiles and scoped native security assessment plan bound to the eventual frozen patch.              |

## Consolidated evidence and conflicts

### Reported environment and workloads

Both reports describe Node `v24.22.1`, V8 `13.6`, npm `12.2.1`, Windows x64; SRC-A specifies Windows 11 and only a generic multi-core x86_64 CPU.
The native package was `@hadden-industries/json-quality-win32-x64`; production dependencies were the Ajv and Prettier versions above, with no bundler.
These are reported experiment identities, not a verified current toolchain inventory.
The inspected `assets/node-support.json` instead selects reference Node `24.21.0`, supported minima `22.13.0`, `24.0.0`, `26.0.0`, Windows `windows-2025` and Linux `ubuntu-24.04`, producer npm `12.2.1` and consumer npm `11.21.1`.
Reconcile the audit environment and the repository's frozen compatibility matrix before comparison; do not silently overwrite runtime policy.

| Workload         | Reported method                                                                                                                               |       Baseline |      Candidate |      Reported change |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------: | -------------: | -------------------: |
| Self-check       | `node src/cli.js check --root .`; 30 physical JSON files, full census/capture/recheck; one warmup then five timings using `performance.now()` | 331.79 ms mean | 286.67 ms mean |    -45.12 ms, -13.6% |
| Synthetic format | `node src/cli.js format --root <temp-dir>`; 50 valid committed JSON files in an isolated Git repository                                       |    3,934.50 ms |    1,102.62 ms | -2,831.88 ms, -72.0% |
| Focused suite    | `npm run check:focused`; 37 contracts/identity/Markdown tests                                                                                 |   17,925.57 ms |   13,297.94 ms | -4,627.63 ms, -25.8% |
| Full suite       | `node --test --test-concurrency=1 tests/*.test.js tests/native/*.test.mjs` / `npm test`                                                       |  172,702.11 ms |  163,176.74 ms |  -9,525.37 ms, -5.5% |

The five reported baseline self-check samples are 306.51, 350.86, 290.78, 348.69 and 362.10 ms.
SRC-B describes quiet background conditions, serial execution and a clean worktree for its benchmark; that historical claim does not describe today's dirty worktree.
SRC-B rounds suite times to 172.70/163.18 s and 17.93/13.30 s; retain the more precise SRC-A values without treating rounded values as separate runs.
Workload letters C/D are reversed between the reports' results tables; names above are the authoritative mapping in this synthesis.

Additional reported measurements:

- A zero-write format profile attributed 1,302,071 microseconds, about 1.30 s, to idle waiting and 95,575 microseconds to `node:internal/child_process:spawn` self-time.
- Fifty individual Git ignore processes took 3,415 ms versus 68 ms for one batch, approximately a 50-fold reduction for that isolated operation.
- One thousand `realpathSync(root)` calls took 23.08 ms on Windows.
- Ten thousand Ajv event validations took 14.10 ms, or 1.41 microseconds per call; the reports describe 11 `oneOf` event-schema branches.
- More than 180 path assertions were reported for a 30-file check.
- Prettier startup was estimated at 150–250 ms per changed file, suggesting approximately 20 s or more for 100 files; this remains strongly inferred, not a measured batch-format result.

The reported regression result is **558 total tests: 557 passed, one skipped, zero failed**, reconciling SRC-A's “all 557” wording with SRC-B's explicit skip.
The reports also claim 37 focused tests passed, 18 execution/replacement tests passed, architecture output `{"modules":195,"runtimeModules":46,"files":67}` with exit 0, and ESLint with zero errors and warnings.
Named protections include late peer mutation leaving subsequent files untouched, changed-preimage replacement refusal and lexical containment for equality, descendants, parents and sibling prefixes.
None of these claims was rerun or independently verified by this synthesis.
Passing those cases alone does not prove the additional adversarial cases specified below.

### Finding inventory and disposition

Severity, confidence, effort and source risk in this table are the audits' classifications.
All six findings were assigned High confidence; effort S/M is qualitative, not a delivery estimate.

| Finding            | Source assessment                       | Causal mechanism and proposed remedy                                                                                                                                                  | Draft disposition                                                                                                                                          |
| ------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PERF-01            | Measured; Critical; S; Low risk         | Sequential `writable` → `ignored` → `runBoundedTool` starts one `git check-ignore --quiet --no-index` per eligible file. Capture stdout and query NUL-delimited batches of 256 paths. | Highest priority; retain batching, redesign any unaccounted whole-census accumulation and qualify authorization, framing, limits and cleanup in SLICE-002. |
| PERF-02            | Measured; High; S; Low risk             | `openDiscovered` resolves once and repeats `assertRegularSource` at open/EOF; using the initial `absolute` removes two of three resolutions per open.                                 | Conditional optimization in SLICE-003; descriptor identity alone does not replace ancestor containment enforcement.                                        |
| PERF-03            | Measured; Medium; S; Low risk           | Repeated `realpathSync(root)` for the same root string; proposed module-global one-entry `canonicalRoot` cache.                                                                       | Lifetime and failure semantics must be redesigned or proven; no global-cache approval. Combine with SLICE-003.                                             |
| PERF-04            | Measured; Medium; S; Low risk           | Session events are validated and frozen, then CLI `emit` validates again; proposed `Object.isFrozen` guard.                                                                           | Optimize only a proven validated path in SLICE-004; frozen state is not schema provenance.                                                                 |
| PERF-05            | Strongly inferred; Low; S; Low risk     | Empty `Buffer.alloc(0)` per Git record; substitute a shared `EMPTY_BUFFER`.                                                                                                           | Small candidate in SLICE-005; measure allocation effect without claiming constant total parser allocations.                                                |
| PERF-06            | Strongly inferred; High; M; Medium risk | Each changed source starts a Node/Prettier `--debug-check`; batch or pool verification, or consider a supported in-process equivalent.                                                | Separate evidence-led structural slice, SLICE-006; preserve exact meaning/number-lexeme checks and process isolation obligations.                          |
| Traversal proposal | Unnumbered, unmeasured; next milestone  | Change explicit `handle.read()` iteration to async iteration and increase `bufferSize` to 64. Current code uses 16 and `encoding: "buffer"`.                                          | SLICE-005 experiment; keep only measured benefit with complete inventory, strict decoding and correct handle closure.                                      |

The reports' preferred order is PERF-01, PERF-02, PERF-03, then PERF-04, with PERF-05 as another quick win and PERF-06/traversal later.
This plan preserves that value ordering while joining PERF-02/03 under one filesystem-safety decision and allowing the harmless buffer candidate to be qualified independently of traversal.

### Claims requiring reconciliation

| Source claim or discrepancy                                                                                                      | Treatment in this plan                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Batching changes process count from O(N) to O(1).                                                                                | With a fixed 256-path batch, count is `ceil(N / 256)`, still linear asymptotically with a much smaller startup factor. A single persistent process is a distinct design requiring bounded streaming and lifecycle proof.                                   |
| Preflight always uses at most three Git processes, regardless of N.                                                              | Incompatible with multiple batches. Count ignore invocations separately; under a count-only limit use `ceil(Neligible / 256)`, with additional byte-limited batches accounted for. Measure census/recheck phases rather than assuming two other processes. |
| Baseline `N + 2` and candidate `ceil(N / 256) + 2`; 500 files means 502 versus four processes, approximately 35 s versus 0.28 s. | Preserve as the reports' simplified model, not a verified full-operation count. Additional freshness checks and per-file formatter children have separate cost.                                                                                            |
| More than 1,800 files inevitably time out after 120 s; format is 4–7 times slower than checking.                                 | The 1,800 × 70 ms = 126 s estimate explains a plausible failure, but no retained 1,800-file run proves a universal threshold. Actual timeout depends on aggregate work and machine; reproduce at scale.                                                    |
| Six path assertions become two, with six times depth versus twice depth `lstatSync` and 12 versus two `realpathSync` calls.      | Applies to the described capture/recheck path model, not every source lifecycle. Current source also has identification and freshness paths; instrument actual opens and validate the arithmetic. Asymptotic depth cost remains O(N × D).                  |
| PERF-02 alone produces the full 13.6% check gain.                                                                                | SRC-B's diagram attributes it to patches 2/3/4 together. Require single-change ablation before causal attribution. Do not add percentage improvements from combined runs.                                                                                  |
| Frozen objects are already valid and safely immutable.                                                                           | A freeze is neither schema validation nor recursive freezing. Prove producer identity and absence of relevant mutation between validation and serialization.                                                                                               |
| Root string equality establishes an invariant canonical root.                                                                    | Root replacement, junction changes, multiple sessions and resolution failure invalidate that assumption; scope reuse to an explicitly verified lifetime.                                                                                                   |
| Empty-buffer reuse changes O(R) allocations to O(1).                                                                             | Only zero-length reset allocations become constant; records, fragments and boundary concatenations still allocate.                                                                                                                                         |
| Immediate deployment / quick wins already applied.                                                                               | The five diffs exist as local candidate changes. Local application is not correctness acceptance, independent review, committed delivery or release readiness.                                                                                             |
| SRC-A uses 350 ms check / 1,200 ms format; SRC-B uses 400 ms / 1,500 ms.                                                         | Retain both proposals. Calibrate runner-specific budgets before accepting either; even a reported baseline self-check sample exceeds 350 ms.                                                                                                               |

## Draft requirements and acceptance criteria

All criteria require an identified baseline/candidate pair and recorded platform/runtime conditions.
Numerical proposals become binding only through DEC-002; correctness criteria are not traded for timing gains.

| Requirement | Desired result                                                                                      | Acceptance criterion                                                                                                                                                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-001     | Reduce Git startup overhead for format and explicit normalize without broadening write eligibility. | AC-001: empty, selected and whole-repository operations agree with independently specified Git/policy expectations; process count follows accepted batch byte/count bounds; protected, ignored, JSONL, logical and native-owned sources are not rewritten. |
| REQ-002     | Reduce repeated path work without weakening source identity or containment.                         | AC-002: all open/EOF/recheck and adversarial path cases preserve rejection/closure behavior; scoped reuse has a demonstrated syscall reduction; an unsafe candidate is revised or omitted.                                                                 |
| REQ-003     | Validate events once where validation ownership is proven.                                          | AC-003: all public serialized events remain schema-valid and correctly correlated, including local failures; malformed frozen inputs and nested mutation cannot cross a boundary without effective validation.                                             |
| REQ-004     | Reduce discovery allocation/traversal cost without an incomplete census.                            | AC-004: identical admitted records and required-output obligations across fragmentation, invalid-byte, mutation and cancellation fixtures; empty resets are reused; traversal changes show benefit before retention.                                       |
| REQ-005     | Amortize formatter verification startup for changed files.                                          | AC-005: batches of 1/10/100 changed files preserve Prettier verification, native quality and exact number lexemes, cancellation and bounded memory/scratch; unchanged files do not start debug-check children.                                             |
| REQ-006     | Keep resources bounded across every optimization.                                                   | AC-006: arrays, path bytes, captured stdout, concatenation peaks and any retained set are charged or bounded before allocation; configured admission and finite runtime controls still fail closed and settle owned resources.                             |
| REQ-007     | Establish reproducible user-visible performance and prevent regression.                             | AC-007: raw per-run data, phase timings, counts and memory measures reproduce the accepted gains on Windows and Linux; calibrated CI gates detect an intentional startup regression.                                                                       |
| REQ-008     | Preserve public compatibility and exact-source delivery evidence.                                   | AC-008: supported Node/platform cohorts and installed CLI/library/ESLint/schema consumers pass applicable qualification; no implicit aliases, fallback checker or stale consumer activation.                                                               |
| REQ-009     | Keep evidence and recovery auditable.                                                               | AC-009: each result names immutable sources, command, environment, fixture, outcome and limitations; rollback stops new exposure without overwriting user edits or claiming batch-atomic file restoration.                                                 |

### Domain invariants

- JSON syntax, duplicate identity, exact number lexemes, Unicode/NFC policy and presentation rules retain their existing native and contract authorities.
- Discovery closes every required inventory and observation before complete-success claims; unsupported dialects and malformed paths remain failures rather than silently filtered omissions.
- A checked descriptor must match the admitted source observation, pathname and exact bytes at the required lifecycle points; leaf metadata alone is not a containment proof.
- Policy exclusions, Windows canonical spelling, explicit selection, native authority and Git ignore semantics remain effective before writes.
- Complete preflight precedes the first effect; later failures report confirmed earlier writes and any uncertain current path.
  They do not promise all-or-nothing repository writes.
- Schema-valid events, terminal ordering, error/exit semantics, output backpressure, delivery limits and owned cleanup remain intact.
- `capacityLimits: false` does not disable runtime deadlines, resource ownership or safety.
  No unbounded JavaScript census is introduced to optimize a bounded native census.

## Quality scenarios and independent oracles

| Scenario | Stimulus / environment                                                                                                                                              | Required response and measure                                                                                                                                                                                            | Oracle / owner                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| QA-001   | Empty, 1, 50, 255, 256, 257, 500, 1,800, 5,000 eligible files; no-change format and explicit normalize                                                              | Correct candidates; no per-file ignore spawn; recorded batch count and wall time; no assumption that 1,800 must fail or pass a fixed budget.                                                                             | Git truth fixtures plus independently declared policy expectations; performance owner.  |
| QA-002   | Mixed tracked/force-added ignored/untracked files, nested exclusions, negation, spaces, Unicode, literal leading hyphens and Windows case aliases                   | Same allow/refuse decisions, including canonical-spelling and native-authority protection. Newline/NUL/backslash-invalid repository paths remain rejected before tool input.                                             | Real Git plus fixed expected selected paths; repository policy owner.                   |
| QA-003   | NUL record split at every boundary; oversized input/output; malformed UTF-8; empty, unterminated, foreign or unexpected records; exit 0/1/128; spawn/EPIPE failures | Strict protocol completion or failure before effects; no truncated response interpreted as permission; no output-capacity overrun through unchecked retention.                                                           | Controlled child-process fixtures and real Git success cases; process owner.            |
| QA-004   | Leaf replacement and ancestor symlink/junction or root substitution between discovery, open, EOF and rewrite                                                        | Detect invalid identity/containment before the relevant effect; close descriptors and report incomplete work. Include a moved directory linked back to the same inode to distinguish leaf identity from ancestor safety. | Filesystem adversarial fixtures on Windows and Linux; security reviewer.                |
| QA-005   | Sequential and overlapping sessions on roots A/B, reused root pathname, resolution failure on B after successful A, retry of B                                      | No stale root identity or cache entry published after failure; no cross-session leakage; retained lifetime explicitly enforced.                                                                                          | Expected failure/containment decisions independent of the cache; filesystem owner.      |
| QA-006   | Valid session events, CLI-created failures, frozen invalid objects, nested mutations, delayed terminal emission, output error/cancellation                          | Correct schema/correlation and terminal/exit behavior; only proven duplicate validation is removed; count validation calls without changing public schema.                                                               | Existing Ajv schema and independently malformed fixtures; event owner.                  |
| QA-007   | At least 50,000 tracked records and a separately authorized larger corpus; many non-JSON paths; large/deep directory trees                                          | Complete census with bounded memory, measured RSS/heap/external buffers/managed resources and cancellation latency. Keep default admission rejection distinct from scalability failure.                                  | Census counts, source hashes and platform metrics; performance owner.                   |
| QA-008   | 0/1/10/100 files need format, including exact decimal/exponent lexemes, invalid sources and preserved NFC values                                                    | Same output meaning and permitted presentation, no silent normalization, independent tool verification and correct attribution of failing file; bounded verification startup.                                            | Existing token-meaning oracle and native comparisons plus Prettier; formatting owner.   |
| QA-009   | Abort before spawn, while writing stdin, after partial stdout, during traversal and during formatter verification                                                   | Owned children/handles/scratch settle; unrelated sentinel process/files remain unchanged; no false terminal success.                                                                                                     | Real controlled processes/filesystem, existing cancellation assertions; resource owner. |
| QA-010   | Late peer mutation after an earlier confirmed write; ignore/policy changes between selection and effect                                                             | Subsequent unsafe writes stop; confirmed writes and uncertainty remain accurately reported; freshness is re-established at the accepted boundary.                                                                        | Independent preimage hashes and expected affected paths; write owner.                   |
| QA-011   | Frozen Windows/Linux and supported Node matrix, quiet and loaded runner conditions, warm/cold acquisition state                                                     | Separate cohort distributions, reproducible effect size, explicit skips and diagnostic artifacts; no flaky universal threshold.                                                                                          | CI owner with independent verifier.                                                     |
| QA-012   | Async-directory iteration ends normally, throws, breaks early or is cancelled                                                                                       | Correct closure exactly once, preserved strict byte decoding, directory before/after observations and no masked primary error.                                                                                           | Discovery fixtures and native handle observations; discovery owner.                     |

Production logic must not generate its own expected allowlists, expected JSON meaning or expected event validity.
Reuse test setup and input constructors when appropriate, while keeping independent expected decisions and the existing token/finite-oracle evidence.
Mock or substitute only genuine external boundaries: child executables for deterministic protocol faults, filesystem interleavings and output sinks.
Do not mock the policy decision, path admission or native meaning comparison that the test claims to verify.
Each platform-specific skip needs a reason and a platform lane that actually exercises the obligation.

## Decisions, architectural seams and reuse

### Draft design decisions

| Decision | Proposed selection and alternatives                                                                                                                                                                                    | Acceptance / revisit condition                                                                                                                                         |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-001  | Improve orchestration around the current native core. Qualify existing patches selectively; do not treat the candidate as an indivisible accepted bundle.                                                              | Owner accepts scope and route; revisit if profiling shows native work now dominates.                                                                                   |
| DEC-002  | Establish a calibrated Windows and Linux benchmark cohort. Preserve SRC-A's 350/1,200 ms and SRC-B's 400/1,500 ms budgets as competing proposals, with deterministic process-count checks alongside time.              | Performance/CI owner selects percentile/statistic, repetitions, absolute/relative budgets and noise policy after SLICE-001.                                            |
| DEC-003  | Use Git's native ignore rules and bounded NUL-delimited batches. A maximum of 256 paths is a starting count limit, supplemented by a byte limit and accounted storage; stream candidate batches into native selection. | No full-census JS array/set; complete selection preflight before writes. Compare a persistent process only if bounded batching remains insufficient.                   |
| DEC-004  | Reuse resolved paths/root state only within a proven filesystem-validation lifetime. Preserve effective ancestor, root, leaf and descriptor checks.                                                                    | Required adversarial proof first; keeping repeated checks is the accepted safe outcome if equivalent reuse cannot be shown.                                            |
| DEC-005  | Remove duplicate event validation only at a closed producer-to-serializer boundary with demonstrated provenance and mutation control.                                                                                  | Do not adopt `Object.isFrozen` as a validation credential. Keep normal boundary validation where provenance is unavailable.                                            |
| DEC-006  | Retain empty-buffer reuse if correct; measure buffer size 16 versus 64 separately from iteration syntax.                                                                                                               | Preserve strict filename decoding, inventory ordering guarantees actually promised, observations and closure. Omit non-beneficial traversal changes.                   |
| DEC-007  | Evaluate supported Prettier batch verification first; compare a bounded persistent worker and a supported in-process equivalent only with explicit cancellation/resource design.                                       | No private `__debug` API dependency or custom AST checker by default. No new formatting feature until reuse/version/rights and oracle evidence exists.                 |
| DEC-008  | Preserve public contracts and native runtime/distribution authority; change internal owning modules and all affected callers coherently.                                                                               | No specific NSH-01 shim override exists for this change. A public migration or compatibility bridge requires a separate accepted decision.                             |
| DEC-009  | Release qualified slices with exact-source evidence and named observation responsibility.                                                                                                                              | Independent verification and scoped native security assessment precede release assessment; source commit, package release and consumer activation are separate states. |

These are proposals, not accepted architectural decisions.
The repository owner assigns the people behind the roles before implementation.

### Current authority and DRY-01 decision test

Likely files below are predictions, not promised line-level edits.
Source reports' old line numbers remain available only in the preserved evidence.

| Rule / current authority                                                                                                               | Current consumers and boundary                                                                                             | Implementation strategy and drift control                                                                                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Git ignore semantics: selected Git executable and repository exclude configuration                                                     | Rewrite candidate selection; Git is an external process with failure/output boundaries.                                    | Reuse native Git rather than a JS glob approximation. Reuse the repository's Git environment authority where applicable; avoid parallel ignore implementations and an unused per-file fallback after migration.                          |
| Process limits: `src/bounded-process.js`, execution signal and resource configuration                                                  | Formatter and rewrite subprocesses; separate stdout/stderr, deadline and process-lifetime effects.                         | Extend bounded capture coherently or reuse an existing streaming seam after inspecting all callers. Preserve both count/byte accounting and failure settlement; test legacy exit-code consumers if the return shape remains conditional. |
| Path/identity admission: `src/paths.js`, `src/regular-file-observation.js`, `src/repository-source.js`                                 | Discovery, capture, identification, recheck and guarded replacement share filesystem rules.                                | Keep a single path-policy authority; scoped observations may be reused only within their stated lifetime. Descriptor observations and containment are distinct rules, not accidental duplicate implementations.                          |
| Event schema: `schemas/event.schema.json`, `src/events.js`; session correlation: `src/session-surface.js`                              | Public event validator, session streams and `src/cli.js` output; callers and output sinks have different trust boundaries. | Reuse Ajv/schema authority. Prove the internal transfer path; retain consumer-boundary enforcement and avoid adding a public validation flag.                                                                                            |
| Census and resource ownership: native core, `src/repository-discovery.js`, `src/repository-execution.js`, `src/execution-resources.js` | Git/tree/native/logical inventory and write selection; JS/native accounting boundary.                                      | Stream bounded batches through existing census operations. Derive limits from existing resource contracts; do not create a second whole-tree JS inventory.                                                                               |
| Formatting: `src/native-formatting.js`, `src/json-format-options.json`, native comparison and transform capacities                     | Library and repository writes; Prettier is a separate tool/meaning-check boundary.                                         | Reuse supported Prettier verification and native exact comparisons. Keep formatter verification and native checks distinct because their obligations differ.                                                                             |
| Runtime/CI policy: `assets/node-support.json`, projection/check scripts and existing workflows                                         | Producer, installed consumers, native packages and hosted matrix.                                                          | Reuse native matrix generation and existing CI jobs. Do not maintain separate hard-coded runtime matrices in benchmark scripts.                                                                                                          |
| Performance criteria: accepted benchmark specification and retained fixture manifests                                                  | Local harness and CI gates, with separate platform baselines.                                                              | One named workload/threshold authority; raw historical reports stay immutable evidence rather than another editable policy.                                                                                                              |

NAM-01 applies to changed responsibilities as well as new identifiers.
Reassess names such as `canonicalRoot`, `batchIgnored`, `writable` and `runBoundedTool` against cache lifetime, partial results, side effects and return semantics; do not preserve a misleading name merely to minimize the diff.
No new generic service, validator, policy engine or abstraction is justified by textual duplication alone.

### Reused platform capability and remaining research

Primary references were consulted on 2026-10-26 for the bounded design questions below.
This is not a claim that the reports' versions are the latest supported releases or that new dependencies have received terms clearance.

- Git supports `--stdin -z --no-index`; non-verbose output is NUL-delimited paths, quiet mode accepts only one path, and statuses distinguish ignored, none ignored and fatal failure.
  This supports native batching; the wrapper still owns complete response handling.
  [Git check-ignore documentation](https://git-scm.com/docs/git-check-ignore).
- Node's `opendir` supports a configurable buffer and async iteration; the iterator closes the directory on exit.
  A conversion must reconcile the current explicit `finally` close and preserve the existing buffer-name decoding.
  [Node filesystem documentation](https://nodejs.org/api/fs.html#fspromisesopendirpath-options).
- `Object.freeze` sets object integrity, and `Object.isFrozen` tests integrity; neither performs JSON schema validation.
  Therefore provenance cannot be inferred from freeze status.
  [ECMAScript Object operations](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.freeze).
- Prettier exposes CLI `--debug-check`, which cannot be combined with `--write`.
  That documented verification boundary is the starting point for PERF-06; batch handling must use owned snapshots and explicit configuration.
  [Prettier CLI documentation](https://prettier.io/docs/cli#--debug-check).

Internal reuse is suitable for PERF-01 through PERF-05 subject to proof of the changed boundaries.
Before any new capability or dependency for PERF-06, record requirement fit, supported API, latest stable or latest applicable LTS identity, exact source/package digest, supported consumer validation, actual license/terms and residual custom gap under REU-01/VER-01/LIC-01.
Investigate native CLI batching, existing bounded tool execution and public Prettier API before proposing worker infrastructure or third-party packages.
No license clearance or release-channel exception is invented here.

## Implementation slices

Every slice below is future work under accepted execution authority.
Each begins from an identified source state and ends with a demonstrable behavior plus its evidence and cleanup disposition.
The integration owner maintains one coherent change graph, preserves unrelated working changes and refreshes overlaps with the oversized-JSON implementation.

### SLICE-001 — Establish a reproducible baseline and acceptance envelope

Serve REQ-007/009 and DEC-001/002/009 before product optimization.
Recover the original harness/profile artifacts if possible and freeze baseline and candidate source identities without resetting the shared worktree.
Reproduce the 30-file check and 50-file format on isolated controlled fixtures, distinguishing no-op formatting from modified-file formatting.
Add counted Git/Prettier invocation evidence, allocation/managed-memory/RSS measurement and phase timings before deciding which source claims survive.
Use controlled executables or a real process trace for counts; do not rely on monkey-patching imported ESM `spawn` bindings.

Likely seams are proposed benchmark scripts under `scripts/`, fixture helpers under `tests/` and the existing runtime-policy projection.
The reports' `bench.mjs` and `workload_scaling.mjs` are historical names, not existing entry points to assume.
Demonstration is a retained baseline/candidate report with raw repetitions and an explicit disposition of every conflicting timing/count claim.
The independently specified fixtures must detect deliberately restored per-file Git startup.
This slice is independently useful as diagnostic tooling; remove owned temporary repositories after retaining fixture recipes, hashes and results.
It does not authorize publication of noisy absolute CI failures before calibration.

### SLICE-002 — Batch ignore decisions through guarded repository writes

Serve REQ-001/006 with AC-001/006 and QA-001/002/003/009/010.
Take complete eligible physical-file batches from the existing indexed census; preserve explicit selection errors and all policy/native/JSONL/canonical-spelling checks before write authorization.
Use both path-count and serialized-byte limits, bounded stdout capture or streaming, strict decoding, complete NUL framing and explicit exit-status handling.
Select candidates in native retained state as batches complete, but finish preflight before effects.
Release each batch's JS state before reading the next; charge any longer-lived state through the existing owner.

Likely changes are `src/repository-rewrite.js`, `src/bounded-process.js` and a narrowly justified reuse of Git protocol/environment helpers in `src/repository-discovery.js`.
The current candidate collects the whole `candidateMembers` list, maps a second path array and retains a whole ignored set; this conflicts with the source module's stated no-JS-candidate-inventory invariant and needs revision.
Its fixed 64 KiB output cap can reject a 256-path batch of long names; byte-based batching and protocol limits need a shared calculation.
Its parser silently ignores an unterminated suffix and uses replacement-capable UTF-8 decoding; malformed output must not convert absence from the set into write permission.
The current capture listener retains stdout before the aggregate output listener enforces the cap; review peak chunks, post-failure delivery and `Buffer.concat` duplication.
The current bounded runner also inherits Git environment variables while discovery has `gitReadEnvironment`; resolve the intended shared Git authority within this seam.

Focused proof uses execution/replacement, native bounded-process, Git qualification and repository-rewrite fixtures, plus real-Git ignore/negation/long-name cases.
Demonstrate lower measured startup cost at 50 and 500 files, correct multi-batch counts, aggregate deadline enforcement and no whole-tree heap growth at 50,000 records.
When all callers migrate, remove the unused old `ignored` fallback unless a genuine ongoing consumer is identified and its distinct contract justified.
Reversal is an exact reviewed product-code change; it must not rewrite fixture or user source preimages.

### SLICE-003 — Reduce source-path work within a verified lifetime

Serve REQ-002/006 with AC-002/006 and QA-004/005/009/010.
Map the lifecycle from discovery through identification/capture/EOF/recheck and actual write freshness.
Measure which path resolution and ancestor work is duplicated within a safe lifetime, then retain effective containment and identity checks at every material boundary.
The source candidate's one-line reuse of `absolute` is a hypothesis, not proof that `observeRegularFile` covers all removed checks: that module explicitly leaves containment to callers.

Likely seams are `src/paths.js`, `src/repository-source.js`, `src/regular-file-observation.js` and the owning repository execution context.
Prefer an execution-owned validated root identity over a module-global string cache only if the accepted threat model supports its lifetime; otherwise keep revalidation.
Publish cache state only after successful resolution.
The inspected candidate assigns `cachedRoot` before `realpathSync`; if resolving root B fails after cached root A, the previous `cachedReal` remains paired with B and can be returned on a retry.
This is a static failure-path observation requiring a reproducer, not a completed security finding or runtime verification.

Focused proof must go beyond `tests/paths.test.js` lexical cases to ancestor substitution, root reuse, failed cache fills, multiple sessions and late peer mutation.
Measure per-open/per-file counters with and without each optimization; do not attribute the combined 13.6% gain to one change without ablation.
Ship only the reduction that preserves the accepted checks; retaining some repeated syscalls is preferable to weakening containment.
Remove cache entries and owned descriptors on close/failure as applicable; no persistent cache migration is planned.

### SLICE-004 — Validate CLI events at the correct boundary

Serve REQ-003/008 with AC-003/008 and QA-006/009/011.
Trace every event producer into CLI serialization, including source/check/rewrite streams, delayed terminal events and locally constructed failure events.
Demonstrate when an event was schema-validated, who can mutate nested values and whether any untrusted or unvalidated object can enter that path.
Remove the second Ajv pass only where this proof holds; keep the schema and public assertion functions as the contract authority.

Likely seams are `src/session-surface.js`, `src/cli.js` and `src/events.js`.
Choose a small explicit internal ownership design; avoid a generic “frozen means trusted” branch or a caller-set validated flag.
Keep request correlation, text/machine output, output byte limits, backpressure, cancellation and terminal/exit behavior unchanged.
Focused proof uses CLI flexibility, native CLI events, public API and contract fixtures, plus invalid-frozen and nested-mutation probes.
Measure Ajv invocation count and CPU against the reported 14.10 ms per 10,000 validations; this small isolated cost may justify retaining duplicate boundary validation if the safe optimization costs more complexity.
No public event-schema migration or new serialized trust marker is planned.

### SLICE-005 — Reduce discovery allocation and qualify directory batching

Serve REQ-004/006 with AC-004/006 and QA-003/007/009/012.
First qualify the shared zero-length buffer change independently: it must not change partial-record ownership, UTF-8 failure, fragment capacity, NUL termination or backpressure.
Then compare directory buffering at 16 and 64 independently from explicit reads versus async iteration, on wide and deep trees and both supported platforms.
Async iteration already closes handles; do not carry an unconditional explicit close into that path without reconciling ownership.
Retain `encoding: "buffer"`, strict filename decoding, policy pruning, symlink rejection, directory before/after observations and native census closure.

Likely seam is `src/repository-discovery.js` with native discovery/Git qualification tests and benchmark fixtures.
Demonstrate identical census/required-output results, useful allocation or latency improvement and no handle leak or masked error after early exit.
The empty-buffer optimization can be accepted while the traversal experiment is rejected; neither is evidence that all record allocations are constant.
Release independently after resolving shared-file integration with SLICE-002/003; remove unhelpful experimental variants rather than exposing a public traversal mode.

### SLICE-006 — Amortize Prettier debug verification without losing checks

Serve REQ-005/006/008 with AC-005/006/008 and QA-008/009/010/011.
Measure the actual child-startup share for 1/10/100 changed files before choosing a strategy.
Compare bounded CLI batches over owned source snapshots, a reusable worker with an explicit request/termination contract, a supported in-process verification capability, and retaining the existing path.
Document the architectural trade-off if no supported option preserves the guarantees economically.

Likely seams are `src/native-formatting.js`, `src/repository-rewrite.js`, `src/bounded-process.js` and existing transform-capacity ownership.
Keep explicit format options and no-editorconfig behavior, input/output byte admission, unchanged-file short circuit, native pre/post validation and `compare-sources` exact meaning/number-lexeme protection.
Never batch by concatenating JSON documents into one stdin document or by letting Prettier discover arbitrary repository files/configuration.
Account for snapshot disk use, queued input/output, cancellation of the owned worker, failure attribution and full preflight before writes.
Do not parallelize sessions past the current `maxConcurrency: 1` contract as an incidental optimization.

Focused proof uses formatting, source-presentation, native formatting/guarded replacement and exact-token fixtures plus process failure/cancellation tests.
Require measured net end-to-end benefit, not just fewer Node children; startup savings must not be replaced by excessive materialization or scratch use.
This is independently optional for the earlier gains and cannot delay their acceptance solely because the structural experiment is inconclusive.
Owned worker/snapshot resources are removed after settlement; public write behavior and finite transform admission remain unchanged.

### SLICE-007 — Integrate calibrated gates and qualify the release candidate

Serve REQ-007/008/009 with AC-007/008/009 and QA-007/010/011.
Freeze the accepted product changes and execute focused, affected and route-selected final verification against that identity.
Add only the accepted benchmark commands/thresholds to the actual existing workflow structure and package scripts.
SRC-A proposes `bench:check`, `bench:format`, `check:perf` and `scripts/bench-format.js`; SRC-B proposes `scripts/bench-format-scaling.js`.
Those files/scripts are not currently present, and SRC-A's `.github/workflows/quality.yml` is not an existing workflow.
Choose one accurately named harness per workload and integrate with the existing `.github/workflows/ci.yml` producer/consumer matrix, with `json-quality.yml` updated only if its separate shared qualification contract is affected.
Preserve manual dispatch/reusable workflow semantics unless the owner separately changes CI policy.

Demonstrate Windows and Linux qualification, accepted performance distributions, real installed package consumers and regression detection without changing limits to hide failures.
Use an independent verifier and the designated native security workflow for the frozen filesystem/process/validation diff; record coverage and incomplete evidence explicitly.
No security scan, external review, remote dispatch, package publish or consumer update is launched by this document.
Release evidence and user-visible observation are separate from local passing tests and administrative execution closure.

### Ordering, parallelism and traceability

The dependency order is SLICE-001 → SLICE-002 → SLICE-003 → SLICE-004, with SLICE-005 able to proceed after baseline and coordination of shared discovery changes.
SLICE-006 depends on baseline evidence and the settled tool/write-selection contracts, while SLICE-007 depends on every slice actually included in that release.
Benchmark analysis and design research can proceed independently once authorized.
Do not assign simultaneous writes to `repository-rewrite.js`, `bounded-process.js`, `paths.js` or `repository-discovery.js` without an agreed integration owner and compatible contracts.
This planning task delegates no work or agents.

| Slice     | REQ / AC / QA / DEC links                                        | Falsifiable proof                                                                                       | Release / cleanup implication                                                                   |
| --------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| SLICE-001 | REQ-007/009; AC-007/009; QA-001/007/011; DEC-001/002/009         | Reproducible paired report and measured process counts; intentionally regressed startup is detected.    | Diagnostic value only; retain recipes/results and remove owned temporary repositories.          |
| SLICE-002 | REQ-001/006; AC-001/006; QA-001/002/003/009/010; DEC-003/008     | Exact selection parity, bounded multi-batch framing/resources and lower measured startup time.          | First product increment; remove obsolete fallback after consumer migration.                     |
| SLICE-003 | REQ-002/006; AC-002/006; QA-004/005/009/010; DEC-004/008         | Mutation and failed-cache-fill cases reject safely while measured repeated work falls.                  | Conditional optimization; discard unsafe cache/reuse and release owned state.                   |
| SLICE-004 | REQ-003/008; AC-003/008; QA-006/009/011; DEC-005/008             | Validation-count evidence plus malformed-event and output-failure behavior.                             | Same event contract; no public trust marker or compatibility path.                              |
| SLICE-005 | REQ-004/006; AC-004/006; QA-003/007/009/012; DEC-006             | Complete census under fragmentation/mutation; bounded memory and measured allocation/traversal benefit. | Buffer and traversal decisions separable; remove rejected variants.                             |
| SLICE-006 | REQ-005/006/008; AC-005/006/008; QA-008/009/010/011; DEC-007/008 | Meaning-preserving changed-file formatting with measured startup benefit and bounded lifecycle.         | Optional subsequent increment; retain per-file safety if experiment fails.                      |
| SLICE-007 | REQ-007/008/009; AC-007/008/009; QA-007/010/011; DEC-002/009     | Exact-source platform/installed-consumer qualification, calibrated gates and completed reviews.         | Release assessment, observer and recovery readiness; publication remains separately authorized. |

## Benchmark and verification specification

### Measurement protocol

Use isolated repositories generated from retained deterministic recipes; record file counts, path-depth/length distribution, JSON/non-JSON ratio, total bytes, changed-file count, ignore rules and source/config hashes.
Keep no-change format, changed-file format, explicit normalize and read-only check as separate workloads.
Record CPU model, cores, RAM, OS/filesystem, exact Git/Node/V8/npm/native component identities, energy/background-load conditions and whether native acquisition/caches are cold or warm.
Use the repository's supported producer/consumer matrix as the authority, not the reports' one Windows run.

Reproduce the original one-warmup/five-repetition method for comparability, then use a larger predeclared paired sample for gating, provisionally at least 20 measurements per cohort.
Choose the final sample size/statistic and noise handling in DEC-002; retain every raw observation, including failures and slow runs.
Alternate or randomize baseline/candidate ordering to reduce temporal bias; isolate compilation/acquisition time from steady-state measurements and report cold start separately.
Report median, selected tail statistic, dispersion and confidence/uncertainty appropriate to the sample; five runs do not establish a reliable tail SLO.
Use single-change ablations for PERF-01, PERF-02/03 and PERF-04 attribution, then measure the integrated candidate.

Record total latency and discovery, source capture/recheck, ignore preflight, formatting/debug-check and output phases separately.
Count Git ignore, other Git, Node/Prettier and other children by role.
Measure process RSS, V8 heap/external buffers, checker-managed memory, reserved control state and scratch separately; the native managed target is not an RSS promise.
Run 50,000-plus-record tests with declared admission settings: default `maxFiles` is 50,000, and exceeding it must not be misreported as a performance defect.
For larger admitted workloads, use an explicit authorized limit override or corpus with many non-JSON tracked paths; keep finite runtime controls.

The reports leave `PRODUCTION_INSTANCES`, `TRAFFIC_OR_SCALE` and `PRIMARY_SLO` unspecified.
They assume one CLI/job invocation per worker, developer or pull-request/pre-commit use, and suggest CI under 30 s and local pre-commit under 500 ms.
These are planning hypotheses, not accepted production service objectives.
Linux glibc measurements and representative monorepos with more than 50,000 tracked files remain required evidence gaps.

### CI gate reconciliation

| Gate                 | SRC-A proposal                                       | SRC-B proposal                                       | Draft acceptance treatment                                                                                              |
| -------------------- | ---------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Self-check           | `scripts/bench-check.js --max-time-ms 350`           | Same proposed harness with `--max-time-ms 400`       | Preserve both as calibration candidates; specify fixture identity and runner/runtime cohort before activating failures. |
| 50-file format       | `scripts/bench-format.js --max-time-ms 1200`         | `scripts/bench-format-scaling.js --max-time-ms 1500` | One chosen harness; distinguish whole-operation time from preflight-only time and changed versus unchanged files.       |
| Ignore-process count | At most three Git processes regardless of file count | Three total for census, one ignore batch and recheck | Assert accepted count/byte batch calculation and measured phase inventory; no universal total-three assertion.          |
| Integrated command   | `check:perf` runs `bench:check` and `bench:format`   | Add workflow assertions                              | Add only after harnesses exist and CI owner accepts budgets; keep functional correctness checks mandatory.              |

Start timing gates as recorded diagnostics until calibration is accepted; deterministic structural and correctness assertions can fail immediately once valid.
Do not hide noise by silently increasing budgets, skipping platforms, warming only the candidate or removing integrity checks.
A gate must be exercised with a controlled regression to prove it detects the failure it is intended to prevent.

### Existing verification commands and ownership

The following are inspected existing commands/paths or source-reported focused commands, to be executed only during the subsequently authorized implementation.
No test result in this table is claimed for this plan.

| Purpose                            | Command / current test inventory                                                                                                                                                               | Interpretation                                                                                                                                                                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Source-reported first change check | `node --test tests/execution.test.js tests/replacement.test.js`                                                                                                                                | Reproduce the reported 18-test evidence, then add the new behavioral cases rather than freezing a test count.                                                                                          |
| Path and identity checks           | `node --test tests/paths.test.js tests/execution.test.js tests/replacement.test.js` plus native discovery/rewrite/guarded-replacement cases                                                    | Lexical tests alone do not qualify filesystem trust.                                                                                                                                                   |
| Process/Git boundary               | `node --test tests/native/bounded-process.test.mjs tests/native/git-qualification.test.mjs tests/native/repository-rewrite.test.mjs`                                                           | Include captured-output, malformed-response, timeout/cancel and multi-batch coverage.                                                                                                                  |
| CLI and schema boundary            | `node --test tests/cli-flexibility.test.js tests/native/cli-events.test.mjs tests/native/public-api.test.mjs tests/contracts.test.js`                                                          | Verify all producer and failure paths; do not count schema compilation as event validation.                                                                                                            |
| Discovery and format               | `tests/native/repository-discovery.test.mjs`, `tests/formatting.test.js`, `tests/source-presentation.test.js`, `tests/native/formatting.test.mjs`, `tests/native/guarded-replacement.test.mjs` | Use the native Node test runner on the impacted files and preserve independent token expectations.                                                                                                     |
| Existing focused profile           | `npm run check:focused`                                                                                                                                                                        | Currently contracts, identity and Markdown tests; insufficient alone for performance boundaries.                                                                                                       |
| Affected graph                     | `npm run check:affected -- --base FULL_COMMIT_SHA`                                                                                                                                             | Supply the actual frozen baseline; inspect impacted coverage and do not infer completeness from a small selected set.                                                                                  |
| Full relevant source assurance     | `npm test`, `npm run check:architecture`, `npm run lint`, `npm run format:check`                                                                                                               | Full current inventory; preserve explicit skip/failure reasons and actual commands.                                                                                                                    |
| Exact-source final assurance       | `npm run check:full` on clean committed source                                                                                                                                                 | Includes Node/resource/architecture/release checks, full tests, lint/format, package qualification and JSON self-check. Dirty candidate timing cannot substitute for transported-source qualification. |
| Installed/hosted qualification     | Existing runtime matrix, package qualification and authorized hosted CI                                                                                                                        | CLI, library, ESLint plugin and schemas on Windows/Linux supported Node lanes; separate from local results.                                                                                            |

The implementation owner must inspect and bind actual HISEW focused/affected/full profiles before execution, preserving configured obligations and recording input-semantics gaps rather than inventing a passed profile.
Capability inspection/resolution for review or security is due when that operation is authorized, using current tools and persisted scoped authority; availability is not completed review.
No provider scan or external message is needed merely to save this draft.

## Compatibility, data lifecycle, security and recovery

No persisted user-data schema, public event schema, contract cohort, native wire schema or public API change is intended.
Consequently there is no planned database backfill or data migration.
If a selected implementation needs a native census field, wire change, public option or supported-consumer migration, stop and re-baseline that slice with its real compatibility obligations.
Any internal tool result-shape change must update and test every caller together; do not add a legacy bridge without an explicit scoped NSH-01 decision.

Interruption of checking cannot create complete success.
Interruption during write processing must retain the existing distinction between completed writes, untouched remaining files and an uncertain current path.
Resume by reopening a fresh execution and rechecking current policy, inventory and source identities, not by reusing stale ignore results or path caches.
Owned temporary inputs, captured output, formatter snapshots, native scratch and process handles must settle on success, error and cancellation; retained benchmark evidence has an explicit owner and retention purpose.

Security assessment focuses on filesystem containment, Windows junction/case/volume behavior, Git executable/environment authority, output framing/UTF-8, resource exhaustion, event-validation provenance, subprocess isolation and write preflight freshness.
Private repository contents, raw JSON, absolute paths and environment secrets must not be emitted into routine benchmark telemetry; use synthetic fixtures and scoped aggregate records.
The designated native security workflow owns the eventual scoped assessment of the frozen implementation; ordinary review and deterministic negative tests remain necessary.
This draft's static concerns are hypotheses and design constraints, not a completed native security scan.

### Rollout and observation

The integration owner first qualifies each included slice in isolated fixtures, then freezes the combined exact source for independent verification and platform/installed-package qualification.
The release owner decides packaging, channel and publication only after separate release-readiness assessment.
The observer is a named maintainer appointed before rollout; the role is unassigned in this draft.
No change to the current registry channel or consumer cohort is assumed from the audits' “immediate deployment” wording.

Observe actual check/format/normalize duration, timeout/capacity failures, child count by role, peak memory/scratch, incomplete-event delivery, write-refusal reasons and cleanup failures against the accepted cohort.
Use explicit pilot invocations and existing local/CI evidence collection; no unsolicited telemetry service or automatic recurring monitor is introduced.
Acceptance requires demonstrated user-visible benefit without increased incorrect writes, missed obligations or resource escapes.
Reassess at baseline, material design change, pre-review and post-release observation; a faster microbenchmark with worse end-to-end behavior is insufficient.

Abort rollout for any lost containment/meaning/authorization invariant, malformed output accepted as success, sustained budget regression, memory growth outside the accepted envelope, or unowned child/scratch retention.
Pause affected new writes and investigate with retained identities and evidence.
Code rollback can select an exact previously qualified supported artifact or a reviewed revert/forward fix under the release owner's decision.
It cannot restore already rewritten user files automatically.
Restoring source data requires recorded preimages, current-hash reconciliation and explicit owner authorization so intervening user edits are preserved.
There is no blanket promise of safe batch rollback or permission to reactivate unsupported consumers.

## Unknowns, cheapest experiments and replanning triggers

| Unknown                                                     | Cheapest discriminating evidence                                                                 | Decision owner / consequence                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Which patch caused each reported improvement?               | One fixture, paired baseline/candidate and single-change ablation with process/syscall counters. | Performance owner; reorder or omit low-value changes.                                     |
| Are 256 paths compatible with byte/working limits?          | Long-path batches near limits, with measured input/stdout and concatenation peaks.               | Process/resource owner; choose byte-aware batching and account retained state.            |
| Can path work be removed under the actual threat model?     | Controlled ancestor/root replacement, same-inode symlink-back and EOF interleavings.             | Filesystem/security owner; retain revalidation if the reduction fails.                    |
| Can a root cache survive failure and multiple sessions?     | A succeeds, B resolution fails, B retries; root pathname reused between sessions.                | Filesystem owner; reject stale/global cache behavior.                                     |
| Is event immutability/provenance enough to skip validation? | Trace all emit paths plus frozen-invalid/nested-mutation/delayed-terminal cases.                 | Event owner; keep boundary validation unless a narrower proof holds.                      |
| Do empty-buffer reuse or directory changes matter?          | Wide/deep trees with separate buffer and iteration variants, allocation and wall-time counters.  | Discovery owner; omit syntax-only changes without material benefit.                       |
| Is Prettier batching a net win with current guards?         | 1/10/100 changed files using owned snapshots, same native comparison and resource budget.        | Formatting owner; choose supported batching, revisit design or keep current verification. |
| Are CI limits portable?                                     | Frozen Windows/Linux cohorts with quiet/loaded paired data.                                      | CI owner; accept distinct budgets or diagnostic-only timing.                              |
| Are source claims reproducible?                             | Locate original raw artifacts or regenerate from an immutable source/fixture recipe.             | Independent verifier; retain unverified labels if provenance cannot be recovered.         |

Replan when HEAD or the six candidate hashes drift, the retained execution changes ownership/generation, the oversized-JSON work changes resource/census contracts, a public or native schema must change, or a new consumer/deployment boundary appears.
Re-baseline if a selected dependency/runtime changes, Windows/Linux results materially disagree, accepted budgets change, new safety evidence invalidates the design, or throughput gains require greater concurrency or less verification.
Do not silently expand this plan into parser replacement, arbitrary cache persistence, generic worker infrastructure or unrelated cleanup.

## Preserved rejected alternatives and complete source mapping

Both reports reject removing `observeRegularFile` descriptors: device/inode and preimage integrity remain material across Windows volume behavior and symlink attacks.
SRC-A additionally rejects replacing native `posix.matchesGlob` with custom regular expressions, reporting less than one microsecond compilation cost on Node 24; the performance claim is unverified here and is not a reason to create a shadow glob implementation.
SRC-B rejects a hand-written Ajv replacement because the measured validation cost is small relative to maintenance/semantic risk.
SRC-B also rejects syntax-only `for...of` to indexed-loop changes, claiming equivalent TurboFan output; that code-generation claim has not been independently reproduced.
The separate directory-iteration proposal is an I/O buffering/lifecycle experiment, not permission for blanket loop rewrites.

| Source content                                                            | Location in this synthesis / retained status                                                                                                                                      |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SRC-A activity preamble and companion link                                | Provenance section; complete literal source retained in SRC-A copy.                                                                                                               |
| SRC-A A / SRC-B Executive Summary, architecture and top hotspots          | Purpose, finding inventory, scope and ordered slices.                                                                                                                             |
| SRC-A B / SRC-B Performance Baseline                                      | Environment, all workloads, raw baseline samples and consolidated result table.                                                                                                   |
| SRC-A C / SRC-B Hotspot Table                                             | All PERF-01 through PERF-06 assessments, causal mechanisms, effort/risk and dispositions.                                                                                         |
| SRC-A D / SRC-B Complexity and Cost Analysis                              | Reconciliation table, formulas, 500/1,800-file examples and microbenchmarks. Original ASCII/Mermaid illustrations retained in the source copies.                                  |
| SRC-A E / SRC-B Detailed Causal Analysis                                  | PERF-01/02 causal descriptions, profile numbers, patch hypotheses and SLICE-002/003.                                                                                              |
| SRC-A F / SRC-B Verified Remediation Patches                              | All five complete unified diffs retained byte-for-byte; their behavior and required qualification synthesized in slices, without treating the literal patches as accepted design. |
| SRC-A G/H / SRC-B Benchmark Plan and Results                              | Exact and rounded results, workload-letter discrepancy, methodology, test counts, named regressions and architecture/lint claims.                                                 |
| SRC-A I / SRC-B CI Performance Gates                                      | Both conflicting timing budgets, proposed script names and corrected process-count gate.                                                                                          |
| SRC-A J / SRC-B Remediation Roadmap                                       | Applied-candidate status, Prettier/traversal experiments and the union of all rejected alternatives.                                                                              |
| SRC-A Top Three Changes to Implement First                                | Preserved priority, expected effects, source validation commands and conditional success criteria in SLICE-002/003 and verification tables.                                       |
| Missing Linux/large-monorepo evidence and unspecified SLO/workload inputs | QA-007/011, benchmark protocol, prerequisite decisions and unknowns.                                                                                                              |

## Completion conditions for the future implementation

The integration owner may request implementation completion only when every included slice has accepted requirements and design, passing linked proof, resolved applicable review/security findings and an explicit disposition of excluded experiments.
Raw evidence must bind the final source, fixtures, runtime/platform identities and declared limitations.
Final configured verification profiles and applicable installed-consumer/platform qualification must be complete; local audit claims cannot substitute.
Performance budgets must be accepted and demonstrably enforced, with no regression in correctness, authorization, resource ownership or cleanup.
Release, consumer activation and observed production benefit remain separately recorded outcomes.

This revision delivers the requested plan and complete source preservation only.
