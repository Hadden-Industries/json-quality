# CLI community alignment implementation plan

Date: 5 November 2026, Europe/Bucharest.
Status: proposed design for user review; implementation has not been authorized by this document.
Baseline: `6d0b6b5dacb303d56b3da2cee73525a77b060429` on `fix/toolchain-guards-and-windows-short-paths`.

## Outcome and authorized scope

Make JSON Quality discoverable and useful for selected files, editors and shell pipelines, with explicit filesystem mutation and actionable human output.
Preserve complete repository acceptance, lossless formatting, separate NFC normalization, trusted adapters, bounded execution and truthful completion.
Address every finding from the community-practice assessment, including evidence-based decisions to retain existing behavior.

This task authors this one plan.
It does not change source, configuration, workflows, schemas, packages or native artifacts; run product suites; install or build anything; activate or publish anything; change branches; commit; or push.
Existing files under `docs/plans/` and `docs/qualification/` are spent historical artifacts and must remain untouched.
Future implementation updates current public documentation and owning code, not historical plans or evidence.

A later instruction approving implementation, including its necessary validation, supplies the authority it actually grants.
Reuse that authority for native builds, staging and temporary consumer test installations already covered by the instruction or accepted plan; do not create automatic additional approval milestones.
Ask only when a concrete action genuinely falls outside that authority.
New toolchain installation, deployment, publication and pushes are not implied by this document; the explicit commit-message approval rule below still applies.

Use the accepted task controls and native repository tools.
The project is unregistered in HISEW; do not register it, start routing or lifecycle work, or create prerequisite bookkeeping.
Do not add evidence packets, state journals, companion plans, a test framework, security reviews or external reviews.
Use Review Agent for an internal review of a future coherent implementation after exact-scope formatting and linting.
No implementation review has been performed for this plan.

### Invariants

- `check` means the complete physical, native, logical, provider, required-output, policy, expectation and freshness obligations of the selected repository.
  A successful subset, raw input, immutable-Git qualification or successful transform cannot stand in for that verdict.
- Read-only commands never acquire checkout-write authority.
  Formatting preserves decoded strings, numeric lexemes and member order.
  Normalization remains an explicit operation that may change decoded values and must refuse NFC key collisions.
- Trusted adapters retain fixed roots and required outputs.
  Configuration remains data; no candidate imports, executable configuration, runtime dependency acquisition or alternate parser are introduced.
- Complete preflight precedes the first repository write.
  Policy, protected ownership, source observations, discovery, linked candidates, cancellation and resource controls remain enforced.
  Partial writes remain possible and must be reported accurately.
- NDJSON remains a versioned event protocol.
  Only the applicable final terminal, delivered after owned cleanup together with the expected process exit, establishes completion.
  Broken output, incomplete input, failed cleanup and missing terminals never become success.
- A successful writer can leave quality findings.
  The final full `check` establishes repository acceptance; human wording and machine scope must make that distinction visible.

## Evidence baseline and assessment disposition

The working tree was clean at authoring start; the branch was ahead of its remote by three commits.
No applicable `AGENTS.md` was found in the workspace or inspected ancestor directories.
The current package is `1.0.0-rc.2`.
The current cohort vector is cohort 4, configuration 4, source-contract schema v4, events 4, native protocol 4, component schema 4 and Node-API 9.

The plan is grounded in the current command parsers, session surfaces, policy bootstrap and resolver, repository execution and rewrite owners, native source contracts and rewrite census, public schemas/types, and installed-consumer producers/readers.
Historical plans are not evidence of current behavior.
Already completed dependency, bootstrap-retirement, script-audit and producer-toolchain work is outside this remediation.

Read-only probes recorded earlier in this task found that root, check and format help all succeed but print the same 1,795-byte, 15-line help.
`--version`, no arguments, `check -- package.json` and `format --dry-run -- package.json` return 2.
These were source-entry CLI observations, not a packed-consumer qualification.
Inspection confirms that Node `parseArgs` currently accepts file positionals with or without `--`; the documentation recommends the delimiter but the parser does not require it.
Inspection also found that human operation output is currently written to stderr, although `docs/cli.md` describes human stdout.
The documentation must be corrected to the chosen stream contract.

The already installed Markdown Quality 2.0.0 dependency was successfully probed earlier in the task.
Its source checkout could not execute because its dependencies, including Ajv, were absent.
Do not call that source checkout runtime-verified, install dependencies to make the comparison work, or adopt its missing version support, repeated discovery limitations, implicit writes or base64 request envelope as requirements.

### Community evidence and design inference

There is no universal command grammar.
Prettier documents explicit `--write`, selected file/directory/pattern inputs, stdin filename context, display controls and exit statuses 0/1/2.
Those are useful precedents for discoverability and explicit effects; its exact selection and configuration semantics are not JSON Quality requirements.
See [Prettier CLI](https://prettier.io/docs/cli).

Biome documents separate check/lint/format commands, command help, stdin filename support and explicit write controls.
Its documentation explicitly assigns CLI glob expansion to the shell.
This supports retaining verbs and literal paths without introducing a glob dependency.
See [Biome CLI](https://biomejs.dev/reference/cli/) and [CLI file selection](https://biomejs.dev/configuration/configure-biome/#include-files-via-cli).
No numeric Biome exit-code table is assumed.

ESLint documents help/version, stdin filename context, dry-run fixes and exit statuses 0/1/2.
Its quiet behavior can affect warning-rule execution.
JSON Quality's proposed controls instead filter only presentation because every required check and machine observation must remain intact.
See [ESLint CLI](https://eslint.org/docs/latest/use/command-line-interface).

The maintained `prantlf/jsonlint` fork documents help/version, quiet output, in-place mutation and diff/check options.
It is a comparison point, not a claim about all JSONLint implementations or their popularity.
See [JSONLint usage](https://github.com/prantlf/jsonlint#usage).
The command design below is an inference from these precedents and this repository's contracts.

### Finding-to-delivery trace

The acceptance conditions are normative.
Slice and proof identifiers refer to the work and verification sections in this same document.

| Finding                                   | Requirement and decision                                                                                                                               | Acceptance condition                                                                                                                                                                                                       | Slice      | Proof      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------- |
| F1: exit codes                            | Retain 0 for requested success, 1 for completed quality/contract refusal, 2 for operational/incomplete work. Do not manufacture an exit-code redesign. | Existing checks and writes keep their established meanings; new scoped checks and previews use the explicit table below; failed output or cleanup cannot return 0.                                                         | S1, S3, S4 | P1, P3, P4 |
| F2: discovery                             | Add installed-package version discovery to both binaries, contextual help, useful no-argument behavior and actionable argument errors.                 | Both binaries expose version outside a repository without Git/native work; each command's help shows valid modes/examples; qualification's environment-only workflow still executes.                                       | S1         | P1, P5     |
| F3: selected checks                       | Add `check-files` with genuine selected-source evaluation and a distinct scoped terminal; leave `check` complete.                                      | Selected valid input can pass beside a bad unselected peer while full check fails; the scoped result explicitly denies complete repository acceptance; selected obligations are not silently dropped.                      | S2         | P2, P5     |
| F4: implicit mutation and missing preview | Require `--write` or `--dry-run` for filesystem format/normalize. Add complete format preview. Reject old mode-less writes with migration guidance.    | No mode means no writes and exit 2; previews compute and validate actual candidates, preserve every source byte and end with preview terminals; `--write` retains guarded replacement.                                     | S3         | P3, P5     |
| F5: stdin/editor flow                     | Add raw UTF-8 transforms and virtual filename context, with an explicit policy-aware route.                                                            | Transformed stdout contains only one complete source; no checkout writes occur; policy/root, framing, protection, EOF, TTY, cancellation, capacity and broken-pipe behavior follow the matrix.                             | S4         | P4, P5     |
| F6: diagnostics and output                | Add actionable human messages, `--quiet` and presentation-only `--diagnostic-display-level`. Keep complete versioned NDJSON.                           | Messages state location, problem and safe next action; display changes do not change findings, checks, exits or required evidence; machine/display conflicts fail before work.                                             | S1, S2–S4  | P1–P5      |
| F7: format versus NFC                     | Keep them separate; reuse existing transforms and native comparisons.                                                                                  | Format preserves decoded values, numeric spelling and order; normalize retains collision, preservation, selection and preflight refusals; mixed conditions remain visible after one repair.                                | S3, S4     | P3, P4     |
| F8: literal paths                         | Retain literal files and optional `--`; deliberately omit directory traversal and internal globs in selected commands.                                 | Both delimiter forms work; spaces and leading-hyphen names are documented; missing paths, duplicates, directories and unsupported dialects fail explicitly; no unexpanded wildcard is silently treated as a selection.     | S1, S2     | P1, P2     |
| F9: roots and policy                      | Retain explicit/default-current-directory roots and no ancestor search; expose effective root and policy origin in ordinary operation output.          | Absent policy selects packaged defaults; invalid/inaccessible policy fails closed; scoped/virtual checks identify their policy; trusted root overrides remain impossible. No new inspect/config-init ceremony is required. | S1, S2, S4 | P1, P2, P4 |

## Canonical command and option contract

These are the proposed next-prerelease commands, not commands already available at the baseline.
Retain the public binary names `json-quality` and `json-quality-qualify-git`.
Add no `fix`, `lint`, `--in-place`, `--preview`, aggregate `--json` or write aliases.

### Operation matrix

| Invocation                                                                   | Input and authority                                                                                                   | Output/effects                                                                                   | Result authority                                                  |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `json-quality`                                                               | No operation selected                                                                                                 | Root help on stdout, exit 0; no context, environment-control, policy, Git, stdin or native work  | Discovery only                                                    |
| `json-quality --help`, `-h`                                                  | Discovery                                                                                                             | Concise command list and examples on stdout                                                      | Discovery only                                                    |
| `json-quality COMMAND --help`                                                | A known command                                                                                                       | Command-specific usage, accepted options, effects, scope and examples on stdout                  | Discovery only                                                    |
| `json-quality --version`, `-v`                                               | Installed package metadata                                                                                            | Exact package version plus LF on stdout; no repository lookup                                    | Discovery only                                                    |
| `json-quality check [--root R]`                                              | Complete repository at R or current directory; existing trusted adapter context applies                               | Read-only human report on stderr or complete NDJSON on stdout                                    | Existing `execution-terminal`; complete repository check          |
| `json-quality check-files [--root R] -- A.json B.json`                       | Nonempty literal physical selection; root policy, no Git requirement                                                  | Read-only selected-source report/events                                                          | New `selection-terminal`; never complete repository acceptance    |
| `json-quality check-files --stdin --stdin-filepath A.json [--root R]`        | One virtual file's raw stdin bytes; policy at R or current directory                                                  | Scoped report/events; does not read or replace A.json's contents                                 | `selection-terminal`, stdin scope                                 |
| `json-quality check-source [--contract JSON] [--stdin-filepath A.json]`      | Raw stdin under the closed explicit contract, default `{}`; filename supplies identity/framing, not repository policy | Existing source report/events, with explicit raw scope                                           | Source `terminal`; no repository claim                            |
| `json-quality format --dry-run [--root R] [-- A.json ...]`                   | Complete repository preflight; selected eligible physical sources, or all eligible sources if no files                | Actual no-write candidate preview; changed paths, byte lengths/digests and remaining quality     | New `format-preview-terminal` after cleanup                       |
| `json-quality format --write [--root R] [-- A.json ...]`                     | Same complete preflight/selection                                                                                     | Guarded physical replacement; no files explicitly means all eligible writable sources            | Existing `write-terminal`; successful effect can leave findings   |
| `json-quality normalize --dry-run [--root R] -- A.json ...`                  | Nonempty explicit physical selection and complete repository preflight                                                | Existing NFC span/identity preview, zero source writes                                           | Existing `normalization-preview-terminal`                         |
| `json-quality normalize --write [--root R] -- A.json ...`                    | Same selection, ownership and collision controls                                                                      | Guarded NFC replacement                                                                          | Existing `write-terminal`                                         |
| `json-quality format --stdin [--contract JSON] [--stdin-filepath A.json]`    | Raw stdin contract mode when `--root` is absent                                                                       | Formatted UTF-8 source only on stdout; diagnostics on stderr; no filesystem replacement          | Completed transform and output delivery; no repository acceptance |
| `json-quality normalize --stdin [--contract JSON] [--stdin-filepath A.json]` | Same raw mode; explicit NFC operation                                                                                 | Normalized UTF-8 source only on stdout; collision/preservation refusal produces no source output | Same limited authority                                            |
| `json-quality format --stdin --root R --stdin-filepath A.json`               | Explicit policy-aware virtual input at R; `--contract` forbidden                                                      | Source only on stdout after policy and transform admission; no checkout writes                   | Scoped transform, not repository preflight                        |
| `json-quality normalize --stdin --root R --stdin-filepath A.json`            | Same policy-aware virtual route; NFC ownership and collision controls apply                                           | Source only on stdout after admission                                                            | Same limited authority                                            |

For `json-quality-qualify-git`, add `--version`/`-v`, improve its existing help and keep operation output exclusively NDJSON.
With no arguments and none of its qualification input environment variables set, print help and exit 0.
With environment-supplied trusted/candidate roots and commits, no arguments must continue to qualify.
Partial or obsolete qualification environment input must fail with exit 2, not become help success.
This preserves the shared workflow's current `node producer/src/qualification-cli.js` invocation.
Explicit help/version precede qualification environment validation and never inspect candidate code.
Do not add human display flags to this machine-oriented binary.

### Parsing, discovery and conflicts

Use a small shared discovery helper and command metadata in the existing CLI layer, not a new command framework.
Obtain version from the package-relative `package.json` identified by the module URL, never from cwd, Git, a global installation or a duplicated version constant.
Keep both entrypoints import-inert.
Defer execution/native dependency loading until after discovery and argument admission wherever practical.
Help/version must work with an unavailable native companion and a PATH without Git.
Do not promise normal commands work without their declared installed dependencies.

Keep strict option parsing.
Unknown commands/options remain exit 2 with the offending input, the relevant usage line and one specific correction.
For example, `check -- package.json` should explain `check-files -- package.json` and that `check` evaluates the complete repository.
Do not guess a misspelled command and execute it.
Root `--version` accepts no command or execution options; command-level `--version`, simultaneous help/version, and discovery combined with NDJSON fail before effects.
Known command help can ignore valid execution-option values after syntactic parsing, but cannot hide unknown flags.

The following combinations are invalid before policy/provider/input work:

- Filesystem format/normalize without a mode; both `--write` and `--dry-run`; negative spellings of those mode flags; modes on check/check-files/check-source.
- `--stdin` with file positionals; any transform stdin with `--write`, `--dry-run` or `--ndjson`; `--stdin` on full `check`.
- Policy-aware transform stdin with no `--stdin-filepath`; any policy-aware operation with `--contract`; raw `check-source` with `--root`.
- `--stdin-filepath` on physical-file operations; transform controls on read-only checks; source-contract controls on repository writes.
- `--ndjson` together with `--quiet` or `--diagnostic-display-level`; any unknown option/value or duplicate conflicting singleton option.

One accepted mode is enough.
Transform stdin inherently selects source-output mode and never needs `--write`.
It never enables filesystem replacement.
`check-source` retains its existing implicit stdin input and does not require an added `--stdin` alias.

### Literal paths and root choice

Preserve accepted positional syntax with or without `--`; recommend `--` consistently in public examples.
Arguments after the delimiter are paths even when beginning with a hyphen.
Without the delimiter, unknown option-like names fail safely.
Use canonical root-relative POSIX paths for source identities, as the existing API does; `--root` can be a native absolute or relative filesystem path.
Document forward slashes in Windows source arguments and quote spaces.
Reject absolute source paths, parent traversal, empty/dot segments, backslashes, colon/control characters, duplicate identities and admitted filesystem aliases that resolve to the same physical source.
Preserve literal filenames containing wildcard characters where the platform permits them; never expand them.
A missing wildcard-looking literal gets an explanatory error.

Selected commands accept files, not directories.
Do not introduce recursive directory scope or an internal glob dependency.
Shell expansion may produce literal inputs where the user's shell supports it; do not advertise that behavior as portable between POSIX shells, cmd and PowerShell.
Full repository discovery remains the route for complete directory obligations.

Default repository-policy roots remain cwd; `--root` selects exactly that root.
No parent search for Git, package.json or policy is added.
Report the effective root and either the actual root policy origin or packaged-defaults-with-observed-absence.
For raw input, report explicit-contract scope rather than inventing a policy root.
Existing policy provenance digests remain available in machine output.
A separate inspect command is unnecessary for this remediation.

## Scoped checking and virtual-file policy

### Selected physical files

Add a public `checkJsonFiles(options)` async generator and `FileCheckOptions` type.
The closed options are `{root, files, capacityLimits?, runtimeControls?, temporaryDirectory?, signal?, requestId?}`; root and a nonempty files array are required for the library API.
The CLI supplies cwd when its root option is absent.
The function owns its execution and cleanup, streams versioned events and delivers the selected aggregate terminal only after cleanup.
It exposes no rewrite or retained-reference capability.
Reject provider, required-output and arbitrary context fields instead of suggesting this API can replace `openJsonRepositorySession`.

Implement one internal selected-source execution owner, reused by physical-file checks and policy-aware virtual checks.
Reuse `bootstrapJsonPolicy`, `resolveJsonSourceContract`, execution-resource resolution, native capture/value projection, source observation helpers and the native census where useful for bounded selected-member state.
Do not call full repository checking and filter its output.
Do not scan all unrelated files to manufacture a selected result.
Do not implement a second JSON parser, normalizer, canonicalizer or equality test.

Admit the complete literal selection and its control-data budget before opening selected source bodies.
Require regular files through regular ancestors and real containment; identify exact bytes and observations using `repository-source.js`.
Evaluate all selected sources under the effective path contract, including format/framing, expectations, protected NFC pins and owner attribution.
Explicit read selection does not silently disappear because Git ignore or untracked discovery exclusions would omit it.
Such exclusions control automatic discovery, not permission to claim that an explicitly requested file was checked.
Do not falsely label an explicitly selected file Git-tracked to achieve inclusion.
Preserve the resolver's actual protection and ownership metadata, and emit the effective selected contract in bounded metadata where needed to explain a refusal.

The selected owner does not invoke Git, native/logical providers or required-output inventories.
Its final result says these repository obligations were not assessed.
If a selected source's own contract contains `expected.linkedDocuments`, refuse with exit 2 and a full-check instruction: do not strip those links and issue a successful source verdict.
Global provider declarations need not prevent an explicitly limited physical check, but cannot be reported as satisfied.
A file containing ordinary embedded JSON strings is checked as its physical JSON source; this does not imply its provider-defined logical documents were evaluated.

Recheck each selected source and the root policy observation, including prior policy absence, before final success.
An unrelated file changing does not invalidate this explicitly limited scope; selected bytes, selected identity, path containment or policy changing does.
Do not claim full discovery freshness or inventory closure.
A nonempty selection with a missing, inaccessible, duplicate or unsupported file fails operationally instead of returning an empty-success result.

### Filename-aware stdin

Use one raw UTF-8 byte stream, not a JSON/base64 request envelope.
The public source checker and existing pure writers already establish the needed byte/text separation.
`--stdin-filepath` is a virtual source identity; it never means read stdin from that file or overwrite that file.
Accept one filename and one input stream only.
Reject additional positionals, multiple virtual filenames and mixed input modes before consuming stdin.

For raw `check-source` and raw transform stdin, the virtual filename selects display identity and the existing framing rules only.
It does not load repository configuration.
If an explicit contract also supplies path or format, require agreement rather than applying ambiguous precedence.
Without a virtual filename, preserve current raw source-contract defaults and explicitly selected framing.

For policy-aware `check-files --stdin`, use root/cwd policy.
For transform stdin, the presence of explicit `--root` selects policy-aware mode and requires a virtual filename.
Without `--root`, transform stdin uses the closed raw contract, default `{}`.
Help must make that distinction prominent; a filename alone does not unexpectedly trigger policy discovery.
Trusted CLI context is never inferred for either scoped stdin route.

Use existing `json-paths.js` qualification: strict JSON paths include `.json`, `.jsonld` and `.sarif`; checks retain existing strict-per-record JSONL/NDJSON support.
Generic transforms continue to reject JSONL/NDJSON, JSONC and JSON5.
Do not add dialects or relax extension/case handling independently of existing path qualification.
Unknown virtual extensions fail with an actionable supported-input message.
Existing raw contracts without this new filename option retain their current contract-defined framing.

A policy-aware virtual path may name a not-yet-created file.
Admit its lexical containment and existing ancestors; reject symlinks/nonregular existing entries and path escapes.
Do not read existing target content to replace stdin.
Apply the exact selected path's policy.
Protected/generated/producer-owned paths cannot acquire transform authority merely because output would go to stdout.
Refuse transforms when `allowSourceRewrites` is false, the selected presentation belongs to another producer, or NFC preservation forbids normalization.
Apply expected bytes/diagnostics and protected-value pins to supplied stdin; do not silently substitute disk contents or drop mismatches.
Refuse linked-document obligations that this scope cannot discharge.
Check the complete derived candidate under the same selected contract before output.

The CLI rejects any nonempty trusted adapter context for `check-files`, `check-source` and all stdin transforms.
Admission can reject obvious command conflicts before evaluating a context factory; after a valid factory returns, its fixed-root/provider/output authority cannot be downgraded to a scoped command.
Full repository check and filesystem rewrite keep their existing adapter behavior.

## Explicit mutation, preview and compatibility

### Filesystem modes

Require explicit `--write` for filesystem effects in both verbs.
Retain `format --write` without files as the deliberate all-eligible-source operation, and say so in its usage and first human status.
Retain normalization's nonempty explicit file requirement for both filesystem modes.
No discovery-only or scoped-check command invokes replacement.

`--dry-run` performs selection, ownership, complete repository checks, actual transformations, linked-candidate reconstruction, candidate admission and freshness checks.
It then reports the candidate and returns without entering the replacement loop.
It is not a renamed source check and is not allowed to skip candidate policy or peers.
Reuse the existing retained transform/census path so write and preview share the same admission.
Preview is an observation of this run, not a reservation or a capability allowing later writes without a fresh preflight.

Add format preview records for each selected candidate with path, changed/no-change status, original and candidate SHA-256, byte lengths and the existing implementation identity.
Human output shows which paths would change and a final changed/selected count with remaining quality findings.
Retain normalization's existing decoded-span, pointer, digest and Unicode-identity preview.
All preview records are provisional until the applicable terminal.
Neither preview emits `written` or `write-terminal`.
Do not add a diff algorithm or reporter framework: these concrete candidate previews plus clean stdin transformed output meet the inspection need.
If a later requirement specifically needs unified diffs, plan that separately rather than conflating a diff with source output or introducing Git merely to render one.

Extend `RepositoryRewriteOptions.dryRun` to format as well as normalize.
The library method remains named `rewrite`; an explicit `session.rewrite(...)` call continues to mean effects unless `dryRun: true`.
Do not add a redundant library `write: true` flag or change existing API calls into silent previews.
Keep `formatJsonSource`, `formatJsonValue` and `normalizeJsonSource` as pure text/value transformations.
Reuse their internal `formatSource`/`normalizeSource` implementations with retained native state where the CLI must apply a fuller path contract.

### Migration decision

Treat this as a breaking CLI change in the next prerelease of the 1.0.0 line.
The proposed release coordinate is `1.0.0-rc.3`, subject to the normal release owner's unused-version check; this plan does not assert that coordinate is available or publish it.
Do not backport the new defaults under the already identified rc.2 bytes.
If a stable 1.x release has intervened before implementation, replan the semver boundary as a major release instead of relabeling a stable breaking change as a minor fix.

Old mode-less `format` and `normalize` must fail before context/policy/input work with exit 2 and commands showing `--write` and `--dry-run`.
They must not silently become no-write previews, continue writing with only a warning, or depend on an environment toggle.
Existing `normalize --dry-run` remains supported with its selection and refusal semantics.
`check`, raw `check-source`, optional delimiter use and explicit library rewrite calls retain their meanings.

Update live callers in the same coherent candidate: `package.json` writer scripts, executable examples, current CLI/API/consumer documentation, installed CLI probes and exact expected command inventories.
The root `format:json` and `normalize:json` scripts must include `--write`; normalization still requires callers to supply files.
Add release notes with before/after commands and the public event-version change.
Do not rewrite historical invocations, qualification files, old receipts or old plans to resemble new behavior.

### Exit semantics

| Outcome                                                                                                                                                                         | Exit |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| Help/version; satisfied complete or explicitly scoped check                                                                                                                     | 0    |
| Successful filesystem write, whether or not unrelated quality findings remain                                                                                                   | 0    |
| Complete admissible preview, including changed candidates and remaining repair-independent findings                                                                             | 0    |
| Fully admitted stdin transform whose complete bytes were delivered                                                                                                              | 0    |
| Completed check with failed selected/full quality or expectations                                                                                                               | 1    |
| Completed preview refused by established native quality/peer/collision admission                                                                                                | 1    |
| Completed stdin source assessment refusing unsafe/invalid/colliding transformation                                                                                              | 1    |
| Invalid mode/path/policy/ownership/unsupported contract; unavailable component; quota exhaustion; stale observation; interruption; incomplete process, input, output or cleanup | 2    |

Preserve the established repository write-failure behavior: a refused or incomplete replacement operation reports `write-failure` and exit 2.
Do not change existing writer refusals merely to make all commands share an identical refusal table.
For previews, reuse the exact native refusal identities already recognized in `repository-rewrite.js`; do not classify arbitrary exception text as completed quality failure.
New stdin refusal classification must come from complete shared-reader facts, not substring matching of thrown messages.
Invalid empty/truncated JSON at a normal EOF can be a completed quality failure; an interrupted transport before EOF is incomplete.

## Human output, machine output and stream ownership

### Stream contract

| Mode                                                    | Stdout                              | Stderr                                                                                        |
| ------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------- |
| Help/version/no-operation help                          | Requested discovery text only       | Discovery delivery/argument errors                                                            |
| Human check, preview or filesystem write                | Empty                               | Findings, selected scope/root/policy context, progress and final summary                      |
| `--ndjson` check/preview/write; qualification operation | Complete versioned events only      | Last-resort operational text only when applicable; never duplicate ordinary event diagnostics |
| Stdin transform                                         | Exact transformed UTF-8 source only | Human diagnostics and limited-operation summary, subject to display controls                  |

Keep normal human success summaries by default.
They make scope and writer-versus-quality outcomes understandable.
`--quiet` suppresses routine status, per-file success notices and success summaries while retaining selected diagnostic messages and failures.
`--diagnostic-display-level info|warning|error` filters human diagnostic presentation only; default is info.
These options have different purposes and can be combined.
All current `finding` events remain errors; non-blocking NFC collision-risk notices can be presented as warnings without changing the event contract's error severity or the native rule.
Do not invent a warning budget, `--max-warnings`, rule suppression, or an exit threshold.
Errors, operational failures and partial-write warnings are never hidden.
Reject display flags with NDJSON rather than implying they filter required machine evidence.

Move human event rendering into a small package-owned message catalog keyed by existing phase/ruleId/messageId.
Use concrete language, stable identifiers in parentheses and existing line/column/record metadata.
Include actionable distinctions for syntax, invalid UTF-8/BOM, duplicate keys, unsafe numbers, empty keys, NFC drift/collision/preservation mismatch, presentation drift, expectations, protected paths, stale observations and capacity failures.
Examples:

- `authored.json:3:8: String is not NFC-normalized. Preview with normalize --dry-run; formatting preserves this value. (json-quality/nfc-strings/unnormalized)`
- `authored.json:2:3: These keys would become equal after NFC normalization. Reconcile them in the owning source before normalizing. (json-quality/nfc-strings/collision)`
- `Selected files checked: 2; repository-wide obligations were not assessed.`
- `Formatting completed: 1 file written; 1 quality finding remains. Run check for the full repository verdict.`

Unknown future identifiers fall back to an honest bounded phase/identifier message.
Escape terminal controls in user-controlled paths and text.
Do not materialize entire source values, huge JSON pointers or arbitrary event arguments just to improve wording.
Use existing bounded native spans/references; show only already admitted bounded context.

### Input, output and cancellation boundaries

For stdin commands, detect interactive stdin and fail with usage rather than waiting indefinitely.
Require EOF before asserting input completion.
Respect fatal UTF-8 admission, existing BOM/strict grammar rules, source-byte totals, path/request budgets, runtime deadlines and transform workspace/output ceilings.
Preserve group-specific disable/override behavior: disabling quotas never disables identity, containment, cleanup, cancellation or policy checks.

For transforms, capture and admit the complete byte stream through the shared reader before decoding/materializing it for the existing finite writer.
Reserve the managed workspace before growing retained text or output; use the current native ledger and transform limits.
Do not create an unbounded `Buffer.concat` input path, a second parser, or a hidden large-input fallback.
Read-only source checks can still handle inputs exceeding the finite writer envelope.

Compute and postcheck the full transformed source before writing the first output byte.
Release native sessions and scratch before source-output success; retain only the already budgeted output buffer needed for delivery.
Complete all policy freshness checks before delivery and do not describe the virtual target as a disk snapshot.
Use awaited/backpressured output writes and account raw source output and report output against their appropriate existing controls.
Honor both `maximumOutputBytes` and aggregate `maxToolOutputBytes` where applicable.

SIGINT/SIGTERM and caller abort must stop input, settle workers, release leases and await owned cleanup.
A broken stdout or stderr sink returns 2, including EPIPE.
Do not silently turn EPIPE into Unix-style success, retry the failed sink or append machine terminals after delivery has failed.
An OS pipe can contain a partial source if the consumer disappears during output; no tool can retract those bytes.
Document that exit 0 is required before a consumer adopts transformed output.
No automatic retry or automatic file rollback is introduced.

## Event, native and package compatibility

### Version decision and event scope

Introduce event schema v5 and cohort version 5 because new closed event variants and scoped completion are incompatible with the current closed v4 reader.
Keep configuration schema 4, source-contract schema v4, native protocol 4, component schema 4 and Node-API 9 unless a demonstrated implementation need changes those contracts.
The intended vector is:

`{cohortVersion: 5, configurationSchemaVersion: 4, eventSchemaVersion: 5, nativeProtocolVersion: 4, componentSchemaVersion: 4, nodeApiVersion: 9}`.

Do not indiscriminately replace every 4 in the repository.
Configuration files, release-manifest versions and unrelated evidence formats retain their actual owners and versions.
Update schema compilation to validate each exported schema against its owning version rather than the current blanket `/v4` assertion.

Keep existing `scope: source|candidate` meanings intact.
Add a separate closed `operationScope` object for operation-level metadata:

- `kind`: `repository`, `selected-files`, `stdin` or `immutable-git-json`.
- `policy`: `repository`, `explicit-contract` or `trusted-git`.
- `completeRepositoryCheck`: true only for the full repository check operation; a true value still requires a satisfied final verdict.

Attach scope to CLI operation starts and applicable final terminals, and to the new selected-check library events.
Do not mutate a native source terminal into repository authority.
The standalone source-session API keeps its source terminal contract; its CLI wrapper adds explicit raw-input scope.
Qualification retains its existing trusted/candidate identities and immutable-Git scope, and never acquires complete repository authority.

Add `selection` and `selection-terminal` for `check-files`, including its virtual input mode.
The start identifies root/policy provenance, input kind, declared selection count and effective resources.
The terminal includes the same scope, selected and completed source counts, `complete`, `diagnosticsComplete`, `qualityPassed`, `contractSatisfied` and policy-observation completion.
Physical checks additionally require selected-source observation completion; virtual stdin requires input completion and must not claim physical observations.
Use conditional closed schema branches for those variants.
Do not put `inventoryComplete: true`, `linkedExpectationsComplete: true` or provider closure on these terminals.
A missing/failed selected source prevents a successful aggregate terminal.
Per-source terminals remain provisional.

Add `format-preview-change` and `format-preview-terminal` with the candidate identity/count fields described above.
Keep existing normalization preview event names and fields.
Preview terminals distinguish complete admissibility, complete quality refusal and incomplete work; failed cleanup withholds successful completion.
Keep write terminals and truthful confirmed-write/uncertain-path failures.
Update all event dispatch/completion recognition, including `value-session.js`, `session-surface.js` and both CLI owners, in the same candidate.

### Native coupling is real

`native/build.py` projects every cohort-vector member into generated `contract_cohort.hpp`.
It includes `contract-cohort.json` in source-input hashes and embeds the complete cohort and control-schema identities in `component.json`.
`src/native-component.js` deep-compares the complete vector and verifies the packaged control-schema bytes.
Consequently, retaining native protocol 4 does not make cohort-4 native binaries acceptable with the proposed cohort-5 core package.

Future native verification and packaging require newly produced matching companion artifacts through the existing build/stage path.
Do not hand-edit component manifests, source digests, binaries, identity assertions or receipts to appear current.
No native build, installation or staging is authorized in this plan-authoring task.
Before a later native build, confirm that the implementation instruction or accepted plan covers the required build/staging action, reuse any authority already granted, and use the established producer Node/npm and native toolchain.
Only a genuinely out-of-scope action requires another permission request.
Until matching artifacts exist, schema/source-only checks may pass but native and installed acceptance must remain explicitly unverified.

No new native command, parser or equality algorithm is planned.
Reuse existing capture, census, rewrite selection/admission/status, retained transformation and source comparison operations.
If those operations cannot express selected checks or preview safely, stop at that narrow seam and revise the native protocol decision before implementation expands it.

### Producer, reader and consumer seam map

| Owning surface                                                                                                                                                      | Planned responsibility and coupled readers                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/commands.js`, `src/cli.js`, `src/qualification-cli.js`, `src/module-entry.js`                                                                                  | Command metadata, lightweight discovery, command-specific admission, scope/stream dispatch, error guidance and both-bin version behavior. Preserve inert imports and trusted-context admission.                    |
| New small CLI discovery/message helpers under `src/`                                                                                                                | Share package version/help primitives and human messages without importing operational/native paths for discovery. Avoid a reporter/plugin framework.                                                              |
| `src/sessions.js`, `src/session-surface.js`, `src/repository-execution.js`, new selected-source execution owner                                                     | Add the closed `checkJsonFiles` entry and cleanup-owning selected operation; preserve complete repository factory semantics. Factor only genuinely shared policy/resource ownership.                               |
| `src/policy-bootstrap.js`, `src/configuration.js`, `src/policy-provenance.js`, `src/repository-source.js`, `src/paths.js`, `src/json-paths.js`                      | Reuse bounded policy admission, actual contracts, exact observation, containment and dialect rules. Add only missing shared selected/virtual admission helpers; do not weaken existing repository checks.          |
| `src/repository-rewrite.js`, `src/native-formatting.js`, `src/native-normalization.js`, `src/guarded-replacement.js`, `src/transform-capabilities.js`               | Share real candidate preflight between format preview and writes; keep protected sources, linked candidates, freshness and partial-write behavior. Reuse existing transform implementations for stdin.             |
| `src/events.js`, `src/value-session.js`, `schemas/event.schema.json`, `schemas/contract-cohort.json`                                                                | Closed v5 schema, new scope/terminal variants and corresponding projection/delivery paths. Current source/configuration schemas are dependencies, not automatic rewrite targets.                                   |
| `src/api-types.js`, `src/index.js`, `scripts/build-types.js`, `types/`                                                                                              | Export selected-check API/types; extend dryRun documentation/type semantics; regenerate actual affected declarations through the existing generator. Preserve independent schema versions.                         |
| `native/build.py`, `native/stage.py`, `src/native-component.js`, `src/native-session.js`, `native/prebuilt/`, `assets/native-packages.json`                         | Build and verify the matching cohort through existing producer paths when separately authorized. Inspect rather than weaken exact identities or protocol admission.                                                |
| `scripts/check-schemas.js`, `scripts/project-resource-limits.js`, `scripts/project-policy-inputs.js`, `scripts/check-package.js`                                    | Keep strict offline schema compilation, resource projection, resolver-input identity and package export/shipment validation coherent. Regenerate projections only when their inputs actually changed.              |
| `scripts/consumer-cli-probe.js`, `scripts/consumer-layouts.js`, `scripts/consumer-probe.mjs`, `scripts/consumer-types.mts`, `tests/consumer-minimal.test.js`        | Migrate actual invocation, frozen `MINIMAL_CLI_COMMANDS`/`MINIMAL_CLI_CASES`, current cohort assertions, schema/type consumption and evidence validation together. Retain stale/substituted observation rejection. |
| `scripts/qualify-package.js`, `scripts/qualify-runtime.js`, existing release evidence readers                                                                       | Reuse root/isolated installed-consumer paths. Do not run the broad source suite hidden inside qualify-runtime for this scoped task. Old evidence cannot satisfy new command/cohort requirements.                   |
| `scripts/check-workflows.js`, `src/qualification.js`, `src/git-objects.js`, shared workflow callers                                                                 | Preserve producer-owned, data-only immutable-Git qualification and environment-only invocation. No remote workflow/settings changes are part of this plan.                                                         |
| `scripts/test-impact.js` and existing affected-test machinery                                                                                                       | Add only genuine process/data-input relationships absent from imports, such as a new spawned entry/helper. Do not turn a graph fallback into authorization for full-suite execution.                               |
| `README.md`, `CHANGELOG.md`, `docs/cli.md`, `docs/api.md`, `docs/consumer-guide.md`, `docs/configuration.md`, `docs/ci-trust.md`, relevant current examples/scripts | Explain modes, limited scope, policy roots, stdin, streams, exits, migration and full-check obligations. Edit only current owning text; inspect CONTRIBUTING and shipped-doc inventories for actual links/callers. |

The work adds no runtime dependency.
Use Node's existing parser/streams, current Ajv schemas, installed Prettier and the shared native implementation.
No code is copied from comparison tools, so their licenses do not create a new notice obligation.
If a new dependency or copied implementation later becomes necessary, document that specific need and license/package effect before adding it.

## Implementation slices and dependencies

Before each slice, inspect the current producer, all readers, embedded/generated contracts, compatibility branches and actual consumers.
Confirm that the baseline has not drifted.
Keep one coherent candidate; do not claim expensive native/packed proof for an intermediate mixed-cohort state.
The slice boundaries organize work and review, not mandatory separate commits or repeated full verification.

### S1 — Discovery, admission and human presentation

Implement package-relative version discovery for both binaries, contextual help, no-argument behavior and actionable conflict errors.
Protect qualification's environment-only invocation.
Separate the lightweight discovery path from execution loading and factor human rendering.
Add presentation-only controls and the agreed stream contract.
Write current documentation examples alongside behavior.

Proof: P1 first, using real Node entry processes and failing context factories/native-unavailable fixtures.
No native rebuild is needed to prove help/version/admission alone.
Do not begin destructive/write test cases merely to test parsing.

### S2 — Scoped file and virtual-source checking

Implement the selected-source owner and `checkJsonFiles` API, native-backed policy/bootstrap reuse, literal path admission, exact observations, no-Git execution and final selected scope.
Add policy-aware `check-files --stdin` and raw check-source filename context.
Introduce event v5/cohort 5, selected events, scoped terminal metadata and generated types together.
Reject selected linked obligations and trusted-adapter downgrades explicitly.

Proof: strict schema/type/projection validators, P2 admission cases, then minimal native selected-file and source-process cases with matching artifacts.
No full repository test run is required.
This slice establishes the shared virtual-policy seam used by S4.

### S3 — Explicit writes and real formatting preview

Require filesystem modes, update current writer callers, extend repository dryRun to format and add format candidate preview events.
Retain normalize preview and full rewrite freshness, ownership, logical dependency and partial-completion behavior.
Add migration guidance and remaining-quality wording.

Proof: P3 focused existing regressions plus proposed no-mode, zero-write preview and candidate-refusal tests.
Use repository fixtures containing only the necessary peers and logical obligations.
Do not weaken refusal codes or compare only exit status when source bytes/terminal shape matter.

### S4 — Clean stdin transforms

Add `format --stdin` and `normalize --stdin`, raw contracts and explicit root-plus-filename policy context.
Reuse finite native/shared transforms, apply complete selected postconditions and hold output until admission and cleanup.
Enforce mode conflicts, strict framing, protection, quotas, TTY/EOF, cancellation, backpressure and sink failure.

Proof: P4 real child processes with byte-exact stdin/stdout and a minimal temporary policy root.
Test the no-checkout-write boundary by comparing the relevant fixture inventory and file bytes before/after; do not build a general filesystem-audit framework.

### S5 — Installed consumer and contract migration

Update minimal installed CLI execution and its exact expected inventories, current schema/cohort readers, public export/type probes and root/isolated consumer assertions.
Keep ordinary dependency-only npm installation and the generated lock protection.
Preserve the prior producer Node/npm absolute-pair and producer-owned qualification controls.
Do not revive the retired acquisition bootstrap.

Proof: P5's cheap reader tests first.
When the implementation authority covers the necessary package/test-install execution and matching frozen package artifacts exist, run the updated targeted installed corpus in both existing layouts without a redundant approval milestone.
Preparation and cheap reader tests belong here; packing and installed execution wait for the reviewed, approved committed candidate described in S6.
Do not invoke `qualify-runtime.js` as a shortcut: it currently launches a broad source suite before its package layouts.
Reuse `qualify-package.js` and its existing entry parameters for the exact supplied artifacts/layouts.
If a focused installed entry is missing, extract the current minimal corpus as a narrow selectable owner without changing its default complete qualification or evidence labels.

### S6 — Consolidation, review and delivery

Complete the finding trace, current docs, examples, scripts and package files inventory.
Format/lint the exact changed scope, run remaining cheapest owning validators and applicable focused source/native tests, and freeze the coherent review candidate.
Then perform one internal Review Agent review under the accepted controls.
Repair narrowly and rerun only the proofs affected by each repair.
Reuse unaffected passes with their exact candidate applicability stated.
Do not schedule security/external reviews or parallel agents merely to execute tests.

Report what was implemented, actual targeted proof, native/packed/hosted gaps, and migration consequences.
Do not describe scoped passes as full repository or release acceptance.
Future signed local commits require the exact detailed per-file commit message to be shown and approved before each commit.
Each commit must contain fewer than 50 files.
Determine grouping from actual changed files; do not split an inseparable producer/reader contract merely to make a count look smaller.
Do not push.
This plan itself is not to be committed in the current task.

`scripts/pack.js` explicitly refuses dirty source: adoption archives require clean committed source.
After review and the required message approval, the actual coherent implementation commits can supply that frozen identity.
Do not create a process-only commit, claim an uncommitted snapshot has HEAD's identity, omit dirty files from the proof, or weaken the clean-checkout guard.
If commit approval or matching native artifacts are unavailable, finish with the source-only evidence and an explicit packed-proof gap.
Once an approved clean candidate exists and packaging/install execution is authorized, perform P5 against that exact candidate and matching companion artifacts.
Any resulting repair requires its own narrow verification and approved signed commit before new packed evidence; review the material delta as needed.
This ordering keeps clean-source packing honest without manufacturing preparatory commits.

## Focused verification

### Execution rules

Use existing `node:test`, native fixtures and `temporary-directory.js`/`temporary-repository.js`.
Discover true test names in the current files immediately before selecting them.
Use `--test-name-pattern` anchored to exact names; a file path or substring of an old name is not proof that the intended method ran.
Check the runner's selected/pass/skip/fail output and process exit.
New cases below are proposed tests, not existing passes.

Use the actual installed Node and npm CLI paths; set `npm_execpath` when the selected fixture depends on npm.
For this Windows environment the known paths are `C:/Program Files/nodejs/node.exe` and `C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js`.
Do not use `npm exec --no -- node`, which previously attempted Node acquisition.

An example of a genuine narrow existing selector is:

```powershell
$env:npm_execpath = 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js'
& 'C:/Program Files/nodejs/node.exe' --test --test-name-pattern '^read-only repository checks retain complete scope and cannot select literal subsets$' tests/cli-flexibility.test.js
```

Restore an environment override after the selected run if the shell persists.
Batch related exact methods in one owning file when that avoids startup cost, retaining correct anchored alternation.
Do not run `npm test`, `check:repository`, the full native suite, `qualify-runtime.js`, security audit scripts or an affected-test fallback that expands to the full repository.
A targeted test that unexpectedly installs/builds or expands its scope needs a narrower existing entry or an explicitly reported boundary, not unapproved execution.

### Existing regression selectors and proposed boundary tests

| Proof                                    | Exact existing tests to retain/select where affected                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Proposed tests and concrete oracle                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1: discovery and admission              | `tests/cli-flexibility.test.js`: `CLI argument admission and help run before trusted context loading`; `trusted CLI adapters retain fixed roots and required-output obligations`; `raw source checks cannot replace a trusted repository adapter's obligations`; `the retired --json flag fails before command effects`. `tests/cli-entry.test.js`: `the symlinked cli.js binary runs, while importing it stays inert`; `the symlinked qualification-cli.js binary runs, while importing it stays inert`.                                                                                                                                                                                                                                                                                                                                                                                            | Both-bin versions match the package containing the invoked module despite a different cwd/package; discovery works without Git/native companion and never opens stdin/context. Command help differs meaningfully. Unknown/conflicting options and mode-less writes fail before effects. No-argument qualification with complete environment executes, partial environment fails, empty environment helps.                                                         |
| P2: scopes, paths and policy             | `tests/cli-flexibility.test.js`: `read-only repository checks retain complete scope and cannot select literal subsets`; `the public repository CLI checks authored JSON with verified configuration absence`. `tests/policy-resolution.test.js`: `package boundaries protect tracked dependencies and npm locks without broad exclusions`. `tests/native/repository-check.test.mjs`: `repository verdict follows physical and logical checks, exact linkage and freshness`; `stopping at a source terminal leaves census delivery incomplete`.                                                                                                                                                                                                                                                                                                                                                       | A valid selected file beside an invalid unselected peer passes selected scope but full check fails. No-Git selected roots work. Missing/duplicate/directory/escaping/symlink/unsupported files fail without empty success. Selected ignore/exclusion paths are not skipped. Selected expected-link obligations refuse. Selected bytes, identity and policy creation/change before final terminal prevent completion.                                              |
| P3: preview, writes and invariants       | `tests/cli-flexibility.test.js`: `normalization preview binds decoded changes and no-change results to Unicode identity`; `normalization preview reports complete collision refusal without a write terminal`; `normalization preview keeps preserved policy and invalid selections as errors`; `selected formatting retains invalid-peer preflight and changes only selected sources`; `literal write selection rejects duplicate/escaping paths and undiscovered sources`; `JSONL producer framing never grants generic format write permission`. `tests/native/repository-rewrite.test.mjs`: `a bad unselected peer prevents every otherwise valid replacement`; `root NFC preflight rechecks actual changed logical JSON before its container is replaced`; `late peer mutation yields truthful partial completion`; `an ignore-rule change after preflight refuses the pending physical write`. | Missing mode and conflicting modes preserve all fixture bytes. Format preview computes candidates identical to a later fresh permitted write while making zero writes; unchanged and changed selections report exact identities/counts. Invalid peers, candidate failures, policy changes and cleanup failure cannot yield a successful preview. `--write` still refuses protected locks and preserves partial-write counts/uncertain path.                       |
| P4: source output and delivery           | `tests/formatting.test.js`: `public printer preserves token spelling, order and unnormalized source values`; `pure formatting retains strict syntax and resource admission`. `tests/native/formatting.test.mjs`: `retained formatter uses native preflight, Prettier guard and complete same-reader postcheck`. `tests/native/normalization.test.mjs`: `normalization collision, unsafe numbers and preservation cannot acquire output`. `tests/native/cli-events.test.mjs`: `CLI consumes raw source bytes and delivers correlated complete NDJSON`; `failed CLI output delivery closes its source session and exits incomplete`.                                                                                                                                                                                                                                                                   | Byte-exact raw and policy-aware stdin output preserves numeric lexemes, order and format/NFC separation. No status text contaminates stdout. Virtual path/contract conflicts, protected targets, malformed UTF-8, incomplete transport, TTY and unsupported framing refuse. A normal invalid-JSON EOF is a completed refusal. Slow output, real broken pipes, abort, output/input/workspace caps and failed cleanup never return success or mutate a checkout.    |
| P5: schemas, installed entry and readers | `tests/cli-flexibility.test.js`: `event admission is closed and requires complete terminal evidence`. `tests/consumer-minimal.test.js`: `minimal CLI evidence rejects missing, duplicate, stale and substituted observations`; `the installed execution digest must match the exact packaged default asset`. `tests/native/git-qualification.test.mjs`: `qualification CLI delivers NDJSON for the immutable source scope`; `candidate policy is ordinary data and cannot weaken the trusted policy`.                                                                                                                                                                                                                                                                                                                                                                                                | Closed v5 schema rejects missing/contradictory scope and incomplete selected terminals; v4 evidence cannot certify v5. Default/source/config schema versions remain independently correct. Installed bins in root and isolated layouts exercise version/help, explicit writes, previews, selected checks, stdin, protected locks and remaining-quality cases with actual source bytes/exit/events. Current exact inventories and frozen package identities agree. |

Add only boundary tests justified by the changed contract.
Use real minimal native/process/filesystem cases for authority, streams and freshness, rather than mocks of the implementation being tested.
Use existing narrow failure seams for cleanup/refusal tests where possible, plus at least the relevant real child-process/broken-pipe boundary.
Do not weaken oracles, suppress errors, increase timeouts to hide failures or invent receipts.
No new retry mechanism is planned, so a retry test framework is unnecessary.

Cheapest validators precede native and package work:

1. Inspect the complete changed producer/reader relation, then run exact-scope formatter/linter and `git diff --check`.
2. Where changed, run `scripts/check-schemas.js`, resource projection checks, policy-input projection checks, public package checks and strict generated-type checks through their existing owners.
   Regenerate actual projections/types when required; do not hand-edit generated declarations.
3. Run only the selected Node admission/reader methods, then the minimum affected native/process methods after matching components exist.
4. Freeze the coherent candidate before approved package/native qualification.
   Reuse supplied frozen artifacts and the existing root/isolated layouts; do not manufacture a pass by relaxing an inventory comparison.

Schema compilation and generated-type checks inspect shared contracts across their owning surface; they are not permission to run the full product test repository.
Use workflow validation only if its exact CLI/data contract is touched.
Keep previously fixed producer-runtime guards intact.

### Proof boundaries

| Evidence class                                            | What it can establish                                                                         | What it cannot establish                                                                  |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Read-only source inspection and current assessment probes | Current ownership, parser behavior and the observed local CLI invocation                      | Future implementation correctness or installed-package behavior                           |
| Exact schema/type/lint checks                             | Closed contract coherence, declaration generation and changed text/code quality               | Native behavior, complete repository acceptance or hosted delivery                        |
| Focused real native/process/filesystem tests              | Named behavior on the actual matching local component and host                                | Other platforms, every supported runtime or the complete suite                            |
| Frozen packed root/isolated consumer runs                 | The observed package/native pair, public bins/exports/types, current corpus and those layouts | Anonymous registry installation or hosted workflow success unless actually executed there |
| Existing hosted qualification                             | Only the exact unchanged artifacts/candidate and lane it actually covers                      | A changed CLI/cohort or an unrun new candidate                                            |

No hosted run, release, installation or native build is part of plan authoring.
Any future unexecuted required evidence remains a stated gap.
Do not relabel source-only proof as native or packed proof, or a focused package corpus as complete release qualification.

## Recovery, decision ownership and replanning

The user reviews this concrete design before implementation, particularly the breaking write-mode rule, scoped-check semantics, raw-versus-policy stdin distinction and event/native cohort migration.
Routine choices have been resolved here; there is no unresolved design blocker to authoring this plan.

Before implementing, perform the cheapest checks that could invalidate a decision:

- Verify the current branch/head and whether intervening stable release or claimed prerelease coordinates change the version boundary.
- Confirm new selected operations can reuse existing native capture/census and exact policy accounting without a new protocol command.
- Confirm the proposed selected/virtual contract adapter preserves every applicable expectation and protection, especially linked-document refusal and producer-owned presentation.
- Confirm exact installed-consumer entrypoints can exercise this corpus without a hidden full-suite/build/install expansion under the eventual authorization.
- Confirm matching native artifacts and supported producer tools are available before claiming any native or packed result.

Replan only the affected seam if native protocol changes become necessary, selected input cannot be bounded by current controls, an expectation cannot be represented honestly, the package version boundary has changed, or the chosen narrow qualification path cannot supply required proof.
Do not silently add full scans, config discovery, relaxed ownership, more parsers, an alternate checker, dependency acquisition or administrative lifecycle work.
Cache/watch/LSP/plugin systems, many reporters, directory/glob engines, other formats and broad performance campaigns are non-goals.

Before publication, rollback of implementation is a reviewed source change against the actual candidate, preserving unrelated user work.
After publication, consumers can deliberately remain pinned to the previous package family or adopt a forward fix; do not mutate published artifacts or old evidence.
Rolling back the package does not undo already written source files.
Never automatically restore files from a stale preview or reset a checkout.
Interrupted writers report confirmed writes and the uncertain path; an owner inspects those files and reruns a fresh preflight/check.
An interrupted stdout transform has no filesystem rollback obligation, but its partial output must not be adopted as success.

For the current document-only task, verification is limited to the installed Markdown Quality checker/formatter on this exact new file, whitespace/diff checks and confirming the final changed-file scope, branch and HEAD.
No product test or native/packed/hosted acceptance is claimed.
