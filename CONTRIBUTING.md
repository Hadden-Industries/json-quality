# Contributing

JSON Quality provides strict JSON checking, complete owned-file discovery and guarded source repair.
Use public issues for reproducible defects, questions and feature proposals.
Report suspected vulnerabilities privately through [SECURITY.md](SECURITY.md); community interactions follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Development setup

Use the development/producer Node and npm versions in [the runtime policy](docs/node-runtime-compatibility.md).
Edit version selections only in `assets/node-support.json`, then run `npm run sync:node` and `npm run check:node`.
Consumer compatibility minima and producer tooling requirements are separate contracts.

```sh
npm ci --ignore-scripts
npm run install:markdown
npm run check:focused
```

Markdown tooling is isolated under `tooling/markdown` and acquired from the exact source-bound archives recorded there.
Follow the [Markdown tooling guide](https://github.com/Hadden-Industries/json-quality/blob/main/docs/markdown-quality.md); do not add it to the product's runtime dependencies.
Retain native npm lockfiles and inspect dependency changes before accepting them.

## Changes and verification

Describe the problem, intended behavior and compatibility implications before a substantive change.
Keep unrelated changes separate and use the shared native core, JavaScript session/CLI, configuration and event-contract boundaries.
Preserve independent test expectations for JSON meaning, numeric lexemes, Unicode, complete discovery, protected inputs and guarded writes.
Checking must not write source files; owned spill scratch is a separate effect.
Formatting must not silently normalize data or rewrite producer-owned evidence.

```sh
npm run format
npm run check:markdown
npm run check:json
npm run lint
npm run check:affected -- --base FULL_COMMIT_SHA
```

Use an actual full baseline commit for affected checks; without one, `check:affected` runs the complete JavaScript suite.
Run `npm test` for the complete test inventory.
Use `npm run check:full` for consolidated assurance on clean committed source; its transported-package checks bind an actual source commit.
Where package contents or public contracts change, include real installed CLI, library, ESLint plugin and schema qualification.
Record commands, results and remaining gaps in the issue, PR or task.
Local tests, hosted platform qualification and downstream acceptance are separate evidence.

Markdown formatting belongs to `format:markdown` and `check:markdown`; generic Prettier excludes Markdown.
The `prettier` package script declares the generic formatting scope once: the repository root with `.gitignore` and `.prettierignore` boundaries, including every supported file under `.github`.
`format:code` and `format:code:check` reuse that script with `--write` and `--check`.
`format` combines `format:code` with `format:markdown`; `format:check` pairs their read-only checks and is reused by `check:full`.
New workflow files enter both formatting and verification automatically.
JSON formatting and validation belong to this package's CLI; generic Prettier excludes JSON-family files.
Use `format:json`, `format:json:check`, `normalize:json`, `inventory:json` and `lint:json` for explicit JSON maintenance.
`normalize:json` requires a nonempty explicit `files` selection, supplied as literal paths after `--` or an encoded `--files` JSON array; it never runs as part of generic formatting.
CLI and library verbs/modifiers follow the same [consumer contract](docs/consumer-guide.md#cli-and-object-mappings), including `format` with `check: true` and `check` with `scope: "protected"`.
Use semantic sentence lines, preserve literal examples, and keep physical local links valid.
Review formatting diffs and rerun checks for convergence.

The maintainer may iterate directly on `main`; a pull request is not mandatory.
Hosted product CI is manually dispatched as described in the [README](README.md).
Dependabot proposes root npm and GitHub Actions updates for review; source-bound Markdown archives require deliberate qualification.

## Reports and proposals

For a defect, provide the exact package version or source commit, OS, architecture, Node/npm versions, command, configuration and smallest non-sensitive reproduction.
Include the expected and actual result, exit code and diagnostics, and identify whether checking, inventory, formatting or normalization was used.
For a proposal, explain the use case, alternatives and effects on compatibility, preservation or performance.
Keep credentials, personal data and private JSON out of public reports.

## Licensing and releases

The code is AGPL-3.0-only.
Preserve `LICENSE`, third-party attribution and corresponding source/build materials; do not add an "or later" grant.
The adapted Code of Conduct has separate CC BY-SA 4.0 terms, recorded in [third-party notices](THIRD-PARTY-NOTICES.md).

The source remains a development candidate.
Follow [release operations](https://github.com/Hadden-Industries/json-quality/blob/main/docs/release-operations.md) for exact-source qualification, owner decisions, staging, archival and recovery.
A source change or metadata update does not publish a package, promote a release or update consumers.
