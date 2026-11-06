# CLI reference

Run the local binary with `npm exec -- json-quality` followed by a command.
Command-specific help lists the accepted flags.
Help and version discovery work outside a repository without reading stdin or loading Git, policy or the native companion.

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

### Check a repository, selected files or stdin

| Command                                                    | Scope                                                             | Last event           |
| ---------------------------------------------------------- | ----------------------------------------------------------------- | -------------------- |
| `check [--root R]`                                         | Complete Git repository, including providers and required outputs | `execution-terminal` |
| `check-files [--root R] -- A.json B.json`                  | Named physical files under root policy                            | `selection-terminal` |
| `check-files --stdin --stdin-filepath A.json [--root R]`   | One virtual file under root policy                                | `selection-terminal` |
| `check-source [--contract JSON] [--stdin-filepath A.json]` | Raw stdin under a source contract (default `{}`)                  | `terminal`           |

```sh
npm exec -- json-quality check --root .
npm exec -- json-quality check-files --root . -- authored.json
```

### Preview or write files

Choose exactly one of `--dry-run` and `--write`.
Both modes check the complete repository and actual replacement candidates before the first possible write.

| Command               | Files                             | Last event                       |
| --------------------- | --------------------------------- | -------------------------------- |
| `format --dry-run`    | Named files or all eligible files | `format-preview-terminal`        |
| `format --write`      | Named files or all eligible files | `write-terminal`                 |
| `normalize --dry-run` | Explicit, nonempty selection      | `normalization-preview-terminal` |
| `normalize --write`   | Explicit, nonempty selection      | `write-terminal`                 |

Pass `--root R` to select the repository and list filenames after `--`.
For repository-wide formatting, omit both the separator and filenames.
A file-producing script can safely pass `--` followed by its arguments.
An empty selection after the separator exits 2 before opening the repository.
For example, preview formatting or Unicode repair for one file, then use `--write` in the chosen command to apply it.

```sh
npm exec -- json-quality format --dry-run --root . -- authored.json
npm exec -- json-quality normalize --dry-run --root . -- authored.json
```

### Return transformed bytes on stdout

Use `format --stdin` or `normalize --stdin` for a strict single JSON document.
By default these commands use a raw source contract (`{}`, or an explicit `--contract JSON`).
Supply both `--root` and `--stdin-filepath` to apply repository policy to the virtual file.

The following examples use POSIX shell redirection.
Keep the output file separate from the input.

```sh
npm exec -- json-quality check-source --ndjson --stdin-filepath input.json < input.json
npm exec -- json-quality format --stdin --stdin-filepath input.json < input.json > formatted.json
npm exec -- json-quality normalize --stdin --root . --stdin-filepath authored.json < input.json > normalized.json
```

### Root and path selection

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

### Incompatible flags

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
Version 1.x uses the closed version-5 event format by default.
Future incompatible output requires explicit consumer selection.
Missing terminals, broken output, incomplete input and failed cleanup cannot establish success.
A source terminal inside a repository/selected operation does not complete that enclosing operation.

### Exit status

| Exit | Meaning                                                                                                                                  |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `0`  | Requested discovery delivered, complete satisfied check, admissible preview or successful transform/write and delivery                   |
| `1`  | Complete quality/contract refusal, including invalid JSON at normal EOF or a completed preview collision refusal                         |
| `2`  | Invalid grammar/selection/policy, operational refusal, capacity exhaustion, cancellation, incomplete transport, failed output or cleanup |

A malformed selected JSON document exits 1 for checking, previewing and writing.
A filesystem write refused on quality grounds emits `write-failure` with zero confirmed writes.
Its `message` identifies the failed check as `rewrite-unsafe-source`, `rewrite-candidate-not-accepted` or `rewrite-peer-preflight-failed`.
Protected or missing paths and failures during replacement exit 2.
Inspect the confirmed write count and any uncertain path before retrying.

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

## Qualify immutable Git inputs

The separate `json-quality-qualify-git` executable checks immutable Git inputs under trusted policy.
It accepts help-documented roots and full commit IDs or `JSON_QUALITY_TRUSTED_ROOT`, `JSON_QUALITY_CANDIDATE_ROOT`, `JSON_QUALITY_TRUSTED_COMMIT_ID` and `JSON_QUALITY_CANDIDATE_COMMIT_ID`.
It requires final `execution-terminal`; see [trusted CI](ci-trust.md).
