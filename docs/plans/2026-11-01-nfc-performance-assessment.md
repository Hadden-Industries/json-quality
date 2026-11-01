# NFC default: performance and collision assessment

Original assessment: 2026-11-01; revision-3 refresh: 2026-11-02, Europe/Bucharest.
Scope: Windows source checking of a fixed representative Google JSON snapshot and controlled synthetic inputs.
Related design: [implementation plan, revision 3](2026-11-01-zero-config-opinionated-policy-implementation-plan.md).
Status: exploratory development/uncommitted implementation evidence, not release or end-to-end qualification.

The original sections below retain the earlier implementation's observations and explicitly historical gaps.
The [revision-3 measurements](#revision-3-implementation-refresh) supersede statements about what exists today; the original baseline evidence files are unchanged.

## What the comparison means

The existing native checker already selects NFC when `normalization` is omitted.
The repository policy also currently fixes its default to NFC.
Making that same value package-owned removes consumer configuration ceremony; it does not introduce a new Unicode normalization pass for an existing default consumer.
The attachment likewise keeps `format` presentation-only and makes filesystem Unicode changes explicit through `normalize`.

Three current public source-session paths were measured:

| Mode             | Actual measured contract                                   | Relationship to the proposal                                                                          |
| ---------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Existing default | Normalization omitted; current native default is NFC       | Existing default behavior, not a hypothetical preservation-only old version                           |
| Explicit NFC     | Same bytes and source contract plus `normalization: "NFC"` | A proxy for the unchanged NFC checking work that the proposed built-in policy will select             |
| Preserve         | Same bytes plus `normalization: "preserve"`                | Current cost of opting out; currently skips both value normalization and NFC-equivalent-key detection |

The future zero-config resolver, policy-absence observation, preserve-mode key advisories and normalization preview do not exist yet and were not benchmarked.
An earlier package/binary was not installed, and no historical release comparison is claimed.

## Representative repository and method

The application sample is `C:/Users/maksy/GitHub/google`, commit `74b07e95bd8988117db9c02157291e83339c9417`.
Its working tree was clean when captured.
The measured corpus contains **105 tracked regular JSON files, 1,963,585 bytes (1.87 MiB)**, including extension/application metadata and application schemas.
The exact selection excludes dependency/build/vendor paths, lockfiles, fixtures/oracles/invalid cases and minified/map files; the regex and every selected pathname/byte count/hash are retained in the [corpus manifest](2026-11-01-nfc-performance-evidence/corpus.json).
This is a declared representative subset, not complete repository discovery or a claim that excluded owned JSON should disappear from product checking.

An initial descriptive census found 68,512 decoded strings and keys, of which 237 were non-ASCII, spread across 11 files.
It found no non-NFC strings and no NFC-equivalent key groups; the native checker independently emitted no Unicode/key findings for the measured sources.
The descriptive census uses `JSON.parse` and host normalization, so it loses duplicate members and number lexemes and is not a correctness oracle.
Its host ICU/Unicode versions differ from the native component; native results own product behavior.

The harness copied selected bytes to an isolated local snapshot and verified their SHA-256 before checking.
After all measurements, hashes of every selected source file still matched; no source document was formatted or normalized on disk.
Source JSON contents remain in the local snapshot, not in the repository evidence packet.

Each mode/workload ran in its own fresh Node process, sequentially.
One warm-up per mode/workload was discarded, followed by seven rounds with rotated mode ordering: 84 measured processes and 12 warm-ups.
Each source used 64 KiB chunks and one public source session per corpus; all source terminals and diagnostics were consumed.
Default and explicit-NFC findings, terminal counts and native identity matched in every measured pair.

The checking interval includes snapshot reads and hashing, streaming capture, native checking and event delivery; it excludes module import and native-session acquisition.
Separate process-wall timings include startup, imports, component verification, checking and cleanup.
Neither interval includes npm invocation, Git discovery, repository policy bootstrap, guarded filesystem writes or a future dry-run implementation.
Filesystem caches were not flushed, CPU affinity/power state was not controlled, and other desktop work may have affected timings.
Seven observations characterize this host/workload; they are not a confidence interval or cross-platform SLO.

| Environment                   | Observed identity                                                  |
| ----------------------------- | ------------------------------------------------------------------ |
| JSON Quality source           | `3d4db7106b44e226607ceee6500258c9b94e14cd`                         |
| Native source-input SHA-256   | `ee38d2cf6af3272fe0076c49746e49f139a6ad931b6ae2e67555f2df07484c11` |
| Node / platform               | Node `26.13.0`, Windows x64                                        |
| CPU                           | Intel Core i9-12900K; 24 logical CPUs                              |
| Native ICU / Unicode / SQLite | `79.1` / `18.0` / `3.54.1`                                         |
| Host Node ICU / Unicode       | `78.3` / `17.0`; descriptive census only                           |

## Measurements

Times below are median source-checking milliseconds; parentheses show the observed minimum and maximum across seven measured runs.
Each row compares exactly the same bytes across modes.

| Workload                       | Bytes     | Existing default       | Explicit NFC           | Preserve               |
| ------------------------------ | --------- | ---------------------- | ---------------------- | ---------------------- |
| Google, 105 JSON files         | 1,963,585 | 226.40 (222.51-253.94) | 228.02 (219.56-243.02) | 227.21 (222.78-231.46) |
| ASCII control                  | 330,169   | 13.19 (12.58-13.57)    | 13.04 (12.67-13.45)    | 13.17 (12.65-14.02)    |
| Unicode-heavy, already NFC     | 395,705   | 36.15 (35.33-36.76)    | 35.87 (35.38-37.13)    | 14.04 (13.48-14.69)    |
| Unicode-heavy, decomposed text | 461,241   | 38.88 (37.30-40.40)    | 38.60 (38.26-39.90)    | 14.52 (14.27-14.79)    |

On Google, explicit NFC versus existing default differs by **1.62 ms / 0.72%** between medians, with extensively overlapping ranges.
The median within-round difference is **-0.11 ms**, ranging from **-16.54 to +15.27 ms**.
There is no convincing measured added normalization cost between these two selectors, consistent with their identical native path.
The 0.81 ms / 0.36% median difference between NFC and preserve on this largely ASCII corpus is also too small relative to variation to claim a reliable speedup from opting out.

The Unicode-heavy controls show the real possible cost of NFC compared with preservation: **+21.83 ms (2.55 times the checking time)** for already-normalized text and **+24.08 ms (2.66 times)** for decomposed text.
Their paired increases are consistently positive, about 21-26 ms.
The decomposed case emits 64 NFC findings; its delta includes diagnostic handling as well as normalization work.
These synthetic inputs have ASCII keys and repeated non-ASCII values; they are sensitivity controls, not estimates of how much Unicode the Google repository contains.
Do not extrapolate a constant multiplier to arbitrary repositories, languages, key sizes or combining sequences.

Median complete process-wall times were:

| Workload            | Existing default | Explicit NFC | Preserve  |
| ------------------- | ---------------- | ------------ | --------- |
| Google              | 480.96 ms        | 491.33 ms    | 482.51 ms |
| ASCII               | 265.46 ms        | 267.91 ms    | 266.92 ms |
| Already-NFC Unicode | 295.39 ms        | 294.29 ms    | 270.75 ms |
| Decomposed Unicode  | 291.13 ms        | 287.52 ms    | 261.21 ms |

Process startup and component acquisition dilute the checking-only percentage on small documents.
These are Node benchmark subprocess timings, not measured `npm exec` latency.

### Memory, storage and outcome caveats

Google's native managed peak was 27,855,512 bytes for default, 27,855,620 for explicit NFC, and 27,851,236 for preserve: about 26.57 MiB in all modes, with only 4,384 bytes between explicit NFC and preserve.
Observed process peak RSS was about 117 MiB in all three modes and varied more than their between-mode differences.
Managed allocation accounting and whole-process RSS measure different things and must not be added together.

The decomposed Unicode control used 443,048 additional native managed-peak bytes (0.42 MiB) under explicit NFC compared with preserve.
The already-NFC control had equal measured native managed peaks for those two modes despite the additional processing time; this does not prove zero transient allocation.
Every measured run reported zero scratch spill.
This corpus does not characterize disk-spilling normalization or arbitrarily long combining runs.

All 105 Google sources completed parsing and diagnostic delivery.
Eighty had presentation findings under the package's default presentation contract in every mode; only 25 were fully quality-passing.
No source was repaired to manufacture a clean benchmark, and this evidence does not qualify the Google repository under a complete JSON Quality policy.

## Why costs vary, and what remains unmeasured

Source inspection establishes an ASCII fast path in `native/core/document_check.hpp`: decoded ASCII aliases its normalized representation and bypasses ICU normalization.
Non-ASCII strings still undergo native normalization/comparison even when already NFC, explaining the Unicode-heavy control.
The native algorithm uses ICU-owned decomposition/composition rules with bounded storage for intermediate data; transformed strings and normalized key indexes can increase managed state and eventually spill under larger workloads.
The behavior is consistent with the [ICU normalization model](https://unicode-org.github.io/icu/userguide/transforms/normalization/) and the [Unicode normalization specification](https://www.unicode.org/reports/tr15/tr15-58.html); performance estimates here come from this implementation, not those specifications.

Expected effects on consumers are therefore:

- **Existing NFC-default consumer to built-in NFC:** the normalization algorithm is unchanged.
  New resolution/absence handling and richer reporting still need final implementation measurements; a shorter config bootstrap could save some setup cost, but no saving is claimed here.
- **Preserve consumer to NFC enforcement:** mostly ASCII data may show little observable change; Unicode-heavy values can materially increase checking work even if already normalized.
  Additional findings and normalized representations add cost when text differs.
- **Explicit normalization writes:** candidate construction, second checks, change reporting and guarded file replacement add work beyond check.
  A preview avoids source writes but still needs collision-safe preparation.
  Neither latency was measured by this experiment.
- **New preserve-mode collision advisory:** comparison requires NFC for non-ASCII keys even though values stay preserved.
  The current preserve benchmark skips that work and is a lower-work reference, not a benchmark of the proposed advisory implementation.
  Add a key-heavy control before qualification.
- **Large or adversarial Unicode:** long combining sequences, large keys, many collisions and exhausted budgets can increase index/temporary-storage work.
  Existing bounded resource and incomplete-delivery guarantees must remain; no fixed percent overhead or no-spill promise follows from this sample.

## Collision behavior observed

Four bounded current public-API cases were checked under NFC and preserve; normalization used the string-returning API, never a filesystem writer.

| Case                                             | Current result                                                                                     |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `\u00e9` and `e\u0301` in one object             | NFC collision finding; normalize refused with no returned normalized text                          |
| `a` and `\u0061` in one object                   | Exact duplicate finding in both modes; normalize refused                                           |
| Canonically equivalent names in separate objects | No cross-object collision; normalize succeeded and a second normalization returned identical bytes |
| A decomposed string value                        | Normalize succeeded and was byte-idempotent on the second call                                     |

Current preserve mode did not report the canonical-equivalent-key risk, confirming the implementation gap for the proposed non-blocking advisory.
Exact duplicate rejection remained active.
These probes do not establish repository batch atomicity or the proposed preview contract; both need implementation tests.

Source review also identified a diagnostic-aggregation case for the new test matrix: in a three-key group such as composed, decomposed, decomposed, `latestNormalizedDifferent` can be reset by a later exact-match candidate.
The later member's additional collision occurrence can therefore be omitted; an earlier collision and the exact duplicate still prevent normalization, so this is not evidence of an observed unsafe-write bypass.
Revision 2 requires aggregation over every matching candidate, permutation tests and independent exact comparisons even under forced digest collisions.

## Retained evidence and reproduction

- [Summary and ranges](2026-11-01-nfc-performance-evidence/summary.json).
- [All measured runs and warm-ups](2026-11-01-nfc-performance-evidence/results-google-ascii-unicode-nfc-unicode-nfd.json), including harness/corpus digests and native identities.
- [Corpus inventory and selection](2026-11-01-nfc-performance-evidence/corpus.json), containing paths and hashes, not source document contents.
- [Collision probe outcomes](2026-11-01-nfc-performance-evidence/collision-probes.json).
- [Exact benchmark harness](2026-11-01-nfc-performance-evidence/nfc-benchmark.mjs.txt) and [summary calculation](2026-11-01-nfc-performance-evidence/summarize.mjs.txt), retained as text rather than product modules.

The original and refresh benchmark temporary directories, including private corpus snapshots and runnable harness copies, were removed to the Windows Recycle Bin after the compact evidence was retained, as requested.
The committed manifests, baseline results and harness text remain; no Google source contents were added to the evidence packet.
Reproduction requires a fresh owned snapshot matching every retained corpus hash, rather than treating a later changed checkout as the same workload.
No dependency installation, native rebuild, release, hosted qualification or downstream migration was performed for this assessment.

## Revision-3 implementation refresh

The refreshed run checked the exact earlier 105-file, 1,963,585-byte snapshot and the same ASCII/already-NFC/decomposed controls.
It did not recapture, modify or benchmark discovery of the Google checkout.
Two new key-heavy controls characterize the implemented preserve-mode advisory path.
The adapted public API uses `includeValueEvents` and `implementationIdentity`; omitted normalization still selects NFC.

The candidate was uncommitted development source above HEAD `4401fc346e0628c0ca71461f7849ffb385d67834`.
Later type, qualification-receipt and CLI-entry repairs did not change the measured NFC checking path.
The startup/process-wall figures describe this captured candidate, before the symlink-entry repair; they are not final-candidate startup measurements.
The [source-input manifest](2026-11-02-nfc-performance-evidence/source-inputs.json), covering package metadata/lock and JavaScript/schema/asset owners, has compact-tuple SHA-256 `e66b68de7aeebd9b8a79c9f57969ea1175956cfb44cd6a22d1896f22a21175a4`.
Before/after source manifests and all snapshot hashes matched.
Native source-input SHA-256 was `8211af33775447a9b78354058ac4ae8f61ac3bbe9cf25588e80e976b1496bbb2`, with ICU/Unicode/SQLite `79.1` / `18.0` / `3.54.1`.
The host remained Node `26.13.0`, Windows x64 and the same i9-12900K; host ICU/Unicode were `78.3` / `17.0`.

The six workloads used 126 measured fresh processes and 18 discarded warm-ups: one warm-up per workload/mode, then seven rounds rotating default/NFC/preserve order.
Runs were sequential during a requested quiet local CPU window, from 22:35:18 to 22:36:06 UTC on November 1 (November 2 locally).
No affinity, cache flushing, GC control or power-state control was applied.
Each checking interval still includes snapshot reads/hashing, capture, checking and complete event delivery, and excludes imports/acquisition; process-wall intervals additionally include startup/imports/component acquisition/close.
Neither measures npm, repository discovery, actual configuration absence/bootstrap, preview, formatting or filesystem write latency.

### Current source-checking times

Median milliseconds, with observed minimum–maximum over seven runs:

| Fixed workload                           | Bytes     | Default                | Explicit NFC           | Preserve               |
| ---------------------------------------- | --------- | ---------------------- | ---------------------- | ---------------------- |
| Google, 105 files                        | 1,963,585 | 209.54 (199.49–228.95) | 215.23 (199.18–222.68) | 203.23 (200.15–223.94) |
| ASCII control                            | 330,169   | 13.55 (13.37–15.15)    | 13.80 (13.52–14.18)    | 13.86 (13.51–13.99)    |
| Already-NFC Unicode values               | 395,705   | 35.07 (34.51–37.51)    | 35.53 (34.92–38.44)    | 14.45 (13.60–15.37)    |
| Decomposed Unicode values                | 461,241   | 39.19 (36.86–42.83)    | 38.74 (38.15–40.95)    | 15.89 (15.27–18.17)    |
| 2,048 distinct NFC Unicode keys          | 42,839    | 19.21 (18.03–20.32)    | 18.91 (18.31–20.40)    | 18.82 (18.18–22.60)    |
| 256 objects with two NFC-equivalent keys | 10,791    | 21.88 (19.89–26.47)    | 21.91 (20.19–24.58)    | 16.94 (15.65–20.08)    |

Google default and explicit NFC had identical outcomes and native identity in every round.
Their difference of medians was +5.69 ms, while the paired within-round median difference was +1.59 ms (−15.94 to +16.72 ms).
The overlapping ranges and sign-changing paired differences do not demonstrate a reliable cost difference between those selectors.
Explicit NFC versus preserve on Google differed by +12.00 ms between medians, but its paired difference likewise changed sign (median +3.11 ms, −24.76 to +18.65 ms).
This sample does not establish a stable opt-out speedup on the representative repository.

For Unicode-heavy values, explicit NFC versus preserve added 21.08 ms (2.46× total checking time) for already-NFC text and 22.85 ms (2.44×) for decomposed text.
Paired differences were consistently positive: 20.19–23.58 ms and 20.58–25.06 ms respectively.
The latter includes delivery of 64 NFC findings; preserving values avoids that work.

### Direct comparison with the earlier run

Observed change in source-checking medians against the retained November 1 baseline:

| Same fixed workload        | Default            | Explicit NFC       | Preserve            |
| -------------------------- | ------------------ | ------------------ | ------------------- |
| Google                     | −16.85 ms (−7.44%) | −12.79 ms (−5.61%) | −23.98 ms (−10.55%) |
| ASCII                      | +0.36 ms (+2.71%)  | +0.76 ms (+5.84%)  | +0.69 ms (+5.22%)   |
| Already-NFC Unicode values | −1.08 ms (−2.98%)  | −0.34 ms (−0.94%)  | +0.41 ms (+2.92%)   |
| Decomposed Unicode values  | +0.31 ms (+0.80%)  | +0.14 ms (+0.36%)  | +1.37 ms (+9.42%)   |

These are measurements at different times of different implementations, not paired old/new runs under one frozen load.
The fixed bytes, host/runtime and sampling scheme support a transparent comparison, but do not isolate causal revision-3 overhead or prove the common-path performance acceptance gate.
The mixed direction across workloads does not justify claiming a general speedup or a constant regression multiplier.
Startup/acquisition also matter: current Google process-wall medians were 485.90 / 491.03 / 474.53 ms for default/NFC/preserve, versus earlier 480.96 / 491.33 / 482.51 ms.
These remain Node subprocess measurements, not `npm exec` or end-to-end zero-configuration latency.

### Advisory cost, outcomes and memory

The 2,048-key control exercises normalization/indexing even under preserve, with no collisions or findings; explicit NFC and preserve medians differed by only 0.09 ms with overlapping ranges.
The collision control delivered exactly 256 non-blocking `nfc-key-collision-risk` events under preserve, zero findings and positive quality.
Default/NFC each delivered 256 collision plus 256 unnormalized findings and negative quality.
Preserve's lower collision-control latency therefore includes different diagnostic work; it does not measure an isolated advisory tax.
No earlier key-heavy baseline exists, so the new controls must not be called an old/new measurement of the added key path.

All 105 Google sources parsed and completed diagnostics in every mode; the same 80 presentation findings and 25 quality-passing sources remained.
No Unicode findings or advisories appeared on that corpus, and no source was repaired to improve its result.
Current Google managed peaks were 28,511,930 / 28,512,038 / 28,424,358 bytes for default/NFC/preserve, roughly 27.1–27.2 MiB, versus the earlier roughly 26.57 MiB.
Current median process maximum RSS was about 123.46 / 121.90 / 121.71 MiB; those are separate process measurements, not amounts to add to managed accounting.
Every workload/mode reported zero scratch spill; large spilling inputs, long combining runs, saturation and other platforms remain uncharacterized.

### Pure resolver microbenchmark and retained refresh evidence

Separately, one process after module import ran one discarded 100-call warm-up per input and seven alternating 100-call batches.
`resolveJsonQualityPolicy(undefined)` took a median 0.010737 ms per call (0.010245–0.014544); `{}` took 0.011200 ms (0.010325–0.020475).
Both returned independent frozen cohort-4 NFC policies.
This measures pure snapshot/resolution/freezing and the call boundary; it excludes filesystem absence observation, native bootstrap/reservations, Git/discovery, parsing, startup and npm.
It is not a measured repository setup saving, and these small batching/JIT-sensitive figures are not an SLO.

- [Refresh summary and ranges](2026-11-02-nfc-performance-evidence/summary.json).
- [Compact samples, warm-ups and stable outcomes](2026-11-02-nfc-performance-evidence/results.json), retaining six-decimal timing precision and all measured rounds.
- [Exact adapted harness](2026-11-02-nfc-performance-evidence/nfc-revision3.mjs.txt), [resolver harness](2026-11-02-nfc-performance-evidence/resolver-benchmark.mjs.txt) and [summary calculation](2026-11-02-nfc-performance-evidence/summarize-revision3.mjs.txt).

The retained compact samples independently reproduced the summary byte-for-byte.
All three new JSON evidence files passed native strict admission; the three retained JavaScript harnesses passed scoped ESLint, and this assessment passed Markdown formatting/checking.
The implemented collision/advisory and policy-race tests are behavioral evidence owned by their test runs; this timing experiment does not replace them or establish preview/write safety, installed consumer acceptance, Linux qualification or publication.
