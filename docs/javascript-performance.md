# JavaScript orchestration performance

Use the checking and formatting benchmarks to measure Git child processes, execution time and memory on a named corpus.
Use the platform’s own measurement method when comparing results.

## Reproduce a measurement

Run these from the repository's installed development environment:

```sh
npm run benchmark:json-checking
npm run benchmark:json-formatting
npm run benchmark:orchestration
node scripts/bench-orchestration.js --workload format --files 500 --repetitions 20 --assert-batching --output /absolute/path/format.json
node scripts/bench-orchestration.js --workload format --files 100 --changed 100 --repetitions 5 --output /absolute/path/changed.json
node scripts/bench-orchestration.js --workload check --files 30 --records 50000 --repetitions 5 --output /absolute/path/census.json
```

For paired identity-rule, pin-admission, source-check and fresh-process CLI measurements, use:

```sh
node scripts/bench-hotpaths.js --baseline /absolute/path/to/installed-baseline --output /absolute/path/hotpaths.json --repetitions 5
```

The runner alternates variant order after one warmup per cohort and asserts matching diagnostics or verdicts.
Identity timings separate rule work from ESLint parsing.
Source timings include checking and closure in a fresh session, with installed component acquisition warmed separately.
CLI timings include fresh-process startup, component verification and output delivery.
Use the same locked dependencies and native compiler configuration in both checkouts.
The output retains measured source and native artifact identities and refuses source drift.
Run one benchmark process at a time; timing remains diagnostic.

Use `--baseline /absolute/path/to/plain-baseline-clone` for alternating paired baseline/candidate orchestration runs.
Install that clone's exact locked dependencies first; its optional native package must resolve inside that installation.
The harness never resets or rewrites either source checkout.
It writes an owned synthetic temporary repository, then removes it after success or failure.
An explicit `--output` also writes the selected report file, including failed attempts.

The source identity is checked before and after sampling; changing measured inputs invalidates the comparison.
Git commands use the product's sanitized environment, and fixture commits disable hooks.
The identity includes the lockfile and measurement scripts; each orchestration sample records the loaded native identity, which must remain stable per variant.
Use one benchmark process at a time and preserve the complete JSON output, including failed attempts.

## Generated admission and indexed selectors

Runtime admission uses Ajv standalone validators generated from the exported schemas.
Run `npm run build:validators` after changing a schema or the producer compiler; `npm run check:validators` checks exact output drift.
The compiler owns files in `src/generated`; they are not hand-formatted.
Syntax, the identity rule, schema parity tests and the generation check still apply to them.
Event validation dispatches on its required, unique type tag; Ajv verifies that the schema branches are disjoint during generation.
The exported JSON Schema remains unchanged and independent differential tests use its ordinary `oneOf` meaning.

NFC pin uniqueness uses the closed pin fields with length-delimited keys, preserving object-key-order independence and duplicate positions.
Native document-pin lookup compiles decoded pointers into a SQLite trie under the existing allocation and spill ledger.
The parser follows matching prefixes once; digest buckets always retain exact decoded-byte comparison.
Root pins, array indices, escaped segments, duplicate keys and missing or changed pins keep their existing meaning.
JSONL record-selector resolution remains separate from document-prefix matching.
Closed source and policy schemas admit pin shapes once; a separate semantic owner enforces preservation restrictions after that admission.
The raw source CLI loads neither repository execution nor transform owners.

The identity rule indexes contract attachment lines, destructuring paths and static object properties once per file.
Only direct AST facts are cached; recursive alias results retain the caller's cycle guard and analysis allowance.
Index construction consumes the same analysis-step budget, and exhaustion remains a diagnostic.

## Rewrite freshness work

Every changed-file replacement still requires a fresh full repository check of captured peer bytes, policy, authorities and membership.
The writer reads current physical observations through one native indexed cursor, including acknowledged replacements, and reuses one 64 KiB read buffer after each source settles.
It retains no repository-wide JavaScript inventory and does not reuse an earlier hash as a current filesystem observation.

The private writer operation acknowledges intermediate mutations without computing discarded repository totals.
Explicit admission and final status still calculate the complete totals, and the legacy native request mode retains its replies.
Path-bearing mutation envelopes do not gain extra fields.
Changed candidates are visited once, with only the fixed policy candidate held until last; a zero-change count bypasses that effect traversal but still performs final freshness checks.

Post-write directory membership uses count- and byte-bounded batches of at most 16 paths and 256 estimated encoded bytes within the existing control-fragment workspace.
Each entry retains its ordered filesystem and cancellation checks; batches settle before the directory's final observation.
Small request quotas and oversized names retain the original singleton query.
Replies return a missing ordinal rather than echoing paths or provenance.

These changes reduce metadata round trips and allocation without removing the repeated full-byte reads.
With many changed files, that required I/O still grows with the changed-file count times repository size.
A future snapshot or transaction design would need independent race and recovery evidence before replacing that guarantee.

## What ignore batching changes

Repository formatting and explicit normalization query Git ignore rules in bounded batches before selecting physical write candidates.
Each batch holds at most 256 paths and at most 64 KiB of encoded input, further reduced to one quarter of a lower configured output allowance.
Captured output is bounded to the smaller of the Git admission ceiling and 256 KiB.

If repeated rule metadata fills a capture, the settled query is retried in smaller batches before selection; a failing singleton remains incomplete.
The native census retains the complete candidate inventory; JavaScript does not collect a repository-wide candidate array or ignored-path set.
The batch's input, captured output, decoded records and metadata receive a managed control-state reservation before allocation.

Git remains the ignore-rule authority, including nested rules, negation, forced tracked files and local excludes.
The query uses its documented `--stdin -z --no-index --verbose --non-matching` protocol and receives a complete record for every path.
Incomplete, duplicate, unexpected, malformed UTF-8 or inconsistent results fail preflight.
The existing sanitized Git environment also governs ignore queries.

Immediately before each changed file is replaced, the current policy, source observations, inventory and that file's ignore permission are checked again.
Per-file freshness queries remain intentional; the startup reduction primarily benefits selection and no-op formatting.

Source containment checks at open and EOF and CLI schema validation remain enabled.
A frozen object is not a schema credential, and a matching root pathname is not a stable filesystem identity.

The shared empty Git-record buffer removes reset allocations; record materialization and split fragments still allocate.
Directory traversal keeps its current buffer size and explicit handle lifecycle.
Prettier debug verification keeps its per-changed-source isolation and exact native meaning/number-lexeme comparisons.

## Read a benchmark report

The workload recipe specifies JSON count, changed-file count and additional tracked non-JSON records.
One policy JSON file is additional to `--files`.
The maximum is 49,999 documents plus that policy, within the default 50,000-file admission.

Each variant gets one warmup, followed by all retained repetitions, with alternating order.
Reports distinguish process wall time, session duration, event-phase observations, real child counts, sampled parent RSS/V8 memory and native managed/scratch peaks.
Census and rewrite events have separate phase buckets; failed reports retain the available recipe, environment, identities and raw samples.
Node's native diagnostics channel observes actual children; imported ESM process functions are not replaced.

### Process-tree memory by platform

Schema-2 reports add a fresh process observer for every warmup and retained sample, with raw `observations` and each retained sample's matching `tree` record.
The outer controller gates a fresh Python worker until its process domain is established; only then can that worker start the Node probe and product children.

- **Windows** reports peak committed bytes for the worker and descendants in a Job Object with breakaway disabled and kill-on-close protection.
- **Linux** samples the sum of resident pages in a dedicated session/process group every 10 ms, including the worker.
  Sampling can miss short peaks or processes and count shared pages more than once.

The outer observer controller is excluded on both platforms.
The current probe and product child topology does not create detached Linux sessions/groups; such a topology change requires requalifying observation coverage.
Windows committed bytes and Linux sampled RSS have different meanings and must not be compared as the same metric or added to parent/native memory values.

Reports include method, units, process-count meaning, sample count/cadence, elapsed time, exit, timeout/cancellation, quiescence and cleanup outcomes.
Observation errors, surviving descendants, malformed workload output or changed identities fail qualification and retain available observations; there is no parent-only fallback.
Only the fresh owned domain is terminated on failure, and the observer removes its private scratch after cleanup.

Python must be available (`PYTHON` can name its explicit executable).
Exact syscall counts, energy state and background-load isolation are not measured.
The probe exercises installed repository sessions; CLI serialization is covered separately by functional qualification.

### Interpret timings and the batching assertion

Timing is diagnostic until platform/runtime cohorts have accepted budgets.
Median, sampled p95 and range are descriptive; a five-sample p95 does not establish a service objective.

The structural gate immediately checks the exact expected ignore-child count for the fixed short-path no-op fixture.
It does not impose a universal three-child ceiling or remove effect-time freshness queries.

CI retains separate Windows/Linux runtime-lane reports using the existing runtime matrix and dispatch semantics.
Performance reports use separate artifacts so archive and release-evidence layouts keep their existing roots.

The [implementation plan](https://github.com/Hadden-Industries/json-quality/blob/main/docs/plans/2026-10-26-javascript-performance-implementation-plan.md) preserves the original audits and the safety conditions for omitted or optional experiments.
