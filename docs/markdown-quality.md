# Markdown quality

Markdown Quality formats and checks this repository's Markdown as a root development dependency.
The root `package.json` declares `@hadden-industries/markdown-quality` as `>=3.0.1`; `package-lock.json` freezes the installed graph, including the matching native companion.

## Setup and commands

From the repository root, install the locked development dependencies and check the Markdown.

```sh
npm ci --ignore-scripts
npm run check:markdown
```

The check reads the selected documents.
Errors and formatting drift fail it.
Warnings are advisory unless you pass `-- --strict`.

### Preview and format one document

Paths after `--` are literal and relative to the repository root.
Preview the candidate for the README, apply it if wanted, then check the file again.

```sh
npm exec -- markdown-quality format --dry-run --root . -- README.md
npm run format:markdown -- -- README.md
npm run check:markdown -- -- README.md
```

Omit the file arguments to format or check the full selection.
The `format:markdown` script supplies the required `--write` flag.
Use `check:code-formatting-and-markdown` for both the generic code formatting check and the Markdown checks.
Its writing counterpart is `format:code-and-markdown`.

### Inspect policy or consume JSON results

```sh
npm run --silent inspect:markdown
npm run --silent check:markdown -- --json -- README.md
```

Human findings and summaries go to stderr.
Help, version and `--json` output go to stdout.
Use npm’s `--silent` flag to keep its banner out of machine-readable output.
Operation JSON uses result schema 5 and includes candidate hashes, byte counts and change status.
The inspect command reports configuration.

## Defaults

No repository configuration file is needed.
The package selects `**/*.md`, checks local links, rejects root-relative links and uses LF with two-space indentation.
Generated `vendor`, `.cache` and `coverage` areas are excluded by default; all tracked authored Markdown remains selected.
Dependency installations are outside the package's selection boundary.
Git and Prettier ignore files do not control Markdown selection.

Review root lockfile changes and run the commands above after dependency upgrades.
Markdown tooling is not included in JSON Quality's runtime dependencies or npm shipment.
