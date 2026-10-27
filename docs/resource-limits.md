# Resource controls

Cohort 3 makes every package-owned resource quota caller-overridable.
`schemas/configuration.schema.json` owns the names, ranges and defaults.
Native build controls, API resolution, CLI flags, event resources and cold-bootstrap projections use that authority.

`capacityLimits: true` enables configured/default admission.
An override object amends only its named limits; `null` removes an individual quota.
`capacityLimits: false` removes all 17 package admission ceilings; events represent them as `null`.
It preserves quality, identity, EOF, diagnostics and domain validation.
`runtimeControls: false` independently removes managed-allocation, total scratch, depth and elapsed-time quotas.
For ordinary unlimited reads, select both groups as `false`.
Invocation settings override policy; invocation settings govern policy bootstrap before the effective policy exists.
Invocation `true` restores the configured/default profile; an invocation object preserves other unlimited fields from policy.

| Admission control          | Default     | Scope                                                  |
| -------------------------- | ----------- | ------------------------------------------------------ |
| `maxFiles`                 | 50,000      | Distinct physical/native source census members.        |
| `maxFileBytes`             | 33,554,432  | Source bytes, not a native binary installation limit.  |
| `maxTotalBytes`            | 268,435,456 | Aggregate admitted source bytes.                       |
| `maxLogicalDocuments`      | 100,000     | Native and logical member admission.                   |
| `maxRecords`               | 100,000     | JSONL records across the execution.                    |
| `maxDiagnostics`           | 10,000      | Complete shared finding delivery.                      |
| `maxPolicyBytes`           | 1,048,576   | Strict policy bootstrap before object materialization. |
| `maxGitOutputBytes`        | 67,108,864  | Streamed Git metadata and diagnostics.                 |
| `maxToolOutputBytes`       | 67,108,864  | Tool/report output admission.                          |
| `maxToolTimeMs`            | 120,000     | Tool operation admission.                              |
| `maxGitTimeMs`             | 120,000     | Git operation admission.                               |
| `maxAcquisitionTimeMs`     | 1,200,000   | Explicit acquisition admission.                        |
| `maxCacheLookupTimeMs`     | 60,000      | Native cache-location lookup admission.                |
| `maxCacheOutputBytes`      | 1,048,576   | Cache-location output admission.                       |
| `maxRequestIdCharacters`   | 1,024       | Unicode scalar count of request correlation.           |
| `maxRequestBytes`          | 50,331,648  | Request/control admission; payloads travel separately. |
| `maxRequestPathCharacters` | 32,768      | Literal path/control identity admission.               |

Positive safe-integer overrides are validated without coercion.
Counts and lengths on the native wire and in events use canonical decimal strings.
Disabling admission does not remove physical address-space, filesystem, database or protocol integer limits.

| Runtime control            | Default       | Contract                                               |
| -------------------------- | ------------- | ------------------------------------------------------ |
| `managedMemoryTargetBytes` | 33,554,432    | Managed checker/accounted allocation quota.            |
| `maxTemporaryBytes`        | 2,147,483,648 | Total owned spill/scratch quota.                       |
| `maxNestingDepth`          | 128           | Strict-parser nesting quota, with no fixed 4096 cap.   |
| `maxCheckTimeMs`           | 120,000       | Aggregate elapsed-time quota, with no one-day ceiling. |

Every numeric quota accepts a positive safe integer or `null`; the native wire uses canonical decimal strings or `null`.
No timer is armed for an unlimited deadline.
Long finite deadlines use representable timer slices.
The retired `maxConcurrency` setting did not control execution and is rejected in cohort 3.
One session serializes its protocol operations; use independent sessions for parallel work.
These settings do not expose backend, segment, SQLite page/cache or spill-threshold selection. The same reader starts in memory, spills once when necessary and retains stable range/reference identities.
With an unlimited managed-allocation quota, its finite 32 MiB working target still triggers spill; it does not limit total source bytes, nesting, scratch volume or traversal work.
Frame bodies stay at most 64 KiB, and backpressure bounds transport batches independently of complete-document size.
Existing byte buffers, native allocations, SQLite pages, census/index rows, diagnostics, controls and materialization reservations participate in their declared owners.
Scratch exhaustion or failed transition makes the operation incomplete; it never selects a different parser.

The memory target is **not whole-process RSS**.
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
json-quality check --root . --json --max-file-bytes 134217728
json-quality check --root . --json --no-capacity-limits
json-quality check --root . --json --no-capacity-limits --no-runtime-controls
json-quality source --json --no-capacity-limits --no-runtime-controls --max-file-bytes 1024
json-quality source --json --managed-memory-target-bytes 16777216
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

`JSON_TRANSFORM_CAPABILITIES` describes defaults: 2 MiB input/output, 4096 normalization changes and 4096 explicitly selected write paths.
Writer options and repository `rewrite` options accept `transformControls: false` or individual numeric/null overrides.
Repository policy can supply `transformControls`; invocation fields override only named policy fields.
The CLI accepts `--transform-controls JSON` or `JSON_QUALITY_TRANSFORM_CONTROLS` for format/normalize.
The caller separately selects sufficient managed workspace or removes its allocation quota.
It does not change the ordinary checker memory target or scalable read/check admission.
`JSON_PRODUCER_CAPABILITIES` additionally describes producer defaults of depth 32 and 65,536 members.
`formatJsonValue` accepts `producerControls: false` or numeric/null overrides; its encoded-byte quota derives from the selected transform source-byte quota.
These independent operation profiles remain at their defaults when only ordinary admission/runtime controls are disabled.
They can also be disabled explicitly.
Native JavaScript string/buffer sizes, serializer stack, available memory and formatter failures remain genuine representation/physical boundaries.
The scalable source checker does not inherit a hidden document DOM ceiling from the writer.

Package verification has a separate profile, exposed as `PACKAGE_VERIFICATION_CAPABILITIES`: defaults are 128 MiB archive/member bytes, 512 MiB expanded bytes, 8192 members, 4 MiB inventory metadata, 1 MiB control files, 4 KiB extended tar metadata, 32 KiB paths, depth 64, decompression ratio 128 and 120 seconds.
`verifyJsonQualityInstallation({ verificationControls: false, ... })` removes these quotas; an override object can remove or change individual quotas.
The cold bootstrap accepts the same profile through `JSON_QUALITY_VERIFICATION_CONTROLS` and validates its schema-projected defaults before acquisition.
Source JSON's `maxFileBytes` does not reject a correctly admitted native library.
Selector, SRI, member hashes, regular-file observations and unexpected-member checks remain mandatory.

The verifier consumes the selected npm SDK's public streamed cache reader and tar parser.
It incrementally hashes members and installed files and never extracts them.
The npm SDK can own a fixed read as large as 64 MiB; package installation verification does not claim the checker's 32 MiB managed target.
Cold acquisition honors selected cache/acquisition time and output quotas without clamping larger/unlimited selections back to defaults.
Cleanup retry options and development/hosted job budgets are separate controls.

The standalone Python-facing protocol supports the same null admission/runtime controls, with exact packaged artifact and hello admission.
No Node bridge or second source parser is required.
An absent EOF/terminal, explicit quota exhaustion, allocator/database/filesystem failure or unsuccessful cleanup remains incomplete work, never truncated success.

Migration from cohort 2 requires the matching cohort-3 core and rebuilt platform packages together, policy `schemaVersion: 3`, and removal of `maxConcurrency`.
The previous implementation's finite runtime controls were a package policy choice; they did not satisfy a caller's request to override every resource quota.

The implementation's common-path acceptance ceiling is no p95 regression against its frozen baseline.
Final acceptance must name the measured candidate, runtimes, corpus, alternation and warmup scheme; results for older artifacts are not final-candidate evidence.
Local Linux measurements were explicitly deferred by the requester to remote CI where needed.
Neither deferral nor Windows evidence establishes Linux qualification.
