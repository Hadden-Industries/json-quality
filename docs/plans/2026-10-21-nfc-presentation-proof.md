# NFC and presentation proof for oversized JSON values

**Date:** 21 October 2026.\
**Applies to:** [issue #3 implementation plan, revision 3](2026-10-21-oversized-json-values-implementation-plan.md), DEC-005/006, QA-005/006, and SLICE-001/003.\
**Source examined:** JSON Quality `6bae0cfb2f7bdb186f31246eb50ecfb8fdfb74df`.\
**Outcome:** NFC and the six per-document presentation mechanisms have feasibility evidence.
The proposed design preserves those selected semantics.
The JSONL follow-up below corrects framing proof coverage; production framing/admission integration remains open.
Product implementation, design acceptance, platform qualification, distribution rights approval and release remain separate obligations.

## Decision and authority

Use ICU 78.3 public normalization primitives with bounded external storage for arbitrary combining sequences.
Keep Unicode data, recursive scalar decomposition, combining classes and valid composition pairs in ICU.
JSON Quality owns the residual external ordering, composition orchestration, exact comparison and resource lifetime.

Preserve all six existing presentation contracts.
Implement their checks in the shared native core: a fixed layout observer for the current Prettier JSON policy; public Boost string serialization on bounded decoded fragments and Google's public ECMAScript number converter for producer policies; shared exact duplicate-key facts and bounded array-index ordering state.
No whole document or scalar is required.

The requester's permission to change all current APIs and consumers remains in force.
It does not need to be used to weaken a quality policy here.
No alias, size-based legacy path, stream-safe mutation, private Unicode table, generic replacement parser, or private decimal-to-binary algorithm is selected.

These conclusions result from primary-source investigation and isolated prototypes, not an implementation in this repository.
The original research changed only the plan and this report.
The later review follow-up updates them with independently validated JSONL findings; it implements no product code.
HISEW dev.29 applicability was read; no execution was selected, adopted, closed, or mutated.
Historical issue #187 evidence was read and reused without alteration.

## Research before custom work

| Candidate or approach                                    | Source-grounded finding                                                                                                                                                                               | Decision                                                                                                                           |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| ICU Normalizer2 whole-string, append and boundary APIs   | Native normalization is maintained, but a boundary segment can itself grow with an arbitrary nonstarter run. A byte-stream API alone does not establish bounded retained memory.                      | Reuse its public scalar operations; do not retain the whole pending segment or normalize arbitrary chunks independently.           |
| ICU 78.3 public C primitives                             | `unorm2_getDecomposition`, `unorm2_getCombiningClass`, and `unorm2_composePair` expose the required native decisions. The decomposition API returns a processed recursive mapping for one code point. | Selected. No private ICU table or implementation code is copied.                                                                   |
| Unicode Stream-Safe, uni-algo, Rust stream-safe adapters | Stream-Safe processing inserts CGJ after long nonstarter runs. The inspected uni-algo normalizer uses this boundary. Such insertion changes the input sequence.                                       | Unsuitable for exact read-only checking and unchanged collision identities.                                                        |
| Rust `unicode-normalization` ordinary iterators          | Inspected decomposition/recomposition code retains a pending combining run in a growable `TinyVec`; an iterator does not prove bounded RAM.                                                           | Not a substitute for the external-storage requirement.                                                                             |
| Full Prettier API                                        | The API consumes a source string. Its exact `json-stringify` printer is much narrower than a general line-wrapping formatter.                                                                         | Retain as an independent finite oracle and explicit writer where appropriate; replace its materializing read-check responsibility. |
| jsoncons stream encoder                                  | Its inspected string visitor accepts a complete `string_view`; streaming an output container does not demonstrate support for a fragmented oversized scalar.                                          | No evidence that it removes this boundary or reproduces all existing policies.                                                     |
| Boost public `serialize` plus double-conversion          | Public string serialization can operate on bounded, complete UTF-8 fragments. `EcmaScriptConverter` exposes the native numeric contract and its 25-character shortest-output bound.                   | Reuse these maintained components, with bounded framing/comparison in the existing core.                                           |
| New generic pretty-printer or normalization package      | Would duplicate maintained scalar semantics or introduce a second JSON authority without demonstrated benefit.                                                                                        | Rejected. The residual custom work is explicitly limited below.                                                                    |

Primary references: [ICU normalization guide](https://unicode-org.github.io/icu/userguide/transforms/normalization/), [exact ICU 78.3 public header](https://github.com/unicode-org/icu/blob/release-78.3/icu4c/source/common/unicode/unorm2.h), [Unicode 17 normalization specification](https://www.unicode.org/reports/tr15/tr15-57.html), [uni-algo normalizer](https://github.com/uni-algo/uni-algo/blob/main/include/uni_algo/impl/impl_norm.h), [Rust decomposition](https://github.com/unicode-rs/unicode-normalization/blob/master/src/decompose.rs), [Rust recomposition](https://github.com/unicode-rs/unicode-normalization/blob/master/src/recompose.rs), [Prettier API](https://prettier.io/docs/api), and [jsoncons encoder](https://github.com/danielaparker/jsoncons/blob/master/include/jsoncons/json_encoder.hpp).
Moving-branch alternatives were inspected as research leads; their downloaded hashes are retained in `sources/manifest.json`.
They are not selected production dependencies.

### Versions and actual terms

The official [ICU release page](https://unicode-org.github.io/icu/download/) identified **78.3** as latest stable and **79.1rc** as a release candidate not intended for production.
ICU 78.3 supplies Unicode **17.0** data.
The current Unicode 18 specification is not authority to mix a different database into this candidate.
Node 24.21.0 on this host also reported ICU 78.3 and Unicode 17.0; its normalization agreed with the selected corpus.

The [latest double-conversion release](https://github.com/google/double-conversion/releases/tag/v3.4.0) was **3.4.0**.
Prettier's installed package and registry latest metadata both identified **3.9.10**.
Boost **1.92.0** is reused from the earlier exact-source parser experiment.
These selections must be refreshed at incorporation if the applicable stable release changes, with affected proofs rerun.
They are not permission to select a beta or pin an obsolete dependency for convenience.

The downloaded ICU and Unicode license texts and the exact double-conversion `LICENSE` were read.
Their local use and notice conditions are recorded in the packet.
The latter requires preservation of notices/disclaimer and prohibits implied endorsement. The ICU distribution includes component-specific notices; a project-level permissive label is not a complete closure assessment. The native C/C++ runtime, selected ICU data and any redistributed source/binaries still require the plan's actual-artifact rights and supply-chain assessment.
No product distribution clearance is claimed.

## DEC-005: NFC without a bounded combining-run assumption

The prototype consumes decoded UTF-8 scalar fragments and emits a derived NFC byte stream into owned scratch.
It never writes normalized bytes back to the source.

1. Decode complete Unicode scalars across fragment boundaries.
   Ask ICU for each scalar's processed canonical decomposition.
   A native size retry, if required, is bounded by one scalar's mapping, not by the incoming value or pending run.
2. Ask ICU for each decomposed scalar's canonical combining class.
   Preserve stable order within each nonzero class using bounded FIFO caches that spill to owned files.
   At a starter or EOF, drain classes in increasing order.
   The class domain is fixed; no sorting array grows with the run.
3. Retain a possible starter and the blocking class.
   Ask ICU whether a pair composes.
   Spool intervening uncomposed output until that starter is final, so a later mark can still compose correctly.
   Handle leading nonstarters and adjacent starters, including Hangul, without inserting boundaries.
4. Compare original decoded bytes with derived NFC bytes in bounded reads for the normalized-strings decision.
   Index the same derived representation for normalized-key candidates.
   Confirm full equality after digest/length filtering and scope identity to the owning object.

This is custom external-memory normalization orchestration.
Calling native primitives does not make its ordering and blocking logic disappear.
REU-01 is satisfied by the explicit maintained ownership and demonstrated residual gap; the implementation must still receive Unicode-focused design/code review and conformance testing.
No claim is made that every possible library was disproved.

The prototype uses 8,192-code-point caches per active class and for the pending composition tail, plus bounded input/output buffers. At most 255 nonzero classes exist in the API's class domain. The Unicode 17 fixture exercised all 55 present nonzero classes and created 56 spill files including the tail. This establishes a fixed class-dependent bound, not a constant independent of selected data, worker count, nesting or all other product state. A production handle/cache budget must include parser, database, capture and transport resources.

### Conformance and scale evidence

The final native conformance run performed **1,232,234 comparisons**:

- All **20,034** rows of Unicode 17 `NormalizationTest.txt`, checking all five NFC column relations: **100,170** official comparisons, also checked with ICU's full normalization API.
- **20,000** deterministic random contexts against the full ICU API, including precomposed/decomposed forms, reordering, exclusions, Hangul, leading marks and supplementary scalars.
- Every **1,112,064 Unicode scalar** individually against ICU's full API.

There were zero mismatches.
A separate Node `.normalize("NFC")` oracle passed the same 100,170 official comparisons.
Python 3.15.0, reporting Unicode 17.0.0, supplied independent expected bytes for bounded boundary/all-class fixtures. These are distinct checks and must not be added together as a count of product tests. The official corpus is available from [Unicode 17](https://www.unicode.org/Public/17.0.0/ucd/NormalizationTest.txt).

The scale families included an initial composition followed by a long equal-class run; an alternating higher/lower-class run requiring reordering and delayed starter composition; and already-normalized counterparts.
Generated expected files were compared byte for byte, not accepted by digest equality alone.

| Payload scale | Ordered / reordered / already-NFC peak working set, MiB | Native elapsed seconds, respectively | Intermediate spool bytes per run |
| ------------- | ------------------------------------------------------- | ------------------------------------ | -------------------------------- |
| 8 MiB         | 5.22 / 5.30 / 5.24                                      | 0.164 / 0.161 / 0.177                | 33,521,664                       |
| 32 MiB        | 5.29 / 5.34 / 5.25                                      | 0.727 / 0.712 / 0.684                | 134,184,960                      |
| 128 MiB       | 5.29 / 5.38 / 5.25                                      | 2.781 / 2.689 / 2.678                | 536,838,144                      |

The non-NFC source families include one additional starter byte.
Already-NFC sources have exactly the displayed payload size.
Output size can differ from input size.
All source hashes remained unchanged.

The all-class case used 550,001 code points, 1,300,001 input bytes, all 55 nonzero classes, 7-byte reads, 56 spill files and **9.03 MiB** peak working set.
Its bytes matched Python's native Unicode normalization.
Thirty bounded cases at 1/7/65,536-byte reads and a spilling leading-mark case also matched expected bytes.

### Collisions, pins and incomplete results

A **41,943,128-byte** synthetic JSON document passed through the reused Boost fragment probe, external decoded-value files, the NFC probe, and SQLite metadata.
It contained four giant names in one object and another in a nested object.
The result distinguished one decoded duplicate from two normalized-name collision occurrences; the nested object's same name did not collide across object ownership.
All digest candidates were deliberately forced into the same bucket, and exact comparisons rejected the false candidates.

The fixture also preserved the exact decoded `en-K` value at `/language` by its existing length/digest pin while retaining an unnormalized finding for another value. Original JSON, decoded values and derived NFC identities stayed separate. The isolated parent peaked at **21.86 MiB**; its SQLite runtime was **3.53.4**, which is evidence of the metadata model, not qualification of the plan's proposed native SQLite 3.54.1 integration. Retained input, events, decoded/derived values, indexes and intermediate files totaled **335,397,630 bytes**, approximately eight times the source size.

A separate call to the current JSON Quality API corroborated six finite preservation cases: matching literal/escaped pins, mismatched value, another unnormalized value, a normalization collision and an escaped decoded duplicate.
An escaped spelling can satisfy the value pin and still fail producer presentation.
Pins do not waive unrelated findings.

Cancellation during scalar ingestion, after spill, and during external composition replay returned incomplete results.
Replay cancellation was signalled only to the owned child after its tail spool appeared.
Injected spool-write failure, an unavailable output destination, invalid UTF-8 and truncated UTF-8 also returned incomplete results.
Native error output never asserted completion.
These tests do not qualify actual disk-full recovery, every flush/close fault, process containment, or production cleanup.

## DEC-006: preserve current presentation semantics

The existing authority is [JSON Quality's presentation module at the examined commit](https://github.com/Hadden-Industries/json-quality/blob/6bae0cfb2f7bdb186f31246eb50ecfb8fdfb74df/src/presentation.js) and its [format options](https://github.com/Hadden-Industries/json-quality/blob/6bae0cfb2f7bdb186f31246eb50ecfb8fdfb74df/src/json-format-options.json).

Prettier 3.9.10's [`json-stringify` printer](https://github.com/prettier/prettier/blob/3.9.10/src/language-json/print/json.js) uses hard lines for nonempty arrays and objects and preserves strict JSON number lexemes.
Its [string printer](https://github.com/prettier/prettier/blob/3.9.10/src/utilities/print-string.js) preserves an already-double-quoted raw string.
Consequently this specific policy is a fixed trivia/layout predicate over strict JSON, with unchanged scalar spelling and member order.
It is not a width-sensitive general formatting problem.
The conclusion is specific to the pinned options and parser.

| Existing contract            | Exact scalable predicate                                                                                                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prettier-json`              | Empty containers inline; every nonempty container item on its own line at two spaces per depth; `: `; commas at item ends; LF line endings and exactly one final LF. Preserve raw strict string/number tokens and member order. |
| `producer-json-body`         | Same predicate after the existing comparison-only CRLF-to-LF projection and addition of one final LF only when absent. No source write.                                                                                         |
| `producer-json-indent`       | Match native parse/stringify presentation with two-space indentation and one final LF, including canonical scalar spelling, object key order and elimination of duplicates.                                                     |
| `producer-json-indent-body`  | Same as indent with the existing body projection.                                                                                                                                                                               |
| `producer-json-compact`      | Same native scalar/key semantics, no layout whitespace, one final LF.                                                                                                                                                           |
| `producer-json-compact-body` | Same as compact with the existing body projection; used for each admitted JSONL record.                                                                                                                                         |

Preserved-bytes is a separate existing admission contract, not a seventh fallback policy.
It retains native/logical provenance and all applicable non-presentation rules.

### Supported implementation seams

- **Syntax and source stability:** Boost remains the strict JSON authority.
  The prototype first establishes grammar and exact EOF, then observes raw trivia for the Prettier policy.
  Quote/escape tracking only identifies spans in validated bytes; it must never independently admit malformed JSON.
  Production must use the same frozen source identity for both passes, or attach equivalent spans to the same parser.
  Any mutation or missing EOF invalidates completion.
- **Producer strings:** Serialize bounded, complete UTF-8 fragments through public Boost `serialize`, discarding only the fragment's added outer quotes while maintaining the enclosing string boundary.
  Retain at most the incomplete scalar carry between callbacks.
  The test corpus includes every Unicode scalar, controls, supplementary characters and escaped forms.
  Do not call a private escaping routine or assume callbacks cannot split UTF-8 bytes.
- **Producer numbers:** Use double-conversion 3.4.0's public parser and `EcmaScriptConverter` for candidates within its documented `kMaxCharsEcmaScriptShortest = 25` bound.
  The [public header](https://github.com/google/double-conversion/blob/v3.4.0/double-conversion/double-to-string.h) states that bound.
  A longer strict number token cannot equal canonical binary64 output; record a presentation mismatch while still consuming and validating the entire token.
  This is a consequence of the selected presentation language, not a JSON size limit.
  Nonfinite conversion would stringify as `null`, and negative zero as `0`, so those spellings must not pass accidentally.
  Never use this conversion to replace the original numeric lexeme or prove numeric domain admission.
- **Producer object names:** The [ECMAScript serialization rules](https://tc39.es/ecma262/multipage/structured-data.html#sec-json.stringify) use [ordinary own-property ordering](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-ordinaryownpropertykeys).
  Names denoting array indices from 0 through 4,294,967,294 occur first in increasing order; other names retain insertion order.
  Recognize this finite index domain with at most 10 decoded ASCII digits and per-object state.
  Reuse the shared exact decoded-duplicate predicate: parse/stringify cannot reproduce a document containing duplicate decoded names.
  Do not store all names in an in-memory map or add a second duplicate implementation.
- **Comparison and JSONL:** Compare emitted bounded fragments directly with the normalized comparison view, without accumulating formatted output.
  A mismatch remains a completed rule result only after strict syntax/EOF succeeds. JSONL framing is incremental, permits the current final-line/CRLF behaviour, and applies compact-body to each admitted record without a giant `readline()` string.
  Blank/empty classification and byte-admission precedence require the follow-up contract below; the retained harness is not a complete framing oracle. Record selectors and global constraints remain owned by the shared quality/domain layers.

The residual code is layout, fragment framing, key-order state, source correspondence and bounded comparison.
Maintained components own grammar, scalar escaping, numeric conversion and Unicode data.
This is a single shared contract implementation for all sizes, not a wrapper that preserves an old materializing checker in production.
Current Prettier and native `JSON.parse`/`JSON.stringify` remain independent finite test oracles.
An explicit materializing writer can retain a separate responsibility with declared capabilities; it must not become the read-check implementation.

### Discriminating examples

Each code spelling below includes the stated final newline convention; these are presentation outcomes, not full-quality passes.

| Input or condition                                       | Prettier policy     | Relevant producer policy      | Meaning                                                                                              |
| -------------------------------------------------------- | ------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `1.0` followed by LF                                     | Pass                | Fail                          | Default preserves the number lexeme; producer output is `1`.                                         |
| `-0` followed by LF                                      | Pass                | Fail                          | Producer output is `0`.                                                                              |
| `1e400` followed by LF                                   | Pass                | Fail                          | Syntax is complete; native stringify would emit `null`; numeric interoperability is a separate rule. |
| `"\u0061"` followed by LF                                | Pass                | Fail                          | Default preserves the escape; producer spelling is `"a"`.                                            |
| A correctly indented object with keys `"2"`, then `"1"`  | Pass                | Indent fails                  | Native property order requires `"1"` before `"2"`.                                                   |
| Same decoded key repeated with different escape spelling | May pass layout     | Fail                          | Shared duplicate detection remains required regardless of presentation.                              |
| A giant already-canonical string                         | Pass                | Pass                          | Neither selected predicate needs a whole scalar.                                                     |
| Correct body with missing final LF or CRLF               | Strict policy fails | Applicable body policy passes | Existing comparison projection remains unchanged; source bytes are not rewritten.                    |
| Two final LFs                                            | Fail                | Fail                          | Body handling does not trim arbitrary trailing whitespace.                                           |

### Differential, large-input and fault evidence

The finite differential harness loaded the existing repository presentation function read-only.
It generated **174 distinct fixtures** and compared all six policies, with extra 1/7/65,536-byte cases, for **1,140 native probe comparisons**.
There were **zero mismatches**.
The corpus included an array of **19,990 deterministic finite binary64 values**, boundary magnitudes, subnormals, negative zero, overflow/underflow spellings, long numbers, escapes, controls, object ordering, decoded duplicates and whitespace mutations.

The experimental producer probe intentionally leaves the independent duplicate-key rule outside its presentation module.
Finite comparison combined its result with a Python decoded-duplicate oracle.
Large file-backed duplicate facts were exercised separately by the reused parser/index work and the NFC integration above.
Production must wire that shared result into producer presentation completion; the standalone probe's `matchesExceptDuplicateKeys` field is not a complete public presentation result.

There were **54 scale/fault cases** with zero unexpected outcomes:

- 8/32/128 MiB strings passed all six contracts when correctly presented.
- Giant keys passed default and indent policies; equally large integer/exponent lexemes passed the default raw-spelling presentation and failed producer presentation with complete syntax evidence.
- Arrays containing 10,000, 100,000 and 400,000 objects passed default and indent presentation without collecting the objects.
- Malformed tails, truncation, invalid UTF-8, lone surrogate escapes and comments did not complete.
  Cancellation also did not complete.

The largest observed native working set in that matrix was **4.06 MiB**.
These are per-process feasibility measurements, not a package-wide concurrent peak or throughput promise.
The observers wrote no formatted document.
They read a stable source/comparison view, with an additional layout pass for the default policy.

An additional **23 edge cases** passed their expectations, including a 4,382,737-byte string containing every Unicode scalar at three chunk sizes, 48 MiB repeated escaped/control spellings, a 128 MiB value with late extra LF, missing LF, CRLF split across the comparator's 65,536-byte refill, and cancellation specifically during the second layout pass. All-scalar presentation acceptance does not waive noncharacter/interoperability findings in a full check.

There were **14 JSONL framing cases**: thirteen finite comparisons with the current JSON Quality API and one 268,435,462-byte input containing two giant records.
The giant case completed both records with no presentation/framing finding and unchanged source hash. This proves that tested framing/presentation composition, not complete existing framing equivalence, global record selectors or schema constraints.

### JSONL follow-up: blank classification and byte admission

Parent finding P-01 was discovered and validated separately while the frozen documents were with Claude; it is not a Claude finding.
The current `src/json-lines.js` applies `line.trim()` after whole-source fatal UTF-8/BOM admission in `src/json-bytes.js`.
The retained `run_edges.py` framer instead uses `part.strip(b' \r\t')` and parses records individually.
The original fourteen cases did not distinguish these contracts.

The follow-up executed only the unmodified `jsonl` function extracted from the retained harness, with its scratch destination redirected to an owned experiment directory and the existing native presentation probe.
It did not execute the harness's top-level driver or modify the original proof workspace/packet.
Against the current JSON Quality API, **10 of 15 cases differed** in framing/admission summary:

- Eight blank-classification differences: VT, FF, NBSP, OGHAM SPACE, U+2028, U+2029, a second record containing only U+FEFF, and a second record containing only NBSP.
- Two source-admission differences: a leading BOM and malformed UTF-8 after a valid record.
  The current API returns a source byte finding without an admitted record count; the retained framer counts records and reaches a record parse failure.

The other five cases were empty input, space, TAB, U+0085 and a valid record.
Neither implementation falsely accepted the invalid inputs in this set; the gap is diagnostic meaning, precedence and scope, not a demonstrated acceptance bypass.
The native per-document presentation predicates are not disproved by these framing differences.

[ECMAScript TrimString](https://tc39.es/ecma262/multipage/text-processing.html#sec-trimstring) uses [WhiteSpace](https://tc39.es/ecma262/multipage/ecmascript-language-lexical-grammar.html#sec-white-space) plus [LineTerminator](https://tc39.es/ecma262/multipage/ecmascript-language-lexical-grammar.html#sec-line-terminators).
Use pinned ICU's public `u_charType` category `U_SPACE_SEPARATOR` plus the language's TAB, VT, FF, U+FEFF, LF, CR, U+2028 and U+2029 policy.
[ICU character properties](https://unicode-org.github.io/icu-docs/apidoc/released/icu4c/uchar_8h.html) provide the Unicode data; the explicit language-policy union is not a private Unicode table.
An isolated comparison against Node 24.21.0 / ICU 78.3 / Unicode 17.0 `trim()` covered **all 1,112,064 Unicode scalars**, with **25 members and zero mismatches**.
`u_isUWhiteSpace` is not equivalent: it additionally accepts U+0085 and omits U+FEFF.
Reuse this one predicate for the meaningful-key rule, which also currently uses `trim()`.
Keep JSON grammar whitespace and physical-LF record boundaries separate; U+2028/U+2029 do not become record separators.

Freeze source byte admission before final record diagnostics/counts: use a stable, identity-bound admission pass or keep provisional records in owned bounded storage until whole-source UTF-8 admission succeeds.
Account for any extra pass/storage, and do not publish irreversible per-record completion before a late byte error can invalidate source admission.
After source admission, a later trim-only record is blank; a nonblank later record starting with U+FEFF goes through record byte admission, while U+FEFF inside quoted content is not a source BOM.
The latter nonblank/content cases are source-grounded regression requirements, not measurements claimed by the fifteen-case experiment.
New API schemas may change under the requester's migration authority; require a reviewed semantic mapping of scope, precedence and counts, without a compatibility shim.

QA-006/009/016 must integrate the predicate and byte/framing contracts, add chunk/record boundary variants and preserve expected-negative evidence.
The scalar classification proof is not a production framing implementation or proof of those remaining integrations.
Scripts/results are retained in the separate review packet, `G:\My Drive\Hadden Industries\sew\json-quality-issue-3-claude-review-2026-10-21\review-evidence.zip`: `validate_framing_oracle.mjs`, `validate_retained_framer.py`, `validate_trim_oracle.mjs`, `validate_trim_icu.py`, and `parent-validation/`.
The original evidence archive remains unchanged.

## Resource and failure implications

The NFC spool measurement is approximately **4x decoded input** for the long-run families, before counting the source/capture, decoded values, derived NFC result, indexes, journals, diagnostics and events.
The integrated retained packet reached about **8x source**.
Expected-output oracle fixtures add further experiment-only disk use.
No part of this cost may be hidden by reporting parser RAM alone.

The implementation should reuse bounded per-worker caches and spool ownership, release derived artifacts when their documented borrowers finish, and include all live artifacts in temporary-storage admission.
Do not promise an 8x universal maximum: canonical decomposition expansion, many active values, journaling and retained diagnostics change the total.
Use checked offsets and complete writes/flushes; disk or index failure produces an incomplete operation.

Cancellation checkpoints must cover scalar fragments, bucket spill, class replay, pending-tail replay, exact collision comparison, presentation comparison and terminal delivery.
A presentation mismatch can avoid unnecessary further conversion, but must not stop the shared parser, omit findings, or assert final completion before EOF.

The prototypes did not exercise production Linux, clean package acquisition, all supported Node versions, sanitizers/fuzzing, every write/flush/close failure, real disk exhaustion, native crash containment or all consumer cohorts. Those existing QA/release obligations remain.
Technical feasibility is no longer conditional on finding an unknown NFC or presentation facility.

## Evidence identities and reproduction

Owned workspace: `C:\Users\maksy\.codex\tmp\json-quality-issue3-proof-2026-10-21`.
Large generated fixtures, build outputs and downloaded binaries remain there.
No global dependency installation or persistent environment change was made.

Compact retained packet: `G:\My Drive\Hadden Industries\sew\json-quality-issue-3-proof-2026-10-21\experiment-evidence.zip`, **1,617,111 bytes**, SHA-256 **`7df75c7751e75bbc9671e7f0324a7d6b0d15f0babdf0b696074763ad8f5d9c6a`**.
Its adjacent `manifest.json` lists member identities.
It contains owned experiment sources, build/failure receipts, upstream acquisition manifests, Unicode test data and notices, generators, oracle results, detailed measurements and the frozen revision-1 plan.
Large fixture files and vendor binaries are excluded.

| Artifact                               | SHA-256                                                                                                                                 |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Frozen plan revision 1                 | `abaac9a3bbbe074d61c6ffcad09e8892c7d8329fb0cfd65a3b531a75ca8d0cd8`                                                                      |
| ICU 78.3 official Windows archive      | `446b671f9437227daa79e221d4521d75793f9ecd65ac44c06e34dd848f201ac2`                                                                      |
| Exact ICU license                      | `e55522d81edc687a341a4411e0776e54ca654e90147f354a90458aaced4116af`                                                                      |
| Unicode 17 normalization corpus        | `5019ffd530751a741900c849c0e010332f142a3612234639bd200b82138a87db`                                                                      |
| double-conversion 3.4.0 source archive | `254abbf4fa464b36d485b3ad97da672bb21a326139627c5c29365f83aae2b8a2`                                                                      |
| Exact double-conversion license        | `4af93c12062c58058378de2397dc1c92bbff9ddfb1d583a01c84127557ce97ca`                                                                      |
| NFC probe source / executable          | `9a92a5ceb4246e272998b19ae4fa082fee0daf3ea80d970a4c41363cd17e9f10` / `6bbf1bb8fd4ecbbc2bcb647c6b7d87856e44bb72f361e02ca21c55aec8fb0f74` |
| Presentation probe source / executable | `a44d23568f0077aa43731a1618f06f9fd40be5d9f90d80b9b94df4ef5392b4c2` / `90111927db1a714e3f4230927f8201977b131e4d75f827690cd07aec81923e4d` |

The environment was Windows x64, MSVC 14.51.36231, Windows SDK 10.0.28000.0, C++20, Node 24.21.0 and Python 3.15.0.
Compiler and DLL search paths were scoped to child processes.
Native experiments ran serially at below-normal priority; finite oracle/source investigation could run independently. The NFC executable linked the explicit downloaded ICU import library. An initial Windows macro collision and subsequent accidental SDK-library resolution failed before experiments; their failed build receipts are retained. Correcting the probe identifier and using the exact ICU library fixed these harness setup errors without changing vendor/product code.

For reproduction, use a new owned directory, verify the examined repository/dependency versions, acquire the manifest-pinned upstream sources, and adapt the scripts' explicit local paths to that directory.
Do not execute the scripts against another run's results: some intentionally reject an existing database or packet.
The old Boost probe and helpers are included under `reused/`; its Boost archive identity and compiler invocation are in the parent plan and retained build helper.
The acquisition scripts do not supply an unrelated product checkout or a private Python environment.

Run the build helpers, then `run_nfc.py conformance`, `run_nfc.py scale`, `run_nfc.py boundaries`, `nfc_valid.py`, `additional_cases.py`, `nfc_integration.py`, and `nfc_oracle.mjs`.
For presentation, run `presentation_oracle.mjs`, `run_presentation.py overlap`, `run_presentation.py scale`, `presentation_edges.mjs`, and `run_edges.py`.
`summarize.py` assembles receipts.
Check exact expected bytes, mismatch lists, completion fields, source hashes and process exit codes; timing varies by host.
No claim of bit-reproducible executables is made by these compiler invocations.

## Implementation handoff

DEC-005 and DEC-006 now identify a tested mechanism, exact reuse boundary and cost model.
SLICE-001 should accept or challenge this concrete packet and complete native selection/rights/platform ownership, rather than repeat an open-ended search.
SLICE-003 must implement and review the shared rules, add the pinned corpus and meaningful differential/large tests, and connect diagnostics, preservation, source identity, cancellation and completion through the production protocol. Incorporate P-01 in shared blank classification and source/record admission; SLICE-004 must verify the complete JSONL collection and diagnostic scope.
The requested Claude Opus 5.5 Max attempt reached its 60-minute timeout without a readable report; it does not establish independent review acceptance of this report or the revised plan.

Reopen the relevant decision if a maintained API, Unicode data version, presentation option, observed semantic outcome or resource model changes materially.
A new unsupported case is a finding to diagnose; it is not permission to omit NFC/presentation, insert characters, preserve a legacy read engine, or relabel partial validation as a full check.
