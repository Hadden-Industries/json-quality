# CLI reference

Use repository-local npm execution:

```sh
npm exec -- json-quality check --root .
npm exec -- json-quality check-source --ndjson < input.json
npm exec -- json-quality format --root . -- authored.json
npm exec -- json-quality normalize --dry-run --root . -- authored.json
npm exec -- json-quality normalize --root . -- authored.json
npm exec -- json-quality --help
```

| Verb           | Library operation                          | Selection and effects                                                                                   |
| -------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `check`        | Repository session `check()`               | Complete repository obligations; no literal-file filtering and no source writes                         |
| `check-source` | Source session `check()`                   | Raw stdin bytes under a closed explicit contract; no repository policy/root replacement                 |
| `format`       | Repository `rewrite("format", {files})`    | Explicit writable physical files after complete peer/candidate preflight; preserves meaning and lexemes |
| `normalize`    | Repository `rewrite("normalize", {files})` | Nonempty explicit physical selection; admitted NFC repair with collision checks                         |

Use `check` for a read-only formatting check.
Missing configuration selects package defaults; malformed or inaccessible configuration fails.
The default root is the current directory, without ancestor policy search.
Cohort 4 does not expose a `--check` modifier, `--files` JSON argument, aggregate-document envelope or alternate parser.
Literal paths after `--` are paths, not globs.
Only write verbs accept them; normalization requires at least one.
Protected/native/logical/JSONL source writes remain with their owning producers.

| Option                                                                       | Meaning                                                                                               |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `--root PATH`                                                                | Repository root; not valid for raw `check-source`                                                     |
| `--ndjson`                                                                   | Versioned NDJSON events instead of human presentation                                                 |
| `--contract JSON`                                                            | One JSON source-contract document for `check-source` only; output framing does not change its meaning |
| `--dry-run`                                                                  | Normalize-only no-write preview; requires explicit selected paths                                     |
| `--request-id ID`                                                            | Bounded well-formed correlation ID                                                                    |
| `--help`, `-h`                                                               | Current command/options help                                                                          |
| `--capacity-limits`, `--no-capacity-limits`                                  | Select configured/default admission quotas or disable the admission group                             |
| `--runtime-controls`, `--no-runtime-controls`                                | Select configured/default runtime quotas or disable the runtime group                                 |
| `--max-source-bytes`, `--max-total-source-bytes`, and other admission flags  | Positive integer or literal `null` overrides projected from the configuration schema                  |
| `--max-check-time-ms`, `--max-managed-memory-bytes`, and other runtime flags | Positive integer or literal `null` overrides projected from the same schema                           |

`--help` and [resource controls](resource-limits.md) list every generated resource flag.
The API uses camelCase control names; CLI flags project them to kebab-case.
`JSON_QUALITY_CAPACITY_LIMITS` and `JSON_QUALITY_RUNTIME_CONTROLS` each accept `true`, `false` or a typed override object.
Select both groups as `false` for ordinary unlimited reads; a scalar flag alongside a disabled group re-enables only that quota.
Invalid combinations or unknown options fail closed.

## Delivery and exit status

Human stdout is presentation only; machine stdout is one JSON event per line with backpressure and bounded aggregate output.
Stderr contains operational diagnostics.
The final source `terminal`, repository `execution-terminal` or `write-terminal` establishes the applicable result only after owned cleanup.
Do not treat a partial stream, a source terminal inside a repository operation or process termination as complete acceptance.

| Exit | Meaning and example                                                                                                                |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `0`  | Complete satisfied check, successful requested repair, admissible no-write normalization preview, or help                          |
| `1`  | Complete quality/contract failure, such as duplicate decoded keys in a source                                                      |
| `2`  | Operational/incomplete failure, such as invalid selection/controls, unreadable policy, exceeded capacity, failed output or cleanup |

The separate `json-quality-qualify-git` executable streams trusted-policy qualification of immutable Git inputs.
It accepts trusted/candidate roots and full commit IDs through its help-documented arguments or `JSON_QUALITY_TRUSTED_ROOT`, `JSON_QUALITY_CANDIDATE_ROOT`, `JSON_QUALITY_TRUSTED_COMMIT_ID` and `JSON_QUALITY_CANDIDATE_COMMIT_ID`.
It requires final `execution-terminal`; its nonzero status remains blocking.
See [trusted CI](ci-trust.md) for the authority boundary.

## Repair and preview outcomes

Format changes presentation while preserving decoded strings, numeric lexemes and member order.
It can succeed while ordinary NFC findings remain.
Normalize changes only eligible NFC string/key spans and can succeed while presentation findings remain.
For a document with both conditions, either repair order works; a check after the first operation reports the remaining condition and a check after both assesses the completed quality contract.
Human output and `write-terminal` report remaining quality rather than treating a successful repair as a clean repository.

`normalize --dry-run -- authored.json` completes selection, policy, collision and candidate checks without a write-success terminal.
It returns 1 for a complete collision/quality refusal and 2 for invalid selection, resource exhaustion or incomplete work.
Any NFC-colliding decoded keys refuse the entire selected batch before its first write; the owner must reconcile the keys explicitly.
Preserved sources cannot be normalized, including in a mixed selection.
Exact duplicates, invalid Unicode, unsafe numbers, stale observations, peer failures and protected ownership remain blocking for both repair commands.
Potential NFC collisions under preserve are separate non-blocking `nfc-key-collision-risk` events, never permission to normalize.
