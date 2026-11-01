# NFC default: performance and collision assessment

Date: 2026-11-01, Europe/Bucharest.
Scope: current Windows implementation, a representative Google repository JSON sample, and controlled synthetic inputs.
Related design: [implementation plan, revision 2](2026-11-01-zero-config-opinionated-policy-implementation-plan.md).
Status: exploratory performance evidence and bounded behavior probes, not qualification of the proposed implementation.

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

The runnable local harness and unchanged source snapshots remain at `C:/Users/maksy/Documents/Codex/2026-11-01/json-quality-nfc-performance`.
The corpus and result identity bind the captured state; do not overwrite that snapshot or call a later changed checkout the same workload.
A reproduction should use a fresh owned directory and compare manifest hashes, native identity and outcomes before comparing timings.
Example commands for the retained local harness are:

```powershell
node C:\Users\maksy\Documents\Codex\2026-11-01\json-quality-nfc-performance\nfc-benchmark.mjs run
node C:\Users\maksy\Documents\Codex\2026-11-01\json-quality-nfc-performance\summarize.mjs
```

Those commands rerun measurements against the existing snapshot and overwrite their local result files; copy the harness/snapshot into a new owned directory to retain the original run.
No dependency installation, native rebuild, release, hosted qualification or downstream migration was performed for this assessment.
