# JavaScript orchestration performance

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

## Reproduce a measurement

Run these from the repository's installed development environment:

```sh
npm run bench:check
npm run bench:format
npm run check:perf
node scripts/bench-orchestration.js --workload format --files 500 --repetitions 20 --assert-batching --output /absolute/path/format.json
node scripts/bench-orchestration.js --workload format --files 100 --changed 100 --repetitions 5 --output /absolute/path/changed.json
node scripts/bench-orchestration.js --workload check --files 30 --records 50000 --repetitions 5 --output /absolute/path/census.json
```

Use `--baseline /absolute/path/to/plain-baseline-clone` for alternating paired baseline/candidate runs.
Install that clone's exact locked dependencies first; its optional native package must resolve inside that installation.
The harness never resets or rewrites either source checkout.
It writes an owned synthetic temporary repository, then removes it after success or failure.
An explicit `--output` also writes the selected report file, including failed attempts.
The source identity is checked before and after sampling; changing measured inputs invalidates the comparison.
Git commands use the product's sanitized environment, and fixture commits disable hooks.
The identity includes the lockfile and measurement scripts; each sample records the loaded native identity, which must remain stable per variant.
Use one benchmark process at a time and preserve the complete JSON output, including failed attempts.

The workload recipe specifies JSON count, changed-file count and additional tracked non-JSON records.
One policy JSON file is additional to `--files`.
The maximum is 49,999 documents plus that policy, within the default 50,000-file admission.
Each variant gets one warmup, followed by all retained repetitions, with alternating order.
Reports distinguish process wall time, session duration, event-phase observations, real child counts, sampled parent RSS/V8 memory and native managed/scratch peaks.
Census and rewrite events have separate phase buckets; failed reports retain the available recipe, environment, identities and raw samples.
Node's native diagnostics channel observes actual children; imported ESM process functions are not replaced.
Child RSS, exact syscall counts, energy state and background-load isolation are not measured.
The probe exercises installed repository sessions; CLI serialization is covered separately by functional qualification.

Timing is diagnostic until platform/runtime cohorts have accepted budgets.
Median, sampled p95 and range are descriptive; a five-sample p95 does not establish a service objective.
The structural gate immediately checks the exact expected ignore-child count for the fixed short-path no-op fixture.
It does not impose a universal three-child ceiling or remove effect-time freshness queries.
CI retains separate Windows/Linux runtime-lane reports using the existing runtime matrix and dispatch semantics.
Performance reports use separate artifacts so archive and release-evidence layouts keep their existing roots.

The [implementation plan](plans/2026-10-26-javascript-performance-implementation-plan.md) preserves the original audits and the safety conditions for omitted or optional experiments.
