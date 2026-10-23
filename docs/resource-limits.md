# Resource controls

Cohort 2 separates input admission from finite runtime controls.
`schemas/configuration.schema.json` owns the names, ranges and defaults.
Native build controls, API resolution, CLI flags, event resources and cold-bootstrap projections use that authority.

`capacityLimits: true` enables configured/default admission.
An override object enables admission and amends selected limits.
`capacityLimits: false` removes all 17 package admission ceilings; events represent them as `null`.
It does not disable quality, identity, EOF, diagnostics, domain validation or finite runtime controls.
Invocation settings override policy; invocation settings govern policy bootstrap before the effective policy exists.
A positive invocation can re-enable admission disabled by policy.

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

| Runtime control            | Default       | Contract                                                      |
| -------------------------- | ------------- | ------------------------------------------------------------- |
| `managedMemoryTargetBytes` | 33,554,432    | Managed checker/accounted reservation target; minimum 16 MiB. |
| `maxTemporaryBytes`        | 2,147,483,648 | Owned spill/scratch allowance.                                |
| `maxNestingDepth`          | 128           | Finite strict-parser nesting; maximum 4096.                   |
| `maxCheckTimeMs`           | 120,000       | Aggregate check deadline; maximum one day.                    |
| `maxConcurrency`           | 1             | One active lane per session; other values refused.            |

`runtimeControls` must remain finite.
These settings do not expose backend, segment, SQLite page/cache or spill-threshold selection. The same reader starts in memory, spills once when necessary and retains stable range/reference identities.
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
  capacityLimits: { maxFileBytes: 134217728 },
  runtimeControls: { managedMemoryTargetBytes: 33554432 },
});
```

```sh
json-quality check --root . --json --max-file-bytes 134217728
json-quality check --root . --json --no-capacity-limits
json-quality source --json --managed-memory-target-bytes 16777216
```

CLI names are the schema names converted to kebab case.
`JSON_QUALITY_CAPACITY_LIMITS` accepts `true`, `false` or a typed override object; `JSON_QUALITY_RUNTIME_CONTROLS` accepts a runtime override object.
Explicit flags take precedence.
A bypass plus contradictory numeric admission flags is refused.
The retired `limits`/`JSON_QUALITY_LIMITS` vocabulary is rejected.

Trusted openers/providers cooperate with `AbortSignal`.
Core work also observes its runtime deadline.
Output delivery uses backpressure and a bounded report deadline.
An absent terminal, cancelled producer, exhausted diagnostic allowance, failed sink or cleanup failure cannot become success.

## Separate operation capabilities

`JSON_TRANSFORM_CAPABILITIES` limits materializing pure/root candidate transformations to 2 MiB input and output, with at most 4096 normalization changes.
This finite allowance covers the existing 1,665,003-byte frozen-report writer; its caller separately selects sufficient managed workspace.
It does not change the ordinary checker memory target or scalable read/check admission.
`JSON_PRODUCER_CAPABILITIES` additionally bounds caller-owned object serialization to depth 32 and 65,536 members.
These capabilities remain when admission is bypassed.
The scalable source checker does not inherit a hidden document DOM ceiling from the writer.

Package verification has a separate binary transport contract, exposed as `PACKAGE_VERIFICATION_CAPABILITIES`: 128 MiB archive and member limits, 512 MiB expanded bytes, 8192 members, 4 MiB inventory metadata, 1 MiB control files, 4 KiB extended tar metadata, 32 KiB paths, depth 64 and a 120-second verification deadline.
Source JSON's `maxFileBytes` does not reject a correctly admitted native library.
Selector, SRI, member hashes, regular-file observations and unexpected-member checks remain mandatory.

The verifier consumes the selected npm SDK's public streamed cache reader and tar parser.
It incrementally hashes members and installed files and never extracts them.
The npm SDK can own a fixed read as large as 64 MiB; package installation verification does not claim the checker's 32 MiB managed target.
Cold acquisition also retains finite working time/output ceilings independently of bypassed package admission. Cleanup retry options and development/hosted job budgets are separate controls.

The implementation's common-path acceptance ceiling is no p95 regression against its frozen baseline.
Final acceptance must name the measured candidate, runtimes, corpus, alternation and warmup scheme; results for older artifacts are not final-candidate evidence.
Local Linux measurements were explicitly deferred by the requester to remote CI where needed.
Neither deferral nor Windows evidence establishes Linux qualification.
