# Markdown quality

Markdown Quality formats and checks this repository's Markdown as a root development dependency.
The root `package.json` declares `@hadden-industries/markdown-quality` as `>=2.0.0`; `package-lock.json` freezes the installed graph.

## Setup and commands

Install the development dependencies, then use the installed public command:

```sh
npm ci --ignore-scripts
npm run inspect:markdown
npm run check:markdown
npm run format:markdown
```

Explicit file arguments and options pass through to the command:

```sh
npm run check:markdown -- --json -- README.md
npm run format:markdown -- -- README.md
```

Checking is read-only; errors and formatting drift fail the check.
Warnings remain visible and advisory; pass `-- --strict` to make them blocking.
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
