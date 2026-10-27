# Contributing

JSON Quality provides strict JSON checking, complete owned-file discovery and guarded source repair.
Use public issues for reproducible defects, questions and feature proposals.
Report suspected vulnerabilities privately through [SECURITY.md](SECURITY.md); community interactions follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Development setup

Use the development/producer Node and npm versions in [the runtime policy](docs/node-runtime-compatibility.md).
Edit version selections only in `assets/node-support.json`, then run `npm run sync:node` and `npm run check:node`.
Consumer compatibility minima and producer tooling requirements are separate contracts.
The compatibility floor is Node 22.13.0; maintained LTS majors and the explicit advance Node 26 lane are qualified independently of the reference producer.

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
npm run check:types
npm run check:types:generated
npm run check:schemas
npm run check:package
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
`normalize:json` requires nonempty explicit literal paths after `--`; it never runs as part of generic formatting.
Cohort-2 CLI/library operations follow the [CLI](docs/cli.md) and [consumer contract](docs/consumer-guide.md#cli-and-migration).
Use `check` for read-only verification; retired aggregate modifiers and `--files` envelopes are unsupported.
Use semantic sentence lines, preserve literal examples, and keep physical local links valid.
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

Dependabot proposes root npm and GitHub Actions updates for review; source-bound Markdown archives require deliberate qualification.
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
