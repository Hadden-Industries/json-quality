# JSON Quality

[![npm](https://img.shields.io/npm/v/%40hadden-industries%2Fjson-quality)](https://www.npmjs.com/package/@hadden-industries/json-quality) [![CI](https://github.com/Hadden-Industries/json-quality/actions/workflows/ci.yml/badge.svg)](https://github.com/Hadden-Industries/json-quality/actions/workflows/ci.yml) [![Node](https://img.shields.io/badge/node-supported-green)](docs/node-runtime-compatibility.md) [![AGPL-3.0-only](https://img.shields.io/badge/license-AGPL--3.0--only-blue)](LICENSE)

One CLI and typed ESM library for strict JSON, JSONL and NDJSON checking, canonical formatting and explicit Unicode NFC repair.
Package defaults check syntax, duplicate decoded keys, numeric safety, Unicode, key hygiene and presentation without a configuration file.

## Why use it

- Check JSON before converting it into application objects: duplicate members, number spellings and source locations remain available to the checker.
- Keep exact numeric lexemes and member order during formatting; `1.00` does not silently become `1`, and formatting does not normalize decoded strings.
- Detect NFC drift in decoded keys and strings, repair it explicitly, and refuse normalization when distinct keys would become equal.
- Use root policy for a complete Git repository, literal selected files or editor-provided virtual input; check streamed bytes under an explicit source contract, with completion events identifying the scope actually checked.
- Preview actual repair candidates before writing; complete preflight, ownership checks and source rechecks guard filesystem replacements.
- Check and access large retained values through one native reader and owned spill storage, with explicit resource controls and no size-dependent parser fallback.
- Integrate through versioned NDJSON events and generated TypeScript declarations; the optional JavaScript ESLint rule flags serialization-based JSON identity checks.

For example, the default policy rejects `{"a":1,"\u0061":2}` because both keys decode to `a`, and flags `9007199254740992` as an unsafe integer.
Formatting preserves numeric spelling; it cannot repair an unsafe number by choosing a different value for you.

## When another tool fits better

- You need JSON5, JSONC comments, trailing commas, YAML or another extended syntax; these commands require strict JSON framing.
- You want arbitrary formatter options or alphabetically sorted members; presentation is fixed and member order is preserved.
- You need application-schema validation or domain correctness; shared JSON quality does not establish either.
- You need generic in-place JSONL/NDJSON repair, rewriting another producer's lockfile, or atomic rollback of a multi-file batch; those operations are outside the generic writer's authority.
- You need a browser, a JavaScript-only runtime, macOS, ARM or Linux musl; the current native platform set is Windows x64 and Linux x64/glibc.

## Install and first check

This README describes the current source candidate selected by [`package.json.version`](package.json), using contract cohort **6**.
The owner selected that stable SemVer coordinate for the next release, with initial npm availability under `pilot` and promotion to `latest` only after acceptance of the same artifacts.
Native builds, hosted checks and installed-package checks qualify their declared scopes; source examples do not establish registry availability or complete release acceptance.
Choose a published, qualified version whose documentation matches these contracts, and replace `VERSION` below with that exact version:

```sh
npm install --save-dev --save-exact @hadden-industries/json-quality@VERSION
npm exec -- json-quality --help
npm exec -- json-quality check --root .
```

Commit the npm-generated lockfile and use `npm ci` for clean installs.
Keep optional dependencies enabled so npm installs the matching native companion.
Run the binary through `npm exec`, an npm script or another runner that resolves local package binaries.
A local development dependency does not put a bare `json-quality` command on every shell's PATH.

`check` requires an existing Git repository and reconciles the complete declared source inventory.
No wrapper, copied exclusion list or `.json-quality.json` is required.
The default root is the current directory; the package does not search ancestor directories for policy.
Outside Git, use `npm exec -- json-quality check-files --root . -- authored.json` to check literal selected files against root policy.
That result covers the selection and does not establish complete repository acceptance.

For repeatable repository checks, add an npm script:

```json
{
  "scripts": {
    "check:json": "json-quality check --root ."
  }
}
```

Then run `npm run check:json` locally or in CI after installing the locked dependencies.

## Commands and scope

| Command                                                          | Purpose                                                                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `check --root .`                                                 | Check complete repository obligations, including declared native/logical sources and required outputs. |
| `check-files --root . -- A.json B.json`                          | Check nonempty literal selected files without Git or provider execution.                               |
| `check-source --stdin-filepath input.json`                       | Check raw stdin under an explicit source contract, without repository policy.                          |
| `format --dry-run` or `format --write`                           | Preview actual candidates or explicitly format writable physical sources after repository preflight.   |
| `normalize --dry-run -- A.json` or `normalize --write -- A.json` | Preview or apply NFC repair to an explicit nonempty selection.                                         |
| `format --stdin` or `normalize --stdin`                          | Return transformed UTF-8 source on stdout without writing the checkout.                                |

Literal paths follow `--`; quote spaces and leading-hyphen names.
There is no internal glob expansion or directory selection.
Checks recognize strict JSON files, including `.json`, `.jsonld` and `.sarif`, and JSONL/NDJSON framing.
Generic transformations support strict single-document JSON only.

Preview a repair, choose when to write, then check the resulting repository:

```sh
npm exec -- json-quality format --dry-run --root . -- authored.json
npm exec -- json-quality format --write --root . -- authored.json
npm exec -- json-quality normalize --dry-run --root . -- authored.json
npm exec -- json-quality normalize --write --root . -- authored.json
npm exec -- json-quality check --root .
```

Both filesystem repair commands require exactly one of `--write` and `--dry-run`.
Format without explicit paths selects all eligible writable physical sources; normalize always requires explicit paths.
Checking writes no source files; a spill may create owned temporary storage.
Formatting preserves decoded strings and exact numeric lexemes, so NFC findings may remain.
Normalization explicitly repairs NFC string/key spans and may leave presentation findings.
Either repair order works for a file with both conditions; run `check` afterwards to assess overall quality.
Previews perform actual-candidate checks without source writes and grant no later write authority.
NFC-colliding keys refuse normalization before the first selected write.
Write batches report confirmed writes and any uncertain path; they are not atomic.
Producer-owned, ignored, native, logical and JSONL sources retain their owning write boundary.

For editor or pipeline input, these POSIX-shell examples supply the original UTF-8 bytes through stdin:

```sh
npm exec -- json-quality check-source --ndjson --stdin-filepath input.json < input.json
npm exec -- json-quality format --stdin --stdin-filepath input.json < input.json > formatted.json
npm exec -- json-quality check-files --stdin --root . --stdin-filepath authored.json < input.json
```

`--stdin-filepath` gives virtual identity and framing; it never reads or overwrites that path.
For raw checks and transforms, a filename alone does not load repository policy.
`check-files --stdin` uses root policy; a transform selects that mode only with both explicit `--root` and `--stdin-filepath`.
Policy-aware transforms retain producer protection and cannot rewrite a protected lockfile through stdout.
See the [CLI reference](docs/cli.md) for complete mode and contract combinations.

## Defaults and exceptions

Optional `.json-quality.json` accepts `{}` or sparse exceptions at the chosen root.
Defaults select canonical presentation and NFC checking, with protected dependency/VCS boundaries and npm lockfile ownership.
To preserve decoded Unicode sequences globally, use:

```json
{
  "defaults": { "normalization": "preserve" }
}
```

Preservation keeps ordinary presentation checking; normalization refuses selected preserved sources.
Distinct keys that would collide under NFC produce a non-blocking collision-risk event under preservation.
Exact decoded duplicate keys still fail.
Use [configuration contracts](docs/configuration.md) for attributable path exceptions, expectations and producer ownership.

## Output and completion

Human findings and summaries go to stderr; `--ndjson` puts versioned events on stdout.
Stdin transforms reserve stdout for transformed source bytes and cannot combine it with `--ndjson`.
`--quiet` and `--diagnostic-display-level info|warning|error` affect presentation only; they cannot turn a failure into success or hide blocking findings.

| Exit | Meaning                                                                                                                                |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `0`  | Requested discovery, satisfied check, admissible preview or transform/write completed and was delivered.                               |
| `1`  | A complete operation found a quality or contract refusal.                                                                              |
| `2`  | Operational failure or incomplete work, including bad arguments, stale input, quotas, cancellation, output failure or cleanup failure. |

A successful repair can leave findings belonging to the other repair operation.
Only a complete check establishes the verdict for its declared scope.
Repository `execution-terminal`, selected `selection-terminal` and raw-source `terminal` events complete different operations; a provisional source terminal cannot certify the repository.
Missing final delivery is incomplete, even if earlier sources passed.

## Library use

The typed ESM API supports selected-file checks without creating a Git repository:

```js
import { checkJsonFiles } from "@hadden-industries/json-quality";

let terminal;
try {
  for await (const event of checkJsonFiles({
    root: process.cwd(),
    files: ["authored.json"],
  })) {
    if (event.type === "finding") console.error(event);
    if (event.type === "selection-terminal") terminal = event;
  }
  process.exitCode = terminal ? (terminal.contractSatisfied ? 0 : 1) : 2;
} catch (error) {
  console.error(error);
  process.exitCode = 2;
}
```

The generator owns its session and cleanup; consume through the final terminal.
Selected completion explicitly declares `operationScope.completeRepositoryCheck: false`.
`contractSatisfied` includes declared expected-negative obligations; `qualityPassed` describes intrinsic shared quality, and neither is application-domain validation.

For streamed bytes and lossless value access, use `openJsonSourceSession`; the [maintained example](examples/source-session.mjs) shows source capture, terminal checking and explicit closure.
`openJsonRepositorySession` supplies complete repository checking and guarded physical rewrites.
The finite pure writers `formatJsonSource`, `formatJsonValue` and `normalizeJsonSource` return text without replacing source files.
References belong to their open session; materialization is an explicit charged lease with caller-owned domain validation.
See the [API](docs/api.md), [CLI](docs/cli.md), [configuration](docs/configuration.md) and [consumer guide](docs/consumer-guide.md).

## ESLint integration

Use the public ESLint flat configuration with your installed ESLint:

```js
import jsonQuality from "@hadden-industries/json-quality/eslint";

export default [jsonQuality.configs.recommended];
```

The [identity rule](docs/rules/no-json-stringify-identity.md) rejects JSON serialization used as semantic identity in JavaScript.
It is a separate code-analysis rule; use the CLI or source API to check JSON documents.

## Resources and supported environments

Checking streams bytes and can spill retained values into owned temporary storage.
Resource groups cover input admission, managed allocations, scratch, depth, deadlines, materialization and finite writers; large inputs may require deliberate overrides.
Ceilings have finite defaults and explicit overrides, including `null` for an individual numeric quota.
Disabling package ceilings does not remove host limits or make a finite text writer a streaming writer.
See [resource controls](docs/resource-limits.md) for defaults, accounting boundaries and CLI/library overrides.

The [runtime policy](docs/node-runtime-compatibility.md) defines the Node.js compatibility floor.
Qualification covers its declared LTS families, advance qualification lanes and independent producer reference.
Other engine-compatible releases receive best-effort support.
Use current security patches; the historical floor is not a security recommendation.
The supported native platforms are Windows x64 and Linux x64/glibc; npm installs the companion matching the core's exact version.
There is no compiler, downloader or alternate parser fallback at runtime.

## Guides and development

The [documentation index](docs/README.md) maps consumer tasks to the reference guides.
Use the [consumer guide](docs/consumer-guide.md) for streamed values, source contracts and trusted adapters, and [release operations](docs/release-operations.md) for package-family qualification and provenance.
The package is licensed [AGPL-3.0-only](LICENSE); see [third-party notices](THIRD-PARTY-NOTICES.md) for distributed upstream components.

Contributors iterate on feature branches and draft PRs.
Marking a PR **Ready for review** requests full qualification of that exact candidate; the owner merges after **CI / acceptance** succeeds.
A later commit invalidates acceptance and requires another deliberate ready checkpoint.
An ordinary merge runs lightweight reuse admission: **REUSED** includes eligible JSON results; **FULL_REQUIRED** waits for an explicit main-qualification dispatch.
Release qualification always binds a fresh source commit and candidate bytes.

See the [contributor workflow](CONTRIBUTING.md), [changelog](CHANGELOG.md) and [security policy](SECURITY.md).
