# Markdown quality

Markdown Quality formats and checks this repository's Markdown as a root development dependency.
The root `package.json` declares `@hadden-industries/markdown-quality` as `>=3.0.0`; `package-lock.json` freezes the installed graph, including the matching native companion.

## Setup and commands

Install the development dependencies, then use the installed public command:

```sh
npm ci --ignore-scripts
npm run --silent inspect:markdown
npm run check:markdown
npm run format:markdown
```

Explicit file arguments and options pass through to the command:

```sh
npm run --silent check:markdown -- --json -- README.md
npm run format:markdown -- -- README.md
```

Checking is read-only; errors and formatting drift fail the check.
Warnings remain visible and advisory; pass `-- --strict` to make them blocking.
The scripts explicitly select the repository root; literal file arguments after `--` are root-relative paths.
`format:markdown` selects physical writes explicitly with `--write`, as required by version 3.
Preview actual candidates without writing through the public command:

```sh
npm exec -- markdown-quality format --dry-run --root . -- README.md
```

Run `check:markdown` after a repair to assess the selected policy verdict; a completed preview or repair does not certify full repository acceptance.
Human operation summaries and findings use stderr; help, version and `--json` output use stdout.
Use npm's `--silent` option when consuming JSON so npm's script banner does not enter the document.
Operation JSON uses result schema 5, including candidate hashes, byte counts and change status; `inspect --json` remains the configuration inspection surface.
`npm run format:code-and-markdown` includes Markdown formatting, and `npm run check:code-formatting-and-markdown` includes the Markdown check.
Prettier owns JavaScript and workflow formatting and skips Markdown.

## Defaults

No repository configuration file is needed.
The package selects `**/*.md`, checks local links, rejects root-relative links and uses LF with two-space indentation.
Generated `vendor`, `.cache` and `coverage` areas are excluded by default; all tracked authored Markdown remains selected.
Dependency installations are outside the package's selection boundary.
Git and Prettier ignore files do not control Markdown selection.

Review root lockfile changes and run the commands above after dependency upgrades.
Markdown tooling is not included in JSON Quality's runtime dependencies or npm shipment.
