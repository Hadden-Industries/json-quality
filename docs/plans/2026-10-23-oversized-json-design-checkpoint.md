# Oversized JSON accepted design checkpoint

This records the first implementation checkpoint of the [revision 4 plan](2026-10-21-oversized-json-values-implementation-plan.md).
The requester authorized implementation on the existing synchronized `main`, preauthorized commit messages and necessary configuration changes, required no regression at p95, and deferred Linux qualification to standard remote GitHub Actions CI.
The original plan, research and historical proof remain unchanged.

The integration owner accepts the Windows candidate foundation and the decisions below for continued private-core integration.
This checkpoint establishes neither a shipped package nor completion of the remaining slices.
The requester's sequencing applies: consolidate implementation before broad reviews, use narrow follow-ups, and reserve external review, security review and the necessary full test run for the final candidate, with external findings resolved before security/full verification.
Claude reviews use Opus 5.5 with a maximum of 30 minutes per run.

## Authority and source identity

| Subject                   | Accepted identity                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Initial local/remote main | `af739711efcea4edb80070950277e6b897c8899b`                                                                     |
| Requirement snapshot      | `7765669d-ab11-4fb0-8145-65b6ae264d66`                                                                         |
| Plan SHA-256              | `ffa01f6d6d034fb417dd661dd990ba99f28f06f3f6f585593b69eb6c1bd8a0c5`                                             |
| HISEW execution           | `0285706b-d3bb-4137-a721-14550c0ea026`, R2                                                                     |
| Implementation owner      | JSON Quality integration owner for this execution                                                              |
| Evidence classification   | External operator qualification records; these are not native full-verification or independent-review receipts |

All qualification implementation has so far remained in the separately allocated candidate workspace.
Other consumer repositories were inspected read-only; their active work and execution ownership remain with their existing owners.

## Dependency and platform decisions

Use Boost 1.92.0 strict `basic_parser` with `numbers=none` as the sole document grammar authority, SQLite 3.54.1 for private indexed metadata and public backup, ICU4C 79.1 with Unicode 18.0 data for Unicode primitives, and double-conversion 3.4.0 for bounded producer-number presentation.
Node uses Node-API 9; the non-Node executable uses the same core service.
Neither binding owns a second parser or rule implementation.

| Source artifact                    | SHA-256                                                            |
| ---------------------------------- | ------------------------------------------------------------------ |
| Boost 1.92.0 source archive        | `c4a3b310ddd2472416e091067166b0713be97c63f38c212c484ada022fd296ce` |
| ICU 79.1 source archive            | `86fed675c2270afd2faa4ec0c3f37342bd38740feb101432e131758292ae72e7` |
| SQLite 3.54.1 amalgamation archive | `0a9c8e34352dad46006aa82836d5383bff9dc6bc9ce5a60553c05aa30e6ad1f9` |
| double-conversion 3.4.0 archive    | `254abbf4fa464b36d485b3ad97da672bb21a326139627c5c29365f83aae2b8a2` |
| Unicode 18 normalization corpus    | `25a50d816764b04abfb4a646d3eb2b2a803284c3873d9a06757b94fe4513dde3` |

Retain the original Boost, ICU/Unicode, double-conversion, SQLite and Node notices and source coordinates in the final artifact closure.
The experimental Windows source build uses the installed MSVC toolchain, a static C runtime, static ICU common code and embedded ICU data.
ICU external data-file lookup is disabled before initialization.
The qualified addon dependency inspection found only `bcrypt.dll`, `node.exe` and `KERNEL32.dll`.
This supports the Windows packaging direction without requiring a consumer compiler, ICU installation or runtime download.
Final distribution terms, exact packaged components, clean installed acquisition, supported Node versions and release acceptance remain SLICE-006/008 obligations; dependency inspection alone does not establish them.
Linux has no local qualification claim under the requester's explicit deferral.

## Resource decisions

| Control or reserve                 | Initial value        | Reason                                                                                                          |
| ---------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------- |
| Aggregate managed-memory target    | 32 MiB per execution | Measured small-path and active-rule transitions; preserves headroom without the 64 MiB trial's larger retention |
| Minimum supported target           | 16 MiB               | Current store grid and failure cases progress within the finite reserve policy                                  |
| Payload segment                    | 64 KiB               | Matches bounded transport/read fragments; avoids 16 KiB splitting and 256 KiB minimum segment reservation       |
| Bounded working reserve            | 8 MiB                | Explicit owner of bounded parser/rule/binding work; growing SQLite/control/payload state is charged separately  |
| Transition headroom                | 1 MiB                | Reserved before switching; migration includes both metadata backings and copied payload                         |
| Peak temporary reservation limit   | 2 GiB per execution  | Finite initial scratch policy, including metadata, journals, captures, derived representations and migration    |
| Default nesting depth              | 128                  | Finite non-spillable parser state; deeper input receives an explicit operational outcome                        |
| Supported nesting-depth ceiling    | 4,096                | Explicit bounded implementation limit; no claim of unlimited native stack/state                                 |
| Initial active checking lane count | 1                    | One owner/controller; higher concurrency requires shared-budget admission and fairness proof                    |

These values govern private-core integration and must be projected from one public policy authority during SLICE-005.
They are not a waiver for unaccounted inventory, adapter, binding or worker growth.
If a later slice cannot progress within the declared reserves, reopen the affected decision and measurements; do not silently raise the policy.
The existing admission-capacity concepts and override precedence remain requirements of the breaking migration.
Disabling input capacities must not disable managed memory, scratch, depth, trust or completion controls.

The current store grid compared 16/32/64 MiB targets with 16/64/256 KiB segments on 32 MiB of retained payload plus indexed metadata.
All nine cases preserved exact bytes and early references, stayed within their managed targets, transitioned once where required and cleaned their owned scratch.
The 256 KiB segments improved this synthetic bulk throughput; 64 KiB retains the smaller fragment-aligned reservation for the accepted common path.
At the selected 32 MiB/64 KiB point, measured managed peak was 32,606,272 bytes and the transition copied 23,855,104 bytes in approximately 16.6 ms.
These timings describe this Windows experiment, not a universal latency guarantee.

## Semantic and ownership contract

One append-only segmented store retains source bytes, decoded bytes where necessary, derived NFC data and replayable findings.
SQLite metadata, prepared statements, caches, controls and transition destinations have explicit allocation owners.
The quota VFS reserves file growth before writes, including SQLite journals; advisory preallocation cannot evade it.
A failed file shrink does not release its reservation.
Operating-system heap overhead, mapped code/data and parent RSS are measured separately from managed reservations.

An unescaped decoded value may borrow an exact range of the frozen source only after fragment equality establishes its bytes.
Escaping or another byte difference switches that value to decoded retention in the same adaptive store.
Raw, decoded and NFC representations retain distinct identities even when their bytes can share storage.
No reference discloses a backing pathname, and a backing transition does not change its owner/value/range identity.
Session close invalidates borrowed references; malformed range/materialization requests must not erase an already completed check or prevent valid fragment consumption.

The accepted caller examples remain:

1. An ordinary check drains diagnostics, reports independent completion claims and closes automatically; retention below the trigger creates no scratch.
2. An admitted giant source uses the same checker with finite memory and scratch controls, without a parser or storage-mode selector.
3. An advanced cancellable session can open a reference before spill and read it afterward until explicit close.
4. Explicit bounded materialization refuses a value exceeding its allowance while leaving fragment consumption available.

Freeze the exact public API, CLI, native protocol and schema cohort together in SLICE-005.
The experimental framed protocol is private and is not a compatibility contract to preserve.
Remove the displaced public contracts instead of adding aliases or size-dependent legacy readers.

Source byte admission precedes JSONL record counts and final record findings.
A source-start BOM or fatal UTF-8 anywhere has source scope; later trim-only U+FEFF is blank content, while a nonblank later BOM reaches record byte admission.
Records are separated by physical LF, with the shared ECMAScript trim predicate and exact CRLF treatment.
JSONL continues at valid physical record boundaries after a record grammar failure and reports the records/rules actually checked.

Native syntax diagnostics use the maintained parser's failure offset and a distinct syntax phase.
Legacy ESLint positions and their lint-phase projection are not asserted equivalent.
Preserve a reviewed source/record/phase/location mapping when migrating expectations; do not regenerate negative baselines from candidate output.
Other rule identities and multiplicities have finite overlap evidence, and forced digest collisions still require complete byte equality.
Findings include severity, source location and structured arguments; large arguments are references.
Expected negatives remain visible and require exact source bytes and stable diagnostic identities.
Intrinsic quality and expected-contract admission are separate outcomes.

Parser EOF, applicable rule completion, diagnostic delivery and downstream domain admission remain independent claims.
A source terminal does not establish complete repository census or downstream schema/global validity.
The final execution outcome must reconcile those additional obligations.

## Retained focused evidence

| Qualification                               | Observed result                                                                                                                                                         |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ICU 79.1/Unicode 18 official relations      | 100,855 shared-store NFC comparisons passed on the static build                                                                                                         |
| Strict grammar and chunk boundaries         | 845 runs over 283 pinned JSONTestSuite y/n files; two depth-capacity rejections recorded separately, not presented as syntax proof                                      |
| Current rules and six presentation policies | 372 transported finite comparisons; another 372 with every key digest deliberately colliding                                                                            |
| JSONL and selective NFC identity            | 28 focused framing, byte-precedence and pin cases passed                                                                                                                |
| Negative admission and reference lifecycle  | Eight hand-authored expectation/raw-container/cross-source cases passed                                                                                                 |
| Actual payload/metadata transition          | Exact 3.5 MiB decoded escaped value, references read before/after spill, identical complete semantic outcomes at 32/64 MiB targets                                      |
| NFC growth during checking                  | Ordered/reordered 8 MiB combining runs matched retained independent NFC bytes with no spill and with active-rule spill                                                  |
| Non-Node transport                          | Same shared service passed the escaped-value, reference, full-check, source-identity and cleanup case                                                                   |
| Transition and quota faults                 | Eight injected transition stages, quota failure and preservation of a pre-existing root: ten focused cases passed                                                       |
| Current geometric store grid                | Nine target/segment combinations passed                                                                                                                                 |
| Common-path performance                     | 77 real small package/config/schema files from JSON Quality and all four consumers, 770 retained measurements: candidate p95 3.7286 ms, unchanged-checker p95 4.3048 ms |

The earlier common-path failures remain retained.
Profiling isolated SQLite parameter-sensitive recompilation: all 462 key lookups on a representative schema recompiled despite using the expected index.
Enabling SQLite's documented query-plan stability guarantee preserved that index and reduced observed recompiles to zero.
The passing common-path result came from the unprofiled build; the separate profiled build is diagnostic evidence only.

All results above are bounded qualification claims.
Complete census and logical/native providers, complete public resource controls and cancellation, bounded materialization, self-consumption, clean transported artifacts, consumer-owner acceptance, final external/security review, full verification and release-readiness remain required.
Their absence cannot be replaced by the passing subset recorded here.
