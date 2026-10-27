# CLI reference

Use repository-local npm execution:

```sh
npm exec -- json-quality check --root .
npm exec -- json-quality source --json < input.json
npm exec -- json-quality format --root . -- authored.json
npm exec -- json-quality normalize --root . -- authored.json
npm exec -- json-quality --help
```

| Verb        | Library operation                          | Selection and effects                                                                                   |
| ----------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `check`     | Repository session `events()`              | Complete repository obligations; no literal-file filtering and no source writes                         |
| `source`    | Source session `check()`                   | Raw stdin bytes under a closed explicit contract; no repository policy/root replacement                 |
| `format`    | Repository `rewrite("format", {files})`    | Explicit writable physical files after complete peer/candidate preflight; preserves meaning and lexemes |
| `normalize` | Repository `rewrite("normalize", {files})` | Nonempty explicit physical selection; admitted NFC repair with collision checks                         |

Use `check` for a read-only formatting check.
Cohort 2 does not expose a `--check` modifier, `--files` JSON argument, aggregate-document envelope or alternate parser.
Literal paths after `--` are paths, not globs.
Only write verbs accept them; normalization requires at least one.
Protected/native/logical/JSONL source writes remain with their owning producers.

| Option                                                                          | Meaning                                                                    |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `--root PATH`                                                                   | Repository root; not valid for raw `source`                                |
| `--json`                                                                        | Versioned NDJSON events instead of human presentation                      |
| `--contract JSON`                                                               | Closed source contract for `source` only                                   |
| `--request-id ID`                                                               | Bounded well-formed correlation ID                                         |
| `--help`, `-h`                                                                  | Current command/options help                                               |
| `--capacity-limits`, `--no-capacity-limits`                                     | Enable or bypass admission ceilings; finite runtime controls remain active |
| `--max-file-bytes`, `--max-total-bytes`, and other admission flags              | Positive integer overrides projected from the configuration schema         |
| `--max-check-time-ms`, `--managed-memory-target-bytes`, and other runtime flags | Positive finite runtime controls projected from the same schema            |

`--help` and [resource controls](resource-limits.md) list every generated resource flag.
The API uses camelCase control names; CLI flags project them to kebab-case.
`JSON_QUALITY_CAPACITY_LIMITS` accepts the same JSON boolean/object admission setting.
`JSON_QUALITY_RUNTIME_CONTROLS` accepts a runtime-control object.
Invalid combinations or unknown options fail closed.

## Delivery and exit status

Human stdout is presentation only; machine stdout is one JSON event per line with backpressure and bounded aggregate output.
Stderr contains operational diagnostics.
The final source `terminal`, repository `execution-terminal` or `write-terminal` establishes the applicable result only after owned cleanup.
Do not treat a partial stream, a source terminal inside a repository operation or process termination as complete acceptance.

| Exit | Meaning and example                                                                                                           |
| ---- | ----------------------------------------------------------------------------------------------------------------------------- |
| `0`  | Applicable complete contract satisfied, or help displayed                                                                     |
| `1`  | Complete quality/contract failure, such as duplicate decoded keys in a source                                                 |
| `2`  | Operational/incomplete failure, such as invalid controls, missing policy, exceeded runtime capacity, failed output or cleanup |

The separate `json-quality-qualify` executable streams trusted-policy qualification of immutable Git inputs.
It accepts trusted/candidate roots and full commit IDs through its help-documented arguments or `JSON_QUALITY_TRUSTED_ROOT`, `JSON_QUALITY_CANDIDATE_ROOT`, `JSON_QUALITY_TRUSTED_SHA` and `JSON_QUALITY_CANDIDATE_SHA`.
It requires final `execution-terminal`; its nonzero status remains blocking.
See [trusted CI](ci-trust.md) for the authority boundary.
