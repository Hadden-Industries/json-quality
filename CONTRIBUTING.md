# Contributing

JSON Quality provides strict JSON checking, complete owned-file discovery and guarded source repair.
Use public issues for reproducible defects, questions and feature proposals.
Report suspected vulnerabilities privately through [SECURITY.md](SECURITY.md); community interactions follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Development setup

Use the development/producer Node and npm versions in [the runtime policy](docs/node-runtime-compatibility.md).
Edit version selections only in `assets/node-support.json`, then run `npm run sync:node-support` and `npm run check:node-support`.
Consumer compatibility minima and producer tooling requirements are separate contracts.
The policy's compatibility floor, maintained LTS families and explicit advance lanes are qualified independently of the reference producer.

```sh
npm ci --ignore-scripts
npm run test:contracts-and-identity
```

Markdown tooling is the root `@hadden-industries/markdown-quality` development dependency, installed by the same `npm ci --ignore-scripts` command.
Follow the [Markdown tooling guide](https://github.com/Hadden-Industries/json-quality/blob/main/docs/markdown-quality.md); do not add it to the product's runtime dependencies.
Retain native npm lockfiles and inspect dependency changes before accepting them.

## Command names and effects

Package scripts use `verb:subject[:qualifier]`; npm's standard `test` lifecycle name is the deliberate exception.
Name the actual operation and its scope, and avoid compatibility aliases or claims of broader assurance.
`test:contracts-and-identity` runs the two named test files; `test:affected` selects and runs tests, with read-only planning available through `--list`.
`check:repository` composes the contributor checks and package qualification; hosted platform and release acceptance remain separate.

`benchmark:json-checking` and `benchmark:json-formatting` measure their respective workloads; `benchmark:orchestration` runs both.
The formatting workload also asserts ignore-query batching; timing remains diagnostic without a calibrated performance gate.
`resolve:node-matrix` prints the resolved matrix, and `emit:node-matrix` writes GitHub workflow outputs.
`export:producer-node-and-npm-paths` records the original Node and npm executable paths in the workflow environment before compatibility tests switch Node versions.
These producer tools remain available to package test fixtures while the selected consumer runtime exercises them.
`install:producer-npm` installs npm globally; `install:consumer-npm` installs it under the explicit destination, and `install:producer-dependencies` performs the locked contributor install.

Release preparation has two distinct entrypoints: `emit:release-matrix` writes the release workflow's matrix output, while `freeze:release-manifest -- DIRECTORY` freezes the already packed family.
`generate:source-dependency-evidence` creates a disposable production install from the source manifest and lock, then produces its dependency, audit and SBOM evidence.
`verify:release-codeql` verifies existing exact-source CodeQL results; it does not launch scans.
`execute:release-action` requires an explicit admitted action and can stage npm publication, archive a GitHub release or promote a release; it has no default action.
These names confer no installation, release or publication authority.

## Changes and verification

Describe the problem, intended behavior and compatibility implications before a substantive change.
Keep unrelated changes separate and use the shared native core, JavaScript session/CLI, configuration and event-contract boundaries.
Preserve independent test expectations for JSON meaning, numeric lexemes, Unicode, complete discovery, protected inputs and guarded writes.
Checking must not write source files; owned spill scratch is a separate effect.
Formatting must not silently normalize data or rewrite producer-owned evidence.

```sh
npm run format:code-and-markdown
npm run check:markdown
npm run check:json
npm run lint:javascript
npm run check:types
npm run check:types:generated
npm run check:public-schemas
npm run check:package-contracts
npm run test:affected -- --base FULL_COMMIT_SHA
```

Use an actual full baseline commit for affected checks; without one, `test:affected` runs the complete JavaScript suite.
Run `npm test` for the complete test inventory.
Use `npm run check:repository` for consolidated assurance on clean committed source; its transported-package checks bind an actual source commit.
Where package contents or public contracts change, include real installed CLI, library, ESLint plugin and schema qualification.
Record commands, results and remaining gaps in the issue, PR or task.
Local tests, hosted platform qualification and downstream acceptance are separate evidence.

Markdown formatting belongs to `format:markdown` and `check:markdown`; generic Prettier excludes Markdown.
The `run:prettier` package script declares the generic formatting scope once: the repository root with `.gitignore` and `.prettierignore` boundaries, including every supported file under `.github`.
`format:code` and `check:code-formatting` reuse that script with `--write` and `--check`.
`format:code-and-markdown` combines `format:code` with `format:markdown`; `check:code-formatting-and-markdown` checks code formatting and the complete Markdown quality contract and is reused by `check:repository`.
New workflow files enter both formatting and verification automatically.
JSON formatting and validation belong to this package's CLI; generic Prettier excludes JSON-family files.
Use `check:json`, `format:json` and `normalize:json` for explicit JSON maintenance.
`check:json:ndjson` runs the same JSON check with newline-delimited event output.
`normalize:json` requires nonempty explicit literal paths after `--`; it never runs as part of generic formatting.
Cohort-5 CLI/library operations follow the [CLI](docs/cli.md) and [consumer contract](docs/consumer-guide.md).
Use `check` for read-only verification; retired aggregate modifiers and `--files` envelopes are unsupported.
Use semantic sentence lines, preserve literal examples, and keep physical local links valid.
Select a new candidate only in `package.json.version`, then run `npm run sync:version`; `npm run check:version` checks the generated companion and lockfile metadata and policy-input identity without writing.
Historical plans, evidence, published versions and release approvals are independent records and are not version projections.
Review formatting diffs and rerun checks for convergence.

Develop on a feature branch and open a draft PR into `main`.
Commit/push freely and run useful focused checks while changes accumulate.
Consolidate and format/lint the candidate before requesting broad review; repair reviews should address the changed questions.
Mark the PR **Ready for review** to qualify that exact candidate.
Feature pushes and later `synchronize` events do not automatically run the full suite.
After a source or base update, return to draft, batch the repairs and mark Ready again; old acceptance is obsolete.
The owner reviews sensitive workflow/test/trust-policy changes and deliberately merges only after `CI / acceptance` succeeds.
CODEOWNERS routes that review without requiring a second maintainer or unattended merge automation.

The lightweight post-merge observer admits equal-input proof, including JSON, as `REUSED`.
If it reports `FULL_REQUIRED`, explicitly dispatch **Main qualification** on `main`.
It will not launch full tests automatically; that dispatch is separate from PR acceptance and fresh source-bound release qualification.
For a classified infrastructure failure, explicitly rerun only affected failed jobs of the same candidate; retained jobs must preserve their authenticated original producing attempts.
Source, policy, dependency or matrix changes require a new ready checkpoint.
See [CI trust and recovery](docs/ci-trust.md).

Dependabot proposes root npm and GitHub Actions updates for review, including Markdown tooling dependency updates.
For a bot PR opened ready, convert it to draft and then Ready when deliberately requesting acceptance.
Do not retry failed assertions or increase product resource contracts to make CI pass.

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
