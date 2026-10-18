# Consumer resource controls

Every package-owned capacity limit has a consumer override.
Capacity changes never disable JSON quality, immutable-source identity, native/logical obligations or write protection.
The canonical setting is `capacityLimits`: CLI `--capacity-limits` maps to JSON/API `capacityLimits: true`, and its native negative form `--no-capacity-limits` maps to `capacityLimits: false`.
False disables the 17 shared operation capacities listed below, with no claim to change separate ESLint, cleanup, workflow or platform controls.
Invocation overrides include policy bootstrap capacity; a policy's own settings take effect only after that policy has been admitted.
Defaults are conservative engineering choices for a batch CLI, not universal limits from the JSON standard or measured throughput guarantees.

RFC 8259 [section 9](https://www.rfc-editor.org/rfc/rfc8259#section-9) permits implementation limits without prescribing a maximum JSON document size.
OWASP recommends [limiting input before buffering/parsing](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html) and [workload-based resource controls](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html).
Those principles support explicit finite defaults and accountable consumer overrides; they do not establish a particular MiB value.

The [configuration schema](../schemas/configuration.schema.json#/definitions/capacityLimits) is the canonical numeric-default authority.

| Setting                    | Default   | Purpose and rationale                                                                                                                                              |
| -------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `maxFiles`                 | 50,000    | Physical/native inventory allowance; retained without evidence supporting a higher default workload.                                                               |
| `maxFileBytes`             | 32 MiB    | Bounds individual admitted inputs and formatter output; AST parsing can need much more memory than the source.                                                     |
| `maxTotalBytes`            | 256 MiB   | Aggregate admitted input capacity, including native/logical buffers; this is not a process-memory quota.                                                           |
| `maxLogicalDocuments`      | 100,000   | Logical/native member admission.                                                                                                                                   |
| `maxRecords`               | 100,000   | Records per JSON Lines document.                                                                                                                                   |
| `maxDiagnostics`           | 10,000    | Findings/expectations; exhaustion fails with incomplete coverage instead of truncating a pass.                                                                     |
| `maxPolicyBytes`           | 1 MiB     | Policy bootstrap input; an invocation override is needed before reading a larger policy.                                                                           |
| `maxGitOutputBytes`        | 64 MiB    | Git inventory/metadata output; raised from 16 MiB to accommodate long-path inventories. Blob bytes use their admitted file/policy size.                            |
| `maxToolOutputBytes`       | 64 MiB    | Captured native tool output, per stdout/stderr buffer.                                                                                                             |
| `maxToolTimeMs`            | 120,000   | Native formatter preservation subprocess; not an in-process parser deadline.                                                                                       |
| `maxGitTimeMs`             | 120,000   | Each Git subprocess.                                                                                                                                               |
| `maxCacheLookupTimeMs`     | 60,000    | Native npm cache-path lookup, including process startup.                                                                                                           |
| `maxCacheOutputBytes`      | 1 MiB     | Cache-path lookup output, using Node's documented default buffer scale.                                                                                            |
| `maxAcquisitionTimeMs`     | 1,200,000 | Each whole acquisition command; larger than one native npm fetch attempt.                                                                                          |
| `maxRequestBytes`          | 48 MiB    | Encoded stdin request before parsing; accommodates base64 expansion of a default 32 MiB document plus metadata. Raise this too when transporting larger documents. |
| `maxRequestIdCharacters`   | 1,024     | Supplied-document correlation identifier, counted in Unicode code points.                                                                                          |
| `maxRequestPathCharacters` | 32,768    | Supplied virtual-document path allowance; host filesystem path restrictions remain independent.                                                                    |

Byte and count defaults are retained where the research supplies no evidence for an increase.
The Git/formatter timeouts use the same two-minute native-read allowance.
[Node documents explicit subprocess buffer/timeout controls](https://nodejs.org/api/child_process.html); a timeout of zero disables the native timer.
[npm documents](https://docs.npmjs.com/cli/v12/using-npm/config/#fetch-timeout) a five-minute fetch timeout, two retries and retry backoff.
The twenty-minute whole-command default allows substantially more than one request attempt, while remaining finite; it is not a guarantee for every dependency graph or network.
The virtual path allowance is sized for long paths; [Windows documents its own long-path conditions](https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation), which a package setting cannot change.
No performance test or hosted qualification was run to claim these defaults fit every consumer.

Both CLIs accept the same generated capacity flags and `--no-capacity-limits`:

```sh
json-quality check --max-file-bytes 134217728 --max-total-bytes 1073741824
json-quality format --request - --json --max-file-bytes 134217728 --max-request-bytes 188743680
json-quality-qualify --trusted-root TRUSTED --trusted-sha FULL_SHA --candidate-root CANDIDATE --candidate-sha FULL_SHA --max-policy-bytes 4194304 --max-git-output-bytes 134217728 --max-git-time-ms 300000
```

CLI and cold-acquisition environment `JSON_QUALITY_CAPACITY_LIMITS` accepts JSON `true`, `false` or the closed numeric override object.
For example, set it to `{"maxAcquisitionTimeMs":3600000,"maxCacheLookupTimeMs":120000}` before running a generated acquisition bootstrap.
Explicit CLI boolean switches override environment booleans, and numeric CLI values override environment-object entries.
Omission inherits policy; explicit `true` or an override object enables finite capacities, preserving configured policy values where present and using defaults elsewhere.
An explicit empty object enables capacities with no numeric overrides; cold acquisition has no policy and uses the canonical defaults for `true` or an empty object.
The shared capacity bypass cannot be mixed with individual finite CLI values.
The candidate's policy never controls trusted consumer qualification.

Library APIs accept `capacityLimits: true`, `capacityLimits: false` or numeric override objects: `runJsonQuality`, `qualifyJsonConsumer`, `formatJsonDocument`, `formatJsonSource`/`formatJsonValue` and `verifyJsonQualityInstallation`.
Policy `capacityLimits: false` removes shared capacity checks after bootstrap; it cannot authorize loading a policy larger than the bootstrap limit before that policy has been read.
The standalone `checkJsonLines` API accepts `maxRecords` in its contract, including `Infinity` for a caller-selected bypass.
The separate ESLint identity rule has `maxFrames`/`maxSteps` options, each admitting `false`; these analysis settings remain independent of document capacities.

Raw UTF-8/BOM/duplicate-member transport validation belongs to CLI stdin; the object API receives an already parsed request.
Request/response schemas describe structure; runtime policy controls metadata capacity, so refresh exported schema copies when adopting these controls.
Generated acquisition source remains verbatim and script-free.
Its cleanup retry strategy is separately configurable through `JSON_QUALITY_CLEANUP`, a closed object with native nonnegative integer `maxRetries` and `retryDelay` milliseconds.
Defaults are three retries and Node's [100 ms retry delay](https://nodejs.org/api/fs.html#fsrmsyncpath-options); zero retries or zero delay are supported.
`capacityLimits: false` does not change this retry strategy or native npm's own configuration defaults.

The shared workflow exposes `capacity-limits` (JSON `true`, `false` or object; default `true`), `timeout-minutes` (default 45) and `artifact-retention-days` (default 14; zero selects repository defaults).
The job deadline covers two sequential acquisition commands, checkouts and qualification; raise `timeout-minutes` alongside acquisition or Git budgets when needed.
Two acquisition commands can consume forty minutes at their defaults, so the default job allowance does not guarantee completion at both acquisition deadlines.
Resource JSON reaches producer acquisition and qualification through a caller-owned environment value; it is never interpolated into shell code.
GitHub enforces [external runner limits](https://docs.github.com/en/actions/reference/limits), including the hosted-job ceiling and repository artifact-retention policy.
Node memory, string/Buffer, stack, operating-system and native-tool limits also remain external constraints; a package bypass cannot remove them.

Maintainers change defaults only in the canonical configuration schema, run `npm run sync:resources`, and retain `npm run check:resources` in qualification.
The cold bootstrap has a checked generated literal projection because the package is not installed when that bootstrap first runs.
The removed `--no-limits`, API/policy `limits`, environment `JSON_QUALITY_LIMITS` and workflow input `resource-limits` have no compatibility aliases.

Kebab-case CLI spelling and camelCase JSON spelling represent the same concept.
[Node's native parser](https://nodejs.org/api/util.html#utilparseargsconfig) defines `--no-foo` as boolean `foo: false`; [Meow's author documentation](https://github.com/sindresorhus/meow#flags) likewise maps kebab-case flags to camelCase keys.
The positive name and its native negative CLI form therefore share one setting rather than a separate `noCapacityLimits` JSON key.
