# CLI reference

Use repository-local npm execution.
Discovery works outside a repository and does not load Git, policy, native components or stdin:

```sh
npm exec -- json-quality --version
npm exec -- json-quality --help
npm exec -- json-quality format --help
npm exec -- json-quality-qualify-git --version
```

Both binaries print their installed package version with `--version` or `-v`; `--help` and `-h` show contextual usage.
No arguments shows root help and succeeds.
The qualification binary retains environment-only execution when all required qualification variables are supplied; partial qualification context fails.

## Commands and scope

| Command                                                                        | Input and authority                                                                                                                   | Completion                                                               |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `check [--root R]`                                                             | Complete repository obligations, including physical, native, logical, required-output, expectation and freshness checks; requires Git | `execution-terminal`                                                     |
| `check-files [--root R] -- A.json B.json`                                      | Nonempty literal physical selection under root policy; no Git, provider or required-output inventory                                  | `selection-terminal`; never complete repository acceptance               |
| `check-files --stdin --stdin-filepath A.json [--root R]`                       | Raw UTF-8 stdin as one virtual file under root/cwd policy                                                                             | Stdin-scoped `selection-terminal`                                        |
| `check-source [--contract JSON] [--stdin-filepath A.json]`                     | Raw stdin under a closed explicit contract, default `{}`; no repository policy                                                        | Source `terminal`                                                        |
| `format --dry-run [--root R] [-- A.json ...]`                                  | Complete repository and actual candidate preflight; no source writes                                                                  | `format-preview-terminal`                                                |
| `format --write [--root R] [-- A.json ...]`                                    | Guarded physical replacement after complete preflight; omitted files selects all eligible writable sources                            | `write-terminal`                                                         |
| `normalize --dry-run [--root R] -- A.json ...`                                 | Explicit nonempty selection, complete preflight and NFC span preview; no source writes                                                | `normalization-preview-terminal`                                         |
| `normalize --write [--root R] -- A.json ...`                                   | Explicit nonempty selection and guarded NFC replacement                                                                               | `write-terminal`                                                         |
| `format --stdin` or `normalize --stdin`                                        | Raw UTF-8 transform under an optional closed `--contract`, default `{}`                                                               | Complete source output and successful delivery; no repository acceptance |
| `format --stdin --root R --stdin-filepath A.json` or corresponding `normalize` | Policy-aware virtual transform; `--contract` forbidden                                                                                | Scoped source output and successful delivery                             |

```sh
npm exec -- json-quality check --root .
npm exec -- json-quality check-files --root . -- authored.json
npm exec -- json-quality format --dry-run --root . -- authored.json
npm exec -- json-quality format --write --root . -- authored.json
npm exec -- json-quality normalize --dry-run --root . -- authored.json
npm exec -- json-quality normalize --write --root . -- authored.json
npm exec -- json-quality check-source --ndjson --stdin-filepath input.json < input.json
npm exec -- json-quality format --stdin --stdin-filepath input.json < input.json > formatted.json
npm exec -- json-quality normalize --stdin --root . --stdin-filepath authored.json < input.json > normalized.json
```

The default root is cwd, with no ancestor policy search.
Missing root policy selects packaged defaults; malformed or inaccessible policy fails closed.
Ordinary reports identify effective root and policy origin; raw input identifies explicit-contract scope.
Trusted adapters retain fixed roots and required outputs and cannot be downgraded to selected/raw operations.

Selected paths are literal files, with or without `--`; quote spaces and use `--` for leading-hyphen names.
No directory traversal, internal glob expansion, ignore-based skipping of explicit selections or alternate JSON dialect is supplied.
Missing, duplicate, escaping, symlink, nonregular and unsupported selected paths fail operationally.
Selected contracts retain expectations and protection; linked-document obligations require full `check` and refuse selected scope.
Only selected observations and policy freshness establish selected completion; unrelated files and repository inventories remain unassessed.

## Stdin and conflicts

`--stdin-filepath` supplies virtual identity and framing; it never reads or overwrites that path.
For raw checking/transforms, a filename alone does not load policy.
An explicit contract's path/framing must agree with that filename.
For transforms, explicit `--root` selects policy-aware mode and requires a filename; `check-files --stdin` always uses root/cwd policy.
Policy-aware virtual paths may be new files, but existing ancestors, containment, protection, ownership, expectations and candidate admission still apply.
Protected locks and producer-owned paths cannot acquire transform authority through stdout.

Checks accept existing strict JSON, JSONL and NDJSON framing; strict JSON filenames include `.json`, `.jsonld` and `.sarif`.
Generic transforms reject JSONL/NDJSON, JSONC and JSON5.
Input must be complete raw UTF-8 from non-TTY stdin, without a JSON/base64 envelope.
Capacity, cancellation, EOF, output delivery and cleanup remain mandatory.

Filesystem transforms require exactly one of `--write` and `--dry-run`.
Old mode-less invocations fail with exit 2 and migration guidance before effects.
Stdin transforms reject either filesystem mode, file positionals and `--ndjson`.
`check` rejects files and stdin; check commands reject write/preview modes.
Raw `check-source` rejects `--root` and `--stdin`; it consumes stdin inherently.
Policy-aware input rejects `--contract`.
Unknown flags, conflicting singleton options, extra virtual filenames and mixed input modes fail before work.

## Controls and streams

`--quiet` suppresses routine progress and success summaries; errors and partial-write warnings remain visible.
`--diagnostic-display-level info|warning|error` filters human diagnostic presentation only (default `info`).
Both flags preserve every check, finding, exit status and required machine observation; neither is accepted with `--ndjson`.

`--request-id ID` supplies bounded correlation.
`--capacity-limits`, `--no-capacity-limits`, `--runtime-controls`, `--no-runtime-controls` and projected scalar flags retain their existing resource meanings.
See [resource controls](resource-limits.md) and contextual help for the complete generated list.
`JSON_QUALITY_CAPACITY_LIMITS` and `JSON_QUALITY_RUNTIME_CONTROLS` accept `true`, `false` or typed override objects.
A scalar override alongside a disabled group re-enables only that quota.

| Mode                               | Stdout                                     | Stderr                                            |
| ---------------------------------- | ------------------------------------------ | ------------------------------------------------- |
| Discovery                          | Requested help/version                     | Delivery/argument errors                          |
| Human check, preview or write      | Empty                                      | Findings, root/policy/scope, progress and summary |
| `--ndjson` check, preview or write | Complete version-5 events only             | Last-resort operational diagnostics               |
| Stdin transform                    | One complete transformed UTF-8 source only | Human diagnostics and scoped summary              |

The applicable final terminal is delivered only after cleanup.
Missing terminals, broken output, incomplete input and failed cleanup cannot establish success.
A source terminal inside a repository/selected operation does not complete that enclosing operation.

| Exit | Meaning                                                                                                                                  |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `0`  | Requested discovery delivered, complete satisfied check, admissible preview or successful transform/write and delivery                   |
| `1`  | Complete quality/contract refusal, including invalid JSON at normal EOF or a completed preview collision refusal                         |
| `2`  | Invalid grammar/selection/policy, operational refusal, capacity exhaustion, cancellation, incomplete transport, failed output or cleanup |

## Format and NFC

Format preserves decoded strings, exact numeric lexemes and member order; NFC findings can remain.
Normalize repairs eligible NFC string/key spans and preserves other token/presentation bytes; presentation findings can remain.
Either order works for mixed conditions.
Run complete `check` to establish repository acceptance afterwards.
Previews compute actual candidates, identities and remaining quality without source writes; they do not grant later write authority.
NFC collisions refuse the whole selected normalization batch before the first write; reconcile those keys explicitly.
Preserved sources cannot be normalized.
Exact duplicates, invalid Unicode, unsafe numbers, protected ownership, stale observations and unsafe peers remain blocking.
Write batches report confirmed writes and an uncertain path when applicable; they are not atomic and do not silently roll back.

The separate `json-quality-qualify-git` executable checks immutable Git inputs under trusted policy.
It accepts help-documented roots and full commit IDs or `JSON_QUALITY_TRUSTED_ROOT`, `JSON_QUALITY_CANDIDATE_ROOT`, `JSON_QUALITY_TRUSTED_COMMIT_ID` and `JSON_QUALITY_CANDIDATE_COMMIT_ID`.
It requires final `execution-terminal`; see [trusted CI](ci-trust.md).
