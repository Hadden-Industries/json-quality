# Resource controls

Cohort 4 introduced caller overrides for every package-owned resource quota.
The current contract cohort 5 retains those configuration-schema-4 controls unchanged.
`schemas/configuration.schema.json` owns the names, ranges and defaults.
Native build controls, API resolution, CLI flags and event resources use that authority.

`capacityLimits: true` enables configured/default admission.
An override object amends only its named limits; `null` removes an individual quota.
`capacityLimits: false` removes the source-admission ceilings; events represent them as `null`.
It preserves quality, identity, EOF, diagnostics and domain validation.
`runtimeControls: false` independently removes managed-allocation, total scratch, depth and elapsed-time quotas.
For ordinary unlimited reads, select both groups as `false`.
Invocation settings override policy; invocation settings govern policy bootstrap before the effective policy exists.
Invocation `true` restores the configured/default profile; an invocation object preserves other unlimited fields from policy.

Both CLIs apply independently validated invocation controls to failure reporting, including failures before policy or command admission.
`maxToolOutputBytes` covers the complete serialized or escaped failure report and any earlier output; an exhausted finite allowance refuses delivery rather than presenting a partial report as complete.
`maxCheckTimeMs` also selects a separate failure-delivery allowance, starting after the failed operation; `null` removes that deadline, including for a blocked output pipe.
The former hidden one-second qualification reporting timeout and 2,048-character diagnostic ceiling no longer apply.
Invalid or conflicting invocation controls cannot authorize unlimited reporting, and resource-looking filenames after `--` remain literal data.
Failed sinks are never retried; failure-report delivery cannot turn operational exit 2 into success.

The unreleased cohort-5 event schema admits complete diagnostic messages within the selected output budget and continues to accept historical `truncated: true` failure events.
Consumers retaining a pre-fix schema copy must refresh it before accepting extended messages; there is no change to event fields, native protocol 4 or the native cohort inputs.
This source correction does not establish published-release availability.

| Admission control                       | Default     | Scope                                                                                       |
| --------------------------------------- | ----------- | ------------------------------------------------------------------------------------------- |
| `maxPhysicalAndNativeSources`           | 50,000      | Combined physical/native captures; independently, distinct physical/native census members.  |
| `maxSourceBytes`                        | 33,554,432  | Source bytes, not a native binary installation limit.                                       |
| `maxTotalSourceBytes`                   | 268,435,456 | Aggregate admitted source bytes.                                                            |
| `maxNativeLogicalAndTransformedSources` | 100,000     | Combined native/logical/transformed captures; independently, native/logical census members. |
| `maxRecords`                            | 100,000     | JSONL records across the execution.                                                         |
| `maxDiagnostics`                        | 10,000      | Complete shared finding delivery.                                                           |
| `maxPolicyBytes`                        | 1,048,576   | Strict policy bootstrap before object materialization.                                      |
| `maxGitOutputBytes`                     | 67,108,864  | Streamed Git metadata and diagnostics.                                                      |
| `maxToolOutputBytes`                    | 67,108,864  | Tool/report output admission.                                                               |
| `maxToolTimeMs`                         | 120,000     | Tool operation admission.                                                                   |
| `maxGitTimeMs`                          | 120,000     | Git operation admission.                                                                    |
| `maxRequestIdCodePoints`                | 1,024       | Unicode scalar count of request correlation.                                                |
| `maxRequestBytes`                       | 50,331,648  | Request/control admission; payloads travel separately.                                      |
| `maxRequestPathCodePoints`              | 32,768      | Literal path/control identity admission.                                                    |

Positive safe-integer overrides are validated without coercion.
Counts and lengths on the native wire and in events use canonical decimal strings.
Disabling admission does not remove physical address-space, filesystem, database or protocol integer limits.

| Runtime control         | Default       | Contract                                               |
| ----------------------- | ------------- | ------------------------------------------------------ |
| `maxManagedMemoryBytes` | 33,554,432    | Managed checker/accounted allocation quota.            |
| `maxTemporaryBytes`     | 2,147,483,648 | Total owned spill/scratch quota.                       |
| `maxNestingDepth`       | 128           | Strict-parser nesting quota, with no fixed 4096 cap.   |
| `maxCheckTimeMs`        | 120,000       | Aggregate elapsed-time quota, with no one-day ceiling. |

Every numeric quota accepts a positive safe integer or `null`; the native wire uses canonical decimal strings or `null`.
No timer is armed for an unlimited deadline.
Long finite deadlines use representable timer slices.
The retired `maxConcurrency` setting did not control execution; its rejection introduced in cohort 4 remains in cohort 5.
One session serializes its protocol operations; use independent sessions for parallel work.
These settings do not expose backend, segment, SQLite page/cache or spill-threshold selection. The same reader starts in memory, spills once when necessary and retains stable range/reference identities.
With an unlimited managed-allocation quota, its finite 32 MiB working target still triggers spill; it does not limit total source bytes, nesting, scratch volume or traversal work.
Frame bodies stay at most 64 KiB, and backpressure bounds transport batches independently of complete-document size.
Existing byte buffers, native allocations, SQLite pages, census/index rows, diagnostics, controls and materialization reservations participate in their declared owners.
Scratch exhaustion or failed transition makes the operation incomplete; it never selects a different parser.

The managed allocation quota does **not bound whole-process RSS**.
Node/V8 and native loader/code pages, OS/runtime overhead, the bounded module-level schema template, producer-owned objects and caller-retained output have separate ownership or measurement. Qualify whole-process peaks for the actual operation/platform before making an RSS claim.
An explicit materialization can refuse even when streamed checking succeeds.
Raising a policy-byte limit does not automatically raise the runtime workspace needed to validate its object graph.

Whole-source UTF-8/BOM admission precedes JSON and JSONL record claims.
Invalid bytes do not establish zero admitted records: the record count is unknown (`null`).
Successful byte admission still requires complete framing, syntax, rules, expectations and diagnostic delivery.

## API, CLI and environment

```js
const session = await openJsonSourceSession({
  capacityLimits: false,
  runtimeControls: false,
  signal: caller.signal,
});
```

```sh
json-quality check --root . --ndjson --max-source-bytes 134217728
json-quality check --root . --ndjson --no-capacity-limits
json-quality check --root . --ndjson --no-capacity-limits --no-runtime-controls
json-quality check-source --ndjson --no-capacity-limits --no-runtime-controls --max-source-bytes 1024
json-quality check-source --ndjson --max-managed-memory-bytes 16777216
```

CLI names are the schema names converted to kebab case.
`JSON_QUALITY_CAPACITY_LIMITS` and `JSON_QUALITY_RUNTIME_CONTROLS` each accept `true`, `false` or a typed override object.
Explicit flags take precedence.
A scalar flag accepts a positive integer or literal `null`.
A numeric flag alongside a disabled group re-enables only that quota: the 1 KiB example above must refuse larger input.
The retired `limits`/`JSON_QUALITY_LIMITS` vocabulary is rejected.

Trusted openers/providers cooperate with `AbortSignal`.
Core work and output delivery observe the selected runtime deadline, including unlimited elapsed time.
Pipe supervision may use caller-selected per-I/O budgets without imposing a hidden total operation deadline.
An absent terminal, cancelled producer, exhausted diagnostic allowance, failed sink or cleanup failure cannot become success.

## Separate operation capabilities

`DEFAULT_JSON_TRANSFORM_LIMITS` describes defaults: 2 MiB input/output, 4096 normalization changes and 4096 explicitly selected write paths.
Writer options and repository `rewrite` options accept `transformControls: false` or individual numeric/null overrides.
Repository policy can supply `transformControls`; invocation fields override only named policy fields.
The CLI accepts `--transform-controls JSON` or `JSON_QUALITY_TRANSFORM_CONTROLS` for format/normalize.
The caller separately selects sufficient managed workspace or removes its allocation quota.
It does not change the ordinary checker memory target or scalable read/check admission.
`DEFAULT_JSON_PRODUCER_LIMITS` describes producer defaults of depth 32 and `maximumTotalValues: 65536`.
The total includes each scalar, object and array occurrence, including the one root; property names do not add values.
A shared acyclic object is counted again at each serialized occurrence; actual ancestor cycles still fail.

| Input                                   | Total values |
| --------------------------------------- | ------------ |
| `42`, `{}`, `[]`                        | 1 each       |
| `{"a":1}`                               | 2            |
| `[1,2]`                                 | 3            |
| `{"a":{"b":1},"c":[2,3]}`               | 6            |
| `[shared,shared]` with `shared = {a:1}` | 5            |

Exactly the selected value limit passes this quota; one extra value produces `producer-value-capacity`.
Zero is invalid; a positive safe integer, per-quota `null`, or profile `false` has the documented selection semantics.
Depth and encoded-byte quotas remain independent.
`formatJsonValue` accepts `producerControls: false` or numeric/null overrides; its encoded-byte quota derives from the selected transform source-byte quota.
These independent operation profiles remain at their defaults when only ordinary admission/runtime controls are disabled.
They can also be disabled explicitly.
Native JavaScript string/buffer sizes, serializer stack, available memory and formatter failures remain genuine representation/physical boundaries.
The scalable source checker does not inherit a hidden document DOM ceiling from the writer.

Package verification has a separate profile, exposed as `DEFAULT_PACKAGE_VERIFICATION_LIMITS`: defaults are 128 MiB archive/member bytes, 512 MiB expanded bytes, 8192 members, 4 MiB inventory metadata, 1 MiB control files, 4 KiB extended tar metadata, 32 KiB paths, depth 64, decompression ratio 128 and 120 seconds.
`verifyJsonQualityInstallation({ verificationControls: false, ... })` removes these quotas; an override object can remove or change individual quotas.
Source JSON's `maxSourceBytes` does not reject a correctly admitted native library.
Selector, SRI, member hashes, regular-file observations and unexpected-member checks remain mandatory.

The verifier consumes the selected npm SDK's public streamed cache reader and tar parser.
It incrementally hashes members and installed files and never extracts them.
The npm SDK can own a fixed read as large as 64 MiB; package installation verification does not claim the checker's 32 MiB managed target.
Installation verification honors selected cache time and output quotas without clamping larger/unlimited selections back to defaults.
Development/hosted job budgets are separate controls.

## Source and installation scopes

Every captured stream participates in `maxSourceBytes` and `maxTotalSourceBytes`, including native/logical, authority and transformed candidates.
Physical captures consume the first count; native captures consume both counts; logical and transformed captures consume the second; authority captures consume neither count.
Transformed candidates are not census members.
The independent census enforces the same first limit on physical/native members and the second on native/logical members.

`installationControls` independently governs verification of the complete installed core-plus-native family:

| Control                     | Default     | Unit                                                |
| --------------------------- | ----------- | --------------------------------------------------- |
| `maximumPackageFamilyFiles` | 50,000      | Core plus native files, not a per-package allowance |
| `maximumPackageFamilyBytes` | 268,435,456 | Combined installed bytes                            |
| `maxCacheLookupTimeMs`      | 60,000      | npm cache lookup milliseconds                       |
| `maxCacheOutputBytes`       | 1,048,576   | Cache lookup output bytes                           |

The optional `verifyJsonQualityInstallation` API accepts `installationControls` and `verificationControls`, each as `false` or numeric/null overrides, independently of source profiles.
Source environment profiles cannot tune these owners.

Contributor npm setup separately accepts `JSON_QUALITY_ACQUISITION_CONTROLS` as `true`, `false` or a numeric/null override object.
Its `maxAcquisitionTimeMs` defaults to 1,200,000 milliseconds and governs producer npm operations.

## Migrating earlier controls

Upgrade the coupled core/native/schema cohort together; retired names fail rather than acting as aliases.
Rename source `maxFiles`, `maxLogicalDocuments`, `maxFileBytes`, `maxTotalBytes` to `maxPhysicalAndNativeSources`, `maxNativeLogicalAndTransformedSources`, `maxSourceBytes`, `maxTotalSourceBytes`.
Rename the managed allocation quota to `maxManagedMemoryBytes`, correlation/path quotas to `maxRequestIdCodePoints` / `maxRequestPathCodePoints`, and producer `maximumMembers` to `maximumTotalValues`.
Archive `verificationControls.maximumMembers` remains unchanged.

An old source `{maxFiles: 100000, maxTotalBytes: 536870912}` that also intended installation effects becomes source `{maxPhysicalAndNativeSources: 100000, maxTotalSourceBytes: 536870912}` plus installation `{maximumPackageFamilyFiles: 100000, maximumPackageFamilyBytes: 536870912}`.
An old `{maxFileBytes: 67108864}` changes only source bytes; archive-member verification still uses `verificationControls.maximumMemberBytes`.
Move installation-verification cache overrides into `installationControls`; source false does not disable installation or archive verification profiles.
An old whole-profile false with both effects must explicitly select false for each intended new operation profile.
Defaults retain the earlier effective bounds.

The standalone Python-facing protocol supports the same null admission/runtime controls, with exact packaged artifact and hello admission.
No Node bridge or second source parser is required.
An absent EOF/terminal, explicit quota exhaustion, allocator/database/filesystem failure or unsuccessful cleanup remains incomplete work, never truncated success.

Current configuration accepts an omitted schema marker or explicit `schemaVersion: 4`; old explicit markers and `maxConcurrency` are rejected.
The previous implementation's finite runtime controls were a package policy choice; they did not satisfy a caller's request to override every resource quota.

The implementation's common-path acceptance ceiling is no p95 regression against its frozen baseline.
Final acceptance must name the measured candidate, runtimes, corpus, alternation and warmup scheme; results for older artifacts are not final-candidate evidence.
Local Linux measurements were explicitly deferred by the requester to remote CI where needed.
Neither deferral nor Windows evidence establishes Linux qualification.
